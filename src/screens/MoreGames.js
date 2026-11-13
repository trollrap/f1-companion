import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Dropdown from '../components/Dropdown';
import { colors, alpha } from '../theme';
import { kvGet, kvSet, seedOf, rngOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { useAsync } from '../hooks/useAsync';
import { driverStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { seasonGrid, localAllDrivers, localCareer, titlesOf, HISTORY_UPTO, historyYears, roundsOf, raceRowsOf } from '../api/history';
import * as hap from '../lib/haptics';
import { CIRCUITS } from '../data/circuits';

const shuffle = (a, r) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
const optStyle = (right, wrong) => ({ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: right ? colors.good : wrong ? colors.red : colors.line, backgroundColor: right ? alpha(colors.good, 0.18) : wrong ? alpha(colors.red, 0.18) : colors.card });

// ---------- Pit stop timer: tap the four lit wheels in order, as fast as you can ----------
export function PitStopScreen() {
  const [phase, setPhase] = useState('idle'); const [seq, setSeq] = useState([]); const [step, setStep] = useState(0); const [pen, setPen] = useState(0); const [time, setTime] = useState(null); const [st, setSt] = useState({ best: null, list: [] }); const [got, setGot] = useState(false);
  const t0 = useRef(0); const tm = useRef(null);
  useEffect(() => { kvGet('pit:v1', { best: null, list: [] }).then(setSt); return () => clearTimeout(tm.current); }, []);
  const start = () => { clearTimeout(tm.current); setGot(false); setTime(null); setPen(0); setStep(0); setSeq(shuffle([0, 1, 2, 3], Math.random)); setPhase('ready'); tm.current = setTimeout(() => { t0.current = Date.now(); setPhase('go'); }, 700 + Math.random() * 1300); };
  const hit = async (w) => {
    if (phase !== 'go') { if (phase === 'ready') { clearTimeout(tm.current); setPhase('early'); hap.bad(); } return; }
    if (w !== seq[step]) { setPen((p) => p + 0.5); hap.bad(); return; }
    hap.tap();
    if (step + 1 >= 4) { const t = (Date.now() - t0.current) / 1000 + pen; setTime(t); setPhase('done'); hap.good(); const n = { best: st.best == null ? t : Math.min(st.best, t), list: [t, ...st.list].slice(0, 20) }; setSt(n); kvSet('pit:v1', n); if (t <= 2.0) setGot(await awardPack('pit:fast')); } else setStep(step + 1);
  };
  const names = ['Front left', 'Front right', 'Rear left', 'Rear right'];
  const wheel = (w) => { const lit = phase === 'go' && seq[step] === w; return (
    <Pressable key={w} accessibilityRole="button" accessibilityLabel={`${names[w]} wheel`} onPressIn={() => hit(w)} style={{ width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', backgroundColor: lit ? colors.good : alpha(colors.fg, 0.1), borderWidth: 3, borderColor: lit ? colors.good : colors.line }}>
      <Text style={{ color: lit ? '#000' : colors.muted, fontWeight: '900', fontSize: 13 }}>{names[w].toUpperCase()}</Text></Pressable>); };
  const avg = st.list.length ? st.list.reduce((a, b) => a + b, 0) / st.list.length : null;
  return (
    <Screen header={false}>
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <Eyebrow>Pit stop timer</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 90 }}>{wheel(0)}{wheel(1)}</View>
        <View style={{ flexDirection: 'row', gap: 90 }}>{wheel(2)}{wheel(3)}</View>
        {phase === 'idle' ? <Text style={{ color: colors.muted, textAlign: 'center' }}>Four wheels, four taps. Tap each wheel as it lights up green. Wrong wheel: half a second penalty.</Text> : null}
        {phase === 'ready' ? <Text style={{ color: colors.gold, fontSize: 22, fontWeight: '900' }}>Car arriving…</Text> : null}
        {phase === 'go' ? <Text style={{ color: colors.good, fontSize: 22, fontWeight: '900' }}>{`Wheel ${step + 1} of 4`}</Text> : null}
        {phase === 'early' ? <Text style={{ color: colors.red, fontSize: 22, fontWeight: '900' }}>Too early. Wait for green.</Text> : null}
        {phase === 'done' ? <Text style={{ color: colors.fg, fontSize: 40, fontWeight: '900' }}>{`${time.toFixed(2)} s`}</Text> : null}
        {phase === 'done' && pen ? <Text style={{ color: colors.muted }}>{`Includes ${pen.toFixed(1)} s of penalties`}</Text> : null}
        {phase !== 'ready' && phase !== 'go' ? <Btn onPress={start}>{phase === 'idle' ? 'Start' : 'Again'}</Btn> : null}
      </Card>
      {got ? <Note>Under 2 seconds. You earned a card pack. Open it in Cards.</Note> : null}
      <Card><Eyebrow>Your stops</Eyebrow>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>{[['BEST', st.best != null ? `${st.best.toFixed(2)}s` : '-'], ['AVERAGE', avg != null ? `${avg.toFixed(2)}s` : '-'], ['TRIES', String(st.list.length)]].map(([k, v]) => (<View key={k} style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{k}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '900' }}>{v}</Text></View>))}</View>
        <Note>Real teams change four tyres in about two seconds, with a crew of twenty. A stop under 2 seconds here earns a card pack.</Note></Card>
    </Screen>);
}

// ---------- Driver number quiz: from this season's standings (needs a connection once) ----------
const NQ = 10;
export function NumberQuizScreen() {
  const q = useAsync(() => driverStandings(YEAR), []);
  const [seed, setSeed] = useState(1); const [i, setI] = useState(0); const [score, setScore] = useState(0); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('num:best', 0).then(setBest); }, []);
  const pool = useMemo(() => (q.v || []).filter((d) => d.permNumber && /^\d+$/.test(String(d.permNumber))), [q.v]);
  const rounds = useMemo(() => { if (pool.length < 6) return []; const r = rngOf(seedOf(`num${seed}${Date.now()}`)); const n = Math.min(NQ, pool.length);
    return shuffle(pool, r).slice(0, n).map((d, k) => { const others = shuffle(pool.filter((x) => x !== d), r).slice(0, 3); const byNum = k % 2 === 0; return byNum ? { d, byNum, ask: `Which driver races with #${d.permNumber}?`, ans: d.name, opts: shuffle([d, ...others], r).map((x) => x.name) } : { d, byNum, ask: `Which number does ${d.name} race with?`, ans: String(d.permNumber), opts: shuffle([d, ...others], r).map((x) => String(x.permNumber)) }; }); }, [pool, seed]);
  const total = rounds.length;
  if (q.loading) return <Screen header={false}><Note>Loading this season's drivers…</Note></Screen>;
  if (total < 3) return <Screen header={false}><Note>This quiz needs this season's driver list, which could not be loaded. Connect once and try again.</Note></Screen>;
  const done = i >= total; const cur = rounds[Math.min(i, total - 1)];
  const answer = (o) => { if (pick || done) return; setPick(o); const ok = o === cur.ans; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) setScore(sc);
    setTimeout(async () => { setPick(null); setI((x) => x + 1); if (i + 1 >= total) { if (sc > best) { setBest(sc); kvSet('num:best', sc); } if (sc >= total - 1) setGot(await awardPack('num:9')); } }, 900); };
  const again = () => { setSeed((s) => s + 1); setI(0); setScore(0); setPick(null); setGot(false); };
  if (done) return (<Screen header={false}><Card><Eyebrow>Number quiz</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{score} / {total}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Best: {Math.max(best, score)}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card>{got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}<Note>Miss at most one to earn a card pack.</Note></Screen>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Question ${i + 1} of ${total}  ·  score ${score}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 21, fontWeight: '800', marginTop: 10 }}>{cur.ask}</Text></Card>
      {cur.opts.map((o) => <Pressable key={o} accessibilityRole="button" onPress={() => answer(o)} style={({ pressed }) => [optStyle(pick && o === cur.ans, pick === o && o !== cur.ans), pressed && { opacity: 0.8 }]}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o}</Text></Pressable>)}
    </Screen>);
}

// ---------- Career duel: who has more? One wrong answer ends the streak ----------
const METRICS = [['wins', 'race wins'], ['poles', 'pole positions'], ['podiums', 'podium finishes'], ['races', 'Grand Prix starts'], ['titles', 'world titles']];
const val = (id, k, c) => (k === 'titles' ? titlesOf(id) : c[k]);
function makeDuel(r) {
  const all = localAllDrivers().filter((d) => d.last_year && d.last_year >= 1975);
  for (let t = 0; t < 60; t++) {
    const [m, label] = METRICS[Math.floor(r() * METRICS.length)]; const a = all[Math.floor(r() * all.length)], b = all[Math.floor(r() * all.length)]; if (a === b) continue;
    const ca = localCareer(a.driverId), cb = localCareer(b.driverId); if (!ca || !cb) continue;
    const va = val(a.driverId, m, ca), vb = val(b.driverId, m, cb);
    if (va === vb || Math.max(va, vb) < 2 || ca.races < 15 || cb.races < 15) continue;
    return { a: { ...a, v: va }, b: { ...b, v: vb }, label, win: va > vb ? 'a' : 'b' };
  }
  return null;
}
export function CareerDuelScreen() {
  const rr = useRef(rngOf(seedOf(`duel${Date.now()}`))).current;
  const [duel, setDuel] = useState(() => makeDuel(rr)); const [streak, setStreak] = useState(0); const [best, setBest] = useState(0); const [pick, setPick] = useState(null); const [over, setOver] = useState(false); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('duel:best', 0).then(setBest); }, []);
  if (!duel) return <Screen header={false}><Note>Not enough career data to make a duel.</Note></Screen>;
  const choose = (k) => { if (pick) return; setPick(k); const ok = k === duel.win; ok ? hap.good() : hap.bad();
    setTimeout(async () => { if (ok) { const n = streak + 1; setStreak(n); if (n > best) { setBest(n); kvSet('duel:best', n); } if (n >= 10) setGot(await awardPack('duel:10')); setPick(null); setDuel(makeDuel(rr)); } else setOver(true); }, 1300); };
  const again = () => { setStreak(0); setPick(null); setOver(false); setGot(false); setDuel(makeDuel(rr)); };
  if (over) return (<Screen header={false}><Card><Eyebrow>Career duel</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{`Streak ${streak}`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`Best streak: ${best}`}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card><Note>A streak of 10 earns a card pack.</Note></Screen>);
  const side = (k) => { const d = duel[k]; const shown = pick; const right = shown && duel.win === k; const wrong = shown === k && duel.win !== k;
    return (<Pressable key={k} accessibilityRole="button" onPress={() => choose(k)} style={({ pressed }) => [optStyle(right, wrong), { alignItems: 'center', paddingVertical: 24 }, pressed && { opacity: 0.8 }]}><Text style={{ color: colors.fg, fontSize: 21, fontWeight: '900' }}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${d.first_year} to ${d.last_year}`}</Text>{shown ? <Text style={{ color: colors.fg, fontSize: 32, fontWeight: '900', marginTop: 8 }}>{d.v}</Text> : null}</Pressable>); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Streak ${streak}  ·  best ${best}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '800', marginTop: 8 }}>{`Who has more ${duel.label} in their career?`}</Text></Card>
      {side('a')}{side('b')}
      {got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}
    </Screen>);
}

// ---------- Build the grid: put the drivers into the right teams for a season ----------
const GRID_YEARS = (() => { const a = []; const up = Math.min(2025, (() => { try { return HISTORY_UPTO(); } catch { return 2025; } })()); for (let y = up; y >= 2000; y--) a.push(y); return a; })();
export function BuildGridScreen() {
  const [year, setYear] = useState(() => GRID_YEARS[Math.floor(Math.random() * GRID_YEARS.length)]); const [seed, setSeed] = useState(1);
  const teams = useMemo(() => { try { const seen = new Set(); return seasonGrid(year).map((t) => ({ ...t, drivers: t.drivers.filter((d) => { if (seen.has(d.driverId)) return false; seen.add(d.driverId); return true; }) })).filter((t) => t.drivers.length === 2); } catch { return []; } }, [year]);
  const pool = useMemo(() => shuffle(teams.flatMap((t) => t.drivers), rngOf(seedOf(`bg${year}${seed}`))), [teams, year, seed]);
  const [placed, setPlaced] = useState({}); const [sel, setSel] = useState(null); const [checked, setChecked] = useState(false); const [got, setGot] = useState(false);
  useEffect(() => { setPlaced({}); setSel(null); setChecked(false); setGot(false); }, [year, seed]);
  const used = new Set(Object.values(placed)); const free = pool.filter((d) => !used.has(d.driverId));
  const slotKey = (t, n) => `${t.teamId}:${n}`;
  const tapSlot = (k) => { if (checked) return; if (placed[k]) { const n = { ...placed }; delete n[k]; setPlaced(n); return; } if (sel) { setPlaced({ ...placed, [k]: sel }); setSel(null); hap.tap(); } };
  const score = teams.reduce((a, t) => a + [0, 1].filter((n) => { const id = placed[slotKey(t, n)]; return id && t.drivers.some((d) => d.driverId === id); }).length, 0); const max = teams.length * 2;
  const check = async () => { setChecked(true); score === max ? hap.good() : hap.tap(); if (score === max) setGot(await awardPack(`grid:${year}`)); };
  const nameOf = (id) => pool.find((d) => d.driverId === id)?.last || id;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Build the grid</Eyebrow>
        <View style={{ marginTop: 10 }}><Dropdown value={year} options={GRID_YEARS.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" /></View>
        <Note>Pick a driver, then tap a seat in the team they raced for most that season. Tap a placed driver to take them back.</Note></Card>
      {!teams.length ? <Note>No grid data for this season.</Note> : null}
      <Card><Eyebrow>{`Drivers left: ${free.length}`}</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {free.map((d) => (<Pressable key={d.driverId} accessibilityRole="button" onPress={() => { setSel(sel === d.driverId ? null : d.driverId); hap.tap(); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: sel === d.driverId ? colors.accent : colors.line, backgroundColor: sel === d.driverId ? alpha(colors.accent, 0.22) : colors.card }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{d.name}</Text></Pressable>))}
          {!free.length ? <Text style={{ color: colors.muted }}>All placed.</Text> : null}
        </View></Card>
      {teams.map((t) => (
        <Card key={t.teamId}><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 16 }}>{t.name}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {[0, 1].map((n) => { const k = slotKey(t, n); const id = placed[k]; const ok = checked && id && t.drivers.some((d) => d.driverId === id); const bad = checked && (!id || !ok);
              return (<Pressable key={n} accessibilityRole="button" onPress={() => tapSlot(k)} style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderStyle: id ? 'solid' : 'dashed', borderColor: ok ? colors.good : bad ? colors.red : colors.line, backgroundColor: ok ? alpha(colors.good, 0.18) : bad ? alpha(colors.red, 0.14) : 'transparent', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <Text style={{ color: id ? colors.fg : colors.muted, fontWeight: '800' }}>{id ? nameOf(id) : 'Empty seat'}</Text>
                {checked && bad ? <Text style={{ color: colors.muted, fontSize: 11 }}>{`${t.drivers.map((d) => d.last).join(' / ')}`}</Text> : null}</Pressable>); })}
          </View></Card>))}
      {teams.length ? (checked ? (<Card><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '900' }}>{`${score} / ${max}`}</Text>{got ? <Note>Perfect grid. You earned a card pack. Open it in Cards.</Note> : null}<View style={{ marginTop: 12 }}><Btn onPress={() => { setSeed((s) => s + 1); setYear(GRID_YEARS[Math.floor(Math.random() * GRID_YEARS.length)]); }}>New season</Btn></View></Card>) : <Btn onPress={check} disabled={Object.keys(placed).length < max}>Check my grid</Btn>) : null}
    </Screen>);
}

// ---------- Winner guess: a year and a Grand Prix, who won? ----------
const WG = 8;
function makeWinnerRounds(r) {
  const ys = historyYears().filter((y) => y >= 1990 && y <= 2025); const out = [];
  for (let t = 0; t < 200 && out.length < WG; t++) {
    const y = ys[Math.floor(r() * ys.length)]; const rs = roundsOf(y); if (!rs.length) continue; const rd = rs[Math.floor(r() * rs.length)]; const R = raceRowsOf(y, rd.round); if (!R) continue;
    const win = R.rows.find((x) => x.pos === 1); if (!win || out.some((o) => o.y === y && o.race === R.name)) continue;
    const pool = R.rows.filter((x) => x !== win && x.grid <= 10 && x.pos && x.pos <= 10 && x.full !== win.full); if (pool.length < 3) continue;
    const opts = shuffle([win, ...shuffle(pool, r).slice(0, 3)], r).map((x) => x.full);
    out.push({ y, race: R.name, ans: win.full, team: win.team, grid: win.grid, opts });
  }
  return out;
}
export function WinnerGuessScreen() {
  const [seed, setSeed] = useState(1); const rounds = useMemo(() => { try { return makeWinnerRounds(rngOf(seedOf(`wg${seed}${Date.now()}`))); } catch { return []; } }, [seed]);
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [pick, setPick] = useState(null); const [hint, setHint] = useState(false); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('wg:best', 0).then(setBest); }, []);
  const total = rounds.length; if (total < 3) return <Screen header={false}><Note>Not enough history to make a round.</Note></Screen>;
  const done = i >= total; const cur = rounds[Math.min(i, total - 1)];
  const answer = (o) => { if (pick || done) return; setPick(o); const ok = o === cur.ans; ok ? hap.good() : hap.bad(); const sc = score + (ok ? (hint ? 0.5 : 1) : 0); if (ok) setScore(sc);
    setTimeout(async () => { setPick(null); setHint(false); setI((x) => x + 1); if (i + 1 >= total) { if (sc > best) { setBest(sc); kvSet('wg:best', sc); } if (sc >= 7) setGot(await awardPack('wg:7')); } }, 1500); };
  const again = () => { setSeed((s) => s + 1); setI(0); setScore(0); setPick(null); setHint(false); setGot(false); };
  if (done) return (<Screen header={false}><Card><Eyebrow>Winner guess</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{score} / {total}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Best: {Math.max(best, score)}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card>{got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}<Note>Score 7 or more once to earn a card pack. Using the team clue halves a point.</Note></Screen>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Race ${i + 1} of ${total}  ·  score ${score}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '900', marginTop: 10 }}>{`${cur.y} ${cur.race}`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Who won?</Text>
        {hint ? <Text style={{ color: colors.gold, marginTop: 8, fontWeight: '700' }}>{`Clue: the winner drove for ${cur.team}.`}</Text> : !pick ? <Pressable accessibilityRole="button" onPress={() => setHint(true)} style={{ marginTop: 8 }}><Text style={{ color: colors.accent, fontWeight: '800' }}>Show the team clue (half a point)</Text></Pressable> : null}</Card>
      {cur.opts.map((o) => <Pressable key={o} accessibilityRole="button" onPress={() => answer(o)} style={({ pressed }) => [optStyle(pick && o === cur.ans, pick === o && o !== cur.ans), pressed && { opacity: 0.8 }]}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o}</Text></Pressable>)}
      {pick ? <Note>{`${cur.ans} won it, starting from P${cur.grid}.`}</Note> : null}
    </Screen>);
}

// ---------- Closest number: slide to guess a career total ----------
const CN = [['races', 'Grand Prix starts', 450], ['wins', 'race wins', 120], ['podiums', 'podium finishes', 220]];
function makeGuessRounds(r) {
  const pool = localAllDrivers().filter((d) => d.last_year && d.last_year >= 1990); const out = [];
  for (let t = 0; t < 300 && out.length < 5; t++) {
    const d = pool[Math.floor(r() * pool.length)]; const m = CN[Math.floor(r() * CN.length)]; const c = localCareer(d.driverId); if (!c || c.races < 40) continue;
    const v = c[m[0]]; if (!Number.isFinite(v) || (m[0] !== 'races' && v < 2) || out.some((o) => o.d.driverId === d.driverId)) continue; out.push({ d, key: m[0], label: m[1], max: m[2], ans: v });
  }
  return out;
}
const pts = (g, a, max) => Math.max(0, Math.round(100 - (100 * Math.abs(g - a)) / Math.max(a * 0.6, 8)));
export function ClosestNumberScreen() {
  const [seed, setSeed] = useState(1); const rounds = useMemo(() => { try { return makeGuessRounds(rngOf(seedOf(`cn${seed}${Date.now()}`))); } catch { return []; } }, [seed]);
  const [i, setI] = useState(0); const [g, setG] = useState(0); const [res, setRes] = useState(null); const [total, setTotal] = useState(0); const [best, setBest] = useState(0); const [got, setGot] = useState(false); const [w, setW] = useState(0);
  useEffect(() => { kvGet('cn:best', 0).then(setBest); }, []);
  if (rounds.length < 3) return <Screen header={false}><Note>Not enough career data to make a round.</Note></Screen>;
  const n = rounds.length; const done = i >= n; const cur = rounds[Math.min(i, n - 1)];
  const set = (v) => { if (res) return; setG(Math.max(0, Math.min(cur.max, Math.round(v)))); };
  const lock = () => { if (res) return; const p = pts(g, cur.ans, cur.max); setRes({ p }); p >= 80 ? hap.good() : hap.tap(); setTotal((t) => t + p); };
  const next = async () => { const nt = total; setRes(null); setG(0); if (i + 1 >= n) { if (nt > best) { setBest(nt); kvSet('cn:best', nt); } if (nt >= 350) setGot(await awardPack('cn:350')); } setI(i + 1); };
  const again = () => { setSeed((x) => x + 1); setI(0); setTotal(0); setG(0); setRes(null); setGot(false); };
  if (done) return (<Screen header={false}><Card><Eyebrow>Closest number</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{`${total} / ${n * 100}`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`Best: ${Math.max(best, total)}`}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card>{got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}<Note>350 points or more earns a card pack.</Note></Screen>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Driver ${i + 1} of ${n}  ·  ${total} points`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '900', marginTop: 10 }}>{cur.d.name}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`How many ${cur.label} in his F1 career?`}</Text>
        <Text style={{ color: colors.fg, fontSize: 48, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>{g}</Text>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => !res} onMoveShouldSetResponder={() => !res} onResponderGrant={(e) => w && set((e.nativeEvent.locationX / w) * cur.max)} onResponderMove={(e) => w && set((e.nativeEvent.locationX / w) * cur.max)} accessibilityRole="adjustable" accessibilityLabel="Guess" style={{ height: 44, justifyContent: 'center' }}>
          <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: alpha(colors.fg, 0.15) }}><View style={{ width: `${(g / cur.max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>{[-10, -1, 1, 10].map((d) => (<Pressable key={d} accessibilityRole="button" onPress={() => set(g + d)} style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '800' }}>{d > 0 ? `+${d}` : d}</Text></Pressable>))}</View>
        {res ? <Text style={{ color: res.p >= 80 ? colors.good : colors.fg, fontWeight: '800', textAlign: 'center', marginTop: 12 }}>{`Answer: ${cur.ans}. You scored ${res.p}.`}</Text> : null}
      </Card>
      {res ? <Btn onPress={next}>{i + 1 >= n ? 'Finish' : 'Next driver'}</Btn> : <Btn onPress={lock}>Lock in</Btn>}
      <Note>Career totals from the offline history up to the last finished season. Drag the bar or use the buttons.</Note>
    </Screen>);
}

// ---------- Lap tapper: tap in the apex zone of every corner; your lap is the lap record plus the time you lose ----------
const secOf = (t) => { const m = String(t || '').match(/^(\d+):(\d+\.\d+)$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const fmtLap = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
export function LapTapperScreen() {
  const circuits = useMemo(() => CIRCUITS.filter((c) => c.lapRecord && secOf(c.lapRecord.time) != null), []);
  const [key, setKey] = useState(circuits[0] ? circuits[0].key : null); const c = circuits.find((x) => x.key === key) || circuits[0];
  const turns = c ? Math.min(14, Math.max(5, Number((c.stats.find((s) => s[0] === 'Turns') || [])[1]) || 10)) : 10;
  const [corner, setCorner] = useState(-1); const [lost, setLost] = useState(0); const [last, setLast] = useState(null); const [bestMap, setBestMap] = useState({}); const [got, setGot] = useState(false);
  const [w, setW] = useState(0); const anim = useRef(new Animated.Value(0)).current; const t0 = useRef(0); const period = useRef(1100); const center = useRef(0.5); const loop = useRef(null);
  useEffect(() => { kvGet('lap:best', {}).then(setBestMap); return () => { if (loop.current) loop.current.stop(); }; }, []);
  const begin = (k) => { const r = Math.random; center.current = 0.2 + r() * 0.6; period.current = 800 + Math.floor(r() * 700); if (loop.current) loop.current.stop(); anim.setValue(0); t0.current = Date.now();
    loop.current = Animated.loop(Animated.sequence([Animated.timing(anim, { toValue: 1, duration: period.current / 2, easing: Easing.linear, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: period.current / 2, easing: Easing.linear, useNativeDriver: true })])); loop.current.start(); setCorner(k); };
  const start = () => { setLost(0); setLast(null); setGot(false); begin(0); };
  const tap = async () => {
    if (corner < 0 || corner >= turns) return; const ph = ((Date.now() - t0.current) % period.current) / period.current; const pos = ph < 0.5 ? ph * 2 : 2 - ph * 2; const err = Math.abs(pos - center.current);
    const pen = Math.min(0.45, Math.max(0, err - 0.03) * 1.3); const nl = lost + pen; setLost(nl); setLast({ err, pen }); err < 0.06 ? hap.good() : hap.tap();
    if (corner + 1 >= turns) { if (loop.current) loop.current.stop(); setCorner(turns); const lap = secOf(c.lapRecord.time) + nl; const bm = { ...bestMap }; if (bm[c.key] == null || lap < bm[c.key]) { bm[c.key] = lap; setBestMap(bm); kvSet('lap:best', bm); } if (nl <= 2.0) setGot(await awardPack('lap:2')); } else begin(corner + 1); };
  if (!c) return <Screen header={false}><Note>No circuit data.</Note></Screen>;
  const rec = secOf(c.lapRecord.time); const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, w - 14)] });
  return (
    <Screen header={false}>
      <Card><Eyebrow>Lap tapper</Eyebrow><View style={{ marginTop: 10 }}><Dropdown value={key} options={circuits.map((x) => [x.key, x.name])} onChange={(v) => { setKey(v); setCorner(-1); setLost(0); setLast(null); if (loop.current) loop.current.stop(); }} prefix="Circuit" /></View>
        <Note>{`${c.name}: ${turns} corners. Tap when the marker is inside the green apex zone. Every miss costs time on top of the lap record (${c.lapRecord.time}, ${c.lapRecord.driver}, ${c.lapRecord.year}).`}</Note></Card>
      <Card>
        {corner >= 0 && corner < turns ? (<>
          <Text style={{ color: colors.fg, fontWeight: '900', fontSize: 18 }}>{`Corner ${corner + 1} of ${turns}`}</Text>
          <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 40, marginTop: 14, borderRadius: 10, backgroundColor: alpha(colors.fg, 0.1), justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: `${(center.current - 0.06) * 100}%`, width: '12%', top: 0, bottom: 0, backgroundColor: alpha(colors.good, 0.5) }} />
            <Animated.View style={{ width: 6, height: 40, borderRadius: 3, backgroundColor: colors.fg, transform: [{ translateX: tx }] }} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tap at the apex" onPressIn={tap} style={({ pressed }) => [{ marginTop: 14, paddingVertical: 26, borderRadius: 16, alignItems: 'center', backgroundColor: alpha(colors.accent, 0.25), borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 20 }}>TAP</Text></Pressable>
          {last ? <Text style={{ color: last.pen < 0.02 ? colors.good : colors.muted, textAlign: 'center', marginTop: 10 }}>{last.pen < 0.02 ? 'Perfect apex.' : `Lost ${last.pen.toFixed(2)} s`}</Text> : null}
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>{`Time lost so far: ${lost.toFixed(2)} s`}</Text>
        </>) : corner >= turns ? (<>
          <Text style={{ color: colors.muted, fontWeight: '800' }}>YOUR LAP</Text><Text style={{ color: colors.fg, fontSize: 40, fontWeight: '900' }}>{fmtLap(rec + lost)}</Text>
          <Text style={{ color: colors.muted }}>{`${lost.toFixed(2)} s off the lap record. Best here: ${bestMap[c.key] != null ? fmtLap(bestMap[c.key]) : '-'}`}</Text></>) : <Text style={{ color: colors.muted }}>Ready when you are.</Text>}
        {corner < 0 || corner >= turns ? <View style={{ marginTop: 14 }}><Btn onPress={start}>{corner >= turns ? 'Another lap' : 'Start lap'}</Btn></View> : null}
      </Card>
      {got ? <Note>Within 2 seconds of the record. You earned a card pack. Open it in Cards.</Note> : <Note>Finish within 2.0 s of the lap record to earn a card pack. The record is a qualifying-style benchmark, so this is a game, not a lap simulator.</Note>}
    </Screen>);
}
