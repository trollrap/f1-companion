// Copies the approved pictures from out/ into ../../remote-media/ and writes remote-media/index.json (the list the app reads).
//   node publish.js                    publish everything in out/ except ids listed in reject.txt
//   node publish.js --replace-logos    published logos also replace logos you already have in assets/logos (default: your own files win)
// Afterwards: git add -A, git commit, git push. The app downloads pictures from GitHub the first time they are needed and keeps them.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out'), DEST = path.join(__dirname, '..', '..', 'remote-media');
const rejectFile = path.join(__dirname, 'reject.txt');
const reject = new Set(fs.existsSync(rejectFile) ? fs.readFileSync(rejectFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : []);
const state = fs.existsSync(path.join(OUT, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'state.json'), 'utf8')) : {};
const idxFile = path.join(DEST, 'index.json');
const idx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : { v: 0, drivers: [], logos: [], override: [] };
const credits = fs.existsSync(path.join(DEST, 'CREDITS.json')) ? JSON.parse(fs.readFileSync(path.join(DEST, 'CREDITS.json'), 'utf8')) : {};
const replace = process.argv.includes('--replace-logos');
let n = { drivers: 0, logos: 0 };
for (const kind of ['drivers', 'logos']) {
  fs.mkdirSync(path.join(DEST, kind), { recursive: true });
  const dir = path.join(OUT, kind); if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => /\.png$/i.test(x))) {
    const id = f.replace(/\.png$/i, ''); if (reject.has(id) || reject.has(kind + ':' + id)) continue;
    fs.copyFileSync(path.join(dir, f), path.join(DEST, kind, f)); n[kind]++;
    if (!idx[kind].includes(id)) idx[kind].push(id);
    if (kind === 'logos' && replace && !idx.override.includes(id)) idx.override.push(id);
    const s = state[kind + ':' + id]; if (s) credits[kind + '/' + id] = { source: s.source, license: s.license, author: s.author };
  }
}
for (const k of ['drivers', 'logos']) { idx[k] = idx[k].filter((id) => fs.existsSync(path.join(DEST, k, id + '.png'))).sort(); }
idx.override = idx.override.filter((id) => idx.logos.includes(id)).sort(); idx.v = (idx.v || 0) + 1;
fs.writeFileSync(idxFile, JSON.stringify(idx)); fs.writeFileSync(path.join(DEST, 'CREDITS.json'), JSON.stringify(credits, null, 1));
console.log(`Published ${n.drivers} driver photos and ${n.logos} logos to remote-media/ (index version ${idx.v}). Now: git add -A && git commit -m "media" && git push`);
