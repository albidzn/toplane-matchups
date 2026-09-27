// Pure helpers for merging the Live Client Data API's per-tick stats
// (level, KDA, CS, items, game-end result) onto our roster — kept separate
// from live-game.js's orchestration so the merge logic is unit-testable.

/**
 * @param {{riotId?: string|null}[]} participants
 * @param {{riotIdGameName:string, riotIdTagLine:string, level:number, isDead:boolean,
 *          respawnTimer:number, scores:{kills:number,deaths:number,assists:number,creepScore:number},
 *          items:{itemID:number}[]}[]|null|undefined} liveClientPlayers
 * @returns same shape as `participants`, with live stat fields merged in where a match was found
 */
export function mergeLiveClientStats(participants, liveClientPlayers) {
  if (!liveClientPlayers?.length) return participants;

  const byRiotId = new Map(
    liveClientPlayers.map((p) => [`${p.riotIdGameName}#${p.riotIdTagLine}`.toLowerCase(), p])
  );

  return participants.map((p) => {
    const key = p.riotId ? p.riotId.toLowerCase() : null;
    const live = key ? byRiotId.get(key) : undefined;
    if (!live) return p;

    return {
      ...p,
      level: live.level,
      isDead: Boolean(live.isDead),
      respawnTimer: live.respawnTimer ?? 0,
      kills: live.scores?.kills ?? 0,
      deaths: live.scores?.deaths ?? 0,
      assists: live.scores?.assists ?? 0,
      cs: live.scores?.creepScore ?? 0,
      items: (live.items ?? []).map((i) => i.itemID),
    };
  });
}

/**
 * Scans the Live Client API's event log for the match's outcome. Only
 * meaningful for the *local* player's game (the event doesn't say which
 * team — "Win"/"Lose" is always relative to whoever's client we're reading).
 * @param {{EventName?: string, Result?: string}[]|null|undefined} events
 * @returns {"Win"|"Lose"|null}
 */
export function detectGameEndResult(events) {
  const gameEnd = events?.find((e) => e.EventName === "GameEnd");
  if (!gameEnd) return null;
  return gameEnd.Result === "Win" || gameEnd.Result === "Lose" ? gameEnd.Result : null;
}
