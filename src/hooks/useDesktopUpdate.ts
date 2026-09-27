import { useEffect, useState } from "react";
import { desktop, type UpdateState } from "../lib/desktop";

const IDLE: UpdateState = { status: "idle" };

/** Tracks electron-updater's state; a no-op (always idle) outside the desktop app. */
export function useDesktopUpdate() {
  const [state, setState] = useState<UpdateState>(IDLE);

  useEffect(() => {
    if (!desktop) return;
    desktop.getUpdateState().then(setState).catch(() => {});
    return desktop.onUpdateState(setState);
  }, []);

  return {
    state,
    install: () => desktop?.installUpdate(),
  };
}
