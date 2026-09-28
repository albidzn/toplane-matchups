import type { Arena, Champion } from "../../lib/types";
import ChampIcon from "../ChampIcon";

interface ArenaLiveViewProps {
  championId: string | null;
  arena: Arena | null;
  champions: Champion[];
  ddragonVersion: string | null;
}

export default function ArenaLiveView({ championId, arena, champions, ddragonVersion }: ArenaLiveViewProps) {
  const name = championId ? champions.find((c) => c.id === championId)?.name ?? championId : null;
  const stat = championId ? arena?.stats?.find((s) => s.champion === championId) : undefined;
  const won = (stat?.wins ?? 0) > 0;

  return (
    <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gold-500/30 text-center">
      <div className="text-xs font-semibold uppercase tracking-widest text-gold-400/80">Arena mode</div>

      {championId && name ? (
        <>
          <div className="relative">
            <ChampIcon ddragonVersion={ddragonVersion} championId={championId} name={name} size={72} rounded="lg" className="ring-2 ring-gold-500/40" />
            {won && (
              <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-ink-950 ring-2 ring-ink-950">
                ✓
              </span>
            )}
          </div>
          <div>
            <div className="font-display text-lg font-bold text-slate-100">{name}</div>
            <div className={`mt-1 text-sm ${won ? "text-emerald-400" : "text-slate-500"}`}>
              {stat ? (won ? `Already won (${stat.wins}W / ${stat.games}g)` : `Not won yet (${stat.games}g)`) : "No Arena games yet on this champion"}
            </div>
          </div>
        </>
      ) : (
        <p className="max-w-xs text-sm text-slate-500">
          You're in an Arena game — no lane-matchup data applies here. Check the Arena tab for your full win collection.
        </p>
      )}
    </div>
  );
}
