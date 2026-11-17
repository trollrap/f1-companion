import { kvGet, kvSet } from './kv';
// Streak shield: finishing a 7-day streak earns one shield (you can hold one). When exactly one day is missed in a live streak, the next
// time the play calendar opens the shield covers that day and is used up. A gap of two or more days still ends the streak.
const KEY = 'shield:v1';
const ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (day, n) => { const [y, m, d] = day.split('-').map(Number); return ds(new Date(y, m - 1, d + n)); };
export const loadShield = async () => { const s = await kvGet(KEY, null); return { have: s && s.have ? 1 : 0, covered: Array.isArray(s?.covered) ? s.covered : [], granted: Array.isArray(s?.granted) ? s.granted : [] }; };
// Pure: current streak counting back from today (or yesterday), over played plus covered days, and the first day of that run.
export function runOf(set, nowDay) { let d = nowDay; if (!set.has(d)) d = shift(d, -1); let n = 0, start = null; while (set.has(d)) { n++; start = d; d = shift(d, -1); } return { cur: n, start }; }
// Pure: applies the rules to the stored state and returns the new state plus what happened.
export function settle(played, st, nowDay) {
  const covered = [...st.covered]; let have = st.have; const granted = [...st.granted]; let note = '';
  const all = () => new Set([...played, ...covered]);
  const yest = shift(nowDay, -1); const s0 = all();
  if (have && !s0.has(yest) && s0.has(shift(yest, -1)) && !s0.has(nowDay)) { covered.push(yest); have = 0; note = 'The shield covered your missed day, so the streak lives on.'; }
  const set = all(); const { cur, start } = runOf(set, nowDay);
  if (!have && cur >= 7 && start && !granted.includes(start)) { have = 1; granted.push(start); note = note || 'Seven days in a row: you earned a streak shield.'; }
  return { st: { have, covered: covered.slice(-60), granted: granted.slice(-30) }, note, cur };
}
export async function settleShield(played) { const st = await loadShield(); const r = settle(Array.isArray(played) ? played : [], st, ds(new Date())); if (JSON.stringify(r.st) !== JSON.stringify(st)) await kvSet(KEY, r.st); return r; }
