// Connects to the local League Client (LCU) REST API. Read-only: we only
// GET gameflow phase and champ-select session data, never POST/PATCH
// anything back into the client.
import fs from "node:fs";
import https from "node:https";
import { execFile } from "node:child_process";

const COMMON_INSTALL_DIRS = [
  "C:\\Riot Games\\League of Legends",
  "D:\\Riot Games\\League of Legends",
  "C:\\Program Files\\Riot Games\\League of Legends",
  "C:\\Program Files (x86)\\Riot Games\\League of Legends",
];

const insecureAgent = new https.Agent({ rejectUnauthorized: false }); // LCU uses a self-signed cert

function readLockfile(dir) {
  try {
    const raw = fs.readFileSync(`${dir}\\lockfile`, "utf-8");
    const [, , port, password, protocol] = raw.trim().split(":");
    if (!port || !password) return null;
    return { port: Number(port), password, protocol: protocol || "https" };
  } catch {
    return null;
  }
}

/** Last resort: ask Windows where the running client's exe lives, then look for the lockfile next to it. */
function findViaRunningProcess() {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe'\" | Select-Object -First 1 -ExpandProperty ExecutablePath)",
      ],
      { timeout: 5000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const exePath = stdout.trim();
        if (!exePath) return resolve(null);
        const dir = exePath.replace(/\\[^\\]+$/, "");
        resolve(readLockfile(dir));
      }
    );
  });
}

async function findLockfile() {
  for (const dir of COMMON_INSTALL_DIRS) {
    const found = readLockfile(dir);
    if (found) return found;
  }
  return findViaRunningProcess();
}

function request(port, password, path) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${password}`).toString("base64");
    const req = https.get(
      { host: "127.0.0.1", port, path, agent: insecureAgent, headers: { Authorization: `Basic ${auth}` }, timeout: 4000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`LCU ${path} -> ${res.statusCode}`));
          }
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("LCU request timed out")));
    req.on("error", reject);
  });
}

/**
 * A small always-on connector: tries to find + attach to the League Client,
 * retries while it's not running, and exposes get() for LCU endpoints once
 * connected. `onConnectionChange(connected)` fires on state transitions.
 */
export function createLcuConnector({ onConnectionChange } = {}) {
  let creds = null;
  let checking = false;

  async function ensureConnected() {
    if (creds) {
      // cheap liveness check; clears creds on failure so we re-discover
      try {
        await request(creds.port, creds.password, "/lol-gameflow/v1/gameflow-phase");
        return true;
      } catch {
        creds = null;
        onConnectionChange?.(false);
      }
    }
    if (checking) return false;
    checking = true;
    try {
      const found = await findLockfile();
      if (found) {
        creds = found;
        onConnectionChange?.(true);
        return true;
      }
      return false;
    } finally {
      checking = false;
    }
  }

  async function get(path) {
    if (!creds) throw new Error("LCU not connected");
    return request(creds.port, creds.password, path);
  }

  return {
    ensureConnected,
    get,
    isConnected: () => creds !== null,
  };
}
