import AsyncStorage from '@react-native-async-storage/async-storage';
import { lastRace, driverStandings, constructorStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';

const readFavs = async () => { try { const f = JSON.parse(await AsyncStorage.getItem('favs')); return { drivers: Array.isArray(f?.drivers) ? f.drivers : [], teams: Array.isArray(f?.teams) ? f.teams : [] }; } catch { return { drivers: [], teams: [] }; } };

// How your favourite drivers and teams got on in the latest race and where they stand in the championships. Needs a connection.
export async function buildDigest() {
  const f = await readFavs(); if (!f.drivers.length && !f.teams.length) return { empty: true };
  const [race, ds, cs] = await Promise.all([lastRace(YEAR), driverStandings(YEAR), constructorStandings(YEAR)]);
  if (!race) return { empty: false, race: null, drivers: [], teams: [] };
  const lead = ds[0] ? ds[0].points : 0;
  const drivers = f.drivers.map((id) => { const r = race.rows.find((x) => x.driverId === id); const s = ds.find((x) => x.driverId === id); if (!r && !s) return null;
    return { id, name: (r && r.driver) || (s && s.name) || id, code: (r && r.code) || (s && s.code) || '', grid: r ? r.grid : null, pos: r ? r.position : null, posText: r ? r.positionText : null, status: r ? r.status : null, pts: r ? r.points : 0, seasonPos: s ? s.position : null, seasonPts: s ? s.points : null, gap: s ? lead - s.points : null }; }).filter(Boolean);
  const teams = f.teams.map((id) => { const rows = race.rows.filter((x) => x.teamId === id); const s = cs.find((x) => x.teamId === id); if (!rows.length && !s) return null;
    return { id, name: (rows[0] && rows[0].team) || (s && s.name) || id, pts: rows.reduce((n, x) => n + x.points, 0), best: rows.length ? Math.min(...rows.map((x) => x.position)) : null, seasonPos: s ? s.position : null, seasonPts: s ? s.points : null }; }).filter(Boolean);
  return { empty: false, race: { name: race.name, round: race.round, date: race.date }, drivers, teams };
}
// One short line for a result alert: "HAM P3, VER P1". `rows` is the raw Jolpica list (race, sprint or qualifying).
// `only` (optional) limits it to those driver ids, for the per-driver alert switches.
export async function digestLine(rows, only) {
  const f = await readFavs(); let ids = f.drivers; if (Array.isArray(only)) ids = ids.filter((x) => only.includes(x)); if (!ids.length || !Array.isArray(rows)) return '';
  const out = rows.filter((r) => ids.includes(r.Driver?.driverId)).map((r) => { const num = r.positionText === undefined || /^\d+$/.test(String(r.positionText)); return `${r.Driver.code || r.Driver.familyName} ${num ? `P${r.position}` : r.status || 'DNF'}`; });
  return out.length ? out.join(', ') : '';
}
