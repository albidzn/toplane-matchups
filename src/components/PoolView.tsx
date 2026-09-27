import { useMemo } from "react";
import type { Champion, Profile } from "../lib/types";
import { kdaRatio, winrate } from "../lib/profile";
import ChampIcon from "./ChampIcon";

interface PoolEntry {
  enemyId: string;
  enemyChampion: string;
  note: string;
}

interface PoolViewProps {
  pool: Map<string, PoolEntry[]>;
  champions: Champion[];
  ddragonVersion: string | null;
  profile: Profile | null;
  onSelectEnemy: (enemyId: string) => void;
}

export default function PoolView({ pool, champions, ddragonVersion, profile, onSelectEnemy }: PoolViewProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  const statsByChamp = useMemo(() => new Map((profile?.championStats ?? []).map((c) => [c.champion, c])), [profile]);
  const masteryByChamp = useMemo(() => new Map((profile?.mastery ?? []).map((m) => [m.champion, m])), [profile]);

  const entries = Array.from(pool.entries()).sort(
    (a, b) => b[1].length - a[1].length || nameOf(a[0]).localeCompare(nameOf(b[0]))
  );

  if (entries.length === 0) {
    return (
      <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-700 text-center">
        <div className="text-4xl opacity-30">🛡️</div>
        <p className="max-w-xs text-sm text-slate-500">
          Your pool is built automatically from the counter picks you add per enemy.
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full animate-fade-in overflow-y-auto pr-1">
      <h2 className="mb-3 px-1 font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
        My pool <span className="text-slate-600">({entries.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map(([championId, uses], i) => {
          const stat = statsByChamp.get(championId);
          const mastery = masteryByChamp.get(championId);
          const wr = stat ? winrate(stat.wins, stat.games - stat.wins) : null;

          return (
            <div
              key={championId}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="animate-fade-slide-up rounded-2xl border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-ink-600"
            >
              <div className="mb-3 flex items-center gap-3 border-b border-ink-800 pb-3">
                <ChampIcon ddragonVersion={ddragonVersion} championId={championId} name={nameOf(championId)} size={44} rounded="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold text-slate-100">{nameOf(championId)}</div>
                  <div className="text-xs text-slate-500">
                    Good vs {uses.length} champion{uses.length > 1 ? "s" : ""}
                  </div>
                </div>
                {mastery && (
                  <div className="shrink-0 text-right" title={`${mastery.points.toLocaleString()} mastery points`}>
                    <div className="text-xs font-semibold text-gold-400">M{mastery.level}</div>
                    <div className="text-[10px] text-slate-500">{(mastery.points / 1000).toFixed(0)}k pts</div>
                  </div>
                )}
              </div>

              {stat && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-ink-850/60 px-2.5 py-2 text-xs">
                  <span className={`font-semibold ${wr! >= 50 ? "text-emerald-400" : "text-red-400"}`}>{wr}% WR</span>
                  <span className="text-slate-500">{stat.games}g</span>
                  <span className="text-slate-500">{kdaRatio(stat.kills, stat.deaths, stat.assists).toFixed(2)} KDA</span>
                  <span className="text-slate-500">{stat.csPerMin.toFixed(1)} cs/m</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {uses.map((u) => (
                  <button
                    key={u.enemyId}
                    onClick={() => onSelectEnemy(u.enemyId)}
                    className="group flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 py-1 pl-1 pr-2.5 text-xs text-slate-300 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-95"
                    title={u.note || undefined}
                  >
                    <ChampIcon
                      ddragonVersion={ddragonVersion}
                      championId={u.enemyChampion}
                      name={nameOf(u.enemyChampion)}
                      size={18}
                      rounded="full"
                    />
                    {nameOf(u.enemyChampion)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
