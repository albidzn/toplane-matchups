import { describe, it, expect } from "vitest";
import { summarizeRecent } from "../src/lib/recent-summary";
import type { MatchSummary } from "../src/lib/types";

function match(over: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: Math.random().toString(),
    queueId: 420,
    gameEnd: 0,
    durationSec: 1800,
    champion: "Sett",
    position: "TOP",
    win: true,
    kills: 5,
    deaths: 2,
    assists: 7,
    cs: 210,
    gold: 0,
    damage: 0,
    items: [],
    opponent: null,
    remake: false,
    ...over,
  };
}

describe("summarizeRecent", () => {
  it("counts wins/losses and averages KDA and CS/min", () => {
    const s = summarizeRecent([match(), match({ win: false, kills: 1, deaths: 6, assists: 3, cs: 150 })]);
    expect(s.games).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.avgKills).toBe(3);
    expect(s.avgDeaths).toBe(4);
    expect(s.avgAssists).toBe(5);
    expect(s.kdaRatio).toBeCloseTo((6 + 10) / 8);
    expect(s.csPerMin).toBeCloseTo(360 / 60);
  });

  it("excludes remakes", () => {
    const s = summarizeRecent([match(), match({ remake: true, win: false })]);
    expect(s.games).toBe(1);
    expect(s.losses).toBe(0);
  });

  it("ranks champions by games played, then wins", () => {
    const s = summarizeRecent([
      match({ champion: "Garen" }),
      match({ champion: "Sett", win: false }),
      match({ champion: "Sett" }),
      match({ champion: "Ornn" }),
    ]);
    expect(s.champions.map((c) => c.champion)).toEqual(["Sett", "Garen", "Ornn"]);
    expect(s.champions[0]).toMatchObject({ games: 2, wins: 1 });
  });

  it("returns role counts in fixed role order, including unplayed roles", () => {
    const s = summarizeRecent([match({ position: "TOP" }), match({ position: "TOP" }), match({ position: "UTILITY" })]);
    expect(s.roles).toEqual([
      { position: "TOP", games: 2 },
      { position: "JUNGLE", games: 0 },
      { position: "MIDDLE", games: 0 },
      { position: "BOTTOM", games: 0 },
      { position: "UTILITY", games: 1 },
    ]);
  });

  it("handles an empty history without dividing by zero", () => {
    const s = summarizeRecent([]);
    expect(s).toMatchObject({ games: 0, avgKills: 0, csPerMin: 0, kdaRatio: 0 });
  });
});
