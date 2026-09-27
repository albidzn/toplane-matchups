import { describe, it, expect } from "vitest";
import { regionForPlatform } from "../server/riot.js";

describe("regionForPlatform", () => {
  it("maps European platforms to europe", () => {
    expect(regionForPlatform("euw1")).toBe("europe");
    expect(regionForPlatform("eun1")).toBe("europe");
    expect(regionForPlatform("tr1")).toBe("europe");
  });

  it("maps American platforms to americas", () => {
    expect(regionForPlatform("na1")).toBe("americas");
    expect(regionForPlatform("br1")).toBe("americas");
  });

  it("maps Asian platforms to asia", () => {
    expect(regionForPlatform("kr")).toBe("asia");
    expect(regionForPlatform("jp1")).toBe("asia");
  });

  it("maps SEA platforms to sea", () => {
    expect(regionForPlatform("oc1")).toBe("sea");
    expect(regionForPlatform("sg2")).toBe("sea");
  });

  it("falls back to europe for an unknown platform", () => {
    expect(regionForPlatform("xx9")).toBe("europe");
  });
});
