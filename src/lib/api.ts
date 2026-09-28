import type { Arena, ChampionsResponse, LiveState, MatchupsData, Profile, Settings, SettingsInput } from "./types";

export async function fetchMatchups(): Promise<MatchupsData> {
  const res = await fetch("/api/matchups");
  if (!res.ok) throw new Error("Failed to load matchups");
  return res.json();
}

/** `keepalive` lets the request outlive a closing page (used when flushing on exit). */
export async function saveMatchups(data: MatchupsData, keepalive = false): Promise<void> {
  const res = await fetch("/api/matchups", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive,
  });
  if (!res.ok) throw new Error("Failed to save matchups");
}

export async function fetchChampions(): Promise<ChampionsResponse> {
  const res = await fetch("/api/champions");
  if (!res.ok) throw new Error("Failed to load champions");
  return res.json();
}

export async function fetchProfile(refresh = false): Promise<Profile> {
  const res = await fetch(`/api/profile${refresh ? "?refresh=1" : ""}`);
  // the profile endpoint returns 200 or 502, but the body is always a
  // Profile-shaped object (with .error set on failure) — read it either way
  return res.json();
}

export async function fetchArena(refresh = false): Promise<Arena> {
  const res = await fetch(`/api/arena${refresh ? "?refresh=1" : ""}`);
  return res.json();
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function saveSettings(input: SettingsInput): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to save settings");
  return body;
}

/** Subscribes to live game state (champ select / loading / in-game) via SSE. Returns an unsubscribe function. */
export function subscribeLive(onState: (state: LiveState) => void): () => void {
  const source = new EventSource("/api/live/events");
  source.onmessage = (event) => {
    try {
      onState(JSON.parse(event.data));
    } catch {
      // ignore malformed/heartbeat frames
    }
  };
  return () => source.close();
}

export async function overrideChampSelectEnemyLaner(cellId: number): Promise<void> {
  await fetch("/api/live/champselect-override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cellId }),
  });
}

export async function overrideGameEnemyLaner(puuid: string): Promise<void> {
  await fetch("/api/live/game-override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puuid }),
  });
}
