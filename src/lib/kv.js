import AsyncStorage from '@react-native-async-storage/async-storage';
export const kvGet = async (k, d) => { try { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
export const kvSet = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
// Local calendar day, so a daily game rolls over at the player's midnight.
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const seedOf = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rngOf = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
