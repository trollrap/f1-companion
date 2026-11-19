import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import ShareResult from '../components/ShareResult';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';
import { driversMeta, careerStats } from '../api/history';
import { hangmanWord } from '../lib/hangman';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;
const famous = () => driversMeta().filter((d) => d.races >= 100);
const STATS = [['wins', 'race wins'], ['podiums', 'podiums'], ['poles', 'poles'], ['starts', 'race starts']];
const Big = ({ children, color }) => <Text style={{ color: color || colors.fg, fontSize: 40, fontWeight: '800', textAlign: 'center' }}>{children}</Text>;

// ---------- Higher or lower streak: is the next driver's total higher or lower? ----------
// The chain is rebuilt from the seed, so a quit game resumes on the same driver. The stat changes every 6 steps; equal totals are skipped.
function chainTo(seed, upto) {
  const pool = famous(); const out = [];
  for (let k = 0; k <= upto; k++) {
    const [key, label] = STATS[Math.floor(k / 6) % STATS.length]; let pick = null;
    for (let t = 0; t < 40 && !pick; t++) { const d = pool[Math.floor(rngOf(seedOf(`hl${seed}:${k}:${t}`))() * pool.length)]; const c = careerStats(d.id); const v = c && c[key]; if (v == null || (out.length && (v === out[out.length - 1].v || out.some((o) => o.id === d.id)))) continue; pick = { id: d.id, name: d.name, v, key, label }; }
    if (!pick) return out; out.push(pick);
  }
  return out;
}
export function HigherLowerScreen() {
  const [g, upd, restart] = useGameSave('hilo', () => ({ seed: Date.now(), n: 0 })); const later = useTimers(); const [shown, setShown] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('hilo:best', 0).then(setBest); }, []);
  const n = g?.n || 0; const chain = useMemo(() => (g?.seed ? chainTo(g.seed, n + 1) : []), [g?.seed, n]);
  const cur = chain[n], nxt = chain[n + 1]; const over = !!g?.over;
  useLeaveGuard(!!g && !over && n > 0);
  if (!g) return <Loading />;
  if (!cur || !nxt) return <Screen header={false}><Note>Could not build a chain from the history.</Note><Btn onPress={restart}>Try again</Btn></Screen>;
  const answer = (higher) => { if (shown || over) return; const ok = higher ? nxt.v > cur.v : nxt.v < cur.v; setShown(nxt.v); ok ? hap.good() : hap.bad();
    later(() => { setShown(null); if (ok) upd({ n: n + 1 }); else { upd({ over: true }); if (n > best) { setBest(n); kvSet('hilo:best', n); } else kvSet('hilo:last', n); } }, 1300); };
  if (over) return (
    <Screen header={false}>
      <ShareResult text={`F1 Companion higher or lower: streak of ${n}\n${'🟩'.repeat(Math.min(n, 20))}🟥`}><Card><Eyebrow>Higher or lower</Eyebrow><Big>{`${n} in a row`}</Big><Note>{`Best ${Math.max(best, n)}. It was ${nxt.name} with ${nxt.v} ${nxt.label}.`}</Note></Card></ShareResult>
      <Btn tone="solid" onPress={() => { setShown(null); restart(); }}>Play again</Btn>
    </Screen>);
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>{`Higher or lower · streak ${n} · best ${best}`}</Eyebrow><Note>{`Career ${cur.label}, counted in the built-in history.`}</Note></Card>
      <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>{cur.name}</Text><Big>{cur.v}</Big></Card>
      <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>{nxt.name}</Text><Big color={shown != null ? colors.gold : colors.muted}>{shown != null ? shown : '?'}</Big></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Btn tone="solid" icon="arrow-up" onPress={() => answer(true)}>Higher</Btn></View>
        <View style={{ flex: 1 }}><Btn icon="arrow-down" onPress={() => answer(false)}>Lower</Btn></View>
      </View>
    </Screen>);
}

// ---------- Tournament bracket: 16 drivers, pick the one with the bigger career number in every match ----------
const ROUNDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
function bracket(seed) {
  const pool = famous(); const [key, label] = STATS[Math.floor(rngOf(seedOf(`br${seed}`))() * STATS.length)]; const r = rngOf(seedOf(`br${seed}:d`)); const seen = new Set(); const field = [];
  for (let t = 0; t < 400 && field.length < 16; t++) { const d = pool[Math.floor(r() * pool.length)]; const c = careerStats(d.id); const v = c && c[key]; if (v == null || seen.has(v) || field.some((x) => x.id === d.id)) continue; seen.add(v); field.push({ id: d.id, name: d.name, v }); }
  if (field.length < 16) return null;
  const rounds = [field]; let cur = field; while (cur.length > 1) { const nx = []; for (let i = 0; i < cur.length; i += 2) nx.push(cur[i].v > cur[i + 1].v ? cur[i] : cur[i + 1]); rounds.push(nx); cur = nx; }
  return { key, label, rounds };
}
export function BracketScreen() {
  const [g, upd, restart] = useGameSave('bracket', () => ({ seed: Date.now(), picks: [] })); const later = useTimers(); const [shown, setShown] = useState(false); const [wins, setWins] = useState(0);
  useEffect(() => { kvGet('bracket:wins', 0).then(setWins); }, []);
  const b = useMemo(() => { try { return g?.seed ? bracket(g.seed) : null; } catch { return null; } }, [g?.seed]);
  const picks = g?.picks || []; const done = !!b && picks.length >= 15; useLeaveGuard(!!b && picks.length > 0 && !done);
  if (!g) return <Loading />;
  if (!b) return <Screen header={false}><Note>Could not build a bracket from the history.</Note><Btn onPress={restart}>Try again</Btn></Screen>;
  // match index m: rounds of 8, 4, 2, 1 matches
  const where = (m) => { let r = 0, left = m, size = 8; while (left >= size) { left -= size; size /= 2; r++; } return [r, left]; };
  if (done) {
    let right = 0; for (let m = 0; m < 15; m++) { const [r, k] = where(m); const w = b.rounds[r + 1][k]; if (picks[m] === w.id) right++; }
    const champ = b.rounds[4][0]; const txt = `F1 Companion bracket (career ${b.label}): ${right}/15 right. Champion ${champ.name}.`;
    return (
      <Screen header={false}>
        <ShareResult text={txt}><Card><Eyebrow>{`Bracket · career ${b.label}`}</Eyebrow><Big>{`${right} / 15`}</Big><Note>{`Champion: ${champ.name} with ${champ.v}.`}</Note></Card></ShareResult>
        <Btn tone="solid" onPress={() => { setShown(false); restart(); }}>New bracket</Btn>
      </Screen>);
  }
  const m = picks.length; const [r, k] = where(m); const A = b.rounds[r][k * 2], B = b.rounds[r][k * 2 + 1]; const win = A.v > B.v ? A : B;
  const choose = (p) => { if (shown) return; setShown(true); p.id === win.id ? hap.good() : hap.bad();
    later(() => { setShown(false); const np = [...picks, p.id]; upd({ picks: np, over: np.length >= 15 }); if (np.length >= 15) { const w = wins + 1; setWins(w); kvSet('bracket:wins', w); } }, 1500); };
  const side = (p) => { const st = !shown ? '' : p.id === win.id ? 'right' : 'wrong'; return (
    <Reveal key={p.id} index={0}><Pressable accessibilityRole="button" onPress={() => choose(p)} style={{ padding: 18, borderRadius: 14, borderWidth: 1.5, borderColor: st === 'right' ? colors.good : st === 'wrong' ? colors.accent : colors.line, backgroundColor: st === 'right' ? alpha(colors.good, 0.2) : st === 'wrong' ? alpha(colors.accent, 0.18) : colors.card }}>
      <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{p.name}</Text>{shown ? <Text style={{ color: colors.muted, marginTop: 2 }}>{`${p.v} ${b.label}`}</Text> : null}
    </Pressable></Reveal>); };
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>{`${ROUNDS[r]} · match ${k + 1} of ${8 / 2 ** r} · career ${b.label}`}</Eyebrow><Note>Pick the driver with the bigger number. The real winner always moves on, so every match is scored on its own.</Note></Card>
      {side(A)}<Text style={{ color: colors.muted, textAlign: 'center', fontWeight: '800' }}>vs</Text>{side(B)}
      <Note>{`${m} of 15 played${wins ? ` · ${wins} bracket${wins === 1 ? '' : 's'} finished` : ''}`}</Note>
    </Screen>);
}

// ---------- Season scramble: unscramble driver, team and circuit names before time runs out ----------
const ROUND_N = 8, SECONDS = 25;
const scramble = (r, letters) => { const a = letters.split(''); for (let t = 0; t < 8; t++) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.join('') !== letters) break; } return a; };
const wordAt = (seed, i) => { const w = hangmanWord(rngOf(seedOf(`sc${seed}:${i}`))); const letters = w.letters.replace(/[^A-Z]/g, ''); return { cat: w.cat, text: w.word, letters, tiles: scramble(rngOf(seedOf(`sc${seed}:${i}:s`)), letters) }; };
export function ScrambleScreen() {
  const [g, upd, restart] = useGameSave('scramble', () => ({ seed: Date.now(), i: 0, score: 0, marks: '' })); const later = useTimers();
  const [used, setUsed] = useState([]); const [left, setLeft] = useState(SECONDS); const [res, setRes] = useState(null); const [best, setBest] = useState(0);
  useEffect(() => { kvGet('scramble:best', 0).then(setBest); }, []);
  const i = g?.i || 0; const done = !!g && i >= ROUND_N; const w = useMemo(() => (g?.seed && !done ? wordAt(g.seed, i) : null), [g?.seed, i, done]);
  useLeaveGuard(!!g && !done && i > 0);
  useEffect(() => { setUsed([]); setLeft(SECONDS); setRes(null); }, [i, g?.seed]);
  const finishRound = (ok) => { if (res) return; setRes(ok ? 'ok' : 'miss'); ok ? hap.good() : hap.bad(); const score = (g.score || 0) + (ok ? 1 : 0);
    later(() => { upd({ i: i + 1, score, marks: `${g.marks || ''}${ok ? '🟩' : '🟥'}`, over: i + 1 >= ROUND_N }); if (i + 1 >= ROUND_N && score > best) { setBest(score); kvSet('scramble:best', score); } }, 1400); };
  useEffect(() => { if (!w || res) return undefined; if (left <= 0) { finishRound(false); return undefined; } const t = setTimeout(() => setLeft((x) => x - 1), 1000); return () => clearTimeout(t); }, [left, w, res]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return <Loading />;
  if (done) return (
    <Screen header={false}>
      <ShareResult text={`F1 Companion scramble: ${g.score}/${ROUND_N}\n${g.marks || ''}`}><Card><Eyebrow>Season scramble</Eyebrow><Big>{`${g.score} / ${ROUND_N}`}</Big><Text style={{ fontSize: 24, textAlign: 'center' }}>{g.marks}</Text><Note>{`Best ${Math.max(best, g.score)}.`}</Note></Card></ShareResult>
      <Btn tone="solid" onPress={restart}>Play again</Btn>
    </Screen>);
  if (!w) return <Loading />;
  const tap = (k) => { if (res || used.includes(k)) return; hap.tap(); const nu = [...used, k]; setUsed(nu); if (nu.length === w.letters.length) finishRound(nu.map((x) => w.tiles[x]).join('') === w.letters); };
  const typed = used.map((x) => w.tiles[x]).join('');
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>{`Season scramble · ${i + 1} of ${ROUND_N} · ${w.cat}`}</Eyebrow><Text style={{ color: left <= 5 ? colors.accent : colors.fg, fontSize: 28, fontWeight: '800' }}>{`${left}s`}</Text><Note>Tap the letters in order to spell the name.</Note></Card>
      <Card>
        <Text style={{ color: res === 'ok' ? colors.good : res === 'miss' ? colors.accent : colors.fg, fontSize: 28, fontWeight: '800', letterSpacing: 3, textAlign: 'center', minHeight: 36 }}>{res === 'miss' ? w.text : typed}</Text>
        {res === 'miss' ? <Note>{left <= 0 ? 'Out of time.' : 'Not quite.'}</Note> : null}
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {w.tiles.map((ch, k) => (<Pressable key={k} accessibilityRole="button" accessibilityLabel={`Letter ${ch}`} onPress={() => tap(k)} style={{ width: 44, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: used.includes(k) ? alpha(colors.fg, 0.05) : colors.card, borderWidth: 1, borderColor: colors.line, opacity: used.includes(k) ? 0.35 : 1 }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{ch}</Text></Pressable>))}
      </View>
      {!res ? <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Btn onPress={() => setUsed((u) => u.slice(0, -1))}>Undo letter</Btn></View><View style={{ flex: 1 }}><Btn onPress={() => finishRound(false)}>Skip</Btn></View></View> : null}
    </Screen>);
}
