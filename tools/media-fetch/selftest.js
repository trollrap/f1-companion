// Offline check of the picture logic: node selftest.js   (uses synthetic pictures, no network)
const sharp = require('sharp'); const L = require('./lib');
const fail = (m) => { throw new Error(m); };
(async () => {
  // fake "person": head circle + shoulders, off-centre in a big frame
  const person = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><circle cx="300" cy="260" r="90" fill="#c99"/><rect x="150" y="360" width="300" height="400" rx="80" fill="#335"/></svg>`)).png().toBuffer();
  let c = await L.frameDriver(person, null, 500); const m = await sharp(c.buf).metadata();
  console.log('person', m.width, m.height, 'ratio', c.ratio.toFixed(2), c.flags.join('; ')); if (!c.ok || m.width !== 500 || m.height !== 500 || !(c.ratio > 0.2 && c.ratio < 0.9)) fail('person crop failed');
  // with a face box: the head ends up about 1/3 of the width
  c = await L.frameDriver(person, { cx: 300, cy: 270, w: 150, h: 170, size: 160 }, 500); if (!c.ok || !c.face) fail('face crop failed');
  // head only (no shoulders): framed smaller and faded out below
  const head = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><ellipse cx="300" cy="300" rx="150" ry="190" fill="#c99"/></svg>`)).png().toBuffer();
  c = await L.frameDriver(head, null, 500); if (!c.ok) fail('head-only failed'); console.log('head only:', c.flags.join('; '));
  // a wide shape without a face (a car) is rejected
  const car = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect x="50" y="200" width="800" height="150" rx="40" fill="#c00"/><circle cx="200" cy="360" r="70" fill="#111"/><circle cx="700" cy="360" r="70" fill="#111"/></svg>`)).png().toBuffer();
  c = await L.frameDriver(car, null, 500); console.log('car:', c.ok, (c.reasons || []).join('; ')); if (c.ok) fail('car must be rejected');
  // two people side by side are rejected
  const two = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900"><circle cx="250" cy="200" r="90" fill="#c99"/><rect x="100" y="300" width="300" height="500" rx="80" fill="#335"/><circle cx="750" cy="210" r="85" fill="#c99"/><rect x="600" y="310" width="300" height="490" rx="80" fill="#533"/></svg>`)).png().toBuffer();
  c = await L.frameDriver(two, null, 500); console.log('two people:', c.ok, (c.reasons || []).join('; ')); if (c.ok) fail('two people must be rejected');
  // a stray fragment next to the person is removed, the person is kept
  const frag = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1000"><circle cx="300" cy="260" r="90" fill="#c99"/><rect x="150" y="360" width="300" height="400" rx="80" fill="#335"/><rect x="780" y="40" width="60" height="60" fill="#fff"/></svg>`)).png().toBuffer();
  c = await L.frameDriver(frag, null, 500); if (!c.ok) fail('person with a fragment failed');
  // logos
  const dark = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" rx="30" fill="#111"/></svg>`)).png().toBuffer();
  const lg = await L.squareLogo(dark, 512); console.log('dark logo whitened:', lg.whitened, 'aspect', lg.aspect.toFixed(1)); if (!lg.whitened) fail('whiten failed');
  const red = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="140" fill="#d00"/></svg>`)).png().toBuffer();
  if ((await L.squareLogo(red, 512)).whitened) fail('red logo must keep colour');
  const boxed = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#fff"/><rect x="40" y="100" width="520" height="100" rx="30" fill="#d00"/></svg>`)).png().toBuffer();
  const bl = await L.squareLogo(boxed, 512); console.log('white box removed:', bl.cleared, 'aspect', bl.aspect.toFixed(1)); if (!bl.cleared || bl.aspect < 4) fail('white box not removed');
  // names / scoring
  const ent = { labels: { en: { value: 'Nino Farina' } }, descriptions: { en: { value: 'Italian racing driver' } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }], P569: [{ mainsnak: { datavalue: { value: { time: '+1906-10-30T00:00:00Z', precision: 11 } } } }] } };
  if (L.scoreDriver(ent, { name: 'Nino Farina', first: 'Nino', last: 'Farina', dob: '1906-10-30' }) < 6) fail('score');
  if (L.scoreDriver(ent, { name: 'Nino Farina', first: 'Nino', last: 'Farina', dob: '1950-01-01' }) !== 0) fail('dob mismatch must reject');
  const team = { labels: { en: { value: 'Hispania Racing' } }, descriptions: { en: { value: 'Formula One racing team' } }, aliases: { en: [{ value: 'HRT F1 Team' }] }, claims: { P154: [{ rank: 'normal', mainsnak: { datavalue: { value: 'HRT.svg' } } }] } };
  if (L.scoreTeam(team, { name: 'HRT' }) < 2) fail('team alias match');
  if (L.pickLogoFile(['File:Scuderia Toro Rosso STR1.jpg', 'File:Scuderia Toro Rosso logo.svg'], 'Toro Rosso') !== 'Scuderia Toro Rosso logo.svg') fail('logo search pick');
  console.log('selftest ok');
})().catch((e) => { console.error(e); process.exit(1); });
