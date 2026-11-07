// In-app newspaper for a fantasy. Articles are written from what actually happened in the save (grids, finishing orders, retirements, standings,
// ratings) with a seeded choice of wording, so an article reads the same every time and new ones appear as races are run.
// Made-up drivers get more stories, with fictional quotes and rumours. Real drivers and teams only get what the simulation produced:
// no invented quotes and no invented rumours about real people.
// Every article carries `stats` and a `subject` (driver or team) so the screen can show numbers and a team-coloured banner instead of photos.
import { ovr, A } from './sim';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ord = (n) => (n % 100 >= 11 && n % 100 <= 13 ? `${n}th` : `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`);
const sn = (d) => String(d?.last || d?.name || '').trim();
const real = (d) => !!d?.ref;
const pl = (n, a, b) => (n === 1 ? a : b || `${a}s`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const place = (r) => String(r.name || '').replace(/ Grand Prix$/i, '');

export function buildNews(f, v, st, n) {
  const out = []; const sd = st.drivers, stm = st.teams;
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const D = (id) => v.drivers.find((d) => d.id === id) || sd.find((d) => d.id === id);
  const T = (id) => v.teams.find((t) => t.id === id);
  const done = v.races.filter((r) => v.results?.[r.id]?.Race);
  const dStats = (d) => { const row = sd.find((x) => x.id === d.id); const pos = sd.findIndex((x) => x.id === d.id) + 1; return [['CHAMP.', pos ? `P${pos}` : '–'], ['POINTS', String(row?.points ?? 0)], ['WINS', String(row?.wins ?? 0)], ['PODIUMS', String(row?.podiums ?? 0)], ['POLES', String(row?.poles ?? 0)], ['RATING', String(ovr(d))]]; };
  const tStats = (t) => { const row = stm.find((x) => x.id === t.id); const pos = stm.findIndex((x) => x.id === t.id) + 1; return [['CHAMP.', pos ? `P${pos}` : '–'], ['POINTS', String(row?.points ?? 0)], ['WINS', String(row?.wins ?? 0)], ['CAR', String(Math.round(t.car || 0))]]; };
  const push = (a) => out.push({ season: n, ...a });
  const dSub = (d) => { const t = T(d.teamId); return { subject: { type: 'driver', name: d.name, number: d.number, nat: d.nat, team: t?.name }, color: t?.color, stats: dStats(d) }; };
  const tSub = (t) => ({ subject: { type: 'team', name: t.name }, color: t.color, stats: tStats(t) });
  const next = v.races[done.length];

  // ---------- preview before the first race
  if (!done.length) {
    const top = [...v.teams].sort((a, b) => (b.car || 0) - (a.car || 0)); const r = rng(`${f.id}:${n}:prev`);
    const best = [...v.drivers].sort((a, b) => ovr(b) - ovr(a)); const rookies = v.drivers.filter((d) => d.from);
    if (top[0]) push({ id: 'preview', kind: 'Preview', order: 0, kicker: 'THE SEASON AHEAD', title: `Season ${n} preview: ${top[0].name} head into round one as the team to beat`, ...tSub(top[0]),
      body: [
        `${v.races.length} races, ${v.drivers.length} drivers and ${v.teams.length} teams: season ${n} gets under way${next ? ` at the ${next.name}` : ''}, and the paddock has spent the winter arguing about the pecking order.`,
        `On raw car performance ${top[0].name} look strongest, with ${top[1]?.name || 'the chasing pack'}${top[2] ? ` and ${top[2].name}` : ''} close enough to make it a fight. ${pick(r, ['Winter testing is famously unreliable, and every team has hidden something.', 'Nobody ever shows their hand in testing, so the first race is the first real answer.', 'Teams that look slow now have a habit of finding half a second by round three.'])}`,
        best[0] ? `Among the drivers ${best.slice(0, 3).map(sn).join(', ')} carry the highest ratings in the field. ${best[0].name} (${ovr(best[0])}) is the pick of most for the title, but ${rookies.length ? `with ${rookies.length} ${pl(rookies.length, 'newcomer')} on the grid` : 'with so little between the top teams'} ${pick(r, ['upsets are likely.', 'the usual order may not survive the first corner.', 'the early races could be chaotic.'])}` : '',
        `At the other end of the order ${top[top.length - 1].name} will be aiming simply to get into the points regularly. ${pick(r, ['Everyone has to start somewhere.', 'A good first weekend would feel like a win for them.'])}`,
      ].filter(Boolean) });
  }

  // ---------- one report for each of the latest races
  done.slice(-7).forEach((race) => {
    const idx = v.races.indexOf(race) + 1; const res = v.results[race.id]; const rows = res.Race; const w = rows[0]; const wd = D(w.driverId); if (!wd) return;
    const r = rng(`${f.id}:${n}:${race.id}`); const quali = res.Qualifying || []; const wt = T(wd.teamId); const pd = D(quali[0]?.driverId);
    const gridOf = (id) => { const i = quali.findIndex((x) => x.driverId === id); return i >= 0 ? i + 1 : null; };
    const grid = gridOf(w.driverId); const out2 = rows.filter((x) => x.status && x.status !== 'OK' && x.status !== 'Finished'); const fin = rows.filter((x) => !out2.includes(x));
    const movers = fin.map((x, i) => ({ x, gain: (gridOf(x.driverId) || i + 1) - (i + 1) })).sort((a, b) => b.gain - a.gain); const mover = movers[0]?.gain >= 4 ? movers[0] : null; const md = mover && D(mover.x.driverId);
    const fl = rows.find((x) => x.fl); const fd = fl && D(fl.driverId); const second = D(rows[1]?.driverId), third = D(rows[2]?.driverId);
    const lead = sd[0], gap = sd[1] ? sd[0].points - sd[1].points : null; const latest = idx === done.length;
    const head = grid && grid > 4 ? pick(r, [`${sn(wd)} storms from ${ord(grid)} to win the ${place(race)} Grand Prix`, `From ${ord(grid)} to first: ${sn(wd)} conjures a win in ${place(race)}`]) : grid === 1 ? pick(r, [`${sn(wd)} converts pole into victory in ${place(race)}`, `Lights to flag: ${sn(wd)} dominates the ${place(race)} Grand Prix`]) : pick(r, [`${sn(wd)} takes a hard-fought win in ${place(race)}`, `${wt?.name || 'Victory'} celebrate as ${sn(wd)} wins in ${place(race)}`]);
    const para = [];
    para.push(`${wd.name} won round ${idx} of ${v.races.length}, the ${race.name}, for ${wt?.name || 'his team'}${grid ? `, having started ${grid === 1 ? 'from pole position' : `from ${ord(grid)} on the grid`}` : ''}. ${second && third ? `${second.name} finished second and ${third.name} completed the podium.` : ''}`.trim());
    if (pd && pd.id !== wd.id) para.push(`Saturday had gone differently: ${pd.name} took pole position for ${T(pd.teamId)?.name || 'his team'} but ended up ${ord(rows.findIndex((x) => x.driverId === pd.id) + 1)} at the flag${out2.some((x) => x.driverId === pd.id) ? ', his race ended early' : ''}. ${pick(r, ['Pole is worth a lot at this circuit, but it is only worth something if you keep it through the first lap.', 'It was a reminder that qualifying pace and race pace are not the same thing.'])}`);
    else if (pd) para.push(`${wd.name} had also set the fastest time in qualifying, and from there the race was largely about managing the gap. ${pick(r, ['Clean air did the rest.', 'Nobody got close enough to make him worry.', 'Behind him the real fight was for the other two podium places.'])}`);
    if (mover && md && md.id !== wd.id) para.push(`The drive of the day came from further back. ${md.name} climbed ${mover.gain} ${pl(mover.gain, 'place')} from ${ord(gridOf(md.id) || 1)} on the grid to finish ${ord(fin.indexOf(mover.x) + 1)}${T(md.teamId) ? `, a strong result for ${T(md.teamId).name}` : ''}.`);
    if (out2.length) para.push(`${out2.length} ${pl(out2.length, 'driver')} failed to see the chequered flag: ${out2.slice(0, 4).map((x) => `${sn(D(x.driverId))} (${String(x.status).toLowerCase()})`).join(', ')}. ${pick(r, ['It was a costly afternoon for the garages involved.', 'Reliability and incidents shaped the order more than pure speed.', 'Those teams will have a long evening of debriefs ahead.'])}`);
    else para.push(pick(r, ['Remarkably, every car that started also finished, a rare clean race.', 'There were no retirements at all, which kept the order stable.']));
    if (fd) para.push(`${fd.name} set the fastest lap${T(fd.teamId) ? ` for ${T(fd.teamId).name}` : ''}, ${fd.id === wd.id ? 'a final mark of dominance' : 'a small consolation in a race that belonged to someone else'}.`);
    if (!real(wd)) para.push(pick(r, [`"We had the pace today and it all came together," ${sn(wd)} said afterwards. "The team gave me a car I could trust."`, `"I did not expect this when I woke up," admitted ${sn(wd)}. "Now I want to keep it going."`, `${sn(wd)} was lost for words in the cooldown room, though not for long: "Win number ${sd.find((x) => x.id === wd.id)?.wins || 1}, and I am not done."`]));
    if (latest && lead) para.push(`The championship now reads ${lead.name} on ${lead.points} points${sd[1] ? `, ${gap} ${pl(gap, 'point')} clear of ${sd[1].name}` : ''}${sd[2] ? `, with ${sd[2].name} third` : ''}. ${next ? `Next up is the ${next.name}.` : 'That was the final round of the season.'}`);
    push({ id: `race:${race.id}`, kind: 'Race report', order: 100 + idx, kicker: `ROUND ${idx} · ${race.name.toUpperCase()}`, title: head, ...dSub(wd), body: para });
  });

  // ---------- title fight
  if (done.length >= 3 && sd[1]) {
    const gap = sd[0].points - sd[1].points; const left = v.races.length - done.length; const r = rng(`${f.id}:${n}:fight:${done.length}`); const a = D(sd[0].id), b = D(sd[1].id);
    const maxPts = left * 26;
    push({ id: `fight:${done.length}`, kind: 'Analysis', order: 90 + done.length, kicker: 'THE CHAMPIONSHIP', ...(a ? dSub(a) : {}),
      title: gap <= 10 ? `${sn(sd[0])} and ${sn(sd[1])} separated by just ${gap} ${pl(gap, 'point')}` : `${sn(sd[0])} builds a ${gap}-point cushion`,
      body: [
        `After ${done.length} ${pl(done.length, 'round')} ${sd[0].name} leads the standings on ${sd[0].points} points, ahead of ${sd[1].name} on ${sd[1].points}${sd[2] ? ` and ${sd[2].name} on ${sd[2].points}` : ''}.`,
        left > 0 ? `${left} ${left === 1 ? 'race remains' : 'races remain'}, with up to ${maxPts} points still available to a driver winning everything. ${gap > maxPts ? 'The maths say it is over.' : gap > maxPts / 2 ? pick(r, ['It would take a collapse to lose it from here.', 'The chasing pack needs something special, and soon.']) : pick(r, ['Nothing is decided, and one bad weekend can swing it back.', 'This one will go deep into the season.'])}` : 'That was the final round.',
        a && b ? `${sn(a)} brings ${sd[0].wins} ${pl(sd[0].wins, 'win')} and ${sd[0].podiums} ${pl(sd[0].podiums, 'podium')} to the fight; ${sn(b)} has ${sd[1].wins} and ${sd[1].podiums}. ${ovr(a) >= ovr(b) ? `On ratings ${sn(a)} (${ovr(a)}) has a slight edge over ${sn(b)} (${ovr(b)}), which suggests the order is not a fluke.` : `Interestingly ${sn(b)} (${ovr(b)}) is rated higher than the leader (${ovr(a)}), so the gap may not last.`}` : '',
        T(sd[0].teamId) && T(sd[1].teamId) ? (sd[0].teamId === sd[1].teamId ? `Both title rivals drive for ${T(sd[0].teamId).name}, which makes team orders a topic nobody in the garage will want to discuss.` : `It is also a straight fight between ${T(sd[0].teamId).name} and ${T(sd[1].teamId).name}, and development in the coming rounds could decide it.`) : '',
      ].filter(Boolean) });
  }

  // ---------- constructors
  if (done.length >= 2 && stm[0]) {
    const r = rng(`${f.id}:${n}:team:${Math.floor(done.length / 2)}`); const t = stm[0], u = stm[1], last = stm[stm.length - 1]; const tt = T(t.id);
    if (tt) push({ id: `team:${Math.floor(done.length / 2)}`, kind: 'Teams', order: 60 + done.length, kicker: 'CONSTRUCTORS', ...tSub(tt), title: pick(r, [`${t.name} set the pace in the constructors' table`, `${t.name} lead the way, but for how long?`]),
      body: [
        `${t.name} top the constructors' standings with ${t.points} points and ${t.wins} ${pl(t.wins, 'win')} from ${done.length} ${pl(done.length, 'race')}${u ? `, ${t.points - u.points} ahead of ${u.name}` : ''}.`,
        stm[2] ? `${u.name} are second on ${u.points}, and ${stm[2].name} third on ${stm[2].points}. ${pick(r, ['The midfield is tighter than the top, and a single good weekend can move a team several places.', 'Two or three teams look able to take points off the leaders on the right day.'])}` : '',
        `${tt.car >= 80 ? `The ${t.name} car is rated ${Math.round(tt.car)}, one of the best in the field, so the position is deserved.` : `The ${t.name} car is rated only ${Math.round(tt.car || 0)}, so the drivers are doing more than the machine suggests.`}`,
        last && last.id !== t.id ? `At the foot of the table ${last.name} have ${last.points} ${pl(last.points, 'point')}. ${pick(r, ['They will need upgrades more than luck.', 'A first points finish would be a boost for the whole team.'])}` : '',
      ].filter(Boolean) });
  }

  // ---------- team-mate battle (one team at a time, rotating)
  const tms = v.teams.map((t) => ({ t, ds: sd.filter((d) => d.teamId === t.id) })).filter((x) => x.ds.length >= 2 && (x.ds[0].points + x.ds[1].points) > 0);
  if (tms.length && done.length >= 3) {
    const x = tms[(Math.floor(done.length / 3) + hash(f.id)) % tms.length]; const [a, b] = x.ds; const da = D(a.id), db = D(b.id); const r = rng(`${f.id}:${n}:tm:${x.t.id}:${Math.floor(done.length / 3)}`);
    const fict = !real(da) && !real(db); const lead = a.points >= b.points ? [a, b] : [b, a];
    push({ id: `tm:${x.t.id}:${Math.floor(done.length / 3)}`, kind: 'Inside the team', order: 50 + done.length, kicker: x.t.name.toUpperCase(), ...(da ? dSub(da) : {}),
      title: a.points === b.points ? `${x.t.name}: dead heat between ${sn(a)} and ${sn(b)}` : `Team-mate battle at ${x.t.name}: ${sn(lead[0])} has the upper hand over ${sn(lead[1])}`,
      body: [
        `Inside the ${x.t.name} garage it is ${lead[0].name} on ${lead[0].points} ${pl(lead[0].points, 'point')} against ${lead[1].name} on ${lead[1].points}${lead[0].points !== lead[1].points ? `, a gap of ${lead[0].points - lead[1].points}` : ''}.`,
        da && db ? `On paper ${sn(da)} (${ovr(da)}) and ${sn(db)} (${ovr(db)}) are ${Math.abs(ovr(da) - ovr(db)) <= 3 ? 'very evenly matched, so the points gap is mostly about luck and execution' : `${ovr(da) > ovr(db) ? sn(da) : sn(db)} is the higher-rated driver, so the order is not a surprise`}. ${(A(da).quali >= A(db).quali) === (A(da).race >= A(db).race) ? `${A(da).quali >= A(db).quali ? sn(da) : sn(db)} looks stronger both in qualifying and in the race.` : `Qualifying has leaned towards ${A(da).quali >= A(db).quali ? sn(da) : sn(db)}, while ${A(da).race >= A(db).race ? sn(da) : sn(db)} looks the stronger racer.`}` : '',
        fict ? pick(r, ['Sources in the garage describe the atmosphere as "professional, mostly".', 'The pit wall insists both drivers are treated equally. Nobody in the paddock quite believes it.', 'The two are said to be on friendly terms, though they have stopped sharing a car to the circuit.']) : `Over the season so far ${sn(lead[0])} has had the better of it, and ${x.t.name} will be watching whether that holds.`,
      ].filter(Boolean) });
  }

  // ---------- stories about made-up drivers: more of them, with quotes and rumours
  const custom = v.drivers.filter((d) => !real(d)); const duelTeams = new Set();
  custom.filter((d) => rng(`${f.id}:${n}:cust:${d.id}:${done.length}`)() < 0.6).slice(0, 7).forEach((d) => {
    const r = rng(`${f.id}:${n}:cs:${d.id}:${done.length}`); const t = T(d.teamId); const row = sd.find((x) => x.id === d.id); const pos = sd.findIndex((x) => x.id === d.id) + 1; const a = A(d); const mate = v.drivers.find((x) => x.teamId === d.teamId && x.id !== d.id);
    const kind = Math.floor(r() * 5);
    const base = { ...dSub(d), who: undefined };
    const strength = a.pace >= 80 ? 'raw one-lap speed' : a.cons >= 80 ? 'consistency' : a.wet >= 82 ? 'skill in the wet' : a.race >= 78 ? 'racecraft' : 'a willingness to learn';
    if (kind === 0) push({ id: `p:${d.id}:${done.length}`, kind: 'Profile', order: 40, kicker: 'DRIVER PROFILE', ...base, title: `Who is ${d.name}?`,
      body: [
        `${d.name} is ${a.age} years old, races with the number ${d.number}${t ? ` for ${t.name}` : ''}${d.nat ? ` and carries the flag of ${d.nat.replace(/^(Netherlands|United States|United Kingdom|Philippines)$/, 'the $1')}` : ''}. ${d.from ? `He came up through ${d.from === 'Academy' ? 'a junior academy programme' : d.from}, and the step to the top level has not fazed him so far.` : 'He has been around the paddock long enough to know every trick in the book.'}`,
        `Engineers describe ${strength} as his greatest strength. His overall rating of ${ovr(d)} puts him ${ovr(d) >= 78 ? 'among the best in the field' : ovr(d) >= 68 ? 'in the solid midfield group' : 'at the lower end of the order, with a lot to prove'}${row ? `, and in the standings he currently sits ${ord(pos)} with ${row.points} ${pl(row.points, 'point')}` : ''}.`,
        a.pot - ovr(d) >= 6 ? `The paddock thinks the best is still to come. His potential rating of ${Math.round(a.pot)} is well above where he is now, and a top team could easily have an eye on him.` : `At this stage of his career he is delivering close to what is expected of him.`,
        pick(r, [`"I am just trying to get a little better every weekend," he says. "The rest takes care of itself."`, `"Nobody gives you anything here," he says. "You have to take it."`, `Asked about his goals, he smiles: "Ask me again at the end of the year."`]),
      ] });
    else if (kind === 1) { const other = v.teams.filter((x) => x.id !== d.teamId); const o = other[Math.floor(r() * Math.max(1, other.length))] || t;
      push({ id: `r:${d.id}:${done.length}`, kind: 'Rumour mill', order: 30, kicker: 'PADDOCK WHISPERS', ...base, title: pick(r, [`Is ${sn(d)} on the move?`, `Whispers about ${sn(d)}'s future`, `${sn(d)} spotted in conversation with a rival team boss`]),
        body: [
          pick(r, [`The word around the paddock is that ${d.name} has been seen near the ${o?.name} motorhome more often than a driver under contract elsewhere should be.`, `${d.name}'s manager is said to have asked for "a conversation about the future", and ${o?.name} are reported to be listening.`, `A rival team insider claims ${o?.name} have made an enquiry about ${d.name} for next season.`]),
          `${t?.name || 'His team'} have not commented. ${row?.points ? `With ${row.points} points to his name this year, he has the results to make the interest believable` : 'He has yet to score, which makes the interest harder to explain'}.`,
          `As always, rumours are cheap: contracts are decided in the winter, and nothing here is confirmed. This story is made up for fun.`,
        ] }); }
    else if (kind === 2 && mate && !duelTeams.has(d.teamId) && duelTeams.add(d.teamId)) push({ id: `d:${d.id}:${done.length}`, kind: 'Feature', order: 35, kicker: 'ON THE GRID', ...base, title: `${sn(d)} v ${sn(mate)}: who has the edge?`,
      body: [
        `${d.name} (rated ${ovr(d)}) and ${mate.name} (rated ${ovr(mate)}) share the ${t?.name || ''} garage, and every weekend the timing sheets are read as a verdict on both.`,
        `${(a.quali >= A(mate).quali ? a.race >= A(mate).race : a.race < A(mate).race) ? `${a.quali >= A(mate).quali ? sn(d) : sn(mate)} has the edge in both qualifying and the race` : `${a.quali >= A(mate).quali ? sn(d) : sn(mate)} usually has the better of qualifying, while ${a.race >= A(mate).race ? sn(d) : sn(mate)} tends to look stronger once the race is under way`}. ${row && sd.find((x) => x.id === mate.id) ? `In points it stands ${row.points} to ${sd.find((x) => x.id === mate.id).points}.` : ''}`,
        pick(r, [`"We push each other, and that is good for the team," says ${sn(d)}.`, `${sn(d)} insists there is "no problem at all" between the two, which is exactly what drivers say when there is.`]),
      ] });
    else if (kind === 3) push({ id: `n:${d.id}:${done.length}`, kind: 'Feature', order: 33, kicker: (d.nat || 'THE FANS').toUpperCase(), ...base, title: `${d.nat ? `${d.nat} fans` : 'Fans'} get behind ${sn(d)}`,
      body: [
        `${d.name} has become a favourite of the grandstands${d.nat ? `, and travelling supporters from ${d.nat} have started to fill the stands with his number` : ''}${row?.points ? `, helped by ${row.points} points so far this season` : ''}.`,
        pick(r, [`Merchandise stands report that caps with the number ${d.number} sell out first.`, `The number ${d.number} is suddenly everywhere on flags and shirts.`, `Fan clubs are reported to have grown several times over since the start of the year.`]),
        `${t?.name || 'His team'} have noticed, and the commercial department is said to be delighted. ${pick(r, ['Popularity is not points, but it does not hurt at contract time.', 'A loud following is a useful thing to have when negotiating.'])}`,
      ] });
    else push({ id: `i:${d.id}:${done.length}`, kind: 'Interview', order: 32, kicker: 'IN CONVERSATION', ...base, title: `${sn(d)} on the season so far: "${pick(r, ['Every race is a lesson', 'I want more', 'Still a lot of work to do'])}"`,
      body: [
        `${d.name} sat down after round ${Math.max(done.length, 1)} to talk about his season, which has brought ${row?.points ? `${row.points} ${pl(row.points, 'point')} and ${ord(pos)} in the championship` : 'no points yet'}.`,
        `"${pick(r, ['The car is quicker than people think and we are still finding things.', 'There is a lot of pressure, but I like it. It means people care.', 'My engineers and I speak the same language now, and that makes a huge difference.'])}"`,
        `Asked about ${mate ? sn(mate) : 'his rivals'}, he is diplomatic: "${pick(r, ['Everyone in this paddock is quick, you cannot relax for a second.', 'I respect him, but I want to beat him.'])}"`,
      ] });
  });

  // ---------- real drivers: only the simulation's facts
  sd.filter(real).slice(0, 2).forEach((d, i) => { if (!d.points) return; const dd = D(d.id); if (!dd) return; const r = rng(`${f.id}:${n}:real:${d.id}:${done.length}`); const t = T(d.teamId);
    push({ id: `real:${d.id}:${done.length}`, kind: 'Spotlight', order: 20 - i, kicker: 'SPOTLIGHT', ...dSub(dd), title: `${sn(d)} in numbers: ${d.points} points, ${d.wins} ${pl(d.wins, 'win')}`,
      body: [
        `In this fantasy season ${d.name} has scored ${d.points} points for ${t?.name || 'his team'}, with ${d.wins} ${pl(d.wins, 'win')}, ${d.podiums} ${pl(d.podiums, 'podium')} and ${d.poles} ${pl(d.poles, 'pole')} from ${done.length} ${pl(done.length, 'race')}.`,
        `That is an average of ${(d.points / Math.max(1, done.length)).toFixed(1)} points per weekend${d.podiums ? `, and ${Math.round((d.podiums / Math.max(1, done.length)) * 100)}% of his races have ended on the podium` : ''}. ${pick(r, ['The trend is worth watching.', 'Whether that pace can be kept up is the question for the second half.'])}`,
        `(All statistics come from the simulation, not from real races.)`,
      ] }); });

  // ---------- rookies
  v.drivers.filter((d) => d.from && done.length >= 2).slice(0, 2).forEach((d) => { const row = sd.find((x) => x.id === d.id); const r = rng(`${f.id}:${n}:rk:${d.id}`); const t = T(d.teamId); const a = A(d);
    push({ id: `rk:${d.id}:${Math.floor(done.length / 4)}`, kind: 'Rookie watch', order: 25, kicker: 'ROOKIE WATCH', ...dSub(d), title: `Rookie ${sn(d)}: ${row?.points ? `${row.points} points and counting` : 'still waiting for the first points'}`,
      body: [
        `${d.name} arrived from ${d.from === 'Academy' ? 'a junior academy programme' : d.from} and has ${row?.points ? `already scored ${row.points} ${pl(row.points, 'point')}` : 'yet to score'} for ${t?.name || 'the team'} after ${done.length} ${pl(done.length, 'round')}.`,
        `Rated ${ovr(d)} with a potential of ${Math.round(a.pot)}, ${a.pot - ovr(d) >= 8 ? 'he is one of the brightest prospects in the field' : 'he is a solid addition rather than a superstar in waiting'}. ${pick(r, ['The learning curve is steep, but the talent is obvious.', 'Rookie seasons are never easy, and the first points mean the most.', 'The paddock is watching closely.'])}`,
        !real(d) ? pick(r, [`"Everything is new, the speed, the people, the pressure," he admits. "I am enjoying it."`, `"I just want to get through the season in one piece and learn," he says.`]) : '',
      ].filter(Boolean) }); });

  // ---------- winter
  if (f.off && f.news?.length) push({ id: 'winter', kind: 'Transfers', order: 200, kicker: 'SILLY SEASON', title: `Transfer window: ${f.news.length} ${pl(f.news.length, 'move')} confirmed`, body: f.news.slice(0, 8).map((x) => (typeof x === 'string' ? x : x.text)).filter(Boolean) });

  return out.sort((a, b) => b.order - a.order);
}
