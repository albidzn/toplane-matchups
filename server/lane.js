// Figuring out "who's the enemy toplaner" without Riot ever telling us
// directly. Riot's LCU only exposes assignedPosition for *your own* team
// (privacy), and spectator-v5 has no lane field at all. So:
//
//  1. During champ select, guess the enemy's cell->position mapping from
//     the fact that both teams' cells are laid out in the same position
//     order (true for Ranked Solo/Duo and Flex; not for blind/ARAM).
//  2. Once the match is live, the Live Client Data API (127.0.0.1:2999)
//     *does* report each player's real "position" — use it to confirm or
//     correct the champ-select guess as soon as it's available.

export const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/**
 * @param {{cellId:number, assignedPosition?:string}[]} myTeam
 * @returns {Map<number,string>|null} cellId -> position for the *other* team, or null if we can't be confident
 */
export function guessTheirPositionsByCell(myTeam) {
  const withPosition = (myTeam ?? []).filter((p) => p.assignedPosition);
  if (withPosition.length < 5) return null;

  const sorted = [...withPosition].sort((a, b) => a.cellId - b.cellId);
  const positions = sorted.slice(0, 5).map((p) => p.assignedPosition.toUpperCase());
  const isStandardOrder = POSITION_ORDER.every((pos, i) => positions[i] === pos);
  if (!isStandardOrder) return null;

  const baseCell = sorted[0].cellId; // 0 for one team's cell block, 5 for the other
  const theirBaseCell = baseCell === 0 ? 5 : 0;
  const map = new Map();
  POSITION_ORDER.forEach((pos, i) => map.set(theirBaseCell + i, pos));
  return map;
}

/**
 * Attaches a guessed `position` to each of the enemy team's champ-select
 * cells (championId 0 = not locked yet).
 * @param {{cellId:number, championId:number}[]} theirTeam
 * @param {{cellId:number, assignedPosition?:string}[]} myTeam
 */
export function guessEnemyPositions(theirTeam, myTeam) {
  const positionByCell = guessTheirPositionsByCell(myTeam);
  return (theirTeam ?? []).map((cell) => ({
    ...cell,
    position: positionByCell?.get(cell.cellId) ?? null,
  }));
}

/**
 * Links spectator-v5's real participants (puuid, riotId) onto the enemy
 * champ-select cells by matching championId — unique within one team.
 * @param {{cellId:number, championId:number, position:string|null}[]} enemyCells
 * @param {{puuid:string, championId:number, riotId?:string}[]} spectatorParticipants
 * @param {Set<string>} myTeamPuuids
 */
export function linkSpectatorParticipants(enemyCells, spectatorParticipants, myTeamPuuids) {
  const enemyParticipants = (spectatorParticipants ?? []).filter((p) => !myTeamPuuids.has(p.puuid));
  return enemyCells.map((cell) => ({
    ...cell,
    participant: enemyParticipants.find((p) => p.championId === cell.championId) ?? null,
  }));
}

/**
 * Overrides `position` with the Live Client API's authoritative value once
 * it's available, matched by Riot ID. Anything not (yet) confirmed keeps
 * its earlier guess untouched.
 * @param {{riotId?:string, position:string|null}[]} participants
 * @param {{riotIdGameName:string, riotIdTagLine:string, position:string}[]|null} liveClientPlayers
 */
export function applyLiveClientPositions(participants, liveClientPlayers) {
  if (!liveClientPlayers?.length) return participants;
  const byRiotId = new Map(
    liveClientPlayers
      .filter((p) => p.position)
      .map((p) => [`${p.riotIdGameName}#${p.riotIdTagLine}`.toLowerCase(), p.position])
  );
  return participants.map((p) => {
    const confirmed = p.riotId ? byRiotId.get(p.riotId.toLowerCase()) : undefined;
    return confirmed ? { ...p, position: confirmed, positionConfirmed: true } : p;
  });
}
