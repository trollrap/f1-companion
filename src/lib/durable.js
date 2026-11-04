import AsyncStorage from '@react-native-async-storage/async-storage';
// Small things that must survive closing the app (the fantasy seasons, the welcome flag, the accent colour) are written twice: to AsyncStorage
// and to a file in the app's own folder. When reading, whichever copy is newer wins, so if one of them was lost or never written the other brings it back.
let FS = null; try { FS = require('expo-file-system/legacy'); } catch {}
const file = (k) => (FS && FS.documentDirectory ? `${FS.documentDirectory}${String(k).replace(/[^a-z0-9_.-]/gi, '_')}.json` : null);
const pack = (str) => JSON.stringify({ t: Date.now(), v: str });
const unpack = (raw) => { if (!raw) return null; try { const o = JSON.parse(raw); if (o && typeof o === 'object' && typeof o.v === 'string' && typeof o.t === 'number') return o; } catch {} return { t: 0, v: raw }; };
export async function readDurable(key) {
  let a = null, b = null;
  try { a = unpack(await AsyncStorage.getItem(key)); } catch {}
  try { const f = file(key); if (f && (await FS.getInfoAsync(f)).exists) b = unpack(await FS.readAsStringAsync(f)); } catch {}
  const best = a && b ? (b.t > a.t ? b : a) : a || b;
  return best ? best.v : null;
}
// Resolves true when at least one copy was written and read back.
export async function writeDurable(key, str) {
  const raw = pack(str); let ok = false;
  try { await AsyncStorage.setItem(key, raw); ok = true; } catch {}
  try { const f = file(key); if (f) { await FS.writeAsStringAsync(f, raw); ok = true; } } catch {}
  return ok;
}
