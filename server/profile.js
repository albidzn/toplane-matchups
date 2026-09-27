import fs from "node:fs/promises";
import path from "node:path";
import { createRiotClient, RiotApiError } from "./riot.js";
import { aggregateMatches } from "./profile-stats.js";

const TTL_MS = 2 * 60 * 1000;
// Cap how many matches we keep on disk so the cache file (and JSON parse
// time) doesn't grow forever over months of play. Plenty for accurate
// matchup/champion stats; oldest games are dropped first.
const MATCH_CACHE_LIMIT = 1000;

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
  };
}

export function createProfileService({ dataDir, getChampions }) {
  const cachePath = path.join(dataDir, "match-cache.json");

  let memProfile = null; // last successful (error-free) profile
  let memFetchedAt = 0;
  let inFlight = null; // dedupe concurrent refreshes

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

      if (newIds.length > 0) {
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
        mastery,
        recent: combined.slice(0, 20),
        form,
        championStats,
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
