// Finds a portrait for every driver and a logo for every team on Wikidata / Wikimedia Commons, then makes them app-ready.
//   node fetch.js                   everything that has no picture yet (first run takes a long time; it can be stopped and resumed)
//   node fetch.js --drivers         only drivers          node fetch.js --logos      only team logos
//   node fetch.js --limit 5         try the first 5 only  node fetch.js --only max_verstappen,ferrari
//   node fetch.js --since 1990      only drivers who raced in that year or later
//   node fetch.js --all-drivers     also drivers that already have a photo in assets/drivers (default: skip them)
//   node fetch.js --redo            ignore earlier results and start again
// Your own pictures: drop files named <id>.png (or .jpg) into manual/drivers/ or manual/logos/ - they are processed like the rest and always win.
// Output: out/drivers/<id>.png (500x500, transparent), out/logos/<id>.png (512x512, transparent), out/review.html, out/missing.md, out/missing.csv, out/report.json
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { fork } = require('child_process');
const L = require('./lib'); const sharp = require('sharp'); const { appIds } = require('./ids'); const { detectNet } = require('./facenet'); const { detectFaces: detectPico } = require('./faces');
const root = path.join(__dirname, '..', '..'), OUT = path.join(__dirname, 'out'), CACHE = path.join(OUT, 'cache'), MANUAL = path.join(__dirname, 'manual');
const RULES = 3; // bump when the picture rules change: older results are then redone
const arg = (k) => process.argv.includes(k), val = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const doDrivers = !arg('--logos'), doLogos = !arg('--drivers'), limit = Number(val('--limit', 0)) || Infinity, since = Number(val('--since', 0)) || 0;
const only = val('--only', '') ? val('--only', '').split(',') : null;
const UA = { 'User-Agent': 'f1-companion-media-fetch/1.1 (personal hobby app; https://github.com/trollrap/f1-companion)' };
for (const d of ['drivers', 'logos', 'cache', 'src']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
for (const d of ['drivers', 'logos']) fs.mkdirSync(path.join(MANUAL, d), { recursive: true });
const clearPngs = () => { for (const d of ['drivers', 'logos']) for (const f of fs.readdirSync(path.join(OUT, d))) if (/\.png$/i.test(f)) try { fs.unlinkSync(path.join(OUT, d, f)); } catch {} };
const verFile = path.join(OUT, 'rules.txt');
if (arg('--redo')) { for (const f of ['state.json']) try { fs.unlinkSync(path.join(OUT, f)); } catch {} clearPngs(); }
else if (!fs.existsSync(verFile) || fs.readFileSync(verFile, 'utf8').trim() !== String(RULES)) {
  if (fs.existsSync(path.join(OUT, 'state.json'))) console.log('New picture rules (faces, cars, groups, logo clean-up): redoing every picture once, this takes a while.');
  try { fs.unlinkSync(path.join(OUT, 'state.json')); } catch {} clearPngs();
}
fs.writeFileSync(verFile, String(RULES));
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
  const dm = strip(em.DateTimeOriginal && em.DateTimeOriginal.value).match(/\b(1[89]\d\d|20\d\d)\b/);
  return { width: ii.width, height: ii.height, mime: ii.mime, license: strip(em.LicenseShortName && em.LicenseShortName.value), author: strip(em.Artist && em.Artist.value).slice(0, 120), year: dm ? +dm[1] : null };
}
const fileUrl = (name, width) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=${width}`;
const filePage = (name) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name.replace(/ /g, '_'))}`;
const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

// ---- the cut-out / face engine (separate process) ----
let worker = null, jobs = 0; const waiting = {};
function startWorker() {
  worker = fork(path.join(__dirname, 'cutout-worker.js'), { execArgv: [], stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  worker.on('message', (m) => { if (m.id != null && waiting[m.id]) { waiting[m.id](m); delete waiting[m.id]; } });
  worker.on('exit', () => { for (const k of Object.keys(waiting)) { waiting[k]({ error: 'cut-out engine stopped' }); delete waiting[k]; } worker = null; });
}
const call = (msg) => { if (!worker) startWorker(); const id = ++jobs; return new Promise((res) => { waiting[id] = res; worker.send({ ...msg, id }); }); };
const cutout = (inPath, outPath) => call({ inPath, outPath, mime: /\.jpe?g$/i.test(inPath) ? 'image/jpeg' : 'image/png' });
let netFaces = true;
async function facesOf(png) {
  const sane = (fs_) => fs_.filter((f) => f.w / f.h >= 0.55 && f.w / f.h <= 1.3); // real faces are a bit taller than wide; round "faces" are number roundels, wheels, logos
  if (netFaces) { try { return sane(await detectNet(call, png, 0.9)); } catch (e) { netFaces = false; console.log('  (neural face finder not available: ' + String((e && e.message) || e).slice(0, 80) + ' - using the simple one)'); } }
  try { return (await detectPico(png, { minQ: 25 })).map((d) => ({ cx: d.cx, cy: d.cy, w: d.size, h: d.size, size: d.size, p: 1 })); } catch { return []; }
}

// ---- data from the app ----
const H = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'history.json'), 'utf8'));
const lastYear = {}, firstYear = {}; for (const y of Object.keys(H.r)) for (const race of H.r[y]) for (const row of race[4]) { lastYear[row[0]] = Math.max(lastYear[row[0]] || 0, +y); firstYear[row[0]] = Math.min(firstYear[row[0]] || 9999, +y); }
const have = (dir) => new Set(fs.existsSync(path.join(root, 'assets', dir)) ? fs.readdirSync(path.join(root, 'assets', dir)).map((f) => f.replace(/\.(png|jpe?g|webp)$/i, '')) : []);
const haveDrivers = have('drivers'), haveLogos = have('logos');
const APP = appIds(H); // the id the app looks photos up by
const idxOf = {}; H.d.forEach((d, i) => { idxOf[APP[i]] = i; });

// ---- pictures for one driver ----
const BAD_NAME = /\b(car|ferrari|maserati|alfa|cooper|lotus|brm|vanwall|lancia|mercedes|talbot|gordini|connaught|grand prix|gp|trophy|race|racing|crash|pit|podium|monument|grave|signature|autograph|stamp|circuit|ring|monza|monaco|silverstone|spa|zandvoort|indianapolis|indy|team|group|crowd|cockpit)\b/i;
const HARD_BAD = /\b(car|ferrari|maserati|alfa|cooper|lotus|brm|vanwall|lancia|mercedes|talbot|gordini|connaught|grand prix|gp|trophy|race|crash|pit|podium|monument|grave|signature|autograph|stamp)\b/i;
async function fetchSource(file) {
  const key = hash(file), jp = path.join(OUT, 'src', key + '.jpg'), pn = path.join(OUT, 'src', key + '.png');
  if (fs.existsSync(jp)) return { path: jp, buf: fs.readFileSync(jp) };
  if (fs.existsSync(pn)) return { path: pn, buf: fs.readFileSync(pn) };
  const raw = await http(fileUrl(file, 1000), { json: false });
  const img = sharp(raw).rotate().resize({ width: 1000, height: 1400, fit: 'inside', withoutEnlargement: true }); const meta = await sharp(raw).metadata();
  if (meta.hasAlpha) { const b = await img.png().toBuffer(); fs.writeFileSync(pn, b); return { path: pn, buf: b }; }
  const b = await img.jpeg({ quality: 92 }).toBuffer(); fs.writeFileSync(jp, b); return { path: jp, buf: b };
}
// Cut out, find faces, frame. `src` = { path, buf }. Returns the framing result plus what was found.
async function process1(src, tag) {
  const cutP = path.join(OUT, 'src', tag + '.cut.png');
  try {
    const r = await cutout(src.path, cutP); if (r.error) return { res: { ok: false, reasons: ['cut-out failed: ' + r.error], flags: [] } };
    const cutBuf = fs.readFileSync(cutP);
    const faces = await facesOf(await sharp(src.buf).png().toBuffer());
    const cm = await sharp(cutBuf).metadata(), sm = await sharp(src.buf).metadata(), k = cm.width / sm.width; // the cut-out normally has the same size as the photo
    let face = faces[0] ? { cx: faces[0].cx * k, cy: faces[0].cy * k, w: faces[0].w * k, h: faces[0].h * k, size: faces[0].size * k } : null;
    const several = faces.length > 1 && faces[1].p >= 0.95 && faces[1].size >= faces[0].size * 0.6 && Math.hypot(faces[1].cx - faces[0].cx, faces[1].cy - faces[0].cy) > faces[0].size * 0.8;
    const res = await L.frameDriver(cutBuf, face, 500);
    if (several) { res.ok = false; res.reasons = [...(res.reasons || []), 'more than one face in the photo']; }
    return { res, faces: faces.length };
  } finally { try { fs.unlinkSync(cutP); } catch {} }
}
const cosmetic = (f) => /faded below the neck/.test(f);
function rank(c, i, ctx) {
  let sc = c.res.ok ? 10 : 0; if (!c.res.ok) return sc;
  if (c.res.face) sc += 4; if (c.res.topCut) sc -= 3; if (c.penal) sc -= 2;
  sc -= (c.res.flags || []).filter((f) => /small face|no face|cut off at the bottom/.test(f)).length;
  if (ctx.old && c.gap != null) sc += c.gap <= 12 ? 3 : c.gap <= 30 ? 1 : -2; // for old drivers prefer a photo from their time
  if (i === 0) sc += 1; return sc;
}
async function doDriver(d) {
  const [id, first, last, dob] = d, name = `${first} ${last}`; const ix = idxOf[id], fy = firstYear[ix] || 0, ly = lastYear[ix] || 0, old = ly && ly < 2005;
  const want = { name, first, last, dob };
  let best = null, person = null;
  for (const text of [name, `${last} ${first}`, `${name} racing driver`]) {
    const ents = await entities((await search(text)).slice(0, 8));
    for (const e of ents) { const sc = L.scoreDriver(e, want); if (sc >= 6) { if (!person || sc > person.sc) person = { sc, e }; if (L.pickFile(e.claims, 'P18') && (!best || sc > best.sc)) best = { sc, e }; } }
    if (best) break;
  }
  const who = best || person; if (!who) return { status: 'none', note: 'not found on Wikidata with a matching birth date' };
  const queue = []; const seen = new Set(); const add = (f, fromCat) => { if (f && !seen.has(f)) { seen.add(f); queue.push({ file: f, fromCat }); } };
  const p18 = ((who.e.claims.P18 || []).filter((c) => c.mainsnak && c.mainsnak.datavalue && typeof c.mainsnak.datavalue.value === 'string')).sort((a, b) => (b.rank === 'preferred') - (a.rank === 'preferred')).map((c) => c.mainsnak.datavalue.value);
  p18.slice(0, 2).forEach((f) => add(f, false));
  let catDone = false; const cands = []; const reasons = [];
  const loadCat = async () => {
    catDone = true; const cat = ((who.e.claims.P373 || [])[0] || {}).mainsnak; const catName = cat && cat.datavalue && cat.datavalue.value; if (!catName) return;
    const j = await http(`${CM}?${q({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + catName, cmtype: 'file', cmlimit: 60, format: 'json' })}`, { cacheKey: 'c_' + catName });
    const names = ((j.query && j.query.categorymembers) || []).map((m) => m.title.replace(/^File:/, '')).filter((n) => /\.(jpe?g|png)$/i.test(n) && !HARD_BAD.test(n));
    names.sort((a, b) => (L.fold(b).includes(L.fold(last)) ? 1 : 0) - (L.fold(a).includes(L.fold(last)) ? 1 : 0)); names.slice(0, 10).forEach((n) => add(n, true));
  };
  while (cands.length < 5) {
    if (!queue.length) { if (catDone) break; await loadCat(); if (!queue.length) break; }
    const { file, fromCat } = queue.shift(); const info = await fileInfo(file);
    if (info.mime && !/^image\/(jpeg|png|webp|tiff|gif)/.test(info.mime)) { reasons.push('photo file type ' + info.mime); continue; }
    if (info.width && info.width < 250) { reasons.push('photo too small'); continue; }
    let src; try { src = await fetchSource(file); } catch (e) { reasons.push('download failed'); continue; }
    const r = await process1(src, hash(file)); if (!r.res.ok) reasons.push(...(r.res.reasons || []));
    const gap = info.year ? (info.year < fy ? fy - info.year : info.year > ly ? info.year - ly : 0) : null;
    const c = { file, fromCat, info, res: r.res, gap, penal: BAD_NAME.test(file.replace(/\.[a-z]+$/i, '')) && !L.fold(file).includes(L.fold(last) + ' ' + L.fold(first).split(' ')[0]), buf: r.res.buf };
    cands.push(c);
    const good = c.res.ok && c.res.face && !c.res.topCut && !c.penal && (!old || gap == null || gap <= 30);
    if (good) break;
    if (!queue.length && !catDone && cands.length < 5) await loadCat();
  }
  const ok = cands.map((c, i) => ({ c, sc: rank(c, i, { old }) })).filter((x) => x.c.res.ok).sort((a, b) => b.sc - a.sc);
  if (!ok.length) { const why = [...new Set(reasons)].slice(0, 3).join('; '); return { status: 'none', note: cands.length ? `no usable portrait (${why || 'checked ' + cands.length + ' photos'})` : (p18.length ? 'photos could not be used (' + why + ')' : 'found on Wikidata but no photo anywhere') }; }
  const pick = ok[0].c, flags = (pick.res.flags || []).filter((f) => !cosmetic(f));
  if (pick.fromCat) flags.push('from Commons category, check');
  if (pick.penal) flags.push('file name suggests a car or event photo, check');
  if (old && pick.gap != null && pick.gap > 30) flags.push(`photo is from ${pick.info.year}, long after they raced`);
  if (pick.info.width && pick.info.width < 400) flags.push('low-res source');
  fs.writeFileSync(path.join(OUT, 'drivers', id + '.png'), pick.res.buf);
  return { status: flags.length ? 'check' : 'ok', flags, source: filePage(pick.file), license: pick.info.license, author: pick.info.author, year: pick.info.year || undefined, wikidata: who.e.id, score: who.sc, tried: cands.length };
}

// ---- logos ----
async function doTeam(t) {
  const [id, name] = t; const want = { name }; const syn = L.SYN[L.fold(name)] || [];
  let best = null;
  for (const text of [`${name} Formula One team`, name, `${name} F1`, ...syn]) {
    const ents = await entities((await search(text)).slice(0, 8));
    for (const e of ents) { const sc = L.scoreTeam(e, want); if (sc >= 2 && (!best || sc > best.sc)) best = { sc, e }; }
    if (best && best.sc >= 7) break;
  }
  let file = best && L.pickFile(best.e.claims, 'P154'); const flags = []; let how = 'wikidata';
  if (!file) { // Wikidata has no logo for it: look for a logo file on Commons by name
    for (const text of [`${name} logo`, `${name} Formula One logo`, ...syn.map((s) => `${s} logo`)]) {
      const j = await http(`${CM}?${q({ action: 'query', list: 'search', srsearch: text, srnamespace: 6, srlimit: 15, format: 'json' })}`, { cacheKey: 'ls_' + L.fold(text) });
      const f = L.pickLogoFile(((j.query && j.query.search) || []).map((x) => x.title), name); if (f) { file = f; how = 'search'; break; }
    }
    if (!file) return { status: 'none', note: 'no logo found on Wikidata or Commons' };
    flags.push('logo found by file search, check it is the right team');
  }
  const info = await fileInfo(file);
  if (best && best.sc < 7 && how === 'wikidata') flags.push('weak match: ' + ((best.e.labels && best.e.labels.en && best.e.labels.en.value) || best.e.id));
  const raw = await http(fileUrl(file, 768), { json: false });
  const lg = await L.squareLogo(await sharp(raw).ensureAlpha().png().toBuffer(), 512);
  if (lg.ratio < 0.02) return { status: 'none', note: 'logo came out empty' };
  if (lg.whitened) flags.push('was dark: made white');
  fs.writeFileSync(path.join(OUT, 'logos', id + '.png'), lg.buf);
  return { status: flags.some((f) => !/was dark/.test(f)) ? 'check' : 'ok', flags, aspect: +lg.aspect.toFixed(2), whiteBoxRemoved: lg.cleared || undefined, source: filePage(file), license: info.license, author: info.author, wikidata: best ? best.e.id : undefined, score: best ? best.sc : 0 };
}

// ---- your own pictures (manual/drivers, manual/logos) ----
async function doManual() {
  let n = 0;
  for (const kind of ['drivers', 'logos']) {
    if ((kind === 'drivers' && !doDrivers) || (kind === 'logos' && !doLogos)) continue;
    const dir = path.join(MANUAL, kind);
    for (const f of fs.readdirSync(dir).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
      const keep = /\.keep\.(png|webp)$/i.test(f), id = f.replace(/\.keep(?=\.)/i, '').replace(/\.(png|jpe?g|webp)$/i, ''), key = kind + ':' + id, st = fs.statSync(path.join(dir, f)), sig = `${st.size}-${Math.round(st.mtimeMs)}`;
      if (STATE[key] && STATE[key].manualSig === sig) continue;
      const name = kind === 'drivers' ? (idxOf[id] != null ? `${H.d[idxOf[id]][1]} ${H.d[idxOf[id]][2]}` : id) : ((H.t.find((t) => t[0] === id) || [])[1] || id);
      try {
        const buf = fs.readFileSync(path.join(dir, f)); let flags = ['your own file'], extra = {};
        if (kind === 'logos') { const lg = await L.squareLogo(await sharp(buf).ensureAlpha().png().toBuffer(), 512); fs.writeFileSync(path.join(OUT, 'logos', id + '.png'), lg.buf); extra.aspect = +lg.aspect.toFixed(2); }
        else if (keep) { fs.writeFileSync(path.join(OUT, 'drivers', id + '.png'), await sharp(buf).resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer()); flags.push('used as it is'); }
        else {
          const meta = await sharp(buf).metadata(), small = sharp(buf).rotate().resize({ width: 1000, height: 1400, fit: 'inside', withoutEnlargement: true });
          const cut = path.join(OUT, 'src', 'manual_' + id + '.png'), srcb = await small.png().toBuffer(); fs.writeFileSync(cut, srcb);
          let cutBuf = srcb; const st2 = await sharp(srcb).stats();
          if (!(meta.hasAlpha && !st2.isOpaque)) { const r = await cutout(cut, cut.replace('.png', '.cut.png')); if (r.error) throw new Error(r.error); cutBuf = fs.readFileSync(cut.replace('.png', '.cut.png')); try { fs.unlinkSync(cut.replace('.png', '.cut.png')); } catch {} } else flags.push('already transparent');
          const faces = await facesOf(srcb); const fc = faces[0] || null;
          let res = await L.frameDriver(cutBuf, fc, 500);
          if (!res.ok) { res = { ok: true, buf: await sharp(cutBuf).resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer() }; flags.push('could not be framed automatically, used as it is'); }
          fs.writeFileSync(path.join(OUT, 'drivers', id + '.png'), res.buf);
          try { fs.unlinkSync(cut); } catch {}
        }
        STATE[key] = { kind, id, name, status: 'ok', flags, manualSig: sig, source: 'file you added: ' + f, license: 'yours', ...extra }; n++; console.log(`${kind} ${id}: your file ${f} processed`);
      } catch (e) { STATE[key] = { kind, id, name, status: 'error', note: 'your file ' + f + ': ' + String((e && e.message) || e), manualSig: sig }; console.log(`${kind} ${id}: your file ${f} failed - ${STATE[key].note}`); }
      save();
    }
  }
  return n;
}

async function run(kind, items, fn, labelOf) {
  let n = 0;
  for (const it of items) {
    const id = it[0], key = kind + ':' + id;
    if (STATE[key] && STATE[key].manualSig) continue; // your own file wins
    if (STATE[key] && ['ok', 'check'].includes(STATE[key].status) && !only) { continue; }
    if (++n > limit) break;
    try { STATE[key] = { kind, id, name: labelOf(it), ...(await fn(it)) }; }
    catch (e) { STATE[key] = { kind, id, name: labelOf(it), status: 'error', note: String((e && e.message) || e) }; }
    const s = STATE[key]; if (s.status === 'none' || s.status === 'error') { try { fs.unlinkSync(path.join(OUT, kind, id + '.png')); } catch {} }
    console.log(`${kind} ${id}: ${s.status}${s.flags && s.flags.length ? ' (' + s.flags.join(', ') + ')' : ''}${s.note ? ' - ' + s.note : ''}`);
    save();
  }
}

// ---- reports ----
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function review() {
  const items = Object.values(STATE).filter((s) => s.status === 'ok' || s.status === 'check').sort((a, b) => (a.status === 'check' ? 0 : 1) - (b.status === 'check' ? 0 : 1) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const card = (s) => `<div class="c ${s.status}"><img loading="lazy" src="${s.kind}/${esc(s.id)}.png"><b>${esc(s.name)}</b><code>${esc(s.id)}</code>${(s.flags || []).map((f) => `<i>${esc(f)}</i>`).join('')}<small>${esc(s.license)}${s.author ? ' · ' + esc(s.author) : ''}${s.year ? ' · photo ' + s.year : ''}</small><a href="${esc(s.source)}" target="_blank">source</a></div>`;
  const miss = missing();
  fs.writeFileSync(path.join(OUT, 'review.html'), `<!doctype html><meta charset="utf-8"><title>Media review</title><style>
body{font:14px system-ui;background:#111;color:#eee;margin:20px}h2{margin:28px 0 8px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.c{background:#1b1b1f;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:4px}.c.check{outline:2px solid #e8a317}
.c img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:10px;background:conic-gradient(#2a2a30 25%,#222228 0 50%,#2a2a30 0 75%,#222228 0) 0 0/16px 16px}
code{color:#9aa}i{color:#e8a317;font-style:normal;font-size:12px}small{color:#889}a{color:#6af}</style>
<h1>Review before publishing</h1><p>Orange = look closely. To reject one, add its id to <code>reject.txt</code> (one per line), then run <code>npm run media:publish</code>. Missing pictures are listed in <code>out/missing.md</code> (and <code>missing.csv</code>); drop your own files into <code>tools/media-fetch/manual/</code>.</p>
<h2>Drivers (${items.filter((s) => s.kind === 'drivers').length})</h2><div class="g">${items.filter((s) => s.kind === 'drivers').map(card).join('')}</div>
<h2>Team logos (${items.filter((s) => s.kind === 'logos').length})</h2><div class="g">${items.filter((s) => s.kind === 'logos').map(card).join('')}</div>
<h2>Still missing (${miss.length})</h2><p>${miss.map((m) => `${esc(m.name)} <code>${esc(m.kind)}/${esc(m.id)}</code> ${esc(m.years)} - ${esc(m.reason)}`).join('<br>')}</p>`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(STATE, null, 1));
}
// Everything the app has no picture for (not in assets, not found/approved here, not already published).
function missing() {
  let pub = { drivers: [], logos: [] }; try { pub = JSON.parse(fs.readFileSync(path.join(root, 'remote-media', 'index.json'), 'utf8')); } catch {}
  const rejectF = path.join(__dirname, 'reject.txt'), rej = new Set(fs.existsSync(rejectF) ? fs.readFileSync(rejectF, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : []);
  const out = [];
  const has = (kind, id, own) => own.has(id) || (fs.existsSync(path.join(OUT, kind, id + '.png')) && !rej.has(id) && !rej.has(kind + ':' + id)) || ((pub[kind] || []).includes(id) && !rej.has(id));
  H.d.forEach((d, i) => { const id = APP[i]; if (has('drivers', id, new Set([...haveDrivers].filter((x) => x === id || x === d[0])))) return; const s = STATE['drivers:' + id]; out.push({ kind: 'drivers', id, name: `${d[1]} ${d[2]}`, years: firstYear[i] ? (firstYear[i] === lastYear[i] ? `${firstYear[i]}` : `${firstYear[i]}-${lastYear[i]}`) : '', last: lastYear[i] || 0, reason: s ? (s.note || s.status) : 'not searched yet', url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(d[1] + ' ' + d[2])}&ns6=1` }); });
  H.t.forEach((t) => { const id = t[0]; if (out.some((o) => o.kind === 'logos' && o.id === id)) return; if (has('logos', id, haveLogos)) return; const s = STATE['logos:' + id]; out.push({ kind: 'logos', id, name: t[1], years: '', last: 0, reason: s ? (s.note || s.status) : 'not searched yet', url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(t[1] + ' formula one logo')}&ns6=1` }); });
  return out.sort((a, b) => a.kind.localeCompare(b.kind) || b.last - a.last || a.name.localeCompare(b.name));
}
function writeMissing() {
  const m = missing(), dr = m.filter((x) => x.kind === 'drivers'), lg = m.filter((x) => x.kind === 'logos');
  const line = (x) => `- ${x.name} (${x.id})${x.years ? ' · ' + x.years : ''} · ${x.reason}\n  put the file at: tools/media-fetch/manual/${x.kind}/${x.id}.png   ·   look on Commons: ${x.url}`;
  fs.writeFileSync(path.join(OUT, 'missing.md'), `# Pictures not found\n\nHow to add one yourself: save any picture (a photo is fine, the tool cuts the background out) as the file name shown, then run npm run media:remote again and npm run media:publish.\nTeam logos: a PNG or SVG-as-PNG with or without background. If you already have a finished transparent square picture, name it <id>.keep.png and it is used untouched.\n\n## Drivers (${dr.length}) - newest first\n${dr.map(line).join('\n') || '(none)'}\n\n## Team logos (${lg.length})\n${lg.map(line).join('\n') || '(none)'}\n`);
  const csv = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  fs.writeFileSync(path.join(OUT, 'missing.csv'), 'kind,id,name,years,reason,put_file_at\n' + m.map((x) => [x.kind, x.id, x.name, x.years, x.reason, `tools/media-fetch/manual/${x.kind}/${x.id}.png`].map(csv).join(',')).join('\n'));
  return { drivers: dr.length, logos: lg.length };
}
(async () => {
  const tally = () => { const c = {}; for (const s of Object.values(STATE)) c[s.kind + ' ' + s.status] = (c[s.kind + ' ' + s.status] || 0) + 1; return c; };
  const mn = await doManual(); if (mn) console.log(`${mn} of your own pictures processed`);
  if (doDrivers) {
    const ds = H.d.map((d, i) => [[APP[i], d[1], d[2], d[3]], i, d[0]]).filter(([d, i, d0]) => (only ? only.includes(d[0]) || only.includes(d0) : (arg('--all-drivers') || !(haveDrivers.has(d[0]) || haveDrivers.has(d0))) && (!since || (lastYear[i] || 0) >= since))).map(([d]) => d);
    console.log(`drivers to look up: ${ds.length}`); await run('drivers', ds, (d) => doDriver(d), (d) => `${d[1]} ${d[2]}`);
  }
  if (doLogos) {
    const seenT = new Set(); const ts = H.t.filter((t) => { if (seenT.has(t[0])) return false; seenT.add(t[0]); return only ? only.includes(t[0]) : true; });
    console.log(`teams to look up: ${ts.length}`); await run('logos', ts, (t) => doTeam(t), (t) => t[1]);
  }
  review(); const mm = writeMissing(); if (worker) worker.kill();
  console.log('\nDone.', JSON.stringify(tally()));
  console.log(`Still without a picture: ${mm.drivers} drivers, ${mm.logos} team logos. The list (with the file name to use for each) is in tools/media-fetch/out/missing.md`);
  console.log('Open tools/media-fetch/out/review.html, check the pictures, then run: npm run media:publish');
  process.exit(0);
})().catch((e) => { console.error(e); if (worker) worker.kill(); process.exit(1); });
