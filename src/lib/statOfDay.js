import { onThisDay, localAllDrivers, localCareer, raceHistory, roundsOf, historyYears } from '../api/history';
import { dominance } from './dominance';
import { seedOf, rngOf } from './kv';
// One fresh stat per day, picked with a seeded random so it stays the same all day. Every generator returns null when it has nothing to say.
export function statOfDay(day, standings) {
  const r = rngOf(seedOf(`stat${day}`)); const pick = (a) => a[Math.floor(r() * a.length)]; const md = day.slice(5);
  const gens = [
    () => { const t = onThisDay(md); const ev = [...t.races.map((x) => ({ k: 'r', x })), ...t.births.filter((b) => b.year > 1900).map((x) => ({ k: 'b', x }))]; if (!ev.length) return null; const e = pick(ev); const now = Number(day.slice(0, 4));
      return e.k === 'r' ? { tag: 'On this day', text: `In ${e.x.year} the ${e.x.name} was held on this date and won by ${e.x.winner}.`, src: 'Offline race history, 1950 to 2025' } : { tag: 'Born on this day', text: `${e.x.name} was born on this day in ${e.x.year}, ${now - e.x.year} years ago.`, src: 'Offline driver records' }; },
    () => { const pool = localAllDrivers().filter((d) => (d.last_year || 0) >= 1985); for (let i = 0; i < 40; i++) { const d = pick(pool); const c = localCareer(d.driverId); if (c && c.wins >= 8) return { tag: 'Career number', text: `${d.name} won ${c.wins} of ${c.races} starts (${Math.round((c.wins / c.races) * 100)}%), with ${c.poles} pole positions and ${c.podiums} podiums.`, src: 'Offline career records' }; } return null; },
    () => { for (let i = 0; i < 20; i++) { const y = pick(historyYears()); const rs = roundsOf(y); if (!rs.length) continue; const gp = pick(rs).name; const h = raceHistory(gp); if (h && h.races >= 8) return { tag: 'Grand Prix fact', text: `${h.top[0].name} has won the ${gp} ${h.top[0].wins} times. ${h.fromPole} of its ${h.races} editions (${Math.round((h.fromPole / h.races) * 100)}%) were won from pole.`, src: 'Offline race history' }; } return null; },
    () => { const d = dominance(); if (!d.length) return null; const x = pick(d); return { tag: 'Season fact', text: `In ${x.year}, ${x.driver} won ${x.champWins} of ${x.races} races and the title. ${x.team} won ${x.teamWins} in total, and the title fight ended ${Math.round((x.champPts - x.secondPts) * 10) / 10} points apart.`, src: 'Offline season results' }; },
    () => { if (!standings || standings.length < 2) return null; const a = standings[0], b = standings[1]; const gap = a.points - b.points; return { tag: 'Title fight', text: gap === 0 ? `${a.first} ${a.last} and ${b.first} ${b.last} are level on ${a.points} points at the top.` : `${a.first} ${a.last} leads ${b.first} ${b.last} by ${gap} point${gap === 1 ? '' : 's'}, ${a.points} to ${b.points}.`, src: 'Live driver standings' }; },
  ];
  const order = gens.map((g, i) => i).sort(() => r() - 0.5);
  const first = order.indexOf(0); if (first > 0 && r() < 0.35) { order.splice(first, 1); order.unshift(0); } // an "on this day" hit leads about a third of the time
  for (const i of order) { try { const s = gens[i](); if (s) return s; } catch {} }
  return null;
}
