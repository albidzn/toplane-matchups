import type { Champion, MatchSummary } from "../../lib/types";
import { itemIconUrl } from "../../lib/champions";
import { formatDuration, formatKda, formatRelativeTime } from "../../lib/profile";
import ChampIcon from "../ChampIcon";

interface MatchListProps {
  matches: MatchSummary[];
  champions: Champion[];
  ddragonVersion: string | null;
}

export default function MatchList({ matches, champions, ddragonVersion }: MatchListProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-700 bg-ink-900/60 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent matches</h3>

      {matches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-slate-500">
          No games recorded yet.
        </div>
      ) : (
        <div className="scrollbar-thin -mr-1 max-h-[520px] flex-1 space-y-1.5 overflow-y-auto pr-1 lg:max-h-none">
          {matches.map((m, i) => (
            <div
              key={m.matchId}
              style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
              className={`flex animate-fade-slide-up items-center gap-3 rounded-xl border-l-4 bg-ink-850/60 p-2.5 transition-colors duration-150 hover:bg-ink-800/60 ${
                m.remake
                  ? "border-slate-600 opacity-50"
                  : m.win
                    ? "border-emerald-400"
                    : "border-red-400"
              }`}
            >
              <ChampIcon ddragonVersion={ddragonVersion} championId={m.champion} name={nameOf(m.champion)} size={36} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="truncate font-medium text-slate-200">{nameOf(m.champion)}</span>
                  {m.opponent && (
                    <>
                      <span className="shrink-0 text-slate-600">vs</span>
                      <ChampIcon
                        ddragonVersion={ddragonVersion}
                        championId={m.opponent.champion}
                        name={nameOf(m.opponent.champion)}
                        size={18}
                        rounded="full"
                      />
                      <span className="truncate text-xs text-slate-500">{nameOf(m.opponent.champion)}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {formatKda(m.kills, m.deaths, m.assists)} · {(m.cs / (m.durationSec / 60 || 1)).toFixed(1)} cs/min
                </div>
              </div>

              <div className="hidden shrink-0 gap-0.5 sm:flex">
                {m.items.map((item, i) => {
                  const url = ddragonVersion ? itemIconUrl(ddragonVersion, item) : null;
                  return (
                    <div key={i} className="h-6 w-6 overflow-hidden rounded bg-ink-800 ring-1 ring-ink-700">
                      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 text-right text-xs text-slate-500">
                <div>{formatDuration(m.durationSec)}</div>
                <div>{m.remake ? "Remake" : formatRelativeTime(m.gameEnd)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
