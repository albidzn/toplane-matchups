import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchChampions } from "./lib/api";
import type { Champion } from "./lib/types";
import { useMatchups } from "./hooks/useMatchups";
import { useProfile, type WinLoss } from "./hooks/useProfile";
import { useStickyState } from "./hooks/useStickyState";
import { useLiveGame } from "./hooks/useLiveGame";
import SearchBar, { type SearchBarHandle } from "./components/SearchBar";
import EnemyGrid from "./components/EnemyGrid";
import MatchupDetail from "./components/MatchupDetail";
import PoolView from "./components/PoolView";
import SaveIndicator from "./components/SaveIndicator";
import ProfileView from "./components/profile/ProfileView";
import ProfileChip from "./components/profile/ProfileChip";
import SettingsModal from "./components/SettingsModal";
import UpdateBanner from "./components/UpdateBanner";
import LiveView from "./components/live/LiveView";

type Tab = "matchups" | "pool" | "profile" | "live";

export default function App() {
  const {
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
  } = useMatchups();

  const { profile, loading: profileLoading, refreshing: profileRefreshing, refresh: refreshProfile, recordsByEnemy } =
    useProfile();

  const live = useLiveGame();

  const [champions, setChampions] = useState<Champion[]>([]);
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [champError, setChampError] = useState<string | null>(null);

  const [tab, setTab] = useStickyState<Tab>("lm.tab", "matchups");
  const [editMode, setEditMode] = useStickyState("lm.editMode", false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const searchRef = useRef<SearchBarHandle>(null);
  const preLiveTab = useRef<Tab>("matchups");
  const wasLive = useRef(false);

  // Auto-jump to the Live tab as soon as a game starts, and back to whatever
  // tab was open before once it ends (only if the user is still on Live —
  // don't yank them away if they'd already navigated elsewhere themselves).
  useEffect(() => {
    const isLive = live.phase !== "idle";
    if (isLive && !wasLive.current) {
      preLiveTab.current = tab === "live" ? "matchups" : tab;
      setTab("live");
    } else if (!isLive && wasLive.current) {
      setTab((current) => (current === "live" ? preLiveTab.current : current));
    }
    wasLive.current = isLive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.phase]);

  useEffect(() => {
    fetchChampions()
      .then((res) => {
        setChampions(res.champions);
        setDdragonVersion(res.version);
      })
      .catch((err) => setChampError(err.message));
  }, []);

  // Type anywhere -> focus search; Escape -> close the mobile detail overlay
  // (both skip while actively typing in a field or with a picker/dropdown
  // open, which handle Escape themselves and stop it from bubbling here).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "Escape" && !isTypingTarget) {
        setSelectedId(null);
        return;
      }
      if (isTypingTarget) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        setTab("matchups");
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTab]);

  const selectedEnemy = useMemo(
    () => data?.enemies.find((e) => e.id === selectedId) ?? null,
    [data, selectedId]
  );

  const poolIds = useMemo(() => new Set(pool.keys()), [pool]);

  // Aggregate every champ's record vs each enemy into one W/L per enemy,
  // for the quick-glance badge on each grid card.
  const aggregateRecordsByEnemy = useMemo(() => {
    const out = new Map<string, WinLoss>();
    for (const [enemyChamp, byMine] of recordsByEnemy) {
      let wins = 0;
      let losses = 0;
      for (const rec of byMine.values()) {
        wins += rec.wins;
        losses += rec.losses;
      }
      out.set(enemyChamp, { wins, losses });
    }
    return out;
  }, [recordsByEnemy]);

  const handleSelectEnemy = useCallback((id: string) => {
    setSelectedId(id);
    setTab("matchups");
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen animate-fade-in flex-col items-center justify-center gap-3 text-slate-500">
        <svg className="h-6 w-6 animate-spin text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z" />
        </svg>
        <span className="text-sm">Loading matchups…</span>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex h-screen animate-fade-in flex-col items-center justify-center gap-2 text-center">
        <p className="text-red-400">Failed to load matchup data.</p>
        <p className="text-sm text-slate-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pt-4">
      {/* Top bar */}
      <header className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5">
          <div className="hidden h-9 w-9 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-400 min-[900px]:flex">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 3.5v6c0 4.4-3 7.5-7 8.5-4-1-7-4.1-7-8.5v-6L12 3z" />
            </svg>
          </div>
          <h1 className="hidden font-display text-lg font-bold tracking-wide text-slate-100 min-[1100px]:block">
            Toplane <span className="text-gold-400">Matchups</span>
          </h1>
        </div>

        <SearchBar
          ref={searchRef}
          enemies={data.enemies}
          champions={champions}
          ddragonVersion={ddragonVersion}
          onSelect={handleSelectEnemy}
        />

        <nav className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-850 p-1">
          {(["matchups", "pool", "profile", "live"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95 min-[900px]:px-3 ${
                tab === t ? "bg-gold-500/20 text-gold-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "matchups" ? (
                "Matchups"
              ) : t === "pool" ? (
                <>
                  <span className="min-[900px]:hidden">Pool</span>
                  <span className="hidden min-[900px]:inline">My Pool</span>
                </>
              ) : t === "profile" ? (
                "Profile"
              ) : (
                <>
                  Live
                  {live.phase !== "idle" && tab !== "live" && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <ProfileChip profile={profile} ddragonVersion={ddragonVersion} onClick={() => setTab("profile")} />

        <button
          onClick={() => setEditMode((v) => !v)}
          aria-label={editMode ? "Stop editing" : "Edit"}
          title={editMode ? "Editing — click to stop" : "Edit"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95 ${
            editMode
              ? "border-hextech-500/50 bg-hextech-500/15 text-hextech-400"
              : "border-ink-700 bg-ink-850 text-slate-400 hover:text-slate-200"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span className="hidden min-[900px]:inline">{editMode ? "Editing" : "Edit"}</span>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <UpdateBanner />
          <SaveIndicator status={saveStatus} />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
            className="rounded-lg border border-ink-700 bg-ink-850 p-2 text-slate-400 transition-all duration-150 hover:border-ink-500 hover:text-slate-200 active:scale-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onSaved={refreshProfile} />}

      {champError && (
        <div className="mb-3 animate-fade-slide-up rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Could not reach Data Dragon for champion icons — using cached/offline data where possible.
        </div>
      )}

      {/* Body */}
      <main className="min-h-0 flex-1">
        {tab === "live" ? (
          <LiveView
            key="live"
            live={live}
            champions={champions}
            ddragonVersion={ddragonVersion}
            enemies={data.enemies}
            recordsByEnemy={recordsByEnemy}
            onQuickAdd={addEnemy}
          />
        ) : tab === "pool" ? (
          <PoolView
            key="pool"
            pool={pool}
            champions={champions}
            ddragonVersion={ddragonVersion}
            profile={profile}
            onSelectEnemy={handleSelectEnemy}
          />
        ) : tab === "profile" ? (
          <ProfileView
            key="profile"
            profile={profile}
            loading={profileLoading}
            refreshing={profileRefreshing}
            onRefresh={refreshProfile}
            champions={champions}
            ddragonVersion={ddragonVersion}
            poolIds={poolIds}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          <div key="matchups" className="flex h-full min-h-0 animate-fade-in flex-col gap-3 lg:flex-row lg:gap-5">
            <div className="min-h-0 flex-1">
              <EnemyGrid
                enemies={data.enemies}
                champions={champions}
                ddragonVersion={ddragonVersion}
                selectedId={selectedId}
                editMode={editMode}
                enemyRecords={aggregateRecordsByEnemy}
                onSelect={handleSelectEnemy}
                onAddEnemy={addEnemy}
              />
            </div>

            <div
              className={`min-[520px]:static min-[520px]:z-auto min-[520px]:flex min-[520px]:bg-transparent min-[520px]:p-0 min-[520px]:backdrop-blur-0 min-[520px]:animate-none min-[520px]:shrink-0 lg:max-h-none lg:w-[420px] ${
                selectedId
                  ? "fixed inset-0 z-40 flex animate-fade-in bg-ink-950/98 p-4 backdrop-blur-sm min-[520px]:h-auto min-[520px]:max-h-[55vh]"
                  : "hidden min-[520px]:h-24 lg:h-auto"
              }`}
            >
              <MatchupDetail
                enemy={selectedEnemy}
                champions={champions}
                ddragonVersion={ddragonVersion}
                poolIds={poolIds}
                editMode={editMode}
                enemyRecords={selectedEnemy ? recordsByEnemy.get(selectedEnemy.champion) : undefined}
                onClose={() => setSelectedId(null)}
                onAddPick={(championId) => selectedEnemy && addPick(selectedEnemy.id, championId)}
                onUpdateNote={(pickId, note) => selectedEnemy && updatePickNote(selectedEnemy.id, pickId, note)}
                onRemovePick={(pickId) => selectedEnemy && removePick(selectedEnemy.id, pickId)}
                onMovePick={(pickId, dir) => selectedEnemy && movePick(selectedEnemy.id, pickId, dir)}
                onRemoveEnemy={() => {
                  if (selectedEnemy) {
                    removeEnemy(selectedEnemy.id);
                    setSelectedId(null);
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
