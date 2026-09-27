import { describe, it, expect } from "vitest";
import {
  guessTheirPositionsByCell,
  guessEnemyPositions,
  linkSpectatorParticipants,
  applyLiveClientPositions,
} from "../server/lane.js";

const standardMyTeam = [
  { cellId: 0, assignedPosition: "top" },
  { cellId: 1, assignedPosition: "jungle" },
  { cellId: 2, assignedPosition: "middle" },
  { cellId: 3, assignedPosition: "bottom" },
  { cellId: 4, assignedPosition: "utility" },
];

describe("guessTheirPositionsByCell", () => {
  it("maps the other team's cell block (5-9) when our cells are in standard order", () => {
    const map = guessTheirPositionsByCell(standardMyTeam);
    expect(map).not.toBeNull();
    expect(map.get(5)).toBe("TOP");
    expect(map.get(6)).toBe("JUNGLE");
    expect(map.get(9)).toBe("UTILITY");
  });

  it("maps the 0-4 block when our own cells are 5-9", () => {
    const mirrored = standardMyTeam.map((p) => ({ ...p, cellId: p.cellId + 5 }));
    const map = guessTheirPositionsByCell(mirrored);
    expect(map.get(0)).toBe("TOP");
    expect(map.get(4)).toBe("UTILITY");
  });

  it("returns null when fewer than 5 teammates have an assigned position (blind pick etc.)", () => {
    expect(guessTheirPositionsByCell(standardMyTeam.slice(0, 3))).toBeNull();
  });

  it("returns null when positions aren't in the standard order", () => {
    const shuffled = [
      { cellId: 0, assignedPosition: "jungle" },
      { cellId: 1, assignedPosition: "top" },
      { cellId: 2, assignedPosition: "middle" },
      { cellId: 3, assignedPosition: "bottom" },
      { cellId: 4, assignedPosition: "utility" },
    ];
    expect(guessTheirPositionsByCell(shuffled)).toBeNull();
  });

  it("returns null with no data at all", () => {
    expect(guessTheirPositionsByCell([])).toBeNull();
    expect(guessTheirPositionsByCell(undefined)).toBeNull();
  });
});

describe("guessEnemyPositions", () => {
  it("attaches a guessed position to each enemy cell", () => {
    const theirTeam = [
      { cellId: 5, championId: 266 },
      { cellId: 6, championId: 64 },
    ];
    const result = guessEnemyPositions(theirTeam, standardMyTeam);
    expect(result[0]).toMatchObject({ cellId: 5, championId: 266, position: "TOP" });
    expect(result[1]).toMatchObject({ cellId: 6, championId: 64, position: "JUNGLE" });
  });

  it("leaves position null when the guess isn't confident", () => {
    const result = guessEnemyPositions([{ cellId: 5, championId: 266 }], []);
    expect(result[0].position).toBeNull();
  });
});

describe("linkSpectatorParticipants", () => {
  it("matches enemy cells to spectator participants by championId, excluding our own team", () => {
    const enemyCells = [{ cellId: 5, championId: 266, position: "TOP" }];
    const spectatorParticipants = [
      { puuid: "me", championId: 1 },
      { puuid: "enemy-top", championId: 266 },
    ];
    const linked = linkSpectatorParticipants(enemyCells, spectatorParticipants, new Set(["me"]));
    expect(linked[0].participant).toMatchObject({ puuid: "enemy-top" });
  });

  it("leaves participant null when no championId match is found", () => {
    const linked = linkSpectatorParticipants([{ cellId: 5, championId: 999 }], [], new Set());
    expect(linked[0].participant).toBeNull();
  });
});

describe("applyLiveClientPositions", () => {
  it("confirms a participant's position by matching riotId case-insensitively", () => {
    const participants = [{ riotId: "Albi#113", position: "TOP" }];
    const liveClientPlayers = [{ riotIdGameName: "albi", riotIdTagLine: "113", position: "JUNGLE" }];
    const result = applyLiveClientPositions(participants, liveClientPlayers);
    expect(result[0]).toMatchObject({ position: "JUNGLE", positionConfirmed: true });
  });

  it("leaves participants untouched when there's no live client match yet", () => {
    const participants = [{ riotId: "Albi#113", position: "TOP" }];
    const result = applyLiveClientPositions(participants, [{ riotIdGameName: "Someone", riotIdTagLine: "EUW", position: "MIDDLE" }]);
    expect(result[0]).toMatchObject({ position: "TOP" });
    expect(result[0].positionConfirmed).toBeUndefined();
  });

  it("passes through unchanged when live client data isn't available yet", () => {
    const participants = [{ riotId: "Albi#113", position: "TOP" }];
    expect(applyLiveClientPositions(participants, null)).toBe(participants);
  });
});
