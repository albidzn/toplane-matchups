import { winrate } from "../../lib/profile";

interface WinLossBadgeProps {
  wins: number;
  losses: number;
  className?: string;
}

export default function WinLossBadge({ wins, losses, className = "" }: WinLossBadgeProps) {
  const total = wins + losses;
  if (total === 0) return null;
  const wr = winrate(wins, losses);
  const good = wr >= 50;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
        good
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25"
          : "bg-red-500/10 text-red-400 ring-red-500/25"
      } ${className}`}
    >
      {wins}W {losses}L <span className="opacity-70">· {wr}%</span>
    </span>
  );
}
