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
