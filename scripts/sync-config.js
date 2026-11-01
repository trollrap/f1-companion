// Run with: npm run sync
// Copies the version from package.json (the one place to edit: 1.<semi-major>.<minor>) into app.json and sets android.versionCode from it,
// and makes sure app.json has the icon, splash and permissions this version needs. Everything else in app.json (project id, update url...) is kept.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const file = path.join(root, 'app.json'); const app = JSON.parse(fs.readFileSync(file, 'utf8')); const e = app.expo || (app.expo = {});
const [maj, min, pat] = String(pkg.version).split('.').map((x) => parseInt(x, 10) || 0);
e.version = pkg.version;
e.android = e.android || {}; e.android.versionCode = maj * 10000 + min * 100 + pat; // 1.3.0 -> 10300, always grows with the version
e.backgroundColor = '#0A0506';
e.icon = './assets/app/icon.png';
e.splash = { image: './assets/app/icon.png', resizeMode: 'contain', backgroundColor: '#0A0506' };
e.android.adaptiveIcon = { foregroundImage: './assets/app/adaptive-icon.png', backgroundColor: '#0A0506' };
const need = ['SCHEDULE_EXACT_ALARM', 'USE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED'];
e.android.permissions = [...new Set([...(e.android.permissions || []), ...need])];
fs.writeFileSync(file, JSON.stringify(app, null, 2) + '\n');
console.log(`app.json: version ${e.version}, versionCode ${e.android.versionCode}`);
