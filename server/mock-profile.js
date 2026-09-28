// Fixture data for the Profile tab, used when RIOT_MOCK is set. Lets the UI
// be built and previewed without a Riot API key. RIOT_MOCK=1 gives a full
// profile; RIOT_MOCK=invalid_key / RIOT_MOCK=not_found simulate those error
// states (each returning a configured-but-erroring response, like the real
// client would after a failed refresh).

import { aggregateMatches, championStatsByQueue } from "./profile-stats.js";

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

const MOCK_TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
const MOCK_DIVISIONS = ["IV", "III", "II", "I"];

// A believable 30-day climb ending at the given entry, as a random walk in absolute LP.
function buildMockLpHistory(rand, entry) {
  const tierIdx = MOCK_TIERS.indexOf(entry.tier);
  const end = tierIdx === -1 ? 2800 + entry.lp : tierIdx * 400 + MOCK_DIVISIONS.indexOf(entry.rank) * 100 + entry.lp;
  const now = Date.now();
  const steps = 16;
  let value = end - 140;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const v = Math.max(0, i === steps - 1 ? end : Math.round(value));
    const t = now - (steps - 1 - i) * 1.9 * 24 * 3600 * 1000;
    if (v >= 2800) out.push({ t, tier: "MASTER", rank: "I", lp: v - 2800 });
    else
      out.push({
        t,
        tier: MOCK_TIERS[Math.floor(v / 400)],
        rank: MOCK_DIVISIONS[Math.floor((v % 400) / 100)],
        lp: v % 100,
      });
    value += (rand() - 0.3) * 40 + 8;
  }
  return out;
}

const MOCK_ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const MOCK_OTHERS = ["LeeSin", "Ahri", "Jinx", "Thresh", "Vi", "Syndra", "Caitlyn", "Nautilus", "Sejuani", "Zed"];
const MOCK_NAMES = ["Naturalswagger", "psiko", "Spearyus", "Trigger", "lobby pacientov", "Curborn", "MosR", "Azuro", "NEYPALL", "Keklex"];

function buildMockPlayers(rand, { champion, opponentChamp, win, kills, deaths, assists, durationSec, cs, gold, damage }) {
  const minutes = durationSec / 60;
  return Array.from({ length: 10 }, (_, i) => {
    const mine = i < 5;
    const role = MOCK_ROLES[i % 5];
    const isMe = mine && role === "TOP";
    const k = isMe ? kills : Math.floor(rand() * 12);
    const d = isMe ? deaths : Math.floor(rand() * 9);
    return {
      name: isMe ? "PreviewSummoner" : MOCK_NAMES[i],
      champion: isMe ? champion : role === "TOP" ? opponentChamp : MOCK_OTHERS[(i + Math.floor(rand() * 5)) % MOCK_OTHERS.length],
      position: role,
      teamId: mine ? 100 : 200,
      win: mine ? win : !win,
      kills: k,
      deaths: d,
      assists: isMe ? assists : Math.floor(rand() * 14),
      cs: isMe ? cs : Math.floor(minutes * (role === "UTILITY" ? 1.5 : 5 + rand() * 3)),
      damage: isMe ? damage : Math.floor(8000 + rand() * 30000),
      gold: isMe ? gold : Math.floor(8000 + rand() * 8000),
      level: Math.min(18, Math.floor(11 + minutes / 4 + rand() * 2)),
      items: Array.from({ length: 7 }, () => 0),
      isMe,
    };
  });
}

function buildMockMatches(rand, count) {
  const matches = [];
  const now = Date.now();
  let offsetMs = 20 * 60 * 1000;
  for (let i = 0; i < count; i++) {
    const champion = POOL[Math.floor(rand() * POOL.length)];
    const opponentChamp = ENEMIES[Math.floor(rand() * ENEMIES.length)];
    const win = rand() > 0.42;
    const kills = Math.floor(rand() * 10);
    const deaths = Math.floor(rand() * 7) + 1;
    const assists = Math.floor(rand() * 8);
    const durationSec = Math.floor(1400 + rand() * 1400);
    const remake = rand() < 0.03;
    const cs = Math.floor((durationSec / 60) * (5 + rand() * 3));
    const gold = Math.floor(8000 + rand() * 8000);
    const damage = Math.floor(10000 + rand() * 15000);

    matches.push({
      matchId: `MOCK_${i}`,
      queueId: rand() < 0.28 ? 440 : 420,
      gameEnd: now - offsetMs,
      durationSec: remake ? 220 : durationSec,
      champion,
      position: "TOP",
      win,
      kills,
      deaths,
      assists,
      cs,
      gold,
      damage,
      items: Array.from({ length: 7 }, () => 0),
      opponent: { champion: opponentChamp },
      remake,
      players: buildMockPlayers(rand, { champion, opponentChamp, win, kills, deaths, assists, durationSec, cs, gold, damage }),
    });
    // games come in sessions of ~4, ~50min apart, with long breaks in between
    offsetMs += i % 4 === 3 ? (8 + rand() * 14) * 3600 * 1000 : (50 + rand() * 15) * 60 * 1000;
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

  const ranked = {
    solo: process.env.RIOT_MOCK_APEX
      ? { tier: "MASTER", rank: "I", lp: 6, wins: 134, losses: 127, hotStreak: false }
      : { tier: "GOLD", rank: "II", lp: 45, wins: 63, losses: 58, hotStreak: true },
    flex: { tier: "SILVER", rank: "I", lp: 12, wins: 8, losses: 9, hotStreak: false },
  };

  return {
    configured: true,
    updatedAt,
    account: {
      gameName: "PreviewSummoner",
      tagLine: "EUW",
      level: 342,
      profileIconId: 4568,
    },
    ranked,
    apexCutoffs: process.env.RIOT_MOCK_APEX ? { grandmaster: 1714, challenger: 2323, approx: false } : null,
    lpHistory: {
      solo: buildMockLpHistory(rand, ranked.solo),
      flex: buildMockLpHistory(rand, ranked.flex),
    },
    mastery: POOL.map((champion, i) => ({
      champion,
      level: 7 - Math.min(i, 4),
      points: Math.floor(180000 / (i + 1)),
    })),
    recent: matches.slice(0, 20),
    history: matches,
    form,
    championStats,
    championStatsByQueue: championStatsByQueue(matches),
    matchups,
  };
}
