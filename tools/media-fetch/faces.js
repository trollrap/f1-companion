// Face finder (pico.js, MIT, + its small face cascade in vendor/). Pure JavaScript, no model download, works offline.
// Used to tell "a portrait of a person" from cars / groups / crowds, and to frame every driver the same way (head about 40 % of the picture width).
const fs = require('fs'), path = require('path'), vm = require('vm');
const sharp = require('sharp');
let engine = null;
function load() {
  if (engine) return engine;
  const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'vendor', 'pico.js'), 'utf8') + '\n;this.pico = pico;', ctx);
  const pico = ctx.pico; engine = { pico, classify: pico.unpack_cascade(new Int8Array(fs.readFileSync(path.join(__dirname, 'vendor', 'facefinder')))) };
  return engine;
}
// Returns faces in the pixel coordinates of the picture that was passed in, biggest first: [{ cx, cy, size, q }]
async function detectFaces(png, { maxSide = 720, minQ = 8 } = {}) {
  const { pico, classify } = load();
  const meta = await sharp(png).metadata(); const sc = Math.min(1, maxSide / Math.max(meta.width, meta.height));
  const w = Math.max(16, Math.round(meta.width * sc)), h = Math.max(16, Math.round(meta.height * sc));
  // flatten any transparency onto mid-grey so a cut-out works too
  const grey = await sharp(png).flatten({ background: '#808080' }).resize(w, h, { fit: 'fill' }).greyscale().raw().toBuffer();
  const image = { pixels: new Uint8Array(grey.buffer, grey.byteOffset, w * h), nrows: h, ncols: w, ldim: w };
  let dets = pico.run_cascade(image, classify, { shiftfactor: 0.1, minsize: Math.max(24, Math.round(Math.min(w, h) * 0.05)), maxsize: Math.max(w, h), scalefactor: 1.1 });
  dets = pico.cluster_detections(dets, 0.2).filter((d) => d[3] >= minQ);
  return dets.map(([r, c, s, q]) => ({ cx: c / sc, cy: r / sc, size: s / sc, q })).sort((a, b) => b.size * Math.min(b.q, 60) - a.size * Math.min(a.q, 60));
}
module.exports = { detectFaces };
