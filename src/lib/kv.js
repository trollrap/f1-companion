import AsyncStorage from '@react-native-async-storage/async-storage';
export const kvGet = async (k, d) => { try { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
// Game saves and best scores also mark today as played, for the play calendar (written at most once per day per run).
let lastMark = '';
async function markPlayed() { const t = today(); if (lastMark === t) return; lastMark = t; try { const r = await AsyncStorage.getItem('playDays'); const a = r ? JSON.parse(r) : []; if (Array.isArray(a) && !a.includes(t)) await AsyncStorage.setItem('playDays', JSON.stringify([...a, t].slice(-400))); } catch {} }
const PLAYED = /^game:|:best$|^daily/;
// Which game keys were written today (for the daily challenges). Kept in memory so a game that saves every move costs one storage write per day.
let touchDay = '', touchSet = new Set();
async function touch(k) {
  const t = today(); if (touchDay !== t) { touchDay = t; touchSet = new Set(); try { const r = JSON.parse(await AsyncStorage.getItem('touched')); if (r && r.day === t && Array.isArray(r.keys)) r.keys.forEach((x) => touchSet.add(x)); } catch {} }
  if (touchSet.has(k)) return; touchSet.add(k); try { await AsyncStorage.setItem('touched', JSON.stringify({ day: t, keys: [...touchSet] })); } catch {}
}
export const kvSet = (k, v) => { if (PLAYED.test(k)) { markPlayed(); touch(k); } return AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };
// Local calendar day, so a daily game rolls over at the player's midnight.
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const seedOf = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rngOf = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
