import { describe, it, expect } from "vitest";
import { winrate, rankLabel, kdaRatio, formatDuration, tierLabel } from "../src/lib/profile";

describe("winrate", () => {
  it("computes a percentage rounded to the nearest integer", () => {
    expect(winrate(2, 1)).toBe(67);
    expect(winrate(1, 1)).toBe(50);
  });

  it("returns 0 for no games", () => {
    expect(winrate(0, 0)).toBe(0);
  });
});

describe("rankLabel", () => {
  it("includes the division for normal tiers", () => {
    expect(rankLabel({ tier: "GOLD", rank: "II" })).toBe("Gold II");
  });

  it("omits the division for apex tiers", () => {
    expect(rankLabel({ tier: "MASTER", rank: "I" })).toBe("Master");
    expect(rankLabel({ tier: "CHALLENGER", rank: "I" })).toBe("Challenger");
  });

  it("falls back to the raw tier string for unknown tiers", () => {
    expect(tierLabel("UNRANKED")).toBe("UNRANKED");
  });
});

describe("kdaRatio", () => {
  it("divides by deaths", () => {
    expect(kdaRatio(4, 2, 6)).toBe(5);
  });

  it("treats 0 deaths as 1 (avoids Infinity)", () => {
    expect(kdaRatio(3, 0, 3)).toBe(6);
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3600)).toBe("60:00");
  });
});
