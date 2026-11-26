// Parent side of the face finder: cuts the picture into 320x240 views, asks the worker (which owns the onnx runtime) and maps the boxes back.
// Much better than the tiny built-in finder (faces.js) with side views and old black-and-white photos. Returns [{ cx, cy, w, h, size, p }] biggest first.
const sharp = require('sharp');
const iou = (a, b) => { const x = Math.max(0, Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2)), y = Math.max(0, Math.min(a.cy + a.h / 2, b.cy + b.h / 2) - Math.max(a.cy - a.h / 2, b.cy - b.h / 2)); return (x * y) / (a.w * a.h + b.w * b.h - x * y); };
async function detectNet(call, png, minP = 0.75) {
  const meta = await sharp(png).metadata(), W = meta.width, H = meta.height;
  const passes = [{ x: 0, y: 0, w: W, h: H }];
  if (H > W * 1.3) passes.push({ x: 0, y: 0, w: W, h: Math.round(W * 1.1) }); // tall picture: look at the top part at a bigger scale
  let all = [];
  for (const p of passes) {
    const s = Math.min(320 / p.w, 240 / p.h), rw = Math.max(1, Math.min(320, Math.round(p.w * s))), rh = Math.max(1, Math.min(240, Math.round(p.h * s)));
    const padL = Math.floor((320 - rw) / 2), padT = Math.floor((240 - rh) / 2);
    const buf = await sharp(png).flatten({ background: '#808080' }).extract({ left: p.x, top: p.y, width: p.w, height: p.h }).resize(rw, rh, { fit: 'fill' })
      .extend({ top: padT, bottom: 240 - rh - padT, left: padL, right: 320 - rw - padL, background: { r: 127, g: 127, b: 127 } }).removeAlpha().raw().toBuffer();
    const r = await call({ type: 'faces', rgb: buf.toString('base64') }); if (r.error) throw new Error(r.error);
    for (const [x1, y1, x2, y2, pr] of r.boxes) {
      if (pr < minP) continue;
      const bx1 = ((x1 * 320 - padL) / s) + p.x, bx2 = ((x2 * 320 - padL) / s) + p.x, by1 = ((y1 * 240 - padT) / s) + p.y, by2 = ((y2 * 240 - padT) / s) + p.y;
      const w = bx2 - bx1, h = by2 - by1; if (w < 8 || h < 8) continue;
      all.push({ cx: (bx1 + bx2) / 2, cy: (by1 + by2) / 2, w, h, size: (w + h) / 2, p: pr });
    }
  }
  all.sort((a, b) => b.p - a.p); const keep = [];
  for (const f of all) if (!keep.some((k) => iou(k, f) > 0.3)) keep.push(f);
  return keep.sort((a, b) => b.p * b.size - a.p * a.size);
}
module.exports = { detectNet };
