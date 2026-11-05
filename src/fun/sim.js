// Fantasy-season engine. Cars (team) decide most of the result, drivers add talent on top: a great driver in a slow car still beats his team-mate and
// scores more than the car deserves, but cannot win from the back. Weather, safety cars, reliability, pit stops, penalties and mistakes add the drama.
import { uid } from './store';
import { randomCountry } from './geo';

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
const TEAM_NAMES = ['Apex Dynamics', 'Nova GP', 'Vortex Racing', 'Halcyon Motorsport', 'Ember Racing', 'Cobalt Works', 'Sable Racing', 'Meridian GP', 'Tempest Racing', 'Aurora Speed', 'Falcon Rush', 'Obsidian GP', 'Zenith Racing', 'Quasar Motorsport', 'Titan Forge', 'Helix Racing'];
export const TEAM_COLORS = ['#E8002D', '#27F4D2', '#3671C6', '#FF8000', '#229971', '#FF87BC', '#64C4FF', '#B6BABD', '#6692FF', '#52E252', '#F5C400', '#B26BFF', '#FF2D87', '#2D8CFF', '#14B8A6', '#E5E7EB'];
const FIRST = ['Luca', 'Mateo', 'Noah', 'Elias', 'Theo', 'Kai', 'Jonas', 'Nico', 'Rafael', 'Ivan', 'Tomas', 'Felix', 'Oskar', 'Dante', 'Arlo', 'Marek', 'Soren', 'Anton', 'Viktor', 'Emil', 'Zane', 'Hugo', 'Leon', 'Damian', 'Ravi', 'Kenji', 'Mika', 'Aiden', 'Silas', 'Bruno'];
const LAST = ['Valtonen', 'Okafor', 'Brandt', 'Moreau', 'Kessler', 'Ferraro', 'Lindqvist', 'Haruki', 'Delacroix', 'Novak', 'Castellan', 'Rinaldi', 'Ostrowski', 'Vance', 'Halloran', 'Duarte', 'Kowalczyk', 'Albrecht', 'Sandoval', 'Petrov', 'Lacroix', 'Nakamura', 'Hargrove', 'Bellamy', 'Torres', 'Eriksen', 'Marchetti', 'Voss', 'Quinlan', 'Adeyemi'];
const pick = (a, taken) => { for (let i = 0; i < 60; i++) { const v = a[Math.floor(Math.random() * a.length)]; if (!taken.has(v)) { taken.add(v); return v; } } return a[Math.floor(Math.random() * a.length)]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ---- ratings. Every attribute is 30-99. Older fantasies and hand-made drivers without them fall back to `skill`.
export const DRIVER_ATTRS = [['pace', 'Pace'], ['quali', 'Qualifying'], ['race', 'Racecraft'], ['cons', 'Consistency'], ['wet', 'Wet weather'], ['aggr', 'Aggression']];
export const TEAM_ATTRS = [['car', 'Car speed'], ['rel', 'Reliability'], ['pit', 'Pit crew']];
export const A = (d) => { const s = d.skill ?? 70; return { pace: d.pace ?? s, quali: d.quali ?? s, race: d.race ?? s, cons: d.cons ?? s - 4, wet: d.wet ?? s, aggr: d.aggr ?? 55, age: d.age ?? 27, pot: d.pot ?? s }; };
export const ovr = (d) => { const a = A(d); return Math.round(a.pace * 0.4 + a.quali * 0.25 + a.race * 0.25 + a.cons * 0.1); };
export const TA = (t) => ({ car: t.car ?? 65, rel: t.rel ?? 78, dev: t.dev ?? 60, pit: t.pit ?? 75 });
// A made-up driver with believable, slightly uneven attributes around an overall level.
export function makeDriverAttrs(level, age) {
  const j = () => clamp(Math.round(level + gauss() * 5), 38, 99);
  const pace = j(), quali = j(), race = j(), cons = clamp(Math.round(level + gauss() * 7), 38, 99), wet = clamp(Math.round(level + gauss() * 8), 38, 99), aggr = clamp(Math.round(55 + gauss() * 16), 20, 95);
  const o = Math.round(pace * 0.4 + quali * 0.25 + race * 0.25 + cons * 0.1);
  return { pace, quali, race, cons, wet, aggr, age, pot: age < 26 ? clamp(o + Math.round((26 - age) * 1.5 + Math.random() * 4), o, 99) : o, skill: o };
}

// `taken` = car numbers that must not be used (your own number).
export function makeGrid(teamCount, taken = []) {
  const nums = new Set(taken.map(Number)); const firsts = new Set(), lasts = new Set(), tn = new Set();
  const nextNum = () => { for (let i = 0; i < 300; i++) { const n = 2 + Math.floor(Math.random() * 98); if (!nums.has(n)) { nums.add(n); return n; } } for (let n = 2; n < 100; n++) if (!nums.has(n)) { nums.add(n); return n; } return 99; };
  const teams = [], drivers = [];
  for (let i = 0; i < teamCount; i++) {
    const car = clamp(Math.round(88 - (i / Math.max(1, teamCount - 1)) * 36 + gauss() * 4), 35, 96); // the first teams have the best cars
    const t = { id: uid(), name: i < TEAM_NAMES.length ? TEAM_NAMES[i] : `${pick(LAST, tn)} Racing`, color: TEAM_COLORS[i % TEAM_COLORS.length], logo: null, car,
      rel: clamp(Math.round(80 + gauss() * 8 - i * 0.6), 45, 98), dev: clamp(Math.round(62 + gauss() * 12), 35, 95), pit: clamp(Math.round(78 + gauss() * 8 - i * 0.5), 45, 98) };
    teams.push(t);
    for (let k = 0; k < 2; k++) {
      const first = pick(FIRST, firsts), last = pick(LAST, lasts), age = 19 + Math.floor(Math.random() * 20);
      drivers.push({ id: uid(), first, last, name: `${first} ${last}`, number: nextNum(), teamId: t.id, photo: null, ref: null, ...makeDriverAttrs(clamp(Math.round(74 + gauss() * 8 + (teamCount - i) * 0.15), 55, 96), age) });
    }
  }
  return { teams, drivers };
}
// Rookies mostly come from F2 (about two in three) and F3; now and then from elsewhere.
export function randomRookie(existing = [], numbers = []) {
  const r = Math.random(), from = r < 0.64 ? 'F2' : r < 0.94 ? 'F3' : 'Other series';
  const nm = randomDriver(existing), age = from === 'F3' ? 18 + Math.floor(Math.random() * 2) : from === 'F2' ? 19 + Math.floor(Math.random() * 4) : 20 + Math.floor(Math.random() * 6);
  const base = from === 'F2' ? 68 : from === 'F3' ? 63 : 65;
  return { id: uid(), ...nm, from, number: freeNumber(numbers), photo: null, ref: null, ...makeDriverAttrs(clamp(Math.round(base + gauss() * 5), 50, 82), age), pot: clamp(Math.round(80 + gauss() * 8), 70, 99) };
}
// A made-up driver that does not share a name with anyone already in the fantasy.
export function randomDriver(existing = []) { const names = new Set(existing.map((d) => d.name)); for (let i = 0; i < 80; i++) { const first = FIRST[Math.floor(Math.random() * FIRST.length)], last = LAST[Math.floor(Math.random() * LAST.length)]; if (!names.has(`${first} ${last}`)) return { first, last, name: `${first} ${last}`, nat: randomCountry() }; } return { first: 'New', last: 'Driver', name: 'New Driver', nat: randomCountry() }; }
export const freeNumber = (taken) => { const s = new Set(taken.map(Number)); for (let n = 2; n < 100; n++) if (!s.has(n)) return n; return 99; };

export const sessionsOf = (race) => (race.sprint ? ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'] : ['Qualifying', 'Race']);
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const lapFmt = (t) => { const m = Math.floor(t / 60); return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`; };
const raceFmt = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
const MECH = ['Engine', 'Gearbox', 'Hydraulics', 'Brakes', 'Power unit', 'Suspension', 'Cooling', 'Electrical', 'Water leak'], CRASH = ['Accident', 'Collision', 'Spun off', 'Damage', 'Puncture'];
const teamFor = (f, d) => f.teams.find((x) => x.id === d.teamId) || { car: 60 };
// How good the car-and-driver package is, separately for a single lap and for race pace.
const quick = (f, d) => { const a = A(d), t = TA(teamFor(f, d)); return t.car * 0.6 + (a.quali * 0.7 + a.pace * 0.3) * 0.4; };
const pace = (f, d, wet) => { const a = A(d), t = TA(teamFor(f, d)); return t.car * 0.6 + (a.pace * 0.55 + a.race * 0.45 + (wet ? (a.wet - 75) * 0.5 : 0)) * 0.4; };

// One weekend's conditions are drawn once and shared by every session of that weekend.
const conditions = (f, race) => f.results?.[race.id]?._w || { wet: Math.random() < 0.18, sc: Math.random() < 0.38 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 0, od: 0.3 + (hash(race.name) % 50) / 100 }; // od: how hard overtaking is (0.3-0.8)

function qualifying(f, race, session, w) {
  const ds = f.drivers, n = ds.length, lapBase = 68 + (hash(race.name) % 28);
  const q3 = n >= 18 ? 10 : Math.max(3, Math.round(n * 0.45)), q2 = n >= 18 ? 16 : Math.max(q3 + 1, Math.round(n * 0.75));
  const seg = (list, off) => { const sc = list.map((d) => { const a = A(d); return { d, s: quick(f, d) + gauss() * (1.7 + (100 - a.cons) * 0.03 + (w.wet ? 2.2 : 0)) + (w.wet ? (a.wet - 75) * 0.15 : 0) }; }); const top = Math.max(...sc.map((x) => x.s)); return sc.map((x) => ({ ...x, t: lapBase + off + (top - x.s) * 0.07 })).sort((a, b) => a.t - b.t); };
  const r1 = seg(ds, 1.1); const in2 = r1.slice(0, q2).map((x) => x.d); const r2 = seg(in2, 0.5); const in3 = r2.slice(0, q3).map((x) => x.d); const r3 = seg(in3, 0);
  const sprint = session === 'Sprint Qualifying'; const out = [];
  r3.forEach((x) => out.push({ d: x.d, q1: r1.find((y) => y.d.id === x.d.id).t, q2: r2.find((y) => y.d.id === x.d.id).t, q3: x.t }));
  r2.slice(q3).forEach((x) => out.push({ d: x.d, q1: r1.find((y) => y.d.id === x.d.id).t, q2: x.t }));
  r1.slice(q2).forEach((x) => out.push({ d: x.d, q1: x.t }));
  const pole = out[0]; const best = (x) => x.q3 ?? x.q2 ?? x.q1;
  return out.map((x, i) => ({ driverId: x.d.id, pos: i + 1, q1: lapFmt(x.q1), q2: x.q2 ? lapFmt(x.q2) : null, q3: x.q3 ? lapFmt(x.q3) : null, time: lapFmt(best(x) + (sprint ? 0 : 0)), gap: i ? `+${(best(x) - best(pole)).toFixed(3)}` : '', seg: x.q3 ? 'Q3' : x.q2 ? 'Q2' : 'Q1', points: 0, status: 'OK' }));
}

function raceSession(f, race, session, prior, w) {
  const ds = f.drivers, n = ds.length, isSprint = session === 'Sprint', laps = isSprint ? Math.max(10, Math.round(race.laps / 3)) : race.laps;
  const lapBase = 68 + (hash(race.name) % 28), lapT = lapBase * 1.035, grid = {}; (prior?.[isSprint ? 'Sprint Qualifying' : 'Qualifying'] || []).forEach((r) => { grid[r.driverId] = r.pos; });
  const gw = 0.16 + 0.3 * w.od; // grid matters more where overtaking is hard (Monaco-like tracks)
  const scale = 1 - 0.3 * (w.sc ? 1 : 0); // safety cars bunch the field
  const rows = ds.map((d) => {
    const a = A(d), t = TA(teamFor(f, d)); const g = grid[d.id] || n;
    const crashP = (isSprint ? 0.025 : 0.04) + (a.aggr - 50) * 0.0005 + (100 - a.cons) * 0.0004 + (w.wet ? 0.03 : 0);
    const mechP = (isSprint ? 0.015 : 0.03) + (100 - t.rel) * 0.0011;
    const r = Math.random(); const out = r < mechP ? 'mech' : r < mechP + crashP ? 'crash' : null;
    const stops = isSprint ? 0 : (Math.random() < 0.12 ? 3 : Math.random() < 0.55 ? 2 : 1) + (w.wet && Math.random() < 0.5 ? 1 : 0);
    const stopLoss = Array.from({ length: stops }, () => 20.5 + (100 - t.pit) * 0.04 + Math.abs(gauss()) * 0.6 + (Math.random() < (100 - t.pit) / 900 ? 3 + Math.random() * 7 : 0)).reduce((x, y) => x + y, 0);
    const pen = !isSprint && Math.random() < 0.07 ? (Math.random() < 0.7 ? 5 : 10) : 0;
    const s = pace(f, d, w.wet) + (n - g) * gw + (a.race - 78) * 0.06 + (a.aggr - 55) * 0.012 + gauss() * (2.4 + (100 - a.cons) * 0.045 + (w.wet ? 2.4 : 0));
    return { d, g, s, out, stops, stopLoss, pen, lap: out ? 2 + Math.floor(Math.random() * (laps - 3)) : laps };
  });
  const fin = rows.filter((x) => !x.out), top = Math.max(...fin.map((x) => x.s));
  fin.forEach((x) => { x.t = (top - x.s) * 2.1 * scale + x.stopLoss + x.pen + Math.random() * 0.4; }); fin.sort((a, b) => a.t - b.t);
  const base = fin[0]?.t || 0; const pts = isSprint ? SPRINT_POINTS : POINTS; const winT = laps * lapT + base;
  const flPool = fin.slice(0, Math.min(10, fin.length)); const flDriver = flPool.length ? flPool[Math.floor(Math.pow(Math.random(), 1.6) * flPool.length)] : null;
  const res = fin.map((x, i) => {
    const gap = x.t - base, lapped = Math.floor(gap / lapT);
    return { driverId: x.d.id, pos: i + 1, grid: x.g, time: i === 0 ? raceFmt(winT) : lapped >= 1 ? `+${lapped} lap${lapped > 1 ? 's' : ''}` : `+${gap.toFixed(3)}`, gap: i ? `+${gap.toFixed(3)}` : '', points: pts[i] || 0, status: 'OK', stops: x.stops, pen: x.pen, fl: flDriver === x, flTime: flDriver === x ? lapFmt(lapBase - 0.4 - Math.random() * 0.8) : null, laps };
  });
  rows.filter((x) => x.out).sort((a, b) => b.lap - a.lap).forEach((x, i) => {
    const reason = x.out === 'mech' ? MECH[Math.floor(Math.random() * MECH.length)] : CRASH[Math.floor(Math.random() * CRASH.length)];
    res.push({ driverId: x.d.id, pos: fin.length + i + 1, grid: x.g, time: reason, gap: '', points: 0, status: 'DNF', reason, lap: x.lap, stops: 0, pen: 0, laps: x.lap });
  });
  return res;
}

// Results of one session. Qualifying rows carry Q1/Q2/Q3 times; race rows carry gaps, stops, penalties and the fastest lap.
export function simulate(f, race, session, prior, wx) {
  const w = wx || conditions(f, race);
  return session === 'Qualifying' || session === 'Sprint Qualifying' ? qualifying(f, race, session, w) : raceSession(f, race, session, prior, w);
}
export const nextStep = (f) => {
  for (let i = 0; i < f.races.length; i++) { const r = f.races[i]; for (const s of sessionsOf(r)) if (!f.results?.[r.id]?.[s]) return { race: r, index: i, session: s }; }
  return null;
};
// Cars sometimes find a little speed or lose some during the season: rare, and small.
function develop(f) {
  return { ...f, teams: f.teams.map((t) => (Math.random() < 0.04 ? { ...t, car: clamp(Math.round(((t.car ?? 65) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.2)) * 10) / 10, 30, 99) } : t)) };
}
export function runStep(f, step) {
  const prior = f.results?.[step.race.id] || {}; const w = conditions(f, step.race);
  const res = simulate(f, step.race, step.session, prior, w);
  let g = { ...f, results: { ...(f.results || {}), [step.race.id]: { ...prior, _w: w, [step.session]: res } } };
  if (step.session === 'Race') g = develop(g);
  return g;
}
export function runWeekend(f) { const st = nextStep(f); if (!st) return f; let g = f; for (const s of sessionsOf(st.race)) { if (!g.results?.[st.race.id]?.[s]) g = runStep(g, { ...st, session: s }); } return g; }
export function runSeason(f) { let g = f, guard = 0; while (nextStep(g) && guard++ < 500) g = runWeekend(g); return g; }

// Championship tables from the stored results.
export function standings(f) {
  const d = {}, t = {}; f.drivers.forEach((x) => { d[x.id] = { ...x, points: 0, wins: 0, podiums: 0, poles: 0, races: 0, dnf: 0, fl: 0 }; }); f.teams.forEach((x) => { t[x.id] = { ...x, points: 0, wins: 0 }; });
  f.races.forEach((r) => { const res = f.results?.[r.id]; if (!res) return;
    (res.Qualifying || []).forEach((x) => { if (x.pos === 1 && d[x.driverId]) d[x.driverId].poles++; });
    ['Sprint', 'Race'].forEach((k) => (res[k] || []).forEach((x) => { const a = d[x.driverId]; if (!a) return; a.points += x.points; if (t[a.teamId]) t[a.teamId].points += x.points;
      if (k === 'Race') { a.races++; if (x.pos === 1) { a.wins++; if (t[a.teamId]) t[a.teamId].wins++; } if (x.pos <= 3 && x.status === 'OK') a.podiums++; if (x.status !== 'OK') a.dnf++; if (x.fl) a.fl++; } })); });
  const rank = (o) => Object.values(o).sort((a, b) => b.points - a.points || b.wins - a.wins || String(a.name).localeCompare(String(b.name)));
  return { drivers: rank(d), teams: rank(t) };
}
export const pointsFor = (pos) => POINTS[pos - 1] || 0;

// ---- between seasons ----
// Drivers age: the young improve towards their potential, the old fade, the middle years stay level. Cars change by far more than drivers do.
export function evolveDriver(d) {
  const a = A(d), age = a.age + 1; let k = 0;
  if (age <= 25) k = Math.min(3.2, Math.max(0, (a.pot - ovr(d)) * 0.3) + gauss() * 0.8); else if (age <= 33) k = gauss() * 0.7; else k = -(age - 33) * 0.45 + gauss() * 0.6;
  const up = (v) => clamp(Math.round(v + k + gauss() * 0.5), 35, 99);
  const n = { ...d, age, pace: up(a.pace), quali: up(a.quali), race: up(a.race), cons: up(a.cons), wet: clamp(Math.round(a.wet + k * 0.5), 35, 99), aggr: a.aggr, pot: a.pot };
  n.skill = ovr(n); return n;
}
// Over the winter a team only sometimes changes: about one in three moves a little up or down.
export function evolveTeam(t) { const a = TA(t); const mv = (v, lo, hi, k) => (Math.random() < 0.33 ? clamp(Math.round(v + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * k)), lo, hi) : Math.round(v)); return { ...t, car: mv(t.car ?? 65, 35, 99, 4), rel: mv(a.rel, 40, 99, 3), pit: mv(a.pit, 40, 99, 3) }; }

// Random transfer window: old drivers retire, strong drivers in slow cars sometimes move to faster ones, empty seats go to rookies.
// Returns { f, log } where log is a list of { kind, text }.
const snap = (d) => ({ id: d.id, first: d.first, last: d.last, name: d.name, number: d.number, photo: d.photo || null, ref: d.ref || null });
export function simulateTransfers(f) {
  const log = []; let drivers = f.drivers.map((d) => ({ ...d })); const teams = f.teams;
  const order = [...teams].sort((a, b) => TA(b).car - TA(a).car), rank = Object.fromEntries(order.map((t, i) => [t.id, i])); const name = (id) => teams.find((t) => t.id === id)?.name || '';
  // Retirement is never certain: older drivers are only a little more likely to go. At least one driver per team must remain.
  const gone = []; const keep = Math.max(teams.length, 1);
  drivers = drivers.filter((d) => {
    if (d.me) return true; const age = A(d).age, p = Math.min(0.3, 0.02 + Math.max(0, age - 33) * 0.03 + (ovr(d) < 55 ? 0.03 : 0));
    if (drivers.length - gone.length > keep && Math.random() < p) { gone.push(d); log.push({ kind: 'retire', who: snap(d), from: d.teamId, text: `${d.name} (${age}) retires from racing.` }); return false; } return true;
  });
  const moves = Math.max(1, Math.round(teams.length / 4)); let made = 0;
  [...drivers].filter((d) => !d.me).sort((a, b) => ovr(b) - ovr(a)).forEach((d) => {
    if (made >= moves) return; const ra = rank[d.teamId]; if (ra < 3 || Math.random() > 0.35) return;
    const cands = drivers.filter((e) => !e.me && rank[e.teamId] < ra - 1 && ovr(e) < ovr(d) - 2); if (!cands.length) return;
    const e = cands[Math.floor(Math.random() * cands.length)]; const ta = d.teamId, tb = e.teamId;
    d.teamId = tb; e.teamId = ta; made++; log.push({ kind: 'move', who: snap(d), from: ta, to: tb, with: snap(e), text: `${d.name} joins ${name(tb)} from ${name(ta)}; ${e.name} goes the other way.` });
  });
  // Empty seats are filled by existing drivers stepping up from slower teams (which leaves a seat there, and so on down the grid) - no rookies.
  const cnt = (id) => drivers.filter((d) => d.teamId === id).length;
  for (let guard = 0; guard < 60; guard++) {
    const t = order.find((x) => cnt(x.id) < 2 && drivers.some((d) => !d.me && rank[d.teamId] > rank[x.id] && cnt(d.teamId) === 2)); if (!t) break;
    const pool = drivers.filter((d) => !d.me && rank[d.teamId] > rank[t.id] && cnt(d.teamId) === 2).sort((x, y) => ovr(y) - ovr(x) + (Math.random() - 0.5) * 6).slice(0, 3);
    const d = pool[Math.floor(Math.random() * pool.length)]; const from = d.teamId; d.teamId = t.id;
    log.push({ kind: 'move', who: snap(d), from, to: t.id, step: true, text: `${d.name} steps up to ${t.name} from ${name(from)}.` });
  }
  // Seats nobody can step into go to rookies.
  const numbers = drivers.map((d) => d.number);
  [...order].reverse().forEach((t) => { while (cnt(t.id) < 2) { const r = { ...randomRookie([...f.drivers, ...drivers], numbers), teamId: t.id }; numbers.push(r.number); drivers.push(r); log.push({ kind: 'rookie', who: snap(r), to: t.id, origin: r.from, text: `${r.name} (${A(r).age}), from ${r.from === 'Other series' ? 'another series' : r.from}, makes his debut with ${t.name}.` }); } });
  teams.forEach((t) => { if (cnt(t.id) === 0) { const d = drivers.filter((x) => !x.me && cnt(x.teamId) === 2).sort((x, y) => ovr(x) - ovr(y))[0]; if (d) { d.teamId = t.id; log.push({ kind: 'move', who: snap(d), from: null, to: t.id, text: `${d.name} moves to ${t.name}.` }); } } });
  if (!log.length) log.push({ kind: 'quiet', text: 'A quiet winter: nobody changed teams.' });
  return { f: { ...f, drivers, news: log }, log };
}
