// Fixture data for the Arena tab, used when RIOT_MOCK is set — mirrors mock-profile.js's
// error-mode handling so the same RIOT_MOCK=invalid_key / not_found values work here too.
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// A believable chunk of a champion pool — real coverage comes from Data Dragon's full list at
// render time, this just needs to be plausible, not exhaustive.
const PLAYED = [
  "Sett", "Ambessa", "Garen", "DrMundo", "Mordekaiser", "KSante", "Ornn", "Darius", "Riven", "Camille",
  "Jinx", "Ahri", "LeeSin", "Thresh", "Yasuo", "Lux", "Vi", "Ziggs", "Malphite", "Volibear",
];

export function buildMockArena(mode) {
  const updatedAt = Date.now();

  if (mode === "invalid_key") {
    return {
      configured: true,
      error: { code: "INVALID_KEY", message: "The Riot API key was rejected. Dev keys expire every 24h — grab a fresh one from developer.riotgames.com and enter it in Settings." },
      updatedAt,
    };
  }
  if (mode === "not_found") {
    return {
      configured: true,
      error: { code: "NOT_FOUND", message: "Riot ID not found. Double-check your Riot ID and server in Settings." },
      updatedAt,
    };
  }

  const rand = seededRandom(11);
  const stats = PLAYED.map((champion) => {
    const games = 1 + Math.floor(rand() * 6);
    const wins = Math.floor(rand() * (games + 1));
    return { champion, games, wins };
  }).filter((s) => s.games > 0);

  return {
    configured: true,
    updatedAt,
    stats,
    backfillComplete: true,
    seasonStart: process.env.ARENA_SEASON_START || "2026-04-29T00:00:00Z",
    seasonStartSource: process.env.ARENA_SEASON_START ? "manual" : "auto",
    seasonFame: { level: 8, fame: 24500, totalLevels: 12, levelProgress: 60 },
  };
}
