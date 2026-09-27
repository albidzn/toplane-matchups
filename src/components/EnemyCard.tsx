import type { Champion, Enemy } from "../lib/types";
import type { WinLoss } from "../hooks/useProfile";
import { winrate } from "../lib/profile";
import ChampIcon from "./ChampIcon";

interface EnemyCardProps {
  enemy: Enemy;
  champions: Champion[];
  ddragonVersion: string | null;
  selected: boolean;
  record?: WinLoss;
  onSelect: () => void;
}

export default function EnemyCard({ enemy, champions, ddragonVersion, selected, record, onSelect }: EnemyCardProps) {
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;
  const hasPicks = enemy.picks.length > 0;
  const hasRecord = record && record.wins + record.losses > 0;
  const wr = hasRecord ? winrate(record.wins, record.losses) : 0;

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-150 active:scale-95 ${
        selected
          ? "border-gold-500/70 bg-gold-500/10 shadow-glow"
          : hasPicks
            ? "border-ink-700 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-800 hover:-translate-y-0.5"
            : "border-ink-800 bg-ink-900/40 opacity-60 hover:opacity-90 hover:border-ink-600 hover:-translate-y-0.5"
      }`}
    >
      {hasRecord && (
        <span
          className={`absolute right-1 top-1 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none shadow-md shadow-black/50 ring-1 ${
            wr >= 50
              ? "bg-emerald-950 text-emerald-400 ring-emerald-500/40"
              : "bg-red-950 text-red-400 ring-red-500/40"
          }`}
          title={`Your record vs ${nameOf(enemy.champion)}: ${record!.wins}W ${record!.losses}L`}
        >
          {wr}%
        </span>
      )}

      <ChampIcon
        ddragonVersion={ddragonVersion}
        championId={enemy.champion}
        name={nameOf(enemy.champion)}
        size={52}
        rounded="lg"
        className={selected ? "ring-2 ring-gold-500" : ""}
      />
      <span className="w-full truncate text-xs font-medium text-slate-300">{nameOf(enemy.champion)}</span>

      {hasPicks ? (
        <div className="flex -space-x-1.5">
          {enemy.picks.slice(0, 3).map((p) => (
            <ChampIcon
              key={p.id}
              ddragonVersion={ddragonVersion}
              championId={p.champion}
              name={nameOf(p.champion)}
              size={16}
              rounded="full"
              className="ring-2 ring-ink-900"
            />
          ))}
          {enemy.picks.length > 3 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-[9px] font-semibold text-slate-300 ring-2 ring-ink-900">
              +{enemy.picks.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] uppercase tracking-wide text-slate-600">No pick</span>
      )}
    </button>
  );
}
