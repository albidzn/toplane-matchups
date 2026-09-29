import { useEffect, useRef, useState } from "react";
import { fetchSettings, saveSettings } from "../lib/api";
import { desktop, type DesktopInfo } from "../lib/desktop";
import { useDesktopUpdate } from "../hooks/useDesktopUpdate";
import type { Settings } from "../lib/types";

interface SettingsModalProps {
  onClose: () => void;
  /** Called after Riot settings were saved, so the profile can be reloaded. */
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500/40";

export default function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState("euw1");
  const [apiKey, setApiKey] = useState("");
  const [arenaSeasonStart, setArenaSeasonStart] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [info, setInfo] = useState<DesktopInfo | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setRiotId(s.riotId);
        setPlatform(s.platform);
        setArenaSeasonStart(s.arenaSeasonStart);
      })
      .catch(() => setError("Could not load settings."));
    desktop?.getInfo().then(setInfo).catch(() => {});
  }, []);

  useEffect(() => {
    firstField.current?.focus();
  }, [settings]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await saveSettings({ riotId, platform, apiKey, arenaSeasonStart });
      setSettings(next);
      setApiKey("");
      setSaved(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleOnTop(value: boolean) {
    if (!desktop) return;
    const result = await desktop.setAlwaysOnTop(value);
    setInfo((prev) => (prev ? { ...prev, alwaysOnTop: result } : prev));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="scrollbar-thin max-h-full w-full max-w-md animate-scale-in overflow-y-auto rounded-2xl border border-ink-600 bg-ink-850 p-5 shadow-2xl shadow-black/60">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-ink-700 hover:text-slate-200 active:scale-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Riot account</div>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Riot ID</span>
            <input
              ref={firstField}
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="GameName#TAG"
              spellCheck={false}
              autoComplete="off"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Server</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
              {(settings?.platforms ?? [platform]).map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>API key</span>
              {settings?.hasKey && <span className="text-emerald-400">✓ saved</span>}
            </span>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasKey ? "Leave empty to keep the saved key" : "RGAPI-…"}
                spellCheck={false}
                autoComplete="off"
                className={`${inputClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <span className="mt-1 block text-[11px] text-slate-600">
              Get one at developer.riotgames.com. It stays on this computer and is never shown again.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Arena season start override (optional)</span>
            <input
              type="date"
              value={arenaSeasonStart}
              onChange={(e) => setArenaSeasonStart(e.target.value)}
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-slate-600">
              The Arena tab already auto-detects the current season from a built-in schedule and
              scopes your win count to it, matching the in-game Arena Season Journey. Only set this
              if that date looks wrong.
            </span>
          </label>

          {error && (
            <div className="animate-fade-slide-up rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          {saved && !error && (
            <div className="animate-fade-slide-up rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              Saved — refreshing your profile…
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-all duration-150 hover:bg-gold-400 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>

        {desktop && (
          <div className="mt-5 space-y-3 border-t border-ink-700 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Window</div>
            <label className="flex cursor-pointer items-center justify-between text-sm text-slate-300">
              Keep window on top
              <input
                type="checkbox"
                checked={info?.alwaysOnTop ?? false}
                onChange={(e) => toggleOnTop(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-800 accent-gold-500"
              />
            </label>
            <button
              type="button"
              onClick={() => desktop?.openDataFolder()}
              className="text-xs text-hextech-400 underline decoration-hextech-500/40 underline-offset-2 hover:text-hextech-300"
            >
              Open data folder
            </button>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>
                Updates
                {info && <span className="ml-1.5 text-[11px] text-slate-600">v{info.version}</span>}
              </span>
              <UpdateControl />
            </div>
          </div>
        )}

        <p className="mt-5 border-t border-ink-800 pt-3 text-[10px] leading-relaxed text-slate-600">
          Toplane Matchups isn't endorsed by Riot Games and doesn't reflect the views or opinions of
          Riot Games or anyone officially involved in producing or managing League of Legends. League
          of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </div>
  );
}

function UpdateControl() {
  const { state, install } = useDesktopUpdate();

  if (state.status === "ready") {
    return (
      <button
        type="button"
        onClick={install}
        className="rounded-lg bg-hextech-500/15 px-2.5 py-1 text-xs font-semibold text-hextech-400 transition-all hover:bg-hextech-500/25 active:scale-95"
      >
        Restart to install v{state.version}
      </button>
    );
  }

  if (state.status === "checking") {
    return <span className="text-xs text-slate-500">Checking…</span>;
  }
  if (state.status === "downloading") {
    return <span className="text-xs text-slate-500">Downloading{state.percent ? ` (${state.percent}%)` : "…"}</span>;
  }
  if (state.status === "not-available") {
    return <span className="text-xs text-emerald-400">Up to date</span>;
  }

  return (
    <button
      type="button"
      onClick={() => desktop?.checkForUpdates()}
      className="text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
    >
      Check for updates
    </button>
  );
}
