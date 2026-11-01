# Build the V1 APK (Windows)

Before anything: put your photos in `assets/` and run `npm run media` (it also shrinks oversized images, keeping originals in `assets_originals/`), otherwise they are not included in the APK.

## Route A: EAS cloud build (easiest, no Android Studio)
1. Make a free account at https://expo.dev.
2. In the project folder (PowerShell):
   ```
   npm install --legacy-peer-deps
   npm run media
   npm install -g eas-cli
   eas login
   eas init
   eas build -p android --profile preview
   ```
   `eas init` links the project to your account (answer yes). `eas.json` is already set so the `preview` profile makes an **.apk** (not an .aab).
3. First build: when asked "Generate a new Android Keystore?" answer **yes**. EAS keeps it for you; later builds reuse it, so updates install over the old app.
4. Wait for the build (free plan queues can take a while). When done, EAS prints a link and a QR code. Open the link on your phone and download the .apk.
5. On the phone, allow "Install unknown apps" for your browser or file manager, then open the .apk and install.
6. Share the same link with friends. Android only.

The free plan has a monthly build allowance; check https://expo.dev/pricing if a build is refused.

## Route B: local build (no cloud, needs Android tools)
Needs JDK 17 and Android Studio (SDK + platform tools).
```
npx expo prebuild -p android
cd android
.\gradlew assembleRelease
```
The APK is in `android\app\build\outputs\apk\release\app-release.apk`. This uses the debug keystore, fine for personal use.

## Updating later
Raise `android.versionCode` in `app.json` (1, 2, 3...) and `version`, then build again and install over the old one.

## Notes
- Notifications work in the built APK (they do not in Expo Go).
- Photos changed later need a new build (they are bundled). Data updates by itself.
- If the build fails on dependency versions: `npx expo install --check`.

## In-app updates (for you and friends)
1. Make a free GitHub repository. It must be PUBLIC: the app checks for updates without logging in, so a private repository shows nothing (the update banner never appears). Put its name in `src/config.js`, for example `export const UPDATE_REPO = 'yourname/f1-companion-apk';`.
2. Set the new number in `package.json` ("version": the middle number for bigger updates, the last for small ones), run `npm run sync` (updates app.json and versionCode), build the APK, then on GitHub (`trollrap/f1-companion`) open Releases > Draft a new release.
3. Tag it `v1.3.0` (the same number as `version`), attach the .apk file, publish.
4. Installed apps check the latest release about every 12 hours and show an "Update ready" banner on Home. Tapping it downloads the .apk, then Android asks to install over the old one (allow "Install unknown apps" for the browser once). Settings > App updates has a "Check for updates" button.
Android cannot install silently, so the final "Install" tap is always yours.

## Updates without a new APK (EAS Update, one-time setup)
Changes to screens, text, data and logic can be sent straight to installed apps. Changes to native things (new packages, permissions, app icon) still need a new APK.
**Setup (once, then build one APK):**
1. `npm install --legacy-peer-deps` (adds `expo-updates`).
2. `eas update:configure`. It adds `runtimeVersion` and `updates.url` to `app.json` and a `channel` to the `preview` profile in `eas.json`.
3. In `app.json` make the runtime version follow the app version: `"runtimeVersion": { "policy": "appVersion" }`.
4. Build a new APK (`eas build -p android --profile preview`) and install it. Only builds made after this step can receive updates.
**Important:** after step 2 your `app.json` and `eas.json` hold your project's settings. When you unzip a new version of the project, do NOT overwrite those two files; I will say so when one of them needs a change.
**Every time you change the app:** run `npm run ota` (it is `eas update --channel preview --environment preview`) and type a short message. Installed apps download it in the background and use it the next time they are opened (sometimes after closing and opening twice).
**When you need a new APK instead:** after changing `app.json` fields, adding or removing packages, or anything native. Raise `version` in `app.json` (for example 1.4.0 to 1.5.0) for those builds so old apps never get an update that needs native code they don't have.
Free plan: EAS Update is included with monthly limits (Expo's plans page does not list the numbers; check expo.dev/pricing). Free accounts cannot be charged for overage.
