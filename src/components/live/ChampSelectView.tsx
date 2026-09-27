import type { Champion, ChampSelectState, Enemy } from "../../lib/types";
import type { WinLoss } from "../../hooks/useProfile";
import { positionLabel } from "../../lib/live";
import ChampIcon from "../ChampIcon";
import EnemyLanerCard from "./EnemyLanerCard";

interface ChampSelectViewProps {
  champSelect: ChampSelectState;
  champions: Champion[];
  ddragonVersion: string | null;
  enemies: Enemy[];
  recordsByEnemy: Map<string, Map<string, WinLoss>>;
  onOverride: (cellId: number) => void;
  onQuickAdd: (championId: string) => void;
}

function champIdOf(champions: Champion[], numericKey: number): string | null {
  if (!numericKey) return null;
  return champions.find((c) => c.key === String(numericKey))?.id ?? null;
}

export default function ChampSelectView({
  champSelect,
  champions,
  ddragonVersion,
  enemies,
  recordsByEnemy,
  onOverride,
  onQuickAdd,
}: ChampSelectViewProps) {
  const nameOf = (numericKey: number) => {
    const id = champIdOf(champions, numericKey);
    return id ? champions.find((c) => c.id === id)?.name ?? id : null;
  };

  const myTop = [...champSelect.myTeam].sort(
    (a, b) => (a.assignedPosition === "top" ? -1 : 0) - (b.assignedPosition === "top" ? -1 : 0)
  );
  const enemyTopCell = champSelect.enemy.find((c) => c.position === "TOP" && c.championId !== 0);
  const enemyTopChampId = enemyTopCell ? champIdOf(champions, enemyTopCell.championId) : null;
  const myTopChampId = champIdOf(champions, champSelect.myTeam.find((p) => p.assignedPosition === "top")?.championId ?? 0);
  const matchingEnemy = enemyTopChampId ? enemies.find((e) => e.champion === enemyTopChampId) ?? null : null;
  const recordsForEnemy = enemyTopChampId ? recordsByEnemy.get(enemyTopChampId) : undefined;

  return (
    <div className="scrollbar-thin h-full animate-fade-in space-y-4 overflow-y-auto pr-1">
      {(champSelect.bans.mine.length > 0 || champSelect.bans.theirs.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/40 px-3 py-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Bans</span>
          {champSelect.bans.mine.map((key) => (
            <ChampIcon key={`m${key}`} ddragonVersion={ddragonVersion} championId={champIdOf(champions, key) ?? "?"} size={22} className="opacity-50 grayscale" />
          ))}
          <span className="text-slate-700">·</span>
          {champSelect.bans.theirs.map((key) => (
            <ChampIcon key={`t${key}`} ddragonVersion={ddragonVersion} championId={champIdOf(champions, key) ?? "?"} size={22} className="opacity-50 grayscale" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-hextech-500/20 bg-ink-900/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-hextech-400">Your team</div>
          <div className="space-y-1.5">
            {myTop.map((p) => (
              <div key={p.cellId} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] uppercase text-slate-500">
                  {positionLabel(p.assignedPosition ?? undefined)}
                </span>
                <ChampIcon
                  ddragonVersion={ddragonVersion}
                  championId={champIdOf(champions, p.championId) ?? "?"}
                  size={28}
                />
                <span className="truncate text-xs text-slate-300">{nameOf(p.championId) ?? "…"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-red-500/15 bg-ink-900/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400/80">Enemy team</div>
          <div className="space-y-1.5">
            {champSelect.enemy.map((c) => (
              <div key={c.cellId} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] uppercase text-slate-500">
                  {positionLabel(c.position) || "?"}
                </span>
                <ChampIcon ddragonVersion={ddragonVersion} championId={champIdOf(champions, c.championId) ?? "?"} size={28} />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{nameOf(c.championId) ?? "…"}</span>
                {c.championId !== 0 && c.position !== "TOP" && (
                  <button
                    onClick={() => onOverride(c.cellId)}
                    className="shrink-0 rounded border border-ink-700 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 transition-all hover:border-gold-500/50 hover:text-gold-400"
                  >
                    top?
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {enemyTopChampId && (
        <EnemyLanerCard
          enemyLaner={{ championId: enemyTopChampId }}
          champions={champions}
          ddragonVersion={ddragonVersion}
          myChampionId={myTopChampId}
          matchingEnemy={matchingEnemy}
          recordsForThisEnemy={recordsForEnemy}
          onQuickAdd={() => onQuickAdd(enemyTopChampId)}
        />
      )}
    </div>
  );
}
