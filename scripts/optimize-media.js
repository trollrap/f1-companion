// Run automatically by `npm run media`. Shrinks big photos and logos so the app stays fast (a 2000px PNG decoded into every list row is what makes lists lag).
// Originals are copied to assets_originals/ first. Needs the `sharp` package (a devDependency); if it is missing this step is skipped.
const fs = require('fs'), path = require('path');
let sharp; try { sharp = require('sharp'); } catch { console.log('(sharp not installed, skipping image optimisation: run npm install)'); process.exit(0); }
const root = path.join(__dirname, '..');
const LIMIT = { drivers: 400, logos: 256, cars: 900, principals: 400, engineers: 400, numbers: 640 }; // max width/height in px
(async () => {
  let n = 0;
  for (const [dir, max] of Object.entries(LIMIT)) {
    const d = path.join(root, 'assets', dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
      const file = path.join(d, f), m = await sharp(file).metadata();
      if (Math.max(m.width, m.height) <= max) continue;
      const bk = path.join(root, 'assets_originals', dir); fs.mkdirSync(bk, { recursive: true });
      if (!fs.existsSync(path.join(bk, f))) fs.copyFileSync(file, path.join(bk, f));
      let img = sharp(path.join(bk, f)).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
      if (/\.png$/i.test(f)) img = img.png({ compressionLevel: 9 }); else if (/\.webp$/i.test(f)) img = img.webp({ quality: 88 }); else img = img.jpeg({ quality: 88 });
      fs.writeFileSync(file, await img.toBuffer()); n++;
    }
  }
  console.log(n ? `Optimised ${n} images (originals kept in assets_originals/).` : 'Images already small enough.');
})().catch((e) => { console.log('Image optimisation skipped:', e.message); });
