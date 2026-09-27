import { useDesktopUpdate } from "../hooks/useDesktopUpdate";

/** Small pill in the header; only ever shows once an update has actually finished downloading. */
export default function UpdateBanner() {
  const { state, install } = useDesktopUpdate();

  if (state.status !== "ready") return null;

  return (
    <button
      onClick={install}
      title={`Version ${state.version ?? ""} downloaded — click to restart and install`}
      className="flex animate-fade-in items-center gap-1.5 rounded-lg border border-hextech-500/40 bg-hextech-500/10 px-2.5 py-1.5 text-xs font-semibold text-hextech-400 transition-all duration-150 hover:bg-hextech-500/20 active:scale-95"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span className="hidden min-[900px]:inline">Update ready</span>
    </button>
  );
}
