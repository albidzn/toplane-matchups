import type { Champion, MatchPlayer, MatchSummary } from "../../lib/types";
import { itemIconUrl } from "../../lib/champions";
import { formatDuration, kdaRatio } from "../../lib/profile";
import { comparePositions, positionLabel } from "../../lib/live";
import { shortQueueName } from "../../lib/queue-filter";
import ChampIcon from "../ChampIcon";

interface MatchDetailsProps {
  match: MatchSummary;
  champions: Champion[];
  ddragonVersion: string | null;
}

function TeamTable({
  players,
  win,
  side,
  maxDamage,
  champions,
  ddragonVersion,
}: {
  players: MatchPlayer[];
  win: boolean;
  side: string;
  maxDamage: number;
  champions: Champion[];
  ddragonVersion: string | null;
}) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;
  return (
    <div>
      <div className={`mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide ${win ? "text-emerald-400" : "text-red-400"}`}>
        {win ? "Victory" : "Defeat"} <span className="font-normal text-slate-600">· {side}</span>
      </div>
      <div className="space-y-0.5">
        {players.map((p, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${
              p.isMe ? "bg-hextech-500/10 ring-1 ring-hextech-500/30" : "hover:bg-ink-800/40"
            }`}
          >
            <ChampIcon ddragonVersion={ddragonVersion} championId={p.champion} name={nameOf(p.champion)} size={26} />
            <div className="min-w-0 flex-1">
              <div className={`truncate ${p.isMe ? "font-bold text-slate-100" : "text-slate-300"}`}>
                {p.name || nameOf(p.champion)}
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {nameOf(p.champion)} · {positionLabel(p.position) || "—"} · Lv {p.level}
              </div>
            </div>
            <div className="w-[72px] shrink-0 text-center">
              <div className="text-slate-300">
                {p.kills}/<span className="text-red-400">{p.deaths}</span>/{p.assists}
              </div>
              <div className="text-[10px] text-slate-500">{kdaRatio(p.kills, p.deaths, p.assists).toFixed(2)}</div>
            </div>
            <div className="hidden w-24 shrink-0 sm:block">
              <div className="text-right text-[10px] text-slate-400">{p.damage.toLocaleString()}</div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-red-400/80"
                  style={{ width: `${maxDamage ? (p.damage / maxDamage) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="w-9 shrink-0 text-right text-slate-400">{p.cs}</div>
            <div className="hidden shrink-0 gap-0.5 md:flex">
              {p.items.map((item, idx) => {
                const url = item > 0 && ddragonVersion ? itemIconUrl(ddragonVersion, item) : null;
                return (
                  <div key={idx} className="h-[18px] w-[18px] overflow-hidden rounded bg-ink-800 ring-1 ring-ink-700">
                    {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchDetails({ match, champions, ddragonVersion }: MatchDetailsProps) {
  const players = match.players;
  const maxDamage = players ? Math.max(...players.map((p) => p.damage)) : 0;
  const team = (teamId: number) =>
    (players ?? []).filter((p) => p.teamId === teamId).sort((a, b) => comparePositions(a.position, b.position));
  const blue = team(100);
  const red = team(200);

  return (
    <div className="animate-fade-in space-y-3 rounded-xl border border-ink-700 bg-ink-900/70 p-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>
          <span className="text-slate-300">{shortQueueName(match.queueId)}</span>
        </span>
        <span>
          Duration <span className="text-slate-300">{formatDuration(match.durationSec)}</span>
        </span>
        <span>
          Damage <span className="text-slate-300">{match.damage.toLocaleString()}</span>
        </span>
        <span>
          Gold <span className="text-slate-300">{match.gold.toLocaleString()}</span>
        </span>
      </div>

      {players && players.length > 0 ? (
        <div className="space-y-3">
          {blue.length > 0 && (
            <TeamTable players={blue} win={blue[0].win} side="Blue side" maxDamage={maxDamage} champions={champions} ddragonVersion={ddragonVersion} />
          )}
          {red.length > 0 && (
            <TeamTable players={red} win={red[0].win} side="Red side" maxDamage={maxDamage} champions={champions} ddragonVersion={ddragonVersion} />
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-500">
          The full scoreboard for this older game is still being fetched — it shows up after the next refresh.
        </div>
      )}
    </div>
  );
}
