interface ProfileSetupProps {
  onOpenSettings: () => void;
}

export default function ProfileSetup({ onOpenSettings }: ProfileSetupProps) {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 text-center">
      <div className="text-4xl opacity-30">🎮</div>
      <h2 className="font-display text-lg font-semibold text-slate-200">Connect your Riot account</h2>
      <p className="text-sm text-slate-500">
        Show your rank, recent games and your personal matchup record right here next to the game.
      </p>

      <ol className="w-full space-y-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-5 text-left text-sm text-slate-300">
        <li className="flex gap-3">
          <span className="shrink-0 font-display font-bold text-gold-400">1.</span>
          <span>
            Create a key at{" "}
            <a
              className="text-hextech-400 underline decoration-hextech-500/40 underline-offset-2 hover:text-hextech-300"
              href="https://developer.riotgames.com"
              target="_blank"
              rel="noreferrer"
            >
              developer.riotgames.com
            </a>
            . A <strong className="text-slate-100">Personal API Key</strong> (approved app) is best — it
            doesn't expire. A raw dev key works too, but expires every 24h.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-display font-bold text-gold-400">2.</span>
          <span>Enter the key, your Riot ID (e.g. Name#EUW) and your server in the settings.</span>
        </li>
      </ol>

      <button
        onClick={onOpenSettings}
        className="rounded-lg bg-gold-500 px-5 py-2 text-sm font-semibold text-ink-950 transition-all duration-150 hover:bg-gold-400 active:scale-95"
      >
        Open settings
      </button>
    </div>
  );
}
