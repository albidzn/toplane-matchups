import { describe, it, expect } from "vitest";
import {
  isArenaMatch,
  buildArenaMatchEntry,
  aggregateArenaStats,
  arenaQueueIdsFromLcuQueues,
  filterBySeasonStart,
} from "../server/arena.js";

const champions = [
  { id: "Sett", name: "Sett", key: "875" },
  { id: "Ahri", name: "Ahri", key: "103" },
];

function match({ gameMode = "CHERRY", championId = 875, placement = 1, puuid = "p1" } = {}) {
  return {
    metadata: { matchId: "M1" },
    info: {
      gameMode,
      gameEndTimestamp: 1000,
      participants: [{ puuid, championId, placement, win: placement <= 4, championName: "Sett" }],
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
  it("maps the participant's champion and 1st-place finish onto a Data Dragon id", () => {
    const entry = buildArenaMatchEntry(match({ championId: 875, placement: 1 }), "p1", champions);
    expect(entry).toMatchObject({ champion: "Sett", win: true, gameEnd: 1000 });
  });

  it("does NOT count a top-4 (podium) finish that isn't 1st place as a win", () => {
    // Riot's own `win` field is true for any top-4 finish — deliberately not used here,
    // since the Arena Season Journey's own definition of "won" is strictly 1st place.
    for (const placement of [2, 3, 4]) {
      const entry = buildArenaMatchEntry(match({ placement }), "p1", champions);
      expect(entry.win).toBe(false);
    }
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

describe("arenaQueueIdsFromLcuQueues", () => {
  it("keeps only queues whose gameMode is CHERRY", () => {
    const queues = [
      { id: 1700, gameMode: "CHERRY", description: "Arena" },
      { id: 1740, gameMode: "CHERRY", description: "Bravery Arena" },
      { id: 420, gameMode: "CLASSIC", description: "Ranked Solo" },
      { id: 450, gameMode: "ARAM", description: "ARAM" },
    ];
    expect(arenaQueueIdsFromLcuQueues(queues)).toEqual([1700, 1740]);
  });

  it("handles missing/empty input", () => {
    expect(arenaQueueIdsFromLcuQueues(null)).toEqual([]);
    expect(arenaQueueIdsFromLcuQueues([])).toEqual([]);
  });

  it("is case-insensitive on gameMode and skips entries without a numeric id", () => {
    expect(arenaQueueIdsFromLcuQueues([{ id: 1750, gameMode: "cherry" }, { gameMode: "CHERRY" }])).toEqual([1750]);
  });
});

describe("filterBySeasonStart", () => {
  const entries = [
    { champion: "Sett", win: true, gameEnd: 1000 },
    { champion: "Ahri", win: true, gameEnd: 2000 },
    { champion: "Garen", win: false, gameEnd: 3000 },
  ];

  it("keeps only entries at or after the cutoff", () => {
    expect(filterBySeasonStart(entries, 2000)).toEqual([entries[1], entries[2]]);
  });

  it("returns everything unfiltered when there's no cutoff", () => {
    expect(filterBySeasonStart(entries, null)).toBe(entries);
    expect(filterBySeasonStart(entries, undefined)).toBe(entries);
    expect(filterBySeasonStart(entries, 0)).toBe(entries);
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
