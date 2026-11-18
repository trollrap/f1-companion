import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import ShareResult from '../components/ShareResult';
import { colors, alpha } from '../theme';
import { GameHeader, Lives, Prompt, Answer, Feedback, ResultPanel, TurnBanner, Hint } from '../components/GameKit';
import { Ionicons } from '@expo/vector-icons';
import { norm } from '../lib/names';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers, useRun } from '../lib/gameSave';
import { ladderQ } from '../lib/trivia';
import { catOf } from '../lib/gameCatalog';
import { teammateQ, bingoCard, bingoSearch, bingoCheck, nameOfIdx } from '../api/history';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;
const LET = ['A', 'B', 'C', 'D'];
const Opt = ({ text, state, onPress, i }) => <Answer letter={LET[i]} label={text} state={state} onPress={onPress} disabled={state === 'locked'} />;

// ---------- Pass-and-play duel: two players share one phone and take turns; three lives each ----------
const duelQ = (seed, t) => { for (let k = 0; k < 4; k++) { const q = ladderQ(rngOf(seedOf(`duel${seed}:${t}:${k}`)), Math.floor(t / 4)); if (q) return q; } return null; };
export function DuelScreen() {
  const [g, upd, restart] = useGameSave('duel', () => ({ seed: Date.now(), t: 0, lives: [3, 3], score: [0, 0] })); const later = useTimers();
  const [pick, setPick] = useState(null); const [shown, setShown] = useState(false);
  const t = g?.t || 0; const q = useMemo(() => (g && g.seed ? duelQ(g.seed, t) : null), [g?.seed, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const lives = g?.lives || [3, 3]; const score = g?.score || [0, 0]; const who = t % 2; const over = !!g && (lives[0] <= 0 || lives[1] <= 0);
  useLeaveGuard(!!g && !over && t > 0);
  if (!g) return <Loading />;
  if (over || !q) {
    const win = lives[0] <= 0 ? 1 : lives[1] <= 0 ? 0 : score[0] >= score[1] ? 0 : 1;
    const txt = `F1 Companion pass-and-play duel: Player ${win + 1} won, ${score[win]} to ${score[1 - win]}.`;
    return (
      <Screen header={false}>
        <ShareResult text={txt}><ResultPanel cat="two" kicker="Pass-and-play duel" big={`Player ${win + 1} wins`} sub={`${score[0]} correct for Player 1, ${score[1]} for Player 2`} icon="trophy" /></ShareResult>
        <Btn tone="solid" icon="refresh" onPress={() => { setPick(null); setShown(false); restart(); }}>Rematch</Btn>
      </Screen>);
  }
  const hdr = <GameHeader cat="two" icon="people-circle" title="Pass-and-play duel" hint="Two players share one phone and take turns. A wrong answer costs a life. Lose all three and you lose. Questions get harder as the game goes on." stats={[['P1 score', score[0]], ['P2 score', score[1]], ['Turn', t + 1]]} />;
  const livesRow = (<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}><View style={{ alignItems: 'flex-start', gap: 2 }}><Text style={{ color: colors.muted, fontSize: 11 }}>PLAYER 1</Text><Lives n={lives[0]} /></View><View style={{ alignItems: 'flex-end', gap: 2 }}><Text style={{ color: colors.muted, fontSize: 11 }}>PLAYER 2</Text><Lives n={lives[1]} /></View></View>);
  if (!shown) return (
    <Screen header={false}>
      {hdr}{livesRow}
      <TurnBanner who={who + 1} label={`Player ${who + 1}, your turn`} />
      <Hint>Hand over the phone, then tap. Nobody peeks.</Hint>
      <Btn tone="solid" icon="play" onPress={() => setShown(true)}>{`I'm Player ${who + 1}`}</Btn>
    </Screen>);
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.answer; ok ? hap.good() : hap.bad();
    later(() => { setPick(null); setShown(false); const l = [...lives], s = [...score]; if (ok) s[who]++; else l[who]--; const done = l[who] <= 0; upd({ t: t + 1, lives: l, score: s, over: done }); if (done) kvSet('duel:last', { w: 1 - who, s }); }, 1700); };
  return (
    <Screen header={false}>
      {hdr}{livesRow}
      <Prompt kicker={`Player ${who + 1} · ${q.kind}`} color={who ? colors.good : colors.accent}>{q.q}</Prompt>
      {q.options.map((o, k) => <Opt key={`${t}${k}`} i={k} text={o} onPress={() => choose(k)} state={pick === null ? '' : k === q.answer ? 'right' : pick === k ? 'wrong' : 'locked'} />)}
      {pick !== null ? <Feedback ok={pick === q.answer}>{q.why}</Feedback> : null}
    </Screen>);
}

// ---------- Who was the team-mate: ten rounds ----------
const N = 10;
export function TeamMateGameScreen() {
  const run = useRun('mate'); const { seed, i, score } = run; const later = useTimers(); const [pick, setPick] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('mate:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { if (!seed) return []; const r = rngOf(seedOf(`mate${seed}`)); const out = []; for (let k = 0; k < N * 4 && out.length < N; k++) { try { const q = teammateQ(r); if (q && !out.some((x) => x.q === q.q)) out.push(q); } catch {} } return out; }, [seed]);
  const done = rounds.length > 0 && i >= rounds.length; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Loading />;
  if (rounds.length < 5) return <Screen header={false}><Note>The built-in history could not build team-mate questions.</Note></Screen>;
  if (done) return (
    <Screen header={false}>
      <ShareResult text={`F1 Companion team-mate quiz: ${score}/${rounds.length}\n${'🟩'.repeat(score)}${'⬛'.repeat(rounds.length - score)}`}><ResultPanel cat="quiz" kicker="Who was the team-mate" big={`${score} / ${rounds.length}`} sub={`Best ${Math.max(best, score)}`} best={score > 0 && score >= best} /></ShareResult>
      <Btn tone="solid" icon="refresh" onPress={() => { setPick(null); run.again(); }}>Play again</Btn>
    </Screen>);
  const q = rounds[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.answer; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) run.setScore(sc);
    later(() => { setPick(null); run.setI((x) => x + 1); if (i + 1 >= rounds.length) { run.finish(); if (sc > best) { setBest(sc); kvSet('mate:best', sc); } } }, 1500); };
  return (
    <Screen header={false}>
      <GameHeader cat="quiz" icon="people" title="Team-mate quiz" hint="Name the driver who shared the car for a season. Seasons from 1970. Ten rounds, saved as you go." stats={[['Round', `${i + 1}/${rounds.length}`], ['Score', score], ['Best', best]]} />
      <Prompt kicker={`Round ${i + 1}`}>{q.q}</Prompt>
      {q.options.map((o, k) => <Opt key={`${i}${k}`} i={k} text={o} onPress={() => choose(k)} state={pick === null ? '' : k === q.answer ? 'right' : pick === k ? 'wrong' : 'locked'} />)}
      {pick !== null ? <Feedback ok={pick === q.answer}>{q.why}</Feedback> : null}
    </Screen>);
}

// ---------- Career bingo: nine career clues on a 3 by 3 card; name a driver who fits each; a line of three is a bingo ----------
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const MAX_MISS = 6;
export function CareerBingoScreen() {
  const [g, upd, restart] = useGameSave('cbingo', () => { const cells = bingoCard(rngOf(seedOf(`cb${Date.now()}`))); return cells ? { cells, got: {}, miss: 0 } : null; });
  const [sel, setSel] = useState(null); const [text, setText] = useState(''); const [msg, setMsg] = useState(''); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('cbingo:best', 0).then(setBest); }, []);
  const got = g?.got || {}; const miss = g?.miss || 0; const cells = g?.cells || [];
  const lines = LINES.filter((l) => l.every((k) => got[k])).length; const nGot = Object.keys(got).length;
  const over = !!g && cells.length === 9 && (lines > 0 || miss >= MAX_MISS || nGot === 9);
  useLeaveGuard(!!g && cells.length === 9 && !over && (nGot > 0 || miss > 0));
  const hits = useMemo(() => (sel === null ? [] : bingoSearch(text, norm)), [sel, text]);
  if (!g) return <Loading />;
  if (cells.length !== 9) return <Screen header={false}><Note>The built-in history could not build a bingo card.</Note></Screen>;
  const finish = (n, l) => { const sc = n + l * 3; kvSet('cbingo:last', sc); if (sc > best) { setBest(sc); kvSet('cbingo:best', sc); } };
  if (over) {
    const sc = nGot + lines * 3; const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (got[r * 3 + c] ? '🟩' : '⬛')).join('')).join('\n');
    return (
      <Screen header={false}>
        <ShareResult text={`F1 Companion career bingo: ${lines ? 'BINGO' : 'no line'}, ${nGot}/9\n${grid}`}><ResultPanel cat="puzzle" win={!!lines} kicker="Career bingo" big={lines ? 'Bingo!' : 'Out of guesses'} sub={`${nGot} of 9 squares, ${lines} line${lines === 1 ? '' : 's'}. Score ${sc}. Best ${Math.max(best, sc)}.`} best={sc > 0 && sc >= best} /></ShareResult>
        <Btn tone="solid" icon="refresh" onPress={() => { setSel(null); setText(''); setMsg(''); restart(); }}>New card</Btn>
      </Screen>);
  }
  const pickDriver = (h) => {
    const used = Object.values(got).includes(h.idx); if (used) { setMsg(`${h.name} is already on the card.`); return; }
    if (bingoCheck(cells[sel], h.idx)) { hap.good(); const ng = { ...got, [sel]: h.idx }; const nl = LINES.filter((l) => l.every((k) => ng[k])).length; const done = nl > 0 || Object.keys(ng).length === 9; upd({ got: ng, over: done }); if (done) finish(Object.keys(ng).length, nl); setSel(null); setText(''); setMsg(`${h.name} fits.`); }
    else { hap.bad(); const m = miss + 1; upd({ miss: m, over: m >= MAX_MISS }); if (m >= MAX_MISS) finish(nGot, lines); setMsg(`${h.name} does not fit "${cells[sel].label}".`); }
  };
  const nameOf = (idx) => { try { return nameOfIdx(idx); } catch { return ''; } };
  const pc = catOf('puzzle').color;
  return (
    <Screen header={false}>
      <GameHeader cat="puzzle" icon="apps" title="Career bingo" hint="Tap a square, then name a driver who fits it. Each driver can be used once. Three in a line wins. Six misses and it is over." stats={[['Squares', `${nGot}/9`], ['Lines', lines], ['Misses left', MAX_MISS - miss]]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cells.map((c, k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${c.label}${got[k] ? `, ${nameOf(got[k])}` : ''}`} onPress={() => { if (!got[k]) { setSel(k); setText(''); setMsg(''); } }} style={{ width: '31.5%', minHeight: 100, padding: 8, borderRadius: 16, borderWidth: 1.5, borderColor: sel === k ? colors.fg : got[k] ? colors.good : alpha(pc, 0.4), backgroundColor: got[k] ? alpha(colors.good, 0.2) : alpha(pc, 0.12), justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            {got[k] ? <Ionicons name="checkmark-circle" size={20} color={colors.good} /> : <Ionicons name="help-circle-outline" size={20} color={alpha(pc, 0.8)} />}
            <Text style={{ color: colors.fg, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{c.label}</Text>
            {got[k] ? <Text style={{ color: colors.good, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>{nameOf(got[k])}</Text> : null}
          </Pressable>))}
      </View>
      {sel !== null ? (
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: alpha(pc, 0.5), gap: 6 }}>
          <Text style={{ color: pc, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{cells[sel].label.toUpperCase()}</Text>
          <TextInput value={text} onChangeText={setText} autoFocus placeholder="Type a driver's name" placeholderTextColor={colors.muted} autoCorrect={false} accessibilityLabel="Driver name" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.bg }} />
          {hits.map((h) => (<Pressable key={h.idx} accessibilityRole="button" onPress={() => pickDriver(h)} style={{ paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>{h.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${h.starts} starts`}</Text></Pressable>))}
        </View>) : null}
      {msg ? <Feedback ok={msg.endsWith('fits.')}>{msg}</Feedback> : null}
    </Screen>);
}
