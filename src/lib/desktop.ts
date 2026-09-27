export interface DesktopInfo {
  alwaysOnTop: boolean;
  dataDir: string;
  version: string;
}

export type UpdateStatus = "idle" | "checking" | "downloading" | "ready" | "not-available" | "error";

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  percent?: number;
}

/** Present only when running inside the Electron desktop shell (see electron/preload.cjs). */
export interface DesktopBridge {
  isDesktop: true;
  getInfo(): Promise<DesktopInfo>;
  setAlwaysOnTop(value: boolean): Promise<boolean>;
  openDataFolder(): Promise<void>;

  getUpdateState(): Promise<UpdateState>;
  checkForUpdates(): Promise<UpdateState>;
  installUpdate(): Promise<void>;
  /** Returns an unsubscribe function. */
  onUpdateState(callback: (state: UpdateState) => void): () => void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | undefined = typeof window !== "undefined" ? window.desktop : undefined;
