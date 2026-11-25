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

## V1.21.0 (JS-only)
- News: driver/team emblem and subject banner removed. Articles use RN `Text` with `fontFamily: 'serif'` (17.5px, lineHeight 29); body lines starting `## ` are subheadings, `> ` are quotes. Race reports have new chapters (How the race unfolded, By the numbers, The bigger picture, Championship picture); new "Technical" articles for team car updates.
- Car development: `devCars` in `fun/sim.js` runs after each race weekend (seeded per race, chasing teams develop a bit faster), stores `f.carHist[teamId]` and `f.carDone[raceId]`. TP screen shows a car development table for all teams.
- Team Principal: upgrades are Safe or Bold gamble (about 38% flop, negative gain); paddock drama events with choices (`eventFor`/`resolveEvent` in `fun/tp.js`).
- Leaderboard: free online room via jsonblob.com (`lib/room.js`, no account, anyone with the code can read/write, 60s sync). UNTESTED against the real service (sandbox has no access).
- Stability: Fantasy memoization (`memo`), single fade on `revealKey`, seeded randomness in news so nothing flickers.
- Unverified on device: room sync, TP events/bold upgrade alert, new news layout, car dev table.

## V1.22.0 (JS-only)
- Gaps: `Screen` hides its own Header and top inset on any screen pushed on a stack (native header already there); components marked `.ghost = true` (modals, UndoChip, CodePrompt) are rendered outside the page flow so they no longer leave empty gap slots (that was the big gap in Fantasy).
- Home button moved to the top right (`components/HomeBtn.js`, wraps star/gear buttons set by screens).
- Popups: `lib/dialog.js` exports an `Alert` with the React Native API; `components/DialogHost.js` (mounted in Main.js) draws a themed card. Screens import `{ Alert } from '../lib/dialog'`.
- Friends room: now ntfy.sh (no account; the room code is a random topic `f1c-...`, created locally). The old jsonblob version returned 403. Untested against the real service.
- Articles (real news and fantasy): system sans-serif (`fontFamily: 'sans-serif'`) 17/27 instead of the Rajdhani display font.
- Themes: Settings > Theme (Dark / AMOLED black / White). `applyTheme` in theme.js runs at start-up in App.js after the accent; app restarts to apply. Hard-coded white text on cards became `colors.onSoft`. White theme is best effort (photo heroes tuned for dark).
- Dev menu: tap About 5 times in Settings, code `op81`. `screens/DevScreen.js`, `lib/dev.js` (perm layer in AsyncStorage `dev:ov`, temp layer in memory): colours, photos (gallery or URL), team colours, fantasy editor (temp edits can be reverted), options editor, storage browser/editor, actions, info.

## V1.23.0 (JS-only)
- Home layout: Home is built from cards keyed next/explore/mine/last/standings (`lib/homeLayout.js`, option `homeLayout` = [{k,on}]); Settings > Home layout reorders and hides them.
- Font and text size: options `font` ('default' | 'system') and `textScale` (0.9-1.3), applied in `components/Text.js` through `ui.font` / `ui.scale` (set in usePrefs `sync`). Raw RN Text (articles) is not scaled.
- Race day: `screens/RaceDayScreen.js` (route RaceDay, first card in the Home Explore strip). OpenF1 `sessions/drivers/position/weather/race_control/intervals` with `session_key=latest`, refresh 15 s live / 60 s otherwise. UNTESTED against the real API (sandbox cannot reach it).

## V1.24.0 (JS-only)
- Team-mate battles: `localTeammates(id)` in `api/history.js` (offline history, per season vs each team-mate: qualifying = grid slot, race = finishing order, points; seasons with fewer than 3 shared races hidden) and `screens/TeammatesScreen.js` (route Teammates, button on the driver page).
- Fantasy news: "Rivalry watch" Feature article every 4th race from `rivalries()` (tp.js): story so far, head to head, quote (made-up drivers only), what comes next.
- Offline/speed: `lib/warm.js` loads standings and last race 4 s after start-up into the shared cache.
- Alerts: option `raceMorning` schedules an 08:00 local reminder on race/sprint day (`scheduleSessionAlerts`). Settings > Notifications.
- Not done (asked for): MotoGP/football upgrades, share cards/streaks, strategy view, custom alert sounds (needs a native build), push alerts for pole/red flag (needs a server).

## V1.25.0 (JS-only)
- Leaderboard: "Your streaks and badges" card (current/best streak of rounds with 3+ points, badges) and a Share my results button (system share sheet, text).
- MotoGP standings: "Title picture" card for the current season (rounds left, max points still available: 37 per MotoGP weekend, 25 for other classes, riders still in the fight). Needs the OpenF1-free MotoGP events call; untested live.
- Football scores: live matches first in each league and a live count.
- Stability: ran ESLint (no-undef, rules-of-hooks) over src and App.js: clean. Only duplicate keys in i18n/el.js (harmless).
- Already existed: race strategy view (components/Strategy.js in RoundScreen), football "My teams" filter.
- Not possible without a native build / server: custom alert sounds, pole/red-flag push alerts, widgets.

## V1.26.0 (JS-only)
- Backup/restore: `lib/backup.js` (durable keys fun:v1, prefs:v2, welcomed, accent + all non-cache AsyncStorage keys, one JSON file). Backup writes into the remembered save folder or opens the share sheet; restore picks a folder (Storage Access Framework), lists backup files, writes everything back and restarts. UNTESTED on device.
- Offline mode: option `offline` -> `ui.offline`; `lib/cache.js` serves saved data only (any age) and `liveJSON` returns status 0.
- Tour: `components/Tour.js`, shown when `tourDone` is not set (also once for existing users), replay from Settings.
- Fan zone: `screens/FanZoneScreen.js` daily 5-question quiz with streak (`dailyQuiz` seeded by date in lib/trivia.js; keys fanDaily, fanDotd), driver-of-the-day vote for the latest race (local only). Entry in Home Explore strip.
- Team Principal: staff (designer, reliability head, commercial director, wages 1 per race) and sponsor deals (3 offers per season, points target by a deadline race; paid when reached, reputation loss when missed). `hire/fire/sponsorOffers/pickSponsor` in tp.js.
- Not built yet from the wish list: mid-race strategy calls in live commentary, season prediction league power-ups, historic what-if changes (WhatIf screen exists), faster cold start work beyond cache warm-up, accessibility.

## V1.27.0 (JS-only)
- Season replay (Home > Explore): re-run any season from the offline history with other points systems, remove a driver, drop worst results. Sprint points not included.
- Prediction league power-ups: 3 Double-downs per season, a yes/no bonus question each round (+2). Codes stay backward compatible. Season-champion trophy on the Leaderboard.
- Live race: strategy calls (team radio) for your Team Principal team. Flavour only, the result is unchanged.
- Accessibility: Colour-blind friendly option (blue/orange, restarts the app), screen-reader labels on tabs/cards/live controls, larger tap areas.
- Route: eas update --branch preview --platform android --message "1.27.0"

## V1.28.0 (JS-only)
- Season replay: sprint points now included (season totals as scored), with a Counted/Left out switch. Checked: 2021 Verstappen 395.5, 2022 Verstappen 454.
- Driver page: Form card (avg finish, points, grid gain, trend, scoring streak, last 5).
- Live race strategy calls now matter: right calls give TP budget and hype, wrong ones cost them (race result itself is unchanged). Logged in the TP log.
- Fan zone: Higher or lower game (offline history, streak saved in fanHL).
- MotoGP rider Form card; football team page Next-match countdown.
- Faster start: 10 secondary screens are loaded on first open (getComponent).
- Route: eas update --branch preview --platform android --message "1.28.0"

## V1.29.0 (JS-only)
- Circuit page: Past winners card (offline history, matched by Grand Prix name): top 3 winners, pole-to-win rate, year list.
- Race tyre strategy: stops column and lap axis (OpenF1 data, unverified live).
- Fantasy: Hall of fame in the Stats tab (champions per season, title leaders, retired numbers for 2+ titles; src/fun/legends.js).
- Fantasy: Season rules card in Settings (points table, reliability Bulletproof/Normal/Fragile) via f.rules, applies to future races.
- Tab bar icon pop animation (respects reduced motion).
- Route: eas update --branch preview --platform android --message "1.29.0"

## V1.30.0 (JS-only)
- Race page: Race stats card (biggest climbers/fallers from the grid via Jolpica; fastest pit stops via OpenF1 /pit, label depends on whether stop_duration or lane time is published) (components/RaceStats.js, api/openf1.js pitStops). OpenF1 part unverified live.
- Race page: Forecast card for upcoming weekends (Open-Meteo, shared lib/forecast.js, also used by the Weekend screen).
- Search everything (Home > Explore > Search): drivers and teams from the offline history, circuits, rules text, app pages (screens/SearchScreen.js).
- Route: eas update --branch preview --platform android --message "1.30.0"

## V1.31.0 (JS-only)
- Time machine (Home > Explore): pick any past race (offline history) and watch it in the live-race view. Real grid, finishing order and retirements; the laps in between (stops, retirement laps, gaps, lap count from circuit length) are reconstructed.
- Driver DNA: six-axis radar on the driver page Career tab, from every race in the history (api/history.js dnaOf, components/DriverDNA.js).
- Race Director mode: flag chip in the live race bar (fantasy). Stewards decisions on contacts (penalise A/B or racing incident) and safety-car calls, judged against who was actually at fault in the sim. Record kept in f.steward and shown on the fantasy Stats tab.
- Paddock rumours (fantasy Home): three rumours about the next race, Believe or Doubt, judged after the race against the real simulated result; score = 4 + 20 x (1 - chance of the side picked). Picks stored in f.rumours (fun/rumours.js, screens/FantasyRumours.js).
- Route: eas update --branch preview --platform android --message "1.31.0"

## V1.32.0 (JS-only)
- Fantasy depth: mid-race rain showers (about 1 race in 8, dry races only, not sprints). Half the field gets the intermediate call right, more variance and crashes, wet skill matters. Result flag `shower` on the first race row, news article for it, and a "Rain!" event in the live race view.
- Offline mode now also covers the friends room (shows the saved list), the update check (skipped) and news (saved feeds only). Forecast card says when it is saved data.
- Stability: 12 simulated seasons with showers and the news builder run without errors; lint and Android bundle clean.
- Not built (no answer given on the new-idea question): Pit wall duel, Bet slip league, Season story mode, Silent commentator.
- Route: eas update --branch preview --platform android --message "1.32.0"

## V1.33.0 (JS-only)
- Fun tab: all games listed in horizontal rows (Daily games, Reflexes, Predict and play, What if) (FunScreens.js GameRows).
- Lights out reaction game, Guess the circuit (clue based, from circuits.js, works offline), Mystery driver (daily Wordle-style, history data) in screens/GameScreens.js. Shared helpers lib/kv.js.
- Driver cards (lib/cards.js, screens/CardScreens.js): packs of 3 real drivers, rarity from career (legendary = champion, epic 10+ wins, rare = win or 3 podiums). Packs earned once a day: Mystery solved, circuit score 12+, lights under 0.3 s, quiz 50+ pts, Fan zone daily quiz. Two starter packs. Storage key cards:v1.
- Driver page, Career tab: Career timeline (team stints + title stars) (components/DriverTimeline.js, history.js driverTimeline).
- Calendar tab: "Add to my calendar" builds an .ics of upcoming sessions (races, plus qualifying, or every session) with a 30 min reminder and shares it (lib/ics.js, api/openf1.js yearSessions). Needs OpenF1; unverified live.
- Guess the circuit uses clues, not outlines: outlines are only available online.
- Route: eas update --branch preview --platform android --message "1.33.0"

## V1.34.0 (JS-only)
- Race page, Race tab: Race pace card (average clean lap per driver as gap to the quickest; pit-out laps, lap 1 and laps over 7% slower than the driver's median excluded) (api/openf1.js racePace, components/PaceCharts.js).
- Race page, Qualifying / Sprint Qualifying: Qualifying gaps card (gap inside the last segment each driver reached) and team-mate gaps (deepest shared segment). Logic checked against hand-made data; OpenF1 field names unverified live.
- Home "Your drivers" tiles show the last race result (Jolpica last results).
- Route: eas update --branch preview --platform android --message "1.34.0"

## V1.35.0 (JS-only)
- Reliability report (Home > Explore, Search): retirements per team for any season, split into mechanical / accident / other from the result status text, finish rate, recent-form arrow, tap a team for its list, top mechanical causes. Past seasons use the offline history, the current one Jolpica (api/jolpica.js seasonStatuses, lib/reliability.js, screens/ReliabilityScreen.js). Status classification is keyword based; unusual statuses fall under "other".
- Team colours (Settings): tint the whole app with a team's colour (any team or "my first favourite team") instead of the accent colour. Applied at start-up in App.js, so changing it restarts the app. Opt: teamTheme.
- Route: eas update --branch preview --platform android --message "1.35.0"

## V1.36.0 (JS-only)
- Dominance ranking (Home > Explore, Fun tab, Search): every season scored on race wins share for driver and team, title margin; tabs Most dominant / Closest fights / Best teams (lib/dominance.js, offline).
- Team family trees: every current team with its predecessors (renames, takeovers), eras, starts, wins and titles (api/history.js teamEras).
- Rookie report: this season's rookies (no earlier history) with results and gap to their team-mate.
- Stat of the day: new Home card (can be hidden or moved in Settings > Home layout), one stat per day: on this day, birthdays, career numbers, Grand Prix facts, dominant seasons, live title gap.
- Year in review (Fun tab): shareable card built from games, predictions, cards, favourites on the phone.
- Flag quiz (Fun tab): ten flags, four countries each; 9+ earns a card pack.
- Quiet hours (Settings): no alert notifications between chosen hours, race alerts can stay on.
- Haptics (Settings): vibration feedback in games, card flips and radio calls (RN Vibration, no new package). Sound effects need a new APK and are not included.
- Route: eas update --branch preview --platform android --message "1.36.0"

## V1.37.0 (JS-only)
- Grid penalties tracker (Home > Explore, Search): compares each driver's qualifying position with their race grid slot, by race / driver / team, pit-lane starts marked. Seasons 2023 onwards (race grid set by Qualifying). Online only (api/jolpica.js gridData, lib/gridDrops.js; logic harness-tested, endpoints unverified).
- Team radio game (Fun tab): who said it, 8 of 10 retold radio moments per round, 7+ earns a card pack. Moments checked against Formula1.com's memorable radio list; lines are paraphrased, not verbatim.
- Share buttons (components/ShareCard.js): Stat of the day, Dominance list, each Grid penalties race card share as a picture (text fallback).
- Route: eas update --branch preview --platform android --message "1.37.0"

## V1.38.0 (JS-only)
- Race recap card (Home, can be hidden in Settings > Home layout): winner, podium, pole conversion, biggest climb, fastest lap, retirements, title gap; shareable picture (lib/recap.js, components/RaceRecap.js). Logic harness-tested.
- Birthday and win-anniversary alerts (Settings > Notifications, off by default): 9:00 local on a favourite driver's birthday and on the anniversary of their first win, from the offline history. Local one-off notifications with identifiers bday-...; rescheduled on every launch (lib/bdays.js, scheduleBirthdays). Not verified on a device.
- Pit stop timer (Fun tab): tap four wheels as they light, 0.5 s penalty per wrong tap, under 2.0 s earns a card pack.
- Driver number quiz (Fun tab): from this season's standings (permanentNumber), needs a connection once; 9/10 earns a pack.
- Career duel (Fun tab): who has more wins, poles, podiums, starts or titles; streak game, 10 earns a pack. Offline.
- Build the grid (Fun tab): put drivers into the right teams for a season 2000 to 2025 (regular seats = the two drivers with the most starts); perfect grid earns a pack. Offline.
- Fun row "Reflexes and quizzes" now holds Lights out, Pit stop, Flags, Team radio, Number quiz, Career duel, Build the grid, Year in review.
- Route: eas update --branch preview --platform android --message "1.38.0"

## V1.39.0 (JS-only)
- Tyre usage card (Race page > Race tab, under the Tire strategy chart, shown with it): share of race laps on each compound, stints, average and longest stint (with the driver), most common number of stops, and each team's compound mix with stops per car. Shareable picture. Built from the same OpenF1 stints as the strategy chart (lib/tyres.js, components/TyreUsage.js; raceStints now also returns the team name). Logic harness-tested, OpenF1 data unverified here.
- Route: eas update --branch preview --platform android --message "1.39.0"

## V1.40.0 (JS-only)
- Season travel (Home > Explore, Search): great-circle kilometres from each round to the next, total, longest/shortest/average leg, times around the Earth, shareable summary. Uses Jolpica circuit coordinates (needs a connection once per season, then cached). A lower bound, stated in the screen (lib/travel.js).
- Title picture: standings before and after any race of any season (position arrows, points gained, gap to the leader before/after, new leader flag), shareable. Uses seasonPoints (offline for past seasons without sprint points; online includes sprints). Ties are listed alphabetically with a note, because the official tie-break needs race results (lib/titleSwing.js).
- Team-mate battles: type a driver, see every team-mate with 3+ shared races, career totals for grid slot, finishing order and points, expandable per season (screens/ExtraStats.js, offline, localTeammates). The Driver page already had per-season team-mate battles; this adds the career view per pair.
- Route: eas update --branch preview --platform android --message "1.40.0"

## V1.41.0 (JS-only)
- Pinned pages (Settings > Pinned pages, up to 8): pinned screens appear as a chip strip at the top of Home (new Home card "Pinned pages", can be moved or hidden). The list of parameter-free screens now lives in lib/pages.js and is shared with Search.
- Overtaking by circuit (Home > Explore, Search): average places finishers moved between grid and flag at every Grand Prix, since 2010 / 2000 / all time, most movement or most processional, with pole win rate and average winner start slot. It measures position change (includes pit-stop and strategy effects), stated on the screen. Offline (api/history.js passingByRace).
- Compare two seasons: any two seasons side by side (races, different winners, cars per race, finish rate, champion and points, title margin, most wins/poles, top team). Offline (seasonFacts). Shareable.
- True or false (Fun tab): swipe a statement card right for true, left for false (buttons too). Statements are generated from the offline history (race winners, pole sitters, champions, birth years, winner start slot), so every answer is checked against data (lib/tfFacts.js). Streak game, 10 earns a card pack.
- Route: eas update --branch preview --platform android --message "1.41.0"

## V1.42.0 (JS-only)
- Season review (Home > Explore, Search): champion and margin, key numbers, how the title lead changed hands and when the champion took it for good, best comeback win, every winner with grid slot. Offline, seasons up to the newest in the history (api/history.js seasonStory, seasonFacts); shareable.
- Debuts and farewells: drivers whose first or last season in the history is the chosen year, with debut race result, or last race and career wins. The newest history season has no farewells (nobody can be called finished yet); early seasons include one-off entries (api/history.js debutsOf).
- Circuit comparison: two circuits side by side using the circuit pages' own data (lap length, turns, laps, distance, first GP, lap record), with bars; shareable.
- Winner guess (Fun tab): a year and Grand Prix from 1990 to 2025, pick the winner out of four (distractors from the top-10 grid and finishers), optional team clue for half a point, 7+ of 8 earns a pack. Offline.
- Route: eas update --branch preview --platform android --message "1.42.0"

## V1.43.0 (JS-only)
- Driver milestones (Home > Explore, Search): for every driver on this season's grid, the next round-number career milestone (starts, wins, podiums, poles) with progress bars, plus a "closest milestones" list (within 5) with a Share button. Uses driverCareer (offline history + the live season); sprint races are not counted as starts. Needs a connection; live data unverified here.
- Home-race heroes: record at Grands Prix held in each driver's own country (most home wins / podiums, or per country). Any GP in the country counts (Monza and Imola for Italians, European GP at the Nürburgring for Germans); the 1950s Indianapolis 500 rounds are excluded. Offline (api/history.js homeRecords).
- Podium pairs: pairs of drivers with the most shared podiums, 1-2 finishes and front rows, all time / since 2000 / since 2010, with the number of those as team-mates. Offline (podiumPairs).
- Connections (Fun tab): 12 drivers, 3 hidden groups of 4 (nationality, world champions, teams raced for, decade of first race); each driver fits exactly one group, 4 mistakes, "one away" hint, solving earns a pack (lib/connections.js).
- Hangman (Fun tab): driver surnames, circuit locations and team names, 7 tyres, 5 solved in a row earns a pack (lib/hangman.js).
- Route: eas update --branch preview --platform android --message "1.43.0"

## V1.44.0 (JS-only)
- Spoiler guard (Settings > Spoiler guard, off by default): hides Home last-session/recap/standings/your-drivers cards, the Standings list, race results on the Round screen and calendar winners behind a tap (lib/spoiler.js, components/SpoilerGuard.js). Taps are remembered until the app closes; "Hide everything again" button. Live timing, the race-day dashboard and other detail screens (driver pages, charts, strategy, pace) are not hidden. Stat of the day drops its title-fight line while hidden.
- Driver names (Settings > Driver names): Full / Surname / Code, applied in the shared DriverName component, so it covers standings, results, Home and Paddock rows (everything built on ResultLine). Headings, quizzes, charts and some detail screens always use full names. Codes come from the history (codeOf), first three letters of the surname for unknown drivers.
- Biggest comebacks (Explore, Search): wins and podiums ranked by grid slot (pit-lane starts and the 1950s Indianapolis 500 excluded), all time / since 1990 / since 2010. Checked: Watson 1983 P22 to P1, Barrichello 2000 P18, Verstappen 2024 P17, Raikkonen 2005 P17.
- Closest number (Fun tab): guess a driver's career starts, wins or podiums with a slider; 5 drivers, 100 points each by closeness, 350+ earns a pack. Poles are not used because the history counts grid P1, which can differ by one or two from official poles (e.g. Hamilton shows 105, official 104).
- Lap tapper (Fun tab): per circuit, tap in the green apex zone of each corner (up to 14); lap time = the circuit's lap record plus time lost; best per circuit kept; within 2.0 s earns a pack.
- Known data note: poles shown from history (Home-race heroes "from P1", Driver milestones poles) are grid-P1 counts.
- Route: eas update --branch preview --platform android --message "1.44.0"

## V1.45.0 (JS-only)
- `lib/gameSave.js`: `useGameSave(key, make)` (whole state at kv `game:<key>`, resumes unless `over`), `useRun(key)` (round games: seed, i, score; rounds are rebuilt from the saved seed), `useLeaveGuard(active)` (beforeRemove -> "Leave the game?" via lib/dialog Alert), `useTimers()` (timeouts cleared on unmount). Applied to True/False, Flag, Team radio, Number quiz, Career duel, Build grid, Winner guess, Closest number, Connections, Hangman, Guess the circuit; Mystery driver (already saved daily) has the guard. Pit stop and Lap tapper are not covered (they are single-attempt timing games).
- True/False: the verdict stays on the card for 1.7 s, then it slides away.
- Fun home: big hero boxes (Fantasy, Games, Your driver, Cards). New `screens/FunHubs.js`: `FantasyHub` (saves, archived, new, presets, settings) and `FunGames` (rows). Routes `FantasyHub`, `FunGames`.
- Driver numbers dimmed (opacity 0.55 to 0.65) in driver cards/rows, Grid, MotoGP.
- News: favourites filter (News screen + `newsFavOnly` alerts), `newsLog`/`bgRuns` diagnostics shown in Settings > News alerts, battery guidance.
- Career curves (`screens/CareerCurves.js`), Changelog section above About (`data/changelog.js`, add an entry per release), title swing countback (`finishCountsAt` in api/history.js), Milestones keeps last result (kv `milestones:last`).
- Unverified on device: everything above; news background delivery depends on Android battery settings.

## V1.46.0 (JS-only)
- Streaks (`streakBoard` in api/history.js, `screens/Streaks.js`): longest consecutive win/podium/points runs per driver; skipped races do not break a run. Checked: Verstappen 10 wins (2023), Schumacher 19 podiums.
- Engine suppliers (`data/engines.js` written by hand for 2014 to 2025, `engineBoard` in history.js, `screens/EngineHistory.js`). Titles go to the supplier of the champion's most-used team that year; poles = grid P1. Red Bull and sister team stay under Honda (RBPT from 2022). Update the table when a season is added (2026 brings new suppliers).
- Alerts inbox: `lib/inbox.js` (log written by `notifyNow`, `upcomingAlerts()` lists what is scheduled with Android), `screens/AlertsInbox.js`, linked from Settings > News alerts.
- Storage manager: `screens/StorageScreen.js`, clears downloaded data (`c:`), saved games (`game:`), logs; fantasy and settings are never cleared.
- Games: Driver wordle (`lib/guessDriver.js`, `screens/GuessDriver.js`, 8 guesses, saved), Timeline sorter (`lib/timeline.js`, `screens/TimelineSorter.js`, built from debuts/first wins/first titles in the history). Both use useGameSave/useRun and the leave guard.
- Trophy room (`screens/TrophyRoom.js`): trophies map to the card-pack keys the games award; personal bests from kv.
- Home sections fade in (Reveal). Changelog entry added.
- Postponed (needs a new APK): Home screen quick actions.
- Unverified on device: all of the above.

## V1.47.0 (JS-only)
- Pole to win (`poleConversion` in api/history.js, `screens/PoleConversion.js`): pole = grid P1, so a grid penalty can differ from the official record by one.
- Race preview (`circuitSummary` in history.js, `components/RacePreview.js`, shown on the race detail page): past winners, most wins, pole win rate, favourites' record there. Matches `meeting_name` to the history race name; hidden when no match.
- Favourites digest (`lib/digest.js`, `screens/FavDigest.js`); `digestLine` adds "Your drivers: HAM P3, VER P1" to the F1 race-result alert body.
- Saved articles (`lib/saved.js`, bookmark on News stories and in the article reader, `SavedNewsScreen` in NewsScreen.js); article text is attached when a saved story is opened. Recent searches (kv `recentSearch`) in SearchScreen.
- Games: Race weekend bingo (`screens/RaceBingo.js`, saved card), Odd one out (`lib/oddOne.js`, `screens/OddOneOut.js`). Play calendar (`components/PlayCalendar.js` in Trophy room); `kvSet` marks `playDays` for keys matching `^game:|:best$|^daily`; card packs at 7 and 30 day streaks.
- Fantasy hub: Continue button. Start-up: Fantasy, Preset, Foot, Moto, Explore and Fun-hub screens are now loaded lazily (`getComponent`) from Main.js.
- Unverified on device: everything, in particular the lazy screens opening from every entry point, the preview card name matching, and article saving.

## V1.48.0 (JS-only)
- History helpers in api/history.js: `winDroughts`, `winless`, `placesGained`, `careerStats`, `careerTeams` (share a cached `perDriver()` race list). Screens `RankLists.js` (Droughts, Winless, PlacesGained). Checked: Raikkonen 2013 to 2018 gap, Perez 191 races to first win, Hamilton 34-race drought. Places gained: old eras look huge (big grids), noted on screen.
- Season progress strip (`screens/SeasonStrip.js`): seasonPoints + winnersByRound + jolpicaSchedule; works live for the current year.
- Games in `screens/QuizPack.js` with generators in `lib/quizPack.js`: Name that season, Career path, Stat showdown (3 lives), Match pairs. All saved/resumable with the leave guard. Drivers with 100+ starts only.
- Result alerts: `resultsFavOnly` + `alertDrivers` (opts) in `lib/resultAlerts.js` / `lib/digest.js` (`digestLine(rows, only)`), chips in Settings > alerts. Applies to race, sprint and qualifying alerts.
- Weekend mode on Home (`weekendMode` opt, default on): 3 days before the first session until 12 h after the last. Home tidy-up: `OFF_BY_DEFAULT = ['stat','recap']` only for people who never saved a layout.
- Fantasy TP: six more paddock events (`MORE_EVENTS` in fun/tp.js).
- Stability: lint clean; route-name cross-check script found no navigate() to a missing route.
- Unverified on device: all of the above.

## V1.49.0 (JS-only)
- Stats (`api/history.js`): `gridSlotOdds()` (era tabs, wins/podiums by grid slot), `lineupStrength()` (top two scorers per team and season as a share of the season's race points), `titleHistory()` (champion, margin, wins; clinch round only for 1991 to 2020, no drops or sprints). Screens in `screens/TitleStats.js`: GridOdds, Lineups, TitleHistory.
- Title clinch is built as "Title history" with the clinch round for 1991-2020. Outside that range only margins are shown.
- Rivalry: `components/RivalryCard.js` (Home card key `rivalry`, uses driverStandings + seasonPoints), pick screen `screens/Rivalry.js`, pair stored in `prefs.opts.rivalry` as [driverId, driverId].
- Share: `components/ShareResult.js` (`ShareResult` card as picture or text, `ShareTextBtn`). Wired into the ten-round games (QuizPack), Connections, Hangman and the three new games. Other older games do not have it yet.
- Games in `screens/TriviaGames.js`: Trivia ladder (`lib/trivia.js` `ladderQ`, saved as game:ladder, 3 lives), Daily puzzle (same 5 questions per `today()` seed, kv `daily:puzzle`, streak `daily:puzzleStreak`), Word search (`lib/wordSearch.js`, saved as game:wordsearch).
- Speed pass: all history helpers measured at under 25 ms in node; the cost is the first JSON parse (~300 ms in node). `lib/warm.js` now runs `driversMeta()` 9 s after start via InteractionManager.
- Unverified on device: all of the above, share sheet, rivalry with live data.

## V1.50.0 (JS-only)
- `api/history.js`: `ageRecords()`, `hatTricks()`, `debutSeasons()`, `dnfRates()`. Screens in `screens/AgeStats.js` (AgeRecords, HatTricks, BestDebuts, DnfRates). Checked: Verstappen youngest winner (18y227d), Fagioli oldest winner, Vettel youngest pole, Schumacher 22 hat-tricks, Norris lowest DNF rate.
- Hat-tricks only (pole + win + fastest lap); a true grand slam needs laps led, which the history lacks.
- `screens/ComparePicks.js` (route ComparePicks): saved predictions vs `sessionResults`, accuracy excludes bonus/double.
- `screens/NewGames.js`: HigherLower (kv game:hilo), Bracket (game:bracket), Scramble (game:scramble); all use useGameSave + leave guard, ShareResult at the end.
- Season calendar export already existed (Calendar screen, `lib/ics.js`); not rebuilt.
- Stability pass: route cross-check, lint, bundle clean; leave guards on all new games. No on-device test.
- Unverified on device: everything new in 1.49.0 and 1.50.0.

## V1.51.0 (JS-only)
- `api/history.js`: `teamSeasons()`, `gpList()`, `gpEditions(name)`. Checked: Ferrari 2004 = 262 pts, 15 wins; Monaco 71 editions, Senna 6 wins, Panis won from P14 in 1996.
- `screens/TeamStats.js`: TeamCurves (wins total or share of season points; renamed teams are separate lines), Rematch (every edition of a GP by name).
- `screens/Extras151.js`: Poster (ShareCard picture, 3 stats, colour), FavCircuits (kv `circuitMarks`, 25 circuits in `data/circuits.js`), Freshness (reads `c:` cache keys, parses `"t"` from the first 40 chars, removes keys per host to refresh).
- `screens/ColourGames.js`: Livery (team colours as the app shows them, only ~11 teams are unambiguous answers; options at least 70 apart in RGB), SpeedRound (60 s, wrong = -5 s, claims built from `ladderQ`).
- Unverified on device: all of it, plus poster photo framing and the share sheet.

## V1.52.0 (JS-only)
- Crash isolation: `components/ErrorBoundary.js` now exports `guardScreen(C, name)`; every route in `Main.js` is wrapped (getComponent and component props, except the tab navigators). A failing screen shows Try again / Go back instead of replacing the whole app. `lib/crashlog.js` records caught errors and uncaught JS errors (global handler installed in App.js); `screens/CrashLog.js` (Settings > More > Crash log) lists and shares them. Native crashes (OOM, native module) cannot be recorded.
- Card packs: `CardScreens.js` hides cards from a pack until all of them are flipped (collection counts subtract pending pulls).
- Settings: sections regrouped (Look and feel, Home and content, Alerts, Language and speed, Data and updates, More) with `s.group` headings.
- `screens/StatsHub.js` (route StatsHub, first Explore tile on Home): grouped, searchable list of every stats route; descriptions come from `lib/pages.js`.
- Share on stats screens: `lib/shareRoutes.js` set + floating button in `components/Screen.js` using `shareScreenImage` (`snapshotContentContainer`); falls back to text.
- New stats (`api/history.js`): `journeymen()`, `gridAge()`, `calendarGrowth()`, plus `driverFacts()` and `raceSample()` for games. Screens in `HistoryTrends.js`.
- `WatchList.js` + `lib/watchlist.js`; TimeMachine now reads `route.params.year/round`.
- Monday recap: `lib/weeklyRecap.js`, called at the start of `checkResults`; Settings switch `mondayRecap`. Runs on app open, and in the background only when result alerts are on.
- Games in `GridGames.js`: DriverGrid (kv game:drivergrid), SurnameChain (game:chain), GuessYear (game:run:gyear).
- Greek: appended entries to `i18n/el.js` (titles, buttons, short messages for 1.45-1.52 screens). Long notes remain English.
- The cause of the user's "crashes no matter what" is NOT confirmed. Unverified on device: everything, including whether `guardScreen` catches it.

## V1.52.1 (JS-only)
- Likely cause of the "app isn't responding" crashes: `driversMeta()` rescanned all races for every driver (about 20M steps; 300 ms on a laptop, far longer on Hermes) and 1.49 started calling it 9 s after every launch via `lib/warm.js`. Now a single pass (2 ms), `titlesOf` cached through `titleMap()`, warm-up removed. Same output checked (259 drivers, 35 champions). Not confirmed on a device.
- `lib/crashlog.js`: session breadcrumbs (`sessionState`), freeze detector (1 s timer more than 4 s late), unclean-exit report on next launch; `guardScreen` records the open screen with `crumb()`. All show in Settings > More > Crash log.

## V1.53.0 (JS-only)
- `api/history.js`: `constructorTitleHistory()` (H.cs position 1 vs 2, no clinch round), `seasonParity()`, `openersClosers()`, `pointsPerStart()` (share of the race winner's points; 40+ starts), `teammateQ(r)` (year >= 1970, exactly two drivers with 3+ races in a team, driver on at least half the season; distractors from other teams that year). Checked: 2025 McLaren 833 v Mercedes 469; 2024 McLaren 666 v Ferrari 652; 76 openers, 19 seasons won both.
- `screens/Stats153.js` (ConstructorTitles, SeasonParity, OpenersClosers, PointsPerStart), added to SHARE_ROUTES, StatsHub, pages.js.
- `screens/Report.js` (route Report; Settings > More > Send a report): version, update id, notification permission, alert settings, bgRuns, newsLog per-source lines, inbox and crash log; shares as text.
- `screens/MyCard.js` (route MyCard): ShareCard with first favourite driver/team, trophies (TROPHIES now exported from TrophyRoom), cards owned, top four BESTS.
- Pins: `usePins()` in FunScreens (kv `pins:games` = list of routes); star on every game tile; `PinnedRow` at the top of the Fun menu and the games list. The Fun menu no longer has the "Your driver" hero; FunProfile route and the Search entry remain.
- `screens/Games153.js`: DuelScreen (kv game:duel; turns alternate, three lives each, hand-over screen before each turn) and TeamMateGameScreen (useRun 'mate', 10 rounds, kv mate:best).
- Unverified on device: all of it, including the star taps and the share sheet. The news-notification fault is still undiagnosed; ask for the Report text.

## V1.54.0 (JS-only)
- Streak shield: `lib/shield.js` (kv `shield:v1` {have, covered, granted}); pure `settle()` covers exactly one missed day inside a live streak, grants one shield per 7-day run (keyed by run start). Applied when `components/PlayCalendar.js` opens (Trophy room); covered days show gold. Checked with 4 cases. A gap of 2+ days, or opening the calendar only after the second missed day, ends the streak.
- Backup reminder: `components/BackupNudge.js` on Home (above the sections); kv `backup:since`/`backup:last`/`backup:snooze`; `exportBackup()` in `lib/backup.js` now records `backup:last`; Settings switch `backupNudge`. Due after 7 days.
- "Home stat shortcuts" duplicated the existing Pinned pages (prefs.opts.pins, max 8, Settings and Home chips). Instead StatsHub rows got a pin toggle for the same list.
- Career bingo: `bingoCard/bingoFits/bingoSearch/bingoCheck` in `api/history.js`, `CareerBingoScreen` in `Games153.js` (kv game:cbingo, cbingo:best; 6 misses; a line of three ends the game; score = squares + 3 per line). Each clue has at least 8 matching drivers.
- Unverified on device: all of it.

## V1.55.0 (JS-only)
- `api/history.js`: `birthdayData(m,d)`, `eraStats(decadeStart)`, shared `cluePool()` (bingoCard now draws from it), `draftRace(r)`, `gridDuelCard(r)`, `gridFits`. Checked: Hamilton 73 wins and 198 races in the 2010s; Hamilton born 7 Jan; grid-duel cards build 30 of 30 (every square has 2+ fitting drivers).
- `screens/Stats155.js`: Birthday (kv birthday:v1), EraExplorer.
- `screens/Arcade155.js`: Slipstream (rAF loop in refs, only `slip:best` saved; stops when the app leaves the foreground), Sweeper (game:sweeper, first tap safe, timer from saved start time, `sweeper:best` = fastest seconds), Points2048 (game:p2048, PanResponder swipe plus arrow buttons, win tile 512, `p2048:best`; `move()` exported).
- `screens/Party155.js`: ColourMemory (game:simon, replays the saved sequence on resume), Battleship (game:battle, 8x8, cars 4/3/3/2, random placement, AI hunts around unsunk hits, `battle:best` = fewest shots), DraftDuel (game:draft, pass and play, 3 picks each from 12 drivers of a hidden race; ties go to best finish), GridDuel (game:ttt, 2 players, wrong name loses the turn).
- Fun menu: new row "Arcade and two players". Pages, StatsHub, share routes updated.
- Unverified on device: all of it, especially swipe gestures (Slipstream and 2048), Slipstream frame rate, and Sweeper long-press.

## V1.56.0 (JS-only): UI overhaul of Fun and the newer screens
- `lib/gameCatalog.js`: CATS (7 categories with colours) and GAMES (54 entries: route r, name n, sub s, icon i, category c, save key k, best key b, format f, two, nw). Add every new game here, plus a Main.js route and a pages.js entry; the Games hub and Fun menu are generated from it.
- `screens/GamesHub.js`: hub with search, chips, daily banner, Continue (reads `game:<k>` saves; `run:` keys need i > 0), Pinned (kv `pins:games`), per-category horizontal strips, Surprise me; exports `usePins`, `useGameStatus`, `DailyBanner`, `ContinueRow`, `PinnedRow`, `GameTile`. `FunScreens.js` (Fun home) and `FunHubs.js` (FunGames) use it. GAME_ROWS and GameRows are gone.
- `components/GameKit.js`: GameHeader (stats and a how-to-play toggle), Lives, Prompt, Answer (right pulses, wrong shakes), Feedback, ResultPanel, TurnBanner, Hint. Used by Games153, Arcade155, Party155; the local `Opt` in QuizPack and TriviaGames now renders Answer.
- `components/StatRows.js`: StatHeader, StatRow (badge, medal, bar), StatList, SectionLabel; used by Stats153, Stats155, Report.
- Screenshot harness (scratchpad `ui/shot.js`, `b58` web export with react-native-web installed there only, not in the project) was used to check the layouts; all checked screens rendered without page errors. Not seen: a phone, swipe gestures, long-press.

## V1.57.0 (JS-only)
- `screens/Table157.js`: ConnectFourScreen (kv game:c4, `c4:best` = wins vs computer; pure `fourOf/drop/cpuMove` alpha-beta depth 4) and BlackjackScreen (kv game:bj, `bj:best` = peak bankroll; `handTotal`). Both in `lib/gameCatalog.js` (nw tag moved to them), Main.js, pages.js.
- `screens/Laps157.js` LapChart: `raceLaps(year, round)` in `api/jolpica.js` pages Jolpica `/laps.json` (100 rows a page, up to 20 pages) and merges by lap number. NOT verified against the live API (sandbox cannot reach it): check page size and the Timings shape if the chart is empty.
- `screens/GameStats.js`: streaks from kv `playDays`, bests from the catalogue via `useGameStatus`.
- StatsHub rows have icons (ICONS map) and counts; RankLists, SeasonStats(Passing) and the intro cards of many older stat screens use StatHeader/StatRow; GuessDriver, GridGames and RaceBingo intros are GameHeader with a how-to toggle.

## V1.58.0 (JS-only)
- Removed: Home weekend mode (HomeScreen always uses `homeOrder`), `weekendMode` setting, fantasy rumours UI (`FantasyRumours.js` deleted; `g.rumours` data left alone).
- News alerts: `notifyNow(title, body, data)` carries `{ item }`; `AlertScheduler` listens (`addNotificationResponseReceivedListener` plus `getLastNotificationResponseAsync` for a tap that launched the app, deduped with AsyncStorage `lastTapId`) and navigates to `Article` through `lib/navRef.js` (ref on NavigationContainer in Main.js). Background checks are Android WorkManager via expo-background-task (about every 15 min at best, often later; killed by battery savers). Truly reliable pushes need a server and FCM: native build.
- Share button (Screen.js): `shareScreenImage(ref, whole)` captures only the visible viewport by default; long press gives the old whole-page capture.
- Settings search: module variable `FIND` set at render; `Section` hides itself when `textOf(children)` has no match.
- `lib/kv.js` records which game keys were written today (`touched` in AsyncStorage); `lib/challenges.js` picks 3 games per day from the catalogue (seed `challenge:<day>`), done = a save/best written today; `challengeDays` lists perfect days. `screens/Challenges158.js`: ChallengeCard, DailyChallengesScreen, AchievementsScreen (ACHIEVEMENTS list).
- `screens/Arcade158.js`: Snake (kv game:snake, `snake:best`; pure `stepSnake`) and Checkers (kv game:chk, `chk:best` = wins vs CPU; pure `genMoves/applyMove/aiMove`, forced captures, multi-jump, depth-5 alpha-beta).
- `screens/Stats158.js`: SeasonHeatmap (offline `seasonHeat(year)` in history.js, up to 2025) and QualiBattles (`teamBattles(year)` in jolpica.js, needs network, NOT verified live). `screens/CountdownCard.js` (ShareCard).
- Not verified on device: swipe steering in Snake, notification taps, Jolpica qualifying calls.

## V1.59.0 (JS-only)
- `lib/statsGroups.js` now holds the Statistics hub GROUPS and `STAT_ORDER`; `components/Screen.js` adds a sideways `Swipe` to any screen whose route is in STAT_ORDER (uses `navigation.replace`, so Back returns to the hub; an explicit `swipe` prop still wins).
- `screens/Pins159.js` (route PinnedPages): edits `prefs.opts.pins` (max 8) through a ref, so fast taps never use a stale list; Settings keeps only a button. The old switch list had stale-closure toggles.
- `screens/Numbers159.js`: NumberHistory (`numberBoard()` pages Jolpica `/drivers.json`, permanentNumber; seasons and wins from the offline history) and SprintStats (`sprintSeason/sprintAll` from `/year/sprint.json` and `/year/results/1.json`). Both NOT verified against the live API.


## V1.60.0 (JS-only)
- lib/newsAlerts.js: `checkNews` shares one in-flight run; seen list saved (awaited) BEFORE sending; dedupe by id and by link without query (`keyOf`); max 2 per source and 3 per check. Cause of repeats: the seen list was saved un-awaited at the end, so a stopped background task never persisted it. Unverified on a device.
- HomeScreen Explore strip hides every route in STAT_ORDER except StatsHub.
- components/StatRows.js: StatRow auto-opens Driver/Team when `title` (or `to`) matches via `entityByName` (api/history.js); `onPress` overrides, `to={false}` disables.
- components/Screen.js: `Card hero` prop (tinted gradient). Applied to the first card of older stat and game screens.
- Streaks and PoleConversion rebuilt with StatHeader/StatRow.

## V1.61.0 (JS-only)
- Font: default body font is now Exo 2 (400-700, from the already-installed @expo-google-fonts/exo-2, no new package); `ui.font` has three values: default, classic (Rajdhani), system. Body text is scaled 0.95 in components/Text.js to offset Exo 2's width. Tab labels follow the font. Greek still uses Roboto Condensed.
- ErrorNote `friendly()` never prints "undefined".
- Not verified: how every screen looks with Exo 2 on a real phone (only web screenshots of some screens, mostly in the offline state).

## V1.62.0 (JS-only)
- News/notification spam: notifyNow serialised + 12h dedupe, checkResults/checkNews mutex, seen saved before sending. lib/saved.js rewritten; fetchArticle keeps the longest of feed/page/JSON-LD.
- lib/trivia.js restored. data/history.json now includes 2026 (thru: 2026, upTo: 2025). data/season2027.js = 2027 calendar/grid fallback (web sources, seats may change).
- StatRow auto-links drivers/teams (entityByName). Segmented falls back to pills. CalendarPicker + ics options. MotoGP ALERT map covers every session.
- Season review, heatmap (fit width, ShareCard), Streaks, PoleConversion rewritten. ShareCard transparent (PNG).
- New screens/Profile162.js (route Profile, prefs.opts.profile). Fun tab labelled Other with Statistics and My profile on top.
- Fantasy: pick the driver to replace; archived collapsed/dimmed; undo + house removed.
- NOT done: poster maker, race recap restyle, number history, TP career rework, 20-driver cap hunt, Hamilton poles 105 vs 104 check.

## V1.62.1 (JS-only)
- Poster maker layouts, RaceRecap restyle (recap.js returns win/podium), Number history tiles, TP rival development + steeper upgrade cost, grid-odds slots 24.
- Still open: Hamilton poles total unverified (f1db), TP sacking/board patience, Fun/Stats further freshness.

## V1.62.2 (JS-only)
- Main.js Fun tab label/icon fix (line ~92), RulesScreen redesign, Settings profile card. Sweep script: scratchpad ui/sweep.js (hash route + click Fun tab in patched FunHome).

## V1.62.3 (JS-only)
- Cards rarity tiles/empty slots, FavCircuits coloured edge, TP board confidence bar. Hamilton poles: f1db qualifying position 1 gives 106 incl. 2026, same as the app (matches source; FIA count differs by edge cases).

## V1.63.0 (JS-only) rebrand
- theme.js palette (slate dark, accent #F43F4B), applyAccent tint capped; app name Pitwall via sed (not in lib/ics.js PRODID or backup id). Launcher name in app.json still 'F1 Companion' (needs APK).

## V1.63.1 (JS-only)
- Name reverted to F1 Companion (user keeps logo and name). Cards flatter/rounder, Eyebrow dot, TabBar active pill.

## V1.64.0 (JS-only) redesign step 1
- Mockup canvas approved (claude.ai artifact 'F1 Companion redesign'). Rule: no feature or button removed. Done: TabBar floating pill, Home greeting, Driver hero photo fade (LinearGradient to colors.surface). Next: Home hero/countdown, Standings hero leader card, Race weekend timeline, Stats tiles, Other profile card.

## V1.65.0 (JS-only) redesign step 2
- StandingsScreen leader Grad hero, Schedule timeline, StatsHub category tiles (only filter), FunHome profile card (components/Avatar.js holds useProfile/Avatar), Settings section radius. Still to restyle: News, Calendar rows, Paddock, MotoGP/football screens, games inner screens, fantasy tabs.

## V1.66.0 (JS-only) redesign step 3
- Grad default radius 22, Segmented pill, Calendar radii/month header, article image radius. MotoGP/football/game/fantasy screens inherit shared components. Ideas left: welcome/tour, Alerts inbox/Storage, Compare/Team pages, motion pass (count-up, transitions).

## V1.67.0 (JS-only) redesign step 4
- components/CountUp.js (integers only) used in StatGrid and Standings hero; Welcome, AlertsInbox, Storage touches. MotoGP/football/Compare/Team already use Grad heroes (radius now 22); no individual rebuilds.


## V1.68.0 (JS-only) floating slider bar, results fixes
- TabBar BarView: floating pill, sliding highlight (spring), shadow, no band.
- RoundScreen: OpenF1 fallback for qualifying/grid; timingGrid applies penalties. openf1.racePenalties regex broadened. Unverified against live data.
- Schedule rows open Round results (RaceDetailScreen passes onOpen).
- Gap wrappers normalised to 12; Reveal stagger 35ms; detail transition 240ms.


## V1.69.0 (JS-only) mockup layouts
- HomeScreen hero buttons, LastSession winner+podium, compact favourite driver cards; DriverScreen new hero (PhotoRise), stat trio, bars; FunHome games row; StatsHub stat of the day; WeekendResults inline on RaceDetail. Not seen rendered (sandbox has no data).


## V1.69.1 (JS-only)
- StandingsScreen row cards per mockup (Standings.dc.html). Not seen rendered (no data in sandbox).


## V1.70.0 (JS-only) mockup layouts, verified by rendering
- Verified with fixtures: scratchpad ui/fx.js fakes Jolpica so real screens render in the sandbox (shotfx.js). Compared to dc/project/*.dc.html mockups.
- New: components/Timeline.js, lib/ics.js shareMeeting, SeasonSwitch pill prop, Card flat prop, Segmented filled accent.


## V1.71.0 (JS-only)
- TabBar BarView: expanding-pill bar (selected shows label, others icon only; highlight glides). Note: inactive labels are icon-only, so test scripts must click by accessibility label (sweep.js updated).
- Photos: uncircled cutouts (contain) over faint team-colour disc: Home Your drivers, LastSession winner/P2/P3, Standings leader + rows. Photos are the user's local assets/drivers PNGs (not in the zip).

## 1.72.0
JS-only. Fixed entityByName driver ids (IX.idOf), Home/Standings/Driver/Team/Grid/Circuit/Settings/TabBar drag/Header changes per the user's 1.72 list. News background notifications still need a native build / server push.

## 1.73.0
JS-only. Screenshot-driven fixes (see changelog). Jolpica timed out in the user's diagnostics (server side); cache.js now waits 25s + one retry.

## 1.73.1
JS-only. Tab bar tabBarStyle absolute+transparent; Screen pads bottom by BottomTabBarHeightContext; Header absolute over a bg fade; OfflineBanner always absolute.

## 1.73.2
JS-only. React Navigation puts a custom tabBar in normal flow (tabBarStyle absolute is ignored), so BarView/NavBar now positions itself absolute (float prop); Screen pads bottom by 66+inset.

## 1.74.0 (JS-only)
Header offset by insets.top + translucent-black shadow gradient; tab bar drag removed, deeper shadow; colors.accentText (contrast-safe) applied to text/icons; colors.red is now fixed red; driver last-5 palette; StatRow passes year from badge; Settings bell scrolls to section; Lap chart hidden until race done; old-driver code fallback.
Unverified on device: status-bar offset, bell scroll (web sandbox has no insets/native scroll).

## 1.75.0 (JS-only)
tools/media-fetch (own package.json; imgly background removal runs in a forked worker because it crashes if sharp is loaded in the same process): Wikidata search -> verified by birth date (drivers) / logo file P154 (teams) -> Commons FilePath -> cut-out + 1:1 crop -> out/review.html -> publish.js -> remote-media/{drivers,logos}/ + index.json. App: lib/media.js loadRemoteMedia() (cached index in AsyncStorage 'media:idx', raw.githubusercontent.com main) feeds driverPhoto/teamLogo as {uri}. Tested offline with mockfetch.js only; real Wikidata run unverified.

## 1.75.1 (JS-only)
First real run of tools/media-fetch showed: sharp resizes BEFORE compositing (fixed: resize in a 2nd step), no-dob score threshold, name match relaxed when birth date matches exactly, Commons category (P373) fallback, 'none'/'error' entries are retried on rerun.

## 1.75.2 (JS-only)
driverStandings falls back to local history (year, then year-1) when Jolpica fails, so Standings/Paddock/lineups are not empty on a friend's network.

## 1.76.0 (JS-only)
New: screens/Race176.js (RaceControl, TopSpeeds, SeasonPace on OpenF1 race_control/laps; pace summaries cached in AsyncStorage `pace:<session_key>` via liveJSON), lib/offlinePack.js (Save offline button on RaceDetail), screens/Fun176.js (FriendBoard via lib/weekBoard.js on ntfy topic `<room>-wk`; weekly ledger `wk:<ISO week>` written by lib/kv.js touch(); Rewind day from local history, 24 hand-written headlines). OpenF1 endpoints unverified live (fixtures offline).
