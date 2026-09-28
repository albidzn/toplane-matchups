import { describe, it, expect } from "vitest";
import { isArenaMatch, buildArenaMatchEntry, aggregateArenaStats } from "../server/arena.js";

const champions = [
  { id: "Sett", name: "Sett", key: "875" },
  { id: "Ahri", name: "Ahri", key: "103" },
];

function match({ gameMode = "CHERRY", championId = 875, win = true, puuid = "p1" } = {}) {
  return {
    metadata: { matchId: "M1" },
    info: {
      gameMode,
      gameEndTimestamp: 1000,
      participants: [{ puuid, championId, win, championName: "Sett" }],
    },
  };
}

describe("isArenaMatch", () => {
  it("is true only for gameMode CHERRY", () => {
    expect(isArenaMatch(match({ gameMode: "CHERRY" }))).toBe(true);
    expect(isArenaMatch(match({ gameMode: "CLASSIC" }))).toBe(false);
    expect(isArenaMatch(null)).toBe(false);
  });
});

describe("buildArenaMatchEntry", () => {
  it("maps the participant's champion and win onto a Data Dragon id", () => {
    const entry = buildArenaMatchEntry(match({ championId: 875, win: true }), "p1", champions);
    expect(entry).toMatchObject({ champion: "Sett", win: true, gameEnd: 1000 });
  });

  it("returns null for a non-Arena match", () => {
    expect(buildArenaMatchEntry(match({ gameMode: "CLASSIC" }), "p1", champions)).toBeNull();
  });

  it("returns null when the puuid isn't a participant", () => {
    expect(buildArenaMatchEntry(match({ puuid: "someone-else" }), "p1", champions)).toBeNull();
  });

  it("falls back to the raw championName when the key isn't in the champion list", () => {
    const entry = buildArenaMatchEntry(match({ championId: 999999 }), "p1", champions);
    expect(entry.champion).toBe("Sett"); // championName from the fixture
  });
});

describe("aggregateArenaStats", () => {
  it("counts games and wins per champion", () => {
    const stats = aggregateArenaStats([
      { champion: "Sett", win: true },
      { champion: "Sett", win: false },
      { champion: "Ahri", win: true },
    ]);
    expect(stats).toEqual([
      { champion: "Sett", games: 2, wins: 1 },
      { champion: "Ahri", games: 1, wins: 1 },
    ]);
  });

  it("returns an empty list for no entries", () => {
    expect(aggregateArenaStats([])).toEqual([]);
  });
});
