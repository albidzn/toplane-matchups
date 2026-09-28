import type { ApexCutoffs, LpSnapshot, RankedEntry } from "../../lib/types";
import { apexProgress } from "../../lib/lp";
import { rankEmblemUrl } from "../../lib/champions";
import { rankLabel, winrate } from "../../lib/profile";
import RemoteImg from "./RemoteImg";
import LpGraph from "./LpGraph";

interface RankCardProps {
  title: string;
  entry?: RankedEntry;
  history?: LpSnapshot[];
  peak?: LpSnapshot | null;
  apexCutoffs?: ApexCutoffs | null;
}

const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function ApexBar({
  lp,
  progress,
  approx,
}: {
  lp: number;
  progress: NonNullable<ReturnType<typeof apexProgress>>;
  approx: boolean;
}) {
  const mark = approx ? "~" : "";
  const { lower, upper, fraction } = progress;
  const pct = (fraction ?? 0) * 100;
  return (
    <div className="mt-3">
      {upper && fraction != null ? (
        <div className="relative pt-5">
          <span
            className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold text-slate-200"
            style={{ left: `${Math.min(92, Math.max(8, pct))}%` }}
          >
            {lp} LP
          </span>
          <div className="relative h-1.5 rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-200 bg-gold-500 shadow"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-300">{lower.label}</span> | {lower.lp > 0 ? mark : ""}{lower.lp} LP
        </span>
        {upper && (
          <span>
            <span className="font-semibold text-slate-300">{upper.label}</span> | {mark}{upper.lp} LP
          </span>
        )}
      </div>
    </div>
  );
}

export default function RankCard({ title, entry, history, peak, apexCutoffs }: RankCardProps) {
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
        <div className={history ? "grid gap-4 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}>
          <div>
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

          {APEX.has(entry.tier.toUpperCase()) ? (
            (() => {
              const progress = apexProgress(entry, apexCutoffs);
              return progress ? <ApexBar lp={entry.lp} progress={progress} approx={Boolean(apexCutoffs?.approx)} /> : null;
            })()
          ) : (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, entry.lp)}%` }}
              />
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {entry.wins}W {entry.losses}L
            </span>
            <span className={wr >= 50 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
              {wr}%
            </span>
          </div>

            </div>
          {history && (
            <LpGraph
              history={history}
              peak={peak}
              cutoffs={apexCutoffs}
              className="border-t border-ink-800 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
            />
          )}
        </div>
      )}
    </div>
  );
}
