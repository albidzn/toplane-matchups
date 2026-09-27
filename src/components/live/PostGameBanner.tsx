import { useState } from "react";
import type { Champion, Enemy, LiveGameState } from "../../lib/types";
import ChampIcon from "../ChampIcon";

interface PostGameBannerProps {
  game: LiveGameState;
  champions: Champion[];
  ddragonVersion: string | null;
  matchingEnemy: Enemy | null;
  onQuickAdd: () => void;
  onSaveNote: (note: string) => void;
}

export default function PostGameBanner({
  game,
  champions,
  ddragonVersion,
  matchingEnemy,
  onQuickAdd,
  onSaveNote,
}: PostGameBannerProps) {
  const myTop = game.roster.find((p) => p.teamId === game.myTeamId && p.position === "TOP");
  const enemyTop = game.enemyLaner;
  const existingPick =
    matchingEnemy && myTop?.championId
      ? matchingEnemy.picks.find((p) => p.champion === myTop.championId) ?? null
      : null;

  const [note, setNote] = useState(existingPick?.note ?? "");
  const [saved, setSaved] = useState(false);

  const myName = myTop?.championId ? champions.find((c) => c.id === myTop.championId)?.name ?? myTop.championId : "?";
  const enemyName = enemyTop?.championId
    ? champions.find((c) => c.id === enemyTop.championId)?.name ?? enemyTop.championId
    : "?";

  const win = game.result === "Win";
  const lose = game.result === "Lose";

  function save() {
    onSaveNote(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div
      className={`animate-fade-slide-up rounded-2xl border p-4 ${
        win
          ? "border-emerald-500/30 bg-emerald-500/5"
          : lose
            ? "border-red-500/30 bg-red-500/5"
            : "border-ink-700 bg-ink-900/60"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`font-display text-lg font-bold uppercase tracking-wide ${
            win ? "text-emerald-400" : lose ? "text-red-400" : "text-slate-400"
          }`}
        >
          {win ? "Victory" : lose ? "Defeat" : "Game ended"}
        </div>
        <div className="text-xs text-slate-500">Postgame</div>
      </div>

      <div className="mb-3 flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <ChampIcon ddragonVersion={ddragonVersion} championId={myTop?.championId ?? "?"} name={myName} size={48} rounded="lg" />
          <span className="text-xs text-slate-400">{myName}</span>
          {myTop?.level != null && (
            <span className="text-[11px] text-slate-500">
              {myTop.kills}/{myTop.deaths}/{myTop.assists} · {myTop.cs} cs
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-slate-600">vs</span>
        <div className="flex flex-col items-center gap-1">
          <ChampIcon
            ddragonVersion={ddragonVersion}
            championId={enemyTop?.championId ?? "?"}
            name={enemyName}
            size={48}
            rounded="lg"
          />
          <span className="text-xs text-slate-400">{enemyName}</span>
          {enemyTop?.level != null && (
            <span className="text-[11px] text-slate-500">
              {enemyTop.kills}/{enemyTop.deaths}/{enemyTop.assists} · {enemyTop.cs} cs
            </span>
          )}
        </div>
      </div>

      {!matchingEnemy ? (
        <button
          onClick={onQuickAdd}
          className="w-full rounded-xl border border-dashed border-ink-600 py-2.5 text-sm font-medium text-slate-400 transition-all hover:border-gold-500/50 hover:text-gold-400 active:scale-[0.98]"
        >
          + Add {enemyName} to your matchup guide
        </button>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick note — {myName} vs {enemyName}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What worked, what to change next time…"
            rows={2}
            className="w-full resize-none rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-hextech-500/50 focus:outline-none"
          />
          <button
            onClick={save}
            className="rounded-lg border border-hextech-500/40 bg-hextech-500/10 px-3 py-1.5 text-xs font-semibold text-hextech-400 transition-all hover:bg-hextech-500/20 active:scale-95"
          >
            {saved ? "Saved ✓" : existingPick ? "Update note" : "Save as pick"}
          </button>
        </div>
      )}
    </div>
  );
}
