import type { FormSummary, MatchSummary } from "../../lib/types";
import { winrate } from "../../lib/profile";

interface FormCardProps {
  form?: FormSummary;
  recent: MatchSummary[];
}

export default function FormCard({ form, recent }: FormCardProps) {
  const games = recent.filter((m) => !m.remake).slice(0, 20);
  const wr = form ? winrate(form.wins, form.games - form.wins) : 0;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-4 transition-colors duration-150 hover:border-ink-600">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Recent form <span className="text-slate-600">(last {games.length})</span>
      </div>

      {!form || form.games === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">No ranked games yet.</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1">
            {games.map((m) => (
              <div
                key={m.matchId}
                title={`${m.win ? "Win" : "Loss"} on ${m.champion}`}
                className={`h-3 w-3 rounded-sm ${m.win ? "bg-emerald-400" : "bg-red-400/80"}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={`font-display text-lg font-bold ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                {wr}%
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Winrate</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-slate-100">{form.avgKda.toFixed(2)}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Avg KDA</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-slate-100">{form.avgCsPerMin.toFixed(1)}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">CS/min</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
