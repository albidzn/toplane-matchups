import type { MatchSummary } from "./types";

export const ROLE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;

export interface RecentChampion {
  champion: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface RecentSummary {
  games: number;
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kdaRatio: number;
  csPerMin: number;
  champions: RecentChampion[]; // most played first
  roles: { position: (typeof ROLE_ORDER)[number]; games: number }[]; // fixed role order
}

/** Aggregates a slice of recent matches (remakes excluded) for the profile summary panel. */
export function summarizeRecent(matches: MatchSummary[]): RecentSummary {
  const real = matches.filter((m) => !m.remake);
  const games = real.length;
  const wins = real.filter((m) => m.win).length;

  const sum = (pick: (m: MatchSummary) => number) => real.reduce((acc, m) => acc + pick(m), 0);
  const kills = sum((m) => m.kills);
  const deaths = sum((m) => m.deaths);
  const assists = sum((m) => m.assists);
  const minutes = sum((m) => m.durationSec) / 60;

  const byChamp = new Map<string, RecentChampion>();
  for (const m of real) {
    const entry = byChamp.get(m.champion) ?? {
      champion: m.champion,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    entry.games += 1;
    if (m.win) entry.wins += 1;
    entry.kills += m.kills;
    entry.deaths += m.deaths;
    entry.assists += m.assists;
    byChamp.set(m.champion, entry);
  }

  return {
    games,
    wins,
    losses: games - wins,
    avgKills: games ? kills / games : 0,
    avgDeaths: games ? deaths / games : 0,
    avgAssists: games ? assists / games : 0,
    kdaRatio: (kills + assists) / Math.max(1, deaths),
    csPerMin: minutes > 0 ? sum((m) => m.cs) / minutes : 0,
    champions: [...byChamp.values()].sort((a, b) => b.games - a.games || b.wins - a.wins),
    roles: ROLE_ORDER.map((position) => ({
      position,
      games: real.filter((m) => m.position === position).length,
    })),
  };
}
