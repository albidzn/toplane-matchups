import fs from "node:fs/promises";
import path from "node:path";
import { createRiotClient, RiotApiError } from "./riot.js";
import { aggregateMatches, championStatsByQueue } from "./profile-stats.js";
import { createLpStore } from "./lp-history.js";
import { APEX_TIERS, cutoffFromLeague } from "./apex.js";

const TTL_MS = 2 * 60 * 1000;
// Cap how many matches we keep on disk so the cache file (and JSON parse
// time) doesn't grow forever over months of play. Plenty for accurate
// matchup/champion stats; oldest games are dropped first.
const MATCH_CACHE_LIMIT = 1000;
// Match summaries cached before v1.8 lack the full 10-player scoreboard. Fill
// them in a few per refresh (newest first) so we stay well inside dev-key rate limits.
const HISTORY_SIZE = 60;
const BACKFILL_PER_REFRESH = 15;
const APEX_CUTOFF_TTL_MS = 30 * 60 * 1000;

function championIdByKey(champions, key) {
  return champions.find((c) => c.key === String(key))?.id ?? null;
}

function mapLeagueEntry(entries, queueType) {
  const e = entries.find((x) => x.queueType === queueType);
  if (!e) return undefined;
  return {
    tier: e.tier,
    rank: e.rank,
    lp: e.leaguePoints,
    wins: e.wins,
    losses: e.losses,
    hotStreak: Boolean(e.hotStreak),
  };
}

function buildPlayers(participants, puuid, champions) {
  return participants.map((p) => ({
    name: p.riotIdGameName || p.summonerName || "",
    champion: championIdByKey(champions, p.championId) ?? p.championName,
    position: p.teamPosition || "",
    teamId: p.teamId,
    win: Boolean(p.win),
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    damage: p.totalDamageDealtToChampions ?? 0,
    gold: p.goldEarned ?? 0,
    level: p.champLevel ?? 0,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((i) => i ?? 0),
    isMe: p.puuid === puuid,
  }));
}

function buildMatchSummary(match, puuid, champions) {
  const info = match?.info;
  const participants = info?.participants;
  if (!info || !participants) return null;

  const me = participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  const opponentParticipant = me.teamPosition
    ? participants.find((p) => p.teamId !== me.teamId && p.teamPosition === me.teamPosition)
    : null;

  const durationSec = info.gameDuration ?? 0;
  const remake = Boolean(me.gameEndedInEarlySurrender) || durationSec < 300;

  return {
    matchId: match.metadata.matchId,
    queueId: info.queueId,
    gameEnd: info.gameEndTimestamp ?? info.gameStartTimestamp ?? Date.now(),
    durationSec,
    champion: championIdByKey(champions, me.championId) ?? me.championName,
    position: me.teamPosition || "",
    win: Boolean(me.win),
    kills: me.kills ?? 0,
    deaths: me.deaths ?? 0,
    assists: me.assists ?? 0,
    cs: (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0),
    gold: me.goldEarned ?? 0,
    damage: me.totalDamageDealtToChampions ?? 0,
    items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6].map((i) => i ?? 0),
    opponent: opponentParticipant
      ? { champion: championIdByKey(champions, opponentParticipant.championId) ?? opponentParticipant.championName }
      : null,
    remake,
    players: buildPlayers(participants, puuid, champions),
  };
}

export function createProfileService({ dataDir, getChampions }) {
  const cachePath = path.join(dataDir, "match-cache.json");
  const lpStore = createLpStore(dataDir);

  let memProfile = null; // last successful (error-free) profile
  let memFetchedAt = 0;
  let inFlight = null; // dedupe concurrent refreshes
  let apexCache = { at: 0, value: null };

  /** GM/Challenger LP cutoffs — only fetched for Master+ players, cached since they barely move. */
  async function getApexCutoffs(client, soloEntry) {
    if (!soloEntry || !APEX_TIERS.has(soloEntry.tier)) return null;
    if (apexCache.value && Date.now() - apexCache.at < APEX_CUTOFF_TTL_MS) return apexCache.value;
    try {
      const grandmaster = cutoffFromLeague(await client.getApexLeague("grandmaster"));
      const challenger = cutoffFromLeague(await client.getApexLeague("challenger"));
      apexCache = { at: Date.now(), value: { grandmaster, challenger } };
    } catch {
      // keep serving the last known cutoffs (or none) rather than failing the whole profile
    }
    return apexCache.value;
  }

  async function loadMatchCache() {
    try {
      const raw = await fs.readFile(cachePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function saveMatchCache(cacheData) {
    await fs.mkdir(dataDir, { recursive: true });
    const tmpPath = path.join(dataDir, `.match-cache.${process.pid}.tmp`);
    await fs.writeFile(tmpPath, JSON.stringify(cacheData), "utf-8");
    await fs.rename(tmpPath, cachePath);
  }

  function trimMatchCache(cacheData) {
    const entries = Object.values(cacheData.matches);
    if (entries.length <= MATCH_CACHE_LIMIT) return;
    const keep = entries.sort((a, b) => b.gameEnd - a.gameEnd).slice(0, MATCH_CACHE_LIMIT);
    cacheData.matches = Object.fromEntries(keep.map((m) => [m.matchId, m]));
  }

  async function fetchFresh() {
    const apiKey = process.env.RIOT_API_KEY;
    const riotId = process.env.RIOT_ID;
    const platform = process.env.RIOT_PLATFORM || "euw1";
    const matchCount = Number(process.env.MATCH_COUNT) || 50;

    if (process.env.RIOT_MOCK) {
      const { buildMockProfile } = await import("./mock-profile.js");
      const mode = process.env.RIOT_MOCK === "1" ? "ok" : process.env.RIOT_MOCK;
      const result = buildMockProfile(mode);
      if (!result.error) {
        memProfile = result;
        memFetchedAt = Date.now();
        return result;
      }
      if (memProfile) return { ...memProfile, error: result.error, updatedAt: result.updatedAt };
      return result;
    }

    if (!apiKey || !riotId) {
      return { configured: false, updatedAt: Date.now() };
    }

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

      let matchCacheData = await loadMatchCache();
      if (!matchCacheData || matchCacheData.puuid !== puuid) {
        matchCacheData = { puuid, matches: {} };
      }

      const [summoner, leagueEntries, masteryRaw, matchIds] = await Promise.all([
        client.getSummonerByPuuid(puuid),
        client.getLeagueEntriesByPuuid(puuid),
        client.getTopMastery(puuid, 10),
        client.getMatchIds(puuid, matchCount),
      ]);

      const newIds = matchIds.filter((id) => !matchCacheData.matches[id]);
      for (const id of newIds) {
        const match = await client.getMatch(id);
        const summary = buildMatchSummary(match, puuid, champions);
        if (summary) matchCacheData.matches[id] = summary;
      }

      const needPlayers = Object.values(matchCacheData.matches)
        .sort((a, b) => b.gameEnd - a.gameEnd)
        .slice(0, HISTORY_SIZE)
        .filter((m) => !m.players)
        .slice(0, BACKFILL_PER_REFRESH);
      let backfilled = 0;
      for (const m of needPlayers) {
        try {
          const summary = buildMatchSummary(await client.getMatch(m.matchId), puuid, champions);
          if (summary) {
            matchCacheData.matches[m.matchId] = summary;
            backfilled++;
          }
        } catch {
          break; // rate limited or transient — retry on the next refresh
        }
      }

      if (newIds.length > 0 || backfilled > 0) {
        trimMatchCache(matchCacheData);
        await saveMatchCache(matchCacheData);
      }

      // matchIds is newest-first from Riot; fall back to gameEnd sort so the
      // history stays ordered even as it grows beyond the fetched id window.
      const known = matchIds.map((id) => matchCacheData.matches[id]).filter(Boolean);
      const extra = Object.values(matchCacheData.matches).filter((m) => !matchIds.includes(m.matchId));
      const combined = [...known, ...extra].sort((a, b) => b.gameEnd - a.gameEnd);

      const ranked = {
        solo: mapLeagueEntry(leagueEntries, "RANKED_SOLO_5x5"),
        flex: mapLeagueEntry(leagueEntries, "RANKED_FLEX_SR"),
      };

      const apexCutoffs = await getApexCutoffs(client, ranked.solo);
      const lpHistory = await lpStore.record(puuid, ranked).catch(() => ({ solo: [], flex: [] }));

      const mastery = masteryRaw.map((m) => ({
        champion: championIdByKey(champions, m.championId) ?? String(m.championId),
        level: m.championLevel,
        points: m.championPoints,
      }));

      const { form, championStats, matchups } = aggregateMatches(combined);

      const profile = {
        configured: true,
        updatedAt: Date.now(),
        account: {
          gameName: account.gameName,
          tagLine: account.tagLine,
          level: summoner.summonerLevel,
          profileIconId: summoner.profileIconId,
        },
        ranked,
        apexCutoffs,
        lpHistory,
        mastery,
        recent: combined.slice(0, 20),
        history: combined.slice(0, HISTORY_SIZE),
        form,
        championStats,
        championStatsByQueue: championStatsByQueue(combined),
        matchups,
      };

      memProfile = profile;
      memFetchedAt = Date.now();
      return profile;
    } catch (err) {
      const code = err instanceof RiotApiError ? err.code : "UPSTREAM";
      const message = err instanceof RiotApiError ? err.message : "Unexpected error talking to Riot's API.";
      console.error("Profile refresh failed:", message);
      if (memProfile) return { ...memProfile, error: { code, message } };
      return { configured: true, error: { code, message }, updatedAt: Date.now() };
    }
  }

  async function getProfile({ refresh } = {}) {
    if (!refresh && memProfile && Date.now() - memFetchedAt < TTL_MS) {
      return memProfile;
    }
    // dedupe: if a refresh is already in flight, piggyback on it
    if (inFlight) return inFlight;
    inFlight = fetchFresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  /** Forget the cached profile (e.g. after the account settings changed). */
  function reset() {
    memProfile = null;
    memFetchedAt = 0;
  }

  return { getProfile, reset };
}
