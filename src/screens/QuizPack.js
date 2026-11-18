import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import ShareResult from '../components/ShareResult';
import { Answer } from '../components/GameKit';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { useRun, useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';
import { makeSeasonQ, makeCareerQ, makePairs, makeShowdown } from '../lib/quizPack';

const N = 10;
const Opt = ({ text, state, onPress, i }) => <Answer letter={'ABCD'[i]} label={text} state={state} onPress={onPress} />;

// Shared shell for the ten-round multiple-choice games. `render(q)` draws the question card, `explain(q)` the line after answering.
function Rounds({ id, title, make, render, explain, packKey, packAt }) {
  const run = useRun(id); const { seed, i, score } = run; const later = useTimers(); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  React.useEffect(() => { kvGet(`${id}:best`, 0).then(setBest); }, [id]);
  const rounds = useMemo(() => { if (!seed) return []; const r = rngOf(seedOf(`${id}${seed}`)); const out = []; for (let k = 0; k < N * 3 && out.length < N; k++) { try { const q = make(r); if (q) out.push(q); } catch {} } return out; }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rounds.length; const done = total > 0 && i >= total; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (total < 3) return <Screen header={false}><Note>Not enough history to make a round.</Note></Screen>;
  if (done) return (<Screen header={false}><ShareResult text={`F1 Companion ${title}: ${score}/${total}\n${'🟩'.repeat(score)}${'⬛'.repeat(total - score)}`}><Card><Eyebrow>{title}</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${score} / ${total}`}</Text><Note>{`Best ${Math.max(best, score)}.`}</Note>{got ? <Note>You earned a card pack.</Note> : null}</Card></ShareResult><Btn tone="solid" onPress={() => { setPick(null); setGot(false); run.again(); }}>Play again</Btn></Screen>);
  const q = rounds[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.answer; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) run.setScore(sc);
    later(async () => { setPick(null); run.setI((x) => x + 1); if (i + 1 >= total) { run.finish(); if (sc > best) { setBest(sc); kvSet(`${id}:best`, sc); } if (sc >= packAt) setGot(await awardPack(packKey)); } }, 1800); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`${title} · ${i + 1} of ${total}`}</Eyebrow>{render(q)}</Card>
      {q.options.map((o, k) => <Opt key={`${i}${k}`} i={k} text={o} onPress={() => choose(k)} state={pick === null ? '' : k === q.answer ? 'right' : pick === k ? 'wrong' : ''} />)}
      {pick !== null ? <Note>{`${pick === q.answer ? 'Correct. ' : 'Not quite. '}${explain(q)}`}</Note> : null}
    </Screen>);
}

export const NameSeasonScreen = () => (
  <Rounds id="season" title="Name that season" make={makeSeasonQ} packKey="season:8" packAt={8}
    render={(q) => (<View style={{ marginTop: 6, gap: 3 }}><Text style={{ color: colors.muted, fontSize: 13 }}>{`Final top five${q.races ? `, ${q.races} races` : ''}. Which year?`}</Text>{q.rows.map((r, k) => (<View key={r.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 16 }}>{`${k + 1}. ${r.name}`}</Text><Text style={{ color: colors.muted }}>{`${r.team || ''}  ${r.pts}`}</Text></View>))}</View>)}
    explain={(q) => `It was ${q.year}.`} />);
export const CareerPathScreen = () => (
  <Rounds id="path" title="Career path" make={makeCareerQ} packKey="path:8" packAt={8}
    render={(q) => (<View style={{ marginTop: 6 }}><Text style={{ color: colors.muted, fontSize: 13 }}>Raced for these teams, in this order. Who is it?</Text><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', marginTop: 6 }}>{q.path.join('  >  ')}</Text></View>)}
    explain={(q) => `${q.name}, ${q.years}.`} />);

export function ShowdownScreen() {
  const rr = useRef(rngOf(seedOf(`sd${Date.now()}`))).current; const later = useTimers(); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  const [g, upd, restart, ref] = useGameSave('showdown', () => ({ q: makeShowdown(rr), streak: 0, lives: 3, over: false }));
  React.useEffect(() => { kvGet('sd:best', 0).then(setBest); }, []);
  const q = g?.q; const over = !!g?.over; useLeaveGuard(!!q && !over && (g.streak > 0 || g.lives < 3));
  if (!g) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (!q) return <Screen header={false}><Note>Not enough history to make a round.</Note></Screen>;
  const choose = (k) => { if (pick !== null || over) return; setPick(k); const ok = k === q.win; ok ? hap.good() : hap.bad();
    later(async () => { const G = ref.current; const n = G.streak + (ok ? 1 : 0); const lives = G.lives - (ok ? 0 : 1); if (n > best) { setBest(n); kvSet('sd:best', n); } if (n >= 15) setGot(await awardPack('sd:15')); setPick(null); upd({ streak: n, lives, over: lives <= 0, q: lives <= 0 ? G.q : makeShowdown(rr) }); }, 1500); };
  if (over) return (<Screen header={false}><Card><Eyebrow>Stat showdown</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${g.streak} right`}</Text><Note>{`Best ${Math.max(best, g.streak)}.`}</Note>{got ? <Note>You earned a card pack.</Note> : null}</Card><Btn tone="solid" onPress={() => { setPick(null); setGot(false); restart(); }}>Play again</Btn></Screen>);
  const names = [q.a, q.b]; const vals = [q.av, q.bv];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Stat showdown</Eyebrow><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{`Who has more ${q.label}?`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`Streak ${g.streak} · ${'♥'.repeat(g.lives)}${'♡'.repeat(3 - g.lives)}`}</Text></Card>
      {names.map((n, k) => (<Opt key={`${g.streak}${k}`} i={k} text={pick !== null ? `${n}: ${vals[k]}` : n} onPress={() => choose(k)} state={pick === null ? '' : k === q.win ? 'right' : pick === k ? 'wrong' : ''} />))}
    </Screen>);
}

export function MatchPairsScreen() {
  const rr = useRef(rngOf(seedOf(`mp${Date.now()}`))).current; const later = useTimers(); const [open, setOpen] = useState([]); const lock = useRef(false);
  const [g, upd, restart] = useGameSave('pairs', () => { const p = makePairs(rr); return p ? { cards: p.cards, done: [], moves: 0, over: false } : null; });
  const done = g?.done || []; const finished = !!g?.cards && done.length === g.cards.length; useLeaveGuard(!!g?.cards && !finished && g.moves > 0);
  const [best, setBest] = useState(0); React.useEffect(() => { kvGet('pairs:best', 0).then(setBest); }, []);
  if (!g) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (!g.cards) return <Screen header={false}><Note>Not enough history to make a board.</Note></Screen>;
  const flip = (c) => { if (lock.current || done.includes(c.i) || open.includes(c.i) || finished) return; hap.tap(); const o = [...open, c.i];
    if (o.length < 2) { setOpen(o); return; }
    setOpen(o); lock.current = true; const a = g.cards[o[0]], b = g.cards[o[1]]; const moves = g.moves + 1;
    if (a.k === b.k) { hap.good(); later(() => { const nd = [...done, a.i, b.i]; setOpen([]); lock.current = false; const fin = nd.length === g.cards.length; upd({ done: nd, moves, over: fin }); if (fin && (!best || moves < best)) { setBest(moves); kvSet('pairs:best', moves); } if (fin && moves <= 10) awardPack('pairs:10'); }, 500); }
    else later(() => { setOpen([]); lock.current = false; upd({ moves }); }, 900); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Match pairs</Eyebrow><Note>Flip two cards: a driver and the team they raced most for. Fewer moves is better.</Note><Text style={{ color: colors.fg, fontWeight: '700' }}>{`Moves ${g.moves}${best ? ` · best ${best}` : ''}`}</Text></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {g.cards.map((c) => { const up = done.includes(c.i) || open.includes(c.i); const ok = done.includes(c.i);
          return (<View key={c.i} style={{ width: '23.5%' }}><Pressable accessibilityRole="button" accessibilityLabel={up ? c.text : 'Hidden card'} onPress={() => flip(c)} style={{ aspectRatio: 0.8, borderRadius: 12, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: ok ? colors.good : up ? colors.accent : colors.line, backgroundColor: ok ? alpha(colors.good, 0.2) : up ? alpha(colors.accent, 0.15) : colors.card }}>{up ? <Text style={{ color: colors.fg, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{c.text}</Text> : <Text style={{ color: colors.muted, fontSize: 22 }}>?</Text>}</Pressable></View>); })}
      </View>
      {finished ? <Card><Text style={{ color: colors.good, fontSize: 22, fontWeight: '800' }}>{`All matched in ${g.moves} moves`}</Text></Card> : null}
      <Btn icon="refresh" onPress={() => { setOpen([]); lock.current = false; restart(); }}>New board</Btn>
    </Screen>);
}
