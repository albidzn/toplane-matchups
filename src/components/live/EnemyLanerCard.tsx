import type { Champion, Enemy } from "../../lib/types";
import type { WinLoss } from "../../hooks/useProfile";
import { winrate } from "../../lib/profile";
import { externalMatchupLinks } from "../../lib/live";
import ChampIcon from "../ChampIcon";
import PickRow from "../PickRow";
import WinLossBadge from "../profile/WinLossBadge";

/** Just enough to render the card — full LiveParticipant fields (rank, riotId, ...)
 * aren't known yet during champ select, only the champion. */
interface MinimalEnemyLaner {
  championId: string | null;
  riotId?: string | null;
  recentForm?: boolean[];
  gamesOnThisChamp?: number;
  winsOnThisChamp?: number;
}

interface EnemyLanerCardProps {
  enemyLaner: MinimalEnemyLaner;
  champions: Champion[];
  ddragonVersion: string | null;
  myChampionId: string | null;
  matchingEnemy: Enemy | null;
  recordsForThisEnemy?: Map<string, WinLoss>;
  onQuickAdd: () => void;
}

const noop = () => {};

export default function EnemyLanerCard({
  enemyLaner,
  champions,
  ddragonVersion,
  myChampionId,
  matchingEnemy,
  recordsForThisEnemy,
  onQuickAdd,
}: EnemyLanerCardProps) {
  const name = enemyLaner.championId
    ? champions.find((c) => c.id === enemyLaner.championId)?.name ?? enemyLaner.championId
    : "Enemy top";
  const [gameName, tagLine] = (enemyLaner.riotId ?? "?#?").split("#");
  const links = enemyLaner.championId ? externalMatchupLinks(enemyLaner.championId, myChampionId) : null;
  const champWr =
    enemyLaner.gamesOnThisChamp != null && enemyLaner.gamesOnThisChamp > 0
      ? winrate(enemyLaner.winsOnThisChamp ?? 0, enemyLaner.gamesOnThisChamp - (enemyLaner.winsOnThisChamp ?? 0))
      : null;

  return (
    <div className="animate-fade-slide-up rounded-2xl border border-gold-500/30 bg-ink-900/60 p-4">
      <div className="mb-3 flex items-center gap-3 border-b border-ink-700 pb-3">
        <ChampIcon
          ddragonVersion={ddragonVersion}
          championId={enemyLaner.championId ?? "?"}
          name={name}
          size={56}
          rounded="lg"
          className="ring-2 ring-gold-500/40"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-gold-400/80">Enemy toplaner</div>
          <h3 className="truncate font-display text-xl font-bold text-slate-50">{name}</h3>
          {enemyLaner.riotId && (
            <div className="truncate text-xs text-slate-500">
              {gameName}
              <span className="text-slate-600">#{tagLine}</span>
            </div>
          )}
        </div>
      </div>

      {(enemyLaner.recentForm?.length || champWr != null) && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-ink-850/60 px-3 py-2 text-xs">
          {enemyLaner.recentForm && enemyLaner.recentForm.length > 0 && (
            <div className="flex items-center gap-1">
              {enemyLaner.recentForm.map((win, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-sm ${win ? "bg-emerald-400" : "bg-red-400/80"}`} />
              ))}
              <span className="ml-1 text-slate-500">recent</span>
            </div>
          )}
          {champWr != null && (
            <div className="text-slate-400">
              <span className={champWr >= 50 ? "text-emerald-400" : "text-red-400"}>{champWr}%</span> on {name} (
              {enemyLaner.gamesOnThisChamp}g)
            </div>
          )}
        </div>
      )}

      {matchingEnemy && matchingEnemy.picks.length > 0 ? (
        <>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Your counter picks</div>
          <div className="space-y-2">
            {matchingEnemy.picks.map((pick, i) => (
              <PickRow
                key={pick.id}
                pick={pick}
                champions={champions}
                ddragonVersion={ddragonVersion}
                editMode={false}
                isFirst={i === 0}
                isLast={i === matchingEnemy.picks.length - 1}
                record={recordsForThisEnemy?.get(pick.champion)}
                onNoteChange={noop}
                onRemove={noop}
                onMove={noop}
              />
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={onQuickAdd}
          className="mb-1 w-full rounded-xl border border-dashed border-ink-600 py-2.5 text-sm font-medium text-slate-400 transition-all hover:border-gold-500/50 hover:text-gold-400 active:scale-[0.98]"
        >
          + Add {name} to your matchup guide
        </button>
      )}

      {recordsForThisEnemy && recordsForThisEnemy.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(recordsForThisEnemy.entries())
            .filter(([champ]) => !matchingEnemy?.picks.some((p) => p.champion === champ))
            .map(([champ, record]) => (
              <div
                key={champ}
                className="flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850/60 py-1 pl-1 pr-2 text-xs text-slate-400"
              >
                <ChampIcon ddragonVersion={ddragonVersion} championId={champ} size={18} rounded="full" />
                {champions.find((c) => c.id === champ)?.name ?? champ}
                <WinLossBadge wins={record.wins} losses={record.losses} />
              </div>
            ))}
        </div>
      )}

      {links && (
        <div className="mt-4 flex gap-2 border-t border-ink-800 pt-3">
          {[
            { label: "op.gg", href: links.opgg },
            { label: "u.gg", href: links.ugg },
            { label: "lolalytics", href: links.lolalytics },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg border border-ink-700 py-1.5 text-center text-xs font-medium text-slate-400 transition-all hover:border-hextech-500/50 hover:text-hextech-400 active:scale-95"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
