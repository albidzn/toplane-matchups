import { describe, it, expect } from "vitest";
import { cutoffFromLeague } from "../server/apex.js";

describe("cutoffFromLeague", () => {
  it("is the lowest LP among the league's entries", () => {
    expect(cutoffFromLeague({ entries: [{ leaguePoints: 2400 }, { leaguePoints: 1719 }, { leaguePoints: 1900 }] })).toBe(1719);
  });

  it("returns null for empty or missing leagues", () => {
    expect(cutoffFromLeague({ entries: [] })).toBeNull();
    expect(cutoffFromLeague(null)).toBeNull();
  });
});
