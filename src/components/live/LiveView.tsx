import type { Champion, Enemy, LiveState } from "../../lib/types";
import type { WinLoss } from "../../hooks/useProfile";
import { overrideChampSelectEnemyLaner, overrideGameEnemyLaner } from "../../lib/api";
import ChampSelectView from "./ChampSelectView";
import LoadingScreenView from "./LoadingScreenView";

interface LiveViewProps {
  live: LiveState;
  champions: Champion[];
  ddragonVersion: string | null;
  enemies: Enemy[];
  recordsByEnemy: Map<string, Map<string, WinLoss>>;
  onQuickAdd: (championId: string) => void;
}

export default function LiveView({ live, champions, ddragonVersion, enemies, recordsByEnemy, onQuickAdd }: LiveViewProps) {
  if (!live.lcuConnected) {
    return (
      <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-700 text-center">
        <div className="text-4xl opacity-30">🎮</div>
        <p className="max-w-xs text-sm text-slate-500">
          Waiting for the League client — open it and this fills in automatically once you reach champ select.
        </p>
      </div>
    );
  }

  if (live.phase === "champselect" && live.champSelect) {
    return (
      <ChampSelectView
        champSelect={live.champSelect}
        champions={champions}
        ddragonVersion={ddragonVersion}
        enemies={enemies}
        recordsByEnemy={recordsByEnemy}
        onOverride={(cellId) => overrideChampSelectEnemyLaner(cellId)}
        onQuickAdd={onQuickAdd}
      />
    );
  }

  if ((live.phase === "loading" || live.phase === "in-progress") && live.game) {
    return (
      <LoadingScreenView
        game={live.game}
        champions={champions}
        ddragonVersion={ddragonVersion}
        enemies={enemies}
        recordsByEnemy={recordsByEnemy}
        live={live.phase === "in-progress"}
        onOverride={(puuid) => overrideGameEnemyLaner(puuid)}
        onQuickAdd={onQuickAdd}
      />
    );
  }

  return (
    <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-700 text-center">
      <div className="text-4xl opacity-30">⏳</div>
      <p className="max-w-xs text-sm text-slate-500">
        Not in a game right now. This fills in automatically once you reach champ select.
      </p>
    </div>
  );
}
