import { useMemo } from "react";
import type { Champion, MatchSummary } from "../../lib/types";
import { winrate } from "../../lib/profile";
import { positionLabel } from "../../lib/live";
import { summarizeRecent } from "../../lib/recent-summary";
import ChampIcon from "../ChampIcon";

interface SummaryCardProps {
  recent: MatchSummary[];
  champions: Champion[];
  ddragonVersion: string | null;
}

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Donut({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const wr = winrate(wins, losses);
  const winArc = total ? (wins / total) * CIRCUMFERENCE : 0;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={RADIUS} fill="none" strokeWidth="9" className="stroke-red-400/70" />
        <circle
          cx="38"
          cy="38"
          r={RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="butt"
          strokeDasharray={`${winArc} ${CIRCUMFERENCE}`}
          className="stroke-emerald-400 transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-base font-bold text-slate-100">
        {wr}%
      </div>
    </div>
  );
}

export default function SummaryCard({ recent, champions, ddragonVersion }: SummaryCardProps) {
  const summary = useMemo(() => summarizeRecent(recent), [recent]);
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;
  const form = recent.filter((m) => !m.remake);
  const maxRole = Math.max(1, ...summary.roles.map((r) => r.games));

  return (
    <div className="animate-fade-slide-up rounded-2xl border border-ink-700 bg-ink-900/60 p-3 [animation-delay:60ms]">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Last {summary.games} games
      </div>

      {summary.games === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">No ranked games yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.15fr_1fr_0.9fr] sm:gap-0 sm:divide-x sm:divide-ink-800">
            <div className="flex items-center gap-4 sm:pr-4">
              <Donut wins={summary.wins} losses={summary.losses} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-200">
                  {summary.wins}W {summary.losses}L
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {summary.avgKills.toFixed(1)} / <span className="text-red-400">{summary.avgDeaths.toFixed(1)}</span> /{" "}
                  {summary.avgAssists.toFixed(1)}
                </div>
                <div className="mt-0.5 text-xs">
                  <span className={summary.kdaRatio >= 3 ? "font-semibold text-emerald-400" : "font-semibold text-slate-200"}>
                    {summary.kdaRatio.toFixed(2)} KDA
                  </span>
                  <span className="text-slate-500"> · {summary.csPerMin.toFixed(1)} cs/m</span>
                </div>
              </div>
            </div>

            <div className="sm:px-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Champions played</div>
              <div className="space-y-1.5">
                {summary.champions.slice(0, 3).map((c) => {
                  const wr = winrate(c.wins, c.games - c.wins);
                  const kda = (c.kills + c.assists) / Math.max(1, c.deaths);
                  return (
                    <div key={c.champion} className="flex items-center gap-2">
                      <ChampIcon ddragonVersion={ddragonVersion} championId={c.champion} name={nameOf(c.champion)} size={26} />
                      <div className="min-w-0 flex-1 text-xs leading-tight">
                        <div>
                          <span className={`font-semibold ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{wr}%</span>{" "}
                          <span className="text-slate-500">
                            ({c.wins}W {c.games - c.wins}L)
                          </span>
                        </div>
                        <div className="text-slate-500">{kda.toFixed(2)} KDA</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sm:pl-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Top roles</div>
              <div className="flex h-[76px] items-end justify-between gap-1.5">
                {summary.roles.map((r) => (
                  <div
                    key={r.position}
                    aria-label={`${positionLabel(r.position)}: ${r.games} ${r.games === 1 ? "game" : "games"}`}
                    className="group flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1"
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`relative w-full rounded-t-sm transition-[height] duration-700 ease-out ${r.games > 0 ? "bg-gold-500/80 group-hover:bg-gold-400" : "bg-ink-800"}`}
                        style={{ height: `${r.games > 0 ? Math.max(8, (r.games / maxRole) * 78) : 4}%` }}
                      >
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink-950 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100 opacity-0 shadow ring-1 ring-ink-600 transition-opacity duration-100 group-hover:opacity-100">
                          {r.games} {r.games === 1 ? "game" : "games"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase text-slate-500 group-hover:text-slate-300">
                      {positionLabel(r.position).slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1 border-t border-ink-800 pt-2.5">
            {form.map((m) => (
              <div
                key={m.matchId}
                title={`${m.win ? "Win" : "Loss"} on ${nameOf(m.champion)}`}
                className={`h-2.5 flex-1 min-w-[10px] max-w-[28px] rounded-sm ${m.win ? "bg-emerald-400" : "bg-red-400/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
