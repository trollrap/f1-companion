// Run on YOUR computer (it needs normal internet access): `npm run fetch:history`
//   node scripts/fetch-history.js            -> missing logos for every team that ever raced + photos for every driver since 1950 (about 15 minutes the first time)
//   node scripts/fetch-history.js --logos    -> only team logos
//   node scripts/fetch-history.js --drivers --since 2000   -> only driver photos, for drivers who raced since that year
//   node scripts/fetch-history.js --dry      -> show what it would do, download nothing
// Every picture is saved as a square PNG (1:1): logos are fitted inside a 256x256 transparent square, photos are cropped to 500x500 from the top (faces).
// Files are named exactly like the ids the app uses: assets/logos/<constructorId>.png and assets/drivers/<driverId>.png.
// Pictures you already have that are not square are made square too (the originals are copied to assets_originals/ first); use --no-fix to leave them alone.
// Sources: team logos from the Wikimedia Commons category "Formula One constructor logos" (PNG renders of the logo files),
// driver photos from each driver's Wikipedia article (the lead image, converted to a square PNG). Nothing that already exists in
// assets/logos or assets/drivers is overwritten. Always look at the results: a match is a best guess by name, and the report at
// the end lists what was not found so you can add those by hand. Licences differ per file (many are free, team logos are
// trademarks): fine for a private app, check before publishing anywhere.
const fs = require('fs'), path = require('path');
let sharp; try { sharp = require('sharp'); } catch { console.error('Run npm install first (sharp is needed to make PNGs).'); process.exit(1); }
const root = path.join(__dirname, '..'), JP = 'https://api.jolpi.ca/ergast/f1', UA = { 'User-Agent': 'f1-companion-asset-fetch/1.0 (personal app)' };
const arg = (k) => process.argv.includes(k), val = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const noFix = arg('--no-fix'), only = arg('--logos') ? 'logos' : arg('--drivers') ? 'drivers' : 'all', dry = arg('--dry'), since = Number(val('--since', 1950));
const square = (buf, size, fit, position = 'centre') => sharp(buf).resize({ width: size, height: size, fit, position, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
// Existing files that are not 1:1 become 1:1 (logos padded, photos cropped from the top). Originals are kept in assets_originals/<folder>/.
async function fixExisting(folder, size, fit) {
  const dir = path.join(root, 'assets', folder); if (!fs.existsSync(dir)) return 0; let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /\.png$/i.test(x))) {
    const p = path.join(dir, f); const m = await sharp(p).metadata();
    if (m.width === m.height) continue;
    const keep = path.join(root, 'assets_originals', folder); fs.mkdirSync(keep, { recursive: true }); if (!fs.existsSync(path.join(keep, f))) fs.copyFileSync(p, path.join(keep, f));
    fs.writeFileSync(p, await square(fs.readFileSync(p), Math.min(size, Math.max(m.width, m.height)), fit, m.height > m.width ? 'top' : 'centre')); n++;
  }
  return n;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = async (u) => { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(1500 * (i + 1)); continue; } if (!r.ok) throw new Error(`${u} -> HTTP ${r.status}`); return r.json(); } throw new Error('rate limited'); };
const B = async (u) => { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(1500 * (i + 1)); continue; } if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); } throw new Error('rate limited'); };
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/formula (one|1)|f1|team|racing|logo|\.(svg|png|jpe?g)|file:|[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const all = async (base, key) => { let out = [], off = 0; for (;;) { const d = await J(`${base}${base.includes('?') ? '&' : '?'}limit=100&offset=${off}`); const l = d.MRData[key.table][key.list]; out = out.concat(l); off += 100; if (off >= Number(d.MRData.total)) break; await sleep(300); } return out; };

async function logos() {
  const dir = path.join(root, 'assets', 'logos'); fs.mkdirSync(dir, { recursive: true });
  const teams = await all(`${JP}/constructors.json`, { table: 'ConstructorTable', list: 'Constructors' });
  const missing = teams.filter((t) => !fs.existsSync(path.join(dir, `${t.constructorId}.png`)));
  console.log(`${teams.length} teams, ${missing.length} without a logo.`);
  let files = [], cont = '';
  do { const d = await J(`https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Formula_One_constructor_logos&cmtype=file&cmlimit=500&format=json&origin=*${cont}`); files = files.concat(d.query.categorymembers.map((x) => x.title)); cont = d.continue ? `&cmcontinue=${encodeURIComponent(d.continue.cmcontinue)}` : ''; } while (cont);
  console.log(`${files.length} logo files found on Commons.`);
  const notFound = [], got = [];
  for (const t of missing) {
    const want = fold(t.name), tokens = want.split(' ').filter((w) => w.length > 2);
    // best file: all tokens of the team name inside the file name, shortest title wins (avoids "Team Lotus (1958)" beating "Lotus")
    const cands = files.filter((f) => { const n = fold(f); return tokens.length && tokens.every((w) => n.includes(w)); }).sort((a, b) => fold(a).length - fold(b).length);
    if (!cands.length) { notFound.push(t.name); continue; }
    const file = cands[0];
    if (dry) { console.log(`  ${t.constructorId}  <-  ${file}`); continue; }
    try {
      const png = await B(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/^File:/, ''))}?width=512`); // Commons renders SVG and other formats to PNG at this width when asked for a width
      const out = await square(png, 256, 'contain');
      fs.writeFileSync(path.join(dir, `${t.constructorId}.png`), out); got.push(`${t.constructorId}  <-  ${file}`); console.log(`  saved ${t.constructorId}  <-  ${file}`);
    } catch (e) { notFound.push(`${t.name} (${e.message})`); }
    await sleep(400);
  }
  return { got, notFound };
}
async function drivers() {
  const dir = path.join(root, 'assets', 'drivers'); fs.mkdirSync(dir, { recursive: true });
  const ids = new Map();
  for (let y = since; y <= new Date().getFullYear(); y++) { const l = await J(`${JP}/${y}/drivers.json?limit=100`); l.MRData.DriverTable.Drivers.forEach((d) => ids.set(d.driverId, d)); await sleep(300); }
  const missing = [...ids.values()].filter((d) => !fs.existsSync(path.join(dir, `${d.driverId}.png`)));
  console.log(`${ids.size} drivers since ${since}, ${missing.length} without a photo.`);
  const got = [], notFound = [];
  for (const d of missing) {
    const title = decodeURIComponent(String(d.url || '').split('/wiki/')[1] || '');
    if (!title) { notFound.push(`${d.givenName} ${d.familyName} (no Wikipedia link)`); continue; }
    if (dry) { console.log(`  ${d.driverId}  <-  en.wikipedia.org/wiki/${title}`); continue; }
    try {
      const s = await J(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      const src = s.originalimage?.source || s.thumbnail?.source; if (!src) { notFound.push(`${d.givenName} ${d.familyName} (article has no photo)`); continue; }
      const url = s.thumbnail?.source ? s.thumbnail.source.replace(/\/\d+px-/, '/600px-') : src;
      const img = await B(url); const m = await sharp(img).metadata(); const side = Math.min(m.width, m.height, 600);
      // square crop from the top centre: faces sit in the upper part of portrait photos
      const out = await square(img, 500, 'cover', m.height > m.width ? 'top' : 'centre');
      fs.writeFileSync(path.join(dir, `${d.driverId}.png`), out); got.push(d.driverId); console.log(`  saved ${d.driverId}`);
    } catch (e) { notFound.push(`${d.givenName} ${d.familyName} (${e.message})`); }
    await sleep(400);
  }
  return { got, notFound };
}
(async () => {
  const rep = {};
  if (!noFix && !dry) { const a = await fixExisting('logos', 256, 'contain'), b = await fixExisting('drivers', 500, 'cover'); if (a + b) console.log(`Made ${a} logos and ${b} photos square (originals kept in assets_originals/).`); }
  if (only !== 'drivers') rep.logos = await logos();
  if (only !== 'logos') rep.drivers = await drivers();
  console.log('\n=== Report ===');
  for (const [k, v] of Object.entries(rep)) { console.log(`${k}: ${v.got.length} saved, ${v.notFound.length} not found`); if (v.notFound.length) console.log('  Not found (add by hand): ' + v.notFound.join('; ')); }
  console.log(dry ? '\n(dry run: nothing was downloaded)' : '\nNow run `npm run media` to refresh the photo index, and look through the new files: matches are best guesses.');
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
