# Toplane Matchups Dashboard

A small local dashboard for League of Legends toplane matchups: search an
enemy champion, see your counter picks with runes/summoner notes, and edit
everything in place. Meant to run on a second monitor next to the game.

*Not endorsed by Riot Games — see the notice in the app's Settings.*

## Get the app (Windows)

Download the latest release from the
[Releases page](https://github.com/OWNER/REPO/releases/latest):

- **Setup.exe** — installer with a Start menu / desktop shortcut. Updates
  itself automatically from then on (checks on launch and every 4h; when a
  new version has finished downloading, a small "Update ready" pill appears
  in the header — click it to restart into the new version).
- **portable.exe** — single file, runs from anywhere, no install. Does **not**
  auto-update; re-download it to get a new version.

The exe is unsigned, so Windows SmartScreen may warn on first start —
"More info" → "Run anyway".

## Desktop app from source

Build it yourself instead of downloading a release:

```
npm install
npm run dist
```

This creates two files in `release/`:

- `Toplane-Matchups-Setup-<version>.exe` — installer (Start menu + desktop shortcut)
- `Toplane-Matchups-<version>-portable.exe` — single file, runs from anywhere

Handy details:

- **Data** lives in `%APPDATA%\Toplane Matchups\data` (matchups, match cache, saved
  settings). Your current `data/matchups.json` is copied there on first launch.
  *App → Open data folder* opens it.
- **Riot account**: enter your Riot ID, server and API key via the gear icon (Settings).
  The key is stored locally and never sent to the UI again.
- **View menu** (press Alt): Always on top, zoom, fullscreen. Window size/position,
  zoom and "always on top" are remembered.
- Only one instance runs at a time; launching again focuses the open window.
- `npm run desktop` starts the desktop app straight from source.

The browser version below keeps working and uses the project's `data/` folder.

## Run it

Double-click `start.bat`, or from a terminal:

```
npm install
npm start
```

Then open http://localhost:4747 (it should open automatically).

For development with hot reload: `npm run dev`.

## Data

Your matchups live in `data/matchups.json`. Every edit in the UI autosaves
there (with a one-version backup in `data/matchups.backup.json`). Champion
icons and names come from Riot's Data Dragon CDN, cached to
`data/champions-cache.json` so the app still works offline after first launch.

## Profile tab (optional)

The **Profile** tab shows your rank, recent games, per-champion stats and — in
the matchup view — your own win/loss record against each enemy, built from
your ranked match history. It needs a Riot API key:

1. Create a key at [developer.riotgames.com](https://developer.riotgames.com).
   A **Personal API Key** (an approved app) is best since it never expires; a
   raw dev key works too but has to be replaced every 24h.
2. Copy `.env.example` to `.env` in the project folder and fill in:
   - `RIOT_API_KEY` — your key
   - `RIOT_ID` — your Riot ID in quotes, e.g. `"Name#EUW"` (the quotes matter —
     without them, everything after `#` is treated as a comment and cut off)
   - `RIOT_PLATFORM` — the server your account is on, e.g. `euw1`
3. Restart the app (`npm start`).

The key stays on your machine — it's only ever sent from the local server to
Riot's API, never to the browser, and `.env` is git-ignored. Match history is
cached in `data/match-cache.json`; each refresh only fetches new games, so
your matchup record gets more accurate the longer you use the app.

Without a `.env`, everything else (matchups, edit mode, My Pool) works exactly
as before — the Profile tab just shows setup instructions instead.

## Development

```
npm install
npm run typecheck   # tsc, no emit
npm test            # vitest
npm run build        # frontend only, for the browser/local server
npm run dev          # local server + browser, with hot reload
```

CI (`.github/workflows/ci.yml`) runs typecheck, test and build on every pull
request into `main`.

### Releasing

Tagging a commit `vX.Y.Z` and pushing the tag triggers
`.github/workflows/release.yml`, which builds the installer and portable exe
on a Windows runner and publishes them to a GitHub Release (draft artifacts
attached automatically by `electron-builder`'s GitHub publish provider):

```
npm version minor   # or patch / major — bumps package.json and tags
git push --follow-tags
```

Update `CHANGELOG.md` before tagging.
