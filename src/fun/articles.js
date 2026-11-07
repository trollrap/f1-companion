// The fantasy's newspaper. Every article is written from what really happened in the save: grids, finishing orders, contact between named
// drivers, retirements, penalties, stops, weather, standings, transfers. Wording is picked with a seeded random generator, so an article reads
// the same every time it is opened, and a phrase is not reused inside one build, so the stories do not sound alike.
// Quotes are only written for made-up drivers and staff. For real drivers and real teams the articles describe what happened and how it looked,
// without putting words in anyone's mouth (and teams are referred to by role, not by an invented name).
// Every article carries `stats` and a `subject` so the screen can show a team-coloured banner and numbers instead of photos.
import { ovr, A, TA } from './sim';
import { careerOf } from './look';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ord = (n) => (n % 100 >= 11 && n % 100 <= 13 ? `${n}th` : `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`);
const pl = (n, a, b) => (n === 1 ? a : b || `${a}s`);
const sn = (d) => String(d?.last || d?.name || '').trim();
const real = (d) => !!d?.ref;
const place = (r) => String(r?.name || '').replace(/ Grand Prix$/i, '');
const FN = ['Marco', 'Elena', 'Viktor', 'Hana', 'Pavel', 'Ines', 'Tomas', 'Claire', 'Rafael', 'Nadia', 'Oskar', 'Ilse', 'Dario', 'Maren', 'Luka', 'Petra', 'Anselm', 'Greta'];
const LN = ['Brandt', 'Calloway', 'Dufresne', 'Esposito', 'Falk', 'Grosz', 'Hallberg', 'Imbert', 'Jovanovic', 'Kessler', 'Lindahl', 'Moretti', 'Novak', 'Orsini', 'Prager', 'Quist', 'Rinaldi', 'Svensson'];

export function buildNews(f, v, st, n) {
  const out = []; const sd = st.drivers, stm = st.teams; const used = new Set();
  const D = (id) => v.drivers.find((d) => d.id === id) || sd.find((d) => d.id === id) || (f.history || []).flatMap((h) => h.drivers || []).find((d) => d.id === id);
  const T = (id) => v.teams.find((t) => t.id === id);
  const races = v.races, done = races.filter((r) => v.results?.[r.id]?.Race); const total = races.length, complete = total > 0 && done.length === total;
  const next = races[done.length];
  // one phrase per pool per build: asking again for the same pool gives another entry until the pool is empty
  const pk = (r, key, arr) => { let free = arr.map((_, i) => i).filter((i) => !used.has(`${key}:${i}`)); if (!free.length) { arr.forEach((_, i) => used.delete(`${key}:${i}`)); free = arr.map((_, i) => i); } const i = free[Math.floor(r() * free.length)]; used.add(`${key}:${i}`); return arr[i]; };
  const push = (a) => out.push({ season: n, ...a });
  const dRow = (id) => sd.find((x) => x.id === id); const tRow = (id) => stm.find((x) => x.id === id);
  const dStats = (d) => { const row = dRow(d.id); const pos = sd.findIndex((x) => x.id === d.id) + 1; return [['CHAMP.', pos ? `P${pos}` : '–'], ['POINTS', String(row?.points ?? 0)], ['WINS', String(row?.wins ?? 0)], ['PODIUMS', String(row?.podiums ?? 0)], ['POLES', String(row?.poles ?? 0)], ['RATING', String(ovr(d))]]; };
  const tStats = (t) => { const row = tRow(t.id); const pos = stm.findIndex((x) => x.id === t.id) + 1; return [['CHAMP.', pos ? `P${pos}` : '–'], ['POINTS', String(row?.points ?? 0)], ['WINS', String(row?.wins ?? 0)], ['CAR', String(Math.round(t.car || 0))]]; };
  const dSub = (d) => { const t = T(d.teamId); return { subject: { type: 'driver', name: d.name, number: d.number, nat: d.nat, team: t?.name }, color: t?.color, stats: dStats(d) }; };
  const tSub = (t) => ({ subject: { type: 'team', name: t.name }, color: t.color, stats: tStats(t) });

  // ----- people in the garage. Made-up teams get named staff (and may be quoted); real teams are referred to by role only.
  const staff = (t) => { const r = rng(`${f.id}:staff:${t.id}`); const nm = () => `${FN[Math.floor(r() * FN.length)]} ${LN[Math.floor(r() * LN.length)]}`; return t.ref ? { fict: false, tp: 'the team principal', td: 'the technical director', ceo: 'the CEO', eng: 'his race engineer', tpName: null } : { fict: true, tp: nm(), td: nm(), ceo: nm(), eng: nm(), tpName: true }; };
  const S = {}; v.teams.forEach((t) => { S[t.id] = staff(t); });
  // a reaction: a quote for made-up drivers, a description for real ones
  const say = (r, d, mood, x = {}) => {
    const k = sn(d); const tm = x.team || T(d.teamId)?.name || 'the team'; const o = x.other ? sn(x.other) : 'him';
    if (!real(d)) {
      const Q = {
        win: [`"Days like this are why I do the job. The team gave me a rocket today," said ${k}.`, `"I do not have the words. We did everything right," ${k} grinned.`, `"Keep the champagne coming," laughed ${k}. "That one felt different."`, `"Every lap I could hear the grandstand. That is what drives me," ${k} admitted.`],
        gutted: [`"I do not want to talk about it," ${k} muttered, pulling off his gloves.`, `"We threw away points we cannot get back," ${k} said quietly.`, `"It hurts. I will sleep badly and then I will come back angrier," said ${k}.`, `"Stupid. That is the only word," ${k} admitted.`],
        fury: [`"He left me nowhere to go," ${k} said, still shaking his head. "I have watched it back and it is clear."`, `"That is not racing. Somebody has to explain that to ${o}," ${k} snapped.`, `"I gave him room and he took the rest of the track," ${k} fumed.`, `"Ask the stewards. I will say what I think in private," ${k} said through clenched teeth.`],
        sorry: [`"My mistake, completely. I owe the team an apology," ${k} said.`, `"I misjudged it. I will apologise to ${o} and move on," said ${k}.`, `"I committed to a gap that was not there. That one is on me," ${k} admitted.`],
        praise: [`"${o} is quick, no question. Days like this I just have to tip my cap," said ${k}.`, `"Respect to ${o}. He deserved it," ${k} said.`],
        blame: [`"The strategy call was wrong. I said so on the radio and I will say so again," ${k} said.`, `"Ask the pit wall. I did my job," ${k} shrugged.`, `"We are losing too much in the stops and I cannot fix that from the cockpit," said ${k}.`],
        calm: [`"Long season. One result does not define us," said ${k}.`, `"We know what we have to fix. Head down, back to work," ${k} said.`, `"There is more to come from this car," ${k} insisted.`],
      };
      return pk(r, `q:${mood}`, Q[mood] || Q.calm);
    }
    const N = {
      win: [`${k} climbed out of the car grinning and did not stop waving to the crowd.`, `${k} stood on the top step visibly overjoyed.`, `${k} hugged half the garage before reaching the scales.`],
      gutted: [`${k} stayed in the car for a long moment before getting out.`, `${k} walked back to the garage in silence, helmet in hand.`, `${k} looked drained as the cameras found him.`],
      fury: [`${k} was seen having a heated conversation in the garage afterwards.`, `${k} threw his gloves down in the garage, and nobody had to ask what he thought.`, `${k}'s body language said everything about how he saw the incident.`],
      sorry: [`${k} sought out ${o} afterwards and the two spoke for several minutes.`, `${k} accepted the blame and went to speak to the other garage.`],
      praise: [`${k} was quick to acknowledge ${o}'s drive.`, `${k} shook ${o}'s hand in parc ferme.`],
      blame: [`${k} was unhappy with the strategy and made that known to the pit wall.`, `${k} could be heard questioning the call on the radio.`],
      calm: [`${k} stayed calm, saying the car had more to give.`, `${k} brushed it off and turned to the next race.`],
    };
    return pk(r, `n:${mood}`, N[mood] || N.calm);
  };
  // an official speaks (only quoted when the team is made up)
  const official = (r, t, role, mood) => {
    const s = S[t.id] || staff(t); const who = role === 'tp' ? s.tp : role === 'td' ? s.td : s.ceo; const title = role === 'tp' ? 'team principal' : role === 'td' ? 'technical director' : 'CEO';
    const Q = {
      angry: [`"This is unacceptable and I will not hide it," said ${t.name} ${title} ${who}.`, `"We will have a difficult conversation on Monday morning," warned ${who}, the ${t.name} ${title}.`],
      backing: [`"We have the right people and the right car. The results will come," insisted ${t.name} ${title} ${who}.`, `"I back my drivers one hundred percent," said ${who}.`],
      proud: [`"Everybody at the factory earned this today," said ${t.name} ${title} ${who}.`, `"Eighteen months of work in one afternoon," ${who} smiled.`],
      rules: [`"The regulations punish the teams that innovate, and somebody should say it," said ${t.name} ${title} ${who}.`, `"If the stewards want consistency they should start by showing some," ${who} said.`],
    };
    const N = {
      angry: [`${t.name}'s ${title} did not hide his disappointment.`, `Inside ${t.name} the mood was grim, and the ${title} left no doubt about that.`],
      backing: [`${t.name} publicly backed both drivers.`, `The ${title} at ${t.name} said the team still believed in the project.`],
      proud: [`The mood at ${t.name} was one of quiet pride.`, `${t.name} celebrated a result the whole factory had worked for.`],
      rules: [`${t.name} used the moment to question how the rules are being applied.`, `The ${title} at ${t.name} made clear the team would raise the matter with the governing body.`],
    };
    return s.fict ? pk(r, `o:${mood}`, Q[mood]) : pk(r, `on:${mood}`, N[mood]);
  };

  // ----- standings after each race, from the results themselves (needed to know when a title was decided)
  const table = (k) => { const dp = {}, tp = {}; races.slice(0, k).forEach((rc) => { ['Sprint', 'Race'].forEach((ses) => (v.results?.[rc.id]?.[ses] || []).forEach((x) => { const d = D(x.driverId); dp[x.driverId] = (dp[x.driverId] || 0) + (x.points || 0); if (d) tp[d.teamId] = (tp[d.teamId] || 0) + (x.points || 0); })); });
    return { d: Object.entries(dp).sort((a, b) => b[1] - a[1]), t: Object.entries(tp).sort((a, b) => b[1] - a[1]) }; };
  const leftPts = (k, teams) => races.slice(k).reduce((s, rc) => s + (teams ? 43 : 25) + (rc.sprint ? (teams ? 15 : 8) : 0), 0);
  let clinchD = null, clinchT = null;
  for (let k = 1; k <= done.length; k++) { const tb = table(k); if (!clinchD && tb.d[1] && tb.d[0][1] - tb.d[1][1] > leftPts(k)) clinchD = { k, id: tb.d[0][0], left: total - k, runner: tb.d[1][0] }; if (!clinchT && tb.t[1] && tb.t[0][1] - tb.t[1][1] > leftPts(k, true)) clinchT = { k, id: tb.t[0][0], left: total - k }; }
  const before = (k) => table(k - 1);

  // ===================================================================== season preview and winter
  if (!done.length) {
    const top = [...v.teams].sort((a, b) => (b.car || 0) - (a.car || 0)); const best = [...v.drivers].sort((a, b) => ovr(b) - ovr(a)); const r = rng(`${f.id}:${n}:prev`);
    const fresh = v.drivers.filter((d) => d.from);
    if (top[0]) {
      push({ id: 'prev:main', kind: 'Preview', order: 90, kicker: `SEASON ${n} PREVIEW`, title: pk(r, 'pv', [`${top[0].name} start as the team to beat`, `Who has the edge? The signs point to ${top[0].name}`, `Season ${n}: ${top[0].name} look quickest, but testing never tells the whole story`]), ...tSub(top[0]),
        body: [
          `${total} races, ${v.drivers.length} drivers and ${v.teams.length} teams: season ${n} begins${next ? ` at the ${next.name}` : ''}, and the garages have spent the winter hiding what they have learned.`,
          `Our numbers put ${top[0].name} on top for raw car speed, ahead of ${top[1]?.name || 'the rest'}${top[2] ? ` and ${top[2].name}` : ''}. ${S[top[0].id].fict ? `"We are not favourites until we say we are," ${S[top[0].id].tp}, the team principal, told reporters, "and I am not saying it."` : `${top[0].name}'s team principal refused to be drawn on whether they are favourites.`}`,
          `Not every team is looking up. ${top[top.length - 1].name} come in with the slowest car on the grid and a long list of upgrades planned for the first flyaway races. ${S[top[top.length - 1].id].fict ? `"We know where we are. We also know how fast we can develop," said technical director ${S[top[top.length - 1].id].td}.` : 'Insiders say a big development push is already planned.'}`,
          `For the title the names mentioned most are ${best.slice(0, 3).map(sn).join(', ')}. ${fresh.length ? `And among the ${fresh.length} ${pl(fresh.length, 'newcomer')} on the grid, watch ${sn(fresh.sort((a, b) => ovr(b) - ovr(a))[0])}.` : 'The grid is settled, which usually helps the established order.'}`,
        ] });
      push({ id: 'prev:regs', kind: 'Rules', order: 85, kicker: 'REGULATIONS', title: pk(r, 'rg', ['The rule changes that could decide the season', 'Paddock split over this year\'s regulations', 'Rules, loopholes and a lot of lawyers: what changed for the new season']), ...tSub(top[Math.min(1, top.length - 1)]),
        body: [
          `Regulations are never far from the headlines in the paddock, and this winter has been no exception. Teams disagree about how power-unit energy should be deployed, how much of the budget cap goes where, and how strictly track limits will be policed.`,
          `The big teams say complexity is the enemy; the smaller ones say the rules are the only reason they can compete at all. ${S[top[0].id].fict ? `"Nobody is happy with all of it, which probably means it is balanced," said ${S[top[0].id].tp}.` : 'Nobody is entirely happy, which some read as a sign it is balanced.'}`,
          `The first few races will show who read the rulebook best. Expect protests, clarifications, and at least one team claiming it was misunderstood.`,
        ] });
      push({ id: 'prev:test', kind: 'Testing', order: 80, kicker: 'PRE-SEASON TESTING', title: pk(r, 'ts', ['Testing: fast times, slow answers', 'Who sandbagged? Reading the pre-season times', 'Winter testing ends with more questions than answers']), ...tSub(top[1] || top[0]),
        body: [
          `Three days of running are over and the picture is murky. ${top[1]?.name || top[0].name} set the headline lap on the softest tyres, ${top[0].name} logged the most laps, and ${top[Math.floor(top.length / 2)]?.name} spent a worrying amount of time in the garage.`,
          `Long-run pace is the number engineers trust. On that measure ${top[0].name} look strong, with ${top[1]?.name || top[0].name} close behind. ${pk(r, 'tt', ['Nobody believes a team ever shows its full pace in testing.', 'Fuel loads are guesses and engine modes are secrets, so treat every time with suspicion.', 'Weather also played its part: one day was cold and wet, which blurred comparisons.'])}`,
          `All will be clearer after qualifying at ${next?.name || 'the opening race'}.`,
        ] });
    }
    best.slice(0, 2).forEach((d, i) => { const t = T(d.teamId); push({ id: `prev:d:${d.id}`, kind: 'Preview', order: 70 - i, kicker: 'DRIVER TO WATCH', title: pk(r, 'pd', [`${sn(d)} heads into season ${n} as a title favourite`, `Can ${sn(d)} turn promise into points this year?`]), ...dSub(d),
      body: [`${d.name} is rated ${ovr(d)}, the ${i ? 'second' : 'highest'} in the field, and drives for ${t?.name || 'his team'}${d.nat ? ` under the flag of ${d.nat}` : ''}. ${say(r, d, 'calm', { team: t?.name })}`, `The car underneath him is ${t?.car >= 80 ? 'among the quickest' : t?.car >= 65 ? 'a solid midfield-to-front package' : 'a slower one, so he will need to drag it up the order'}. ${ovr(d) > (t?.car || 0) + 4 ? 'That makes him one to look at when the silly season starts.' : 'Driver and car seem well matched.'}`] }); });
    (f.news || []).filter((x) => x.kind === 'move' || x.kind === 'retire' || x.kind === 'rookie').forEach((x, i) => {
      const w = x.who; if (!w) return; const dd = D(w.id) || { ...w, teamId: x.to }; const to = T(x.to), from = T(x.from); const r2 = rng(`${f.id}:${n}:tf:${w.id}`); const big = (w.ovr || 0) >= 76 || (x.kind === 'move' && to && stm.findIndex((t) => t.id === to.id) < 3);
      if (x.kind === 'move' && (big || i < 3)) push({ id: `tf:${w.id}`, kind: 'Transfers', order: 95 - i, kicker: 'SILLY SEASON', title: big ? pk(r2, 'tf', [`${w.last} is on the move: ${to?.name} sign one of the grid's best`, `Done deal: ${w.name} joins ${to?.name}`, `${from?.name} lose ${w.last} to ${to?.name} in the biggest transfer of the winter`]) : `${w.last} switches from ${from?.name || 'his old team'} to ${to?.name}`, ...(to ? { color: to.color } : {}), subject: { type: 'driver', name: w.name, number: w.number, nat: w.nat, team: to?.name }, stats: [['RATING', String(w.ovr)], ['AGE', String(w.age)], ['TEAM', to?.name || '–'], ['FROM', from?.name || '–']],
        body: [`${w.name} (${w.age}, rated ${w.ovr}) will race for ${to?.name} this season after leaving ${from?.name || 'his previous team'}.${x.with ? ` ${x.with.name} goes the other way in a swap that pleases nobody on both sides entirely.` : ''}`,
          big ? `It is a move that shifts the balance of power. ${to?.name} get a driver who has shown he can win, while ${from?.name || 'his old team'} must now rebuild around someone else.` : `It is a quieter piece of business, but one that matters to a team looking for points.`,
          real(w) ? `Neither side described the details, and the move is the type that will be judged in the first six races.` : `${S[x.to]?.fict ? `"${w.last} brings exactly what we were missing," said ${S[x.to].tp}, the team principal. "${w.age < 25 ? 'He is young and hungry.' : 'He has been there before.'}"` : ''}`,
          to && from ? `${to.name} (car rating ${Math.round(to.car || 0)}) and ${from.name} (${Math.round(from.car || 0)}) will watch the early results closely.` : ''].filter(Boolean) });
      else if (x.kind === 'retire') push({ id: `rt:${w.id}`, kind: 'Farewell', order: 75 - i, kicker: 'END OF AN ERA', title: `${w.name} retires at ${w.age}`, subject: { type: 'driver', name: w.name, number: w.number, nat: w.nat, team: from?.name }, color: from?.color, stats: [['AGE', String(w.age)], ['RATING', String(w.ovr)], ['TITLES', String(careerOf(f, w.id).titles)], ['WINS', String(careerOf(f, w.id).wins)]],
        body: [`${w.name} has called time on his career at ${w.age}${from ? ` after his final season with ${from.name}` : ''}. ${careerOf(f, w.id).wins ? `${careerOf(f, w.id).wins} ${pl(careerOf(f, w.id).wins, 'win')} and ${careerOf(f, w.id).podiums} podiums in this fantasy are what he leaves behind.` : 'The statistics may not be spectacular, but the garage will miss him.'}`, !real(w) ? `"I gave it everything for as long as it was fun," said ${w.last}. "Now I want to see what life looks like on a Sunday."` : `The paddock paid its respects as the news broke.`] });
      else if (x.kind === 'rookie' && i < 8) push({ id: `rk:${w.id}`, kind: 'New faces', order: 60 - i, kicker: 'ROOKIE', title: `${w.name} gets his chance at ${to?.name}`, subject: { type: 'driver', name: w.name, number: w.number, nat: w.nat, team: to?.name }, color: to?.color, stats: [['AGE', String(w.age)], ['RATING', String(w.ovr)], ['POTENTIAL', String(Math.round(w.pot || 0))], ['FROM', String(x.origin || 'Juniors')]],
        body: [`${w.name} (${w.age}) arrives from ${x.origin === 'Academy' ? 'an academy programme' : x.origin || 'the junior ranks'} and takes a seat at ${to?.name}${w.nat ? `, bringing a lot of hope from ${w.nat}` : ''}.`, `His rating of ${w.ovr} is ${w.ovr >= 68 ? 'good for a newcomer' : 'modest'}, but the potential figure of ${Math.round(w.pot || 0)} is what the team is buying.`, real(w) ? '' : `"I am here to learn and not to embarrass myself," ${w.last} laughed. "In that order."`].filter(Boolean) });
    });
  }

  // ===================================================================== race by race (latest weeks only)
  done.slice(-6).forEach((race) => {
    const idx = races.indexOf(race) + 1; const res = v.results[race.id]; const rows = res.Race; const quali = res.Qualifying || []; const r = rng(`${f.id}:${n}:${race.id}`);
    const w = rows[0]; const wd = D(w.driverId); if (!wd) return; const wt = T(wd.teamId);
    const gridOf = (id) => { const i = quali.findIndex((x) => x.driverId === id); return i >= 0 ? i + 1 : null; };
    const fin = rows.filter((x) => x.status === 'OK'), dnf = rows.filter((x) => x.status !== 'OK'); const grid = gridOf(w.driverId); const pole = D(quali[0]?.driverId);
    const second = D(rows[1]?.driverId), third = D(rows[2]?.driverId); const stopsOf = (x) => x?.stops ?? 0;
    const movers = fin.map((x, i) => ({ x, gain: (gridOf(x.driverId) || i + 1) - (i + 1) })).sort((a, b) => b.gain - a.gain); const mv = movers[0]?.gain >= 5 ? movers[0] : null; const md = mv && D(mv.x.driverId);
    const prior = before(idx); const leadBefore = prior.d[0]; const tb = table(idx);
    const tbRow = (id, tab) => (tab || tb).d.findIndex((x) => x[0] === id) + 1;
    const wonCount = rows[0] && races.slice(0, idx).filter((rc) => v.results[rc.id]?.Race?.[0]?.driverId === wd.id).length;
    const podBefore = races.slice(0, idx - 1).some((rc) => (v.results[rc.id]?.Race || []).slice(0, 3).some((x) => x.driverId === wd.id));

    // ---- the race report
    const para = [];
    para.push(`${wd.name} won the ${race.name}, round ${idx} of ${total}, for ${wt?.name || 'his team'}${grid ? ` after starting ${grid === 1 ? 'from pole' : `from ${ord(grid)}`}` : ''}. ${second && third ? `${second.name} took second ahead of ${third.name}.` : ''}`.trim());
    if (grid && grid > 3) para.push(`The recovery came on ${pk(r, 'rc', ['a brave opening lap', 'a strategy that worked perfectly', 'late-race pace nobody else could match', 'a clever undercut at the first stop'])}, and from ${ord(grid)} on the grid it stands out as one of the drives of the year.`);
    else if (pole && pole.id !== wd.id) para.push(`${pole.name} had started on pole for ${T(pole.teamId)?.name || 'his team'} but could not keep the lead, finishing ${ord(rows.findIndex((x) => x.driverId === pole.id) + 1)}${dnf.some((x) => x.driverId === pole.id) ? ' after his race ended early' : ''}.`);
    else para.push(`He controlled the race from the front. ${pk(r, 'cl', ['Clean air did most of the work.', 'The gap was never in doubt.', 'Behind him the fight for the podium was far more interesting.'])}`);
    if (stopsOf(w) !== stopsOf(rows[1])) para.push(`${wd.last} made ${stopsOf(w)} ${pl(stopsOf(w), 'stop')} against ${stopsOf(rows[1])} for the runner-up, ${stopsOf(w) < stopsOf(rows[1]) ? 'a decision that paid off in the closing laps' : 'an aggressive plan that kept the tyres fresher at the end'}.`);
    if (mv && md && md.id !== wd.id) para.push(`Best of the rest from the back was ${md.name}: ${ord(gridOf(md.id))} to ${ord(fin.indexOf(mv.x) + 1)}.`);
    para.push(say(r, wd, 'win', { team: wt?.name }) + (second && real(wd) === false ? ` ${say(r, second, 'praise', { other: wd })}` : ''));
    if (wt) para.push(official(r, wt, 'tp', 'proud'));
    const leadNow = tb.d[0]; const ld = leadNow && D(leadNow[0]); if (ld && tb.d[1]) para.push(`${ld.name} ${leadNow[0] === leadBefore?.[0] ? 'stays top' : 'takes over at the top'} of the standings with ${leadNow[1]} points, ${leadNow[1] - tb.d[1][1]} ${pl(leadNow[1] - tb.d[1][1], 'point')} clear. ${next && idx === done.length ? `Next: the ${next.name}.` : ''}`);
    push({ id: `rep:${race.id}`, kind: 'Race report', order: 100 + idx * 10, kicker: `ROUND ${idx} · ${race.name.toUpperCase()}`, title: grid && grid > 4 ? pk(r, 'rt', [`${sn(wd)} wins from ${ord(grid)}: "the drive of the season"`, `From ${ord(grid)} to first: ${sn(wd)} stuns ${place(race)}`]) : grid === 1 ? pk(r, 'rp', [`${sn(wd)} converts pole into victory in ${place(race)}`, `Lights to flag: ${sn(wd)} wins in ${place(race)}`, `${sn(wd)} untouchable at ${place(race)}`]) : pk(r, 'rw', [`${sn(wd)} wins a tense ${place(race)} Grand Prix`, `${wt?.name || sn(wd)} celebrate in ${place(race)}`, `${sn(wd)} takes ${place(race)} after a late fight`]), ...dSub(wd), body: para });

    // ---- maiden win / podium
    if (!wonCount || wonCount === 1) if (wonCount === 1 && !races.slice(0, idx - 1).some((rc) => v.results[rc.id]?.Race?.[0]?.driverId === wd.id)) push({ id: `maiden:${wd.id}`, kind: 'Milestone', order: 105 + idx * 10, kicker: 'FIRST WIN', title: pk(r, 'mw', [`First win for ${sn(wd)}!`, `${sn(wd)} finally breaks through`, `A maiden victory for ${wd.name}`]), ...dSub(wd),
      body: [`${wd.name} has won a race for the first time, taking the ${race.name} for ${wt?.name || 'his team'}.`, `He had ${podBefore ? 'been close before' : 'not even stood on a podium before today'}${career(wd).races ? ` in ${career(wd).races} previous ${pl(career(wd).races, 'start')}` : ''}. ${say(r, wd, 'win', { team: wt?.name })}`, wt ? official(r, wt, 'tp', 'proud') : ''].filter(Boolean) });

    // ---- contact between named drivers
    const done2 = new Set();
    dnf.filter((x) => x.with && x.crash).forEach((x) => {
      const key = [x.driverId, x.with].sort().join('|'); if (done2.has(key)) return; done2.add(key);
      const a = D(x.driverId), b = D(x.with); if (!a || !b) return; const other = rows.find((y) => y.driverId === x.with); const bothOut = other && other.status !== 'OK'; const atFault = x.fault ? a : b, victim = x.fault ? b : a; const ta = T(a.teamId), tbm = T(b.teamId); const same = a.teamId === b.teamId;
      const meet = races.slice(0, idx).filter((rc) => (v.results[rc.id]?.Race || []).some((y) => y.with === x.driverId && y.driverId === x.with) || (v.results[rc.id]?.Race || []).some((y) => y.with === x.with && y.driverId === x.driverId)).length; const para2 = [];
      para2.push(`${a.name} and ${b.name} came together on lap ${x.lap} of the ${race.name}${gridOf(a.id) ? `, ${ord(gridOf(a.id))} and ${ord(gridOf(b.id))} on the grid at the start` : ''}. ${bothOut ? 'Both cars were out on the spot.' : `${a.id === victim.id ? a.last : b.last} limped on with damage and lost several positions.`}`);
      para2.push(`The stewards looked at it and decided ${atFault.name} was mainly to blame${x.penNote === 'grid' ? ', and a grid penalty at the next race is expected' : x.penNote === 'licence' ? ', adding a penalty point to his licence' : ', though no further action was taken'}. ${same ? `It happened between team-mates at ${ta?.name}, which is the worst kind of crash for a team to have.` : `It cost ${victim.name}'s ${T(victim.teamId)?.name || 'team'} a certain result.`}`);
      para2.push(say(r, victim, 'fury', { other: atFault })); para2.push(say(r, atFault, Math.random() < 0.5 ? 'sorry' : 'calm', { other: victim }));
      if (same && ta) para2.push(official(r, ta, 'tp', 'angry'));
      if (meet >= 2) para2.push(`It is not the first time: these two have now made contact ${meet} times this season, and the paddock is starting to talk about bad blood.`);
      push({ id: `inc:${race.id}:${key}`, kind: meet >= 2 ? 'Feud' : 'Incident', order: 104 + idx * 10, kicker: `${race.name.toUpperCase()}`, title: same ? pk(r, 'ti', [`Team-mates collide: ${sn(a)} and ${sn(b)} take each other out`, `Garage in uproar after ${sn(a)} and ${sn(b)} clash`]) : bothOut ? pk(r, 'tc', [`${sn(atFault)} and ${sn(victim)} collide: both out`, `Contact ends the races of ${sn(a)} and ${sn(b)}`]) : pk(r, 'th', [`${sn(atFault)} takes out ${sn(victim)} in ${place(race)}`, `${sn(victim)} wrecked by ${sn(atFault)}`]), ...dSub(atFault), body: para2 });
    });
    rows.filter((x) => x.hitBy).forEach((x) => { // hit by someone who did not finish
      const a = D(x.hitBy), b = D(x.driverId); if (!a || !b || done2.has([a.id, b.id].sort().join('|'))) return; const rr = rng(`${race.id}:hit:${b.id}`);
      push({ id: `hit:${race.id}:${b.id}`, kind: 'Incident', order: 103 + idx * 10, kicker: place(race).toUpperCase(), title: `${sn(b)} survives contact with ${sn(a)} to finish ${ord(rows.indexOf(x) + 1)}`, ...dSub(b),
        body: [`${a.name} collided with ${b.name} early on and was out on the spot. ${b.last} carried damage and lost around ${Math.round(8 + rr() * 15)} seconds before recovering to ${ord(rows.indexOf(x) + 1)}.`, say(rr, b, 'fury', { other: a }), `The stewards blamed ${a.last}${T(a.teamId) ? `, and ${T(a.teamId).name} now face an awkward debrief` : ''}.`] }); });
    // a contender's lone crash or breakdown
    dnf.filter((x) => !x.with).sort((a, b) => (gridOf(a.driverId) || 99) - (gridOf(b.driverId) || 99)).slice(0, 1).forEach((x) => {
      const a = D(x.driverId), t = a && T(a.teamId); if (!a || (gridOf(a.id) || 99) > 8) return; const mech = !x.crash; const rr = rng(`${race.id}:lone:${a.id}`);
      push({ id: `dnf:${race.id}:${a.id}`, kind: mech ? 'Heartbreak' : 'Incident', order: 102 + idx * 10, kicker: place(race).toUpperCase(), title: mech ? pk(rr, 'tm', [`${sn(a)} hit by ${String(x.reason).toLowerCase()} failure`, `Heartbreak for ${sn(a)}: ${String(x.reason).toLowerCase()} trouble ends his race`]) : pk(rr, 'tl', [`${sn(a)} crashes out of the ${place(race)} Grand Prix`, `${sn(a)} in the barriers on lap ${x.lap}`]), ...dSub(a),
        body: [mech ? `${a.name} was in the hunt from ${ord(gridOf(a.id))} on the grid when ${String(x.reason).toLowerCase()} problems forced him to stop on lap ${x.lap}.` : `${a.name} lost the car on lap ${x.lap} having started ${ord(gridOf(a.id))}, and the race was over.`, mech ? `The team, ${t?.name || ''}, will have to look hard at what went wrong. ${S[t?.id]?.fict ? `"It is the third time we have asked the factory for answers," said technical director ${S[t.id].td}.` : t ? official(rr, t, 'td', 'angry') : ''}` : say(rr, a, 'sorry'), mech ? say(rr, a, 'gutted') : say(rr, a, 'gutted')].filter(Boolean) });
    });
    // a penalty
    fin.filter((x) => x.pen > 0).slice(0, 1).forEach((x) => { const a = D(x.driverId); if (!a) return; const rr = rng(`${race.id}:pen:${a.id}`);
      push({ id: `pen:${race.id}:${a.id}`, kind: 'Stewards', order: 98 + idx * 10, kicker: 'STEWARDS', title: `${sn(a)} loses time to a ${x.pen}-second penalty in ${place(race)}`, ...dSub(a),
        body: [`${a.name} was handed a ${x.pen}-second penalty for ${pk(rr, 'pn', ['an unsafe release in the pits', 'exceeding track limits repeatedly', 'a pit-lane speeding offence', 'forcing another driver off the track'])}, and classified ${ord(rows.indexOf(x) + 1)}.`, T(a.teamId) ? `${T(a.teamId).name} are not likely to let it rest. ${official(rr, T(a.teamId), 'tp', 'rules')}` : '', say(rr, a, 'blame')].filter(Boolean) }); });
    // weather and safety car
    if (w.wet || w.sc) { const rr = rng(`${race.id}:wx`); push({ id: `wx:${race.id}`, kind: 'Race analysis', order: 97 + idx * 10, kicker: place(race).toUpperCase(), title: w.wet ? pk(rr, 'tw', [`Rain turns ${place(race)} into a lottery`, `Wet race in ${place(race)}: who coped, who did not`]) : pk(rr, 'ts', [`Safety car reshuffles ${place(race)}`, `The safety car decides the ${place(race)} Grand Prix`]), ...dSub(wd),
      body: [w.wet ? `Rain changed everything at the ${race.name}. The extra stops and the lower grip rewarded the drivers who could feel the car, and ${wd.name} was best of them.` : `The safety car period bunched the field and wiped out advantages the leaders had built.`, `${wd.last} won ${w.wet ? 'in the wet' : 'after the restart'}, while ${dnf.length} ${pl(dnf.length, 'driver')} ${dnf.length === 1 ? 'did' : 'did'} not finish. ${say(rr, wd, 'calm')}`, `Teams will study the strategy decisions for weeks: ${stopsOf(w)} ${pl(stopsOf(w), 'stop')} for the winner, and not everyone got the call right.`] }); }
    // when a team has a bad day while being strong: blame
    const strong = [...v.teams].sort((a, b) => (b.car || 0) - (a.car || 0)).slice(0, 3).filter((t) => rows.filter((x) => D(x.driverId)?.teamId === t.id).every((x) => x.pos > 8 || x.status !== 'OK'));
    strong.slice(0, 1).forEach((t) => { const rr = rng(`${race.id}:blame:${t.id}`); const ds = rows.filter((x) => D(x.driverId)?.teamId === t.id); const mech = ds.some((x) => x.status !== 'OK' && !x.crash);
      push({ id: `blame:${race.id}:${t.id}`, kind: 'Analysis', order: 96 + idx * 10, kicker: t.name.toUpperCase(), title: pk(rr, 'bl', [`Questions at ${t.name} after a miserable ${place(race)}`, `${t.name} in crisis? Pressure builds after ${place(race)}`, `Who is to blame at ${t.name}?`]), ...tSub(t),
        body: [`A team with a car rated ${Math.round(t.car || 0)} should not be leaving ${place(race)} with ${ds.map((x) => `${sn(D(x.driverId))} ${x.status === 'OK' ? ord(x.pos) : 'DNF'}`).join(' and ')}, and the paddock has noticed.`, mech ? `Reliability is the obvious problem. ${official(rr, t, 'td', 'angry')}` : `The pit wall's decisions are under the microscope. ${official(rr, t, 'tp', 'backing')}`, `${ds[0] ? say(rr, D(ds[0].driverId), 'blame') : ''}`, `With ${total - idx} ${pl(total - idx, 'race')} left, ${t.name} need answers fast.`].filter(Boolean) }); });
  });

  // ===================================================================== league stories
  const lastK = done.length;
  if (lastK >= 3 && sd[1]) { // title fight
    const r = rng(`${f.id}:${n}:fight:${Math.floor(lastK / 2)}`); const a = D(sd[0].id), b = D(sd[1].id); const gap = sd[0].points - sd[1].points; const left = total - lastK;
    if (a && b && !(complete && clinchD)) push({ id: `fight:${Math.floor(lastK / 2)}`, kind: 'Analysis', order: 99 + lastK * 10 - 3, kicker: 'THE TITLE FIGHT', title: gap <= 12 ? pk(r, 'f1', [`${sn(a)} and ${sn(b)}: ${gap} points between two title rivals`, `Title fight tightens: ${sn(a)} ${gap} ahead of ${sn(b)}`]) : pk(r, 'f2', [`${sn(a)} opens a ${gap}-point gap`, `Is it over? ${sn(a)} builds a ${gap}-point lead`]), ...dSub(a),
      body: [`After ${lastK} ${pl(lastK, 'round')} ${a.name} leads on ${sd[0].points}, with ${b.name} on ${sd[1].points}${sd[2] ? ` and ${sd[2].name} third on ${sd[2].points}` : ''}.`, left > 0 ? `${left} ${left === 1 ? 'race remains' : 'races remain'}, and ${gap > leftPts(lastK) ? 'the maths already say it is over.' : gap > leftPts(lastK) / 2 ? 'a collapse would be needed.' : 'nothing is decided.'}` : '', `${a.last} brings ${sd[0].wins} ${pl(sd[0].wins, 'win')}, ${b.last} ${sd[1].wins}. ${T(a.teamId) && T(b.teamId) && a.teamId !== b.teamId ? `It is as much ${T(a.teamId).name} against ${T(b.teamId).name} as driver against driver.` : T(a.teamId) ? `Both drive for ${T(a.teamId).name}, which makes team orders the question nobody wants to answer.` : ''}`, real(a) ? `Neither driver is giving anything away in public.` : say(r, a, 'calm')].filter(Boolean) }); }
  // clinch / champion
  const cd = clinchD && D(clinchD.id);
  if (cd) { const r = rng(`${f.id}:${n}:champ`); const c = careerOf(f, cd.id); const tt = T(cd.teamId); const row = dRow(cd.id); const run = D(clinchD.runner); const sealed = clinchD.left;
    push({ id: 'champ', kind: 'Champion', order: 120 + clinchD.k * 10 + (complete ? 1000 : 0), kicker: `SEASON ${n}`, title: sealed > 0 ? pk(r, 'ch', [`${sn(cd)} is the champion with ${sealed} ${pl(sealed, 'race')} to spare`, `Crowned early: ${cd.name} wins the title`]) : pk(r, 'ck', [`${cd.name} is world champion!`, `${sn(cd)} takes the title in the final race`, `Champion: ${cd.name} seals season ${n}`]), ...dSub(cd),
      body: [`${cd.name} has won the drivers' championship for ${tt?.name || 'his team'}${sealed > 0 ? `, doing it with ${sealed} ${pl(sealed, 'round')} still to run` : ' in the final round'}. ${row ? `He finished${complete ? '' : ' (so far)'} with ${row.points} points, ${row.wins} ${pl(row.wins, 'win')} and ${row.podiums} podiums.` : ''}`, c.titles > 1 ? `It is title number ${c.titles} for him in this fantasy, putting him among the great names of the series.` : `It is his first title.`, run ? `${run.name} was the closest challenger and had to settle for the runner-up spot${run.teamId === cd.teamId ? ', and the garage had to live with that all year' : ''}.` : '', say(r, cd, 'win', { team: tt?.name }), tt ? official(r, tt, 'ceo', 'proud') : '', `Every driver in the field gave him the same message at the end: congratulations, and see you next year.`].filter(Boolean) });
    if (!complete) push({ id: 'champ-party', kind: 'Champion', order: 119 + clinchD.k * 10, kicker: 'CELEBRATION', title: `${tt?.name || sn(cd)} party into the night`, ...dSub(cd), body: [`The title celebrations ran late into the night at ${tt?.name || 'the hotel'}, with mechanics, engineers and drivers all in the same photo.`, `Rivals were gracious in public and less so in private; the garages know they now have ${total - done.length} ${pl(total - done.length, 'race')} to make a point.`] });
  }
  const ct = clinchT && T(clinchT.id);
  if (ct) { const r = rng(`${f.id}:${n}:tchamp`); const row = tRow(ct.id); const [d1, d2] = sd.filter((x) => x.teamId === ct.id).map((x) => D(x.id));
    push({ id: 'tchamp', kind: 'Champion', order: 118 + clinchT.k * 10 + (complete ? 1000 : 0), kicker: 'CONSTRUCTORS', title: pk(r, 'tc', [`${ct.name} win the constructors' championship`, `${ct.name} take the teams' title${clinchT.left ? ` with ${clinchT.left} to spare` : ''}`]), ...tSub(ct),
      body: [`${ct.name} have clinched the constructors' title${row ? ` with ${row.points} points and ${row.wins} ${pl(row.wins, 'win')}` : ''}${clinchT.left ? `, ${clinchT.left} ${pl(clinchT.left, 'race')} before the season ends` : ''}.`, d1 && d2 ? `${d1.name} and ${d2.name} did the scoring, and the factory did the rest.` : '', official(r, ct, 'ceo', 'proud'), official(r, ct, 'td', 'backing')].filter(Boolean) }); }
  if (complete) { // season review
    const r = rng(`${f.id}:${n}:review`); const winners = new Set(done.map((rc) => v.results[rc.id].Race[0].driverId)); const dnfs = done.reduce((s, rc) => s + v.results[rc.id].Race.filter((x) => x.status !== 'OK').length, 0); const best = [...stm].sort((a, b) => b.points / Math.max(1, (v.teams.find((t) => t.id === b.id)?.car || 1)) - a.points / Math.max(1, (v.teams.find((t) => t.id === a.id)?.car || 1)))[0]; const bt = best && T(best.id);
    push({ id: 'review', kind: 'Season review', order: 1100, kicker: `SEASON ${n} REVIEW`, title: pk(r, 'sr', [`Season ${n} in numbers`, `Looking back on season ${n}: winners, flops and the moments that mattered`]), ...(sd[0] ? dSub(D(sd[0].id)) : {}),
      body: [`${total} races, ${winners.size} different ${pl(winners.size, 'winner')} and ${dnfs} retirements. ${winners.size >= 6 ? 'A competitive year with plenty of surprises.' : winners.size <= 2 ? 'A dominant year where few others got a look in.' : 'A season shaped by a small group at the front.'}`, bt ? `The biggest overperformers were ${bt.name}, who scored far more points than their car's rating suggested.` : '', `${sd[0] ? `${sd[0].name} deserves the headlines, but ${sd[1]?.name || 'the rest'} and ${sd[2]?.name || ''} made it a contest for most of the year.` : ''}`, `On to the winter: contracts, rule changes and a lot of unfinished business.`].filter(Boolean) }); }

  // ---- midfield, streaks, milestones, and random paddock pieces for everyone (rotating with the race number)
  if (lastK >= 2) {
    const r = rng(`${f.id}:${n}:mid:${Math.floor(lastK / 2)}`); const mid = stm.slice(3, 7); if (mid.length >= 3) { const t0 = T(mid[0].id); push({ id: `mid:${Math.floor(lastK / 2)}`, kind: 'Midfield', order: 61 + lastK * 10, kicker: 'THE MIDFIELD BATTLE', title: pk(r, 'md', [`Four teams, one slot: the fight for fourth`, `The midfield is a knife-fight: ${mid.map((x) => x.points).join(', ')} points`]), ...(t0 ? tSub(t0) : {}),
      body: [`Behind the top three the order is tight: ${mid.map((x) => `${x.name} (${x.points})`).join(', ')}.`, `Fourth place in the constructors' standings is worth real money, and every team in this group knows it. ${pk(r, 'mm', ['Strategy is the great leveller here.', 'A single safety car can swing three places.', 'The smallest upgrade can mean the most.'])}`, mid[0] && S[mid[0].id]?.fict ? `"We are not racing the leaders anymore. We are racing them," said ${S[mid[0].id].tp}, nodding toward the next garage.` : ''].filter(Boolean) }); } }
  // hot streak / slump over the last three races
  if (lastK >= 4 && sd.length > 4) { const recent = races.slice(-3).filter((rc) => v.results[rc.id]?.Race); const sc = {}; recent.forEach((rc) => v.results[rc.id].Race.forEach((x) => { sc[x.driverId] = (sc[x.driverId] || 0) + (x.points || 0); }));
    const arr = Object.entries(sc).sort((a, b) => b[1] - a[1]); const hot = D(arr[0]?.[0]); const r = rng(`${f.id}:${n}:hot:${lastK}`);
    if (hot && arr[0][1] > 0) push({ id: `hot:${lastK}`, kind: 'Form', order: 59 + lastK * 10, kicker: 'IN FORM', title: pk(r, 'ho', [`${sn(hot)}: ${arr[0][1]} points in three races, the hottest driver in the field`, `Nobody is faster than ${sn(hot)} right now`]), ...dSub(hot),
      body: [`${hot.name} has scored ${arr[0][1]} points over the last three rounds, more than anybody else.`, T(hot.teamId) ? `${T(hot.teamId).name} credit a car upgrade and a better rhythm in qualifying. ${official(r, T(hot.teamId), 'tp', 'proud')}` : '', say(r, hot, 'calm')].filter(Boolean) }); }
  // random paddock features, two a race, about different people each time
  const feats = []; const rf = rng(`${f.id}:${n}:feat:${lastK}`);
  const randD = () => v.drivers[Math.floor(rf() * v.drivers.length)]; const randT = () => v.teams[Math.floor(rf() * v.teams.length)];
  const topics = [
    () => { const d = randD(); const t = T(d.teamId); if (!d || !t) return; return { id: `ft:eng:${d.id}:${lastK}`, kind: 'Paddock', kicker: 'BEHIND THE VISOR', title: pk(rf, 'e1', [`${sn(d)} and the engineer who knows him best`, `The voice on ${sn(d)}'s radio`]), ...dSub(d), body: [`Every driver has a person in his ear, and for ${d.name} it is ${S[t.id].fict ? S[t.id].eng : 'his race engineer'}. The two have worked together long enough to finish each other's sentences.`, `On the radio that means short messages: tyre temperatures, gaps, a joke when things are tense. ${say(rf, d, 'calm')}`, `Engineers say what makes the relationship work is honesty, and a driver who can take it.`] }; },
    () => { const t = randT(); if (!t) return; return { id: `ft:up:${t.id}:${lastK}`, kind: 'Technical', kicker: 'DEVELOPMENT', title: pk(rf, 'u1', [`${t.name} bring a big upgrade package`, `Inside ${t.name}'s wind tunnel`, `New floor, new hope for ${t.name}`]), ...tSub(t), body: [`${t.name} will bring a heavily revised car to ${next?.name || 'the next race'}, led by a new floor and a rethought front wing.`, official(rf, t, 'td', 'backing'), `With a car rating of ${Math.round(t.car || 0)} and a development rating of ${TA(t).dev}, expectations are ${TA(t).dev >= 70 ? 'high' : 'cautious'}.`] }; },
    () => { const t = randT(); if (!t) return; return { id: `ft:reg:${t.id}:${lastK}`, kind: 'Rules', kicker: 'REGULATIONS', title: pk(rf, 'r1', [`${t.name} want the rules changed. The others disagree.`, `Budget cap row: ${t.name} speak up`, `Track limits: ${t.name} demand consistency`]), ...tSub(t), body: [`A familiar argument is back in the paddock. ${t.name} say the current rules are unfair on teams in their position, and have written to the governing body.`, official(rf, t, 'tp', 'rules'), `Rival teams were quick to say nothing is wrong with the rules and that the criticism is about results, not regulations. The governing body has promised to review the matter after the next race.`] }; },
    () => { const d = randD(); if (!d || !d.nat) return; const t = T(d.teamId); return { id: `ft:fan:${d.id}:${lastK}`, kind: 'Fans', kicker: String(d.nat).toUpperCase(), title: pk(rf, 'fa', [`${d.nat} turns out for ${sn(d)}`, `${sn(d)} gets a hero's welcome`, `${d.nat} flags everywhere for ${sn(d)}`]), ...dSub(d), body: [`${d.name} has a large following travelling from ${d.nat}, and it showed on the grandstands this weekend: his number ${d.number} on caps, flags and a very loud banner.`, `${dRow(d.id)?.points ? `With ${dRow(d.id).points} points and ${ord(sd.findIndex((x) => x.id === d.id) + 1)} in the standings, the crowd has something to cheer about.` : 'Points have been rare, but the fans have never wavered.'}`, say(rf, d, 'calm', { team: t?.name })] }; },
    () => { const d = randD(); const t = d && T(d.teamId); if (!t) return; const m = v.drivers.find((x) => x.teamId === d.teamId && x.id !== d.id); if (!m) return; return { id: `ft:tm:${d.id}:${lastK}`, kind: 'Inside the team', kicker: t.name.toUpperCase(), title: pk(rf, 'tm', [`${sn(d)} on ${sn(m)}: "he is making me better"`, `Are ${sn(d)} and ${sn(m)} friends? ${t.name} say yes`, `The ${t.name} garage: two drivers, one trophy cabinet`]), ...dSub(d), body: [`${d.name} and ${m.name} share the ${t.name} garage and, by most accounts, a reasonable relationship.`, real(d) ? `The two were seen working together on the simulator this week, and ${t.name} say it has helped them both.` : `"${sn(m)} is quicker than people think. I take it personally," said ${sn(d)}. "But I will say it is fun to race a team-mate who is not afraid of you."`, `${t.name} remain tight-lipped about whether the order between them will be managed if both are in a title fight.`] }; },
    () => { const d = randD(); const t = d && T(d.teamId); if (!t) return; const rk = [...stm].findIndex((x) => x.id === t.id); const o = ovr(d); const gap = (v.teams.findIndex((x) => x.id === t.id)); return { id: `ft:val:${d.id}:${lastK}`, kind: 'Market', kicker: 'DRIVER MARKET', title: pk(rf, 'mk', [`${sn(d)} could be the bargain of the grid`, `Which team wants ${sn(d)} next year?`, `${sn(d)}: the driver every team boss is watching`]), ...dSub(d), body: [`${d.name} is rated ${o} and drives a ${Math.round(t.car || 0)}-rated ${t.name}. ${o >= (t.car || 0) + 5 ? 'That means he is doing more than the car deserves, and the bigger teams know it.' : 'The car and driver appear evenly matched.'}`, `Nothing is confirmed and contracts are decided in the winter. For now ${rk >= 0 ? `${t.name} sit ${ord(rk + 1)} in the constructors'` : 'his team is in the mix'} and ${sn(d)} keeps his head down.`, real(d) ? '' : `"I do not read the rumours," said ${sn(d)}, who reads the rumours.`].filter(Boolean) }; },
  ];
  for (let i = 0, made = 0; i < 12 && made < 3; i++) { const b = topics[Math.floor(rf() * topics.length)](); if (b && !feats.some((x) => x.id === b.id)) { feats.push(b); made++; } }
  feats.forEach((x, i) => push({ order: 50 + lastK * 10 - i, ...x }));
  // outside the race weeks, keep the page from going stale
  if (!feats.length && !out.length) push({ id: 'quiet', kind: 'Paddock', order: 1, kicker: 'QUIET WEEK', title: 'Nothing to report yet', body: ['The season has not started. Run the first race to get the newspaper going.'] });

  function career(d) { return careerOf(f, d.id); }
  const seen = new Set(); return out.filter((a) => (seen.has(a.id) ? false : seen.add(a.id))).sort((a, b) => b.order - a.order);
}
