import { useMemo } from "react";
import type { Champion, MatchSummary } from "../../lib/types";
import { itemIconUrl } from "../../lib/champions";
import { formatDuration, formatPlaytime, formatRelativeTime, kdaRatio, winrate } from "../../lib/profile";
import { groupSessions } from "../../lib/sessions";
import { positionLabel } from "../../lib/live";
import ChampIcon from "../ChampIcon";

interface MatchListProps {
  matches: MatchSummary[];
  champions: Champion[];
  ddragonVersion: string | null;
}

export default function MatchList({ matches, champions, ddragonVersion }: MatchListProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;
  const sessions = useMemo(() => groupSessions(matches), [matches]);

  return (
    <div className="animate-fade-slide-up rounded-2xl border border-ink-700 bg-ink-900/60 p-4 [animation-delay:100ms]">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Match history <span className="text-slate-600">· {matches.length} games</span>
      </h3>

      {matches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-slate-500">
          No games recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <section key={session.matches[0].matchId}>
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 px-1 text-xs text-slate-500">
                <span className="font-medium text-slate-300">{formatRelativeTime(session.endedAt)}</span>
                {session.games > 0 && (
                  <>
                    <span>· {session.games} {session.games === 1 ? "game" : "games"}</span>
                    <span>· {session.wins}W {session.losses}L</span>
                    <span
                      className={
                        winrate(session.wins, session.losses) >= 50
                          ? "font-semibold text-emerald-400"
                          : "font-semibold text-red-400"
                      }
                    >
                      · {winrate(session.wins, session.losses)}%
                    </span>
                  </>
                )}
                <span>· {formatPlaytime(session.playTimeSec)}</span>
              </div>
              <div className="space-y-1.5">
          {session.matches.map((m, i) => (
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
                  {positionLabel(m.position) || "—"} · {m.remake ? "Remake" : m.win ? "Victory" : "Defeat"}
                </div>
              </div>

              <div className="w-32 shrink-0 text-center">
                <div className="text-sm font-semibold text-slate-200">
                  {m.kills} / <span className="text-red-400">{m.deaths}</span> / {m.assists}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className={kdaRatio(m.kills, m.deaths, m.assists) >= 3 ? "text-emerald-400" : undefined}>
                    {kdaRatio(m.kills, m.deaths, m.assists).toFixed(2)}
                  </span>{" "}
                  · {m.cs} cs ({(m.cs / (m.durationSec / 60 || 1)).toFixed(1)})
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

              <div className="w-16 shrink-0 text-right text-xs text-slate-500">
                <div>{formatDuration(m.durationSec)}</div>
                <div>{m.remake ? "Remake" : formatRelativeTime(m.gameEnd)}</div>
              </div>
            </div>
          ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
