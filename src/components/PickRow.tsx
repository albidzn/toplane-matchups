import { useState } from "react";
import type { Champion, Pick } from "../lib/types";
import ChampIcon from "./ChampIcon";
import WinLossBadge from "./profile/WinLossBadge";

interface PickRowProps {
  pick: Pick;
  champions: Champion[];
  ddragonVersion: string | null;
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  record?: { wins: number; losses: number };
  onNoteChange: (note: string) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

export default function PickRow({
  pick,
  champions,
  ddragonVersion,
  editMode,
  isFirst,
  isLast,
  record,
  onNoteChange,
  onRemove,
  onMove,
}: PickRowProps) {
  const [noteDraft, setNoteDraft] = useState(pick.note);
  const name = champions.find((c) => c.id === pick.champion)?.name ?? pick.champion;

  function commitNote() {
    if (noteDraft !== pick.note) onNoteChange(noteDraft);
  }

  return (
    <div className="group flex animate-fade-slide-up items-center gap-3 rounded-xl border border-ink-700 bg-ink-850/70 p-3 transition-colors duration-150 hover:border-ink-600">
      <ChampIcon ddragonVersion={ddragonVersion} championId={pick.champion} name={name} size={48} rounded="lg" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-display text-sm font-semibold text-slate-100">{name}</span>
          {record && <WinLossBadge wins={record.wins} losses={record.losses} />}
        </div>
        {editMode ? (
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Runes / summoners…"
            className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-slate-300 placeholder:text-slate-600 focus:border-hextech-500/50 focus:outline-none"
          />
        ) : pick.note ? (
          <span className="mt-1 inline-block rounded-full bg-hextech-500/10 px-2 py-0.5 text-xs font-medium text-hextech-400 ring-1 ring-hextech-500/20">
            {pick.note}
          </span>
        ) : null}
      </div>

      {editMode && (
        <div className="flex shrink-0 flex-col items-center gap-1 opacity-40 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            disabled={isFirst}
            onClick={() => onMove(-1)}
            aria-label="Move pick up"
            title="Move up"
            className="rounded p-1 text-slate-500 transition-all duration-100 hover:bg-ink-700 hover:text-slate-200 active:scale-90 disabled:pointer-events-none disabled:opacity-20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            disabled={isLast}
            onClick={() => onMove(1)}
            aria-label="Move pick down"
            title="Move down"
            className="rounded p-1 text-slate-500 transition-all duration-100 hover:bg-ink-700 hover:text-slate-200 active:scale-90 disabled:pointer-events-none disabled:opacity-20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {editMode && (
        <button
          onClick={onRemove}
          aria-label="Remove pick"
          title="Remove pick"
          className="shrink-0 rounded-lg p-1.5 text-slate-600 opacity-40 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 active:scale-90 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
