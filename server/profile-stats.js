// Shared aggregation over a list of MatchSummary objects (newest first),
// used by both the real Riot-backed profile service and the mock fixture
// data, so the two stay in sync shape-wise.

export const QUEUE_SOLO = 420;
export const QUEUE_FLEX = 440;

/** Champion stats split by ranked queue, so the Profile tab's Solo/Duo and Flex filters can swap them in. */
export function championStatsByQueue(matches) {
  return {
    solo: aggregateMatches(matches.filter((m) => m.queueId === QUEUE_SOLO)).championStats,
    flex: aggregateMatches(matches.filter((m) => m.queueId === QUEUE_FLEX)).championStats,
  };
}

/**
 * @param {Array} matches MatchSummary[] — newest first
 * @returns {{ form: object, championStats: object[], matchups: object[] }}
 */
export function aggregateMatches(matches) {
  const real = matches.filter((m) => !m.remake);
  const last20 = real.slice(0, 20);

  const totalDeaths = last20.reduce((s, m) => s + m.deaths, 0);
  const form = {
    games: last20.length,
    wins: last20.filter((m) => m.win).length,
    avgKda:
      last20.length === 0
        ? 0
        : (last20.reduce((s, m) => s + m.kills + m.assists, 0) / Math.max(1, totalDeaths)) || 0,
    avgCsPerMin:
      last20.length === 0
        ? 0
        : last20.reduce((s, m) => s + m.cs / (m.durationSec / 60), 0) / last20.length,
  };

  const byChamp = new Map();
  for (const m of real) {
    const c = byChamp.get(m.champion) ?? {
      champion: m.champion,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      csPerMinTotal: 0,
    };
    c.games++;
    if (m.win) c.wins++;
    c.kills += m.kills;
    c.deaths += m.deaths;
    c.assists += m.assists;
    c.csPerMinTotal += m.cs / (m.durationSec / 60);
    byChamp.set(m.champion, c);
  }
  const championStats = Array.from(byChamp.values())
    .map((c) => ({
      champion: c.champion,
      games: c.games,
      wins: c.wins,
      kills: c.kills,
      deaths: c.deaths,
      assists: c.assists,
      csPerMin: c.csPerMinTotal / c.games,
    }))
    .sort((a, b) => b.games - a.games);

  const matchupMap = new Map();
  for (const m of real) {
    if (!m.opponent) continue;
    const key = `${m.champion}|${m.opponent.champion}`;
    const rec = matchupMap.get(key) ?? {
      myChampion: m.champion,
      enemyChampion: m.opponent.champion,
      wins: 0,
      losses: 0,
    };
    if (m.win) rec.wins++;
    else rec.losses++;
    matchupMap.set(key, rec);
  }

  return { form, championStats, matchups: Array.from(matchupMap.values()) };
}
