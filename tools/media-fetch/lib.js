// Pure helpers (no network), kept separate so they can be tested offline.
const sharp = require('sharp');

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Wikidata time value "+1906-10-30T00:00:00Z" with precision (11 = day, 9 = year) against our "1906-10-30".
function dobMatches(claims, dob) {
  if (!dob) return null;
  const list = (claims && claims.P569) || [];
  if (!list.length) return null;
  return list.some((c) => {
    const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; if (!v || !v.time) return false;
    const t = v.time.replace(/^\+/, '').slice(0, 10);
    return (v.precision || 11) >= 11 ? t === dob : t.slice(0, 4) === dob.slice(0, 4);
  });
}
const claimIds = (claims, p) => ((claims && claims[p]) || []).map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
// The picture file of a property (P18 photo, P154 logo): preferred rank first, then ones without an end date, then the last listed.
function pickFile(claims, p) {
  const list = ((claims && claims[p]) || []).filter((c) => c.mainsnak && c.mainsnak.datavalue && typeof c.mainsnak.datavalue.value === 'string');
  if (!list.length) return null;
  const ended = (c) => !!(c.qualifiers && c.qualifiers.P582);
  const best = list.find((c) => c.rank === 'preferred') || [...list].reverse().find((c) => !ended(c)) || list[list.length - 1];
  return best.mainsnak.datavalue.value;
}

// Score a Wikidata candidate for a driver. >= 6 is accepted.
function scoreDriver(ent, want) {
  const label = fold(ent.labels && ent.labels.en && ent.labels.en.value), desc = fold(ent.descriptions && ent.descriptions.en && ent.descriptions.en.value);
  const alias = ((ent.aliases && ent.aliases.en) || []).map((a) => fold(a.value));
  const dm0 = dobMatches(ent.claims, want.dob);
  const lastOk = label.includes(fold(want.last)) || alias.some((a) => a.includes(fold(want.last)));
  // an exact birth date is strong proof, so the name only has to contain the surname ("Bob Gerard" vs "Robert Gerard")
  const nameOk = label === fold(want.name) || alias.includes(fold(want.name)) || (lastOk && (dm0 === true || label.split(' ')[0] === fold(want.first).split(' ')[0]));
  if (!nameOk) return 0;
  const human = claimIds(ent.claims, 'P31').includes('Q5');
  if (!human) return 0;
  const racing = claimIds(ent.claims, 'P106').includes('Q378622') || /racing driver|formula (one|1)|motorsport|grand prix|driver/.test(desc);
  const dm = dobMatches(ent.claims, want.dob);
  let sc = 0;
  if (dm === true) sc += 6; else if (dm === false) return 0;
  if (racing) sc += dm === true ? 2 : 6; // without a birth date on Wikidata, only accept clear racing drivers
  return sc;
}
// Other names a team is known by on Wikidata / Commons (keys: folded app name).
const SYN = {
  hrt: ['hispania racing', 'hispania racing team', 'hrt formula one team'], virgin: ['virgin racing', 'marussia virgin racing', 'manor marussia'], marussia: ['marussia f1 team', 'manor marussia'],
  'toro rosso': ['scuderia toro rosso'], 'lotus racing': ['team lotus 2010', 'lotus racing 2010'], lotus: ['team lotus', 'lotus f1 team'], 'force india': ['sahara force india', 'force india formula one team'],
  renault: ['renault f1 team', 'renault sport'], 'bmw sauber': ['bmw sauber f1 team'], bar: ['british american racing'], 'racing point': ['racing point f1 team'], alphatauri: ['scuderia alphatauri'], rb: ['visa cash app rb', 'racing bulls'],
  'kick sauber': ['stake f1 team kick sauber', 'sauber motorsport'], jordan: ['jordan grand prix'], stewart: ['stewart grand prix'], jaguar: ['jaguar racing'], brawn: ['brawn gp'], 'super aguri': ['super aguri f1'], arrows: ['footwork arrows'], benetton: ['benetton formula'], 'red bull': ['red bull racing'],
};
// Score a candidate for a team (constructor).
function scoreTeam(ent, want) {
  const label = fold(ent.labels && ent.labels.en && ent.labels.en.value), desc = fold(ent.descriptions && ent.descriptions.en && ent.descriptions.en.value);
  const alias = ((ent.aliases && ent.aliases.en) || []).map((a) => fold(a.value));
  const clean = (x) => fold(x).replace(/\b(f1|formula (one|1)|team|racing|scuderia|automobiles?)\b/g, '').replace(/\s+/g, ' ').trim();
  const n = clean(want.name), names = [n, ...(SYN[fold(want.name)] || []).map(clean)].filter(Boolean);
  const lc = clean(label), ac = alias.map(clean);
  if (!names.some((x) => lc.includes(x) || (lc && x.includes(lc)) || ac.some((a) => a === x || a.includes(x)))) return 0;
  if (!pickFile(ent.claims, 'P154')) return 0;
  let sc = 1;
  if (/formula (one|1)/.test(desc)) sc += 6;
  else if (/racing|motorsport|constructor|grand prix/.test(desc)) sc += 3;
  if (/driver|footballer|person|album|film|video game|season/.test(desc)) return 0;
  if (label === fold(want.name)) sc += 1;
  return sc;
}
// Picks the most likely logo from a Commons file search (used when Wikidata has no logo for a team).
function pickLogoFile(titles, name) {
  const words = fold(name).split(' ').filter((w) => w.length > 1); if (!words.length) return null;
  const bad = /(car|livery|driver|helmet|garage|season|chassis|\bgp\b|grand prix|podium|pit|crash|stand|team photo|\bf1 \d|\b(19|20)\d\d\b.*\b(gp|season)\b|trophy|stamp|map|flag of)/i;
  const ok = titles.map((t) => t.replace(/^File:/, '')).filter((t) => /\.(svg|png)$/i.test(t) && /(logo|emblem|badge|wordmark|crest)/i.test(t) && !bad.test(t) && words.every((w) => fold(t).includes(w)));
  ok.sort((a, b) => (/\.svg$/i.test(b) ? 1 : 0) - (/\.svg$/i.test(a) ? 1 : 0) || a.length - b.length);
  return ok[0] || null;
}

// ---------- portraits ----------
// Reads the cut-out once and works out: who is the main person (biggest connected shape, or the one that holds the face), whether there is
// a second person / car next to them, and where the head and shoulders are. Everything outside the main person is rubbed out.
function analyse(data, w, h, face) {
  const B = Math.max(1, Math.ceil(Math.max(w, h) / 360)), mw = Math.ceil(w / B), mh = Math.ceil(h / B);
  const m = new Uint8Array(mw * mh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) m[((y / B) | 0) * mw + ((x / B) | 0)] = 1;
  // close small gaps (hair strands, glasses, a cut at the neck) by growing every shape by about 1 % of the picture size
  const r = Math.max(1, Math.round(Math.max(mw, mh) * 0.012)), t = new Uint8Array(mw * mh), d = new Uint8Array(mw * mh);
  for (let y = 0; y < mh; y++) { let last = -1e9; for (let x = 0; x < mw; x++) { if (m[y * mw + x]) last = x; if (x - last <= r) t[y * mw + x] = 1; } last = 1e9; for (let x = mw - 1; x >= 0; x--) { if (m[y * mw + x]) last = x; if (last - x <= r) t[y * mw + x] = 1; } }
  for (let x = 0; x < mw; x++) { let last = -1e9; for (let y = 0; y < mh; y++) { if (t[y * mw + x]) last = y; if (y - last <= r) d[y * mw + x] = 1; } last = 1e9; for (let y = mh - 1; y >= 0; y--) { if (t[y * mw + x]) last = y; if (last - y <= r) d[y * mw + x] = 1; } }
  const lab = new Int32Array(mw * mh), comps = [], stack = new Int32Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) {
    if (!d[i] || lab[i]) continue;
    const id = comps.length + 1; let sp = 0, area = 0, x0 = mw, y0 = mh, x1 = 0, y1 = 0; stack[sp++] = i; lab[i] = id;
    while (sp) { const c = stack[--sp], cx = c % mw, cy = (c / mw) | 0; if (m[c]) area++; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = cy + dy, xx = cx + dx; if (yy < 0 || yy >= mh || xx < 0 || xx >= mw) continue; const k = yy * mw + xx; if (d[k] && !lab[k]) { lab[k] = id; stack[sp++] = k; } } }
    comps.push({ id, area, x0, y0, x1, y1 });
  }
  if (!comps.length) return null;
  let main = comps.reduce((a, b) => (b.area > a.area ? b : a)), faceInside = false;
  if (face) { // the shape that holds the face is the person, even when something bigger is next to them
    const fx = Math.max(0, Math.min(mw - 1, Math.round(face.cx / B))), fy = Math.max(0, Math.min(mh - 1, Math.round(face.cy / B)));
    let hit = lab[fy * mw + fx]; if (!hit) for (let r = 1; r <= 4 && !hit; r++) for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) { const yy = fy + dy, xx = fx + dx; if (yy >= 0 && yy < mh && xx >= 0 && xx < mw) hit = lab[yy * mw + xx]; }
    if (hit) { main = comps[hit - 1]; faceInside = true; }
  }
  const keep = new Set([main.id]); let others = 0, bigOther = 0;
  for (const c of comps) {
    if (c.id === main.id) continue;
    const cxm = (c.x0 + c.x1) / 2, cym = (c.y0 + c.y1) / 2;
    if (c.area <= main.area * 0.15 && cxm >= main.x0 && cxm <= main.x1 && cym >= main.y0 && cym <= main.y1) keep.add(c.id); // small bits inside the person (hands, glasses, a microphone)
    else { others += c.area; if (c.area >= main.area * 0.35) bigOther = Math.max(bigOther, c.area / main.area); }
  }
  // rub out everything that is not the person; measure the person's box at full resolution
  const rowsN = new Array(h).fill(0), colsN = new Array(w).fill(0); let opaque = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, l = lab[((y / B) | 0) * mw + ((x / B) | 0)];
    if (!l || !keep.has(l)) { data[i + 3] = 0; continue; }
    if (data[i + 3] > 40) { rowsN[y]++; colsN[x]++; opaque++; }
  }
  const rt = Math.max(2, w * 0.006), ct = Math.max(2, h * 0.006);
  const y0 = rowsN.findIndex((v) => v >= rt), y1 = h - 1 - [...rowsN].reverse().findIndex((v) => v >= rt), x0 = colsN.findIndex((v) => v >= ct), x1 = w - 1 - [...colsN].reverse().findIndex((v) => v >= ct);
  if (y0 < 0 || x0 < 0 || y1 <= y0 || x1 <= x0) return null;
  return { w, h, x0, y0, x1, y1, faceInside, area: opaque / (w * h), bigOther, otherShare: others / Math.max(1, main.area), rowsN, topWidth: rowsN[Math.min(h - 1, y0 + 2)] };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Fades the bottom edge when the person ends inside the picture (a head-and-neck photo), so there is no hard cut line.
function fadeBottom(raw, size) {
  let last = -1; for (let y = size - 1; y >= 0 && last < 0; y--) for (let x = 0; x < size; x++) if (raw[(y * size + x) * 4 + 3] > 40) { last = y; break; }
  if (last < 0 || last >= size - 3) return false;
  const fh = Math.round(size * 0.11), top = Math.max(0, last - fh);
  for (let y = top; y <= last; y++) { const t = (last - y) / Math.max(1, last - top), a = t * t * (3 - 2 * t); for (let x = 0; x < size; x++) raw[(y * size + x) * 4 + 3] = Math.round(raw[(y * size + x) * 4 + 3] * a); }
  return true;
}
// The same framing for every driver: head about 40 % of the picture width, a little air above it, chest-up, one person only.
// `face` (optional) is the face box in the cut-out's pixels: { cx, cy, w, h }. Returns { ok, buf, flags[], reasons[], ... }.
async function frameDriver(cutPng, face, size = 500) {
  const { data, info } = await sharp(cutPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, flags = [], reasons = [];
  // a "face" that is not a normal face shape (a car number roundel, a wheel) is not trusted
  if (face && !(face.w / face.h >= 0.55 && face.w / face.h <= 1.3)) face = null;
  const a = analyse(data, w, h, face);
  if (!a) return { ok: false, reasons: ['nobody found in the photo'], flags };
  if (face && !a.faceInside) face = null; // the face is not on the cut-out person: ignore it
  const Pw = a.x1 - a.x0 + 1, Ph = a.y1 - a.y0 + 1;
  if (Pw < w * 0.1 || a.area < 0.03) reasons.push('person too small in the photo');
  if (a.bigOther >= 0.35) reasons.push('more than one person in the photo');
  if (!face && Pw > Ph * 1.15) reasons.push('wide shape without a face (car or group)');
  if (!face && !reasons.length) flags.push('no face found, check');
  if (a.y0 <= 1 && a.topWidth > w * 0.06) flags.push('head cut off at the top of the photo');
  if (a.y1 >= h - 2 && Ph < Pw * 1.1 && !face) flags.push('cut off at the bottom');
  if (face && face.size < 48) flags.push('small face, may look soft');
  if (reasons.length) return { ok: false, reasons, flags, face: !!face };
  const rowsIn = (from, to) => { let lo = w, hi = 0; for (let y = from; y < to && y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { if (x < lo) lo = x; if (x > hi) hi = x; } return hi > lo ? [lo, hi] : [a.x0, a.x1]; };
  let side, cx, top;
  if (face) {
    const fw = face.w; const [lo, hi] = rowsIn(a.y0, Math.round(a.y0 + fw * 3.4)); // shoulders: width within about 3.4 face widths from the top of the head
    side = clamp((hi - lo + 1) * 1.08, fw * 2.7, fw * 3.6);
    cx = face.cx * 0.7 + ((lo + hi) / 2) * 0.3;
    top = clamp(a.y0 - side * 0.05, face.cy - side * 0.55, face.cy - side * 0.28);
  } else if (Ph < Pw * 1.35) { // head-only photo, no shoulders: show the head smaller and let it fade out below
    side = Pw * 2.2; cx = (a.x0 + a.x1) / 2; top = a.y0 - side * 0.07;
  } else {
    side = Pw; cx = (a.x0 + a.x1) / 2;
    for (let k = 0; k < 2; k++) { const [lo, hi] = rowsIn(a.y0, Math.round(a.y0 + side * 0.95)); side = hi - lo + 1; cx = (lo + hi) / 2; }
    side *= 1.1; top = a.y0 - side * 0.05;
  }
  side = Math.round(side); const left = Math.round(cx - side / 2); top = Math.round(top);
  const ix0 = Math.max(0, left), iy0 = Math.max(0, top), ix1 = Math.min(w, left + side), iy1 = Math.min(h, top + side);
  if (ix1 <= ix0 || iy1 <= iy0) return { ok: false, reasons: ['could not frame the photo'], flags };
  const cleaned = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const part = await sharp(cleaned).extract({ left: ix0, top: iy0, width: ix1 - ix0, height: iy1 - iy0 }).png().toBuffer();
  const big = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: part, left: ix0 - left, top: iy0 - top }]).png().toBuffer();
  const { data: sm } = await sharp(big).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); // sharp resizes before it composites, so resize in a second step
  const faded = fadeBottom(sm, size); if (faded) flags.push('faded below the neck');
  const out = await sharp(sm, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  let op = 0; for (let i = 3; i < sm.length; i += 4) if (sm[i] > 40) op++;
  return { ok: true, buf: out, flags, reasons, ratio: op / (size * size), face: !!face, faceW: face ? face.w : 0, side, topCut: a.y0 <= 1 && a.topWidth > w * 0.06 };
}
// Older name, still used by the self test.
async function squareCrop(png, size = 500) { const r = await frameDriver(png, null, size); return r.ok ? { buf: r.buf, ratio: r.ratio } : null; }
// Photographed / flattened logos come with a white box around them: make the white that touches the border see-through.
async function clearWhiteBackground(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, light = (i, t) => data[i + 3] > 200 && data[i] >= t && data[i + 1] >= t && data[i + 2] >= t;
  let b = 0, white = 0; const edge = [];
  for (let x = 0; x < w; x++) { edge.push(x, (h - 1) * w + x); } for (let y = 1; y < h - 1; y++) { edge.push(y * w, y * w + w - 1); }
  for (const p of edge) { b++; if (light(p * 4, 235)) white++; }
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].every((p) => light(p * 4, 232));
  if (!b || !corners || white < b * 0.5) return { buf: png, cleared: false };
  const seen = new Uint8Array(w * h), stack = [];
  for (const p of edge) if (light(p * 4, 222) && !seen[p]) { seen[p] = 1; stack.push(p); }
  while (stack.length) { const p = stack.pop(), x = p % w, y = (p / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx; if (!seen[q] && light(q * 4, 222)) { seen[q] = 1; stack.push(q); } } }
  const out = Buffer.from(data); let cleared = 0;
  for (let p = 0; p < w * h; p++) if (seen[p]) { out[p * 4 + 3] = 0; cleared++; }
  // one pixel of light fringe next to the removed area goes too (anti-aliasing halo)
  for (let p = 0; p < w * h; p++) { if (seen[p]) continue; const x = p % w, y = (p / w) | 0; let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && seen[yy * w + xx]) near = true; } if (near && light(p * 4, 190)) out[p * 4 + 3] = Math.min(out[p * 4 + 3], 90); }
  if (cleared < w * h * 0.05) return { buf: png, cleared: false };
  return { buf: await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(), cleared: true };
}
// Logo: clean the background, trim empty borders, fit in a transparent square. Near-black single-colour logos are turned white so they show on the app's dark cards.
// `aspect` (width / height of the logo itself) lets the app give wide wordmarks a wider slot.
async function squareLogo(png, size = 512) {
  const cl = await clearWhiteBackground(png);
  let img = sharp(cl.buf).ensureAlpha(); let trimmed;
  try { trimmed = await img.clone().trim({ threshold: 8 }).png().toBuffer(); } catch { trimmed = await img.png().toBuffer(); }
  const tm = await sharp(trimmed).metadata(); const aspect = tm.width / Math.max(1, tm.height);
  const pad = Math.round(size * 0.04);
  const fit = await sharp(trimmed).resize({ width: size - pad * 2, height: size - pad * 2, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(fit).metadata();
  let canvas = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fit, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }]).png().toBuffer();
  const { data, info } = await sharp(canvas).raw().toBuffer({ resolveWithObject: true });
  let n = 0, lum = 0, sat = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) { n++; const r = data[i], g = data[i + 1], b = data[i + 2]; lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; sat += (Math.max(r, g, b) - Math.min(r, g, b)) / 255; }
  const meanLum = n ? lum / n : 1, meanSat = n ? sat / n : 0;
  let whitened = false;
  if (n && meanLum < 0.22 && meanSat < 0.12) {
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
    canvas = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer(); whitened = true;
  }
  return { buf: canvas, whitened, cleared: cl.cleared, aspect, ratio: n / (info.width * info.height) };
}
module.exports = { fold, dobMatches, claimIds, pickFile, scoreDriver, scoreTeam, SYN, pickLogoFile, frameDriver, squareCrop, squareLogo, clearWhiteBackground };
