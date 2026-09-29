import fs from "node:fs/promises";
import path from "node:path";
import { createRiotClient, RiotApiError } from "./riot.js";
import { createLcuConnector } from "./lcu.js";
import {
  STATIC_ARENA_QUEUE_IDS,
  arenaQueueIdsFromLcuQueues,
  buildArenaMatchEntry,
  filterBySeasonStart,
  aggregateArenaStats,
} from "./arena.js";
import { currentArenaSeasonStartMs } from "./arena-seasons.js";
import { getArenaSeasonFame } from "./arena-fame.js";

const TTL_MS = 2 * 60 * 1000;
const DISCOVERY_COUNT = 20; // recent ids checked every refresh, so a just-finished game shows up fast
const BACKFILL_PAGE = 100; // deeper history page size per queue, while backfilling
// Full matches fetched per refresh. riot.js already throttles every request to a shared ~14/s
// queue, so this only bounds how long one refresh takes to respond, not the request rate — for a
// heavily-played Arena account the initial backfill can have several hundred candidate matches, and
// 20/refresh (a 2-minute TTL apart) took the better part of an hour to catch up.
const BACKFILL_PER_REFRESH = 80;

export function createArenaService({ dataDir, getChampions }) {
  const cachePath = path.join(dataDir, "arena-cache.json");
  const queueIdsPath = path.join(dataDir, "arena-queue-ids.json");
  const lcu = createLcuConnector();

  let memArena = null;
  let memFetchedAt = 0;
  let inFlight = null;

  async function loadCache() {
    try {
      return JSON.parse(await fs.readFile(cachePath, "utf-8"));
    } catch {
      return null;
    }
  }

  async function saveCache(cache) {
    await fs.mkdir(dataDir, { recursive: true });
    const tmp = path.join(dataDir, `.arena-cache.${process.pid}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(cache), "utf-8");
    await fs.rename(tmp, cachePath);
  }

  /**
   * Which queue ids count as Arena. The League client's own catalog is the source of truth (it
   * knows every queue id it's ever offered, including old event variants), so it wins when
   * reachable; ids seen there are remembered on disk so a later refresh without the client still
   * knows about them, and the static list is only the fallback for a first run with no client
   * and no disk cache yet. Ids already known are never forgotten, only added to.
   */
  async function resolveArenaQueueIds() {
    const known = new Set(STATIC_ARENA_QUEUE_IDS);
    try {
      const saved = JSON.parse(await fs.readFile(queueIdsPath, "utf-8"));
      (saved ?? []).forEach((id) => known.add(id));
    } catch {
      // no disk cache yet — static list stands
    }
    try {
      if (await lcu.ensureConnected()) {
        const queues = await lcu.get("/lol-game-queues/v1/queues");
        const before = known.size;
        arenaQueueIdsFromLcuQueues(queues).forEach((id) => known.add(id));
        if (known.size > before) {
          await fs.mkdir(dataDir, { recursive: true });
          await fs.writeFile(queueIdsPath, JSON.stringify([...known]), "utf-8").catch(() => {});
        }
      }
    } catch {
      // client not reachable — disk cache + static list stand for this refresh
    }
    return [...known];
  }

  async function fetchFresh() {
    const apiKey = process.env.RIOT_API_KEY;
    const riotId = process.env.RIOT_ID;
    const platform = process.env.RIOT_PLATFORM || "euw1";

    if (process.env.RIOT_MOCK) {
      const { buildMockArena } = await import("./mock-arena.js");
      const mode = process.env.RIOT_MOCK === "1" ? "ok" : process.env.RIOT_MOCK;
      const result = buildMockArena(mode);
      if (!result.error) {
        memArena = result;
        memFetchedAt = Date.now();
        return result;
      }
      if (memArena) return { ...memArena, error: result.error, updatedAt: result.updatedAt };
      return result;
    }

    if (!apiKey || !riotId) return { configured: false, updatedAt: Date.now() };

    const [gameName, tagLine] = riotId.split("#");
    if (!gameName || !tagLine) {
      return {
        configured: true,
        error: { code: "NOT_CONFIGURED", message: 'Riot ID must look like "GameName#TAG" — check Settings.' },
        updatedAt: Date.now(),
      };
    }

    const client = createRiotClient({ apiKey, platform });

    try {
      const champions = (await getChampions()).champions;
      const account = await client.getAccountByRiotId(gameName, tagLine);
      const puuid = account.puuid;

      let cache = await loadCache();
      if (!cache || cache.puuid !== puuid) cache = { puuid, entries: {}, scan: {}, pendingIds: [] };
      if (!cache.pendingIds) cache.pendingIds = []; // migrate a cache saved before this field existed

      const arenaQueueIds = await resolveArenaQueueIds();

      // A discovered id waits here — possibly across several refreshes — until it's actually
      // fetched. Without this, an id found on the one refresh that finishes a queue's backfill
      // page (marking it `done`) but not fetched within that same refresh's BACKFILL_PER_REFRESH
      // budget would never be reconsidered again: once `done`, that queue's backfill loop is
      // skipped on every later refresh, and only its most recent ~20 games get rediscovered.
      const pending = new Set(cache.pendingIds);
      const enqueue = (id) => {
        if (!cache.entries[id] && !pending.has(id)) {
          pending.add(id);
          cache.pendingIds.push(id);
        }
      };

      for (const queue of arenaQueueIds) {
        try {
          const recent = await client.getMatchIds(puuid, DISCOVERY_COUNT, { queue, start: 0 });
          recent.forEach(enqueue);
        } catch {
          // transient — this queue's discovery just skips this refresh
        }
      }
      for (const queue of arenaQueueIds) {
        const state = cache.scan[queue] ?? { offset: 0, done: false };
        if (state.done) continue;
        try {
          const page = await client.getMatchIds(puuid, BACKFILL_PAGE, { queue, start: state.offset });
          page.forEach(enqueue);
          cache.scan[queue] = { offset: state.offset + page.length, done: page.length < BACKFILL_PAGE };
        } catch {
          // transient — retry this queue's backfill page next refresh
        }
      }

      const toFetch = cache.pendingIds.slice(0, BACKFILL_PER_REFRESH);
      for (const id of toFetch) {
        try {
          const match = await client.getMatch(id);
          // store a tombstone for non-Arena ids too (a queue id can be reused for another mode later),
          // so we don't keep re-fetching the same match every refresh
          cache.entries[id] = buildArenaMatchEntry(match, puuid, champions) ?? { skip: true };
        } catch (err) {
          if (err instanceof RiotApiError) break; // rate limited / transient — retry next refresh
          throw err;
        }
      }
      cache.pendingIds = cache.pendingIds.filter((id) => !cache.entries[id]);

      await saveCache(cache);

      // A manual override in Settings wins; otherwise fall back to the hand-maintained season
      // table so this works out of the box without the user having to look up a date themselves.
      const manualSeasonStart = process.env.ARENA_SEASON_START ? Date.parse(process.env.ARENA_SEASON_START) : null;
      const autoSeasonStartMs = currentArenaSeasonStartMs();
      const seasonStartMs = manualSeasonStart ?? autoSeasonStartMs;
      const seasonStartSource = manualSeasonStart ? "manual" : autoSeasonStartMs ? "auto" : null;

      const realEntries = Object.values(cache.entries).filter((e) => !e.skip);
      const stats = aggregateArenaStats(filterBySeasonStart(realEntries, seasonStartMs));
      const backfillComplete = arenaQueueIds.every((q) => cache.scan[q]?.done) && cache.pendingIds.length === 0;

      const seasonFame = (await lcu.ensureConnected().catch(() => false)) ? await getArenaSeasonFame(lcu) : null;

      const result = {
        configured: true,
        updatedAt: Date.now(),
        stats,
        backfillComplete,
        seasonStart: seasonStartMs ? new Date(seasonStartMs).toISOString() : null,
        seasonStartSource,
        seasonFame,
      };
      memArena = result;
      memFetchedAt = Date.now();
      return result;
    } catch (err) {
      const code = err instanceof RiotApiError ? err.code : "UPSTREAM";
      const message = err instanceof RiotApiError ? err.message : "Unexpected error talking to Riot's API.";
      console.error("Arena refresh failed:", message);
      if (memArena) return { ...memArena, error: { code, message } };
      return { configured: true, error: { code, message }, updatedAt: Date.now() };
    }
  }

  async function getArena({ refresh } = {}) {
    if (!refresh && memArena && Date.now() - memFetchedAt < TTL_MS) return memArena;
    if (inFlight) return inFlight;
    inFlight = fetchFresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  function reset() {
    memArena = null;
    memFetchedAt = 0;
  }

  return { getArena, reset };
}
