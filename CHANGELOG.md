# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/), versions follow [SemVer](https://semver.org/).

## [1.5.0] - 2026-09-28

### Changed
- **Profile tab layout, deeplol-style**: ranked cards on top, then a new summary panel (winrate donut, average KDA/CS, your most-played champions, role distribution, W/L strip), then the match history, and the champion stats now sit at the bottom (collapsed to the top 8, expandable).
- Match history rows now show your role, victory/defeat, KDA with ratio and CS (per minute), and no longer scroll inside their own box.

## [1.4.0] - 2026-09-28

### Added
- **Champ select**: your own pick now shows immediately — including a hover/preview before you lock in — with your winrate, KDA and mastery on that champion.

### Fixed
- Live tab roster rows (champ select, loading screen, in-game scoreboard, postgame) now sort in standard role order (Top, Jungle, Mid, Bot, Support) instead of whatever order the API happened to return them in.
- The "YOU" tag on the in-game scoreboard was showing on every one of your team's rows instead of just yours.

## [1.3.0] - 2026-09-28

### Added
- **My Pool**: search by champion name, and sort by mastery, winrate, matchup count or name (previously fixed to matchup count only).
- **Live tab — in-game scoreboard**: once the game's Live Client API confirms it, each player's row switches from pregame rank/mastery to their live level, KDA, CS and current items, refreshed continuously for the rest of the game.
- **Live tab — postgame summary**: a win/loss banner with your final KDA/CS vs. your lane opponent's, and a quick note field that saves straight onto the matching pick (creating it if you hadn't picked that champion into this matchup yet).

## [1.2.2] - 2026-09-27

### Fixed
- On the Live tab, a champion icon that started out unresolved (not locked in yet) stayed stuck on its letter placeholder forever once the real champion locked in — it only fixed itself after switching tabs away and back. `ChampIcon` (and `RemoteImg`) now reset their loaded/error state whenever the image they're pointed at actually changes, instead of getting stuck on a stale result from an earlier placeholder.

## [1.2.1] - 2026-09-27

### Fixed
- Rune tree icons on the Live tab were 404ing (wrong CommunityDragon path/casing) and showed nothing — fixed the URL.
- Champion icons (and other remote images with a fallback) showed a blank box while their first load was in flight instead of the letter-avatar placeholder — the placeholder now stays visible underneath until the real icon has loaded, so there's no blank flash on first paint.

## [1.2.0] - 2026-09-27

### Added
- **Live tab**: a Porofessor-style live game view that connects to your local League client.
  - **Champ select**: shows both teams' bans and picks as they lock in, guesses which enemy is your lane opponent (from the queue's position-based cell layout), and shows your counter picks, personal win/loss record and quick links (op.gg/u.gg/lolalytics) for whoever's locked in as their top laner — as soon as they lock, before the game even starts.
  - **Loading screen / in-game**: all 10 players with rank, season winrate, mastery on their champion, runes and summoner spells, refreshed against a highlighted card for your lane opponent (recent form, winrate on that champion).
  - The enemy top laner is a *guess* until the game's Live Client API confirms real lane assignments a few seconds in — if it's ever wrong, click "top?" / "This is top" on the right player to correct it by hand.
  - The app switches to Live automatically once you reach champ select, and back to whatever tab you had open once the game ends.
  - Nothing here needs the Riot API key alone — it also talks to your local League client (read-only) and, briefly, the game process itself (127.0.0.1:2999).

### Changed
- Champion list now also carries each champion's numeric key (needed to match Riot's live/spectator data to Data Dragon ids).

## [1.1.0] - 2026-09-27

### Added
- Public GitHub repo, CI (typecheck/test/build on every PR) and a release workflow that builds the Windows installer and portable `.exe` from a version tag.
- Auto-update for the installed desktop app via `electron-updater`: checks on launch and every 4h, downloads in the background, and shows a small "Update ready" pill in the header once it's safe to restart. The portable `.exe` is not auto-updated.
- A first test suite (Vitest) covering the fuzzy search, profile/rank formatting, match aggregation, region mapping and the settings validation.
- Required Riot Games attribution notice in Settings.

### Changed
- Narrow-window layout: the matchup grid and detail panel now stack instead of the detail view covering the grid, with a responsive column count and a compact header for windows in the 520–1023px range (previously only "wide" and "phone" layouts existed).

## [1.0.0] - 2026-09-24

Initial local dashboard: toplane matchup notes with editable counter-picks, Riot profile (rank, recent games, champion stats), your personal win/loss record per matchup, and a packaged Windows desktop app (installer + portable).
