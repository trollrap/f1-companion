// Team Principal mode: run one team of a fantasy save. Prize money after every race pays for car upgrades and driver contracts,
// and a press conference after each race moves the team's reputation (hype), which in turn changes the sponsor money.
import { TA } from './sim';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
export const START_BUDGET = 60;
export const UPGRADES = {
  aero: { label: 'Aerodynamics', field: 'car', icon: 'airplane', gain: [0.6, 1.2], blurb: 'More downforce: a faster car everywhere.' },
  power: { label: 'Power unit', field: 'car', icon: 'flash', gain: [0.4, 1.0], blurb: 'More power on the straights.' },
  rel: { label: 'Reliability', field: 'rel', icon: 'shield-checkmark', gain: [1.0, 2.0], blurb: 'Fewer breakdowns.' },
  pit: { label: 'Pit crew', field: 'pit', icon: 'build', gain: [1.0, 2.5], blurb: 'Quicker, cleaner stops.' },
};
export const EXTEND_COST = 12;
const field = (t, k) => (k === 'car' ? t.car ?? 65 : TA(t)[k]);
const rank = (f) => [...f.teams].sort((a, b) => (b.car ?? 65) - (a.car ?? 65));
export const costOf = (f, k) => 14 + (f.tp?.levels?.[k] || 0) * 8;
const stand = (f) => {
  const pts = {}; f.teams.forEach((t) => { pts[t.id] = 0; });
  f.races.forEach((r) => { const res = f.results?.[r.id]; if (!res) return; ['Sprint', 'Race'].forEach((k) => (res[k] || []).forEach((x) => { const d = f.drivers.find((y) => y.id === x.driverId); if (d && pts[d.teamId] != null) pts[d.teamId] += x.points || 0; })); });
  return pts;
};
export const teamPoints = (f, teamId) => stand(f)[teamId] || 0;
export const position = (f) => { const pts = stand(f), me = f.tp?.teamId; const order = [...f.teams].sort((a, b) => pts[b.id] - pts[a.id] || (b.car ?? 65) - (a.car ?? 65)); return order.findIndex((t) => t.id === me) + 1; };
export function startTP(f, teamId) {
  const order = rank(f); const exp = order.findIndex((t) => t.id === teamId) + 1;
  return { ...f, tp: { teamId, budget: START_BUDGET, hype: 50, levels: {}, paid: {}, press: {}, log: [], season: f.season, target: Math.max(1, exp - (exp > 3 ? 1 : 0)) } };
}
export const endTP = (f) => { const { tp, ...rest } = f; return rest; };
const note = (tp, text) => [{ season: tp.season, text }, ...(tp.log || [])].slice(0, 30);
// Pays out races that have been run since the last visit; a new season brings a sponsor bonus and a fresh target. Returns the same object when nothing changed.
export function settle(f) {
  const tp = f.tp; if (!tp) return f; let t = { ...tp, paid: { ...tp.paid }, press: { ...tp.press } }; let changed = false;
  if (t.season !== f.season) { const bonus = Math.round(10 + t.hype * 0.2); t = { ...t, season: f.season, paid: {}, press: {}, levels: {}, budget: r1(t.budget + bonus), target: Math.max(1, rank(f).findIndex((x) => x.id === t.teamId) + 1 - 1), log: note({ ...t, season: f.season }, `New season: sponsors pay a ${bonus} bonus.`) }; changed = true; }
  const mine = (f.drivers || []).filter((d) => d.teamId === t.teamId).map((d) => d.id);
  f.races.forEach((r) => { const res = f.results?.[r.id]?.Race; if (!res || t.paid[r.id]) return;
    const pts = res.filter((x) => mine.includes(x.driverId)).reduce((a, x) => a + (x.points || 0), 0); const income = r1(4 + pts * 0.5 + (t.hype - 50) / 10);
    t.paid[r.id] = true; t.budget = r1(t.budget + income); t.log = note(t, `${r.name}: ${pts} points, ${income} in prize and sponsor money.`); changed = true; });
  return changed ? { ...f, tp: t } : f;
}
export function buy(f, k) {
  const tp = f.tp, u = UPGRADES[k]; if (!tp || !u) return { f, ok: false, text: '' }; const cost = costOf(f, k);
  const t = f.teams.find((x) => x.id === tp.teamId); if (!t || tp.budget < cost) return { f, ok: false, text: 'Not enough budget.' };
  const cur = field(t, u.field); const eff = u.gain[0] + Math.random() * (u.gain[1] - u.gain[0]); const gain = r1(eff * (cur > 85 ? 0.6 : 1)); const next = clamp(r1(cur + gain), 30, 99);
  const teams = f.teams.map((x) => (x.id === t.id ? { ...x, [u.field]: next } : x));
  const text = `${u.label} upgrade: +${r1(next - cur)} (${r1(cur)} to ${next}).`;
  return { f: { ...f, teams, tp: { ...tp, budget: r1(tp.budget - cost), levels: { ...tp.levels, [k]: (tp.levels[k] || 0) + 1 }, log: note(tp, text) } }, ok: true, text };
}
export function extend(f, driverId) {
  const tp = f.tp; if (!tp || tp.budget < EXTEND_COST) return { f, ok: false };
  const d = f.drivers.find((x) => x.id === driverId); if (!d || d.teamId !== tp.teamId) return { f, ok: false };
  return { f: { ...f, drivers: f.drivers.map((x) => (x.id === driverId ? { ...x, contract: (x.contract || 0) + 2 } : x)), tp: { ...tp, budget: r1(tp.budget - EXTEND_COST), log: note(tp, `${d.name} signs a two-year extension.`) } }, ok: true };
}
// ---- press conference: one question after the latest race, three ways to answer ----
const QUESTIONS = [
  (c) => `${c.good ? 'A strong weekend for the team.' : 'A difficult weekend.'} What do you tell the fans?`,
  () => 'Rivals say your car has an advantage nobody can explain. Your response?',
  (c) => `${c.name} was seen arguing with an engineer after the race. Is there a problem?`,
  () => 'There are rumours that you will lose a driver to a bigger team. True?',
  () => 'Will you be bringing big upgrades to the next race?',
  (c) => `${c.good ? 'You scored well, so is the title realistic?' : 'You are slipping down the table. Is the budget the problem?'}`,
];
export function pressFor(f, raceId) {
  const res = f.results?.[raceId]?.Race; if (!res) return null; const tp = f.tp; const mine = (f.drivers || []).filter((d) => d.teamId === tp.teamId);
  const rows = res.filter((x) => mine.some((d) => d.id === x.driverId)); const pts = rows.reduce((a, x) => a + (x.points || 0), 0);
  let h = 0; for (const ch of String(raceId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = { good: pts >= 8, name: mine[0]?.last || 'Your driver' };
  return { q: QUESTIONS[h % QUESTIONS.length](c), good: c.good, answers: [{ id: 'humble', label: 'Stay humble', hint: 'Safe: a small reputation gain.' }, { id: 'bold', label: 'Make a bold claim', hint: 'Risky: could win the fans or backfire.' }, { id: 'deflect', label: 'Praise the team', hint: 'Steady: reputation up a little, morale up.' }] };
}
export function answerPress(f, raceId, id) {
  const tp = f.tp, p = pressFor(f, raceId); if (!tp || !p || tp.press[raceId]) return { f, text: '' };
  let dh = 0, db = 0, text = '';
  if (id === 'humble') { dh = 3; text = 'Calm and measured. The fans respect it.'; }
  else if (id === 'deflect') { dh = 2; db = 1; text = 'You credit the factory. Staff and sponsors are pleased.'; }
  else if (Math.random() < (p.good ? 0.72 : 0.45)) { dh = 9; db = 2; text = 'A bold line that fires everybody up. The headlines are great.'; }
  else { dh = -7; text = 'The claim backfires and the media pick it apart.'; }
  const hype = clamp(tp.hype + dh, 0, 100); const out = `${text} (${dh >= 0 ? '+' : ''}${dh} reputation${db ? `, +${db} budget` : ''})`;
  return { f: { ...f, tp: { ...tp, hype, budget: r1(tp.budget + db), press: { ...tp.press, [raceId]: out }, log: note(tp, out) } }, text: out };
}
export function latestRaceId(f) { for (let i = f.races.length - 1; i >= 0; i--) if (f.results?.[f.races[i].id]?.Race) return f.races[i].id; return null; }

// ---- rivalries, worked out from the results ----
export function rivalries(f, limit = 5) {
  const by = {}; const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const get = (a, b) => (by[key(a, b)] ||= { a: a < b ? a : b, b: a < b ? b : a, clashes: 0, close: 0, ahead: { }, races: 0 });
  f.races.forEach((r) => {
    const res = f.results?.[r.id]?.Race; if (!res) return; const ok = res.filter((x) => x.status === 'OK');
    res.forEach((x) => { if (x.with && x.with !== x.driverId) get(x.driverId, x.with).clashes++; });
    for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length && j <= i + 2; j++) { const g = get(ok[i].driverId, ok[j].driverId); g.close++; }
    ok.forEach((x, i) => ok.slice(i + 1, i + 4).forEach((y) => { const g = get(x.driverId, y.driverId); g.races++; g.ahead[x.driverId] = (g.ahead[x.driverId] || 0) + 1; }));
  });
  const st = f.drivers.map((d) => d); const ds = Object.fromEntries(st.map((d) => [d.id, d]));
  const out = Object.values(by).filter((x) => ds[x.a] && ds[x.b]).map((x) => ({ ...x, score: x.clashes * 3 + x.close * 0.6 + (ds[x.a].teamId === ds[x.b].teamId ? 2 : 0) })).filter((x) => x.score >= 2.5).sort((a, b) => b.score - a.score).slice(0, limit);
  return out.map((x) => ({ ...x, da: ds[x.a], db: ds[x.b], mates: ds[x.a].teamId === ds[x.b].teamId, aw: x.ahead[x.a] || 0, bw: x.ahead[x.b] || 0 }));
}
