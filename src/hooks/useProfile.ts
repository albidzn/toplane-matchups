import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchProfile } from "../lib/api";
import type { Profile } from "../lib/types";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export interface WinLoss {
  wins: number;
  losses: number;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
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
      const p = await fetchProfile(refresh);
      if (mounted.current) setProfile(p);
    } catch {
      if (mounted.current) {
        setProfile(
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

  // enemyChampionId -> myChampionId -> { wins, losses }
  const recordsByEnemy = useMemo(() => {
    const map = new Map<string, Map<string, WinLoss>>();
    for (const m of profile?.matchups ?? []) {
      let byMine = map.get(m.enemyChampion);
      if (!byMine) {
        byMine = new Map();
        map.set(m.enemyChampion, byMine);
      }
      byMine.set(m.myChampion, { wins: m.wins, losses: m.losses });
    }
    return map;
  }, [profile]);

  return { profile, loading, refreshing, refresh, recordsByEnemy };
}
