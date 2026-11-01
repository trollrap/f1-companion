# Building for iPhone (.ipa) and for both systems

## What you need first (cannot be avoided)
Apple only lets an app run on a real iPhone if it is signed by an Apple Developer account.
- **Apple Developer Program: about 99 USD per year.** Without it no .ipa from this project will install on your friend's phone. (Free route: none from EAS. Tools like Sideloadly/AltStore re-sign an .ipa with a free Apple ID, but the app then stops working after 7 days and you would still need an .ipa made first.)
- Your friend's iPhone has to be registered (ad hoc) **or** you send the build through TestFlight (no registration, friend installs the TestFlight app; needs the paid account too).

## One-time setup
1. In the project folder run `npm install`, then `npm run setup:ios`. It adds the iPhone settings to your own app.json and eas.json and keeps everything else (projectId, updates, runtimeVersion).
2. Your friend (the account holder) either adds you to their Apple Developer team, or you run the EAS commands while signed in with their Apple ID (EAS asks for it, plus the 2-step code, and creates the certificates itself).
3. Register your friend's iPhone for ad hoc installs: `eas device:create`, open the link it prints on that iPhone and install the small profile. (Skip this if you use TestFlight.)

## Build commands
- Android APK: `eas build -p android --profile preview`
- iPhone IPA: `eas build -p ios --profile preview` (EAS asks for your Apple ID, creates the certificates itself, and gives an install link; the .ipa is also downloadable)
- Both at once: `eas build -p all --profile preview`
- TestFlight instead: `eas build -p ios --profile production` then `eas submit -p ios`

## Version number
Edit `version` in `package.json`, run `npm run sync`, then build. (middle number = bigger update, last number = small fix.)

## What differs on iPhone
- The in-app "update" check only exists on Android (an iPhone cannot install from a download link). For iPhone use a new build link or TestFlight, or push JS-only fixes with `npm run ota` (works on both systems when the version number is the same).
- Result notifications in the background are decided by iOS: they can arrive late or only when the app was opened recently.
- Sharing the prediction picture, notifications and everything else work the same.
- I cannot test on an iPhone from here: treat the first iPhone build as a test.
