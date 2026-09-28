import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSettings } from "../server/settings.js";

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "lm-settings-"));
  delete process.env.RIOT_API_KEY;
  delete process.env.RIOT_ID;
  delete process.env.RIOT_PLATFORM;
  delete process.env.ARENA_SEASON_START;
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("createSettings", () => {
  it("rejects an API key that doesn't look like RGAPI-...", async () => {
    const settings = createSettings(dir);
    await expect(settings.update({ apiKey: "not-a-key" })).rejects.toThrow(/RGAPI/);
  });

  it("rejects a Riot ID without a # tag", async () => {
    const settings = createSettings(dir);
    await expect(settings.update({ riotId: "NoHashHere" })).rejects.toThrow(/GameName#TAG/);
  });

  it("rejects an unknown platform", async () => {
    const settings = createSettings(dir);
    await expect(settings.update({ platform: "mars1" })).rejects.toThrow(/platform/i);
  });

  it("accepts and persists valid settings, never echoing the key back", async () => {
    const settings = createSettings(dir);
    await settings.update({ apiKey: "RGAPI-" + "0".repeat(30), riotId: "Albi#113", platform: "euw1" });

    const state = settings.get();
    expect(state).toEqual({
      riotId: "Albi#113",
      platform: "euw1",
      hasKey: true,
      platforms: expect.any(Array),
      arenaSeasonStart: "",
    });
    expect(JSON.stringify(state)).not.toContain("RGAPI");
  });

  it("persists across a fresh load() from disk", async () => {
    const first = createSettings(dir);
    await first.update({ apiKey: "RGAPI-" + "0".repeat(30), riotId: "Albi#113", platform: "na1" });

    delete process.env.RIOT_API_KEY;
    delete process.env.RIOT_ID;
    delete process.env.RIOT_PLATFORM;

    const second = createSettings(dir);
    second.load();
    expect(second.get()).toMatchObject({ riotId: "Albi#113", platform: "na1", hasKey: true });
  });

  it("keeps the previously saved key when a partial update omits apiKey", async () => {
    const settings = createSettings(dir);
    await settings.update({ apiKey: "RGAPI-" + "0".repeat(30), riotId: "Albi#113", platform: "euw1" });
    await settings.update({ platform: "na1" });
    expect(settings.get()).toMatchObject({ hasKey: true, platform: "na1" });
  });

  it("rejects an unparseable Arena season start date", async () => {
    const settings = createSettings(dir);
    await expect(settings.update({ arenaSeasonStart: "not-a-date" })).rejects.toThrow(/valid date/);
  });

  it("saves and clears the Arena season start date", async () => {
    const settings = createSettings(dir);
    await settings.update({ arenaSeasonStart: "2026-08-01" });
    expect(settings.get().arenaSeasonStart).toBe("2026-08-01");

    await settings.update({ arenaSeasonStart: "" });
    expect(settings.get().arenaSeasonStart).toBe("");
  });
});
