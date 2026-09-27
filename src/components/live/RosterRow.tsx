import type { Champion, LiveParticipant } from "../../lib/types";
import { profileIconUrl, itemIconUrl } from "../../lib/champions";
import { rankLabel, winrate } from "../../lib/profile";
import { summonerSpellIconUrl, positionLabel } from "../../lib/live";
import ChampIcon from "../ChampIcon";
import RemoteImg from "../profile/RemoteImg";

interface RosterRowProps {
  participant: LiveParticipant;
  champions: Champion[];
  ddragonVersion: string | null;
  isMe?: boolean;
  isEnemyLaner?: boolean;
  editable?: boolean;
  onPickAsEnemyLaner?: () => void;
}

export default function RosterRow({
  participant: p,
  champions,
  ddragonVersion,
  isMe,
  isEnemyLaner,
  editable,
  onPickAsEnemyLaner,
}: RosterRowProps) {
  const name = p.championId ? champions.find((c) => c.id === p.championId)?.name ?? p.championId : "—";
  const [gameName, tagLine] = (p.riotId ?? "?#?").split("#");
  const wr = p.rankSolo ? winrate(p.rankSolo.wins, p.rankSolo.losses) : null;
  const isLive = p.level != null;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
        isEnemyLaner ? "bg-gold-500/10 ring-1 ring-gold-500/30" : isMe ? "bg-hextech-500/5" : "hover:bg-ink-800/40"
      } ${p.isDead ? "opacity-50" : ""}`}
    >
      <div className="w-10 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {positionLabel(p.position) || "?"}
      </div>

      {ddragonVersion && (
        <RemoteImg
          src={profileIconUrl(ddragonVersion, p.profileIconId)}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-ink-700"
          fallback={<div className="h-6 w-6 shrink-0 rounded-full bg-ink-800" />}
        />
      )}

      <div className="relative shrink-0">
        <ChampIcon ddragonVersion={ddragonVersion} championId={p.championId ?? "?"} name={name} size={32} />
        {p.level != null && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-ink-950 px-1 text-[9px] font-bold leading-tight text-gold-400 ring-1 ring-ink-700">
            {p.level}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-200">{name}</span>
          {isMe && <span className="shrink-0 text-[10px] font-semibold uppercase text-hextech-400">You</span>}
          {p.isDead && <span className="shrink-0 text-[10px] font-semibold uppercase text-red-400">Dead</span>}
        </div>
        <div className="truncate text-xs text-slate-500">
          {gameName}
          <span className="text-slate-600">#{tagLine}</span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
        {[p.spell1Id, p.spell2Id].map((spellKey, i) => {
          const url = ddragonVersion ? summonerSpellIconUrl(ddragonVersion, spellKey) : null;
          return (
            <div key={i} className="h-5 w-5 overflow-hidden rounded bg-ink-800 ring-1 ring-ink-700">
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
            </div>
          );
        })}
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {p.runeTreeIcon && <img src={p.runeTreeIcon} alt="" className="h-5 w-5 opacity-90" />}
        {p.runeSubTreeIcon && <img src={p.runeSubTreeIcon} alt="" className="h-5 w-5 opacity-60" />}
      </div>

      {/* Rank (pre-game) or KDA/CS (once the Live Client API confirms live stats) */}
      <div className="w-20 shrink-0 text-right text-xs">
        {isLive ? (
          <>
            <div className="text-slate-300">
              {p.kills}/{p.deaths}/{p.assists}
            </div>
            <div className="text-slate-500">{p.cs} cs</div>
          </>
        ) : p.rankSolo ? (
          <>
            <div className="text-slate-300">{rankLabel(p.rankSolo)}</div>
            <div className={wr! >= 50 ? "text-emerald-400" : "text-red-400"}>
              {wr}% · {p.rankSolo.wins + p.rankSolo.losses}g
            </div>
          </>
        ) : (
          <div className="text-slate-600">Unranked</div>
        )}
      </div>

      {/* Mastery (pre-game) or item build (once live) */}
      <div className="hidden w-24 shrink-0 items-center justify-end gap-0.5 text-right text-xs text-slate-500 lg:flex">
        {isLive ? (
          p.items.length > 0 ? (
            p.items.slice(0, 6).map((itemId, i) => {
              const url = ddragonVersion ? itemIconUrl(ddragonVersion, itemId) : null;
              return (
                <div key={i} className="h-5 w-5 shrink-0 overflow-hidden rounded bg-ink-800 ring-1 ring-ink-700">
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </div>
              );
            })
          ) : (
            <span className="text-slate-700">–</span>
          )
        ) : p.masteryLevel != null ? (
          <div className="text-right">
            <div className="text-gold-400">M{p.masteryLevel}</div>
            <div>{((p.masteryPoints ?? 0) / 1000).toFixed(0)}k</div>
          </div>
        ) : (
          <span className="text-slate-700">–</span>
        )}
      </div>

      {editable && (
        <button
          onClick={onPickAsEnemyLaner}
          title="Mark as the enemy toplaner"
          className="shrink-0 rounded-lg border border-ink-700 px-2 py-1 text-[10px] font-semibold text-slate-500 transition-all hover:border-gold-500/50 hover:text-gold-400 active:scale-95"
        >
          This is top
        </button>
      )}
    </div>
  );
}
