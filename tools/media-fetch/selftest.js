// Offline check of the picture logic: node selftest.js
const sharp = require('sharp'); const L = require('./lib');
(async () => {
  // fake "person": head circle + shoulders on a transparent background, placed off-centre in a big frame
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><circle cx="300" cy="260" r="90" fill="#c99"/><rect x="150" y="360" width="300" height="400" rx="80" fill="#335"/></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const c = await L.squareCrop(png, 500); const m = await sharp(c.buf).metadata();
  console.log('crop', m.width, m.height, 'subject ratio', c.ratio.toFixed(2));
  if (m.width !== 500 || m.height !== 500 || !(c.ratio > 0.2 && c.ratio < 0.9)) throw new Error('crop failed');
  const dark = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" rx="30" fill="#111"/></svg>`)).png().toBuffer();
  const lg = await L.squareLogo(dark, 512); console.log('dark logo whitened:', lg.whitened); if (!lg.whitened) throw new Error('whiten failed');
  const red = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="140" fill="#d00"/></svg>`)).png().toBuffer();
  const lr = await L.squareLogo(red, 512); console.log('red logo whitened:', lr.whitened); if (lr.whitened) throw new Error('red logo must keep colour');
  const ent = { labels: { en: { value: 'Nino Farina' } }, descriptions: { en: { value: 'Italian racing driver' } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }], P569: [{ mainsnak: { datavalue: { value: { time: '+1906-10-30T00:00:00Z', precision: 11 } } } }] } };
  const s = L.scoreDriver(ent, { name: 'Nino Farina', first: 'Nino', last: 'Farina', dob: '1906-10-30' }); console.log('driver score', s); if (s < 6) throw new Error('score');
  if (L.scoreDriver(ent, { name: 'Nino Farina', first: 'Nino', last: 'Farina', dob: '1950-01-01' }) !== 0) throw new Error('dob mismatch must reject');
  console.log('selftest ok');
})().catch((e) => { console.error(e); process.exit(1); });
