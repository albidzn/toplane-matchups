// Thin Riot API client: throttling, retry-on-429, and typed errors so the
// rest of the server (and the UI) can show a sensible message instead of a
// raw HTTP status.

export class RiotApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "RiotApiError";
    this.code = code; // NOT_CONFIGURED | INVALID_KEY | NOT_FOUND | RATE_LIMITED | UPSTREAM
    this.status = status;
  }
}

const PLATFORM_TO_REGION = {
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  me1: "europe",
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

export function regionForPlatform(platform) {
  return PLATFORM_TO_REGION[platform] ?? "europe";
}

// ---- simple request queue: cap concurrency + a minimum gap between
// requests so we stay well under the dev-key limits (20/s, 100/2min). ----

const MIN_GAP_MS = 70; // ~14 req/s ceiling
let queueTail = Promise.resolve();
let lastRequestAt = 0;

function schedule(fn) {
  const run = async () => {
    const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  };
  const result = queueTail.then(run, run);
  // keep the tail alive even if this call rejects
  queueTail = result.then(
    () => {},
    () => {}
  );
  return result;
}

function mapError(status, body) {
  if (status === 401 || status === 403) {
    return new RiotApiError(
      "INVALID_KEY",
      "The Riot API key was rejected. Dev keys expire every 24h — grab a fresh one from developer.riotgames.com and enter it in Settings.",
      status
    );
  }
  if (status === 404) {
    return new RiotApiError(
      "NOT_FOUND",
      "Riot ID not found. Double-check your Riot ID and server in Settings.",
      status
    );
  }
  if (status === 429) {
    return new RiotApiError("RATE_LIMITED", "Rate limited by Riot's API. Try again shortly.", status);
  }
  return new RiotApiError("UPSTREAM", `Riot API request failed (${status}).`, status);
}

async function rawFetch(url, apiKey) {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || 2;
    await new Promise((r) => setTimeout(r, (retryAfter + 0.25) * 1000));
    const retryRes = await fetch(url, { headers: { "X-Riot-Token": apiKey } });
    if (!retryRes.ok) throw mapError(retryRes.status);
    return retryRes.json();
  }

  if (!res.ok) throw mapError(res.status);
  return res.json();
}

export function createRiotClient({ apiKey, platform }) {
  if (!apiKey) {
    return {
      configured: false,
      async request() {
        throw new RiotApiError("NOT_CONFIGURED", "No Riot API key configured.", 0);
      },
    };
  }

  const region = regionForPlatform(platform);

  function requestPlatform(path) {
    return schedule(() => rawFetch(`https://${platform}.api.riotgames.com${path}`, apiKey));
  }

  function requestRegion(path) {
    return schedule(() => rawFetch(`https://${region}.api.riotgames.com${path}`, apiKey));
  }

  /** Like requestPlatform, but a 404 resolves to null instead of throwing (used where 404 is a normal, expected state). */
  async function requestPlatformOrNull(path) {
    try {
      return await requestPlatform(path);
    } catch (err) {
      if (err instanceof RiotApiError && err.status === 404) return null;
      throw err;
    }
  }

  return {
    configured: true,
    region,
    platform,

    getAccountByRiotId(gameName, tagLine) {
      return requestRegion(
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
    },

    getSummonerByPuuid(puuid) {
      return requestPlatform(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    },

    getLeagueEntriesByPuuid(puuid) {
      return requestPlatform(`/lol/league/v4/entries/by-puuid/${puuid}`);
    },

    getTopMastery(puuid, count = 10) {
      return requestPlatform(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`);
    },

    /** null (not an error) when the player has never played this champion. */
    getMasteryByChampion(puuid, championId) {
      return requestPlatformOrNull(
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/by-champion/${championId}`
      );
    },

    /** null (not an error) when this summoner isn't currently in a game. */
    getActiveGameByPuuid(puuid) {
      return requestPlatformOrNull(`/lol/spectator/v5/active-games/by-summoner/${puuid}`);
    },

    getMatchIds(puuid, count) {
      return requestRegion(`/lol/match/v5/matches/by-puuid/${puuid}/ids?type=ranked&start=0&count=${count}`);
    },

    getMatch(matchId) {
      return requestRegion(`/lol/match/v5/matches/${matchId}`);
    },
  };
}
