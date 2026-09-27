# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/), versions follow [SemVer](https://semver.org/).

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
