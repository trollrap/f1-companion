# F1 Companion: hand-off notes

Read this first in any new session. Update the "Status" and "Next" sections at the end of every session.
The same spec is saved in Claude's memory under the area "f1-companion-app".

## Stack
Expo SDK 58 (React 19, React Native 0.88, React Navigation 7: bottom tabs + native stack), AsyncStorage, expo-notifications, react-native-svg.
Run: `npm install`, then `npx expo start`.
A web preview of the same screens lives in the Claude artifact "F1 Companion Base" (single HTML file, sample data only).

## Data sources (checked from documentation, not from inside the sandbox, which blocks both APIs)
| Need | Source | Notes |
|---|---|---|
| Schedule, sessions, track time (`gmt_offset`), sprint detection | OpenF1 `api.openf1.org/v1` | Historical data is free, no key. Free limits: 3 req/s, 30 req/min. |
| Live timing, intervals, race control, tyres | OpenF1 | Live data needs the paid Sponsor tier (EUR 9.90/month per openf1.org). Window: 30 min before to 30 min after a session. |
| Past-session timing | OpenF1 | Free. |
| Results, qualifying, sprint, standings, career stats, schedule fallback | Jolpica `api.jolpi.ca/ergast/f1` | Ergast-compatible. Limit is 4 req/s or 500 req/hour (maintainer, GitHub discussion #80). Endpoints end in `.json` or `/`; season goes first in the path. No live data. Everything goes through `src/lib/cache.js` (cache, per-host throttle, 429 retry, stale-on-error). |
| Track outline | OpenF1 `/location` for one lap of a past race at the circuit | `fetchOutline` in `src/api/openf1.js`. Untested against the live API. |
| Circuit facts (turns, laps, record, notes) | Static file `src/data/circuits.js` (generated; 25 circuits) | Checked 28 Oct 2026 against Wikipedia and formula1.com, including every 2026 race fastest lap vs the stored lap record. Unconfirmed figures are omitted and their row hidden (Mexico race distance: sources conflict). Matched by circuit name, city and country, not by Grand Prix name (the 2026 "Bahrain GP" is at Sepang). Re-check lap records after each remaining race (Mexico, Brazil, Las Vegas, Qatar, Abu Dhabi). |
| Driver numbers and team colours | OpenF1 `/drivers?session_key=latest`, joined to Jolpica standings by surname (`src/api/paddock.js`) | Falls back to Jolpica permanent numbers and the static colours in `src/theme.js`. |

Rule: never show a number that has no source. Missing data shows an empty state, not a guess.

## Decisions made
- Accent is blue (`colors.accent` in `src/theme.js`), as the user asked. Sprint badge is magenta, fastest lap purple, winners gold. Team colours come from OpenF1 at runtime.
- Notifications: several lead times can be chosen together (at start, 5/15/30 min, 1/2 h, 1 day) plus a bell per session type. Alerts are rescheduled whenever sessions or preferences change.
- Track time uses OpenF1 `gmt_offset` and a fixed UTC offset, so it is correct even if the device timezone differs.
- Home countdown targets the next session (the reference app targets the race). Easy to change in `targetOf`.
- Tabs: Home, Calendar, Standings, Paddock. The Live tab was dropped by the user (26 Oct); past sessions are opened from a round's results (Calendar > round).

## Verification done (27 Oct 2026)
- OpenF1 field names checked against openf1.org/docs: meetings (`gmt_offset` is unsigned for positive offsets, `is_cancelled`), sessions, `session_result` (arrays for qualifying), drivers, laps, location. Historical data from 2023 is free; real-time is paid. `country_code` in drivers is deprecated and unused here.
- Jolpica routes checked against its docs: `.json` suffix, `limit` default 30 and max 100, `/{season}/{round}/results`, `/drivers/{id}/results`, `/fastest/{rank}/results`, `/last`. NOT in its docs: the position filter (`/results/1`). The app probes it and, if the server ignores it, counts rows instead (drivers) or shows a dash (teams).
- Because OpenF1 may refuse free requests around live sessions, the season and sessions fall back to Jolpica's schedule (start times only, end times estimated and hidden in the UI, no track time).
- Logic tests against mocked servers (29 requests, all passed): career counts with and without the position filter, winners, round alignment, OpenF1 outage fallback, sprint session order, qualifying arrays, gmt_offset parsing, season stats and head-to-head.
- A real Metro/Hermes Android bundle (`npx expo export --platform android`) builds on SDK 58 with all dependencies and font packages. Versions come from `node_modules/expo/bundledNativeModules.json`. The user's Expo Go is SDK 58, so keep the project on the same SDK as their Expo Go.
- NOT verified: calls to the real servers (the build sandbox blocks both hosts). In the app, Settings > Check data sources runs every call against the real servers and shows a tick or cross with the reason.

## Status (30 Oct 2026, V1)
V1 = personal-use release (user keeps the app for themselves and friends). Profile feature, Legal screen, LEGAL.md and the header avatar were removed. Photos are 500x500 official portraits, facing front, chest and up.
Changes in V1: gradients now use native `expo-linear-gradient` (`Grad`, `Scrim`) instead of SVG (the SVG one kept its first size on Android). Driver photos show on Home "Your drivers", driver hero (no gap, shifted right, scrims behind text), Compare hero boxes, Standings rows (head crop via `HeadShot`), Paddock and Team driver boxes (`DriverBox center`). Team logo watermark in standings and results; team logo between name and points in team standings. Results rows open the driver. Paddock Teams uses light `TeamRow` cards (fast list). Lineups come from the latest Grand Prix results (`lineups()` in `src/api/jolpica.js`), so reserves never show on team pages (they only appear in practice rows, tapping opens a minimal driver page). Team page: 2026 season card plus all-time. Calendar: finished rounds use the winning team's gradient. Circuit: lap record box is normal size. Driver page: 12 boxes (Q3 apps), last-5 cards open the race, "View all" uses `SeasonRow`, "Grid: N", button to `DriverSeasonsScreen` (dropdown of earlier seasons). Standings gap label is a tap-to-cycle text.
Data check: `/driverstandings/1.json` and `/constructorstandings/1.json` return HTTP 400 on Jolpica; the app uses the cached per-season fallback.
Release files: `app.json` (icon, adaptive icon, splash, versionCode 1), `eas.json` (preview = APK), `BUILD_APK.md`.
NOT verified on a phone: new endpoints (`constructors/{id}/results|qualifying`, `drivers/{id}/results` paging), real photo framing, notification delivery in a built APK.
Preview artifact is older than V1.

v9 status:
Done: everything from v7, plus a UI overhaul: blue accent; team-colour gradient cards (`Grad`, SVG based); Home (next race hero, favourite-driver cards, last race podium, top-5 standings); standings with gap to leader (default), gap to car ahead, or points; driver page (hero, tabs 2026 / Career / Profile, last 5 races in a horizontal strip with "View all"); team page; compare (picker grid, hero pair, tug-of-war bars, season/career tabs); Paddock (two driver boxes per team, team boxes); dropdowns for round results and rules categories; sprint shown as a small pink badge; consistent driver names (`src/lib/names.js`); notifications renamed and multi-select; no UTC labels; circuit data for all circuits; Legal screen; LEGAL.md; media plan (`assets/README.md`, `npm run media`, `npm run media:ids`).
Fixed: Expo Go crash (module probed before require), career/team 400s (history now loads in independent pieces; a failing endpoint shows a dash; titles load separately and fall back to one request per season).
Verified in the sandbox: hooks lint, mocked-API tests (career, champions fallback, names, alert planning, Expo Go never requires expo-notifications), real Android bundle, web build rendered in headless Chromium with mocked APIs (all screens screenshotted).
NOT verified (needs the user's phone): the real API answers for the new career/team endpoints (Settings > Check data sources now has 4 extra rows that test them), track outline, notification delivery (dev build only), photos (none added yet).

## V1.2 additions (30 Oct)
Speed: concurrent throttle + stale-while-revalidate in `src/lib/cache.js` (`dataChanged()` in net.js), parallel paging in jolpica.js. Screen flattens fragments (gaps). Short GP names (`shortName` in time.js: Mexico, Spain, USA...). Notifications: exact-alarm permissions in app.json; title uses short name. Session result alerts (`src/lib/resultAlerts.js`, Settings switch `prefs.results`): Jolpica last results/qualifying/sprint, notifies once the classification is published, background task `f1-results-check` (expo-background-task, 15 min minimum, Android decides) plus check on launch/foreground. Needs a rebuilt APK (new native modules). Practice results alerts not done (OpenF1). Live timing declined for now (OpenF1 real-time needs a sponsor account).

V1.3: Standings has two buttons: What if (`WhatIfScreen`, `lib/whatif.js`: tap drivers in finishing order for race and, on sprint weekends, sprint; new driver and team standings) and Season chart (`ChartScreen`, `LineChart` with react-native-svg, `seasonPoints()` in jolpica.js). Result notifications now only say "Results are available." Queue (user chose): tyre/strategy recap, predictions game, visual polish pass, home widget, in-app update (GitHub Releases idea, last).

V1.4: Tyre strategy card on finished rounds (`components/Strategy.js`, `raceStints()` in openf1.js; needs OpenF1 session_key, so it is hidden when the schedule came from the Jolpica fallback). Predictions (`PredictScreen`, `lib/predictions.js`, stored on the phone: pole +2, podium exact +3, wrong place +1; Home button). In-app update check (`src/config.js` UPDATE_REPO, `lib/update.js`, `UpdateBanner`, Settings > App updates; empty repo hides it). Home widget NOT built: expo-widgets is iOS-focused; an Android widget needs a community native plugin and a build test the sandbox cannot run. Visual polish pass not started.

V1.5 (app version 1.3.0, scheme: package.json version is the source of truth, `npm run sync` copies it into app.json; middle number = semi-major, last = minor, first = year/leave): red/dark rebrand, gradient cards, Press/Reveal animations, season switch (Standings, Calendar; Standings resets to the current season when the tab is left), champion highlight (`lib/champion.js` clinched, past seasons = final leader), past seasons show the team logo instead of the portrait, Standings opens Season chart for the shown tab only, What-if limited to the current grid, Paddock cleanup, Schedule: live session = green gradient + LIVE tag, next session = red gradient (components/Schedule.js). Team page: principal photo (assets/principals/<teamId>.png) + principal card from `src/data/principals.js` (STATIC data, early/late 2026, update by hand). Driver page: engineer photo card (assets/engineers/<driverId>.png), number image support (assets/numbers/<driverId>.png), logo at assets/app/logo.png (not received yet). GitHub repo: trollrap/f1-companion.

V1.6 (1 Nov, app version 1.4.0): SeasonSwitch is now a tap-to-open year menu (Calendar/Standings up to next year, profiles list seasons of that driver/team); Swipe (components/Swipe.js via Screen `swipe` prop) between tabs; Standings: points big, gap below, past years cached for ~58 days (`ttlFor` in jolpica.js); Driver/Team screens take `year` and show that season's team/gradient/stats (engineer only for the current season, driver not on the current grid opens on their last season); champion gold hero; LineChart zoom (pinch, +/-) and read-out; Paddock: 2027 grid screen (`GridScreen`, `entryList`), team principal on TeamRow; Round: qualifying gaps inside each stage, tyre strategy behind a button; favourites marked by a gold edge stripe (no star in lists); prediction share image (`PredictCard`, needs react-native-view-shot + expo-sharing: new native deps, new build); in-app update check Android only, 404 = no release yet; `data/engineers.js` and `data/principals.js` are STATIC (edit by hand). BUILD_IOS.md covers the iPhone build.

## Expo Go note
Expo Go (SDK 53+) does not include the `expo-notifications` native module; importing it crashes the app at startup ("Cannot find native module ExpoTopicSubscriptionModule"). `src/lib/notifications.js` therefore loads it lazily, and skips the require entirely in Expo Go (`Constants.executionEnvironment === 'storeClient'`) because Metro reports a failed require as a fatal error that try/catch cannot catch: in Expo Go alerts are off and Settings says so; a development build (`npx expo run:android` or EAS) enables them. Never import `expo-notifications` at the top of a file.

## Next
1. Build the APK (BUILD_APK.md) and test on the phone.
2. Photos: `assets/drivers/<jolpica id>.png`, `assets/cars/<team id>.png`, `assets/logos/<team id>.png`, then `npm run media` (see `assets/README.md`).
3. Widgets (needs a development build or the built APK route).
4. Re-check circuit lap records after each remaining 2026 race.
5. Live timing remains parked (OpenF1 paid tier).
