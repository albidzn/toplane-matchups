import type { LpSnapshot } from "./types";

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
const DIVISIONS = ["IV", "III", "II", "I"]; // lowest first
const APEX_BASE = TIERS.length * 400; // Master+ is one continuous LP ladder above Diamond I

/** One number for "how high on the ladder", so LP changes across divisions/tiers plot on a single axis. */
export function absoluteLp(s: Pick<LpSnapshot, "tier" | "rank" | "lp">): number {
  const tier = TIERS.indexOf(s.tier.toUpperCase());
  if (tier === -1) return APEX_BASE + s.lp;
  return tier * 400 + Math.max(0, DIVISIONS.indexOf(s.rank)) * 100 + s.lp;
}

/** Short axis label for an absolute LP value, e.g. "G4", "D1", "M 150". */
export function lpAxisLabel(value: number): string {
  if (value >= APEX_BASE) {
    const lp = Math.round(value - APEX_BASE);
    return lp > 0 ? `M ${lp}` : "M";
  }
  const tier = Math.floor(value / 400);
  const division = Math.floor((value % 400) / 100);
  return `${TIERS[tier][0]}${4 - division}`;
}

export interface ApexProgress {
  lower: { label: string; lp: number };
  upper: { label: string; lp: number } | null; // null: Challenger has no cap
  /** 0..1 position of the player between the bounds; null when there is no upper bound. */
  fraction: number | null;
}

/** Master → Grandmaster → Challenger progress bar bounds from the current LP cutoffs. Null for non-apex or unknown cutoffs. */
export function apexProgress(
  entry: { tier: string; lp: number },
  cutoffs: { grandmaster: number | null; challenger: number | null } | null | undefined
): ApexProgress | null {
  if (!cutoffs) return null;
  const tier = entry.tier.toUpperCase();
  let lower: ApexProgress["lower"];
  let upper: ApexProgress["upper"];
  if (tier === "MASTER") {
    lower = { label: "M", lp: 0 };
    upper = cutoffs.grandmaster != null ? { label: "GM", lp: cutoffs.grandmaster } : null;
  } else if (tier === "GRANDMASTER") {
    if (cutoffs.grandmaster == null) return null;
    lower = { label: "GM", lp: cutoffs.grandmaster };
    upper = cutoffs.challenger != null ? { label: "C", lp: cutoffs.challenger } : null;
  } else if (tier === "CHALLENGER") {
    if (cutoffs.challenger == null) return null;
    lower = { label: "C", lp: cutoffs.challenger };
    upper = null;
  } else {
    return null;
  }
  const span = upper ? upper.lp - lower.lp : 0;
  const fraction = upper && span > 0 ? Math.min(1, Math.max(0, (entry.lp - lower.lp) / span)) : null;
  return { lower, upper, fraction };
}

export interface LpSeries {
  /** Step points inside the window, oldest first (the first sits exactly at the window start when history predates it). */
  points: { t: number; value: number }[];
  delta: number;
  peak: LpSnapshot;
  min: number;
  max: number;
}

/** Windowed LP series. Returns null with fewer than two snapshots overall — nothing to draw yet. */
export function buildLpSeries(snapshots: LpSnapshot[], now: number, days = 30): LpSeries | null {
  if (snapshots.length < 2) return null;
  const start = now - days * 24 * 60 * 60 * 1000;
  const sorted = [...snapshots].sort((a, b) => a.t - b.t);

  const before = sorted.filter((s) => s.t < start);
  const inside = sorted.filter((s) => s.t >= start);
  const anchor = before[before.length - 1] ?? null;

  const points = [
    ...(anchor ? [{ t: start, value: absoluteLp(anchor) }] : []),
    ...inside.map((s) => ({ t: s.t, value: absoluteLp(s) })),
  ];
  if (points.length === 0) return null;

  const windowSnaps = [...(anchor ? [anchor] : []), ...inside];
  const values = points.map((p) => p.value);
  const peak = windowSnaps.reduce((best, s) => (absoluteLp(s) > absoluteLp(best) ? s : best));

  return {
    points,
    delta: values[values.length - 1] - values[0],
    peak,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
