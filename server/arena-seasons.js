// Arena season boundaries — hand-maintained. Neither Riot's match/LCU data nor
// the public queues.json carries a season-boundary field for Arena, so there's
// no way to derive this automatically; add a row here when a new Arena
// season/event starts. Boundaries are UTC midnight on the day a season starts.
export const ARENA_SEASONS = [
  { name: "Arena: Launch (2023)", start: "2023-07-20T00:00:00Z", end: "2023-08-29T00:00:00Z" },
  { name: "Arena: Winterblessed (2023)", start: "2023-12-07T00:00:00Z", end: "2024-01-08T00:00:00Z" },
  { name: "Arena 2024", start: "2024-05-01T00:00:00Z", end: "2024-09-24T00:00:00Z" },
  { name: "Spirit Blossom Beyond", start: "2025-06-25T00:00:00Z", end: "2025-08-27T00:00:00Z" },
  { name: "Trials of Twilight", start: "2025-08-27T00:00:00Z", end: "2026-01-08T00:00:00Z" },
  { name: "For Demacia", start: "2026-01-08T00:00:00Z", end: "2026-04-29T00:00:00Z" },
  { name: "Pandemonium", start: "2026-04-29T00:00:00Z", end: null },
];

/** The season a timestamp (ms) falls into, or null if it predates the first listed one. */
export function arenaSeasonAt(nowMs) {
  return ARENA_SEASONS.find((s) => Date.parse(s.start) <= nowMs && (!s.end || Date.parse(s.end) > nowMs)) ?? null;
}

/** Start of the season covering `nowMs` (ms epoch), or null if none is listed for that time. */
export function currentArenaSeasonStartMs(nowMs = Date.now()) {
  const season = arenaSeasonAt(nowMs);
  return season ? Date.parse(season.start) : null;
}
