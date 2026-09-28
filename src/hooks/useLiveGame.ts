import { useEffect, useState } from "react";
import { subscribeLive } from "../lib/api";
import type { LiveState } from "../lib/types";

const IDLE: LiveState = { phase: "idle", lcuConnected: false, champSelect: null, game: null, arena: null, updatedAt: 0 };

/** Live-subscribes to champ select / loading screen / in-game state over SSE. */
export function useLiveGame() {
  const [state, setState] = useState<LiveState>(IDLE);

  useEffect(() => {
    return subscribeLive(setState);
  }, []);

  return state;
}
