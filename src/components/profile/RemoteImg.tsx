import { useState } from "react";

interface RemoteImgProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/** <img> that shows `fallback` (if given) while loading and swaps to it permanently on error. */
export default function RemoteImg({ src, alt, className = "", fallback = null }: RemoteImgProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset if a component instance gets reused for a different `src` later
  // (e.g. the same list slot showing a different player/champion over
  // time) — otherwise a stale error/loaded flag from the old src sticks.
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setErrored(false);
    setLoaded(false);
  }

  if (errored) return <>{fallback}</>;

  // No fallback to show underneath — keep the old (simpler) behaviour.
  if (!fallback) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && fallback}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
