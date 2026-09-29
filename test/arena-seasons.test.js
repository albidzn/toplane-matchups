import { describe, it, expect } from "vitest";
import { arenaSeasonAt, currentArenaSeasonStartMs, ARENA_SEASONS } from "../server/arena-seasons.js";

const DAY = 24 * 60 * 60 * 1000;

describe("arenaSeasonAt", () => {
  it("finds the season covering a timestamp inside a closed window", () => {
    const s = arenaSeasonAt(Date.parse("2025-07-01T00:00:00Z"));
    expect(s?.name).toBe("Spirit Blossom Beyond");
  });

  it("finds the ongoing season (end: null) for a recent timestamp", () => {
    const s = arenaSeasonAt(Date.parse("2026-06-01T00:00:00Z"));
    expect(s?.name).toBe("Pandemonium");
    expect(s?.end).toBeNull();
  });

  it("returns null for a timestamp before any listed season", () => {
    expect(arenaSeasonAt(Date.parse("2020-01-01T00:00:00Z"))).toBeNull();
  });

  it("returns null in the gap between two seasons", () => {
    // Arena 2024 ends 2024-09-24; Spirit Blossom Beyond starts 2025-06-25 — a real off-season gap.
    expect(arenaSeasonAt(Date.parse("2024-12-01T00:00:00Z"))).toBeNull();
  });

  it("treats the boundary as inclusive of the start, exclusive of the end", () => {
    const s = ARENA_SEASONS[0];
    expect(arenaSeasonAt(Date.parse(s.start))?.name).toBe(s.name);
    expect(arenaSeasonAt(Date.parse(s.end) - 1)?.name).toBe(s.name);
    expect(arenaSeasonAt(Date.parse(s.end))?.name).not.toBe(s.name);
  });
});

describe("currentArenaSeasonStartMs", () => {
  it("returns the start of the season covering the given time", () => {
    const ms = currentArenaSeasonStartMs(Date.parse("2026-06-01T00:00:00Z"));
    expect(ms).toBe(Date.parse("2026-04-29T00:00:00Z"));
  });

  it("returns null when there's no season listed for that time", () => {
    expect(currentArenaSeasonStartMs(Date.parse("2020-01-01T00:00:00Z"))).toBeNull();
  });

  it("defaults to now when called with no argument", () => {
    expect(typeof currentArenaSeasonStartMs()).not.toBe("undefined");
  });

  it("keeps season boundaries in chronological, non-overlapping order", () => {
    for (let i = 1; i < ARENA_SEASONS.length; i++) {
      const prev = ARENA_SEASONS[i - 1];
      expect(Date.parse(prev.end ?? "9999-01-01")).toBeGreaterThan(Date.parse(prev.start));
      expect(Date.parse(ARENA_SEASONS[i].start)).toBeGreaterThanOrEqual(Date.parse(prev.end));
    }
  });
});
