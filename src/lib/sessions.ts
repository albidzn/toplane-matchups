import type { MatchSummary } from "./types";

/** A new session starts when there's more than this between one game ending and the next one starting. */
export const SESSION_GAP_MS = 60 * 60 * 1000;

export interface MatchSession {
  matches: MatchSummary[]; // newest first
  endedAt: number;
  games: number; // remakes excluded
  wins: number;
  losses: number;
  playTimeSec: number;
}

/** Groups matches into play sessions, newest session first. Input order doesn't matter. */
export function groupSessions(matches: MatchSummary[], gapMs = SESSION_GAP_MS): MatchSession[] {
  const sorted = [...matches].sort((a, b) => b.gameEnd - a.gameEnd);
  const groups: MatchSummary[][] = [];

  for (const m of sorted) {
    const current = groups[groups.length - 1];
    const previousNewer = current?.[current.length - 1]; // the oldest game collected so far
    const previousStart = previousNewer ? previousNewer.gameEnd - previousNewer.durationSec * 1000 : 0;
    if (current && previousStart - m.gameEnd <= gapMs) current.push(m);
    else groups.push([m]);
  }

  return groups.map((group) => {
    const real = group.filter((m) => !m.remake);
    const wins = real.filter((m) => m.win).length;
    return {
      matches: group,
      endedAt: group[0].gameEnd,
      games: real.length,
      wins,
      losses: real.length - wins,
      playTimeSec: group.reduce((acc, m) => acc + m.durationSec, 0),
    };
  });
}
