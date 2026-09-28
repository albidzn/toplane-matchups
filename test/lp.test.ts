import { describe, it, expect } from "vitest";
import { absoluteLp, apexProgress, buildLpSeries, lpAxisLabel, tierBands, tierOfAbsolute } from "../src/lib/lp";
import { appendSnapshot, updatePeak, absoluteLp as serverAbsoluteLp } from "../server/lp-history.js";
import type { LpSnapshot } from "../src/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const snap = (daysAgo: number, tier: string, rank: string, lp: number): LpSnapshot => ({
  t: NOW - daysAgo * DAY,
  tier,
  rank,
  lp,
});

describe("absoluteLp", () => {
  it("orders tiers and divisions on one axis", () => {
    expect(absoluteLp({ tier: "IRON", rank: "IV", lp: 0 })).toBe(0);
    expect(absoluteLp({ tier: "GOLD", rank: "IV", lp: 0 })).toBe(1200);
    expect(absoluteLp({ tier: "GOLD", rank: "II", lp: 45 })).toBe(1445);
    expect(absoluteLp({ tier: "DIAMOND", rank: "I", lp: 99 })).toBe(2799);
  });

  it("treats Master and above as one continuous ladder above Diamond", () => {
    expect(absoluteLp({ tier: "MASTER", rank: "I", lp: 6 })).toBe(2806);
    expect(absoluteLp({ tier: "CHALLENGER", rank: "I", lp: 500 })).toBe(3300);
  });
});

describe("lpAxisLabel", () => {
  it("labels divisions with tier initial and number", () => {
    expect(lpAxisLabel(1200)).toBe("G4");
    expect(lpAxisLabel(1500)).toBe("G1");
    expect(lpAxisLabel(2400)).toBe("D4");
  });

  it("labels apex LP", () => {
    expect(lpAxisLabel(2800)).toBe("M");
    expect(lpAxisLabel(2950)).toBe("M 150");
  });
});

describe("buildLpSeries", () => {
  it("returns null until there are two snapshots", () => {
    expect(buildLpSeries([], NOW)).toBeNull();
    expect(buildLpSeries([snap(1, "GOLD", "II", 10)], NOW)).toBeNull();
  });

  it("computes delta and peak across a division change", () => {
    const s = buildLpSeries(
      [snap(10, "GOLD", "II", 90), snap(5, "GOLD", "I", 20), snap(2, "GOLD", "I", 10)],
      NOW
    )!;
    expect(s.delta).toBe(1510 - 1490);
    expect(s.peak).toMatchObject({ rank: "I", lp: 20 });
  });

  it("anchors the window start to the last snapshot before it", () => {
    const s = buildLpSeries([snap(50, "GOLD", "III", 50), snap(5, "GOLD", "III", 80)], NOW, 30)!;
    expect(s.points[0]).toEqual({ t: NOW - 30 * DAY, value: 1350 });
    expect(s.delta).toBe(30);
  });

  it("ignores snapshots older than the window when nothing else anchors them", () => {
    const s = buildLpSeries([snap(20, "GOLD", "III", 50), snap(3, "GOLD", "III", 60)], NOW, 30)!;
    expect(s.points).toHaveLength(2);
    expect(s.min).toBe(1350);
    expect(s.max).toBe(1360);
  });
});

describe("appendSnapshot", () => {
  const entry = { tier: "GOLD", rank: "II", lp: 45 };

  it("adds the first snapshot", () => {
    expect(appendSnapshot([], entry, NOW)).toEqual([{ t: NOW, ...entry }]);
  });

  it("skips a snapshot identical to the last one", () => {
    const list = [{ t: NOW - 1000, ...entry }];
    expect(appendSnapshot(list, entry, NOW)).toHaveLength(1);
  });

  it("appends when LP changed", () => {
    const list = [{ t: NOW - 1000, ...entry }];
    expect(appendSnapshot(list, { ...entry, lp: 60 }, NOW)).toHaveLength(2);
  });

  it("drops entries older than the retention window and tolerates unranked", () => {
    const old = { t: NOW - 400 * DAY, ...entry };
    expect(appendSnapshot([old], undefined, NOW)).toEqual([]);
  });
});

describe("updatePeak", () => {
  const master325 = { t: 1, tier: "MASTER", rank: "I", lp: 325 };

  it("keeps a higher stored peak even when current snapshots are lower", () => {
    const peak = updatePeak(master325, [{ t: 5, tier: "MASTER", rank: "I", lp: 6 }]);
    expect(peak).toBe(master325);
  });

  it("raises the peak when a snapshot beats it, across tiers", () => {
    const peak = updatePeak({ t: 1, tier: "DIAMOND", rank: "I", lp: 99 }, [{ t: 5, tier: "MASTER", rank: "I", lp: 0 }]);
    expect(peak).toMatchObject({ tier: "MASTER", lp: 0 });
  });

  it("returns null with no data at all", () => {
    expect(updatePeak(null, [])).toBeNull();
  });

  it("uses the same ladder math as the frontend", () => {
    for (const s of [
      { tier: "IRON", rank: "IV", lp: 0 },
      { tier: "GOLD", rank: "II", lp: 45 },
      { tier: "DIAMOND", rank: "I", lp: 99 },
      { tier: "MASTER", rank: "I", lp: 325 },
    ]) {
      expect(serverAbsoluteLp(s)).toBe(absoluteLp(s));
    }
  });
});

describe("apexProgress", () => {
  const cutoffs = { grandmaster: 1719, challenger: 2312 };

  it("Master runs from 0 to the GM cutoff", () => {
    const p = apexProgress({ tier: "MASTER", lp: 6 }, cutoffs)!;
    expect(p.lower).toEqual({ label: "M", lp: 0 });
    expect(p.upper).toEqual({ label: "GM", lp: 1719 });
    expect(p.fraction).toBeCloseTo(6 / 1719);
  });

  it("Grandmaster runs from the GM to the Challenger cutoff", () => {
    const p = apexProgress({ tier: "GRANDMASTER", lp: 2000 }, cutoffs)!;
    expect(p.lower.lp).toBe(1719);
    expect(p.fraction).toBeCloseTo((2000 - 1719) / (2312 - 1719));
  });

  it("Challenger has no upper bound", () => {
    const p = apexProgress({ tier: "CHALLENGER", lp: 2500 }, cutoffs)!;
    expect(p.upper).toBeNull();
    expect(p.fraction).toBeNull();
  });

  it("clamps the marker inside the bar", () => {
    expect(apexProgress({ tier: "MASTER", lp: 5000 }, cutoffs)!.fraction).toBe(1);
  });

  it("returns null for non-apex tiers or missing cutoffs", () => {
    expect(apexProgress({ tier: "DIAMOND", lp: 50 }, cutoffs)).toBeNull();
    expect(apexProgress({ tier: "MASTER", lp: 50 }, null)).toBeNull();
    expect(apexProgress({ tier: "GRANDMASTER", lp: 50 }, { grandmaster: null, challenger: 2312 })).toBeNull();
  });
});

describe("tier colouring", () => {
  it("maps absolute LP to tiers", () => {
    expect(tierOfAbsolute(0)).toBe("IRON");
    expect(tierOfAbsolute(2655)).toBe("DIAMOND");
    expect(tierOfAbsolute(2806)).toBe("MASTER");
  });

  it("splits apex LP at the GM and Challenger cutoffs", () => {
    const cutoffs = { grandmaster: 1714, challenger: 2323 };
    expect(tierOfAbsolute(2800 + 1000, cutoffs)).toBe("MASTER");
    expect(tierOfAbsolute(2800 + 1714, cutoffs)).toBe("GRANDMASTER");
    expect(tierOfAbsolute(2800 + 2400, cutoffs)).toBe("CHALLENGER");
  });

  it("builds contiguous bands from Diamond into Master", () => {
    const bands = tierBands(2655, 2900);
    expect(bands).toEqual([
      { tier: "DIAMOND", from: 2655, to: 2800 },
      { tier: "MASTER", from: 2800, to: 2900 },
    ]);
  });

  it("returns a single band inside one tier", () => {
    expect(tierBands(1210, 1390)).toEqual([{ tier: "GOLD", from: 1210, to: 1390 }]);
  });
});
