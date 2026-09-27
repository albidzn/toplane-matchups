import { describe, it, expect } from "vitest";
import { comparePoolEntries, type PoolSortable } from "../src/lib/pool";

const names: Record<string, string> = { Sett: "Sett", Garen: "Garen", Ambessa: "Ambessa", Nasus: "Nasus" };
const nameOf = (id: string) => names[id] ?? id;

function entry(over: Partial<PoolSortable> & { championId: string }): PoolSortable {
  return { matchupCount: 1, ...over };
}

describe("comparePoolEntries", () => {
  it("sorts by matchup count descending, then name, for 'matchups'", () => {
    const list = [
      entry({ championId: "Garen", matchupCount: 2 }),
      entry({ championId: "Sett", matchupCount: 4 }),
      entry({ championId: "Ambessa", matchupCount: 4 }),
    ];
    list.sort((a, b) => comparePoolEntries(a, b, "matchups", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Ambessa", "Sett", "Garen"]);
  });

  it("sorts alphabetically for 'name'", () => {
    const list = [entry({ championId: "Sett" }), entry({ championId: "Ambessa" }), entry({ championId: "Garen" })];
    list.sort((a, b) => comparePoolEntries(a, b, "name", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Ambessa", "Garen", "Sett"]);
  });

  it("sorts by mastery points descending, undefined last", () => {
    const list = [
      entry({ championId: "Garen", mastery: { champion: "Garen", level: 5, points: 60000 } }),
      entry({ championId: "Sett", mastery: { champion: "Sett", level: 7, points: 180000 } }),
      entry({ championId: "Nasus" }),
    ];
    list.sort((a, b) => comparePoolEntries(a, b, "mastery", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Sett", "Garen", "Nasus"]);
  });

  it("sorts by winrate descending, champs with no games last (not treated as 0%)", () => {
    const list = [
      entry({ championId: "Garen", stat: { champion: "Garen", games: 5, wins: 1, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }), // 20%
      entry({ championId: "Sett", stat: { champion: "Sett", games: 5, wins: 4, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }), // 80%
      entry({ championId: "Nasus" }), // no games at all
    ];
    list.sort((a, b) => comparePoolEntries(a, b, "winrate", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Sett", "Garen", "Nasus"]);
  });

  it("treats a champion with 0 recorded games the same as no stat at all for winrate", () => {
    const list = [
      entry({ championId: "Garen", stat: { champion: "Garen", games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }),
      entry({ championId: "Sett", stat: { champion: "Sett", games: 3, wins: 2, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }),
    ];
    list.sort((a, b) => comparePoolEntries(a, b, "winrate", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Sett", "Garen"]);
  });

  it("sorts by games played descending for 'games'", () => {
    const list = [
      entry({ championId: "Garen", stat: { champion: "Garen", games: 2, wins: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }),
      entry({ championId: "Sett", stat: { champion: "Sett", games: 9, wins: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0 } }),
      entry({ championId: "Nasus" }),
    ];
    list.sort((a, b) => comparePoolEntries(a, b, "games", nameOf));
    expect(list.map((e) => e.championId)).toEqual(["Sett", "Garen", "Nasus"]);
  });
});
