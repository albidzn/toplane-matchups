export interface Pick {
  id: string;
  champion: string; // Data Dragon champion ID, e.g. "DrMundo"
  note: string;
}

export interface Enemy {
  id: string;
  champion: string; // Data Dragon champion ID
  picks: Pick[];
}

export interface MatchupsData {
  version: number;
  enemies: Enemy[];
}

export interface Champion {
  id: string; // Data Dragon ID
  name: string; // Display name
  key: string; // numeric champion id, as a string (matches Riot's other APIs)
}

export interface ChampionsResponse {
  version: string;
  champions: Champion[];
}

// ---------- Profile ----------

export interface RankedEntry {
  tier: string; // "GOLD", "SILVER", ...
  rank: string; // "I".."IV"
  lp: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface MatchOpponent {
  champion: string;
}

export interface MatchSummary {
  matchId: string;
  queueId: number;
  gameEnd: number; // epoch ms
  durationSec: number;
  champion: string;
  position: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  items: number[];
  opponent: MatchOpponent | null;
  remake: boolean;
}

export interface FormSummary {
  games: number;
  wins: number;
  avgKda: number;
  avgCsPerMin: number;
}

export interface ChampionStat {
  champion: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
}

export interface MatchupRecord {
  myChampion: string;
  enemyChampion: string;
  wins: number;
  losses: number;
}

export interface MasteryEntry {
  champion: string;
  level: number;
  points: number;
}

export interface ProfileAccount {
  gameName: string;
  tagLine: string;
  level: number;
  profileIconId: number;
}

export type ProfileErrorCode = "NOT_CONFIGURED" | "INVALID_KEY" | "NOT_FOUND" | "RATE_LIMITED" | "UPSTREAM";

export interface ProfileError {
  code: ProfileErrorCode;
  message: string;
}

export interface Profile {
  configured: boolean;
  error?: ProfileError;
  updatedAt: number;
  account?: ProfileAccount;
  ranked?: { solo?: RankedEntry; flex?: RankedEntry };
  mastery?: MasteryEntry[];
  recent?: MatchSummary[];
  form?: FormSummary;
  championStats?: ChampionStat[];
  matchups?: MatchupRecord[];
}

// ---------- Settings ----------

export interface Settings {
  riotId: string;
  platform: string;
  /** Whether an API key is saved. The key itself is never sent to the browser. */
  hasKey: boolean;
  platforms: string[];
}

export interface SettingsInput {
  riotId?: string;
  platform?: string;
  apiKey?: string;
}

// ---------- Live game ----------

export type LivePhase = "idle" | "champselect" | "loading" | "in-progress";

export interface ChampSelectSlot {
  cellId: number;
  championId: number; // Data Dragon numeric key, or 0 = not locked yet
  assignedPosition?: string | null;
  puuid?: string | null;
}

export interface ChampSelectEnemySlot {
  cellId: number;
  championId: number;
  position: string | null; // guessed lane, e.g. "TOP" — may be null if unconfident
}

export interface ChampSelectState {
  localPlayerCellId: number;
  myTeam: ChampSelectSlot[];
  enemy: ChampSelectEnemySlot[];
  bans: { mine: number[]; theirs: number[] };
}

export interface LiveParticipant {
  puuid: string;
  riotId: string | null;
  teamId: number;
  championId: string | null; // Data Dragon id, already resolved server-side
  position: string | null;
  positionConfirmed: boolean;
  profileIconId: number;
  spell1Id: number;
  spell2Id: number;
  runeTreeIcon: string | null;
  runeSubTreeIcon: string | null;
  rankSolo: { tier: string; rank: string; lp: number; wins: number; losses: number } | null;
  masteryLevel: number | null;
  masteryPoints: number | null;
}

export interface EnemyLaner extends LiveParticipant {
  recentForm?: boolean[];
  gamesOnThisChamp?: number;
  winsOnThisChamp?: number;
}

export interface LiveGameState {
  gameId: number;
  queueId: number;
  startedAt: number;
  myTeamId: number;
  roster: LiveParticipant[];
  enemyLaner: EnemyLaner | null;
}

export interface LiveState {
  phase: LivePhase;
  lcuConnected: boolean;
  champSelect: ChampSelectState | null;
  game: LiveGameState | null;
  updatedAt: number;
}
