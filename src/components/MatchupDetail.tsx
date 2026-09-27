import { useState } from "react";
import type { Champion, Enemy } from "../lib/types";
import type { WinLoss } from "../hooks/useProfile";
import ChampIcon from "./ChampIcon";
import PickRow from "./PickRow";
import ChampionPicker from "./ChampionPicker";
import WinLossBadge from "./profile/WinLossBadge";

interface MatchupDetailProps {
  enemy: Enemy | null;
  champions: Champion[];
  ddragonVersion: string | null;
  poolIds: Set<string>;
  editMode: boolean;
  /** myChampionId -> record, for the currently selected enemy. */
  enemyRecords?: Map<string, WinLoss>;
  onClose?: () => void;
  onAddPick: (championId: string) => void;
  onUpdateNote: (pickId: string, note: string) => void;
  onRemovePick: (pickId: string) => void;
  onMovePick: (pickId: string, direction: -1 | 1) => void;
  onRemoveEnemy: () => void;
}

export default function MatchupDetail({
  enemy,
  champions,
  ddragonVersion,
  poolIds,
  editMode,
  enemyRecords,
  onClose,
  onAddPick,
  onUpdateNote,
  onRemovePick,
  onMovePick,
  onRemoveEnemy,
}: MatchupDetailProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!enemy) {
    return (
      <div className="flex h-full w-full animate-fade-in flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink-700 px-3 text-center lg:gap-3">
        <div className="text-2xl opacity-30 lg:text-4xl">⚔️</div>
        <p className="max-w-xs text-xs text-slate-500 lg:text-sm">
          Search or pick an enemy champion to see your counters.
        </p>
      </div>
    );
  }

  const enemyName = champions.find((c) => c.id === enemy.champion)?.name ?? enemy.champion;
  const existingPickIds = new Set(enemy.picks.map((p) => p.champion));
  const nameOf = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  // Champions you've actually played vs this enemy that aren't already a saved pick
  const otherRecords = enemyRecords
    ? Array.from(enemyRecords.entries())
        .filter(([champ]) => !existingPickIds.has(champ))
        .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses))
    : [];

  return (
    <div
      key={enemy.id}
      className="flex h-full w-full min-w-0 animate-fade-slide-up flex-col rounded-2xl border border-ink-700 bg-ink-900/60 p-3 min-[520px]:p-4 lg:p-5"
    >
      {onClose && (
        <button
          onClick={onClose}
          className="mb-2 self-start text-xs text-slate-500 transition-all duration-150 hover:text-slate-300 active:scale-95 min-[520px]:hidden"
        >
          ← Back to grid
        </button>
      )}

      <div className="flex items-center gap-3 border-b border-ink-700 pb-3 lg:gap-4 lg:pb-4">
        <ChampIcon
          ddragonVersion={ddragonVersion}
          championId={enemy.champion}
          name={enemyName}
          size={56}
          rounded="lg"
          className="ring-2 ring-ink-600 lg:hidden"
        />
        <ChampIcon
          ddragonVersion={ddragonVersion}
          championId={enemy.champion}
          name={enemyName}
          size={72}
          rounded="lg"
          className="hidden ring-2 ring-ink-600 lg:block"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-slate-500">Enemy toplaner</div>
          <h2 className="truncate font-display text-xl font-bold text-slate-50 lg:text-2xl">{enemyName}</h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close details"
            title="Close (Esc)"
            className="hidden shrink-0 rounded-lg p-1.5 text-slate-500 transition-all hover:bg-ink-700 hover:text-slate-200 active:scale-90 min-[520px]:block lg:hidden"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {editMode && (
          <div className="shrink-0">
            {confirmDelete ? (
              <div className="flex animate-scale-in items-center gap-1.5 origin-right">
                <button
                  onClick={onRemoveEnemy}
                  className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition-all duration-150 hover:bg-red-500/30 active:scale-95"
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-2 text-slate-600 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 active:scale-90"
                title="Remove enemy"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="scrollbar-thin -mr-2 grid flex-1 auto-rows-min content-start gap-2.5 overflow-y-auto py-3 pr-2 min-[520px]:grid-cols-2 lg:grid-cols-1 lg:py-4">
        {enemy.picks.length === 0 && !editMode && (
          <p className="col-span-full py-4 text-center text-sm text-slate-500 lg:py-8">
            No counter picks saved yet for {enemyName}.
          </p>
        )}
        {enemy.picks.map((pick, i) => (
          <PickRow
            key={pick.id}
            pick={pick}
            champions={champions}
            ddragonVersion={ddragonVersion}
            editMode={editMode}
            isFirst={i === 0}
            isLast={i === enemy.picks.length - 1}
            record={enemyRecords?.get(pick.champion)}
            onNoteChange={(note) => onUpdateNote(pick.id, note)}
            onRemove={() => onRemovePick(pick.id)}
            onMove={(dir) => onMovePick(pick.id, dir)}
          />
        ))}

        {otherRecords.length > 0 && (
          <div className="col-span-full pt-1">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your games vs {enemyName}
            </div>
            <div className="space-y-1.5">
              {otherRecords.map(([champ, record], i) => (
                <div
                  key={champ}
                  style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                  className="flex animate-fade-slide-up items-center gap-3 rounded-xl border border-ink-800 bg-ink-850/40 p-2.5"
                >
                  <ChampIcon ddragonVersion={ddragonVersion} championId={champ} name={nameOf(champ)} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{nameOf(champ)}</span>
                  <WinLossBadge wins={record.wins} losses={record.losses} />
                  {editMode && (
                    <button
                      onClick={() => onAddPick(champ)}
                      className="shrink-0 rounded-lg border border-ink-600 px-2 py-1 text-[11px] font-semibold text-slate-400 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-95"
                    >
                      + Add as pick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editMode && (
        <div className="relative pt-1">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-[0.98]"
          >
            <span className="text-lg leading-none">+</span> Add counter pick
          </button>
          {pickerOpen && (
            <ChampionPicker
              champions={champions}
              ddragonVersion={ddragonVersion}
              excludeIds={existingPickIds}
              priorityIds={poolIds}
              dropDirection="up"
              placeholder="Search your pick…"
              onSelect={(id) => {
                onAddPick(id);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
