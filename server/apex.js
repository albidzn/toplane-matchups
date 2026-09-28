export const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

/** The LP you need to be in a league = the lowest LP among its current entries. */
export function cutoffFromLeague(league) {
  const lps = (league?.entries ?? []).map((e) => e.leaguePoints).filter((n) => Number.isFinite(n));
  return lps.length ? Math.min(...lps) : null;
}
