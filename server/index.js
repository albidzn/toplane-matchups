import express from "express";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createProfileService } from "./profile.js";
import { createSettings } from "./settings.js";
import { createLiveGameService } from "./live-game.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function isValidMatchups(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.version !== "number") return false;
  if (!Array.isArray(data.enemies)) return false;
  for (const e of data.enemies) {
    if (!e || typeof e !== "object") return false;
    if (typeof e.id !== "string" || typeof e.champion !== "string") return false;
    if (!Array.isArray(e.picks)) return false;
    for (const p of e.picks) {
      if (!p || typeof p !== "object") return false;
      if (typeof p.id !== "string" || typeof p.champion !== "string") return false;
      if (typeof p.note !== "string") return false;
    }
  }
  return true;
}

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

/**
 * Starts the matchups server. Used both by the CLI entry below (browser
 * mode) and by the Electron shell (desktop app).
 *
 * @param {object} [opts]
 * @param {string} [opts.dataDir]   where matchups.json & caches live
 * @param {string} [opts.distDir]   built frontend (production mode)
 * @param {number} [opts.port]      preferred port (0 = pick a free one)
 * @param {boolean} [opts.dev]      serve via Vite middleware (HMR) instead of dist/
 * @param {boolean} [opts.fallbackToRandomPort] if the port is taken, use any free one
 * @param {string} [opts.seedFile]  copied to matchups.json on first run if none exists
 * @returns {Promise<{ port: number, url: string, dataDir: string, close: () => Promise<void> }>}
 */
export async function startServer(opts = {}) {
  const dataDir = opts.dataDir ?? path.join(rootDir, "data");
  const distDir = opts.distDir ?? path.join(rootDir, "dist");
  const matchupsPath = path.join(dataDir, "matchups.json");
  const backupPath = path.join(dataDir, "matchups.backup.json");
  const champCachePath = path.join(dataDir, "champions-cache.json");
  const host = "127.0.0.1";

  const app = express();

  // Local-only app: refuse anything not addressed to localhost, so other
  // machines / DNS-rebinding pages / foreign origins can't poke the API.
  app.use((req, res, next) => {
    const hostOk = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(req.headers.host ?? "");
    const origin = req.headers.origin;
    const originOk = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    if (!hostOk || !originOk) return res.status(403).json({ error: "Forbidden" });
    next();
  });
  if (!opts.dev) {
    // Tight CSP for the built app (dev mode needs inline scripts for HMR).
    app.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; " +
          "img-src 'self' data: https://ddragon.leagueoflegends.com https://raw.communitydragon.org; " +
          "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      );
      next();
    });
  }
  app.use(express.json({ limit: "1mb" }));

  const settings = createSettings(dataDir);
  settings.load();

  // ---------- data helpers ----------

  async function ensureDataFile() {
    await fs.mkdir(dataDir, { recursive: true });
    if (fsSync.existsSync(matchupsPath)) return;
    if (opts.seedFile && fsSync.existsSync(opts.seedFile)) {
      await fs.copyFile(opts.seedFile, matchupsPath);
    } else {
      await fs.writeFile(matchupsPath, JSON.stringify({ version: 1, enemies: [] }, null, 2), "utf-8");
    }
  }

  // ---------- Data Dragon champion cache ----------

  let championsMemCache = null; // { version, champions }
  let championsInFlight = null; // dedupe concurrent callers

  async function loadChampionCacheFromDisk() {
    try {
      const parsed = JSON.parse(await fs.readFile(champCachePath, "utf-8"));
      // caches written before `key` was added are stale — force a refetch
      if (!parsed.champions?.every((c) => typeof c.key === "string")) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function fetchChampionsFromDataDragon() {
    const versionsRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    if (!versionsRes.ok) throw new Error("versions fetch failed");
    const version = (await versionsRes.json())[0];

    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    if (!champRes.ok) throw new Error("champion data fetch failed");
    const champJson = await champRes.json();

    const champions = Object.values(champJson.data)
      .map((c) => ({ id: c.id, name: c.name, key: c.key }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { version, champions };
  }

  async function getChampions() {
    if (championsMemCache) return championsMemCache;
    if (championsInFlight) return championsInFlight;

    championsInFlight = (async () => {
      try {
        const fresh = await fetchChampionsFromDataDragon();
        championsMemCache = fresh;
        fs.writeFile(champCachePath, JSON.stringify(fresh, null, 2), "utf-8").catch(() => {});
        return fresh;
      } catch (err) {
        const cached = await loadChampionCacheFromDisk();
        if (cached) {
          championsMemCache = cached;
          return cached;
        }
        throw err;
      } finally {
        championsInFlight = null;
      }
    })();

    return championsInFlight;
  }

  const profileService = createProfileService({ dataDir, getChampions });

  const liveService = process.env.LIVE_MOCK
    ? await import("./mock-live.js").then((m) => m.createMockLiveGameService({ getChampions }))
    : createLiveGameService({ dataDir, getChampions });

  // ---------- API routes ----------

  app.get("/api/matchups", async (_req, res) => {
    try {
      res.json(JSON.parse(await fs.readFile(matchupsPath, "utf-8")));
    } catch (err) {
      console.error("Failed to read matchups:", err);
      res.status(500).json({ error: "Failed to read matchups data" });
    }
  });

  app.put("/api/matchups", async (req, res) => {
    const data = req.body;
    if (!isValidMatchups(data)) {
      return res.status(400).json({ error: "Invalid matchups payload" });
    }

    try {
      // backup previous version
      if (fsSync.existsSync(matchupsPath)) {
        await fs.copyFile(matchupsPath, backupPath);
      }

      const tmpPath = path.join(dataDir, `.matchups.${randomUUID()}.tmp`);
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tmpPath, matchupsPath);

      res.json({ ok: true });
    } catch (err) {
      console.error("Failed to write matchups:", err);
      res.status(500).json({ error: "Failed to save matchups data" });
    }
  });

  app.get("/api/champions", async (_req, res) => {
    try {
      res.json(await getChampions());
    } catch (err) {
      console.error("Failed to load champions:", err);
      res.status(502).json({ error: "Failed to load champion list" });
    }
  });

  app.get("/api/profile", async (req, res) => {
    try {
      res.json(await profileService.getProfile({ refresh: req.query.refresh === "1" }));
    } catch (err) {
      console.error("Failed to load profile:", err);
      res.status(502).json({
        configured: true,
        error: { code: "UPSTREAM", message: "Unexpected server error." },
        updatedAt: Date.now(),
      });
    }
  });

  app.get("/api/settings", (_req, res) => {
    res.json(settings.get());
  });

  app.put("/api/settings", async (req, res) => {
    try {
      await settings.update(req.body ?? {});
      profileService.reset();
      liveService.reset();
      res.json(settings.get());
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ---------- live game (Champ Select / loading screen / in-game) ----------

  app.get("/api/live/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify(liveService.getState())}\n\n`);

    const unsubscribe = liveService.subscribe((state) => {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post("/api/live/champselect-override", (req, res) => {
    const cellId = Number(req.body?.cellId);
    if (!Number.isInteger(cellId)) return res.status(400).json({ error: "cellId must be an integer" });
    liveService.setChampSelectOverride(cellId);
    res.json({ ok: true });
  });

  app.post("/api/live/game-override", (req, res) => {
    const puuid = req.body?.puuid;
    if (typeof puuid !== "string" || !puuid) return res.status(400).json({ error: "puuid is required" });
    liveService.setGameOverride(puuid);
    res.json({ ok: true });
  });

  // ---------- static / dev server wiring ----------

  await ensureDataFile();

  if (opts.dev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  let server;
  try {
    server = await listen(app, opts.port ?? 0, host);
  } catch (err) {
    if (err.code === "EADDRINUSE" && opts.fallbackToRandomPort) {
      server = await listen(app, 0, host);
    } else {
      throw err;
    }
  }

  // warm caches in the background, don't block startup
  getChampions().catch((err) => console.warn("Champion cache warm-up failed:", err.message));
  profileService.getProfile({}).catch((err) => console.warn("Profile warm-up failed:", err.message));
  liveService.start();

  const port = server.address().port;
  return {
    port,
    url: `http://localhost:${port}`,
    dataDir,
    close: () =>
      new Promise((resolve) => {
        liveService.stop();
        server.close(() => resolve());
      }),
  };
}

// ---------- CLI entry (browser mode: `npm run dev` / `npm start`) ----------

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = process.env.PORT ? Number(process.env.PORT) : 4747;
  startServer({ port, dev: process.env.NODE_ENV !== "production" })
    .then(({ url }) => console.log(`\n  Toplane Matchups running at ${url}\n`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
