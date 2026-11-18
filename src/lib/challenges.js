// Daily challenges: three games a day, picked from the date so they are the same all day. A challenge is done once that game has been played today
// (a move saved or a score written). Finishing all three records the day, which feeds the achievements.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GAMES } from './gameCatalog';
import { kvGet, kvSet, today, seedOf, rngOf } from './kv';

const POOL = GAMES.filter((g) => g.k || g.b);
export const gameKeys = (g) => [g.k ? `game:${g.k}` : null, g.b || null].filter(Boolean);
export function picksFor(day) {
  const rnd = rngOf(seedOf(`challenge:${day}`)); const pool = POOL.slice(); const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export async function loadChallenges() {
  const day = today(); let t = null; try { t = JSON.parse(await AsyncStorage.getItem('touched')); } catch {}
  const keys = new Set(t && t.day === day && Array.isArray(t.keys) ? t.keys : []);
  const list = picksFor(day).map((g) => ({ g, done: gameKeys(g).some((k) => keys.has(k)) }));
  const doneCount = list.filter((x) => x.done).length; let days = await kvGet('challengeDays', []); if (!Array.isArray(days)) days = [];
  if (doneCount === 3 && !days.includes(day)) { days = [...days, day]; kvSet('challengeDays', days); }
  return { day, list, doneCount, days };
}
