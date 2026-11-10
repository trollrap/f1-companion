import { standings } from './sim';
import { viewOf, seasonList, isDone } from './look';
// Hall of fame across the seasons of one fantasy save: a champion list, title leaders and retired numbers (two or more titles).
export function hallOfFame(f) {
  const seasons = []; const by = {};
  seasonList(f).forEach((n) => {
    const v = viewOf(f, n); const cur = !(f.history || []).some((h) => h.n === n);
    if (cur && !isDone(v)) return; if (!(v.races || []).some((r) => v.results?.[r.id])) return;
    const st = standings(v); const d = st.drivers[0], t = st.teams[0]; if (!d || !(d.points > 0)) return;
    seasons.push({ n, driver: d.name, number: d.number, team: v.teams.find((x) => x.id === d.teamId)?.name || '', constructor: t?.name || '', points: d.points, wins: d.wins });
    const k = d.name; const e = (by[k] = by[k] || { name: d.name, number: d.number, titles: 0, wins: 0, years: [] }); e.titles++; e.wins += d.wins; e.years.push(n);
  });
  const legends = Object.values(by).sort((a, b) => b.titles - a.titles || b.wins - a.wins);
  return { seasons: seasons.reverse(), legends, retired: legends.filter((x) => x.titles >= 2 && x.number != null) };
}
