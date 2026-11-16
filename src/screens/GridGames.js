import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import ShareResult from '../components/ShareResult';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { norm } from '../lib/names';
import { useGameSave, useRun, useLeaveGuard, useTimers } from '../lib/gameSave';
import { driverFacts, raceSample } from '../api/history';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;
const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const Suggest = ({ list, onPick }) => (<View style={{ gap: 6 }}>{list.map((d) => (<Pressable key={d.idx} accessibilityRole="button" onPress={() => onPick(d)} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontSize: 16 }}>{d.name}</Text></Pressable>))}</View>);

// ---------- Driver grid: nine cells, each needs a driver who fits the team (row) and the clue (column) ----------
const CLUES = [['Race winner', (d) => d.wins >= 1], ['World champion', (d) => d.titles >= 1], ['Pole sitter', (d) => d.poles >= 1], ['100+ starts', (d) => d.starts >= 100], ['Raced after 2015', (d) => d.lastYear >= 2015], ['Raced before 1990', (d) => d.first < 1990], ['Podium finisher', (d) => d.podiums >= 1], ['British', (d) => /brit/i.test(d.nat)], ['German', (d) => /germ/i.test(d.nat)], ['Italian', (d) => /ital/i.test(d.nat)], ['French', (d) => /fren/i.test(d.nat)], ['Brazilian', (d) => /brazil/i.test(d.nat)]];
function makeGrid(r) {
  const all = driverFacts(); const count = {}; all.forEach((d) => d.teamNames.forEach((t) => { count[t] = (count[t] || 0) + 1; }));
  const teams = Object.keys(count).filter((t) => count[t] >= 25);
  for (let tries = 0; tries < 300; tries++) {
    const rows = shuffle(r, teams).slice(0, 3); const cols = shuffle(r, CLUES).slice(0, 3); const cells = []; let ok = true;
    for (const t of rows) for (const c of cols) { const valid = all.filter((d) => d.teamNames.has(t) && c[1](d)).map((d) => d.idx); if (valid.length < 3) { ok = false; break; } cells.push(valid); } if (!ok) continue;
    return { rows, cols: cols.map((c) => c[0]), cells };
  }
  return null;
}
export function DriverGridScreen() {
  const [g, upd, restart] = useGameSave('drivergrid', () => ({ seed: Date.now(), cells: Array(9).fill(null), used: 0, over: false }));
  const [sel, setSel] = useState(null); const [q, setQ] = useState(''); const [msg, setMsg] = useState('');
  const grid = useMemo(() => { if (!g?.seed) return null; try { return makeGrid(rngOf(seedOf(`dg${g.seed}`))); } catch { return null; } }, [g?.seed]);
  const facts = useMemo(() => { try { return driverFacts(); } catch { return []; } }, []);
  const cells = g?.cells || []; const used = g?.used || 0; const filled = cells.filter((c) => c && c.ok).length; const over = !!g && (used >= 9 || filled === 9 || g.over);
  useLeaveGuard(!!grid && used > 0 && !over);
  if (!g) return <Loading />;
  if (!grid) return <Screen header={false}><Note>Could not build a grid from the history.</Note><Btn onPress={restart}>Try again</Btn></Screen>;
  const taken = new Set(cells.filter((c) => c && c.ok).map((c) => c.idx));
  const sugg = (() => { const n = norm(q); if (n.length < 2) return []; return facts.filter((d) => !taken.has(d.idx) && norm(d.name).includes(n)).sort((a, b) => b.starts - a.starts).slice(0, 5); })();
  const pick = (d) => { if (sel === null) return; const ok = grid.cells[sel].includes(d.idx); ok ? hap.good() : hap.bad(); const nc = [...cells]; if (ok) nc[sel] = { ok: true, idx: d.idx, name: d.name }; upd({ cells: nc, used: used + 1, over: used + 1 >= 9 || nc.filter((c) => c && c.ok).length === 9 }); setMsg(ok ? `${d.name} fits.` : `${d.name} does not fit that square.`); setQ(''); if (ok) setSel(null); };
  const txt = `F1 Companion driver grid: ${filled}/9\n${[0, 1, 2].map((r) => [0, 1, 2].map((c) => (cells[r * 3 + c]?.ok ? '🟩' : '⬛')).join('')).join('\n')}`;
  const board = (
    <Card>
      <View style={{ flexDirection: 'row', marginLeft: 76, gap: 6 }}>{grid.cols.map((c) => <Text key={c} style={{ flex: 1, color: colors.gold, fontSize: 11, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>{c}</Text>)}</View>
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Text style={{ width: 70, color: colors.accent, fontSize: 11, fontWeight: '800' }} numberOfLines={2}>{grid.rows[r]}</Text>
          {[0, 1, 2].map((c) => { const i = r * 3 + c; const f = cells[i]; return (
            <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${grid.rows[r]}, ${grid.cols[c]}${f?.ok ? `, ${f.name}` : ''}`} onPress={() => { if (!f?.ok && !over) { setSel(i); setMsg(''); } }} style={{ flex: 1, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1.5, borderColor: sel === i ? colors.accent : f?.ok ? colors.good : colors.line, backgroundColor: f?.ok ? alpha(colors.good, 0.2) : sel === i ? alpha(colors.accent, 0.14) : colors.card }}>
              <Text style={{ color: colors.fg, fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={3}>{f?.ok ? f.name : ''}</Text></Pressable>); })}
        </View>))}
    </Card>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Driver grid</Eyebrow><Note>{`Fill each square with a driver who raced for that team and fits the clue. You have 9 guesses and each driver counts once. ${9 - used} left.`}</Note></Card>
      {over ? <ShareResult text={txt}>{board}</ShareResult> : board}
      {over ? (<><Note>{`${filled} of 9 squares filled.`}</Note><Btn tone="solid" onPress={() => { setSel(null); setQ(''); setMsg(''); restart(); }}>New grid</Btn></>) : (
        <>
          <Note>{sel === null ? 'Tap a square first.' : 'Now type a driver and pick them from the list.'}</Note>
          {sel !== null ? <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Driver name" placeholderTextColor={colors.muted} accessibilityLabel="Driver name" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} /> : null}
          <Suggest list={sugg} onPick={pick} />
          {msg ? <Text style={{ color: colors.fg, fontWeight: '700' }}>{msg}</Text> : null}
        </>)}
    </Screen>);
}

// ---------- Surname chain: each driver's surname must start with the last letter of the one before ----------
const plainEnd = (s) => norm(s).replace(/[^a-z]/g, '').slice(-1); const plainStart = (s) => norm(s).replace(/[^a-z]/g, '').slice(0, 1);
export function SurnameChainScreen() {
  const [g, upd, restart] = useGameSave('chain', () => ({ seed: Date.now(), chain: [], score: 0, over: false, why: '' })); const later = useTimers();
  const [q, setQ] = useState(''); const [msg, setMsg] = useState(''); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('chain:best', 0).then(setBest); }, []);
  const facts = useMemo(() => { try { return driverFacts(); } catch { return []; } }, []);
  const famous = useMemo(() => facts.filter((d) => d.starts >= 30), [facts]);
  useEffect(() => { if (g && !g.over && g.chain.length === 0 && famous.length) { const r = rngOf(seedOf(`ch${g.seed}`)); const d = famous[Math.floor(r() * famous.length)]; upd({ chain: [d.last] }); } }, [g?.seed, g?.chain?.length, famous.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const chain = g?.chain || []; const over = !!g?.over; useLeaveGuard(!!g && !over && (g.score || 0) > 0);
  if (!g) return <Loading />;
  const need = chain.length ? plainEnd(chain[chain.length - 1]) : ''; const usedSet = new Set(chain.map((x) => norm(x)));
  const finish = (why) => { upd({ over: true, why }); if ((g.score || 0) > best) { setBest(g.score || 0); kvSet('chain:best', g.score || 0); } else kvSet('chain:last', g.score || 0); };
  const sugg = (() => { const n = norm(q); if (!need || n.length < 1) return []; const seen = new Set(); return facts.filter((d) => plainStart(d.last) === need && !usedSet.has(norm(d.last)) && norm(d.last).includes(n)).sort((a, b) => b.starts - a.starts).filter((d) => (seen.has(norm(d.last)) ? false : seen.add(norm(d.last)))).slice(0, 6); })();
  const play = (d) => { hap.good(); setQ(''); setMsg('');
    const mine = [...chain, d.last]; const nextNeed = plainEnd(d.last); const used2 = new Set(mine.map((x) => norm(x)));
    const options = famous.filter((x) => plainStart(x.last) === nextNeed && !used2.has(norm(x.last)));
    const score = (g.score || 0) + 1;
    if (!options.length) { upd({ chain: mine, score, over: true, why: `No driver left starting with ${nextNeed.toUpperCase()}. You win this round.` }); if (score > best) { setBest(score); kvSet('chain:best', score); } return; }
    const reply = options[Math.floor(rngOf(seedOf(`ch${g.seed}:${mine.length}`))() * options.length)];
    upd({ chain: [...mine, reply.last], score }); };
  if (over) return (
    <Screen header={false}>
      <ShareResult text={`F1 Companion surname chain: ${g.score} drivers in a row\n${chain.join(' > ')}`}><Card><Eyebrow>Surname chain</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${g.score} in a row`}</Text><Note>{`${g.why || ''} Best ${Math.max(best, g.score || 0)}.`}</Note><Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>{chain.join(' > ')}</Text></Card></ShareResult>
      <Btn tone="solid" onPress={() => { setQ(''); setMsg(''); restart(); }}>Play again</Btn>
    </Screen>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Surname chain · ${g.score || 0} played · best ${best}`}</Eyebrow>
        <Text style={{ color: colors.muted, marginTop: 6 }}>{chain.length ? 'Last driver' : 'Starting…'}</Text><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{chain[chain.length - 1] || '…'}</Text>
        {need ? <Note>{`Name a driver whose surname starts with ${need.toUpperCase()}. Drivers cannot repeat.`}</Note> : null}</Card>
      <TextInput value={q} onChangeText={setQ} placeholder={need ? `A surname starting with ${need.toUpperCase()}` : ''} placeholderTextColor={colors.muted} autoCapitalize="none" accessibilityLabel="Driver surname" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} />
      <Suggest list={sugg} onPick={play} />
      {q.length >= 2 && !sugg.length ? <Note>No unused driver matches that, starting with the right letter.</Note> : null}
      {msg ? <Note>{msg}</Note> : null}
      <Btn onPress={() => finish(`You gave up with ${g.score || 0} played.`)}>I am stuck</Btn>
    </Screen>);
}

// ---------- Guess the year: a race result is shown, set the year ----------
const N = 8;
export function GuessYearScreen() {
  const run = useRun('gyear'); const { seed, i, score } = run; const later = useTimers(); const [y, setY] = useState(2000); const [shown, setShown] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('gyear:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { if (!seed) return []; const r = rngOf(seedOf(`gy${seed}`)); const out = []; for (let k = 0; k < 60 && out.length < N; k++) { try { const x = raceSample(r); if (x) out.push(x); } catch {} } return out; }, [seed]);
  useEffect(() => { setY(2000); setShown(null); }, [i, seed]);
  const done = rounds.length > 0 && i >= rounds.length; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Loading />;
  if (rounds.length < N) return <Screen header={false}><Note>Could not build rounds from the history.</Note></Screen>;
  if (done) return (<Screen header={false}><ShareResult text={`F1 Companion guess the year: ${score}/${N * 100}`}><Card><Eyebrow>Guess the year</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${score} / ${N * 100}`}</Text><Note>{`Best ${Math.max(best, score)}.`}</Note></Card></ShareResult><Btn tone="solid" onPress={run.again}>Play again</Btn></Screen>);
  const q = rounds[i]; const pts = (g) => Math.max(0, 100 - 8 * Math.abs(g - q.year));
  const lock = () => { if (shown !== null) return; const p = pts(y); setShown(p); p >= 92 ? hap.good() : hap.tap(); run.setScore(score + p);
    later(() => { run.setI((x) => x + 1); if (i + 1 >= rounds.length) { run.finish(); const t = score + p; if (t > best) { setBest(t); kvSet('gyear:best', t); } } }, 2000); };
  const step = (d) => setY((v) => Math.min(2025, Math.max(1950, v + d)));
  const Chip = ({ d }) => (<Pressable accessibilityRole="button" onPress={() => shown === null && step(d)} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{d > 0 ? `+${d}` : d}</Text></Pressable>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Guess the year · ${i + 1} of ${N} · ${score} pts`}</Eyebrow>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800', marginTop: 6 }}>{q.name}</Text>
        <Text style={{ color: colors.fg, marginTop: 6 }}>{`Won by ${q.winner} (${q.team})`}</Text><Text style={{ color: colors.muted, marginTop: 2 }}>{`Then ${q.second} and ${q.third}${q.pole ? `. Pole: ${q.pole}` : ''}. ${q.starters} cars started.`}</Text></Card>
      <Card><Text style={{ color: shown !== null ? colors.gold : colors.fg, fontSize: 48, fontWeight: '900', textAlign: 'center' }}>{y}</Text>
        {shown !== null ? <Text style={{ color: colors.fg, textAlign: 'center' }}>{`It was ${q.year}. ${shown} points.`}</Text> : null}</Card>
      <View style={{ flexDirection: 'row', gap: 8 }}><Chip d={-10} /><Chip d={-5} /><Chip d={-1} /><Chip d={1} /><Chip d={5} /><Chip d={10} /></View>
      <Btn tone="solid" onPress={lock}>Lock it in</Btn>
      <Note>100 points for the exact year, 8 fewer for every year off.</Note>
    </Screen>);
}
