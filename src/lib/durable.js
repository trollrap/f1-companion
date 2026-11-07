import AsyncStorage from '@react-native-async-storage/async-storage';
// Small things that must survive closing the app (the fantasy seasons, the welcome flag, the accent colour) are written twice: to AsyncStorage
// and to a file in the app's own folder. When reading, whichever copy is newer wins, so if one of them was lost or never written the other brings it back.
let FS = null; try { FS = require('expo-file-system/legacy'); } catch {}
const file = (k) => (FS && FS.documentDirectory ? `${FS.documentDirectory}${String(k).replace(/[^a-z0-9_.-]/gi, '_')}.json` : null);
// New format is "T:<time>\n<text>" (no second round of JSON escaping, so big saves need half the memory); the old {t,v} wrapper still reads fine.
const pack = (str) => `T:${Date.now()}\n${str}`;
const unpack = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('T:')) { const nl = raw.indexOf('\n'); const t = Number(raw.slice(2, nl)); if (nl > 2 && Number.isFinite(t)) return { t, v: raw.slice(nl + 1) }; }
  try { const o = JSON.parse(raw); if (o && typeof o === 'object' && typeof o.v === 'string' && typeof o.t === 'number') return o; } catch {}
  return { t: 0, v: raw };
};
// AsyncStorage on Android cannot hold or read back rows of several MB, so big saves live in the file only (plus its backup).
const BIG = 1500000;
const rd = async (f) => { try { if ((await FS.getInfoAsync(f)).exists) return unpack(await FS.readAsStringAsync(f)); } catch {} return null; };
// valid(text) lets the caller reject a damaged copy; the newest copy that passes wins (main file, then the backup of the previous save, then AsyncStorage).
export async function readDurable(key, valid) {
  const f = file(key); const list = [];
  try { list.push(unpack(await AsyncStorage.getItem(key))); } catch {}
  if (f && FS) { list.push(await rd(f)); list.push(await rd(`${f}.bak`)); list.push(await rd(`${f}.tmp`)); }
  const ok = list.filter((x) => x && x.v && (!valid || valid(x.v))).sort((a, b) => b.t - a.t);
  return ok.length ? ok[0].v : null;
}
// Resolves true when at least one copy was written. The file is written to .tmp first and the previous good file is kept as .bak, so a crash in the middle of a write can never destroy the save.
export async function writeDurable(key, str) {
  const raw = pack(str); let ok = false; const f = file(key);
  if (str.length < BIG) { try { await AsyncStorage.setItem(key, raw); ok = true; } catch {} } else { try { await AsyncStorage.removeItem(key); } catch {} }
  if (f && FS) {
    try {
      await FS.writeAsStringAsync(`${f}.tmp`, raw);
      const had = (await FS.getInfoAsync(f)).exists;
      if (had) { try { await FS.deleteAsync(`${f}.bak`, { idempotent: true }); } catch {} await FS.moveAsync({ from: f, to: `${f}.bak` }); }
      await FS.moveAsync({ from: `${f}.tmp`, to: f });
      ok = true;
    } catch { try { await FS.writeAsStringAsync(f, raw); ok = true; } catch {} }
  }
  return ok;
}
