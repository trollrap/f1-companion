import { standings, nextStep } from './sim';
// Paddock rumour mill: three rumours about the next race, made from the standings. You Believe or Doubt each one; after the race is simulated they are
// judged against the real result. A correct call on the less likely side scores more. Picks live in f.rumours[raceId], everything else is derived.
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const clamp = (v) => Math.max(0.08, Math.min(0.92, v));
const raceRows = (f, raceId) => f.results?.[raceId]?.Race || null;
const finished = (r) => r && r.status === 'OK' && r.pos > 0;

export function rumoursFor(f, race) {
  if (!f || !race) return [];
  const rnd = rng(`${f.id}|${race.id}|rumour`); const st = standings(f); const D = st.drivers, T = st.teams; if (D.length < 6) return [];
  const pickN = (arr, n) => arr[Math.min(arr.length - 1, Math.floor(rnd() * n))];
  const out = []; const nm = race.name;
  // 1. a team-mate battle
  const t = pickN(T.filter((x) => D.filter((d) => d.teamId === x.id).length >= 2), 4);
  if (t) { const [a, b] = D.filter((d) => d.teamId === t.id).slice(0, 2); const pa = a.points + 4, pb = b.points + 4;
    out.push({ id: 'mate', text: `${a.name} will finish ahead of team-mate ${b.name} in ${nm}.`, p: clamp(pa / (pa + pb)), judge: (rs) => { const x = rs.find((r) => r.driverId === a.id), y = rs.find((r) => r.driverId === b.id); if (!x || !y) return null; if (!finished(x)) return false; return !finished(y) || x.pos < y.pos; } }); }
  // 2. a mid-field driver scores points
  const mid = D.slice(Math.floor(D.length * 0.5), Math.floor(D.length * 0.85)); const m = mid.length ? mid[Math.floor(rnd() * mid.length)] : null;
  if (m) out.push({ id: 'pts', text: `${m.name} will score points in ${nm}.`, p: clamp(0.18 + (1 - D.indexOf(m) / D.length) * 0.45), judge: (rs) => { const x = rs.find((r) => r.driverId === m.id); return x ? finished(x) && x.pos <= 10 : null; } });
  // 3. a shock or a safety car
  if (rnd() < 0.5) { const top3 = D.slice(0, 3).map((d) => d.id); out.push({ id: 'shock', text: `A driver outside the championship top three will win ${nm}.`, p: 0.3, judge: (rs) => { const w = rs.find((r) => r.pos === 1 && finished(r)); return w ? !top3.includes(w.driverId) : null; } }); }
  else out.push({ id: 'sc', text: `There will be a safety car in ${nm}.`, p: 0.5, judge: (rs) => (rs[0] ? !!rs[0].sc : null) });
  return out;
}
// The rumours of every race so far, with the user's picks and what happened. Score: right call = 4 + 20 x (1 - chance of the side you picked).
export function rumourBoard(f) {
  const rows = []; let score = 0, right = 0, made = 0;
  (f.races || []).forEach((race) => {
    const picks = f.rumours?.[race.id]; if (!picks) return; const rs = raceRows(f, race.id);
    rumoursFor(withPre(f, race), race).forEach((r) => { const pick = picks[r.id]; if (!pick) return; const res = rs ? r.judge(rs) : null; let pts = 0;
      if (res != null) { made++; const ok = (pick === 'yes') === res; if (ok) { right++; pts = 4 + Math.round(20 * (1 - (pick === 'yes' ? r.p : 1 - r.p))); score += pts; } rows.push({ race: race.name, text: r.text, pick, res, ok, pts }); } }); });
  return { rows: rows.reverse(), score, right, made };
}
// Rumours must be made from the standings as they were BEFORE that race, so a finished race's rumours are rebuilt from the earlier races only.
function withPre(f, race) { const i = f.races.findIndex((x) => x.id === race.id); if (i < 0) return f; const keep = {}; f.races.slice(0, i).forEach((r) => { if (f.results?.[r.id]) keep[r.id] = f.results[r.id]; }); return { ...f, results: keep }; }
export const rumoursNow = (f) => { const st = nextStep(f); return st && !f.off && !f.ended ? { race: st.race, list: rumoursFor(withPre(f, st.race), st.race), picks: f.rumours?.[st.race.id] || {}, started: !!f.results?.[st.race.id] } : null; };
