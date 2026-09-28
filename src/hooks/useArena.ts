import { useCallback, useEffect, useRef, useState } from "react";
import { fetchArena } from "../lib/api";
import type { Arena } from "../lib/types";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export function useArena() {
  const [arena, setArena] = useState<Arena | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    try {
      const a = await fetchArena(refresh);
      if (mounted.current) setArena(a);
    } catch {
      if (mounted.current) {
        setArena(
          (prev) =>
            prev ?? {
              configured: true,
              error: { code: "UPSTREAM", message: "Could not reach the local server." },
              updatedAt: Date.now(),
            }
        );
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(false), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { arena, loading, refreshing, refresh };
}
