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

V1.6b (1 Nov, still app version 1.4.0, shipped as one release): Calendar: past/next-season weekends open the Round screen (`meeting.year`; old seasons synthesise Qualifying/Sprint/Race, race rows show the starting grid), winner code box, "In progress" red pill, no "Next" until the weekend is over; Round: `NextSession` box, `route.params.session` preselects a session; Circuit: lap record and First Grand Prix open that year's weekend (`lib/weekend.js`; the lap record opens the Race because official records are race laps); Driver/Team: `ExpandStats` (2 rows + fade), Career teams list, past numbers from that season's standings, `Compare` takes `year`, team comparison (`TeamCompareScreen`); `CompareScreen`: search any driver, common-season logic, `ExportBar` (share/save PNG via `lib/exportImage.js`); Paddock: search (all drivers/teams ever, filter), TeamRow restyle; LineChart pans when zoomed; Segmented selected box is draggable; pull-to-refresh is a Settings option (default off, refresh button in the header instead); PredictCard: bigger pole, full name, team logo, tick/cross after the weekend, per past prediction picture; Greek (BETA): `src/i18n/el.js` (dictionary + patterns), `src/lib/i18n.js` (`tr`, `up`, `L`), `Text` auto-translates, Roboto Condensed for Greek glyphs, Greek dates in `lib/time.js`, notifications translated; changing language remounts navigation. Untranslated strings: add them to `DICT`/`PATTERNS` in `src/i18n/el.js`. New native deps: expo-media-library, expo-sharing, react-native-view-shot -> run `npm install` and build a NEW APK (OTA is not enough). MotoGP / football postponed.

V1.7 (1 Nov night, app version 1.5.0): MotoGP started. Sport chip top-left (`components/SportSwitch.js`, pref `opts.sport` f1|motogp; changing it remounts navigation). MotoGP data: `api/motogp.js` uses the public timing service api.motogp.pulselive.com/motogp/v1 (unofficial, could not be reached from the build sandbox: written from the documented endpoints and tested on mocked responses only; Settings > Check data sources has 3 MotoGP rows). Screens in `screens/MotoScreens.js`: Home (next GP + countdown, last race top 5), Calendar (season menu, tap = weekend), Standings (class dropdown MotoGP/Moto2/Moto3), Event (class + session dropdowns, classification). V1.5.1 added: rider profile (`MotoRider`: season stats derived from the top-class race/sprint classifications, race list), Teams and Constructors tables added up from rider points (`groupStandings`), MotoGP session alerts (AlertScheduler follows the chosen sport; MotoGP-class sessions mapped to the existing alert types), Greek strings. Not built yet: circuit pages, rider bio/career (the service's /riders endpoints are unverified), football. If a MotoGP screen shows a dash or "unexpected shape", send the Check data sources result and fix the field mapping in `api/motogp.js`.

V1.8 (2 Nov, app version 1.6.0): Football (sport chip -> Football, wordmark GOAL). `api/football.js` reads ESPN's public JSON (site.api.espn.com; unofficial, NOT reachable from the build sandbox, mapped from the known layout and tested on mocks only; Settings > Check data sources has 2 football rows). Screens in `screens/FootScreens.js`: Scores (7-day strip, league dropdown, live in red, 8 leagues incl. Super League Greece in `LEAGUES`), Tables (league standings), Match (header score, key events, statistics when published). No football alerts, no team/player pages yet. Football has no alerts; alerts follow F1 or MotoGP only.

V1.6.1: football kick-off reminders (`scheduleKickoff` in lib/notifications.js, identifier foot-<matchId>; session alerts no longer wipe them), followed football teams (`hooks/useFootFavs.js`, "My teams" filter, gold edge in lists), MotoGP weekend schedule card with session times. Still not built: football team/player pages, MotoGP circuit pages and rider careers (endpoints unverified).

V1.7.0 (2 Nov, app version 1.7.0): MotoGP menu now mirrors F1: Paddock tab (Riders by team / Teams, search, class dropdown, gradient boxes in team colour), followed riders (`hooks/useMotoFavs.js`, star on the rider page, gold edge in lists, "Your riders" cards on Home), top-5 standings card on Home. `scripts/fetch-history.js` (`npm run fetch:history`, run on the PC, needs internet): downloads PNG team logos from Wikimedia Commons and driver photos from Wikipedia for items missing in assets/logos and assets/drivers (best-guess name matching, report of what was not found; flags --logos --drivers --since <year> --dry); then run `npm run media`. PC version: `npm run web` / `npm run build:web`, `WebFrame` in App.js (centred max 560 px column), `web` block added to app.json by `npm run sync`, GitHub Pages workflow in `.github/workflows/web.yml`, see BUILD_WEB.md. New deps: react-dom, react-native-web, @expo/metro-runtime (web only; run `npm install`). Not mirrored from F1 in MotoGP: rules, season chart, what-if, predictions, head to head.

## Expo Go note
Expo Go (SDK 53+) does not include the `expo-notifications` native module; importing it crashes the app at startup ("Cannot find native module ExpoTopicSubscriptionModule"). `src/lib/notifications.js` therefore loads it lazily, and skips the require entirely in Expo Go (`Constants.executionEnvironment === 'storeClient'`) because Metro reports a failed require as a fatal error that try/catch cannot catch: in Expo Go alerts are off and Settings says so; a development build (`npx expo run:android` or EAS) enables them. Never import `expo-notifications` at the top of a file.

## Next
1. Build the APK (BUILD_APK.md) and test on the phone.
2. Photos: `assets/drivers/<jolpica id>.png`, `assets/cars/<team id>.png`, `assets/logos/<team id>.png`, then `npm run media` (see `assets/README.md`).
3. Widgets (needs a development build or the built APK route).
4. Re-check circuit lap records after each remaining 2026 race.
5. Live timing remains parked (OpenF1 paid tier).

## V1.8.0
- Run `npm install` (new deps: expo-image-picker, expo-file-system) then `npm run sync`, and build a NEW APK (`eas build -p android --profile preview`); new native modules.
- F1: search rows with photos + current first; champion look without gradient distortion; engineer above last 5; grid option + penalties chips; tire spelling + hide strategy; favourite past drivers/teams under "Past seasons"; team compare fixed; wordmark dropdown for sport; Home drivers/teams swap; accent colour (restarts app); News tab (RSS, in-app articles, per-source alerts); Welcome screen; Fun tab (own driver, fantasy seasons, simulate, export, team logos); NaN scrubbed.
- Photos/logos: run `fetch-media.bat` (or `npm run fetch:history`) on your PC; files go to assets/ named as in the app.
- Not done: MotoGP/football team profiles. Penalties: shown as chips, provider's final classification trusted (no re-ordering).
- Unverified against live services: RSS URLs, OpenF1 race_control wording, Jolpica titles endpoint. Chart crash not reproduced; hardened.
- Web/PC versions removed as requested.

## V1.9.0
- Fixes: chart touch crash (gesture state was reset by re-renders; reproduced and fixed), welcome screen/accent now saved under their own keys and confirmed before restart, Home refreshes after a race ends / when the app returns, News opens stories in the browser and is much lighter (15 at a time).
- Fantasy: real grid (real teams, logos, drivers) or made-up; add custom or real (any year) drivers; every driver has a profile (photo, number, skill, team, real career + fantasy); transfers window between seasons (team, number, release, new drivers, calendar); seasons kept in history (Season dropdown); results menu like the real one; compact exports for sessions and standings.
- No new native packages since 1.8.0: if 1.8.0 is installed a new APK is still needed for these JS changes unless you use updates (you don't), so build a new APK.

## V1.10.0
- Data: titles now from a built-in champions list (Jolpica filter returned 400); career totals use small count requests (much faster), points load separately; seasons list is one request; OpenF1 requests are spaced for its rate limit; Paddock search starts loading all drivers on open and shows current drivers instantly; news: Formula 1 official feed added (URL unverified), Autosport URL fixed, PlanetF1 replaced by Motorsport Week.
- Compare: opens on Career, season tab uses seasons both drivers raced (latest shared by default), rival picker lists only the first driver's seasons.
- Chart: lines were drawn shifted left on Android (nested Svg offset ignored); fixed. Stats "show all" panel replaced by a dimmed row. News: pictures load after cards appear, 8 more per tap.
- Saving: fantasy, welcome flag and accent are written twice (storage + file) and on app background. Save picture: gallery, else a folder you pick once, else share sheet.
- Fantasy: attributes (driver: pace, qualifying, racecraft, consistency, wet, aggression, age; team: car, reliability, development, pit crew), weather, safety cars, DNF reasons, penalties, pit stops, fastest lap, Q1-Q3; cars change season to season, drivers only age; random transfers + retirements; results screen like the real one, export with photos or compact. Talent ratings for real drivers are my estimates (src/fun/talent.js).

## V1.10.1
- News crash fixed: InteractionManager removed (plain timeout for lazy pictures).
- Prefs: updates apply to the latest state (ref), written to 'prefs' plus a durable 'prefs:v2' copy; newest copy wins on load. Home drivers/teams swap, gap mode and track/device time toggles now persist.
- Fantasy transfers: no rookies; vacancies filled by drivers stepping up from slower teams (cascade); retirement chance ~2% + 3%/year over 33 (cap 30%), never your own driver, every team keeps at least one driver.

## V1.11.0
- Paddock: lineups capped to the two race seats (most points keep them); team colour = most common OpenF1 colour among a team's drivers; static colours for audi/cadillac.
- MotoGP: MotoTeam profile (stats, riders, race by race via teamSeason), manufacturer colours (bikeColor). Football: FootTeam profile (ESPN teams/roster/schedule, unverified live), crest taps from scores, table and match.
- Fantasy: "End this save" (f.ended) + Stats tab (allTime in look.js: totals, champions, all-time drivers/teams, records, export); race export is compact only, with logos and small photos (SessionCard/StandingsCard take photo/logo); made-up grid defaults to 11 teams (22 drivers); rookies (from F2/F3/other, tag `from`) fill seats left after step-ups.

## V1.11.1
- Fantasy Stats tab: per-season summary (seasonSummary in look.js) with export picture (SummaryCard).

## V1.12.0
- MotoGP paddock: only the two main riders per team (mainRiders), team colours by team name then bike (estimates), rider/home colours via bikeColor. Team points still count every rider.

## V1.13.0
- Fantasy: undo (store keeps last 25 per fantasy, UndoChip), Fun settings (store.settings: evolve, transfers manual/auto/none, animSessions, animSeason; FunSettingsCard in Setup tab + FunSettings screen), full-screen Shows (components/Shows.js: TransferShow, ChampionShow, SessionShow), title decided / match point banners (look.js titleStatus), Stats tab rewrite (Fold lists, compact all-time rows, pretty season summary), retired drivers open from history, driver profile seasons dropdown + results Fold, Slide sliders (FunBits), TeamEditor (collapsed team cards, team stats editable in transfers), team `dev` stat removed (rare small random drift), nationality/flags (fun/geo.js) for made-up drivers and races, custom race laps input + country, default calendar = all races minus Sepang with 2026 sprint weekends, exports use surnames, logos next to team colour in team export.
- Save picture: remembered folder is used first (AsyncStorage + durable 'saveDir'), chosen once in Fantasy settings or on first save.
- Navigation: inner screens have back arrow + home button (Main.js detail uses HeaderBackButton from @react-navigation/elements, a transitive dependency).

## V1.14.0
- Offline history: `src/data/history.json` (generated from the open f1db dataset, seasons 1950 to 2025, ~1 MB; builder script kept in HANDOFF notes: python reading f1db `seasons/*/races/*/{race-results,qualifying-results,sprint-race-results,fastest-laps}.yml`). `src/api/history.js` answers careers, past seasons, teams list, past standings, season chart, driver and team search lists locally. `src/api/jolpica.js` uses it for every season before YEAR (2026) and falls back to live Jolpica for the current season and for anyone not in the file (rookies). Jolpica driver ids are bridged to the file by name (learned from every live row) and by the champions list (exact anchors).
- Fantasy "Real driver" search now uses the local list (instant), plus current-season newcomers from the standings.
- Presets (Fun → Presets): saved custom drivers (all attributes) and races kept without team or season, and full grid presets (edited with the same Setup screen, add teams, races). Add them from "Preset" buttons in Setup/Transfers, "My saved races" in the race picker, or start a new season from "My presets". "Save this grid as a preset" in Setup. Store: `library {drivers, races}` and fantasies with `preset: true` (hidden from the saves list).
- Never-retire shield per driver (Transfers) and switch in the driver editor (1.13.1 work shipped here).
- Race report card (winner, pole, fastest lap, biggest climb, driver of the day, retirements) on every race and the last race on the Season tab.
- Champion/transfer/session full-screen shows rebuilt: real gradient, more detail, in-flow Continue button and X; always mounted with `visible` (fixes the shows not closing).
- Accent colour: settings writes made before the saved prefs were read could overwrite the saved accent; they now wait for the load. App.js also reads the accent from prefs:v2.

## V1.15.0
- In-app updater (Android): tapping the update banner (Home) or "Check for updates" (Settings) downloads the release .apk into the app cache with a progress bar, then opens Android's installer (Android always asks for one confirmation; the first time it also asks to allow installs from this app). The downloaded file is deleted on the next start (`cleanupUpdates`), and only the newest download is ever kept. Falls back to opening the download link in the browser if anything fails.
- New native module `expo-intent-launcher` (run `npm install`) and permission REQUEST_INSTALL_PACKAGES, added by the new `app.config.js` (reads app.json, adds the permission; app.json untouched). New APK needed; the first install of 1.15.0 is manual, later updates use the in-app installer.
- Every update is still a full APK download (~100 MB). JS-only changes could be delivered with EAS Update (expo-updates is already a dependency) but that needs runtimeVersion/updates config in app.json and `eas update`.

## V1.16.0
- Fantasy is now tabbed with a bottom bar: Home (countdown, last race report, top 3, headlines), Calendar, Standings (Drivers/Teams), News, Stats, Settings (fantasy settings, archive, End save, Setup). Ended saves open on Stats (totals first). `Screen` got a `footer` prop.
- `src/fun/articles.js`: `buildNews(f, v, st, n)` writes articles from what happened in the save (race reports, title fight, teams, team-mate rows, rookies, profiles/rumours for custom drivers; real drivers only get facts from the simulation). Seeded, so stable.
- Archive: `archived` flag on a fantasy; Fun home shows an Archived section; restore from the save's Settings tab.
- MotoGP: weekend schedule grouped by day, result session chips, winner's 3 letters in the calendar (`winnersByEvent`), notification session chips (MotoGP hides P3 and Sprint Qualifying), MotoGP race result alert (`checkMotoResults`).
- News alerts: per-source baseline keys are no longer trimmed away (that silently muted a source after a few days); foreground check every 5 min.
- Predict picture: podium row first, pole below.
- NOT verified on device: tab UI rendering, MotoGP winners/alerts (live API), predict layout. Android bundle export passes.

## V1.16.1
- runtimeVersion is now computed in app.config.js (hash of dependencies + permissions + plugins). No manual "1"/"2" bookkeeping; app.json untouched.

## V1.16.2
- Fantasy bottom tab bar was hidden under the Android navigation area: padded with safe-area insets, plain Pressable tabs.

## V1.16.3
- app.config.js sets updates.checkAutomatically NEVER (native config, takes effect with the next APK build): OTA updates only download/apply when the user taps the banner or Settings button.

- 1.16.3 also: longer realistic articles (src/fun/articles.js) with stats + team-colour banner instead of photos, no profile link; back from an article/tab returns to the fantasy Home (beforeRemove listener).

## V1.17.0 (first public release)
- Big fantasy driver photos (driver page hero, season summary champion card) now sit directly on the card (new `Cutout` in FunBits) instead of a tinted rounded square; champion name shrinks to fit.
- Screen `revealKey`: content re-animates (staggered) on every fantasy tab change and scrolls to top.
- Version stays 1.x on purpose: Android versionCode = maj*10000+min*100+pat must keep growing, 1.0.0 would be rejected as a downgrade.

## V1.18.0
- Fantasy news rewritten (src/fun/articles.js v3): race reports, maiden wins, collisions/feuds with blame and stewards, penalties, safety-car/wet analysis, title fight, midfield, form, team features, regulation/testing/transfer/season-start pieces. Quotes only for made-up drivers/staff; real people are narrated without invented quotes.
- sim.js race model records who hit whom (`with`, `fault`, `hitBy`, `penNote`).
- NEW `src/components/LiveRace.js`: "Watch race live" lap-by-lap replay (positions, interval, pit stops, retirements, lead changes, 1x/3x/8x, pause, skip). Simulation is decided first; the lap chart is synthesised and ends exactly on the real result; closing commits the race.
- Fantasy profile shadow behind text, flags for all drivers, undo chip only after a change, Interval label, team-colour profile buttons, calendar winner letters, MotoGP alert bell, notification delivery fix, main tab bar restyle (see earlier sections).
- Not done / unverified: "standings seems to be cutout" (unclear what was meant), notification arrival on device.

## V1.19.0
- Save safety (src/lib/durable.js, src/fun/store.js): saves are written to .tmp then swapped in, previous good file kept as .bak; read picks the newest copy that parses; saves over 1.5 MB no longer go to AsyncStorage (Android row limit); new "T:<time>\n<text>" format halves memory. Root cause of "lost everything": a corrupt/truncated save made load() fail silently, state stayed empty and the next write overwrote the file. Now a failed load blocks writes (`blocked`) instead of overwriting.
- Audi colour now #A6123F (theme.js PINNED), was lime.
- Fantasy bar: Paddock tab (teams with both drivers, tap a driver for the profile) replaces Settings; Settings is a small gear top-right (toggles). Main app already had the gear in Header.

## V1.19.1
- Rafael Câmara number 51 (api/paddock.js FIXED_NUMBERS, fun/realGrid.js).
- LastSession: no longer falls back to the last race during a race weekend; practice without an official result uses best laps (`sessionBestLaps`, OpenF1 /laps). Unverified against live OpenF1.
- Fantasy settings gear moved into the native header (top right, next to the save name); toggles the settings tab.

## V1.19.2
- UndoChip only appears for a change made while the screen is open (was reappearing for 9s on every screen mount). Settings "Undo last change" button stays.

## V1.20.0 (JS-only)
- Home "Explore" strip: Race weekend, Leaderboard, Quiz, Records.
- `screens/ExploreScreens.js`: WeekendScreen (countdown, session timeline with done/live, Open-Meteo forecast per session via geocoding of the circuit location, "what to watch" from standings + circuit history), LeaderboardScreen (own picks + friends pasted as `F1P|name|round:pole:p1:p2:p3;...` codes, `lib/predFriends.js`; scored with `lib/predictions.score`), QuizScreen (history trivia + guess-the-driver from photos; best score in AsyncStorage `quizBest`), RecordsScreen (On this day / Records / All-time duel).
- `lib/trivia.js`: everything offline from `data/history.json` (records, onThisDay, circuitHistory, duel, quiz questions).
- `components/Anim.js`: CountUp, Bar, Pop.
- Fantasy: Paddock tab now has Grid / Principal / Rivalries. `fun/tp.js` + `screens/FantasyTP.js`: Team Principal mode (budget from prize money, upgrades for car/reliability/pit, 2-year contracts that stop poaching in `simulateTransfers`, press conference, board target, log); rivalries from clashes and close fights.
- Unverified on device: Open-Meteo calls, weekend hub layout, all new screens (Android bundle builds; trivia and tp logic tested in node). New screens are English only (not translated to Greek).

## V1.20.1 (JS-only, fixes)
- Leaderboard crash: `usePrefs()` returns `{prefs,...}` (was read as prefs). Name field added (opts.name).
- RoundScreen crash "map of null": stale grid result while switching session; lists now null-safe, `sessions` guarded.
- New screens use `<Screen header={false}>` (pushed screens already have the native header): removes the big gap at the top.
- Screen.flat: unique, stable keys (prefix by fragment) so blocks never remount/duplicate keys; ExploreScreens no longer double-reveals.
- Components that returned fragments (RacePicker, Setup, Explore/TP sub-views) now return `<View gap:12>` so boxes and buttons have gaps; Btn has marginVertical 4.
