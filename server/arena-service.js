import fs from "node:fs/promises";
import path from "node:path";
import { createRiotClient, RiotApiError } from "./riot.js";
import { createLcuConnector } from "./lcu.js";
import { STATIC_ARENA_QUEUE_IDS, arenaQueueIdsFromLcuQueues, buildArenaMatchEntry, aggregateArenaStats } from "./arena.js";

const TTL_MS = 2 * 60 * 1000;
const DISCOVERY_COUNT = 20; // recent ids checked every refresh, so a just-finished game shows up fast
const BACKFILL_PAGE = 100; // deeper history page size per queue, while backfilling
const BACKFILL_PER_REFRESH = 20; // full matches fetched per refresh, to stay well inside rate limits

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
      if (!cache || cache.puuid !== puuid) cache = { puuid, entries: {}, scan: {} };

      const arenaQueueIds = await resolveArenaQueueIds();

      const candidateIds = new Set();
      for (const queue of arenaQueueIds) {
        try {
          const recent = await client.getMatchIds(puuid, DISCOVERY_COUNT, { queue, start: 0 });
          recent.forEach((id) => candidateIds.add(id));
        } catch {
          // transient — this queue's discovery just skips this refresh
        }
      }
      for (const queue of arenaQueueIds) {
        const state = cache.scan[queue] ?? { offset: 0, done: false };
        if (state.done) continue;
        try {
          const page = await client.getMatchIds(puuid, BACKFILL_PAGE, { queue, start: state.offset });
          page.forEach((id) => candidateIds.add(id));
          cache.scan[queue] = { offset: state.offset + page.length, done: page.length < BACKFILL_PAGE };
        } catch {
          // transient — retry this queue's backfill page next refresh
        }
      }

      const newIds = [...candidateIds].filter((id) => !cache.entries[id]).slice(0, BACKFILL_PER_REFRESH);
      for (const id of newIds) {
        try {
          const match = await client.getMatch(id);
          // store a tombstone for non-Arena ids too (a queue id can be reused for another mode later),
          // so we don't keep re-fetching the same match every refresh
          cache.entries[id] = buildArenaMatchEntry(match, puuid, champions) ?? { skip: true };
        } catch (err) {
          if (err instanceof RiotApiError) break; // rate limited / transient — try again next refresh
          throw err;
        }
      }

      await saveCache(cache);

      const stats = aggregateArenaStats(Object.values(cache.entries).filter((e) => !e.skip));
      const backfillComplete = arenaQueueIds.every((q) => cache.scan[q]?.done);

      const result = { configured: true, updatedAt: Date.now(), stats, backfillComplete };
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
