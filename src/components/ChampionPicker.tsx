import { useEffect, useMemo, useRef, useState } from "react";
import type { Champion } from "../lib/types";
import { fuzzySearchChampions } from "../lib/champions";
import ChampIcon from "./ChampIcon";

interface ChampionPickerProps {
  champions: Champion[];
  ddragonVersion: string | null;
  excludeIds?: Set<string>;
  priorityIds?: Set<string>; // shown first, e.g. champs already in "my pool"
  placeholder?: string;
  onSelect: (championId: string) => void;
  onClose: () => void;
  autoFocus?: boolean;
  dropDirection?: "down" | "up";
}

export default function ChampionPicker({
  champions,
  ddragonVersion,
  excludeIds,
  priorityIds,
  placeholder = "Search champion…",
  onSelect,
  onClose,
  autoFocus = true,
  dropDirection = "down",
}: ChampionPickerProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const available = useMemo(
    () => (excludeIds ? champions.filter((c) => !excludeIds.has(c.id)) : champions),
    [champions, excludeIds]
  );

  const results = useMemo(() => {
    const matched = fuzzySearchChampions(available, query);
    if (!query.trim() && priorityIds && priorityIds.size > 0) {
      const priority = matched.filter((c) => priorityIds.has(c.id));
      const rest = matched.filter((c) => !priorityIds.has(c.id));
      return [...priority, ...rest];
    }
    return matched;
  }, [available, query, priorityIds]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.children[highlight] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight];
      if (pick) onSelect(pick.id);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`absolute z-30 w-72 origin-top animate-scale-in overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/60 ${
        dropDirection === "up" ? "bottom-full left-0 mb-2 origin-bottom" : "mt-2"
      }`}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border-b border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <div ref={listRef} className="scrollbar-thin max-h-72 overflow-y-auto py-1">
        {results.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-slate-500">No champion found</div>
        )}
        {results.map((c, i) => (
          <button
            key={c.id}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-100 ${
              i === highlight ? "bg-gold-500/15 text-gold-400" : "text-slate-300"
            }`}
          >
            <ChampIcon ddragonVersion={ddragonVersion} championId={c.id} name={c.name} size={24} rounded="md" />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
