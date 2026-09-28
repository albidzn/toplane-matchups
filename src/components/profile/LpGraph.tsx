import { useId, useMemo } from "react";
import type { LpSnapshot } from "../../lib/types";
import { buildLpSeries, lpAxisLabel } from "../../lib/lp";
import { rankLabel } from "../../lib/profile";

interface LpGraphProps {
  history: LpSnapshot[];
  days?: number;
}

const W = 320;
const H = 132;
const PAD = { left: 34, right: 8, top: 8, bottom: 20 };

export default function LpGraph({ history, days = 30 }: LpGraphProps) {
  const gradId = useId();
  const now = history.length ? Math.max(Date.now(), history[history.length - 1].t) : Date.now();
  const series = useMemo(() => buildLpSeries(history, now, days), [history, now, days]);

  if (!series) {
    return (
      <div className="mt-3 border-t border-ink-800 pt-3 text-xs text-slate-500">
        LP history starts now — the graph fills in as your LP changes.
      </div>
    );
  }

  const start = now - days * 24 * 60 * 60 * 1000;
  const yMin = Math.floor(series.min / 100) * 100;
  const yMax = Math.max(Math.ceil(series.max / 100) * 100, yMin + 100);
  const step = yMax - yMin <= 500 ? 100 : 400;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax; v += step) ticks.push(v);

  const x = (t: number) => PAD.left + ((t - start) / (now - start)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  // LP only changes when a game ends, so draw it as a step line: flat, then a jump.
  let line = `M ${x(series.points[0].t)} ${y(series.points[0].value)}`;
  for (let i = 1; i < series.points.length; i++) {
    line += ` H ${x(series.points[i].t)} V ${y(series.points[i].value)}`;
  }
  const last = series.points[series.points.length - 1];
  line += ` H ${x(now)}`;
  const area = `${line} V ${y(yMin)} H ${x(series.points[0].t)} Z`;

  const up = series.delta >= 0;
  const xLabels = [
    { t: start, text: `-${days}d` },
    { t: start + (now - start) / 2, text: `-${Math.round(days / 2)}d` },
    { t: now, text: "now" },
  ];

  return (
    <div className="mt-3 border-t border-ink-800 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Last {days}d</span>
          <span className={`rounded bg-ink-800 px-1.5 py-0.5 font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "▲" : "▼"} {Math.abs(Math.round(series.delta))} LP
          </span>
        </div>
        <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-slate-400">
          Peak: <span className="font-semibold text-slate-200">{rankLabel(series.peak)} · {series.peak.lp} LP</span>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full text-hextech-400" role="img" aria-label={`LP over the last ${days} days`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-ink-700" strokeDasharray="2 3" />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-500 text-[9px]">
              {lpAxisLabel(v)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={x(now)} cy={y(last.value)} r="3" className="fill-gold-400" />

        {xLabels.map((l, i) => (
          <text
            key={l.text}
            x={x(l.t)}
            y={H - 5}
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
            className="fill-slate-500 text-[9px]"
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
