import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Champion, Enemy } from "../lib/types";
import { fuzzyScore } from "../lib/champions";
import ChampIcon from "./ChampIcon";

export interface SearchBarHandle {
  focus: () => void;
}

interface SearchBarProps {
  enemies: Enemy[];
  champions: Champion[];
  ddragonVersion: string | null;
  onSelect: (enemyId: string) => void;
}

interface Candidate {
  enemy: Enemy;
  name: string;
  score: number;
}

const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  { enemies, champions, ddragonVersion, onSelect },
  ref
) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      setOpen(true);
    },
  }));

  const nameFor = useMemo(() => {
    const map = new Map(champions.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [champions]);

  const results: Candidate[] = useMemo(() => {
    if (!query.trim()) return [];
    const scored: Candidate[] = [];
    for (const enemy of enemies) {
      const name = nameFor(enemy.champion);
      const score = fuzzyScore(query, name);
      if (score !== null) scored.push({ enemy, name, score });
    }
    scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    return scored.slice(0, 8);
  }, [enemies, query, nameFor]);

  useEffect(() => setHighlight(0), [query]);

  function select(candidate: Candidate | undefined) {
    if (!candidate) return;
    onSelect(candidate.enemy.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[highlight]);
    }
  }

  return (
    <div className="relative min-w-[120px] max-w-md flex-1">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search enemy champion…"
          className="w-full rounded-lg border border-ink-600 bg-ink-850 py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/30 transition-colors focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500/40"
        />
      </div>

      {open && results.length > 0 && (
        <div className="scrollbar-thin absolute z-30 mt-1.5 max-h-80 w-full origin-top animate-scale-in overflow-y-auto rounded-lg border border-ink-600 bg-ink-850 py-1 shadow-2xl shadow-black/60">
          {results.map((r, i) => (
            <button
              key={r.enemy.id}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(r)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-100 ${
                i === highlight ? "bg-gold-500/15 text-gold-400" : "text-slate-300"
              }`}
            >
              <ChampIcon ddragonVersion={ddragonVersion} championId={r.enemy.champion} name={r.name} size={26} rounded="md" />
              <span className="truncate">{r.name}</span>
              {r.enemy.picks.length > 0 && (
                <span className="ml-auto shrink-0 text-xs text-slate-500">{r.enemy.picks.length} pick{r.enemy.picks.length > 1 ? "s" : ""}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default SearchBar;
