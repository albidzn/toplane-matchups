# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/), versions follow [SemVer](https://semver.org/).

## [1.15.1] - 2026-09-29

### Fixed
- Arena win counts could stay permanently too high or too low on an account whose cache had matches from before the 1st-place-only fix (v1.13.2) or the pending-queue fix (v1.13.3): a cached match's win/loss used to be baked in at fetch time and never recomputed, so a change to what counts as a "win" never applied to matches already on disk. Cached matches now store the raw placement instead, so today's definition is always applied to every match, and a one-time repair re-fetches anything cached under the old shape.

## [1.15.0] - 2026-09-29

### Added
- **Arena season auto-detection**: a built-in schedule of Arena season boundaries now scopes the Arena tab to the current season by default — no more manual date entry needed (Settings still has an override for when the built-in schedule is wrong or out of date).
- **Level and Fame** from the live Arena Season Journey, read from the League client, shown next to the win counter on the Arena tab. Verified against the in-game Season Journey screen: exact match on both Fame/level and the 38-champion win count.

## [1.14.0] - 2026-09-29

### Added
- **Arena season start** setting: an optional date in Settings that makes the Arena tab count wins from that date on instead of your whole account history, to match the in-game Arena Season Journey. Arena carries no season-boundary field in Riot's match or client data, so this has to be set by hand — find the date the current season started and enter it once. Left empty, it counts all-time.

## [1.13.3] - 2026-09-28

### Fixed
- Arena backfill could permanently drop a discovered match if it wasn't fetched within the same refresh that finished paging its queue — once a queue's id discovery was marked done, anything left over from that queue was never reconsidered again (only its ~20 most recent games kept getting rediscovered). Not-yet-fetched match ids are now kept in a persistent queue that's drained across refreshes until nothing's left, so a full backfill no longer silently stalls partway through for an account with a lot of Arena history. Also raised how many matches get fetched per refresh (20 → 80) so it catches up faster.

## [1.13.2] - 2026-09-28

### Fixed
- Arena "won" now means finishing 1st place, matching the Arena Season Journey's own definition — a top-4 (podium) finish no longer counts as a win. Riot's own `win` field is actually true for any podium finish, which was too generous; the checkmark now comes from `placement === 1` instead.

## [1.13.1] - 2026-09-28

### Fixed
- Arena queue-id discovery now asks the League client for its own queue catalog (`/lol-game-queues/v1/queues`) instead of a hardcoded list, so a queue like "Bravery Arena" (1740) that isn't in Riot's static queue list gets picked up too. Discovered ids are remembered on disk so this keeps working without the client open.

## [1.13.0] - 2026-09-28

### Added
- **Arena tab**: every champion, with a checkmark on the ones you've won at least once with in Arena (queue "CHERRY"), plus a X/Y "champions won" counter, search and a "Won only" filter. Full match history isn't needed for this — it scans your whole Arena history once in the background (a few games per refresh, to stay within Riot's rate limits) and then just tracks new games.
- **Live tab recognizes Arena games**: once you're in an Arena game, the Live tab shows an "Arena mode" card with your champion and whether you've already won with it, instead of trying to force the toplane matchup view onto an 8-team mode it doesn't fit. Champ select isn't broken down further for Arena — deliberately out of scope for now.

## [1.12.0] - 2026-09-28

### Changed
- **The summary follows the match history**: it now covers exactly the games shown below it (20 at first, 40 after "Show more games", and so on), including winrate, KDA, champions and roles.
- **Role distribution shows the number of games** on hover.
- The history loads 20 games at a time and its header shows how many of the total are visible.

## [1.11.1] - 2026-09-28

### Changed
- Profile tab: the "Last 20 games" summary is back above the match history, and the Flex rank card now only appears on the Flex filter, so the "All" view stays compact.

## [1.11.0] - 2026-09-28

### Changed
- **Profile tab shows your recent games straight away**: the match history now sits directly under the rank cards (the summary and champion stats moved below it), the queue filter shares the header row, and the LP graph sits beside the rank info instead of below it. About six games are visible without scrolling on a typical second-monitor window.
- The match history loads 15 games at a time with a "Show more games" button.

## [1.10.0] - 2026-09-28

### Changed
- **Exact GM/Challenger cutoffs**: taken from the League client's own ladder (the lowest LP of players not in the demotion zone, e.g. GM 1714 instead of the public API's 1559, which counts demotion-zone players). The last exact value is remembered for when the client is closed; only if there is none, a `~`-marked estimate from the public API is shown.
- **LP graph is tier-coloured**: light-blue Diamond background, purple Master (and red Grandmaster / cyan Challenger) bands, and the line itself changes colour with the tier it is in.
- **Rank area**: Solo/Duo is the main card (bar + graph); Flex is a slim single-row card under it on the "All" view, or the main card on the Flex filter.

## [1.9.0] - 2026-09-28

### Added
- **Master / Grandmaster / Challenger progress bar** on the Solo/Duo card, like deeplol: your LP between the current cutoffs (e.g. `M | 0 LP` to `GM | 1719 LP`). The cutoffs come from Riot's live Grandmaster/Challenger leagues and are cached for 30 minutes.

## [1.8.1] - 2026-09-28

### Added
- The LP graph's **Peak** is now an all-time peak that's stored separately from the 30-day snapshots, so it survives history trimming and can predate the graph window.

## [1.8.0] - 2026-09-28

### Added
- **Solo/Duo & Flex quick filter** on the Profile tab (All / Solo/Duo / Flex): switches the rank cards, the summary panel, the match history and the champion stats together.
- **Expandable match history**: click a game to see the full 10-player scoreboard (KDA, damage, CS, items, levels, roles) with your row highlighted. Older cached games get their scoreboard backfilled a few at a time on each refresh.

### Changed
- Match history rows are tinted green/red with a clear Victory/Defeat label, role and queue.
- The LP graph is Solo/Duo only (no Flex graph) and now scales to the card width.

## [1.7.0] - 2026-09-28

### Added
- **Match history grouped into sessions**: games played back to back (less than an hour between one ending and the next starting) are grouped under a header with when the session ended, games played, W/L, winrate and total play time. The history now covers your last 60 games instead of 20.

## [1.6.0] - 2026-09-28

### Added
- **LP graph** on the Solo/Duo and Flex rank cards: your LP over the last 30 days as a step chart across divisions and tiers, with the net LP change and your peak. Riot's API only reports your *current* LP, so the app records it each time it changes (in `data/lp-history.json`) — the graph starts empty and fills in as you play while the app is running.

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
