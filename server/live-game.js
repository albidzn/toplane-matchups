import { EventEmitter } from "node:events";
import { createLcuConnector } from "./lcu.js";
import { getLiveClientData } from "./liveclient.js";
import { createRiotClient, RiotApiError } from "./riot.js";
import { guessEnemyPositions, linkSpectatorParticipants, applyLiveClientPositions } from "./lane.js";

const LCU_POLL_MS = 2000;
const LIVECLIENT_POLL_MS = 3000;
const ENEMY_DEEPDIVE_GAMES = 6; // recent games fetched for the highlighted enemy laner

// Perk sub-style (rune tree) icons — a small fixed set, no need to fetch the full perk tree.
const RUNE_TREE_ICON = {
  8000: "perk-images/Styles/7201_Precision.png",
  8100: "perk-images/Styles/7200_Domination.png",
  8200: "perk-images/Styles/7202_Sorcery.png",
  8300: "perk-images/Styles/7203_Whimsy.png",
  8400: "perk-images/Styles/7204_Resolve.png",
};
const CDRAGON_PERK_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/";

function runeTreeIcon(styleId) {
  const path = RUNE_TREE_ICON[styleId];
  return path ? `${CDRAGON_PERK_BASE}${path}` : null;
}

function mapLeagueEntry(entries, queueType) {
  const e = entries?.find((x) => x.queueType === queueType);
  if (!e) return null;
  return { tier: e.tier, rank: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses };
}

export function createLiveGameService({ dataDir: _dataDir, getChampions }) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);

  const lcu = createLcuConnector();
  let pollTimer = null;
  let liveClientTimer = null;
  let stopped = false;

  let state = { phase: "idle", lcuConnected: false, champSelect: null, game: null, updatedAt: Date.now() };
  let lastEnrichedGameId = null;
  let cachedPuuid = null;
  let liveClientCache = null;

  // manual corrections, in case the lane guess is wrong — cleared whenever a new
  // champ select / game session starts so a stale override can't leak into the next game
  let cellOverride = null; // champ select: cellId the user says is actually the enemy top
  let puuidOverride = null; // loading/in-progress: puuid the user says is actually the enemy top

  function applyCellOverride(enemyCells) {
    if (cellOverride == null || !enemyCells.some((c) => c.cellId === cellOverride)) return enemyCells;
    return enemyCells.map((c) => ({ ...c, position: c.cellId === cellOverride ? "TOP" : c.position === "TOP" ? null : c.position }));
  }

  function applyPuuidOverride(roster, myTeamId) {
    if (puuidOverride == null) return roster;
    const target = roster.find((r) => r.puuid === puuidOverride && r.teamId !== myTeamId);
    if (!target) return roster;
    return roster.map((r) => {
      if (r.puuid === target.puuid) return { ...r, position: "TOP", positionConfirmed: true };
      if (r.teamId !== myTeamId && r.position === "TOP") return { ...r, position: null };
      return r;
    });
  }

  function setState(patch) {
    state = { ...state, ...patch, updatedAt: Date.now() };
    emitter.emit("state", state);
  }

  function reset() {
    cachedPuuid = null;
    lastEnrichedGameId = null;
    liveClientCache = null;
    cellOverride = null;
    puuidOverride = null;
  }

  async function resolvePuuid() {
    if (cachedPuuid) return cachedPuuid;
    const apiKey = process.env.RIOT_API_KEY;
    const riotId = process.env.RIOT_ID;
    const platform = process.env.RIOT_PLATFORM || "euw1";
    if (!apiKey || !riotId) return null;
    const [gameName, tagLine] = riotId.split("#");
    if (!gameName || !tagLine) return null;

    const client = createRiotClient({ apiKey, platform });
    const account = await client.getAccountByRiotId(gameName, tagLine);
    cachedPuuid = account.puuid;
    return cachedPuuid;
  }

  function championIdOf(champions, numericId) {
    return champions.find((c) => c.key === String(numericId))?.id ?? null;
  }

  async function buildEnemyDeepDive(client, champions, puuid, championKey) {
    try {
      const matchIds = await client.getMatchIds(puuid, ENEMY_DEEPDIVE_GAMES);
      const matches = [];
      for (const id of matchIds) {
        const match = await client.getMatch(id);
        const me = match?.info?.participants?.find((p) => p.puuid === puuid);
        if (!me) continue;
        matches.push({
          win: Boolean(me.win),
          champion: championIdOf(champions, me.championId),
          remake: Boolean(me.gameEndedInEarlySurrender) || (match.info.gameDuration ?? 0) < 300,
        });
      }
      const real = matches.filter((m) => !m.remake);
      const onThisChamp = real.filter((m) => m.champion === championKey);
      return {
        recentForm: real.map((m) => m.win),
        gamesOnThisChamp: onThisChamp.length,
        winsOnThisChamp: onThisChamp.filter((m) => m.win).length,
      };
    } catch {
      return null;
    }
  }

  async function enrichParticipant(client, champions, p) {
    const [entries, mastery] = await Promise.all([
      client.getLeagueEntriesByPuuid(p.puuid).catch(() => null),
      client.getMasteryByChampion(p.puuid, p.championId).catch(() => null),
    ]);
    return {
      puuid: p.puuid,
      riotId: p.riotId ?? null,
      teamId: p.teamId,
      championId: championIdOf(champions, p.championId),
      position: p.position ?? null,
      positionConfirmed: Boolean(p.positionConfirmed),
      profileIconId: p.profileIconId,
      spell1Id: p.spell1Id,
      spell2Id: p.spell2Id,
      runeTreeIcon: runeTreeIcon(p.perks?.perkStyle),
      runeSubTreeIcon: runeTreeIcon(p.perks?.perkSubStyle),
      rankSolo: mapLeagueEntry(entries, "RANKED_SOLO_5x5"),
      masteryLevel: mastery?.championLevel ?? null,
      masteryPoints: mastery?.championPoints ?? null,
    };
  }

  async function enrichGame(spectatorGame, enemyGuesses, myPuuid, myTeamPositionsByPuuid) {
    const apiKey = process.env.RIOT_API_KEY;
    const platform = process.env.RIOT_PLATFORM || "euw1";
    if (!apiKey) return;

    const client = createRiotClient({ apiKey, platform });
    const champions = (await getChampions()).champions;

    const myTeamId = spectatorGame.participants.find((p) => p.puuid === myPuuid)?.teamId;
    const myTeamPuuids = new Set(
      spectatorGame.participants.filter((p) => p.teamId === myTeamId).map((p) => p.puuid)
    );

    const linked = linkSpectatorParticipants(enemyGuesses, spectatorGame.participants, myTeamPuuids);
    const enemyPositioned = new Map(
      linked.filter((c) => c.participant).map((c) => [c.participant.puuid, c.position])
    );

    const rosterBeforeOverride = await Promise.all(
      spectatorGame.participants.map(async (p) => {
        // our own team's position is known for certain (champ-select assignedPosition);
        // the enemy team's is only ever a guess, refined later by the Live Client API.
        const position = myTeamPositionsByPuuid?.get(p.puuid) ?? enemyPositioned.get(p.puuid) ?? null;
        const positionConfirmed = myTeamPositionsByPuuid?.has(p.puuid) ?? false;
        return enrichParticipant(client, champions, { ...p, position, positionConfirmed });
      })
    );
    const roster = applyPuuidOverride(rosterBeforeOverride, myTeamId);

    const enemyTop = roster.find((r) => r.teamId !== myTeamId && r.position === "TOP");
    let enemyLaner = enemyTop ? { ...enemyTop } : null;
    if (enemyLaner) {
      const deepDive = await buildEnemyDeepDive(client, champions, enemyLaner.puuid, enemyLaner.championId);
      enemyLaner = { ...enemyLaner, ...deepDive };
    }

    setState({
      game: {
        gameId: spectatorGame.gameId,
        queueId: spectatorGame.gameQueueConfigId,
        startedAt: spectatorGame.gameStartTime,
        myTeamId,
        roster,
        enemyLaner,
      },
    });
  }

  async function pollLiveClient() {
    const data = await getLiveClientData();
    if (!data?.allPlayers?.length) return;
    liveClientCache = data.allPlayers;
    if (!state.game) return;

    const myTeamId = state.game.myTeamId;
    const positioned = applyPuuidOverride(
      applyLiveClientPositions(state.game.roster.map((r) => ({ ...r })), liveClientCache),
      myTeamId
    );
    const changed = positioned.some((r, i) => r.position !== state.game.roster[i].position);
    if (!changed) return;

    const enemyTop = positioned.find((r) => r.teamId !== myTeamId && r.position === "TOP");
    const isNewEnemyLaner = enemyTop && enemyTop.puuid !== state.game.enemyLaner?.puuid;
    const enemyLaner = enemyTop ? { ...state.game.enemyLaner, ...enemyTop } : state.game.enemyLaner;

    setState({ game: { ...state.game, roster: positioned, enemyLaner } });

    // The champ-select guess was wrong or unavailable — Live Client just told us
    // who's really top for the enemy team, so fetch their deep-dive now.
    if (isNewEnemyLaner) fetchAndMergeDeepDive(enemyTop.puuid, enemyTop.championId).catch(() => {});
  }

  /** Fetches the enemy laner's recent-games deep dive and merges it in, if they're still the current enemy laner by the time it resolves. */
  async function fetchAndMergeDeepDive(targetPuuid, championId) {
    const apiKey = process.env.RIOT_API_KEY;
    const platform = process.env.RIOT_PLATFORM || "euw1";
    if (!apiKey) return;
    const client = createRiotClient({ apiKey, platform });
    const champions = (await getChampions()).champions;
    const deepDive = await buildEnemyDeepDive(client, champions, targetPuuid, championId);
    if (!deepDive || state.game?.enemyLaner?.puuid !== targetPuuid) return;
    setState({ game: { ...state.game, enemyLaner: { ...state.game.enemyLaner, ...deepDive } } });
  }

  async function tick() {
    if (stopped) return;
    const connected = await lcu.ensureConnected();
    if (state.lcuConnected !== connected) setState({ lcuConnected: connected });

    if (!connected) {
      if (state.phase !== "idle") setState({ phase: "idle", champSelect: null, game: null });
      cellOverride = null;
      puuidOverride = null;
      return;
    }

    try {
      const phase = await lcu.get("/lol-gameflow/v1/gameflow-phase");

      if (phase === "ChampSelect") {
        if (state.phase !== "champselect") cellOverride = null; // fresh champ select session
        const session = await lcu.get("/lol-champ-select/v1/session");
        if (session) {
          const enemy = applyCellOverride(guessEnemyPositions(session.theirTeam, session.myTeam));
          setState({
            phase: "champselect",
            game: null,
            champSelect: {
              localPlayerCellId: session.localPlayerCellId,
              myTeam: session.myTeam.map((p) => ({
                cellId: p.cellId,
                championId: p.championId,
                assignedPosition: p.assignedPosition || null,
                puuid: p.puuid || null,
              })),
              enemy,
              bans: {
                mine: session.bans?.myTeamBans ?? [],
                theirs: session.bans?.theirTeamBans ?? [],
              },
            },
          });
        }
        return;
      }

      if (phase === "GameStart" || phase === "InProgress" || phase === "Reconnect") {
        if (state.phase !== "loading" && state.phase !== "in-progress") {
          setState({ phase: "loading", champSelect: null });
        }

        const puuid = await resolvePuuid();
        if (!puuid) return;

        const apiKey = process.env.RIOT_API_KEY;
        if (!apiKey) return;
        const platform = process.env.RIOT_PLATFORM || "euw1";
        const client = createRiotClient({ apiKey, platform });

        let spectatorGame;
        try {
          spectatorGame = await client.getActiveGameByPuuid(puuid);
        } catch (err) {
          if (err instanceof RiotApiError) return; // rate limited / transient — try again next tick
          throw err;
        }
        if (!spectatorGame) return; // spectator feed not ready yet

        if (lastEnrichedGameId !== spectatorGame.gameId) {
          lastEnrichedGameId = spectatorGame.gameId;
          puuidOverride = null; // fresh game — don't carry a correction over from a previous one
          const prevChampSelect = state.champSelect;
          const enemyGuesses = prevChampSelect?.enemy ?? [];
          const myTeamPositionsByPuuid = new Map(
            (prevChampSelect?.myTeam ?? [])
              .filter((p) => p.puuid && p.assignedPosition)
              .map((p) => [p.puuid, p.assignedPosition.toUpperCase()])
          );
          enrichGame(spectatorGame, enemyGuesses, puuid, myTeamPositionsByPuuid).catch((err) =>
            console.warn("Live game enrichment failed:", err.message)
          );
        }

        if (state.phase !== "in-progress" && state.game) setState({ phase: "in-progress" });
        return;
      }

      // any other phase (None, Lobby, Matchmaking, ReadyCheck, WaitingForStats, PreEndOfGame, EndOfGame, ...)
      if (state.phase !== "idle") {
        setState({ phase: "idle", champSelect: null, game: null });
        cellOverride = null;
        puuidOverride = null;
      }
    } catch (err) {
      console.warn("Live game poll failed:", err.message);
    }
  }

  function start() {
    stopped = false;
    pollTimer = setInterval(tick, LCU_POLL_MS);
    liveClientTimer = setInterval(() => pollLiveClient().catch(() => {}), LIVECLIENT_POLL_MS);
    tick();
  }

  function stop() {
    stopped = true;
    clearInterval(pollTimer);
    clearInterval(liveClientTimer);
  }

  /** Manual correction during champ select: "actually, *this* locked champion is the enemy top". */
  function setChampSelectOverride(cellId) {
    cellOverride = cellId;
    if (!state.champSelect) return;
    const enemy = applyCellOverride(guessEnemyPositions(state.champSelect.enemy, state.champSelect.myTeam));
    setState({ champSelect: { ...state.champSelect, enemy } });
  }

  /** Manual correction once the game is live: "actually, *this* player is the enemy top". */
  function setGameOverride(puuid) {
    puuidOverride = puuid;
    if (!state.game) return;
    const roster = applyPuuidOverride(state.game.roster, state.game.myTeamId);
    const enemyTop = roster.find((r) => r.teamId !== state.game.myTeamId && r.position === "TOP");
    if (!enemyTop) return;
    const isNewEnemyLaner = enemyTop.puuid !== state.game.enemyLaner?.puuid;
    const enemyLaner = { ...state.game.enemyLaner, ...enemyTop };
    setState({ game: { ...state.game, roster, enemyLaner } });
    if (isNewEnemyLaner) fetchAndMergeDeepDive(enemyTop.puuid, enemyTop.championId).catch(() => {});
  }

  return {
    start,
    stop,
    reset,
    getState: () => state,
    setChampSelectOverride,
    setGameOverride,
    subscribe: (cb) => {
      emitter.on("state", cb);
      return () => emitter.off("state", cb);
    },
  };
}
