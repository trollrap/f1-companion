// Fantasy-season engine: builds a grid of invented teams and drivers and simulates sessions. Everything is random but plausible:
// a faster car and a better driver win more often, nobody is certain to win, cars break down now and then.
import { uid } from './store';

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
const TEAM_NAMES = ['Apex Dynamics', 'Nova GP', 'Vortex Racing', 'Halcyon Motorsport', 'Ember Racing', 'Cobalt Works', 'Sable Racing', 'Meridian GP', 'Tempest Racing', 'Aurora Speed', 'Falcon Rush', 'Obsidian GP', 'Zenith Racing', 'Quasar Motorsport', 'Titan Forge', 'Helix Racing'];
export const TEAM_COLORS = ['#E8002D', '#27F4D2', '#3671C6', '#FF8000', '#229971', '#FF87BC', '#64C4FF', '#B6BABD', '#6692FF', '#52E252', '#F5C400', '#B26BFF', '#FF2D87', '#2D8CFF', '#14B8A6', '#E5E7EB'];
const FIRST = ['Luca', 'Mateo', 'Noah', 'Elias', 'Theo', 'Kai', 'Jonas', 'Nico', 'Rafael', 'Ivan', 'Tomas', 'Felix', 'Oskar', 'Dante', 'Arlo', 'Marek', 'Soren', 'Anton', 'Viktor', 'Emil', 'Zane', 'Hugo', 'Leon', 'Damian', 'Ravi', 'Kenji', 'Mika', 'Aiden', 'Silas', 'Bruno'];
const LAST = ['Valtonen', 'Okafor', 'Brandt', 'Moreau', 'Kessler', 'Ferraro', 'Lindqvist', 'Haruki', 'Delacroix', 'Novak', 'Castellan', 'Rinaldi', 'Ostrowski', 'Vance', 'Halloran', 'Duarte', 'Kowalczyk', 'Albrecht', 'Sandoval', 'Petrov', 'Lacroix', 'Nakamura', 'Hargrove', 'Bellamy', 'Torres', 'Eriksen', 'Marchetti', 'Voss', 'Quinlan', 'Adeyemi'];
const pick = (a, taken) => { for (let i = 0; i < 60; i++) { const v = a[Math.floor(Math.random() * a.length)]; if (!taken.has(v)) { taken.add(v); return v; } } return a[Math.floor(Math.random() * a.length)]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// `taken` = car numbers that must not be used (the real grid and your own number).
export function makeGrid(teamCount, taken = []) {
  const nums = new Set(taken.map(Number)); const firsts = new Set(), lasts = new Set(), tn = new Set();
  const nextNum = () => { for (let i = 0; i < 300; i++) { const n = 2 + Math.floor(Math.random() * 98); if (!nums.has(n)) { nums.add(n); return n; } } for (let n = 2; n < 100; n++) if (!nums.has(n)) { nums.add(n); return n; } return 99; };
  const teams = [], drivers = [];
  for (let i = 0; i < teamCount; i++) {
    const car = clamp(Math.round(88 - (i / Math.max(1, teamCount - 1)) * 36 + gauss() * 4), 35, 96); // the first teams have the best cars
    const t = { id: uid(), name: i < TEAM_NAMES.length ? TEAM_NAMES[i] : `${pick(LAST, tn)} Racing`, color: TEAM_COLORS[i % TEAM_COLORS.length], logo: null, car };
    teams.push(t);
    for (let k = 0; k < 2; k++) { const first = pick(FIRST, firsts), last = pick(LAST, lasts); drivers.push({ id: uid(), first, last, name: `${first} ${last}`, number: nextNum(), teamId: t.id, skill: clamp(Math.round(70 + gauss() * 9), 40, 96), photo: null, me: false }); }
  }
  return { teams, drivers };
}
// Gives every driver but `keep` a number that is not taken, used when your own number is added after the grid exists.
export const freeNumber = (taken) => { const s = new Set(taken.map(Number)); for (let n = 2; n < 100; n++) if (!s.has(n)) return n; return 99; };

export const sessionsOf = (race) => (race.sprint ? ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'] : ['Qualifying', 'Race']);
const perf = (f, d) => { const t = f.teams.find((x) => x.id === d.teamId); return (t ? t.car : 60) * 0.62 + d.skill * 0.38; };
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const lapFmt = (t) => { const m = Math.floor(t / 60); return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`; };
const raceFmt = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };

// Results of one session: [{ driverId, pos, time, gap, points, status }]
export function simulate(f, race, session, prior) {
  const ds = f.drivers; const lapBase = 68 + (hash(race.name) % 28); // a "track" gives every circuit its own lap time
  if (session === 'Qualifying' || session === 'Sprint Qualifying') {
    const sc = ds.map((d) => ({ d, s: perf(f, d) + gauss() * 3.4 })).sort((a, b) => b.s - a.s); const top = sc[0].s;
    return sc.map((x, i) => ({ driverId: x.d.id, pos: i + 1, time: lapFmt(lapBase + (top - x.s) * 0.085 + (session === 'Qualifying' ? 0 : 0.6)), gap: i ? `+${((top - x.s) * 0.085).toFixed(3)}` : '', points: 0, status: 'OK' }));
  }
  const gridSrc = prior?.[session === 'Sprint' ? 'Sprint Qualifying' : 'Qualifying']; const grid = {}; (gridSrc || []).forEach((r) => { grid[r.driverId] = r.pos; });
  const laps = session === 'Sprint' ? Math.max(10, Math.round(race.laps / 3)) : race.laps;
  const sc = ds.map((d) => { const crash = Math.random() < (session === 'Sprint' ? 0.04 : 0.07) + (100 - (f.teams.find((t) => t.id === d.teamId)?.car || 60)) / 1400;
    return { d, crash, s: perf(f, d) + gauss() * 4.6 - (grid[d.id] ? grid[d.id] * 0.32 : 0) }; });
  const fin = sc.filter((x) => !x.crash).sort((a, b) => b.s - a.s), out = sc.filter((x) => x.crash).sort(() => Math.random() - 0.5);
  const pts = session === 'Sprint' ? SPRINT_POINTS : POINTS; let t = laps * lapBase * 1.035; let acc = 0;
  const rows = fin.map((x, i) => { if (i) acc += 0.9 + Math.random() * 8.5; return { driverId: x.d.id, pos: i + 1, time: i ? (acc > 90 ? `+${Math.floor(acc / (lapBase * 1.035)) + 1} lap` : `+${acc.toFixed(3)}`) : raceFmt(t), gap: '', points: pts[i] || 0, status: 'OK', grid: grid[x.d.id] || null }; });
  out.forEach((x, i) => rows.push({ driverId: x.d.id, pos: fin.length + i + 1, time: 'DNF', gap: '', points: 0, status: 'DNF', grid: grid[x.d.id] || null }));
  return rows;
}
export const nextStep = (f) => {
  for (let i = 0; i < f.races.length; i++) { const r = f.races[i]; for (const s of sessionsOf(r)) if (!f.results?.[r.id]?.[s]) return { race: r, index: i, session: s }; }
  return null;
};
export function runStep(f, step) {
  const prior = f.results?.[step.race.id] || {}; const res = simulate(f, step.race, step.session, prior);
  return { ...f, results: { ...(f.results || {}), [step.race.id]: { ...prior, [step.session]: res } } };
}
export function runWeekend(f) { const st = nextStep(f); if (!st) return f; let g = f; for (const s of sessionsOf(st.race)) { if (!g.results?.[st.race.id]?.[s]) g = runStep(g, { ...st, session: s }); } return g; }
export function runSeason(f) { let g = f, guard = 0; while (nextStep(g) && guard++ < 500) g = runWeekend(g); return g; }

// Championship tables from the stored results.
export function standings(f) {
  const d = {}, t = {}; f.drivers.forEach((x) => { d[x.id] = { ...x, points: 0, wins: 0, podiums: 0, poles: 0, races: 0, dnf: 0 }; }); f.teams.forEach((x) => { t[x.id] = { ...x, points: 0, wins: 0 }; });
  f.races.forEach((r) => { const res = f.results?.[r.id]; if (!res) return;
    (res.Qualifying || []).forEach((x) => { if (x.pos === 1 && d[x.driverId]) d[x.driverId].poles++; });
    ['Sprint', 'Race'].forEach((k) => (res[k] || []).forEach((x) => { const a = d[x.driverId]; if (!a) return; a.points += x.points; if (t[a.teamId]) t[a.teamId].points += x.points;
      if (k === 'Race') { a.races++; if (x.pos === 1) { a.wins++; if (t[a.teamId]) t[a.teamId].wins++; } if (x.pos <= 3 && x.status === 'OK') a.podiums++; if (x.status !== 'OK') a.dnf++; } })); });
  const rank = (o) => Object.values(o).sort((a, b) => b.points - a.points || b.wins - a.wins || a.name?.localeCompare?.(b.name));
  return { drivers: rank(d), teams: rank(t) };
}
export const pointsFor = (pos) => POINTS[pos - 1] || 0;
