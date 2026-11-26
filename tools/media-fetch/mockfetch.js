// Test helper: pretends to be Wikidata/Commons so fetch.js can be exercised offline:
//   MOCK_PHOTO=some-face.png node -r ./mockfetch.js fetch.js --only nino-farina,alfa,toro_rosso,hrt
const fs = require('fs'); const sharp = require('sharp');
const person = process.env.MOCK_PHOTO && fs.existsSync(process.env.MOCK_PHOTO) ? fs.readFileSync(process.env.MOCK_PHOTO)
  : Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#88aacc"/><circle cx="450" cy="380" r="120" fill="#d9a88a"/><rect x="230" y="520" width="440" height="680" rx="110" fill="#223"/></svg>');
const logoBox = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#fff"/><rect x="40" y="130" width="720" height="140" rx="30" fill="#c00"/></svg>');
const J = (o) => ({ ok: true, status: 200, json: async () => o, arrayBuffer: async () => new ArrayBuffer(0) });
const ent = (id, label, desc, claims, aliases) => ({ id, labels: { en: { value: label } }, descriptions: { en: { value: desc } }, aliases: { en: (aliases || []).map((a) => ({ value: a })) }, claims });
global.fetch = async (url) => {
  url = String(url); const dec = decodeURIComponent(url);
  if (url.includes('wbsearchentities')) return J({ search: [{ id: /Alfa/i.test(dec) ? 'Q2' : /Toro/i.test(dec) ? 'Q3' : /HRT|Hispania/i.test(dec) ? 'Q4' : 'Q1' }] });
  if (url.includes('wbgetentities')) {
    const human = [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }];
    return J({ entities: {
      Q1: ent('Q1', 'Nino Farina', 'Italian racing driver', { P31: human, P569: [{ mainsnak: { datavalue: { value: { time: '+1906-10-30T00:00:00Z', precision: 11 } } } }], P18: [{ rank: 'normal', mainsnak: { datavalue: { value: 'Farina_Nino.jpg' } } }] }),
      Q2: ent('Q2', 'Alfa Romeo in Formula One', 'Formula One racing team', { P154: [{ rank: 'normal', mainsnak: { datavalue: { value: 'Alfa.svg' } } }] }),
      Q3: ent('Q3', 'Scuderia Toro Rosso', 'Formula One racing team', {}),
      Q4: ent('Q4', 'Hispania Racing', 'Formula One racing team', { P154: [{ rank: 'normal', mainsnak: { datavalue: { value: 'HRT.svg' } } }] }, ['HRT F1 Team']),
    } });
  }
  if (url.includes('imageinfo')) return J({ query: { pages: { 1: { imageinfo: [{ width: 900, height: 1200, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Someone</a>' }, DateTimeOriginal: { value: '1951-05-13' } } }] } } } });
  if (url.includes('list=search')) return J({ query: { search: [{ title: 'File:Scuderia Toro Rosso logo.svg' }, { title: 'File:Toro Rosso STR1 car.jpg' }] } });
  if (url.includes('categorymembers')) return J({ query: { categorymembers: [] } });
  if (url.includes('Special:FilePath')) { const b = await sharp(/Alfa|HRT|logo/i.test(dec) ? logoBox : person).png().toBuffer(); return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }; }
  throw new Error('unmocked ' + url);
};
