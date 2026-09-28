// Arena ("CHERRY") aggregation — kept separate from profile-stats.js because Arena games
// aren't "ranked" and need their own match-id discovery (see arena-service.js). The queue id
// Riot assigns to Arena has changed across its beta/season revisions (seen: 1700, 1710, 1750),
// so ARENA_QUEUE_IDS is only a hint for *discovering* candidate match ids — the actual filter
// is always the match's own `info.gameMode === "CHERRY"`, which has stayed stable.
export const ARENA_QUEUE_IDS = [1700, 1710, 1750];

export function isArenaMatch(match) {
  return match?.info?.gameMode === "CHERRY";
}

function championIdByKey(champions, key) {
  return champions.find((c) => c.key === String(key))?.id ?? null;
}

/** Slim per-match record — no scoreboard, just enough to know "did I win, on what champion". */
export function buildArenaMatchEntry(match, puuid, champions) {
  if (!isArenaMatch(match)) return null;
  const me = match?.info?.participants?.find((p) => p.puuid === puuid);
  if (!me) return null;
  return {
    champion: championIdByKey(champions, me.championId) ?? me.championName,
    win: Boolean(me.win),
    gameEnd: match.info.gameEndTimestamp ?? match.info.gameStartTimestamp ?? Date.now(),
  };
}

/** One row per champion played, most games first. */
export function aggregateArenaStats(entries) {
  const byChamp = new Map();
  for (const e of entries) {
    const c = byChamp.get(e.champion) ?? { champion: e.champion, games: 0, wins: 0 };
    c.games++;
    if (e.win) c.wins++;
    byChamp.set(e.champion, c);
  }
  return [...byChamp.values()].sort((a, b) => b.games - a.games);
}
