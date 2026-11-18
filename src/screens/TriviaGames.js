import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import ShareResult from '../components/ShareResult';
import { Answer } from '../components/GameKit';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf, today } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';
import { ladderQ } from '../lib/trivia';
import { makeWordSearch, lineCells, SIZE } from '../lib/wordSearch';

const Opt = ({ text, state, onPress, i }) => <Answer letter={'ABCD'[i]} label={text} state={state} onPress={onPress} />;
const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;

// ---------- Trivia ladder: endless mixed questions, three lives, harder every few steps ----------
const qAt = (seed, n) => { for (let t = 0; t < 4; t++) { const q = ladderQ(rngOf(seedOf(`lad${seed}:${n}:${t}`)), n); if (q) return q; } return null; };
export function TriviaLadderScreen() {
  const [g, upd, restart] = useGameSave('ladder', () => ({ seed: Date.now(), n: 0, score: 0, lives: 3 })); const later = useTimers();
  const [pick, setPick] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('ladder:best', 0).then(setBest); }, []);
  const q = useMemo(() => (g && g.seed ? qAt(g.seed, g.n || 0) : null), [g?.seed, g?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = g?.n || 0; const score = g?.score || 0; const lives = g?.lives ?? 3; const over = !!g && lives <= 0;
  useLeaveGuard(!!g && !over && n > 0);
  if (!g) return <Loading />;
  const finish = (score) => { if (score > best) { setBest(score); kvSet('ladder:best', score); } else kvSet('ladder:last', score); };
  if (over || (g && !q)) {
    const txt = `F1 Companion trivia ladder: I got ${score} right before running out of lives.\n${'🟩'.repeat(Math.min(score, 15))}${'🟥'.repeat(3)}`;
    return (
      <Screen header={false}>
        <ShareResult text={txt}><Card><Eyebrow>Trivia ladder</Eyebrow><Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800' }}>{`${score} correct`}</Text><Note>{`Best ${Math.max(best, score)}.`}</Note></Card></ShareResult>
        <Btn tone="solid" onPress={() => { setPick(null); restart(); }}>Climb again</Btn>
      </Screen>);
  }
  const level = Math.floor(n / 4) + 1;
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.answer; ok ? hap.good() : hap.bad();
    later(() => { setPick(null); if (ok) upd({ n: n + 1, score: score + 1 }); else { const l = lives - 1; upd({ lives: l, n: n + 1, over: l <= 0 }); if (l <= 0) finish(score); } }, 1700); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Trivia ladder · level ${level} · ${q.kind}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600', marginTop: 6 }}>{q.q}</Text><Note>{`${'❤️'.repeat(lives)}${'🖤'.repeat(3 - lives)}   Best ${best}`}</Note></Card>
      {q.options.map((o, k) => <Opt key={`${n}${k}`} i={k} text={o} onPress={() => choose(k)} state={pick === null ? '' : k === q.answer ? 'right' : pick === k ? 'wrong' : ''} />)}
      {pick !== null ? <Note>{`${pick === q.answer ? 'Correct. ' : 'Not quite. '}${q.why}`}</Note> : null}
    </Screen>);
}

// ---------- Daily shared puzzle: the same five questions for everyone each day ----------
const LEVELS = [0, 2, 4, 6, 9];
const dayQs = (day) => { const r = rngOf(seedOf(`daily-puzzle:${day}`)); return LEVELS.map((l) => ladderQ(r, l)); };
const dayBefore = (day) => { const [y, m, d] = day.split('-').map(Number); const t = new Date(y, m - 1, d - 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
export function DailyPuzzleScreen() {
  const day = today(); const qs = useMemo(() => { try { return dayQs(day); } catch { return []; } }, [day]);
  const later = useTimers(); const [st, setSt] = useState(null); const [pick, setPick] = useState(null); const [streak, setStreak] = useState(0);
  useEffect(() => { kvGet('daily:puzzle', null).then((s) => setSt(s && s.day === day ? s : { day, a: [] })); kvGet('daily:puzzleStreak', { last: '', n: 0 }).then((s) => setStreak(s.n || 0)); }, [day]);
  const a = st?.a || []; const done = qs.length > 0 && a.length >= qs.length;
  useLeaveGuard(!!st && a.length > 0 && !done);
  if (!st) return <Loading />;
  if (qs.length < 5 || qs.some((x) => !x)) return <Screen header={false}><Note>Could not build today's puzzle from the history.</Note></Screen>;
  const save = (ns) => { setSt(ns); kvSet('daily:puzzle', ns); };
  if (done) {
    const marks = qs.map((q, i) => (a[i] === q.answer ? '🟩' : '🟥')); const score = marks.filter((m) => m === '🟩').length;
    const txt = `F1 Companion daily ${day}\n${marks.join('')} ${score}/5`;
    return (
      <Screen header={false}>
        <ShareResult text={txt}><Card><Eyebrow>{`Daily puzzle · ${day}`}</Eyebrow><Text style={{ fontSize: 30, marginTop: 4 }}>{marks.join(' ')}</Text><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', marginTop: 6 }}>{`${score} / 5`}</Text><Note>{streak > 1 ? `${streak} days in a row.` : 'Come back tomorrow for a new one.'}</Note></Card></ShareResult>
        {qs.map((q, i) => (<Card key={i}><Eyebrow>{`${i + 1}. ${q.kind}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 14 }}>{q.q.split('\n')[0]}</Text><Text style={{ color: a[i] === q.answer ? colors.good : colors.accent, fontSize: 14, marginTop: 4 }}>{`${a[i] === q.answer ? 'Right' : 'Wrong'}: ${q.options[q.answer]}. ${q.why}`}</Text></Card>))}
      </Screen>);
  }
  const i = a.length; const q = qs[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); k === q.answer ? hap.good() : hap.bad();
    later(async () => { setPick(null); const ns = { day, a: [...a, k] }; save(ns); if (ns.a.length >= qs.length) { const s = await kvGet('daily:puzzleStreak', { last: '', n: 0 }); const n = s.last === day ? s.n : s.last === dayBefore(day) ? s.n + 1 : 1; await kvSet('daily:puzzleStreak', { last: day, n }); setStreak(n); } }, 1500); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Daily puzzle · ${i + 1} of 5 · ${q.kind}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600', marginTop: 6 }}>{q.q}</Text><Note>Everyone gets these same five today. One go each.</Note></Card>
      {q.options.map((o, k) => <Opt key={`${i}${k}`} i={k} text={o} onPress={() => choose(k)} state={pick === null ? '' : k === q.answer ? 'right' : pick === k ? 'wrong' : ''} />)}
      {pick !== null ? <Note>{`${pick === q.answer ? 'Correct. ' : 'Not quite. '}${q.why}`}</Note> : null}
    </Screen>);
}

// ---------- Word search: tap the first and last letter of a hidden driver, team or circuit ----------
const key = (c) => `${c[0]},${c[1]}`;
export function WordSearchScreen() {
  const [g, upd, restart] = useGameSave('wordsearch', () => ({ seed: Date.now(), found: [] })); const { width } = useWindowDimensions(); const [start, setStart] = useState(null); const [msg, setMsg] = useState(''); const [wins, setWins] = useState(0);
  useEffect(() => { kvGet('wordsearch:wins', 0).then(setWins); }, []);
  const puz = useMemo(() => { if (!g?.seed) return null; try { return makeWordSearch(rngOf(seedOf(`ws${g.seed}`))); } catch { return null; } }, [g?.seed]);
  const found = g?.found || []; const won = !!puz && found.length === puz.words.length;
  useLeaveGuard(!!puz && !won && found.length > 0);
  if (!g) return <Loading />;
  if (!puz) return <Screen header={false}><Note>Could not build a grid from the history.</Note><Btn onPress={restart}>Try again</Btn></Screen>;
  const cell = Math.floor(Math.min(width - 32, 420) / SIZE);
  const lit = new Set(); found.forEach((wi) => lineCells(puz.words[wi].a, puz.words[wi].b).forEach((c) => lit.add(key(c))));
  const tap = (r, c) => { if (won) return; hap.tap();
    if (!start) { setStart([r, c]); setMsg(''); return; }
    const cells = lineCells(start, [r, c]); setStart(null); if (!cells) { setMsg('Pick a straight line: across, down or diagonal.'); return; }
    const word = cells.map(([i, j]) => puz.grid[i][j]).join(''); const rev = [...word].reverse().join('');
    const wi = puz.words.findIndex((w, k) => !found.includes(k) && (w.w === word || w.w === rev));
    if (wi < 0) { hap.bad(); setMsg('Not one of the words.'); return; }
    hap.good(); setMsg(`${puz.words[wi].text}!`); const nf = [...found, wi]; upd({ found: nf, over: nf.length === puz.words.length });
    if (nf.length === puz.words.length) { const w = wins + 1; setWins(w); kvSet('wordsearch:wins', w); } };
  const txt = `F1 Companion word search: found all ${puz.words.length} hidden words.\n${puz.words.map((w) => `${w.cat === 'Driver' ? '🧑‍✈️' : w.cat === 'Team' ? '🏎️' : '🏁'} ${w.text}`).join('\n')}`;
  const board = (
    <Card>
      <View style={{ alignSelf: 'center' }}>
        {puz.grid.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((ch, c) => { const isStart = start && start[0] === r && start[1] === c; const on = lit.has(key([r, c]));
              return (<Pressable key={c} accessibilityLabel={`${ch}, row ${r + 1} column ${c + 1}`} onPress={() => tap(r, c)} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: isStart ? alpha(colors.accent, 0.4) : on ? alpha(colors.good, 0.28) : 'transparent' }}><Text style={{ color: on ? colors.good : colors.fg, fontSize: Math.floor(cell * 0.5), fontWeight: '800' }}>{ch}</Text></Pressable>); })}
          </View>))}
      </View>
    </Card>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Word search</Eyebrow><Note>{start ? 'Now tap the last letter.' : 'Tap the first letter of a word, then its last letter. Words can run in any direction.'}</Note>{msg ? <Text style={{ color: colors.fg, fontWeight: '700', marginTop: 4 }}>{msg}</Text> : null}</Card>
      {won ? <ShareResult text={txt}>{board}</ShareResult> : board}
      <Card>
        <Eyebrow>{`Find ${puz.words.length - found.length} more`}</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {puz.words.map((w, k) => (<View key={w.w} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: found.includes(k) ? alpha(colors.good, 0.2) : alpha(colors.fg, 0.06) }}><Text style={{ color: found.includes(k) ? colors.good : colors.fg, fontSize: 13, fontWeight: '700', textDecorationLine: found.includes(k) ? 'line-through' : 'none' }}>{found.includes(k) ? w.text : `${w.cat}, ${w.w.length} letters`}</Text></View>))}
        </View>
      </Card>
      {won ? <Note>{`Solved. ${wins} grid${wins === 1 ? '' : 's'} solved so far.`}</Note> : null}
      <Btn tone={won ? 'solid' : undefined} onPress={() => { setStart(null); setMsg(''); restart(); }}>{won ? 'New grid' : 'Skip to a new grid'}</Btn>
    </Screen>);
}
