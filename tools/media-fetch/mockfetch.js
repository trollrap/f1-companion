// Test helper: pretends to be Wikidata/Commons so fetch.js can be exercised offline: node -r ./mockfetch.js fetch.js --only nino-farina,alfa
const sharp = require('sharp');
const person = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#88aacc"/><circle cx="450" cy="380" r="120" fill="#d9a88a"/><rect x="230" y="520" width="440" height="680" rx="110" fill="#223"/></svg>');
const logo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" rx="40" fill="#111"/></svg>');
const J = (o) => ({ ok: true, status: 200, json: async () => o, arrayBuffer: async () => new ArrayBuffer(0) });
global.fetch = async (url) => {
  url = String(url);
  if (url.includes('wbsearchentities')) return J({ search: [{ id: /Alfa/i.test(decodeURIComponent(url)) ? 'Q2' : 'Q1' }] });
  if (url.includes('wbgetentities')) {
    const q1 = { id: 'Q1', labels: { en: { value: 'Nino Farina' } }, descriptions: { en: { value: 'Italian racing driver' } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }], P569: [{ mainsnak: { datavalue: { value: { time: '+1906-10-30T00:00:00Z', precision: 11 } } } }], P18: [{ rank: 'normal', mainsnak: { datavalue: { value: 'Farina.jpg' } } }] } };
    const q2 = { id: 'Q2', labels: { en: { value: 'Alfa Romeo in Formula One' } }, descriptions: { en: { value: 'Formula One racing team' } }, claims: { P154: [{ rank: 'normal', mainsnak: { datavalue: { value: 'Alfa.svg' } } }] } };
    return J({ entities: { Q1: q1, Q2: q2 } });
  }
  if (url.includes('imageinfo')) return J({ query: { pages: { 1: { imageinfo: [{ width: 900, height: 1200, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Someone</a>' } } }] } } } });
  if (url.includes('Special:FilePath')) { const b = await sharp(/Alfa/.test(url) ? logo : person).png().toBuffer(); return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }; }
  throw new Error('unmocked ' + url);
};
