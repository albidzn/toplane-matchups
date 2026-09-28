import { describe, it, expect } from "vitest";
import { groupSessions } from "../src/lib/sessions";
import { formatPlaytime } from "../src/lib/profile";
import type { MatchSummary } from "../src/lib/types";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function match(id: string, endMinutesAgo: number, over: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: id,
    queueId: 420,
    gameEnd: 1_000_000 * MIN - endMinutesAgo * MIN,
    durationSec: 30 * 60,
    champion: "Sett",
    position: "TOP",
    win: true,
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    items: [],
    opponent: null,
    remake: false,
    ...over,
  };
}

describe("groupSessions", () => {
  it("keeps back-to-back games in one session", () => {
    // game B ended 35m ago (started 65m ago); game A ended 70m ago -> 5 minute gap
    const s = groupSessions([match("A", 70), match("B", 35)]);
    expect(s).toHaveLength(1);
    expect(s[0].matches.map((m) => m.matchId)).toEqual(["B", "A"]);
  });

  it("splits sessions when the gap exceeds an hour", () => {
    const s = groupSessions([match("new", 10), match("old", 10 + 30 + 61)]);
    expect(s).toHaveLength(2);
    expect(s[0].matches[0].matchId).toBe("new");
  });

  it("counts wins/losses and play time, excluding remakes from W/L", () => {
    const s = groupSessions([
      match("A", 200, { win: false }),
      match("B", 160, { win: true }),
      match("C", 120, { remake: true, win: false, durationSec: 200 }),
    ]);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ games: 2, wins: 1, losses: 1, playTimeSec: 2 * 1800 + 200 });
    expect(s[0].endedAt).toBe(match("C", 120).gameEnd);
  });

  it("sorts unordered input and handles empty input", () => {
    expect(groupSessions([])).toEqual([]);
    const s = groupSessions([match("old", 500), match("new", 5)]);
    expect(s.map((x) => x.matches[0].matchId)).toEqual(["new", "old"]);
  });

  it("respects a custom gap", () => {
    const pair = [match("A", 100), match("B", 35)]; // 35m gap
    expect(groupSessions(pair, 30 * MIN)).toHaveLength(2);
    expect(groupSessions(pair, 2 * HOUR)).toHaveLength(1);
  });
});

describe("formatPlaytime", () => {
  it("formats minutes and hours", () => {
    expect(formatPlaytime(32 * 60)).toBe("32m");
    expect(formatPlaytime(5 * 3600 + 32 * 60)).toBe("5h 32m");
    expect(formatPlaytime(3600)).toBe("1h 0m");
  });
});
