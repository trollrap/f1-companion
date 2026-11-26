// Runs in its own process: the background-removal engine and sharp crash when loaded together, so this file never loads sharp.
// Protocol: parent sends { id, inPath, outPath } (cut-out) or { id, type: 'faces', rgb } (face finder on a 320x240 RGB picture, base64),
// worker answers { id, ok } / { id, boxes } / { id, error }.
const fs = require('fs'), path = require('path');
let removeBackground = null, ort = null, sess = null;
async function faceSession() {
  if (sess) return sess;
  ort = require('onnxruntime-node');
  sess = await ort.InferenceSession.create(path.join(__dirname, 'vendor', 'face-rfb-320.onnx'), { logSeverityLevel: 4 });
  return sess;
}
async function faces(m) {
  const s = await faceSession(), rgb = Buffer.from(m.rgb, 'base64'), n = 320 * 240;
  if (rgb.length !== n * 3) throw new Error('face finder: wrong picture size');
  const f = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { f[i] = (rgb[i * 3] - 127) / 128; f[n + i] = (rgb[i * 3 + 1] - 127) / 128; f[2 * n + i] = (rgb[i * 3 + 2] - 127) / 128; }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', f, [1, 3, 240, 320]) });
  const sc = out.scores.data, bx = out.boxes.data, res = [];
  for (let i = 0; i < sc.length / 2; i++) { const p = sc[i * 2 + 1]; if (p >= 0.5) res.push([bx[i * 4], bx[i * 4 + 1], bx[i * 4 + 2], bx[i * 4 + 3], p]); }
  return res;
}
process.on('message', async (m) => {
  try {
    if (m.type === 'faces') { process.send({ id: m.id, boxes: await faces(m) }); return; }
    if (!removeBackground) ({ removeBackground } = require('@imgly/background-removal-node'));
    const blob = await removeBackground(new Blob([fs.readFileSync(m.inPath)], { type: m.mime || 'image/png' }), { model: 'medium', output: { format: 'image/png' } });
    fs.writeFileSync(m.outPath, Buffer.from(await blob.arrayBuffer()));
    process.send({ id: m.id, ok: true });
  } catch (e) { process.send({ id: m.id, error: String((e && e.message) || e) }); }
});
process.send({ ready: true });
