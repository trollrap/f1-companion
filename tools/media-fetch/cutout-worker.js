// Runs in its own process: the background-removal engine and sharp crash when loaded together, so this file never loads sharp.
// Protocol: parent sends { id, inPath, outPath }, worker answers { id, ok } or { id, error }.
const fs = require('fs');
const { removeBackground } = require('@imgly/background-removal-node');
process.on('message', async (m) => {
  try {
    const blob = await removeBackground(new Blob([fs.readFileSync(m.inPath)], { type: 'image/png' }), { model: 'medium', output: { format: 'image/png' } });
    fs.writeFileSync(m.outPath, Buffer.from(await blob.arrayBuffer()));
    process.send({ id: m.id, ok: true });
  } catch (e) { process.send({ id: m.id, error: String((e && e.message) || e) }); }
});
process.send({ ready: true });
