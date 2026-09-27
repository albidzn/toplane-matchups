import { describe, it, expect } from "vitest";
import { aggregateMatches } from "../server/profile-stats.js";

function match(overrides = {}) {
  return {
    matchId: "M1",
    queueId: 420,
    gameEnd: Date.now(),
    durationSec: 1800,
    champion: "Sett",
    position: "TOP",
    win: true,
    kills: 5,
    deaths: 2,
    assists: 3,
    cs: 180,
    gold: 12000,
    damage: 20000,
    items: [0, 0, 0, 0, 0, 0, 0],
    opponent: { champion: "Darius" },
    remake: false,
    ...overrides,
  };
}

describe("aggregateMatches", () => {
  it("excludes remakes from form, championStats and matchups", () => {
    const matches = [match({ matchId: "A" }), match({ matchId: "B", remake: true, win: false })];
    const { form, championStats } = aggregateMatches(matches);
    expect(form.games).toBe(1);
    expect(championStats[0].games).toBe(1);
  });

  it("computes winrate-relevant win counts per champion", () => {
    const matches = [
      match({ matchId: "A", champion: "Sett", win: true }),
      match({ matchId: "B", champion: "Sett", win: false }),
      match({ matchId: "C", champion: "Garen", win: true }),
    ];
    const { championStats } = aggregateMatches(matches);
    const sett = championStats.find((c) => c.champion === "Sett");
    const garen = championStats.find((c) => c.champion === "Garen");
    expect(sett).toMatchObject({ games: 2, wins: 1 });
    expect(garen).toMatchObject({ games: 1, wins: 1 });
  });

  it("sorts championStats by games played, descending", () => {
    const matches = [
      match({ matchId: "A", champion: "Garen" }),
      match({ matchId: "B", champion: "Sett" }),
      match({ matchId: "C", champion: "Sett" }),
    ];
    const { championStats } = aggregateMatches(matches);
    expect(championStats[0].champion).toBe("Sett");
  });

  it("builds a matchup record keyed by my champion vs the opponent's", () => {
    const matches = [
      match({ matchId: "A", champion: "Sett", opponent: { champion: "Darius" }, win: true }),
      match({ matchId: "B", champion: "Sett", opponent: { champion: "Darius" }, win: false }),
      match({ matchId: "C", champion: "Sett", opponent: { champion: "Garen" }, win: true }),
    ];
    const { matchups } = aggregateMatches(matches);
    const vsDarius = matchups.find((m) => m.enemyChampion === "Darius" && m.myChampion === "Sett");
    expect(vsDarius).toMatchObject({ wins: 1, losses: 1 });
  });

  it("skips matches with no opponent when building matchups", () => {
    const matches = [match({ matchId: "A", opponent: null })];
    const { matchups } = aggregateMatches(matches);
    expect(matchups).toHaveLength(0);
  });

  it("only looks at the last 20 games for form, but all games for championStats", () => {
    const matches = Array.from({ length: 25 }, (_, i) => match({ matchId: `M${i}`, champion: "Sett" }));
    const { form, championStats } = aggregateMatches(matches);
    expect(form.games).toBe(20);
    expect(championStats[0].games).toBe(25);
  });
});
