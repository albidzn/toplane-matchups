export const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

/** Public-API estimate: the lowest LP in the league. Includes players already in the demotion zone, so it reads low. */
export function cutoffFromLeague(league) {
  const lps = (league?.entries ?? []).map((e) => e.leaguePoints).filter((n) => Number.isFinite(n));
  return lps.length ? Math.min(...lps) : null;
}

/**
 * Exact cutoffs from the League client's ladder (`/lol-ranked/v1/apex-leagues/...`): the lowest LP
 * among players *not* flagged `pendingDemotion` — the same number the client's ladder page shows as
 * "Demotion Cutoff".
 */
export function cutoffsFromLcuLadder(ladder) {
  const standings = (ladder?.divisions ?? []).flatMap((d) => d.standings ?? []);
  const cutoffFor = (tier) => {
    const safe = standings.filter((s) => s.tier === tier && !s.pendingDemotion && Number.isFinite(s.leaguePoints));
    return safe.length ? Math.min(...safe.map((s) => s.leaguePoints)) : null;
  };
  const grandmaster = cutoffFor("GRANDMASTER");
  const challenger = cutoffFor("CHALLENGER");
  return grandmaster == null && challenger == null ? null : { grandmaster, challenger };
}
