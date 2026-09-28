import { useMemo, useState } from "react";
import type { Champion, MatchSummary } from "../../lib/types";
import { itemIconUrl } from "../../lib/champions";
import { formatDuration, formatPlaytime, formatRelativeTime, kdaRatio, winrate } from "../../lib/profile";
import { groupSessions } from "../../lib/sessions";
import { positionLabel } from "../../lib/live";
import { shortQueueName } from "../../lib/queue-filter";
import ChampIcon from "../ChampIcon";
import MatchDetails from "./MatchDetails";

interface MatchListProps {
  matches: MatchSummary[];
  /** How many games to show; owned by the parent so the summary can follow it. */
  visible: number;
  onShowMore: () => void;
  champions: Champion[];
  ddragonVersion: string | null;
}

export const HISTORY_PAGE_SIZE = 20;

export default function MatchList({ matches, visible, onShowMore, champions, ddragonVersion }: MatchListProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;
  const shown = useMemo(() => matches.slice(0, visible), [matches, visible]);
  const sessions = useMemo(() => groupSessions(shown), [shown]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="animate-fade-slide-up rounded-2xl border border-ink-700 bg-ink-900/60 p-4 [animation-delay:100ms]">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Match history{" "}
        <span className="text-slate-600">
          · {Math.min(visible, matches.length)} of {matches.length} games
        </span>
      </h3>

      {matches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-slate-500">
          No games recorded for this filter yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <section key={session.matches[0].matchId}>
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 px-1 text-xs text-slate-500">
                <span className="font-medium text-slate-300">{formatRelativeTime(session.endedAt)}</span>
                {session.games > 0 && (
                  <>
                    <span>
                      · {session.games} {session.games === 1 ? "game" : "games"}
                    </span>
                    <span>
                      · {session.wins}W {session.losses}L
                    </span>
                    <span
                      className={
                        winrate(session.wins, session.losses) >= 50 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"
                      }
                    >
                      · {winrate(session.wins, session.losses)}%
                    </span>
                  </>
                )}
                <span>· {formatPlaytime(session.playTimeSec)}</span>
              </div>

              <div className="space-y-1.5">
                {session.matches.map((m, i) => {
                  const open = openId === m.matchId;
                  const tone = m.remake
                    ? "border-slate-600 bg-ink-850/60 opacity-60"
                    : m.win
                      ? "border-emerald-400 bg-emerald-500/[0.09] hover:bg-emerald-500/[0.15]"
                      : "border-red-400 bg-red-500/[0.09] hover:bg-red-500/[0.15]";
                  const resultText = m.remake ? "Remake" : m.win ? "Victory" : "Defeat";
                  const resultColor = m.remake ? "text-slate-400" : m.win ? "text-emerald-400" : "text-red-400";
                  return (
                    <div key={m.matchId}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : m.matchId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenId(open ? null : m.matchId);
                          }
                        }}
                        style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                        className={`flex animate-fade-slide-up cursor-pointer items-center gap-3 rounded-xl border-l-4 p-2.5 transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 ${tone}`}
                      >
                        <ChampIcon ddragonVersion={ddragonVersion} championId={m.champion} name={nameOf(m.champion)} size={40} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="truncate font-medium text-slate-100">{nameOf(m.champion)}</span>
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
                            <span className={`font-semibold ${resultColor}`}>{resultText}</span> · {positionLabel(m.position) || "—"} ·{" "}
                            {shortQueueName(m.queueId)}
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
                          {m.items.map((item, idx) => {
                            const url = item > 0 && ddragonVersion ? itemIconUrl(ddragonVersion, item) : null;
                            return (
                              <div key={idx} className="h-6 w-6 overflow-hidden rounded bg-ink-800 ring-1 ring-ink-700">
                                {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                              </div>
                            );
                          })}
                        </div>

                        <div className="w-16 shrink-0 text-right text-xs text-slate-500">
                          <div>{formatDuration(m.durationSec)}</div>
                          <div>{formatRelativeTime(m.gameEnd)}</div>
                        </div>

                        <svg
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {open && (
                        <div className="mt-1.5">
                          <MatchDetails match={m} champions={champions} ddragonVersion={ddragonVersion} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {matches.length > visible && (
            <button
              onClick={onShowMore}
              className="w-full rounded-lg border border-ink-700 py-2 text-xs font-medium text-slate-400 transition-all hover:border-gold-500/40 hover:text-gold-400 active:scale-[0.98]"
            >
              Show more games ({matches.length - visible} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
