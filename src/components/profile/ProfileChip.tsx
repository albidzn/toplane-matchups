import type { Profile } from "../../lib/types";
import { profileIconUrl, rankEmblemUrl } from "../../lib/champions";
import { rankLabel } from "../../lib/profile";
import RemoteImg from "./RemoteImg";

interface ProfileChipProps {
  profile: Profile | null;
  ddragonVersion: string | null;
  onClick: () => void;
}

export default function ProfileChip({ profile, ddragonVersion, onClick }: ProfileChipProps) {
  if (!profile?.configured || !profile.account) return null;

  const solo = profile.ranked?.solo;

  return (
    <button
      onClick={onClick}
      className="flex animate-fade-in items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-2 py-1.5 min-[900px]:px-2.5 transition-all duration-150 hover:border-gold-500/40 active:scale-95"
      title={`${profile.account.gameName}#${profile.account.tagLine}${solo ? ` — ${rankLabel(solo)}, ${solo.lp} LP` : ""}`}
    >
      {ddragonVersion && (
        <RemoteImg
          src={profileIconUrl(ddragonVersion, profile.account.profileIconId)}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-ink-600"
          fallback={<div className="h-6 w-6 shrink-0 rounded-full bg-ink-700" />}
        />
      )}
      {solo ? (
        <div className="flex items-center gap-1.5">
          <RemoteImg src={rankEmblemUrl(solo.tier)} alt="" className="h-5 w-5 shrink-0" />
          <span className="hidden whitespace-nowrap text-xs font-semibold text-slate-300 min-[900px]:inline">
            {rankLabel(solo)} <span className="text-slate-500">· {solo.lp} LP</span>
          </span>
        </div>
      ) : (
        <span className="hidden whitespace-nowrap text-xs text-slate-500 min-[900px]:inline">Unranked</span>
      )}
    </button>
  );
}
