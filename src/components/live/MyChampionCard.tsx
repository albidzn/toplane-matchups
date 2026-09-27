import type { Champion, Profile } from "../../lib/types";
import { kdaRatio, winrate } from "../../lib/profile";
import ChampIcon from "../ChampIcon";

interface MyChampionCardProps {
  championId: string;
  locked: boolean;
  champions: Champion[];
  ddragonVersion: string | null;
  profile: Profile | null;
}

export default function MyChampionCard({ championId, locked, champions, ddragonVersion, profile }: MyChampionCardProps) {
  const name = champions.find((c) => c.id === championId)?.name ?? championId;
  const stat = profile?.championStats?.find((c) => c.champion === championId);
  const mastery = profile?.mastery?.find((m) => m.champion === championId);
  const wr = stat ? winrate(stat.wins, stat.games - stat.wins) : null;

  return (
    <div className="flex animate-fade-slide-up items-center gap-3 rounded-xl border border-hextech-500/30 bg-hextech-500/5 px-3 py-2.5">
      <ChampIcon ddragonVersion={ddragonVersion} championId={championId} name={name} size={40} rounded="lg" className="ring-1 ring-hextech-500/40" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-hextech-400/80">
            {locked ? "You — locked in" : "You — hovering"}
          </span>
        </div>
        <span className="truncate font-display text-sm font-bold text-slate-100">{name}</span>
      </div>
      {stat ? (
        <div className="shrink-0 text-right text-xs">
          <div className="text-slate-300">
            {stat.games}g · <span className={wr! >= 50 ? "text-emerald-400" : "text-red-400"}>{wr}%</span>
          </div>
          <div className="text-slate-500">
            {kdaRatio(stat.kills, stat.deaths, stat.assists).toFixed(2)} KDA · {stat.csPerMin.toFixed(1)} cs/m
          </div>
        </div>
      ) : mastery ? (
        <div className="shrink-0 text-right text-xs text-slate-500">
          M{mastery.level} · {(mastery.points / 1000).toFixed(0)}k
        </div>
      ) : (
        <div className="shrink-0 text-xs text-slate-600">No games yet</div>
      )}
    </div>
  );
}
