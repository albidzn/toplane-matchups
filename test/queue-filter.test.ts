import { describe, it, expect } from "vitest";
import { filterByQueue, matchesQueueFilter, shortQueueName } from "../src/lib/queue-filter";
import { championStatsByQueue } from "../server/profile-stats.js";

const m = (queueId: number, champion = "Sett", win = true) => ({
  queueId,
  champion,
  win,
  remake: false,
  kills: 1,
  deaths: 1,
  assists: 1,
  cs: 100,
  durationSec: 1800,
  opponent: null,
});

describe("queue filter", () => {
  it("keeps everything for 'all'", () => {
    const list = [m(420), m(440), m(400)];
    expect(filterByQueue(list, "all")).toHaveLength(3);
  });

  it("filters solo/duo (420) and flex (440)", () => {
    const list = [m(420), m(440), m(420), m(400)];
    expect(filterByQueue(list, "solo")).toHaveLength(2);
    expect(filterByQueue(list, "flex")).toHaveLength(1);
    expect(matchesQueueFilter(400, "solo")).toBe(false);
  });

  it("names queues compactly", () => {
    expect(shortQueueName(420)).toBe("Solo/Duo");
    expect(shortQueueName(440)).toBe("Flex");
    expect(shortQueueName(999)).toBe("Other");
  });
});

describe("championStatsByQueue", () => {
  it("splits champion stats by ranked queue", () => {
    const stats = championStatsByQueue([m(420, "Sett"), m(420, "Sett", false), m(440, "Garen"), m(400, "Ornn")]);
    expect(stats.solo).toHaveLength(1);
    expect(stats.solo[0]).toMatchObject({ champion: "Sett", games: 2, wins: 1 });
    expect(stats.flex.map((c: { champion: string }) => c.champion)).toEqual(["Garen"]);
  });
});
