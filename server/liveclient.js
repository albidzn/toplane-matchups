// The Live Client Data API: a plain HTTPS endpoint the League game process
// itself exposes on 127.0.0.1:2999 while a match is running (self-signed
// cert, no auth). Gives us each player's authoritative lane ("position"),
// which champ-select/spectator data never exposes for the enemy team.
import https from "node:https";

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export function getLiveClientData() {
  return new Promise((resolve) => {
    const req = https.get(
      { host: "127.0.0.1", port: 2999, path: "/liveclientdata/allgamedata", agent: insecureAgent, timeout: 3000 },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode !== 200) return resolve(null);
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null)); // not running yet / game closed — not an error condition for us
  });
}
