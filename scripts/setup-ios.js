// Run once with: npm run setup:ios
// Adds what an iPhone build needs to YOUR app.json and eas.json (nothing else is touched, your projectId, updates and runtimeVersion stay as they are).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')), write = (f, o) => fs.writeFileSync(path.join(root, f), JSON.stringify(o, null, 2) + '\n');
const app = read('app.json'), x = app.expo;
x.ios = x.ios || {};
x.ios.bundleIdentifier = x.ios.bundleIdentifier || (x.android && x.android.package) || 'com.f1companion.app';
x.ios.supportsTablet = false;
x.ios.infoPlist = { ...(x.ios.infoPlist || {}), UIBackgroundModes: ['fetch', 'processing'], BGTaskSchedulerPermittedIdentifiers: ['f1-results-check'], ITSAppUsesNonExemptEncryption: false };
write('app.json', app);
const eas = read('eas.json'); eas.build = eas.build || {};
eas.build.preview = { ...(eas.build.preview || {}), distribution: 'internal', ios: { ...((eas.build.preview || {}).ios || {}), simulator: false } };
eas.build.production = { ...(eas.build.production || {}), ios: { ...((eas.build.production || {}).ios || {}) } };
write('eas.json', eas);
console.log(`iOS ready. Bundle identifier: ${x.ios.bundleIdentifier}\nNext: eas device:create (friend's iPhone), then eas build -p ios --profile preview`);
