import { useEffect, useState } from "react";

/**
 * Like useState, but persisted to localStorage under `key` so it survives
 * reloads. Safe in private-browsing/blocked-storage contexts — falls back
 * to plain in-memory state if localStorage throws.
 */
export function useStickyState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore (private mode, quota, etc.) — state still works in-memory
    }
  }, [key, value]);

  return [value, setValue] as const;
}
