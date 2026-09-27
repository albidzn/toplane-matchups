import type { ChampionStat, MasteryEntry } from "./types";
import { winrate } from "./profile";

export type PoolSortKey = "matchups" | "name" | "mastery" | "winrate" | "games";

export interface PoolSortable {
  championId: string;
  matchupCount: number;
  stat?: ChampionStat;
  mastery?: MasteryEntry;
}

/** Pure comparator so the sort logic is testable without mounting PoolView. */
export function comparePoolEntries(a: PoolSortable, b: PoolSortable, sortKey: PoolSortKey, nameOf: (id: string) => string): number {
  switch (sortKey) {
    case "name":
      return nameOf(a.championId).localeCompare(nameOf(b.championId));
    case "mastery":
      return (b.mastery?.points ?? -1) - (a.mastery?.points ?? -1);
    case "winrate": {
      const aWr = a.stat && a.stat.games > 0 ? winrate(a.stat.wins, a.stat.games - a.stat.wins) : null;
      const bWr = b.stat && b.stat.games > 0 ? winrate(b.stat.wins, b.stat.games - b.stat.wins) : null;
      // champs with no recorded games sort to the bottom, not to the top as a false "0%"
      if (aWr == null && bWr == null) return b.matchupCount - a.matchupCount;
      if (aWr == null) return 1;
      if (bWr == null) return -1;
      return bWr - aWr;
    }
    case "games":
      return (b.stat?.games ?? 0) - (a.stat?.games ?? 0);
    case "matchups":
    default:
      return b.matchupCount - a.matchupCount || nameOf(a.championId).localeCompare(nameOf(b.championId));
  }
}
