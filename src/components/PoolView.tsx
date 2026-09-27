import { useMemo, useState } from "react";
import type { Champion, Profile } from "../lib/types";
import { kdaRatio, winrate } from "../lib/profile";
import { comparePoolEntries, type PoolSortKey } from "../lib/pool";
import { useStickyState } from "../hooks/useStickyState";
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

const SORT_OPTIONS: { key: PoolSortKey; label: string }[] = [
  { key: "matchups", label: "Matchups" },
  { key: "mastery", label: "Mastery" },
  { key: "winrate", label: "Winrate" },
  { key: "games", label: "Games" },
  { key: "name", label: "Name" },
];

export default function PoolView({ pool, champions, ddragonVersion, profile, onSelectEnemy }: PoolViewProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  const statsByChamp = useMemo(() => new Map((profile?.championStats ?? []).map((c) => [c.champion, c])), [profile]);
  const masteryByChamp = useMemo(() => new Map((profile?.mastery ?? []).map((m) => [m.champion, m])), [profile]);

  const [sortKey, setSortKey] = useStickyState<PoolSortKey>("lm.pool.sort", "matchups");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.from(pool.entries());
    if (q) list = list.filter(([championId]) => nameOf(championId).toLowerCase().includes(q));

    const withMeta = list.map(([championId, uses]) => {
      const stat = statsByChamp.get(championId);
      const mastery = masteryByChamp.get(championId);
      const wr = stat && stat.games > 0 ? winrate(stat.wins, stat.games - stat.wins) : null;
      return { championId, uses, stat, mastery, wr };
    });

    withMeta.sort((a, b) =>
      comparePoolEntries(
        { championId: a.championId, matchupCount: a.uses.length, stat: a.stat, mastery: a.mastery },
        { championId: b.championId, matchupCount: b.uses.length, stat: b.stat, mastery: b.mastery },
        sortKey,
        nameOf
      )
    );

    return withMeta;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, champions, statsByChamp, masteryByChamp, sortKey, query]);

  if (pool.size === 0) {
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
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
          My pool <span className="text-slate-600">({entries.length})</span>
        </h2>

        <div className="relative ml-auto min-w-[140px] max-w-[220px] flex-1">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter champion…"
            className="w-full rounded-lg border border-ink-600 bg-ink-850 py-1.5 pl-8 pr-2 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-850 p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95 ${
                sortKey === opt.key ? "bg-gold-500/20 text-gold-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex h-40 animate-fade-in flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 text-center">
          <p className="text-sm text-slate-500">No champion in your pool matches "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ championId, uses, stat, mastery, wr }, i) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
