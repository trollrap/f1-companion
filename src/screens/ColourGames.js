import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import ShareResult from '../components/ShareResult';
import { colors, alpha, teamColor } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { useRun, useLeaveGuard, useTimers } from '../lib/gameSave';
import { ladderQ } from '../lib/trivia';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;
const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// ---------- Team colours: the colour the app uses for a team, name the team ----------
const TEAMS = [['mercedes', 'Mercedes'], ['ferrari', 'Ferrari'], ['red_bull', 'Red Bull'], ['mclaren', 'McLaren'], ['aston_martin', 'Aston Martin'], ['williams', 'Williams'], ['haas', 'Haas'], ['rb', 'Racing Bulls'], ['sauber', 'Sauber'], ['renault', 'Renault'], ['lotus_f1', 'Lotus'], ['toro_rosso', 'Toro Rosso'], ['alphatauri', 'AlphaTauri'], ['alfa', 'Alfa Romeo'], ['bmw_sauber', 'BMW Sauber'], ['jordan', 'Jordan'], ['benetton', 'Benetton'], ['tyrrell', 'Tyrrell'], ['brabham', 'Brabham'], ['jaguar', 'Jaguar'], ['toyota', 'Toyota'], ['audi', 'Audi'], ['cadillac', 'Cadillac']];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
// Only teams whose colour differs from every other team's can be the answer (about eleven teams); wrong options are also clearly different from the answer and from each other.
export const livery = () => { const all = TEAMS.map(([id, name]) => ({ id, name, c: teamColor(id) })).filter((t) => /^#[0-9a-fA-F]{6}$/.test(t.c)); return { all, ok: all.filter((t) => all.every((o) => o.id === t.id || dist(o.c, t.c) >= 40)) }; };
export function liveryRound(r) {
  const { all, ok } = livery(); const a = ok[Math.floor(r() * ok.length)]; const picks = [a];
  for (const t of shuffle(r, all)) { if (picks.length === 4) break; if (picks.every((p) => dist(p.c, t.c) >= 70)) picks.push(t); }
  if (picks.length < 4) return null; const opts = shuffle(r, picks); return { c: a.c, name: a.name, options: opts.map((o) => o.name), answer: opts.findIndex((o) => o.id === a.id) };
}
const N = 10;
export function LiveryScreen() {
  const run = useRun('livery'); const { seed, i, score } = run; const later = useTimers(); const [pick, setPick] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('livery:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { if (!seed) return []; const r = rngOf(seedOf(`liv${seed}`)); const out = []; for (let k = 0; k < N * 4 && out.length < N; k++) { try { const q = liveryRound(r); if (q) out.push(q); } catch {} } return out; }, [seed]);
  const done = rounds.length > 0 && i >= rounds.length; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Loading />;
  if (rounds.length < 5) return <Screen header={false}><Note>Not enough distinct colours to make a round.</Note></Screen>;
  if (done) return (<Screen header={false}><ShareResult text={`F1 Companion team colours: ${score}/${rounds.length}\n${'🟩'.repeat(score)}${'⬛'.repeat(rounds.length - score)}`}><Card><Eyebrow>Team colours</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${score} / ${rounds.length}`}</Text><Note>{`Best ${Math.max(best, score)}.`}</Note></Card></ShareResult><Btn tone="solid" onPress={() => { setPick(null); run.again(); }}>Play again</Btn></Screen>);
  const q = rounds[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.answer; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) run.setScore(sc);
    later(() => { setPick(null); run.setI((x) => x + 1); if (i + 1 >= rounds.length) { run.finish(); if (sc > best) { setBest(sc); kvSet('livery:best', sc); } } }, 1500); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Team colours · ${i + 1} of ${rounds.length}`}</Eyebrow><View style={{ height: 120, borderRadius: 16, backgroundColor: q.c, marginTop: 8 }} /><Note>Which team does the app show in this colour? These are the app's own team colours, not exact liveries.</Note></Card>
      {q.options.map((o, k) => (<Reveal key={`${i}${k}`} index={k}><Pressable accessibilityRole="button" onPress={() => choose(k)} style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: pick === null ? colors.line : k === q.answer ? colors.good : pick === k ? colors.accent : colors.line, backgroundColor: pick === null ? colors.card : k === q.answer ? alpha(colors.good, 0.2) : pick === k ? alpha(colors.accent, 0.18) : colors.card }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{o}</Text></Pressable></Reveal>))}
    </Screen>);
}

// ---------- Speed round: 60 seconds of true or false built from every quiz type ----------
// Each question is turned into a statement: "answer is X" is true when X is the real answer. A wrong answer costs 5 seconds.
const LEVELS = [0, 0, 3, 0, 5, 3];
function statement(r, k) {
  const q = ladderQ(r, LEVELS[k % LEVELS.length]); if (!q) return null;
  const truth = r() < 0.5; const wrong = q.options.map((_, x) => x).filter((x) => x !== q.answer); const shown = truth ? q.answer : wrong[Math.floor(r() * wrong.length)];
  return { kind: q.kind, q: q.q, claim: q.options[shown], truth, why: q.why };
}
export function SpeedRoundScreen() {
  const [phase, setPhase] = useState('ready'); const [left, setLeft] = useState(60); const [n, setN] = useState(0); const [right, setRight] = useState(0); const [flash, setFlash] = useState(null); const [best, setBest] = useState(0); const seed = useRef(Date.now());
  useEffect(() => { kvGet('speed:best', 0).then(setBest); }, []);
  const stmt = useMemo(() => { if (phase !== 'run') return null; for (let t = 0; t < 6; t++) { try { const s = statement(rngOf(seedOf(`sp${seed.current}:${n}:${t}`)), n); if (s) return s; } catch {} } return null; }, [phase, n]);
  useEffect(() => { if (phase !== 'run') return undefined; if (left <= 0) { setPhase('over'); return undefined; } const t = setTimeout(() => setLeft((x) => x - 1), 1000); return () => clearTimeout(t); }, [phase, left]);
  useEffect(() => { if (phase === 'over' && right > best) { setBest(right); kvSet('speed:best', right); } }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { seed.current = Date.now(); setN(0); setRight(0); setLeft(60); setFlash(null); setPhase('run'); };
  const answer = (v) => { if (!stmt) return; const ok = v === stmt.truth; ok ? hap.good() : hap.bad(); setFlash(ok ? 'good' : 'bad'); if (ok) setRight((x) => x + 1); else setLeft((x) => x - 5); setN((x) => x + 1); setTimeout(() => setFlash(null), 250); };
  if (phase === 'ready') return (<Screen header={false}><Card><Eyebrow>Speed round</Eyebrow><Note>60 seconds. Each card makes a claim: tap True or False. A wrong answer costs 5 seconds. Best so far: {best}.</Note></Card><Btn tone="solid" onPress={start}>Start</Btn></Screen>);
  if (phase === 'over') return (<Screen header={false}><ShareResult text={`F1 Companion speed round: ${right} right out of ${n} in 60 seconds`}><Card><Eyebrow>Speed round</Eyebrow><Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800' }}>{`${right} right`}</Text><Note>{`${n} answered. Best ${Math.max(best, right)}.`}</Note></Card></ShareResult><Btn tone="solid" onPress={start}>Go again</Btn></Screen>);
  if (!stmt) return <Loading />;
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Speed round · ${right} right`}</Eyebrow><Text style={{ color: left <= 10 ? colors.accent : colors.fg, fontSize: 30, fontWeight: '800' }}>{`${Math.max(0, left)}s`}</Text></Card>
      <Card style={flash ? { borderColor: flash === 'good' ? colors.good : colors.accent } : null}>
        <Eyebrow>{stmt.kind}</Eyebrow><Text style={{ color: colors.fg, fontSize: 15 }}>{stmt.q}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800', marginTop: 10 }}>{`Answer: ${stmt.claim}`}</Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Btn tone="solid" onPress={() => answer(true)}>True</Btn></View><View style={{ flex: 1 }}><Btn onPress={() => answer(false)}>False</Btn></View></View>
    </Screen>);
}
