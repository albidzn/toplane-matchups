// Fixture driver for the Live tab, used when LIVE_MOCK is set. Cycles
// through champselect -> loading -> in-progress -> idle on a timer so the
// UI can be built/tested without a real League client or match running.
import { EventEmitter } from "node:events";
import { runeTreeIcon } from "./live-game.js";

const RUNE_STYLES = [8000, 8100, 8200, 8300, 8400];

const MY_TEAM_CHAMPS = ["Sett", "LeeSin", "Ahri", "Jinx", "Thresh"];
const ENEMY_CHAMPS = ["Darius", "Skarner", "Syndra", "Caitlyn", "Nautilus"]; // cellId 5=top .. 9=support
const POSITIONS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const BAN_POOL = ["Yone", "Zed", "Akali", "Vayne", "KSante", "Kayn", "Azir", "Kalista"];
const ITEM_POOL = [1001, 1055, 3071, 3068, 3044, 3153, 3742, 2003]; // boots, components, a couple of finished items

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function createMockLiveGameService({ getChampions }) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  let state = { phase: "idle", lcuConnected: true, champSelect: null, game: null, updatedAt: Date.now() };
  let timers = [];
  let championsById = null;

  function setState(patch) {
    state = { ...state, ...patch, updatedAt: Date.now() };
    emitter.emit("state", state);
  }

  function after(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function keyOf(id) {
    return Number(championsById.get(id)?.key ?? 0);
  }

  function runCycle() {
    const rand = seededRandom(7);

    // --- champ select: bans, then picks trickle in over ~12s ---
    setState({
      phase: "champselect",
      game: null,
      champSelect: {
        localPlayerCellId: 0,
        myTeam: MY_TEAM_CHAMPS.map((id, i) => ({
          cellId: i,
          championId: 0,
          assignedPosition: POSITIONS[i].toLowerCase(),
          puuid: `mock-me-${i}`,
        })),
        enemy: ENEMY_CHAMPS.map((_, i) => ({ cellId: 5 + i, championId: 0, position: POSITIONS[i] })),
        bans: { mine: [], theirs: [] },
      },
    });

    after(1500, () =>
      setState({
        champSelect: {
          ...state.champSelect,
          bans: {
            mine: BAN_POOL.slice(0, 3).map(keyOf),
            theirs: BAN_POOL.slice(3, 5).map(keyOf),
          },
        },
      })
    );

    MY_TEAM_CHAMPS.forEach((id, i) => {
      after(3000 + i * 900, () =>
        setState({
          champSelect: {
            ...state.champSelect,
            myTeam: state.champSelect.myTeam.map((p, pi) => (pi === i ? { ...p, championId: keyOf(id) } : p)),
          },
        })
      );
    });
    ENEMY_CHAMPS.forEach((id, i) => {
      after(3800 + i * 1100, () =>
        setState({
          champSelect: {
            ...state.champSelect,
            enemy: state.champSelect.enemy.map((c, ci) => (ci === i ? { ...c, championId: keyOf(id) } : c)),
          },
        })
      );
    });

    // --- loading screen: full 10-player roster appears ---
    after(12000, () => {
      const roster = [...MY_TEAM_CHAMPS, ...ENEMY_CHAMPS].map((id, i) => {
        const isMine = i < 5;
        const games = 20 + Math.floor(rand() * 80);
        const wins = Math.floor(games * (0.45 + rand() * 0.15));
        return {
          puuid: isMine ? `mock-me-${i}` : `mock-enemy-${i - 5}`,
          riotId: isMine ? `Ally${i}#EUW` : `Enemy${i - 5}#EUW`,
          teamId: isMine ? 100 : 200,
          championId: id,
          position: POSITIONS[i % 5],
          positionConfirmed: isMine,
          profileIconId: 29 + i,
          spell1Id: 4,
          spell2Id: isMine ? 6 : 14,
          runeTreeIcon: runeTreeIcon(RUNE_STYLES[i % RUNE_STYLES.length]),
          runeSubTreeIcon: runeTreeIcon(RUNE_STYLES[(i + 2) % RUNE_STYLES.length]),
          rankSolo: { tier: "GOLD", rank: "II", lp: 30 + i, wins, losses: games - wins },
          masteryLevel: Math.min(7, 1 + Math.floor(rand() * 7)),
          masteryPoints: Math.floor(rand() * 200000),
          level: null,
          kills: null,
          deaths: null,
          assists: null,
          cs: null,
          items: [],
          isDead: false,
        };
      });
      const enemyLaner = {
        ...roster.find((r) => r.teamId === 200 && r.position === "TOP"),
        recentForm: Array.from({ length: 6 }, () => rand() > 0.45),
        gamesOnThisChamp: 4,
        winsOnThisChamp: 2,
      };
      setState({
        phase: "loading",
        champSelect: null,
        game: { gameId: 1, queueId: 420, startedAt: Date.now(), myTeamId: 100, roster, enemyLaner },
      });
    });

    after(17000, () => setState({ phase: "in-progress" }));

    // --- live scoreboard: level/KDA/CS/items tick up a few times while "in-progress" ---
    [18500, 22000, 25500].forEach((delay, tickIndex) => {
      after(delay, () => {
        if (!state.game) return;
        const minute = tickIndex + 1;
        const roster = state.game.roster.map((r, i) => {
          const isMine = r.teamId === 100;
          const skill = isMine ? 0.55 : 0.45; // my team's slightly ahead, for a believable enemy-laner card
          return {
            ...r,
            level: Math.min(18, 3 + minute * 2 + (i % 2)),
            kills: Math.floor(rand() * minute * skill * 2),
            deaths: Math.floor(rand() * minute * (1 - skill) * 1.5),
            assists: Math.floor(rand() * minute * 1.5),
            cs: Math.round(minute * (26 + rand() * 4)),
            items: ITEM_POOL.slice(0, Math.min(ITEM_POOL.length, 1 + minute)),
            isDead: false,
          };
        });
        const enemyLaner = { ...state.game.enemyLaner, ...roster.find((r) => r.puuid === state.game.enemyLaner?.puuid) };
        setState({ game: { ...state.game, roster, enemyLaner } });
      });
    });

    after(26000, () => {
      if (!state.game) return;
      setState({ game: { ...state.game, result: "Win" } });
    });
    after(27000, () => setState({ phase: "postgame" }));

    after(34000, () => setState({ phase: "idle", champSelect: null, game: null }));
    after(39000, runCycle); // loop, so the tab auto-switch is easy to re-observe
  }

  return {
    async start() {
      championsById = new Map((await getChampions()).champions.map((c) => [c.id, c]));
      after(1500, runCycle);
    },
    stop: clearTimers,
    reset: () => {},
    getState: () => state,
    setChampSelectOverride(cellId) {
      if (!state.champSelect) return;
      setState({
        champSelect: {
          ...state.champSelect,
          enemy: state.champSelect.enemy.map((c) => ({
            ...c,
            position: c.cellId === cellId ? "TOP" : c.position === "TOP" ? null : c.position,
          })),
        },
      });
    },
    setGameOverride(puuid) {
      if (!state.game) return;
      const roster = state.game.roster.map((r) => ({
        ...r,
        position: r.puuid === puuid ? "TOP" : r.teamId !== state.game.myTeamId && r.position === "TOP" ? null : r.position,
      }));
      const enemyLaner = { ...state.game.enemyLaner, ...roster.find((r) => r.puuid === puuid) };
      setState({ game: { ...state.game, roster, enemyLaner } });
    },
    subscribe: (cb) => {
      emitter.on("state", cb);
      return () => emitter.off("state", cb);
    },
  };
}
