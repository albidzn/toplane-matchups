interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export default function SaveIndicator({ status }: SaveIndicatorProps) {
  const config = {
    idle: { text: "", dot: "" },
    saving: { text: "Saving…", dot: "bg-gold-500 animate-pulse" },
    saved: { text: "Saved", dot: "bg-emerald-400" },
    error: { text: "Save failed", dot: "bg-red-400" },
  }[status];

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-opacity duration-300 ${
        status === "idle" ? "opacity-0" : "opacity-100"
      }`}
      aria-live="polite"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className="hidden min-[900px]:inline">{config.text}</span>
    </div>
  );
}
