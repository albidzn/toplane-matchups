import { QUEUE_FILTER_LABEL, type QueueFilter } from "../../lib/queue-filter";

interface QueueFilterTabsProps {
  value: QueueFilter;
  onChange: (value: QueueFilter) => void;
}

const OPTIONS: QueueFilter[] = ["all", "solo", "flex"];

export default function QueueFilterTabs({ value, onChange }: QueueFilterTabsProps) {
  return (
    <div role="tablist" aria-label="Queue filter" className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-850 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95 ${
            value === option ? "bg-gold-500/20 text-gold-400" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {QUEUE_FILTER_LABEL[option]}
        </button>
      ))}
    </div>
  );
}
