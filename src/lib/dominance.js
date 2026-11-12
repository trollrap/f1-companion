import { historyYears, seasonRaw } from '../api/history';
import { replay } from './historyWhatIf';
import { driverChampion } from '../data/champions';
// How dominant was each season? Dominance = the average of the champion's win rate and the champion team's win rate. Margin = champion's points
// lead over second place as a share of the champion's total (official totals, so it follows the points system of the day).
let CACHE = null;
export function dominance() {
  if (CACHE) return CACHE; const out = [];
  historyYears().forEach((y) => {
    const champId = driverChampion(y); const races = seasonRaw(y); if (!champId || !races || races.length < 5) return;
    const r = replay(y, { sprint: true }); if (!r) return; const sorted = [...r.drivers].sort((a, b) => b.wasTotal - a.wasTotal); const champ = sorted.find((d) => d.id === champId) || sorted[0]; const second = sorted.find((d) => d.id !== champ.id);
    let cw = 0, tw = 0; const team = champ.team; races.forEach((rc) => { const w = rc.rows.find((x) => x.pos === 1); if (!w) return; if (w.id === champ.id) cw++; if (w.team === team) tw++; });
    const n = races.length; const margin = second ? (champ.wasTotal - second.wasTotal) / Math.max(1, champ.wasTotal) : 1;
    out.push({ year: y, driver: champ.name, team, races: n, champWins: cw, teamWins: tw, champRate: cw / n, teamRate: tw / n, dom: ((cw + tw) / 2 / n) * 100, margin, champPts: champ.wasTotal, secondPts: second?.wasTotal || 0, second: second?.name || '' });
  });
  CACHE = out; return out;
}
