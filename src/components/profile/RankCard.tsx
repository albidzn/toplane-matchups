import type { LpSnapshot, RankedEntry } from "../../lib/types";
import { rankEmblemUrl } from "../../lib/champions";
import { rankLabel, winrate } from "../../lib/profile";
import RemoteImg from "./RemoteImg";
import LpGraph from "./LpGraph";

interface RankCardProps {
  title: string;
  entry?: RankedEntry;
  history?: LpSnapshot[];
}

export default function RankCard({ title, entry, history }: RankCardProps) {
  const wr = entry ? winrate(entry.wins, entry.losses) : 0;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-4 transition-colors duration-150 hover:border-ink-600">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>

      {!entry ? (
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-800 text-lg opacity-40">
            ?
          </div>
          <div className="text-sm text-slate-500">Unranked</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <RemoteImg
              src={rankEmblemUrl(entry.tier)}
              alt={entry.tier}
              className="h-14 w-14 shrink-0 drop-shadow-lg"
              fallback={<div className="h-14 w-14 shrink-0 rounded-full bg-ink-800" />}
            />
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold text-slate-100">{rankLabel(entry)}</div>
              <div className="text-xs text-slate-500">
                {entry.lp} LP
                {entry.hotStreak && <span className="ml-1.5 text-gold-400">🔥 Hot streak</span>}
              </div>
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(100, entry.lp)}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {entry.wins}W {entry.losses}L
            </span>
            <span className={wr >= 50 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
              {wr}%
            </span>
          </div>

          {history && <LpGraph history={history} />}
        </>
      )}
    </div>
  );
}
