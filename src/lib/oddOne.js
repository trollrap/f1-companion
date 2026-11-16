import { driversMeta, teamNameOf } from '../api/history';

const TEAMS = ['ferrari', 'mclaren', 'williams', 'red_bull', 'lotus_f1', 'renault', 'mercedes', 'benetton'];
const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
// One round: four drivers, three share a fact and one does not. { q, options: [names], odd: index, why }. Uses drivers with 60+ starts.
export function makeOdd(r) {
  const pool = driversMeta().filter((d) => d.races >= 60);
  const kinds = [];
  const nats = {}; pool.forEach((d) => { (nats[d.nat] ||= []).push(d); }); Object.keys(nats).filter((n) => nats[n].length >= 6).forEach((n) => kinds.push({ q: `Three of these drivers are ${n}. Which one is not?`, yes: (d) => d.nat === n, why: (d) => `${d.name} is ${d.nat}.` }));
  kinds.push({ q: 'Three of these drivers won a world title. Which one never did?', yes: (d) => d.champ, why: (d) => `${d.name} never won the title.` });
  TEAMS.forEach((t) => kinds.push({ q: `Three of these drivers raced for ${teamNameOf(t)}. Which one never did?`, yes: (d) => d.teams.has(t), why: (d) => `${d.name} never raced for ${teamNameOf(t)}.` }));
  [1960, 1980, 2000].forEach((y) => kinds.push({ q: `Three of these drivers made their debut in the ${y}s. Which one did not?`, yes: (d) => d.first >= y && d.first < y + 10, why: (d) => `${d.name} debuted in ${d.first}.` }));
  for (const k of shuffle(r, kinds)) {
    const yes = shuffle(r, pool.filter(k.yes)), no = shuffle(r, pool.filter((d) => !k.yes(d)));
    if (yes.length < 3 || no.length < 1) continue;
    // keep the odd one out reasonably famous so the round is fair
    const odd = no[0]; const three = yes.slice(0, 3); const all = shuffle(r, [...three, odd]);
    return { q: k.q, options: all.map((d) => d.name), odd: all.indexOf(odd), why: k.why(odd) };
  }
  return null;
}
