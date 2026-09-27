import type { Champion } from "./types";

export const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn";

export function championIconUrl(ddragonVersion: string, championId: string): string {
  return `${DDRAGON_CDN}/${ddragonVersion}/img/champion/${championId}.png`;
}

export function profileIconUrl(ddragonVersion: string, profileIconId: number): string {
  return `${DDRAGON_CDN}/${ddragonVersion}/img/profileicon/${profileIconId}.png`;
}

export function itemIconUrl(ddragonVersion: string, itemId: number): string | null {
  if (!itemId) return null;
  return `${DDRAGON_CDN}/${ddragonVersion}/img/item/${itemId}.png`;
}

/** Ranked tier emblem (e.g. "GOLD" -> gold shield), served from Community Dragon. */
export function rankEmblemUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${tier.toLowerCase()}.png`;
}

export function championDisplayName(
  champions: Champion[],
  championId: string
): string {
  return champions.find((c) => c.id === championId)?.name ?? championId;
}

/**
 * Simple, fast subsequence-based fuzzy match: every character of `query`
 * (in order) must appear in `text`. Returns a score (lower is better) or
 * null if it doesn't match at all. Prioritizes prefix matches and
 * contiguous matches.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (q.length === 0) return 1000;
  if (t.startsWith(q)) return 0;
  if (t.includes(q)) return 10 + t.indexOf(q);

  let qi = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (firstMatch === -1) firstMatch = ti;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < q.length) return null; // not all chars found in order
  const spread = lastMatch - firstMatch;
  return 100 + spread;
}

export function fuzzySearchChampions(
  champions: Champion[],
  query: string
): Champion[] {
  if (!query.trim()) return champions;
  const scored = champions
    .map((c) => ({ c, score: fuzzyScore(query, c.name) }))
    .filter((x): x is { c: Champion; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
  return scored.map((x) => x.c);
}
