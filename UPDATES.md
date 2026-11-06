# Updates without downloading an APK (EAS Update)

Two kinds of changes:
- **JavaScript only** (screens, data, fixes: almost every version): published as an over-the-air update. A few MB, applied inside the app with one tap (or on the next start). No APK, no GitHub release.
- **Native** (a new package in package.json, a new permission, a new Expo SDK): needs a new APK (`eas build`), installed once; the in-app installer (1.15.0) downloads it from the GitHub release.

## One-time setup (on your PC, in the project folder)
1. `npx eas-cli update:configure` (logs in, adds `updates.url`, `runtimeVersion` and a `channel` to app.json and eas.json).
2. Nothing to do for the runtime version: `app.config.js` works it out by itself from your packages and permissions. It stays the same for normal code changes and changes when a package is added or upgraded. (Leave whatever `update:configure` wrote in app.json; `app.config.js` overrides it.)
3. In eas.json the `preview` build profile must contain `"channel": "preview"` (update:configure does this).
4. `npm run sync`, then `eas build -p android --profile preview` once. Install that APK (the 1.16.0 one or later). From then on updates are over the air.

## Publishing an update (every JS-only version)
- By hand: `npx eas-cli update --branch preview --message "1.16.1"`.
- Or automatically on every push: add the repository secret `EXPO_TOKEN` (expo.dev > Account settings > Access tokens > create, then GitHub > repository > Settings > Secrets > Actions > New secret). `git push` then runs `.github/workflows/ota.yml`.

## Native releases to GitHub automatically (optional, untested)
`.github/workflows/release-apk.yml`: `git tag v1.17.0 && git push --tags` makes GitHub ask EAS for the APK and attaches it to a new release. Needs the same EXPO_TOKEN secret.

## In the app
Home shows "Update downloaded. Tap to restart and use it." when an update has been fetched; Settings > App updates > Check for updates does it on demand. In Expo Go and development builds it is off.
