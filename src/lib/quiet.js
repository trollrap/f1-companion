import AsyncStorage from '@react-native-async-storage/async-storage';
// Quiet hours: alerts that would fire between "from" and "to" (local time) are not scheduled or sent. The race itself can be exempt.
let cfg = { on: false, from: '23:00', to: '07:00', raceOk: true };
export const setQuiet = (c) => { cfg = { on: !!c?.on, from: c?.from || '23:00', to: c?.to || '07:00', raceOk: c?.raceOk !== false }; };
const mins = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export function inQuiet(ms, c = cfg, session) {
  if (!c.on) return false; if (c.raceOk && session === 'Race') return false;
  const d = new Date(ms); const x = d.getHours() * 60 + d.getMinutes(), a = mins(c.from), b = mins(c.to);
  if (a === b) return false; return a < b ? x >= a && x < b : x >= a || x < b;
}
// Background tasks start without the app's state, so they read the saved preferences themselves.
export async function quietNow(ms = Date.now()) {
  try { const r = await AsyncStorage.getItem('prefs'); const q = r && JSON.parse(r)?.opts?.quiet; if (!q) return false; return inQuiet(ms, { on: !!q.on, from: q.from || '23:00', to: q.to || '07:00', raceOk: false }); } catch { return false; }
}
