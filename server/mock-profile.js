// Fixture data for the Profile tab, used when RIOT_MOCK is set. Lets the UI
// be built and previewed without a Riot API key. RIOT_MOCK=1 gives a full
// profile; RIOT_MOCK=invalid_key / RIOT_MOCK=not_found simulate those error
// states (each returning a configured-but-erroring response, like the real
// client would after a failed refresh).

import { aggregateMatches } from "./profile-stats.js";

const POOL = ["Sett", "Ambessa", "Garen", "DrMundo", "Mordekaiser", "KSante", "Ornn"];
const ENEMIES = [
  "Aatrox", "Darius", "Camille", "Irelia", "Fiora", "Malphite", "Riven",
  "Gnar", "Jax", "Renekton", "Illaoi", "Kennen", "Teemo", "Quinn",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildMockMatches(rand, count) {
  const matches = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const champion = POOL[Math.floor(rand() * POOL.length)];
    const opponentChamp = ENEMIES[Math.floor(rand() * ENEMIES.length)];
    const win = rand() > 0.42;
    const kills = Math.floor(rand() * 10);
    const deaths = Math.floor(rand() * 7) + 1;
    const assists = Math.floor(rand() * 8);
    const durationSec = Math.floor(1400 + rand() * 1400);
    const remake = rand() < 0.03;

    matches.push({
      matchId: `MOCK_${i}`,
      queueId: 420,
      gameEnd: now - i * (3600 * 1000 * (3 + rand() * 20)),
      durationSec: remake ? 220 : durationSec,
      champion,
      position: "TOP",
      win,
      kills,
      deaths,
      assists,
      cs: Math.floor((durationSec / 60) * (5 + rand() * 3)),
      gold: Math.floor(8000 + rand() * 8000),
      damage: Math.floor(10000 + rand() * 15000),
      items: Array.from({ length: 7 }, () => 0),
      opponent: { champion: opponentChamp },
      remake,
    });
  }
  return matches;
}

export function buildMockProfile(mode) {
  const updatedAt = Date.now();

  if (mode === "invalid_key") {
    return {
      configured: true,
      error: {
        code: "INVALID_KEY",
        message:
          "The Riot API key was rejected. Dev keys expire every 24h — grab a fresh one from developer.riotgames.com and enter it in Settings.",
      },
      updatedAt,
    };
  }

  if (mode === "not_found") {
    return {
      configured: true,
      error: {
        code: "NOT_FOUND",
        message: "Riot ID not found. Double-check your Riot ID and server in Settings.",
      },
      updatedAt,
    };
  }

  const rand = seededRandom(42);
  const matches = buildMockMatches(rand, 60);
  const { form, championStats, matchups } = aggregateMatches(matches);

  return {
    configured: true,
    updatedAt,
    account: {
      gameName: "PreviewSummoner",
      tagLine: "EUW",
      level: 342,
      profileIconId: 4568,
    },
    ranked: {
      solo: { tier: "GOLD", rank: "II", lp: 45, wins: 63, losses: 58, hotStreak: true },
      flex: { tier: "SILVER", rank: "I", lp: 12, wins: 8, losses: 9, hotStreak: false },
    },
    mastery: POOL.map((champion, i) => ({
      champion,
      level: 7 - Math.min(i, 4),
      points: Math.floor(180000 / (i + 1)),
    })),
    recent: matches.slice(0, 20),
    form,
    championStats,
    matchups,
  };
}
