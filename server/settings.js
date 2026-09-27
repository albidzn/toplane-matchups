import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const PLATFORMS = [
  "euw1", "eun1", "na1", "kr", "jp1", "br1", "la1", "la2",
  "oc1", "tr1", "ru", "me1", "ph2", "sg2", "th2", "tw2", "vn2",
];

/**
 * User-editable Riot settings, persisted to <dataDir>/settings.json and
 * applied onto process.env (which profile.js reads on every refresh).
 * Values saved here win over .env, so edits made in the UI take effect.
 * The API key is write-only: it is never sent back to the browser.
 */
export function createSettings(dataDir) {
  const file = path.join(dataDir, "settings.json");

  function apply(saved) {
    if (saved.apiKey) process.env.RIOT_API_KEY = saved.apiKey;
    if (saved.riotId) process.env.RIOT_ID = saved.riotId;
    if (saved.platform) process.env.RIOT_PLATFORM = saved.platform;
  }

  function readSaved() {
    try {
      return JSON.parse(fsSync.readFileSync(file, "utf-8"));
    } catch {
      return {};
    }
  }

  function load() {
    apply(readSaved());
  }

  function get() {
    return {
      riotId: process.env.RIOT_ID ?? "",
      platform: process.env.RIOT_PLATFORM || "euw1",
      hasKey: Boolean(process.env.RIOT_API_KEY),
      platforms: PLATFORMS,
    };
  }

  async function update(input) {
    const saved = readSaved();
    const next = { ...saved };

    if (typeof input.apiKey === "string" && input.apiKey.trim()) {
      const key = input.apiKey.trim();
      if (!/^RGAPI-[\w-]{20,}$/.test(key)) {
        throw new Error('That does not look like a Riot API key (should start with "RGAPI-").');
      }
      next.apiKey = key;
    }

    if (typeof input.riotId === "string" && input.riotId.trim()) {
      const id = input.riotId.trim();
      if (!/^[^#]{1,32}#[^#\s]{2,8}$/.test(id)) {
        throw new Error('Riot ID must look like "GameName#TAG".');
      }
      next.riotId = id;
    }

    if (typeof input.platform === "string" && input.platform) {
      if (!PLATFORMS.includes(input.platform)) throw new Error("Unknown platform.");
      next.platform = input.platform;
    }

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(next, null, 2), { encoding: "utf-8", mode: 0o600 });
    apply(next);
  }

  return { load, get, update };
}
