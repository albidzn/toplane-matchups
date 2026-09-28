import type { Champion, Profile } from "../../lib/types";
import { profileIconUrl } from "../../lib/champions";
import { formatRelativeTime } from "../../lib/profile";
import { filterByQueue, type QueueFilter } from "../../lib/queue-filter";
import { useStickyState } from "../../hooks/useStickyState";
import RemoteImg from "./RemoteImg";
import ProfileSetup from "./ProfileSetup";
import RankCard from "./RankCard";
import SummaryCard from "./SummaryCard";
import ChampionStats from "./ChampionStats";
import MatchList from "./MatchList";
import QueueFilterTabs from "./QueueFilterTabs";

interface ProfileViewProps {
  profile: Profile | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  champions: Champion[];
  ddragonVersion: string | null;
  poolIds: Set<string>;
  onOpenSettings: () => void;
}

export default function ProfileView({
  profile,
  loading,
  refreshing,
  onRefresh,
  champions,
  ddragonVersion,
  poolIds,
  onOpenSettings,
}: ProfileViewProps) {
  const [queue, setQueue] = useStickyState<QueueFilter>("lm.profile.queue", "all");

  if (loading && !profile) {
    return (
      <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 text-slate-500">
        <svg className="h-6 w-6 animate-spin text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z" />
        </svg>
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  if (!profile || !profile.configured) {
    return (
      <div className="h-full animate-fade-in">
        <ProfileSetup onOpenSettings={onOpenSettings} />
      </div>
    );
  }

  const history = profile.history ?? profile.recent ?? [];
  const filteredHistory = filterByQueue(history, queue);
  const championStats =
    queue === "all" ? (profile.championStats ?? []) : (profile.championStatsByQueue?.[queue] ?? profile.championStats ?? []);

  return (
    <div className="scrollbar-thin h-full animate-fade-in overflow-y-auto pr-1">
      {/* Hero */}
      <div className="mb-4 flex animate-fade-slide-up flex-wrap items-center gap-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-4">
        {profile.account && ddragonVersion && (
          <div className="relative shrink-0">
            <RemoteImg
              src={profileIconUrl(ddragonVersion, profile.account.profileIconId)}
              alt=""
              className="h-16 w-16 rounded-2xl ring-2 ring-ink-600"
              fallback={<div className="h-16 w-16 rounded-2xl bg-ink-800" />}
            />
            <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-ink-950 px-1.5 py-0.5 text-[10px] font-bold text-gold-400 ring-1 ring-gold-500/40">
              {profile.account.level}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {profile.account && (
            <h2 className="truncate font-display text-lg font-bold text-slate-100">
              {profile.account.gameName} <span className="text-slate-500">#{profile.account.tagLine}</span>
            </h2>
          )}
          <div className="text-xs text-slate-500">Updated {formatRelativeTime(profile.updatedAt)}</div>
        </div>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-850 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-gold-500/50 hover:text-gold-400 active:scale-95 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {profile.error && (
        <div className="mb-4 animate-fade-slide-up rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {profile.error.message}
        </div>
      )}

      <div className="mb-3 flex animate-fade-slide-up items-center justify-between gap-3 [animation-delay:20ms]">
        <QueueFilterTabs value={queue} onChange={setQueue} />
      </div>

      <div
        className={`mb-4 grid animate-fade-slide-up grid-cols-1 gap-3 [animation-delay:40ms] ${queue === "all" ? "sm:grid-cols-2" : ""}`}
      >
        {queue !== "flex" && (
          <RankCard title="Ranked Solo/Duo" entry={profile.ranked?.solo} history={profile.lpHistory?.solo ?? []}
            peak={profile.lpHistory?.peak?.solo}
            apexCutoffs={profile.apexCutoffs}
          />
        )}
        {queue !== "solo" && <RankCard title="Ranked Flex" entry={profile.ranked?.flex} />}
      </div>

      <div className="space-y-4 pb-2">
        <SummaryCard recent={filteredHistory.slice(0, 20)} champions={champions} ddragonVersion={ddragonVersion} />
        <MatchList matches={filteredHistory} champions={champions} ddragonVersion={ddragonVersion} />
        <ChampionStats
          championStats={championStats}
          mastery={profile.mastery ?? []}
          poolIds={poolIds}
          champions={champions}
          ddragonVersion={ddragonVersion}
        />
      </div>
    </div>
  );
}
