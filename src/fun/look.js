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
