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
// Score a candidate for a team (constructor).
function scoreTeam(ent, want) {
  const label = fold(ent.labels && ent.labels.en && ent.labels.en.value), desc = fold(ent.descriptions && ent.descriptions.en && ent.descriptions.en.value);
  const n = fold(want.name).replace(/\b(f1|formula (one|1)|team|racing|scuderia|automobiles?)\b/g, '').replace(/\s+/g, ' ').trim();
  if (!n || !(label.includes(n) || n.includes(label))) return 0;
  if (!pickFile(ent.claims, 'P154')) return 0;
  let sc = 1;
  if (/formula (one|1)/.test(desc)) sc += 6;
  else if (/racing|motorsport|constructor|grand prix/.test(desc)) sc += 3;
  if (/driver|footballer|person|album|film/.test(desc)) return 0;
  if (label === fold(want.name)) sc += 1;
  return sc;
}

// Bounding box of the visible subject (alpha above a threshold, ignoring stray specks).
async function subjectBox(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info; const rows = new Array(h).fill(0), cols = new Array(w).fill(0);
  let opaque = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { rows[y]++; cols[x]++; opaque++; }
  const rt = Math.max(2, w * 0.012), ct = Math.max(2, h * 0.012);
  const y0 = rows.findIndex((v) => v >= rt), y1 = h - 1 - [...rows].reverse().findIndex((v) => v >= rt);
  const x0 = cols.findIndex((v) => v >= ct), x1 = w - 1 - [...cols].reverse().findIndex((v) => v >= ct);
  if (y0 < 0 || x0 < 0 || y1 < y0 || x1 < x0) return null;
  return { x0, y0, x1, y1, w, h, ratio: opaque / (w * h), data };
}
// Chest-up square: centred on the shoulders, starting just above the head.
async function squareCrop(png, size = 500) {
  const b = await subjectBox(png); if (!b) return null;
  let side = b.x1 - b.x0 + 1;
  // shoulder width is measured inside the first `side` rows from the top of the head
  let cx = (b.x0 + b.x1) / 2;
  for (let k = 0; k < 2; k++) {
    let lo = b.w, hi = 0; const yEnd = Math.min(b.h, b.y0 + Math.round(side * 0.95));
    for (let y = b.y0; y < yEnd; y++) for (let x = 0; x < b.w; x++) if (b.data[(y * b.w + x) * 4 + 3] > 40) { if (x < lo) lo = x; if (x > hi) hi = x; }
    if (hi > lo) { side = hi - lo + 1; cx = (lo + hi) / 2; }
  }
  side = Math.round(side * 1.1);
  const left = Math.round(cx - side / 2), top = Math.round(b.y0 - side * 0.05);
  const ix0 = Math.max(0, left), iy0 = Math.max(0, top), ix1 = Math.min(b.w, left + side), iy1 = Math.min(b.h, top + side);
  if (ix1 <= ix0 || iy1 <= iy0) return null;
  const part = await sharp(png).extract({ left: ix0, top: iy0, width: ix1 - ix0, height: iy1 - iy0 }).png().toBuffer();
  const out = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: part, left: ix0 - left, top: iy0 - top }]).png().toBuffer();
  const sized = await sharp(out).resize(size, size).png({ compressionLevel: 9 }).toBuffer(); // sharp resizes before it composites, so resize in a second step
  const chk = await subjectBox(sized);
  return { buf: sized, ratio: chk ? chk.ratio : 0, subjectW: b.x1 - b.x0 + 1, subjectH: b.y1 - b.y0 + 1 };
}
// Logo: trim empty borders, fit in a transparent square. Near-black single-colour logos are turned white so they show on the app's dark cards.
async function squareLogo(png, size = 512) {
  let img = sharp(png).ensureAlpha(); let trimmed;
  try { trimmed = await img.clone().trim({ threshold: 8 }).png().toBuffer(); } catch { trimmed = await img.png().toBuffer(); }
  const pad = Math.round(size * 0.07);
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
  return { buf: canvas, whitened, ratio: n / (info.width * info.height) };
}
module.exports = { fold, dobMatches, claimIds, pickFile, scoreDriver, scoreTeam, subjectBox, squareCrop, squareLogo };
