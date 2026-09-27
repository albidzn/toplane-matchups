import { describe, it, expect } from "vitest";
import { fuzzyScore, fuzzySearchChampions } from "../src/lib/champions";
import type { Champion } from "../src/lib/types";

describe("fuzzyScore", () => {
  it("scores an exact prefix match best", () => {
    expect(fuzzyScore("dr", "Dr. Mundo")).toBe(0);
  });

  it("scores a substring match better than a scattered match", () => {
    const substring = fuzzyScore("mundo", "Dr. Mundo")!;
    const scattered = fuzzyScore("drmo", "Dr. Mundo")!;
    expect(substring).toBeLessThan(scattered);
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("AATROX", "aatrox")).toBe(0);
  });

  it("returns null when letters aren't in order", () => {
    expect(fuzzyScore("oxaatr", "Aatrox")).toBeNull();
  });

  it("returns a low score for an empty query (matches everything)", () => {
    expect(fuzzyScore("", "Aatrox")).not.toBeNull();
  });
});

describe("fuzzySearchChampions", () => {
  const champions: Champion[] = [
    { id: "DrMundo", name: "Dr. Mundo" },
    { id: "Darius", name: "Darius" },
    { id: "Diana", name: "Diana" },
  ];

  it("returns all champions for an empty query", () => {
    expect(fuzzySearchChampions(champions, "")).toHaveLength(3);
  });

  it("ranks prefix matches first", () => {
    const results = fuzzySearchChampions(champions, "da");
    expect(results[0].id).toBe("Darius");
  });

  it("excludes champions with no matching letters in order", () => {
    const results = fuzzySearchChampions(champions, "zzz");
    expect(results).toHaveLength(0);
  });
});
