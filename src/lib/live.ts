import { DDRAGON_CDN } from "./champions";

// Summoner spell numeric key -> Data Dragon image id. Covers Summoner's Rift;
// good enough without fetching the full summoner.json just for icons.
const SUMMONER_SPELL_IMAGE: Record<number, string> = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana",
  14: "SummonerDot",
  21: "SummonerBarrier",
  32: "SummonerSnowball",
};

export function summonerSpellIconUrl(ddragonVersion: string, spellKey: number): string | null {
  const imageId = SUMMONER_SPELL_IMAGE[spellKey];
  return imageId ? `${DDRAGON_CDN}/${ddragonVersion}/img/spell/${imageId}.png` : null;
}

const POSITION_LABEL: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

export function positionLabel(position: string | null | undefined): string {
  if (!position) return "";
  return POSITION_LABEL[position] ?? position;
}

/** Best-effort slug — matches op.gg/u.gg/lolalytics for the vast majority of champions. */
function championSlug(championId: string): string {
  return championId.toLowerCase();
}

export interface MatchupLinks {
  opgg: string;
  ugg: string;
  lolalytics: string;
}

/** Quick-reference build/counter links for a champion, optionally targeted at a specific matchup. */
export function externalMatchupLinks(enemyChampionId: string, myChampionId?: string | null): MatchupLinks {
  const enemy = championSlug(enemyChampionId);
  const mine = myChampionId ? championSlug(myChampionId) : null;
  return {
    opgg: mine
      ? `https://www.op.gg/champions/${mine}/counters/top?target=${enemy}`
      : `https://www.op.gg/champions/${enemy}/build/top`,
    ugg: `https://u.gg/lol/champions/${enemy}/counters?role=top`,
    lolalytics: `https://lolalytics.com/lol/${enemy}/build/?lane=top`,
  };
}
