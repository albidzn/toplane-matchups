import type { Champion, Enemy, LiveGameState } from "../../lib/types";
import type { WinLoss } from "../../hooks/useProfile";
import { comparePositions } from "../../lib/live";
import RosterRow from "./RosterRow";
import EnemyLanerCard from "./EnemyLanerCard";

interface LoadingScreenViewProps {
  game: LiveGameState;
  champions: Champion[];
  ddragonVersion: string | null;
  enemies: Enemy[];
  recordsByEnemy: Map<string, Map<string, WinLoss>>;
  live: boolean;
  editable?: boolean;
  title?: string;
  onOverride: (puuid: string) => void;
  onQuickAdd: (championId: string) => void;
}

export default function LoadingScreenView({
  game,
  champions,
  ddragonVersion,
  enemies,
  recordsByEnemy,
  live,
  editable = true,
  title,
  onOverride,
  onQuickAdd,
}: LoadingScreenViewProps) {
  const myTeam = game.roster.filter((p) => p.teamId === game.myTeamId).sort((a, b) => comparePositions(a.position, b.position));
  const enemyTeam = game.roster.filter((p) => p.teamId !== game.myTeamId).sort((a, b) => comparePositions(a.position, b.position));
  const myTop = myTeam.find((p) => p.position === "TOP");

  const enemyChampId = game.enemyLaner?.championId ?? null;
  const matchingEnemy = enemyChampId ? enemies.find((e) => e.champion === enemyChampId) ?? null : null;
  const recordsForEnemy = enemyChampId ? recordsByEnemy.get(enemyChampId) : undefined;

  return (
    <div className="scrollbar-thin h-full animate-fade-in space-y-4 overflow-y-auto pr-1">
      {game.enemyLaner ? (
        <EnemyLanerCard
          enemyLaner={game.enemyLaner}
          champions={champions}
          ddragonVersion={ddragonVersion}
          myChampionId={myTop?.championId ?? null}
          matchingEnemy={matchingEnemy}
          recordsForThisEnemy={recordsForEnemy}
          onQuickAdd={() => onQuickAdd(enemyChampId!)}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-700 p-4 text-center text-sm text-slate-500">
          Still figuring out who's playing top for the enemy team…
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title ?? (live ? "Scoreboard" : "Lobby")}{" "}
            <span className="text-slate-600">· {myTeam.length + enemyTeam.length} players</span>
          </h3>
        </div>
        <div className="space-y-0.5">
          {myTeam.map((p) => (
            <RosterRow
              key={p.puuid}
              participant={p}
              champions={champions}
              ddragonVersion={ddragonVersion}
              isMe={p.puuid === game.myPuuid}
            />
          ))}
        </div>
        <div className="my-2 border-t border-ink-800" />
        <div className="space-y-0.5">
          {enemyTeam.map((p) => (
            <RosterRow
              key={p.puuid}
              participant={p}
              champions={champions}
              ddragonVersion={ddragonVersion}
              isEnemyLaner={p.puuid === game.enemyLaner?.puuid}
              editable={editable && p.puuid !== game.enemyLaner?.puuid}
              onPickAsEnemyLaner={() => onOverride(p.puuid)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
