// Finds a portrait for every driver and a logo for every team on Wikidata / Wikimedia Commons, then makes them app-ready.
//   node fetch.js                   everything that has no picture yet (first run takes a long time; it can be stopped and resumed)
//   node fetch.js --drivers         only drivers          node fetch.js --logos      only team logos
//   node fetch.js --limit 5         try the first 5 only  node fetch.js --only max_verstappen,ferrari
//   node fetch.js --since 1990      only drivers who raced in that year or later
//   node fetch.js --all-drivers     also drivers that already have a photo in assets/drivers (default: skip them)
//   node fetch.js --redo            ignore earlier results and start again
// Output: out/drivers/<id>.png (500x500, transparent), out/logos/<id>.png (512x512, transparent), out/review.html, out/report.json
const fs = require('fs'), path = require('path'), { fork } = require('child_process');
const L = require('./lib'); const sharp = require('sharp'); const { appIds } = require('./ids');
const root = path.join(__dirname, '..', '..'), OUT = path.join(__dirname, 'out'), CACHE = path.join(OUT, 'cache');
const arg = (k) => process.argv.includes(k), val = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const doDrivers = !arg('--logos'), doLogos = !arg('--drivers'), limit = Number(val('--limit', 0)) || Infinity, since = Number(val('--since', 0)) || 0;
const only = val('--only', '') ? val('--only', '').split(',') : null;
const UA = { 'User-Agent': 'f1-companion-media-fetch/1.0 (personal hobby app; https://github.com/trollrap/f1-companion)' };
for (const d of ['drivers', 'logos', 'cache', 'src']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
if (arg('--redo')) for (const f of ['state.json']) try { fs.unlinkSync(path.join(OUT, f)); } catch {}
const STATE = fs.existsSync(path.join(OUT, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'state.json'), 'utf8')) : {};
const save = () => fs.writeFileSync(path.join(OUT, 'state.json'), JSON.stringify(STATE, null, 1));

// ---- polite, retrying, cached HTTP ----
let last = 0; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function http(url, { json = true, cacheKey } = {}) {
  const cf = cacheKey && path.join(CACHE, cacheKey.replace(/[^a-z0-9_.-]/gi, '_').slice(0, 150) + '.json');
  if (cf && json && fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  for (let a = 0; a < 5; a++) {
    const wait = Math.max(0, last + 350 - Date.now()); last = Date.now() + wait; if (wait) await sleep(wait);
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow' });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (a + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (!json) return Buffer.from(await r.arrayBuffer());
      const j = await r.json(); if (cf) fs.writeFileSync(cf, JSON.stringify(j)); return j;
    } catch (e) { if (a === 4) throw e; await sleep(1500 * (a + 1)); }
  }
  throw new Error('failed: ' + url);
}
const WD = 'https://www.wikidata.org/w/api.php', CM = 'https://commons.wikimedia.org/w/api.php';
const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
async function search(text) { const j = await http(`${WD}?${q({ action: 'wbsearchentities', search: text, language: 'en', limit: 8, format: 'json' })}`, { cacheKey: 's_' + L.fold(text) }); return (j.search || []).map((x) => x.id); }
async function entities(ids) {
  if (!ids.length) return [];
  const j = await http(`${WD}?${q({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|descriptions|aliases|claims', languages: 'en', format: 'json' })}`, { cacheKey: 'e_' + ids.join('_') });
  return ids.map((i) => j.entities && j.entities[i]).filter((e) => e && !e.missing);
}
async function fileInfo(name) {
  const j = await http(`${CM}?${q({ action: 'query', titles: 'File:' + name, prop: 'imageinfo', iiprop: 'extmetadata|size|mime', format: 'json' })}`, { cacheKey: 'f_' + name });
  const p = j.query && Object.values(j.query.pages || {})[0]; const ii = p && p.imageinfo && p.imageinfo[0]; if (!ii) return {};
  const em = ii.extmetadata || {}; const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').trim();
  return { width: ii.width, height: ii.height, mime: ii.mime, license: strip(em.LicenseShortName && em.LicenseShortName.value), author: strip(em.Artist && em.Artist.value).slice(0, 120) };
}
const fileUrl = (name, width) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=${width}`;
const filePage = (name) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name.replace(/ /g, '_'))}`;

// ---- the cut-out engine (separate process) ----
let worker = null, jobs = 0; const waiting = {};
function startWorker() {
  worker = fork(path.join(__dirname, 'cutout-worker.js'), { execArgv: [], stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  worker.on('message', (m) => { if (m.id != null && waiting[m.id]) { waiting[m.id](m); delete waiting[m.id]; } });
  worker.on('exit', () => { for (const k of Object.keys(waiting)) { waiting[k]({ error: 'cut-out engine stopped' }); delete waiting[k]; } worker = null; });
}
function cutout(inPath, outPath) {
  if (!worker) startWorker();
  const id = ++jobs; return new Promise((res) => { waiting[id] = res; worker.send({ id, inPath, outPath }); });
}

// ---- data from the app ----
const H = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'history.json'), 'utf8'));
const lastYear = {}; for (const y of Object.keys(H.r)) for (const race of H.r[y]) for (const row of race[4]) lastYear[row[0]] = Math.max(lastYear[row[0]] || 0, +y);
const have = (dir) => new Set(fs.existsSync(path.join(root, 'assets', dir)) ? fs.readdirSync(path.join(root, 'assets', dir)).map((f) => f.replace(/\.(png|jpe?g|webp)$/i, '')) : []);
const haveDrivers = have('drivers'), haveLogos = have('logos');
const APP = appIds(H); // the id the app looks photos up by
// Earlier versions of this tool saved files under the history file's own ids (nino-farina); move them to the app's ids.
(() => {
  let moved = 0;
  H.d.forEach((d, i) => {
    if (d[0] === APP[i]) return;
    const oldK = 'drivers:' + d[0], newK = 'drivers:' + APP[i];
    if (STATE[oldK]) { STATE[newK] = { ...STATE[oldK], id: APP[i] }; delete STATE[oldK]; moved++; }
    const o = path.join(OUT, 'drivers', d[0] + '.png'), n = path.join(OUT, 'drivers', APP[i] + '.png');
    if (fs.existsSync(o)) { try { fs.renameSync(o, n); } catch {} }
  });
  if (moved) { save(); console.log(`renamed ${moved} earlier results to the app's ids`); }
})();

async function doDriver(d, idx) {
  const [id, first, last, dob] = d, name = `${first} ${last}`;
  const want = { name, first, last, dob };
  let best = null, person = null;
  for (const text of [name, `${last} ${first}`, `${name} racing driver`]) {
    const ents = await entities((await search(text)).slice(0, 8));
    for (const e of ents) { const sc = L.scoreDriver(e, want); if (sc >= 6) { if (!person || sc > person.sc) person = { sc, e }; if (L.pickFile(e.claims, 'P18') && (!best || sc > best.sc)) best = { sc, e }; } }
    if (best) break;
  }
  let file = best && L.pickFile(best.e.claims, 'P18'), fromCat = false;
  if (!file && person) { // person found but Wikidata has no photo: look in their Commons category for a portrait-like file
    const cat = ((person.e.claims.P373 || [])[0] || {}).mainsnak; const catName = cat && cat.datavalue && cat.datavalue.value;
    if (catName) {
      const j = await http(`${CM}?${q({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + catName, cmtype: 'file', cmlimit: 60, format: 'json' })}`, { cacheKey: 'c_' + catName });
      const bad = /\b(car|ferrari|maserati|alfa|cooper|lotus|brm|vanwall|lancia|mercedes|talbot|gordini|connaught|grand prix|gp|trophy|race|crash|pit|podium|monument|grave|signature|autograph|stamp)\b/i;
      const names = ((j.query && j.query.categorymembers) || []).map((m) => m.title.replace(/^File:/, '')).filter((n) => /\.(jpe?g|png)$/i.test(n) && !bad.test(n));
      file = names.find((n) => L.fold(n).includes(L.fold(last))) || names[0] || null; fromCat = !!file;
    }
    if (file) best = person;
  }
  if (!file) return { status: 'none', note: person ? `found on Wikidata (${person.e.id}) but no photo anywhere` : 'not found on Wikidata with a matching birth date' };
  const flagsPre = fromCat ? ['from Commons category, check'] : [];
  const info = await fileInfo(file), flags = [...flagsPre];
  if (info.mime && !/^image\/(jpeg|png|webp|tiff|gif)/.test(info.mime)) return { status: 'none', note: 'photo file type ' + info.mime };
  if (info.width && info.width < 300) flags.push('low-res source');
  const raw = await http(fileUrl(file, 1000), { json: false });
  const inP = path.join(OUT, 'src', id + '.png'), cutP = path.join(OUT, 'src', id + '.cut.png');
  fs.writeFileSync(inP, await sharp(raw).rotate().resize({ width: 1000, height: 1400, fit: 'inside', withoutEnlargement: true }).png().toBuffer());
  const r = await cutout(inP, cutP); if (r.error) return { status: 'error', note: r.error };
  const c = await L.squareCrop(fs.readFileSync(cutP), 500); if (!c) return { status: 'error', note: 'could not find a person in the photo (group, car or very small figure)' };
  if (c.ratio < 0.2) flags.push('small subject'); if (c.ratio > 0.88) flags.push('background may remain');
  fs.writeFileSync(path.join(OUT, 'drivers', id + '.png'), c.buf);
  try { fs.unlinkSync(cutP); } catch {}
  return { status: flags.length ? 'check' : 'ok', flags, source: filePage(file), license: info.license, author: info.author, wikidata: best.e.id, score: best.sc };
}
async function doTeam(t) {
  const [id, name] = t; const want = { name };
  let best = null;
  for (const text of [`${name} Formula One team`, name, `${name} F1`]) {
    const ents = await entities((await search(text)).slice(0, 8));
    for (const e of ents) { const sc = L.scoreTeam(e, want); if (sc >= 2 && (!best || sc > best.sc)) best = { sc, e }; }
    if (best && best.sc >= 7) break;
  }
  if (!best) return { status: 'none', note: 'no Wikidata team with a logo' };
  const file = L.pickFile(best.e.claims, 'P154'), info = await fileInfo(file), flags = [];
  if (best.sc < 7) flags.push('weak match: ' + ((best.e.labels && best.e.labels.en && best.e.labels.en.value) || best.e.id));
  const raw = await http(fileUrl(file, 768), { json: false });
  const lg = await L.squareLogo(await sharp(raw).ensureAlpha().png().toBuffer(), 512);
  if (lg.whitened) flags.push('was dark: made white');
  fs.writeFileSync(path.join(OUT, 'logos', id + '.png'), lg.buf);
  return { status: flags.length ? 'check' : 'ok', flags, source: filePage(file), license: info.license, author: info.author, wikidata: best.e.id, score: best.sc };
}

async function run(kind, items, fn, labelOf) {
  let n = 0;
  for (const it of items) {
    const id = it[0], key = kind + ':' + id;
    if (STATE[key] && ['ok', 'check'].includes(STATE[key].status) && !only) { continue; }
    if (++n > limit) break;
    try { STATE[key] = { kind, id, name: labelOf(it), ...(await fn(it)) }; }
    catch (e) { STATE[key] = { kind, id, name: labelOf(it), status: 'error', note: String((e && e.message) || e) }; }
    const s = STATE[key]; console.log(`${kind} ${id}: ${s.status}${s.flags && s.flags.length ? ' (' + s.flags.join(', ') + ')' : ''}${s.note ? ' - ' + s.note : ''}`);
    save();
  }
}
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function review() {
  const items = Object.values(STATE).filter((s) => s.status === 'ok' || s.status === 'check').sort((a, b) => (a.status === 'check' ? 0 : 1) - (b.status === 'check' ? 0 : 1) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const card = (s) => `<div class="c ${s.status}"><img loading="lazy" src="${s.kind}/${esc(s.id)}.png"><b>${esc(s.name)}</b><code>${esc(s.id)}</code>${(s.flags || []).map((f) => `<i>${esc(f)}</i>`).join('')}<small>${esc(s.license)}${s.author ? ' · ' + esc(s.author) : ''}</small><a href="${esc(s.source)}" target="_blank">source</a></div>`;
  const miss = Object.values(STATE).filter((s) => s.status === 'none' || s.status === 'error');
  fs.writeFileSync(path.join(OUT, 'review.html'), `<!doctype html><meta charset="utf-8"><title>Media review</title><style>
body{font:14px system-ui;background:#111;color:#eee;margin:20px}h2{margin:28px 0 8px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.c{background:#1b1b1f;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:4px}.c.check{outline:2px solid #e8a317}
.c img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:10px;background:conic-gradient(#2a2a30 25%,#222228 0 50%,#2a2a30 0 75%,#222228 0) 0 0/16px 16px}
code{color:#9aa}i{color:#e8a317;font-style:normal;font-size:12px}small{color:#889}a{color:#6af}</style>
<h1>Review before publishing</h1><p>Orange = look closely. To reject one, add its id to <code>reject.txt</code> (one per line) or delete its png from out/drivers or out/logos, then run <code>npm run publish</code>.</p>
<h2>Drivers (${items.filter((s) => s.kind === 'drivers').length})</h2><div class="g">${items.filter((s) => s.kind === 'drivers').map(card).join('')}</div>
<h2>Team logos (${items.filter((s) => s.kind === 'logos').length})</h2><div class="g">${items.filter((s) => s.kind === 'logos').map(card).join('')}</div>
<h2>Not found (${miss.length})</h2><p>${miss.map((s) => `${esc(s.name)} <code>${esc(s.id)}</code>${s.note ? ' - ' + esc(s.note) : ''}`).join('<br>')}</p>`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(STATE, null, 1));
}
(async () => {
  const tally = () => { const c = {}; for (const s of Object.values(STATE)) c[s.kind + ' ' + s.status] = (c[s.kind + ' ' + s.status] || 0) + 1; return c; };
  if (doDrivers) {
    const ds = H.d.map((d, i) => [[APP[i], d[1], d[2], d[3]], i, d[0]]).filter(([d, i, d0]) => (only ? only.includes(d[0]) || only.includes(d0) : (arg('--all-drivers') || !(haveDrivers.has(d[0]) || haveDrivers.has(d0))) && (!since || (lastYear[i] || 0) >= since))).map(([d]) => d);
    console.log(`drivers to look up: ${ds.length}`); await run('drivers', ds, (d) => doDriver(d), (d) => `${d[1]} ${d[2]}`);
  }
  if (doLogos) {
    const ts = H.t.filter((t) => (only ? only.includes(t[0]) : true));
    console.log(`teams to look up: ${ts.length}`); await run('logos', ts, (t) => doTeam(t), (t) => t[1]);
  }
  review(); if (worker) worker.kill();
  console.log('\nDone.', JSON.stringify(tally())); console.log('Open tools/media-fetch/out/review.html, check the pictures, then run: npm run publish');
  process.exit(0);
})().catch((e) => { console.error(e); if (worker) worker.kill(); process.exit(1); });
