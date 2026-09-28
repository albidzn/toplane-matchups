import fs from "node:fs/promises";
import path from "node:path";

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
const DIVISIONS = ["IV", "III", "II", "I"];

// Same ladder math as src/lib/lp.ts (kept separate: the server can't import from the TS frontend).
export function absoluteLp(s) {
  const tier = TIERS.indexOf(String(s.tier).toUpperCase());
  if (tier === -1) return TIERS.length * 400 + s.lp;
  return tier * 400 + Math.max(0, DIVISIONS.indexOf(s.rank)) * 100 + s.lp;
}

/** All-time peak: the highest point ever seen, surviving the retention trim of the snapshot list. */
export function updatePeak(previousPeak, snapshots) {
  return snapshots.reduce((best, s) => (!best || absoluteLp(s) > absoluteLp(best) ? s : best), previousPeak ?? null);
}

/** Appends a snapshot only when tier/rank/LP actually changed, and drops entries past the retention window. */
export function appendSnapshot(list, entry, now) {
  const kept = list.filter((s) => now - s.t <= RETENTION_MS);
  if (!entry) return kept;
  const last = kept[kept.length - 1];
  if (last && last.tier === entry.tier && last.rank === entry.rank && last.lp === entry.lp) return kept;
  return [...kept, { t: now, tier: entry.tier, rank: entry.rank, lp: entry.lp }];
}

/**
 * Riot's API only exposes the *current* LP, so the history is built up by
 * remembering each change we observe. Starts empty; fills in as the app runs.
 */
export function createLpStore(dataDir) {
  const filePath = path.join(dataDir, "lp-history.json");

  async function load() {
    try {
      return JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      return null;
    }
  }

  async function record(puuid, ranked, now = Date.now()) {
    let data = await load();
    if (!data || data.puuid !== puuid) data = { puuid, solo: [], flex: [] };
    const solo = appendSnapshot(data.solo ?? [], ranked.solo, now);
    const flex = appendSnapshot(data.flex ?? [], ranked.flex, now);
    const next = {
      puuid,
      solo,
      flex,
      peaks: { solo: updatePeak(data.peaks?.solo, solo), flex: updatePeak(data.peaks?.flex, flex) },
    };
    const changed = JSON.stringify(next) !== JSON.stringify(data);
    if (changed) {
      await fs.mkdir(dataDir, { recursive: true });
      const tmp = path.join(dataDir, `.lp-history.${process.pid}.tmp`);
      await fs.writeFile(tmp, JSON.stringify(next), "utf-8");
      await fs.rename(tmp, filePath);
    }
    return { solo: next.solo, flex: next.flex, peak: next.peaks };
  }

  return { record };
}
