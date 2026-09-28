import { useMemo, useState } from "react";
import type { Arena, Champion } from "../../lib/types";
import ChampIcon from "../ChampIcon";
import ProfileSetup from "../profile/ProfileSetup";

interface ArenaViewProps {
  arena: Arena | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  champions: Champion[];
  ddragonVersion: string | null;
  onOpenSettings: () => void;
}

export default function ArenaView({
  arena,
  loading,
  refreshing,
  onRefresh,
  champions,
  ddragonVersion,
  onOpenSettings,
}: ArenaViewProps) {
  const [query, setQuery] = useState("");
  const [wonOnly, setWonOnly] = useState(false);

  const statsByChamp = useMemo(() => {
    const map = new Map<string, { games: number; wins: number }>();
    for (const s of arena?.stats ?? []) map.set(s.champion, { games: s.games, wins: s.wins });
    return map;
  }, [arena?.stats]);

  const wonCount = [...statsByChamp.values()].filter((s) => s.wins > 0).length;
  const totalCount = champions.length;
  const pct = totalCount ? Math.round((wonCount / totalCount) * 100) : 0;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return champions
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((c) => ({ champion: c, stat: statsByChamp.get(c.id) }))
      .filter((r) => !wonOnly || (r.stat?.wins ?? 0) > 0)
      .sort((a, b) => a.champion.name.localeCompare(b.champion.name));
  }, [champions, query, wonOnly, statsByChamp]);

  if (loading && !arena) {
    return (
      <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 text-slate-500">
        <svg className="h-6 w-6 animate-spin text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z" />
        </svg>
        <span className="text-sm">Loading Arena stats…</span>
      </div>
    );
  }

  if (!arena || !arena.configured) {
    return (
      <div className="h-full animate-fade-in">
        <ProfileSetup onOpenSettings={onOpenSettings} />
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full animate-fade-in overflow-y-auto pr-1">
      <div className="mb-4 flex animate-fade-slide-up flex-wrap items-center gap-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-slate-100">Arena wins</h2>
          <div className="text-xs text-slate-500">
            {arena.backfillComplete === false
              ? "Still scanning your full match history…"
              : arena.seasonStart
                ? `1st-place wins since ${new Date(arena.seasonStart).toLocaleDateString()} (matches the Arena Season Journey)`
                : "Every champion you've won 1st place with, all-time — set a season start in Settings to match the in-game Season Journey"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="font-display text-xl font-bold text-gold-400">
              {wonCount} <span className="text-sm font-normal text-slate-500">/ {totalCount}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">champions won</div>
          </div>
          <div className="h-10 w-10 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-ink-700" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
                className="stroke-emerald-400 transition-[stroke-dasharray] duration-700 ease-out"
              />
            </svg>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-850 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-95 disabled:opacity-50"
        >
          <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {arena.error && (
        <div className="mb-4 animate-fade-slide-up rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {arena.error.message}
        </div>
      )}

      <div className="mb-3 flex animate-fade-slide-up flex-wrap items-center gap-3 [animation-delay:20ms]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search champion…"
          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-850 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-hextech-500/50 focus:outline-none"
        />
        <button
          onClick={() => setWonOnly((v) => !v)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95 ${
            wonOnly ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-ink-700 bg-ink-850 text-slate-400 hover:text-slate-200"
          }`}
        >
          Won only
        </button>
      </div>

      <div className="grid animate-fade-slide-up grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2 pb-2 [animation-delay:40ms]">
        {rows.map(({ champion, stat }) => {
          const won = (stat?.wins ?? 0) > 0;
          return (
            <div
              key={champion.id}
              title={stat ? `${champion.name} — ${stat.wins}W / ${stat.games}g` : `${champion.name} — no Arena games yet`}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors duration-150 ${
                won ? "border-emerald-500/40 bg-emerald-500/[0.08]" : "border-ink-700 bg-ink-900/40"
              }`}
            >
              <div className="relative">
                <ChampIcon
                  ddragonVersion={ddragonVersion}
                  championId={champion.id}
                  name={champion.name}
                  size={44}
                  rounded="lg"
                  className={won ? "" : "opacity-40 grayscale"}
                />
                {won && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-ink-950 ring-2 ring-ink-950">
                    ✓
                  </span>
                )}
              </div>
              <span className={`truncate text-[10px] leading-tight ${won ? "text-slate-200" : "text-slate-500"}`}>{champion.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
