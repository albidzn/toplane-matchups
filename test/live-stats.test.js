import { describe, it, expect } from "vitest";
import { mergeLiveClientStats, detectGameEndResult } from "../server/live-stats.js";

function lcPlayer(over = {}) {
  return {
    riotIdGameName: "Albi",
    riotIdTagLine: "113",
    level: 11,
    isDead: false,
    respawnTimer: 0,
    scores: { kills: 3, deaths: 2, assists: 5, creepScore: 140 },
    items: [{ itemID: 1055 }, { itemID: 3071 }],
    ...over,
  };
}

describe("mergeLiveClientStats", () => {
  it("merges level/KDA/CS/items onto the matching participant by riotId", () => {
    const participants = [{ puuid: "p1", riotId: "Albi#113" }];
    const result = mergeLiveClientStats(participants, [lcPlayer()]);
    expect(result[0]).toMatchObject({
      level: 11,
      kills: 3,
      deaths: 2,
      assists: 5,
      cs: 140,
      items: [1055, 3071],
      isDead: false,
    });
  });

  it("matches case-insensitively", () => {
    const participants = [{ puuid: "p1", riotId: "albi#113" }];
    const result = mergeLiveClientStats(participants, [lcPlayer({ riotIdGameName: "ALBI", riotIdTagLine: "113" })]);
    expect(result[0].level).toBe(11);
  });

  it("leaves participants with no match untouched", () => {
    const participants = [{ puuid: "p1", riotId: "NoMatch#EUW" }];
    const result = mergeLiveClientStats(participants, [lcPlayer()]);
    expect(result[0]).toEqual({ puuid: "p1", riotId: "NoMatch#EUW" });
  });

  it("passes through unchanged when there's no live client data yet", () => {
    const participants = [{ puuid: "p1", riotId: "Albi#113" }];
    expect(mergeLiveClientStats(participants, null)).toBe(participants);
    expect(mergeLiveClientStats(participants, [])).toBe(participants);
  });

  it("defaults missing scores/items gracefully", () => {
    const participants = [{ puuid: "p1", riotId: "Albi#113" }];
    const result = mergeLiveClientStats(participants, [lcPlayer({ scores: undefined, items: undefined })]);
    expect(result[0]).toMatchObject({ kills: 0, deaths: 0, assists: 0, cs: 0, items: [] });
  });
});

describe("detectGameEndResult", () => {
  it("finds a Win result in the event log", () => {
    expect(detectGameEndResult([{ EventName: "GameStart" }, { EventName: "GameEnd", Result: "Win" }])).toBe("Win");
  });

  it("finds a Lose result", () => {
    expect(detectGameEndResult([{ EventName: "GameEnd", Result: "Lose" }])).toBe("Lose");
  });

  it("returns null when there's no GameEnd event yet", () => {
    expect(detectGameEndResult([{ EventName: "GameStart" }])).toBeNull();
  });

  it("returns null for missing/empty event logs", () => {
    expect(detectGameEndResult(null)).toBeNull();
    expect(detectGameEndResult(undefined)).toBeNull();
    expect(detectGameEndResult([])).toBeNull();
  });

  it("ignores a malformed Result value", () => {
    expect(detectGameEndResult([{ EventName: "GameEnd", Result: "Draw" }])).toBeNull();
  });
});
