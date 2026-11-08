// Questions the offline history (data/history.json, every season up to HISTORY_UPTO) can answer by itself: records, "on this day",
// circuit history, an all-time duel between any two drivers, and quiz questions. Nothing here touches the network.
let H = null, AG = null;
const load = () => H || (H = require('../data/history.json'));
const nm = (i) => { const d = load().d[i]; return d ? `${d[1]} ${d[2]}` : '—'; };
const tm = (i) => load().t[i]?.[1] || '—';
const num = (r) => /^\d+$/.test(String(r[4])) ;
const isWin = (r) => r[3] === 1 && String(r[4]) === '1';
const ageAt = (dob, date) => { if (!dob || !date) return null; const a = Date.parse(dob), b = Date.parse(date); return Number.isNaN(a) || Number.isNaN(b) ? null : (b - a) / 31557600000; };

// One pass over every race: totals per driver and per team.
function agg() {
  if (AG) return AG; const h = load(); const n = h.d.length; const z = () => new Array(n).fill(0);
  const A = { wins: z(), poles: z(), podiums: z(), starts: z(), points: z(), fl: z(), titles: z(), first: new Array(n).fill(9999), last: new Array(n).fill(0), tWins: new Array(h.t.length).fill(0), tPoles: new Array(h.t.length).fill(0), seasonWins: {}, young: null, old: null, races: 0 };
  Object.keys(h.r).forEach((y) => h.r[y].forEach((rc) => {
    A.races++; if (rc[5] && rc[5][0] >= 0) { A.poles[rc[5][0]]++; if (rc[5][1] >= 0) A.tPoles[rc[5][1]]++; }
    const seen = new Set();
    rc[4].forEach((r) => {
      const d = r[0]; A.starts[d] += r[4] === 'W' || r[4] === 'F' || r[4] === 'D' ? 0 : 1; A.points[d] += r[5] || 0; if (r[7] === 1) A.fl[d]++; A.first[d] = Math.min(A.first[d], +y); A.last[d] = Math.max(A.last[d], +y);
      if (isWin(r) && !seen.has('w')) { seen.add('w'); A.wins[d]++; A.tWins[r[1]]++; const k = `${y}:${d}`; A.seasonWins[k] = (A.seasonWins[k] || 0) + 1;
        const age = ageAt(h.d[d][3], rc[3]); if (age) { if (!A.young || age < A.young.age) A.young = { age, d, y, race: rc[1] }; if (!A.old || age > A.old.age) A.old = { age, d, y, race: rc[1] }; } }
      if (r[3] >= 1 && r[3] <= 3 && num(r)) A.podiums[d]++;
    });
  }));
  Object.keys(h.ds).forEach((y) => { const t = h.ds[y].find((x) => x[1] === 1); if (t) A.titles[t[0]]++; });
  AG = A; return A;
}
const top = (arr, n = 10) => arr.map((v, i) => ({ i, v })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n).map((x) => ({ name: nm(x.i), v: x.v, nat: load().d[x.i][4] }));
export const upTo = () => load().upTo;

// All-time lists for the Records screen.
export function records() {
  const A = agg(), h = load();
  const bySeason = Object.keys(A.seasonWins).map((k) => { const [y, d] = k.split(':'); return { y, d: +d, v: A.seasonWins[k] }; }).sort((a, b) => b.v - a.v).slice(0, 8).map((x) => ({ name: nm(x.d), v: x.v, sub: String(x.y) }));
  const tw = A.tWins.map((v, i) => ({ v, i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10).map((x) => ({ name: tm(x.i), v: x.v }));
  const years = Object.keys(h.r).length;
  return {
    totals: [['Seasons', years], ['Grands Prix', A.races], ['Drivers', h.d.length], ['Teams', h.t.length]],
    lists: [
      { key: 'wins', title: 'Most wins', rows: top(A.wins) },
      { key: 'poles', title: 'Most poles', rows: top(A.poles) },
      { key: 'podiums', title: 'Most podiums', rows: top(A.podiums) },
      { key: 'titles', title: 'World titles', rows: top(A.titles, 8) },
      { key: 'starts', title: 'Most starts', rows: top(A.starts) },
      { key: 'fl', title: 'Fastest laps', rows: top(A.fl) },
      { key: 'season', title: 'Wins in one season', rows: bySeason },
      { key: 'team', title: 'Team wins', rows: tw },
    ],
    facts: [
      A.young ? { label: 'Youngest winner', value: nm(A.young.d), sub: `${A.young.age.toFixed(1)} years · ${A.young.race} ${A.young.y}` } : null,
      A.old ? { label: 'Oldest winner', value: nm(A.old.d), sub: `${A.old.age.toFixed(1)} years · ${A.old.race} ${A.old.y}` } : null,
    ].filter(Boolean),
  };
}

// Races held on a calendar day (month 1-12) in any year, newest first, with the winner.
export function onThisDay(month, day) {
  const h = load(), key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, out = [];
  Object.keys(h.r).forEach((y) => h.r[y].forEach((rc) => { if (String(rc[3]).slice(5, 10) === key) { const w = rc[4].find(isWin); out.push({ year: +y, race: rc[1], date: rc[3], winner: w ? nm(w[0]) : '—', team: w ? tm(w[1]) : '', pole: rc[5] && rc[5][0] >= 0 ? nm(rc[5][0]) : null }); } }));
  return out.sort((a, b) => b.year - a.year);
}
// The nearest days that had a race, for when today has none.
export function nearbyDays(date = new Date(), span = 3) {
  const out = [];
  for (let k = -span; k <= span; k++) { const d = new Date(date.getTime() + k * 86400000); const l = onThisDay(d.getMonth() + 1, d.getDate()); if (l.length) out.push({ offset: k, month: d.getMonth() + 1, day: d.getDate(), races: l }); }
  return out;
}

const CTRY = { 'united kingdom': 'uk', 'great britain': 'uk', 'united states': 'usa', 'united states of america': 'usa', 'united arab emirates': 'uae', 'korea': 'south korea' };
const nc = (s) => { const k = String(s || '').toLowerCase().trim(); return CTRY[k] || k; };
// What this Grand Prix has been like in the past. `meeting` is a calendar entry (country_name, meeting_name, location).
export function circuitHistory(meeting) {
  const h = load(); if (!meeting) return null; const cn = nc(meeting.country_name || meeting.country);
  const hay = `${meeting.meeting_name || ''} ${meeting.location || ''} ${meeting.circuit_short_name || ''}`.toLowerCase();
  const all = []; Object.keys(h.r).forEach((y) => h.r[y].forEach((rc) => { if (nc(rc[2]) === cn) all.push({ y: +y, rc }); }));
  if (!all.length) return null;
  const names = [...new Set(all.map((x) => x.rc[1]))];
  let pick = names.find((n) => hay.includes(n.replace(/ Grand Prix$/i, '').toLowerCase())) || null;
  if (!pick) { const latest = {}; all.forEach((x) => { latest[x.rc[1]] = Math.max(latest[x.rc[1]] || 0, x.y); }); pick = names.sort((a, b) => latest[b] - latest[a])[0]; }
  const eds = all.filter((x) => x.rc[1] === pick).sort((a, b) => b.y - a.y);
  const winOf = (rc) => rc[4].find(isWin);
  const winners = eds.slice(0, 8).map((x) => { const w = winOf(x.rc); return { year: x.y, name: w ? nm(w[0]) : '—', team: w ? tm(w[1]) : '', pole: x.rc[5] && x.rc[5][0] >= 0 ? nm(x.rc[5][0]) : null }; });
  const cnt = {}, tcnt = {}; let poleWins = 0, poles = 0;
  eds.forEach((x) => { const w = winOf(x.rc); if (!w) return; cnt[w[0]] = (cnt[w[0]] || 0) + 1; tcnt[w[1]] = (tcnt[w[1]] || 0) + 1; if (x.rc[5] && x.rc[5][0] >= 0) { poles++; if (x.rc[5][0] === w[0]) poleWins++; } });
  const ord = (o) => Object.keys(o).map((k) => ({ k: +k, v: o[k] })).sort((a, b) => b.v - a.v);
  return {
    name: pick, editions: eds.length, first: eds[eds.length - 1].y, last: eds[0].y, winners,
    drivers: ord(cnt).slice(0, 3).map((x) => ({ name: nm(x.k), v: x.v })), teams: ord(tcnt).slice(0, 3).map((x) => ({ name: tm(x.k), v: x.v })),
    poleConversion: poles ? Math.round((poleWins / poles) * 100) : null, poleSample: poles,
  };
}

// ---- all-time duel ----
const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function searchDrivers(q, n = 8) {
  const h = load(), A = agg(), s = strip(q).trim(); if (s.length < 2) return [];
  return h.d.map((d, i) => ({ i, d })).filter((x) => strip(`${x.d[1]} ${x.d[2]}`).includes(s)).sort((a, b) => (A.wins[b.i] * 3 + A.starts[b.i] / 20) - (A.wins[a.i] * 3 + A.starts[a.i] / 20)).slice(0, n)
    .map((x) => ({ i: x.i, name: `${x.d[1]} ${x.d[2]}`, nat: x.d[4], years: A.first[x.i] < 9999 ? `${A.first[x.i]}–${A.last[x.i]}` : '' }));
}
export function topDrivers(n = 6) { const A = agg(); return A.wins.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, n).map((x) => ({ i: x.i, name: nm(x.i), nat: load().d[x.i][4], years: `${A.first[x.i]}–${A.last[x.i]}` })); }
export function driverCard(i) {
  const A = agg(), h = load(); const d = h.d[i]; const seasons = new Set(); let best = 99;
  Object.keys(h.r).forEach((y) => h.r[y].forEach((rc) => rc[4].forEach((r) => { if (r[0] === i) { seasons.add(y); if (isWin(r)) best = Math.min(best, 1); } })));
  return { i, name: nm(i), nat: d[4], code: d[6], born: d[3], first: A.first[i], last: A.last[i], seasons: seasons.size,
    stats: [['Titles', A.titles[i]], ['Wins', A.wins[i]], ['Poles', A.poles[i]], ['Podiums', A.podiums[i]], ['Fastest laps', A.fl[i]], ['Starts', A.starts[i]], ['Points', Math.round(A.points[i] * 10) / 10]] };
}
// Races where both started: who finished ahead (a classified finish beats a retirement; two retirements are not counted).
export function duel(a, b) {
  const h = load(); let aw = 0, bw = 0, shared = 0, sameTeam = 0, atw = 0, btw = 0;
  Object.keys(h.r).forEach((y) => h.r[y].forEach((rc) => {
    const ra = rc[4].find((r) => r[0] === a && r[4] !== 'W'), rb = rc[4].find((r) => r[0] === b && r[4] !== 'W'); if (!ra || !rb) return; shared++;
    const ca = num(ra), cb = num(rb); let res = 0; if (ca && cb) res = ra[3] < rb[3] ? 1 : -1; else if (ca) res = 1; else if (cb) res = -1;
    if (res > 0) aw++; else if (res < 0) bw++;
    if (ra[1] === rb[1]) { sameTeam++; if (res > 0) atw++; else if (res < 0) btw++; }
  }));
  return { shared, ahead: [aw, bw], sameTeam, sameTeamAhead: [atw, btw] };
}

// ---- quiz ----
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = rnd(i + 1); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const mix = (right, wrong, n = 3) => { const w = shuffle([...new Set(wrong)].filter((x) => x !== right)).slice(0, n); return w.length < 2 ? null : shuffle([right, ...w]); };
const years = () => Object.keys(load().r).map(Number).filter((y) => y >= 1980);
const gens = [
  () => { const h = load(), y = years()[rnd(years().length)], rcs = h.r[y]; const rc = rcs[rnd(rcs.length)]; const w = rc[4].find(isWin); if (!w) return null;
    const opts = mix(nm(w[0]), rc[4].filter((r) => r[3] > 1 && r[3] <= 8).map((r) => nm(r[0]))); return opts && { q: `Who won the ${y} ${rc[1]}?`, opts, a: nm(w[0]), why: `${nm(w[0])} won for ${tm(w[1])}.` }; },
  () => { const h = load(), y = years().filter((x) => x >= 1990)[rnd(years().filter((x) => x >= 1990).length)]; const t = h.ds[y]?.find((x) => x[1] === 1); if (!t) return null;
    const opts = mix(nm(t[0]), h.ds[y].slice(1, 8).map((x) => nm(x[0]))); return opts && { q: `Who was World Champion in ${y}?`, opts, a: nm(t[0]), why: `${nm(t[0])} took the ${y} title with ${t[2]} points.` }; },
  () => { const h = load(), y = years()[rnd(years().length)], rcs = h.r[y], rc = rcs[rnd(rcs.length)]; const r = rc[4].filter((x) => x[3] <= 10 && num(x))[rnd(Math.min(10, rc[4].length))]; if (!r) return null;
    const opts = mix(tm(r[1]), rc[4].map((x) => tm(x[1]))); return opts && { q: `Which team did ${nm(r[0])} drive for at the ${y} ${rc[1]}?`, opts, a: tm(r[1]), why: `${nm(r[0])} finished P${r[3]} for ${tm(r[1])}.` }; },
  () => { const A = agg(), h = load(); const pool = A.wins.map((v, i) => ({ v, i })).filter((x) => x.v >= 4); const a = pool[rnd(pool.length)], b = pool[rnd(pool.length)]; if (!a || !b || a.v === b.v) return null;
    const win = a.v > b.v ? a : b; return { q: `Who has more career wins: ${nm(a.i)} or ${nm(b.i)}?`, opts: shuffle([nm(a.i), nm(b.i)]), a: nm(win.i), why: `${nm(a.i)}: ${a.v}, ${nm(b.i)}: ${b.v}.` }; },
  () => { const h = load(), y = years()[rnd(years().length)], rc = h.r[y][rnd(h.r[y].length)]; if (!rc[5] || rc[5][0] < 0) return null; const opts = mix(nm(rc[5][0]), rc[4].slice(0, 8).map((r) => nm(r[0])));
    return opts && { q: `Who took pole position at the ${y} ${rc[1]}?`, opts, a: nm(rc[5][0]), why: `${nm(rc[5][0])} started on pole.` }; },
  () => { const h = load(), A = agg(), pool = A.titles.map((v, i) => ({ v, i })).filter((x) => x.v >= 1); const x = pool[rnd(pool.length)]; if (!x) return null;
    const opts = mix(String(x.v), [String(x.v + 1), String(Math.max(1, x.v - 1)), String(x.v + 2), '1', '2', '3']); return opts && { q: `How many World Championships did ${nm(x.i)} win?`, opts, a: String(x.v), why: `${nm(x.i)} won ${x.v}.` }; },
];
export function makeQuiz(n = 10) {
  const out = []; let guard = 0; const seen = new Set();
  while (out.length < n && guard++ < 400) { const q = gens[rnd(gens.length)](); if (q && !seen.has(q.q)) { seen.add(q.q); out.push(q); } }
  return out;
}
