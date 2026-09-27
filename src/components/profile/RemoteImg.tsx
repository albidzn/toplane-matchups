import { useState } from "react";

interface RemoteImgProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/** <img> that swaps to a fallback node on load error, e.g. for CDN assets that might 404. */
export default function RemoteImg({ src, alt, className = "", fallback = null }: RemoteImgProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (errored) return <>{fallback}</>;
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
