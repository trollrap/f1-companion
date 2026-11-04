import { driverStandings, constructorStandings, lineups } from '../api/jolpica';
import { paddockMeta } from '../api/paddock';
import { YEAR } from '../api/openf1';
import { teamColor } from '../theme';
import { uid } from './store';
import { freeNumber } from './sim';
import { attrsFor } from './talent';
// The real grid of the season as a fantasy grid: real teams (with their colours and logos), real drivers (with their photos),
// car and driver strength worked out from this season's championship points.
export async function loadRealGrid(taken = []) {
  const [ds, cs, lu, meta] = await Promise.all([driverStandings(YEAR).catch(() => []), constructorStandings(YEAR).catch(() => []), lineups(YEAR).catch(() => ({})), paddockMeta(YEAR).catch(() => null)]);
  const dpts = Object.fromEntries(ds.map((x) => [x.driverId, x.points])), tpts = Object.fromEntries(cs.map((x) => [x.teamId, x.points]));
  const maxD = Math.max(1, ...Object.values(dpts)), maxT = Math.max(1, ...Object.values(tpts));
  const used = new Set(taken.map(Number)); const teams = [], drivers = [];
  const ids = Object.keys(lu).sort((a, b) => (tpts[b] || 0) - (tpts[a] || 0));
  ids.forEach((tid) => {
    const list = lu[tid]; const share = Math.pow((tpts[tid] || 0) / maxT, 0.6); const t = { id: uid(), ref: tid, name: list[0].team || cs.find((c) => c.teamId === tid)?.name || tid, color: teamColor(tid), logo: null, car: Math.round(46 + 50 * share), rel: Math.round(70 + 22 * share), dev: 60, pit: Math.round(68 + 22 * share) };
    teams.push(t);
    list.forEach((x) => {
      const raw = Number(ds.find((d) => d.driverId === x.driverId)?.permNumber) || Number(meta?.drivers?.[x.driverId]?.number) || 0;
      const number = raw && !used.has(raw) ? raw : freeNumber([...used]); used.add(number);
      const at = attrsFor(x.driverId, null); const pts = Math.round(58 + 38 * Math.pow((dpts[x.driverId] || 0) / maxD, 0.6));
      drivers.push({ id: uid(), ref: x.driverId, first: x.first, last: x.last, name: x.name || `${x.first} ${x.last}`, number, teamId: t.id, photo: null, ...(at.known ? at : { ...at, pace: pts, quali: pts, race: pts, skill: pts, pot: pts }) });
    });
  });
  return { teams, drivers };
}
