import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMatchups, saveMatchups } from "../lib/api";
import type { Enemy, MatchupsData, Pick } from "../lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function uid(): string {
  return crypto.randomUUID();
}

export function useMatchups() {
  const [data, setData] = useState<MatchupsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef<MatchupsData | null>(null);

  useEffect(() => {
    fetchMatchups()
      .then((d) => {
        setData(d);
        latestData.current = d;
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const performSave = useCallback(async (keepalive = false) => {
    saveTimer.current = null;
    if (!latestData.current) return;
    try {
      await saveMatchups(latestData.current, keepalive);
      setSaveStatus("saved");
      // quietly fade the indicator back out once the save has settled
      savedFadeTimer.current = setTimeout(() => setSaveStatus("idle"), 2200);
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const scheduleSave = useCallback(
    (next: MatchupsData) => {
      latestData.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(() => performSave(), 500);
    },
    [performSave]
  );

  // Don't sit on an unsaved edit when the window is closed or hidden:
  // write it out right away instead of waiting for the debounce.
  useEffect(() => {
    function flush() {
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      performSave(true);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [performSave]);

  const mutate = useCallback(
    (fn: (prev: MatchupsData) => MatchupsData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // ---- enemy operations ----

  const addEnemy = useCallback(
    (championId: string) => {
      mutate((prev) => {
        if (prev.enemies.some((e) => e.champion === championId)) return prev;
        const enemy: Enemy = { id: uid(), champion: championId, picks: [] };
        return { ...prev, enemies: [...prev.enemies, enemy] };
      });
    },
    [mutate]
  );

  const removeEnemy = useCallback(
    (enemyId: string) => {
      mutate((prev) => ({
        ...prev,
        enemies: prev.enemies.filter((e) => e.id !== enemyId),
      }));
    },
    [mutate]
  );

  // ---- pick operations ----

  const addPick = useCallback(
    (enemyId: string, championId: string) => {
      mutate((prev) => ({
        ...prev,
        enemies: prev.enemies.map((e) =>
          e.id === enemyId
            ? { ...e, picks: [...e.picks, { id: uid(), champion: championId, note: "" }] }
            : e
        ),
      }));
    },
    [mutate]
  );

  const updatePickNote = useCallback(
    (enemyId: string, pickId: string, note: string) => {
      mutate((prev) => ({
        ...prev,
        enemies: prev.enemies.map((e) =>
          e.id === enemyId
            ? {
                ...e,
                picks: e.picks.map((p: Pick) => (p.id === pickId ? { ...p, note } : p)),
              }
            : e
        ),
      }));
    },
    [mutate]
  );

  const removePick = useCallback(
    (enemyId: string, pickId: string) => {
      mutate((prev) => ({
        ...prev,
        enemies: prev.enemies.map((e) =>
          e.id === enemyId ? { ...e, picks: e.picks.filter((p) => p.id !== pickId) } : e
        ),
      }));
    },
    [mutate]
  );

  const movePick = useCallback(
    (enemyId: string, pickId: string, direction: -1 | 1) => {
      mutate((prev) => ({
        ...prev,
        enemies: prev.enemies.map((e) => {
          if (e.id !== enemyId) return e;
          const idx = e.picks.findIndex((p) => p.id === pickId);
          const newIdx = idx + direction;
          if (idx === -1 || newIdx < 0 || newIdx >= e.picks.length) return e;
          const picks = [...e.picks];
          [picks[idx], picks[newIdx]] = [picks[newIdx], picks[idx]];
          return { ...e, picks };
        }),
      }));
    },
    [mutate]
  );

  // ---- derived: my pool (reverse lookup) ----

  const pool = useMemo(() => {
    if (!data) return new Map<string, { enemyId: string; enemyChampion: string; note: string }[]>();
    const map = new Map<string, { enemyId: string; enemyChampion: string; note: string }[]>();
    for (const enemy of data.enemies) {
      for (const pick of enemy.picks) {
        const list = map.get(pick.champion) ?? [];
        list.push({ enemyId: enemy.id, enemyChampion: enemy.champion, note: pick.note });
        map.set(pick.champion, list);
      }
    }
    return map;
  }, [data]);

  return {
    data,
    loading,
    loadError,
    saveStatus,
    pool,
    addEnemy,
    removeEnemy,
    addPick,
    updatePickNote,
    removePick,
    movePick,
  };
}
