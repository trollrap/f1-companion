// In-app newspaper for a fantasy: articles are written from what actually happened in the save (results, standings, ratings) with a seeded
// choice of wording, so they stay the same every time you open them and new ones appear as the season goes on.
// Made-up drivers get more stories (profiles, rumours, team-mate rows). For real drivers and real teams the stories stick to what happened in the
// fantasy: no invented quotes and no invented rumours about real people.
import { ovr, A } from './sim';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ord = (n) => (n % 100 >= 11 && n % 100 <= 13 ? `${n}th` : `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`);
const sn = (d) => String(d.last || d.name || '').trim();
const real = (d) => !!d?.ref;
const plural = (n, a, b) => (n === 1 ? a : b || `${a}s`);

export function buildNews(f, v, st, n) {
  const out = []; const R = rng(`${f.id}:${n}`);
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const D = (id) => v.drivers.find((d) => d.id === id) || st.drivers.find((d) => d.id === id);
  const T = (id) => v.teams.find((t) => t.id === id);
  const done = v.races.filter((r) => v.results?.[r.id]?.Race);
  const sd = st.drivers, stm = st.teams;
  const push = (a) => out.push({ season: n, ...a });

  // --- preview before the first race
  if (!done.length) {
    const top = [...v.teams].sort((a, b) => (b.car || 0) - (a.car || 0)).slice(0, 3);
    const r = rng(`${f.id}:${n}:prev`);
    push({ id: 'preview', kind: 'Preview', order: 0, title: `Season ${n} preview: ${top[0]?.name || 'the favourites'} start in front`, kicker: 'THE SEASON AHEAD', color: top[0]?.color,
      body: [
        `${v.races.length} races, ${v.drivers.length} drivers and ${v.teams.length} teams: season ${n} is about to begin${v.races[0] ? ` at the ${v.races[0].name}` : ''}.`,
        top.length ? `On paper the quickest cars belong to ${top.map((t) => t.name).join(', ')}. ${pick(r, ['Testing times can lie, though.', 'Everyone knows pre-season pace is only half the story.', 'The first few races will show who really did their homework.'])}` : '',
        sd[0] ? `Among the drivers the talk is about ${[...v.drivers].sort((a, b) => ovr(b) - ovr(a)).slice(0, 3).map(sn).join(', ')}, the highest rated names in the paddock.` : '',
      ].filter(Boolean) });
  }

  // --- a report after each of the latest races
  done.slice(-7).forEach((race) => {
    const idx = v.races.indexOf(race) + 1; const res = v.results[race.id]; const rows = res.Race; const w = rows[0]; const wd = D(w.driverId); if (!wd) return;
    const r = rng(`${f.id}:${n}:${race.id}`); const q = res.Qualifying?.[0]; const pd = q && D(q.driverId); const wt = T(wd.teamId);
    const qi = (res.Qualifying || []).findIndex((x) => x.driverId === w.driverId); const grid = qi >= 0 ? qi + 1 : null; const retired = rows.filter((x) => x.status && x.status !== 'OK'); const fl = rows.find((x) => x.fl); const fd = fl && D(fl.driverId);
    const head = grid && grid > 4 ? pick(r, [`${sn(wd)} storms from ${ord(grid)} to win in ${race.name.replace(/ Grand Prix$/i, '')}`, `Comeback of the year? ${sn(wd)} wins from ${ord(grid)} on the grid`]) : grid === 1 ? pick(r, [`${sn(wd)} controls the ${race.name} from pole`, `Lights to flag: ${sn(wd)} wins the ${race.name}`]) : pick(r, [`${sn(wd)} takes the win at the ${race.name}`, `${wt?.name || 'Victory'} celebrate as ${sn(wd)} wins the ${race.name}`]);
    const lead = sd[0]; const gap = sd[1] ? sd[0].points - sd[1].points : null;
    push({ id: `race:${race.id}`, kind: 'Race report', order: 100 + idx, title: head, kicker: `ROUND ${idx} · ${race.name.toUpperCase()}`, color: wt?.color, who: wd.id,
      body: [
        `${wd.name} (${wt?.name || ''}) won round ${idx} of ${v.races.length}${grid ? `, starting ${ord(grid)}` : ''}. ${pd && pd.id !== wd.id ? `${pd.name} had taken pole position, but finished ${ord(rows.findIndex((x) => x.driverId === q.driverId) + 1)}.` : pd ? 'He had also taken pole position.' : ''}`.trim(),
        rows[1] && rows[2] ? `${D(rows[1].driverId)?.name || ''} was second and ${D(rows[2].driverId)?.name || ''} completed the podium.` : '',
        retired.length ? `${retired.length} ${plural(retired.length, 'driver')} did not see the flag, among them ${retired.slice(0, 3).map((x) => sn(D(x.driverId) || {})).join(', ')}. ${pick(r, ['A tough afternoon for the garages.', 'Reliability was the talking point.', 'Some will want to forget this one quickly.'])}` : pick(r, ['Everybody who started also finished, a rare clean race.', 'It was a clean race with no retirements.']),
        fd ? `The fastest lap went to ${fd.name}.` : '',
        idx === done.length && lead ? `In the championship ${lead.name} ${gap != null ? `leads by ${gap} ${plural(gap, 'point')}` : 'leads'}${sd[1] ? ` from ${sd[1].name}` : ''}.` : '',
      ].filter(Boolean) });
  });

  // --- title fight
  if (done.length >= 3 && sd[1]) {
    const gap = sd[0].points - sd[1].points; const left = v.races.length - done.length; const r = rng(`${f.id}:${n}:fight:${done.length}`);
    push({ id: `fight:${done.length}`, kind: 'Analysis', order: 90 + done.length, kicker: 'THE CHAMPIONSHIP', color: T(sd[0].teamId)?.color, who: sd[0].id,
      title: gap <= 10 ? `${sn(sd[0])} and ${sn(sd[1])} separated by just ${gap}` : `${sn(sd[0])} builds a ${gap}-point cushion`,
      body: [
        `After ${done.length} ${plural(done.length, 'round')} ${sd[0].name} has ${sd[0].points} points against ${sd[1].points} for ${sd[1].name}${sd[2] ? `, with ${sd[2].name} third on ${sd[2].points}` : ''}.`,
        left > 0 ? `${left} ${plural(left, 'race')} remain. ${gap > left * 25 ? 'The maths already say it is over.' : gap > left * 12 ? pick(r, ['It would take a collapse to lose it from here.', 'The chasing pack needs something special.']) : pick(r, ['Nothing is decided and the next rounds will matter enormously.', 'One bad weekend can change everything.'])}` : 'That was the final round.',
        `${sd[0].wins} ${plural(sd[0].wins, 'win')} and ${sd[0].podiums} ${plural(sd[0].podiums, 'podium')} so far for the leader, ${sd[1].wins} and ${sd[1].podiums} for his closest rival.`,
      ] });
  }

  // --- team news
  if (done.length >= 2 && stm[0]) {
    const r = rng(`${f.id}:${n}:team:${Math.floor(done.length / 2)}`); const t = stm[0], u = stm[1];
    push({ id: `team:${Math.floor(done.length / 2)}`, kind: 'Teams', order: 60 + done.length, kicker: 'CONSTRUCTORS', color: t.color,
      title: pick(r, [`${t.name} lead the constructors' table`, `${t.name} set the pace among the teams`]),
      body: [`${t.name} have ${t.points} points and ${t.wins} ${plural(t.wins, 'win')}${u ? `, ${t.points - u.points} ahead of ${u.name}` : ''}.`, stm.length > 3 ? `At the other end ${stm[stm.length - 1].name} are still waiting to get going with ${stm[stm.length - 1].points} points.` : ''].filter(Boolean) });
  }

  // --- team-mate battles (one per team, rotates)
  const tms = v.teams.map((t) => ({ t, ds: sd.filter((d) => d.teamId === t.id) })).filter((x) => x.ds.length >= 2 && (x.ds[0].points + x.ds[1].points) > 0);
  if (tms.length && done.length >= 3) {
    const x = tms[(Math.floor(done.length / 3) + hash(f.id)) % tms.length]; const [a, b] = x.ds; const r = rng(`${f.id}:${n}:tm:${x.t.id}:${Math.floor(done.length / 3)}`);
    push({ id: `tm:${x.t.id}:${Math.floor(done.length / 3)}`, kind: 'Inside the team', order: 50 + done.length, kicker: x.t.name.toUpperCase(), color: x.t.color, who: a.id,
      title: a.points === b.points ? `${x.t.name}: dead heat between ${sn(a)} and ${sn(b)}` : `Team-mate battle at ${x.t.name}: ${sn(a)} ${a.points > b.points ? 'ahead of' : 'behind'} ${sn(b)}`,
      body: [`${a.name} has ${a.points} points, ${b.name} has ${b.points}.`, !real(a) && !real(b) ? pick(r, ['Sources in the garage say the atmosphere is "professional, mostly".', 'The pit wall insists both drivers get equal treatment. Nobody in the paddock quite believes it.', 'Rumour has it the two drivers no longer share a lift to the circuit.']) : `Over the season so far ${a.points >= b.points ? sn(a) : sn(b)} has the upper hand.`] });
  }

  // --- stories about made-up drivers (profiles and rumours), more of them than for real ones
  const custom = v.drivers.filter((d) => !real(d)); const picks = [];
  custom.forEach((d) => { const r = rng(`${f.id}:${n}:cust:${d.id}:${done.length}`); if (r() < 0.55) picks.push(d); });
  const duelTeams = new Set();
  picks.slice(0, 6).forEach((d) => {
    const r = rng(`${f.id}:${n}:cs:${d.id}:${done.length}`); const t = T(d.teamId); const row = sd.find((x) => x.id === d.id); const pos = sd.findIndex((x) => x.id === d.id) + 1; const a = A(d); const mate = v.drivers.find((x) => x.teamId === d.teamId && x.id !== d.id);
    const kind = Math.floor(r() * 4);
    const origin = d.from ? `He came up through ${d.from === 'Academy' ? 'an academy programme' : d.from}.` : '';
    const nat = d.nat ? `${d.nat}'s` : 'The';
    if (kind === 0) push({ id: `p:${d.id}:${done.length}`, kind: 'Profile', order: 40, kicker: 'DRIVER PROFILE', color: t?.color, who: d.id, title: `Who is ${d.name}?`,
      body: [`${d.name}, ${a.age}, races under number ${d.number}${t ? ` for ${t.name}` : ''}${d.nat ? ` and flies the flag for ${d.nat}` : ''}. ${origin}`.trim(), `Rated ${ovr(d)} overall, ${a.pace >= 80 ? 'raw pace is his calling card' : a.cons >= 80 ? 'consistency is his strength' : a.wet >= 82 ? 'he comes alive when it rains' : 'he is still finding his feet at this level'}${row ? `, and currently sits ${ord(pos)} in the championship with ${row.points} points` : ''}.`, a.pot - ovr(d) >= 6 ? `Insiders believe the best is still to come: the potential rating is ${Math.round(a.pot)}.` : ''].filter(Boolean) });
    else if (kind === 1) push({ id: `r:${d.id}:${done.length}`, kind: 'Rumour mill', order: 30, kicker: 'PADDOCK WHISPERS', color: t?.color, who: d.id, title: pick(r, [`Is ${sn(d)} on the move?`, `Whispers about ${sn(d)}'s future`, `${sn(d)} spotted deep in conversation with a rival team boss`]),
      body: [pick(r, [`Fantasy rumour: the word around the paddock is that ${d.name} has been seen near the motorhome of ${(v.teams.filter((x) => x.id !== d.teamId)[Math.floor(r() * Math.max(1, v.teams.length - 1))] || t)?.name}.`, `Fantasy rumour: ${d.name}'s manager is said to have asked for "a conversation about the future".`, `Fantasy rumour: ${d.name} has reportedly been practising ${pick(r, ['his victory speech', 'his signature', 'his hairpin overtakes in the simulator'])} more than usual.`]), 'Nothing is confirmed, and the team has not commented. This story is made up for fun.'] });
    else if (kind === 2 && mate && !duelTeams.has(d.teamId) && duelTeams.add(d.teamId)) push({ id: `d:${d.id}:${done.length}`, kind: 'Feature', order: 35, kicker: 'ON THE GRID', color: t?.color, who: d.id, title: `${sn(d)} v ${sn(mate)}: who has the edge?`,
      body: [`${d.name} (${ovr(d)}) and ${mate.name} (${ovr(mate)}) share the ${t?.name || ''} garage.`, `${a.quali > A(mate).quali ? `${sn(d)} is the quicker over one lap` : `${sn(mate)} is the quicker over one lap`}, while ${a.race > A(mate).race ? `${sn(d)} has the better racecraft` : `${sn(mate)} has the better racecraft`}.`] });
    else push({ id: `n:${d.id}:${done.length}`, kind: 'Feature', order: 33, kicker: nat.toUpperCase(), color: t?.color, who: d.id, title: `${d.nat ? `${d.nat} fans` : 'Fans'} get behind ${sn(d)}`,
      body: [`${d.name} has become a favourite of the grandstands${d.nat ? ` back home in ${d.nat}` : ''}${row && row.points ? `, helped by ${row.points} points this season` : ''}.`, pick(r, ['Merchandise stands report a rush on number ' + d.number + ' caps.', 'The number ' + d.number + ' is suddenly everywhere in the stands.', 'Social media in the fantasy paddock cannot stop talking about him.'])] });
  });

  // --- stories for real drivers: only what the fantasy itself produced
  const realTop = sd.filter(real).slice(0, 2);
  realTop.forEach((d, i) => { if (!d.points) return; const t = T(d.teamId); push({ id: `real:${d.id}:${done.length}`, kind: 'Spotlight', order: 20 - i, kicker: 'SPOTLIGHT', color: t?.color, who: d.id, title: `${sn(d)} in numbers: ${d.points} points, ${d.wins} ${plural(d.wins, 'win')}`, body: [`In this fantasy season ${d.name} has scored ${d.points} points for ${t?.name || 'his team'}, with ${d.podiums} ${plural(d.podiums, 'podium')} and ${d.poles} ${plural(d.poles, 'pole')}. (Statistics from the simulation, not from real races.)`] }); });

  // --- rookies
  v.drivers.filter((d) => d.from && done.length >= 2).slice(0, 2).forEach((d) => { const row = sd.find((x) => x.id === d.id); const r = rng(`${f.id}:${n}:rk:${d.id}`); const t = T(d.teamId);
    push({ id: `rk:${d.id}:${Math.floor(done.length / 4)}`, kind: 'Rookie watch', order: 25, kicker: 'ROOKIE WATCH', color: t?.color, who: d.id, title: `Rookie ${sn(d)}: ${row?.points ? `${row.points} points and counting` : 'still waiting for the first points'}`,
      body: [`${d.name} arrived from ${d.from === 'Academy' ? 'an academy programme' : d.from} and has ${row?.points ? `already scored ${row.points}` : 'yet to score'} for ${t?.name || 'the team'}.`, pick(r, ['The learning curve is steep, but the talent is obvious.', 'Rookie seasons are never easy.', 'The paddock is watching closely.'])] }); });

  // --- winter recap
  (f.news || []).slice(0, 1).forEach(() => { if (f.off && n === (f.season || n)) push({ id: 'winter', kind: 'Transfers', order: 200, kicker: 'SILLY SEASON', title: `Transfer window: ${f.news.length} ${plural(f.news.length, 'move')} confirmed`, body: f.news.slice(0, 6).map((x) => (typeof x === 'string' ? x : x.text)).filter(Boolean) }); });

  return out.sort((a, b) => b.order - a.order);
}
