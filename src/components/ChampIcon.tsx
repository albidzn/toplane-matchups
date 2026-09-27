import { useState } from "react";
import { championIconUrl } from "../lib/champions";

interface ChampIconProps {
  ddragonVersion: string | null;
  championId: string;
  name?: string;
  size?: number;
  rounded?: "full" | "lg" | "md";
  className?: string;
}

const roundedMap = {
  full: "rounded-full",
  lg: "rounded-xl",
  md: "rounded-lg",
};

export default function ChampIcon({
  ddragonVersion,
  championId,
  name,
  size = 40,
  rounded = "lg",
  className = "",
}: ChampIconProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const label = name ?? championId;
  const initial = label.charAt(0).toUpperCase();
  const showImg = Boolean(ddragonVersion) && !errored;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${roundedMap[rounded]} ring-1 ring-ink-600/60 bg-ink-800 ${className}`}
      style={{ width: size, height: size }}
      title={label}
    >
      {/* Letter fallback sits underneath so there's never a blank box while the
          icon is still loading — the image just fades in on top once it's ready. */}
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-850 font-display font-bold text-gold-500"
        style={{ fontSize: size * 0.4 }}
      >
        {initial}
      </div>
      {showImg && (
        <img
          src={championIconUrl(ddragonVersion!, championId)}
          alt={label}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
