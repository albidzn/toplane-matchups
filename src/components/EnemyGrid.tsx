import { useMemo, useState } from "react";
import type { Champion, Enemy } from "../lib/types";
import type { WinLoss } from "../hooks/useProfile";
import { useStickyState } from "../hooks/useStickyState";
import EnemyCard from "./EnemyCard";
import ChampionPicker from "./ChampionPicker";

interface EnemyGridProps {
  enemies: Enemy[];
  champions: Champion[];
  ddragonVersion: string | null;
  selectedId: string | null;
  editMode: boolean;
  enemyRecords?: Map<string, WinLoss>;
  onSelect: (id: string) => void;
  onAddEnemy: (championId: string) => void;
}

export default function EnemyGrid({
  enemies,
  champions,
  ddragonVersion,
  selectedId,
  editMode,
  enemyRecords,
  onSelect,
  onAddEnemy,
}: EnemyGridProps) {
  const [hideEmpty, setHideEmpty] = useStickyState("lm.hideEmpty", false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  const visible = useMemo(() => {
    const list = hideEmpty ? enemies.filter((e) => e.picks.length > 0) : enemies;
    return [...list].sort((a, b) => nameOf(a.champion).localeCompare(nameOf(b.champion)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, hideEmpty, champions]);

  const existingIds = new Set(enemies.map((e) => e.champion));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
          Enemies <span className="text-slate-600">({visible.length})</span>
        </h2>
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-800 accent-gold-500"
          />
          Hide without picks
        </label>
      </div>

      <div className="scrollbar-thin grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 overflow-y-auto pb-3 pr-1">
        {visible.map((enemy) => (
          <EnemyCard
            key={enemy.id}
            enemy={enemy}
            champions={champions}
            ddragonVersion={ddragonVersion}
            selected={enemy.id === selectedId}
            record={enemyRecords?.get(enemy.champion)}
            onSelect={() => onSelect(enemy.id)}
          />
        ))}

        {editMode && (
          <div className="relative animate-fade-in">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex h-full min-h-[92px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-600 text-slate-500 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-95"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[10px] uppercase tracking-wide">Add enemy</span>
            </button>
            {pickerOpen && (
              <ChampionPicker
                champions={champions}
                ddragonVersion={ddragonVersion}
                excludeIds={existingIds}
                placeholder="Add enemy champion…"
                dropDirection="up"
                onSelect={(id) => {
                  onAddEnemy(id);
                  setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
