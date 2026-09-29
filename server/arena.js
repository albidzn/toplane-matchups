// Arena ("CHERRY") aggregation — kept separate from profile-stats.js because Arena games
// aren't "ranked" and need their own match-id discovery (see arena-service.js). The queue id
// Riot assigns to Arena keeps changing across its beta/season/event revisions — this static
// list (confirmed via the League client's own /lol-game-queues/v1/queues, which knows every
// queue id it's ever offered) is only the fallback for when that endpoint isn't reachable;
// arena-service.js prefers the live list and remembers it on disk. Either way, the actual
// per-match filter is always `info.gameMode === "CHERRY"`, which has stayed stable throughout.
export const STATIC_ARENA_QUEUE_IDS = [1700, 1704, 1710, 1740, 1750];

/** Extracts Arena queue ids from the League client's own queue catalog (`/lol-game-queues/v1/queues`). */
export function arenaQueueIdsFromLcuQueues(queues) {
  return (queues ?? [])
    .filter((q) => (q?.gameMode ?? "").toUpperCase() === "CHERRY" && Number.isFinite(q?.id))
    .map((q) => q.id);
}

export function isArenaMatch(match) {
  return match?.info?.gameMode === "CHERRY";
}

function championIdByKey(champions, key) {
  return champions.find((c) => c.key === String(key))?.id ?? null;
}

/**
 * Slim per-match record — no scoreboard, just enough to know the champion and placement.
 * Stores the raw `placement` rather than a precomputed win/loss flag on purpose: these records
 * are cached indefinitely (never re-fetched once an id is known), so if "win" were baked in here
 * and its definition ever changed again, every already-cached match would silently keep judging
 * itself by the old definition forever. aggregateArenaStats() applies today's definition (1st
 * place, not just top-4/podium — `participant.win` for Arena is true for any top-4 finish, a
 * looser bar than what "won" means in the Arena Season Journey checklist) to every entry, always.
 */
export function buildArenaMatchEntry(match, puuid, champions) {
  if (!isArenaMatch(match)) return null;
  const me = match?.info?.participants?.find((p) => p.puuid === puuid);
  if (!me) return null;
  return {
    champion: championIdByKey(champions, me.championId) ?? me.championName,
    placement: me.placement,
    gameEnd: match.info.gameEndTimestamp ?? match.info.gameStartTimestamp ?? Date.now(),
  };
}

/**
 * Arena has no season-boundary field in its match or LCU data, so "this season only" (matching
 * the in-game Arena Season Journey) can only be applied as a manual cutoff date the user sets
 * themselves in Settings — `seasonStartMs` is that cutoff, or null/undefined for all-time.
 */
export function filterBySeasonStart(entries, seasonStartMs) {
  if (!seasonStartMs) return entries;
  return entries.filter((e) => e.gameEnd >= seasonStartMs);
}

/** One row per champion played, most games first. A "win" is finishing 1st, not just top-4. */
export function aggregateArenaStats(entries) {
  const byChamp = new Map();
  for (const e of entries) {
    const c = byChamp.get(e.champion) ?? { champion: e.champion, games: 0, wins: 0 };
    c.games++;
    if (e.placement === 1) c.wins++;
    byChamp.set(e.champion, c);
  }
  return [...byChamp.values()].sort((a, b) => b.games - a.games);
}
