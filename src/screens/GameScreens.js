import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { kvGet, kvSet, today, seedOf, rngOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import * as hap from '../lib/haptics';
import { CIRCUITS } from '../data/circuits';
import { localAllDrivers, localCareer, lastTeamOf } from '../api/history';

const Big = ({ children, color }) => <Text style={{ color: color || colors.fg, fontSize: 44, fontWeight: '900', textAlign: 'center' }}>{children}</Text>;
const bonus = (got) => (got ? <Note>{'You earned a card pack. Open it in Cards.'}</Note> : null);

// ---------- Lights out: five red lights, tap as fast as you can once they go out ----------
export function LightsOutScreen() {
  const [phase, setPhase] = useState('idle'); const [on, setOn] = useState(0); const [rt, setRt] = useState(null); const [st, setSt] = useState({ best: null, list: [] }); const [got, setGot] = useState(false);
  const t0 = useRef(0); const timers = useRef([]); const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => { kvGet('lights:v1', { best: null, list: [] }).then(setSt); return clear; }, []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const start = () => { clear(); setRt(null); setOn(0); setGot(false); setPhase('lights'); for (let i = 1; i <= 5; i++) later(() => setOn(i), i * 800); later(() => setPhase('wait'), 5 * 800); later(() => { setOn(0); t0.current = Date.now(); setPhase('go'); hap.tap(); }, 5 * 800 + 600 + Math.random() * 2400); };
  const tap = () => {
    if (phase === 'idle' || phase === 'result' || phase === 'false') return start();
    if (phase === 'lights' || phase === 'wait') { clear(); setPhase('false'); hap.bad(); return; }
    if (phase === 'go') { const ms = Date.now() - t0.current; setRt(ms); setPhase('result'); ms < 300 ? hap.good() : hap.tap(); const n = { best: st.best == null ? ms : Math.min(st.best, ms), list: [ms, ...st.list].slice(0, 20) }; setSt(n); kvSet('lights:v1', n); if (ms < 300) awardPack(`lights:${today()}`).then(setGot); }
  };
  const avg = st.list.length ? Math.round(st.list.reduce((a, b) => a + b, 0) / st.list.length) : null;
  const rate = rt == null ? '' : rt < 180 ? 'Faster than most humans can react. Check your finger.' : rt < 230 ? 'Front row of the grid.' : rt < 300 ? 'Racer reflexes.' : rt < 400 ? 'Decent, but the pack would have passed you.' : 'Slow off the line.';
  return (
    <Screen header={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={phase === 'go' ? 'Tap now' : 'Lights out reaction test'} onPressIn={tap} style={{ borderRadius: 22, backgroundColor: phase === 'go' ? alpha(colors.good, 0.25) : phase === 'false' ? alpha(colors.red, 0.2) : colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 36, paddingHorizontal: 16, alignItems: 'center', gap: 22, minHeight: 330 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>{[1, 2, 3, 4, 5].map((i) => (<View key={i} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: on >= i ? '#E10600' : '#2A0A0A', borderWidth: 2, borderColor: '#000' }} />))}</View>
        {phase === 'idle' ? <><Big>Ready?</Big><Text style={{ color: colors.muted, textAlign: 'center' }}>Tap to start. Five red lights come on one by one. When they all go out, tap as fast as you can. Tap early and it is a false start.</Text></> : null}
        {phase === 'lights' || phase === 'wait' ? <Big color={colors.muted}>{phase === 'wait' ? 'Wait for it…' : 'Lights…'}</Big> : null}
        {phase === 'go' ? <Big color={colors.good}>GO!</Big> : null}
        {phase === 'false' ? <><Big color={colors.red}>False start</Big><Text style={{ color: colors.muted }}>You moved before the lights went out. Tap to try again.</Text></> : null}
        {phase === 'result' ? <><Big>{`${(rt / 1000).toFixed(3)} s`}</Big><Text style={{ color: colors.fg, fontSize: 16, textAlign: 'center' }}>{rate}</Text><Text style={{ color: colors.muted }}>Tap to go again</Text></> : null}
      </Pressable>
      {bonus(got)}
      <Card>
        <Eyebrow>Your reactions</Eyebrow>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>{[['BEST', st.best != null ? `${(st.best / 1000).toFixed(3)}s` : '-'], ['AVERAGE', avg != null ? `${(avg / 1000).toFixed(3)}s` : '-'], ['TRIES', String(st.list.length)]].map(([k, v]) => (<View key={k} style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>{k}</Text></View>))}</View>
        <Note>A typical F1 driver leaves the line a little over a fifth of a second after the lights go out. Your phone adds some touch delay of its own, so compare yourself to your own best, not to a driver. React under 0.3 s once a day to earn a card pack.</Note>
      </Card>
    </Screen>);
}

// ---------- Guess the circuit: clues are revealed one at a time, the fewer you need the more you score ----------
const CLUES = (c) => { const g = (k) => (c.stats.find((s) => s[0] === k) || [])[1]; const parts = c.place.split(',').map((x) => x.trim());
  return [`Lap length ${g('Lap length') || '?'} with ${g('Turns') || '?'} turns.`, `Race distance ${g('Race distance') || '?'} over ${g('Race laps') || '?'} laps.`, `First Grand Prix here: ${g('First Grand Prix') || 'unknown'}.`, c.lapRecord ? `Lap record ${c.lapRecord.time} by ${c.lapRecord.driver} (${c.lapRecord.team}, ${c.lapRecord.year}).` : 'No lap record is listed.', `It is in ${parts[parts.length - 1]}${parts.length > 1 ? `, near ${parts[0]}` : ''}.`]; };
const ROUNDS = 5;
export function GuessCircuitScreen() {
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [clues, setClues] = useState(1); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [done, setDone] = useState(false); const [got, setGot] = useState(false); const [seed, setSeed] = useState(0);
  useEffect(() => { kvGet('circuit:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { const r = rngOf(seedOf(`circuit${seed}${Date.now()}`)); const shuf = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }; return shuf(CIRCUITS).slice(0, ROUNDS).map((c) => ({ c, opts: shuf([c, ...shuf(CIRCUITS.filter((x) => x.key !== c.key)).slice(0, 3)]) })); }, [seed]);
  const cur = rounds[Math.min(round, ROUNDS - 1)]; const list = useMemo(() => CLUES(cur.c), [cur]);
  const answer = (o) => { if (pick) return; setPick(o.key); const ok = o.key === cur.c.key; ok ? hap.good() : hap.bad(); if (ok) setScore((s) => s + (6 - clues)); setTimeout(async () => { if (round + 1 >= ROUNDS) { const fin = score + (ok ? 6 - clues : 0); setDone(true); if (fin > best) { setBest(fin); kvSet('circuit:best', fin); } if (fin >= 12) awardPack(`circuit:${today()}`).then(setGot); } else { setRound(round + 1); setClues(1); setPick(null); } }, 1500); };
  const again = () => { setSeed((s) => s + 1); setRound(0); setScore(0); setClues(1); setPick(null); setDone(false); setGot(false); };
  if (done) return (<Screen header={false}><Card><Eyebrow>Guess the circuit</Eyebrow><Big>{`${score} / ${ROUNDS * 5}`}</Big><Text style={{ color: colors.muted, textAlign: 'center' }}>{`Best: ${Math.max(best, score)}. Fewer clues means more points.`}</Text><View style={{ marginTop: 14 }}><Btn icon="refresh" tone="solid" onPress={again}>Play again</Btn></View></Card>{bonus(got)}<Note>Score 12 or more to earn a card pack once a day.</Note></Screen>);
  return (
    <Screen header={false}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Eyebrow>{`Circuit ${round + 1} of ${ROUNDS}`}</Eyebrow><Text style={{ color: colors.gold, fontWeight: '800' }}>{`${score} pts`}</Text></View>
        <View style={{ marginTop: 10, gap: 6 }}>{list.slice(0, clues).map((t, i) => (<View key={i} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: colors.accent, fontWeight: '800' }}>{i + 1}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 16 }}>{t}</Text></View>))}</View>
        {clues < 5 && !pick ? <Pressable accessibilityRole="button" onPress={() => setClues(clues + 1)} hitSlop={8} style={{ marginTop: 10 }}><Text style={{ color: colors.accent, fontWeight: '800' }}>{`Another clue (worth ${5 - clues} point${5 - clues === 1 ? '' : 's'} if right)`}</Text></Pressable> : null}
      </Card>
      <View style={{ gap: 10 }}>{cur.opts.map((o) => { const shown = !!pick; const right = o.key === cur.c.key; const mine = pick === o.key; return (
        <Pressable key={o.key} accessibilityRole="button" onPress={() => answer(o)} style={({ pressed }) => [{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: shown ? (right ? colors.good : mine ? colors.red : colors.line) : colors.line, backgroundColor: shown && right ? alpha(colors.good, 0.15) : colors.card }, pressed && { opacity: 0.85 }]}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{shown ? o.place : ' '}</Text></Pressable>); })}</View>
      <Note>Built from the circuit facts stored in the app, so it works offline.</Note>
    </Screen>);
}

// ---------- Mystery driver: a daily Wordle-style guess ----------
const MAX = 6;
const attrs = (id) => { const d = POOL().find((x) => x.driverId === id); const c = localCareer(id); const t = lastTeamOf(id); return d && c ? { id, name: d.name, nat: d.nationality, first: c.first, last: c.last, races: c.races, wins: c.wins, team: t?.team || '' } : null; };
let _pool = null; const POOL = () => _pool || (_pool = localAllDrivers());
const secretFor = (day) => { const r = rngOf(seedOf(`mystery${day}`)); const pool = POOL().filter((d) => (d.last_year || 0) >= 1996); for (let i = 0; i < 80; i++) { const d = pool[Math.floor(r() * pool.length)]; const c = localCareer(d.driverId); if (c && c.races >= 60) return d.driverId; } return pool[0].driverId; };
const cmp = (g, s, k, tol) => (g[k] === s[k] ? 'hit' : typeof g[k] === 'number' && Math.abs(g[k] - s[k]) <= tol(g[k]) ? 'near' : 'miss');
export function MysteryDriverScreen() {
  const day = today(); const secret = useMemo(() => attrs(secretFor(day)), [day]); const [guesses, setGuesses] = useState([]); const [q, setQ] = useState(''); const [got, setGot] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => { kvGet(`mystery:${day}`, []).then((g) => { setGuesses(g); setReady(true); }); }, [day]);
  const rows = useMemo(() => guesses.map(attrs).filter(Boolean), [guesses]);
  const won = rows.some((r) => r.id === secret.id), over = won || rows.length >= MAX;
  const sugg = useMemo(() => { const n = norm(q); if (n.length < 2) return []; return POOL().filter((d) => norm(d.name).includes(n) && !guesses.includes(d.driverId)).sort((a, b) => (b.last_year || 0) - (a.last_year || 0)).slice(0, 6); }, [q, guesses]);
  const add = (d) => { const g = [...guesses, d.driverId]; setGuesses(g); setQ(''); kvSet(`mystery:${day}`, g); if (d.driverId === secret.id) { hap.big(); awardPack(`mystery:${day}`).then(setGot); } };
  const Chip = ({ label, state, arrow }) => (<View style={{ flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 2, backgroundColor: state === 'hit' ? alpha(colors.good, 0.35) : state === 'near' ? alpha(colors.gold, 0.35) : alpha(colors.muted, 0.15) }}><Text style={{ color: colors.fg, fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{label}</Text>{arrow ? <Text style={{ color: colors.fg, fontSize: 11 }}>{arrow}</Text> : null}</View>);
  const ar = (g, k) => (g[k] === secret[k] ? '' : secret[k] > g[k] ? '▲ higher' : '▼ lower');
  if (!ready) return <Screen header={false}><Note>Loading…</Note></Screen>;
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Mystery driver</Eyebrow>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>{`A new driver every day. You have ${MAX} guesses. Green is a match, yellow is close, and the arrows say whether the mystery driver is higher or lower.`}</Text>
        {!over ? (<View style={{ marginTop: 10 }}><TextInput value={q} onChangeText={setQ} placeholder="Type a driver name" placeholderTextColor={colors.muted} accessibilityLabel="Guess a driver" style={{ color: colors.fg, fontSize: 17, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface }} />
          {sugg.map((d) => (<Pressable key={d.driverId} accessibilityRole="button" onPress={() => add(d)} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${d.nationality || ''} · ${d.first_year || ''} to ${d.last_year || ''}`}</Text></Pressable>))}</View>) : null}
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{`Guess ${Math.min(rows.length + (over ? 0 : 1), MAX)} of ${MAX}`}</Text>
      </Card>
      {rows.map((g, i) => (<View key={i} style={{ gap: 4 }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{g.name}</Text><View style={{ flexDirection: 'row', gap: 4 }}>
        <Chip label={g.nat || '-'} state={g.nat === secret.nat ? 'hit' : 'miss'} /><Chip label={`Debut ${g.first}`} state={cmp(g, secret, 'first', () => 2)} arrow={ar(g, 'first')} /><Chip label={`Last ${g.last}`} state={cmp(g, secret, 'last', () => 2)} arrow={ar(g, 'last')} /><Chip label={`${g.races} races`} state={cmp(g, secret, 'races', (v) => v * 0.2)} arrow={ar(g, 'races')} /><Chip label={`${g.wins} wins`} state={cmp(g, secret, 'wins', (v) => Math.max(1, v * 0.25))} arrow={ar(g, 'wins')} /><Chip label={g.team || '-'} state={g.team === secret.team ? 'hit' : 'miss'} />
      </View></View>))}
      {rows.length === 0 ? <Note>Columns: nationality, debut season, last season, race starts, wins, and the last team.</Note> : null}
      {over ? <Card><Text style={{ color: won ? colors.good : colors.red, fontSize: 22, fontWeight: '800' }}>{won ? `Got it in ${rows.length}!` : 'Out of guesses'}</Text><Text style={{ color: colors.fg, fontSize: 17, marginTop: 4 }}>{`It was ${secret.name}.`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Come back tomorrow for a new one.</Text></Card> : null}
      {bonus(got)}
    </Screen>);
}
