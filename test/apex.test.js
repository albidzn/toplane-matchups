import { describe, it, expect } from "vitest";
import { cutoffFromLeague, cutoffsFromLcuLadder } from "../server/apex.js";

describe("cutoffFromLeague", () => {
  it("is the lowest LP among the league's entries", () => {
    expect(cutoffFromLeague({ entries: [{ leaguePoints: 2400 }, { leaguePoints: 1719 }, { leaguePoints: 1900 }] })).toBe(1719);
  });

  it("returns null for empty or missing leagues", () => {
    expect(cutoffFromLeague({ entries: [] })).toBeNull();
    expect(cutoffFromLeague(null)).toBeNull();
  });
});

describe("cutoffsFromLcuLadder", () => {
  const s = (tier, leaguePoints, pendingDemotion = false) => ({ tier, leaguePoints, pendingDemotion });
  const ladder = {
    divisions: [
      { standings: [s("CHALLENGER", 4000), s("CHALLENGER", 2323), s("CHALLENGER", 2321, true)] },
      { standings: [s("GRANDMASTER", 1900), s("GRANDMASTER", 1714), s("GRANDMASTER", 1611, true), s("GRANDMASTER", 1559, true)] },
    ],
  };

  it("uses the lowest LP among players not in the demotion zone", () => {
    expect(cutoffsFromLcuLadder(ladder)).toEqual({ grandmaster: 1714, challenger: 2323 });
  });

  it("returns null when the ladder has no usable data", () => {
    expect(cutoffsFromLcuLadder(null)).toBeNull();
    expect(cutoffsFromLcuLadder({ divisions: [] })).toBeNull();
  });
});
