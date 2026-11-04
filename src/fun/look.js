import { standings, nextStep, freeNumber, evolveDriver, evolveTeam } from './sim';
import { driverPhoto, teamLogo } from '../lib/media';
// Pictures: your own upload wins, then the real photo/logo for real drivers and teams.
export const driverPic = (d) => (d?.photo ? { uri: d.photo } : d?.ref ? driverPhoto(d.ref) : null);
export const teamPic = (t) => (t?.logo ? { uri: t.logo } : t?.ref ? teamLogo(t.ref) : null);
export const isDone = (f) => !!f.races?.length && !nextStep(f);
export const seasonNo = (f) => f.season || 1;

// A season of a fantasy as a plain fantasy-like object: the current one, or a finished one from the history.
export function viewOf(f, n) {
  if (!n || n === seasonNo(f)) return f;
  const h = (f.history || []).find((x) => x.n === n); if (!h) return f;
  return { ...f, season: n, races: h.races, results: h.results, drivers: h.drivers, teams: h.teams, readonly: true };
}
export const seasonList = (f) => [...(f.history || []).map((h) => h.n), seasonNo(f)];

// Everything one driver did in the fantasy, over all seasons (the current one included).
export function careerOf(f, driverId) {
  const c = { seasons: 0, races: 0, wins: 0, podiums: 0, poles: 0, points: 0, dnf: 0, titles: 0, best: null, bySeason: [] };
  seasonList(f).forEach((n) => {
    const v = viewOf(f, n), st = standings(v), row = st.drivers.find((d) => d.id === driverId); if (!row || !row.races && !row.points && !row.poles) return;
    const rank = st.drivers.findIndex((d) => d.id === driverId) + 1, done = isDone(v), title = done && rank === 1;
    let best = null; v.races.forEach((r) => { const x = v.results?.[r.id]?.Race?.find((y) => y.driverId === driverId); if (x && x.status === 'OK' && (best == null || x.pos < best)) best = x.pos; });
    c.seasons++; c.races += row.races; c.wins += row.wins; c.podiums += row.podiums; c.poles += row.poles; c.points += row.points; c.dnf += row.dnf; if (title) c.titles++;
    if (best != null && (c.best == null || best < c.best)) c.best = best;
    c.bySeason.push({ n, rank, points: row.points, wins: row.wins, team: v.teams.find((t) => t.id === row.teamId)?.name || '', done, title });
  });
  return c;
}
// Another driver already wearing that number in this fantasy?
export const numberClash = (f, driverId, n) => f.drivers.find((d) => d.id !== driverId && Number(d.number) === Number(n)) || null;

// Closes the finished season into the history and opens the transfer window for the next one (`off`): ratings change a little, the calendar stays as a draft.
export function closeSeason(f, evolve) {
  const n = seasonNo(f), st = standings(f);
  const snap = { n, races: f.races, results: f.results || {}, drivers: f.drivers, teams: f.teams, champion: st.drivers[0]?.id || null, teamChampion: st.teams[0]?.id || null };
  return { ...f, season: n + 1, history: [...(f.history || []), snap], results: {}, off: true, news: [],
    drivers: f.drivers.map((d) => (evolve ? evolveDriver(d) : d)), teams: f.teams.map((t) => (evolve ? evolveTeam(t) : t)) };
}
export { freeNumber };

// Totals over the whole save (every season, the current one included). Titles count for seasons that are finished, or for the current one once the save is ended.
export function allTime(f) {
  const D = new Map(), T = new Map(), champs = []; let races = 0; const rec = { wins: null, points: null, margin: null, tight: null };
  const best = (k, val, o, hi = true) => { if (!rec[k] || (hi ? val > rec[k].val : val < rec[k].val)) rec[k] = { val, ...o }; };
  seasonList(f).forEach((n) => {
    const v = viewOf(f, n), st = standings(v), rn = v.races.filter((r) => v.results?.[r.id]?.Race).length; if (!rn) return;
    const closed = isDone(v) || (!!f.ended && n === seasonNo(f)); races += rn;
    st.drivers.forEach((d, i) => {
      if (!d.races && !d.points && !d.poles) return;
      const x = D.get(d.id) || { id: d.id, seasons: 0, races: 0, wins: 0, podiums: 0, poles: 0, points: 0, fl: 0, dnf: 0, titles: 0 }; D.set(d.id, x);
      x.d = d; x.team = v.teams.find((t) => t.id === d.teamId); x.seasons++; x.races += d.races; x.wins += d.wins; x.podiums += d.podiums; x.poles += d.poles; x.points += d.points; x.fl += d.fl || 0; x.dnf += d.dnf;
      if (closed && i === 0) x.titles++;
      best('wins', d.wins, { name: d.name, n }); best('points', d.points, { name: d.name, n });
    });
    st.teams.forEach((t, i) => { const x = T.get(t.id) || { id: t.id, seasons: 0, wins: 0, points: 0, titles: 0 }; T.set(t.id, x); x.t = t; x.seasons++; x.wins += t.wins; x.points += t.points; if (closed && i === 0) x.titles++; });
    if (closed && st.drivers[0]) {
      const a = st.drivers[0], b = st.drivers[1], tc = st.teams[0];
      champs.push({ n, driver: a, team: v.teams.find((t) => t.id === a.teamId), tteam: tc });
      if (b) { const m = a.points - b.points; best('margin', m, { name: a.name, n }); best('tight', m, { name: a.name, n }, false); }
    }
  });
  const byD = (a, b) => b.titles - a.titles || b.wins - a.wins || b.podiums - a.podiums || b.points - a.points;
  return { seasons: seasonList(f).length, races, champs, rec, drivers: [...D.values()].sort(byD), teams: [...T.values()].sort((a, b) => b.titles - a.titles || b.wins - a.wins || b.points - a.points) };
}

// Highlights of one season (a viewOf() object): champions, leaders in each category, margins.
export function seasonSummary(v, closed) {
  const st = standings(v), races = v.races.filter((r) => v.results?.[r.id]?.Race).length; if (!races) return null;
  const top = (key, list = st.drivers) => { const m = Math.max(...list.map((d) => d[key] || 0)); return m > 0 ? { val: m, who: list.filter((d) => (d[key] || 0) === m) } : null; };
  const team = (id) => v.teams.find((t) => t.id === id);
  const a = st.drivers[0], b = st.drivers[1];
  return { races, closed, champion: a || null, team: team(a?.teamId), tchamp: st.teams[0] || null, margin: a && b ? a.points - b.points : null, winners: st.drivers.filter((d) => d.wins > 0).length,
    wins: top('wins'), poles: top('poles'), podiums: top('podiums'), fl: top('fl'), dnf: top('dnf'), twins: top('wins', st.teams), tpoints: st.teams[0] ? { val: st.teams[0].points, who: [st.teams[0]] } : null };
}
