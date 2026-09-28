import { useState } from "react";
import type { Champion, ChampionStat, MasteryEntry } from "../../lib/types";
import { kdaRatio, winrate } from "../../lib/profile";
import ChampIcon from "../ChampIcon";

const COLLAPSED_COUNT = 8;

interface ChampionStatsProps {
  championStats: ChampionStat[];
  mastery: MasteryEntry[];
  poolIds: Set<string>;
  champions: Champion[];
  ddragonVersion: string | null;
}

export default function ChampionStats({
  championStats,
  mastery,
  poolIds,
  champions,
  ddragonVersion,
}: ChampionStatsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? championStats : championStats.slice(0, COLLAPSED_COUNT);
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="animate-fade-slide-up rounded-2xl border border-ink-700 bg-ink-900/60 p-4 [animation-delay:140ms]">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Champion stats</h3>

      {mastery.length > 0 && (
        <div className="scrollbar-thin mb-4 flex gap-2 overflow-x-auto pb-1">
          {mastery.slice(0, 10).map((m) => (
            <div key={m.champion} className="flex shrink-0 flex-col items-center gap-1" title={nameOf(m.champion)}>
              <ChampIcon ddragonVersion={ddragonVersion} championId={m.champion} name={nameOf(m.champion)} size={36} />
              <span className="text-[10px] text-slate-500">{(m.points / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      )}

      {championStats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-slate-500">
          No games recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 lg:grid-cols-2">
          {visible.map((c, i) => {
            const wr = winrate(c.wins, c.games - c.wins);
            return (
              <div
                key={c.champion}
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                className="flex animate-fade-slide-up items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 hover:bg-ink-800/50"
              >
                <ChampIcon ddragonVersion={ddragonVersion} championId={c.champion} name={nameOf(c.champion)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-200">{nameOf(c.champion)}</span>
                    {poolIds.has(c.champion) && (
                      <span className="shrink-0 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold-400 ring-1 ring-gold-500/30">
                        Pool
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-800">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${wr >= 50 ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ width: `${wr}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="text-slate-300">
                    {c.games}g · {wr}%
                  </div>
                  <div className="text-slate-500">
                    {kdaRatio(c.kills, c.deaths, c.assists).toFixed(2)} KDA · {c.csPerMin.toFixed(1)} cs/m
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {championStats.length > COLLAPSED_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg border border-ink-700 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-gold-500/40 hover:text-gold-400 active:scale-[0.98]"
        >
          {expanded ? "Show less" : `Show all ${championStats.length} champions`}
        </button>
      )}
    </div>
  );
}
