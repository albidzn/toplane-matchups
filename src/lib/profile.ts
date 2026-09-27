import type { RankedEntry } from "./types";

const TIER_LABELS: Record<string, string> = {
  IRON: "Iron",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  EMERALD: "Emerald",
  DIAMOND: "Diamond",
  MASTER: "Master",
  GRANDMASTER: "Grandmaster",
  CHALLENGER: "Challenger",
};

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export function tierLabel(tier: string): string {
  return TIER_LABELS[tier.toUpperCase()] ?? tier;
}

/** "Gold II", or just "Master" for apex tiers which have no divisions. */
export function rankLabel(entry: Pick<RankedEntry, "tier" | "rank">): string {
  const tier = tierLabel(entry.tier);
  if (APEX_TIERS.has(entry.tier.toUpperCase())) return tier;
  return `${tier} ${entry.rank}`;
}

export function winrate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

export function kdaRatio(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(1, deaths);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatRelativeTime(epochMs: number): string {
  const diffSec = Math.max(0, (Date.now() - epochMs) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = diffSec / 60;
  if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
  const diffHr = diffMin / 60;
  if (diffHr < 24) return `${Math.round(diffHr)}h ago`;
  const diffDay = diffHr / 24;
  if (diffDay < 30) return `${Math.round(diffDay)}d ago`;
  const diffMonth = diffDay / 30;
  return `${Math.round(diffMonth)}mo ago`;
}

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  400: "Normal Draft",
  430: "Normal Blind",
  450: "ARAM",
};

export function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] ?? "Custom";
}
