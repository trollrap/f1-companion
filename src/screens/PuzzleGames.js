import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors, alpha } from '../theme';
import { kvGet, kvSet, seedOf, rngOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { makeConnections } from '../lib/connections';
import { hangmanWord } from '../lib/hangman';
import * as hap from '../lib/haptics';

// ---------- Connections: sort 12 drivers into 3 hidden groups ----------
const TINTS = ['#3B9CFF', '#FFD12E', '#3DD16C'];
export function ConnectionsScreen() {
  const [seed, setSeed] = useState(1); const puz = useMemo(() => { try { return makeConnections(rngOf(seedOf(`cx${seed}${Date.now()}`))); } catch { return null; } }, [seed]);
  const [sel, setSel] = useState([]); const [solved, setSolved] = useState([]); const [lives, setLives] = useState(4); const [msg, setMsg] = useState(''); const [wins, setWins] = useState(0); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('cx:wins', 0).then(setWins); }, []);
  useEffect(() => { setSel([]); setSolved([]); setLives(4); setMsg(''); setGot(false); }, [seed]);
  if (!puz) return <Screen header={false}><Note>Could not make a puzzle from the history.</Note></Screen>;
  const left = puz.tiles.filter((n) => !solved.some((g) => g.items.includes(n)));
  const over = lives <= 0; const won = solved.length === 3;
  const toggle = (n) => { if (over || won) return; hap.tap(); setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length < 4 ? [...s, n] : s)); };
  const submit = async () => { if (sel.length !== 4) return; const g = puz.groups.find((x) => sel.every((n) => x.items.includes(n)));
    if (g) { hap.good(); const ns = [...solved, g]; setSolved(ns); setSel([]); setMsg(''); if (ns.length === 3) { const w = wins + 1; setWins(w); kvSet('cx:wins', w); setGot(await awardPack('cx:win')); } }
    else { hap.bad(); const best = Math.max(...puz.groups.map((x) => sel.filter((n) => x.items.includes(n)).length)); setMsg(best === 3 ? 'One away.' : 'Not a group.'); setLives(lives - 1); setSel([]); } };
  const reveal = over ? puz.groups.filter((g) => !solved.includes(g)) : [];
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Connections  ·  mistakes left ${Math.max(0, lives)}  ·  puzzles solved ${wins}`}</Eyebrow><Text style={{ color: colors.muted, marginTop: 6 }}>Twelve drivers, three hidden groups of four. Each driver fits only one group.</Text></Card>
      {[...solved, ...reveal].map((g, i) => (<View key={g.label} style={{ padding: 14, borderRadius: 14, backgroundColor: alpha(TINTS[puz.groups.indexOf(g)], 0.25), borderWidth: 1, borderColor: TINTS[puz.groups.indexOf(g)] }}><Text style={{ color: colors.fg, fontWeight: '900' }}>{g.label}</Text><Text style={{ color: colors.fg, marginTop: 2 }}>{g.items.join(', ')}</Text></View>))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {left.filter(() => !over).map((n) => { const on = sel.includes(n); return (<Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggle(n)} style={({ pressed }) => [{ width: '31.5%', minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 6, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? alpha(colors.accent, 0.22) : colors.card }, pressed && { opacity: 0.75 }]}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>{n}</Text></Pressable>); })}
      </View>
      {msg && !won && !over ? <Text style={{ color: colors.gold, fontWeight: '800', textAlign: 'center' }}>{msg}</Text> : null}
      {!over && !won ? <Btn onPress={submit} disabled={sel.length !== 4}>Submit group</Btn> : <Btn onPress={() => setSeed((s) => s + 1)}>{won ? 'Next puzzle' : 'Try another'}</Btn>}
      {won && got ? <Note>Solved. You earned a card pack. Open it in Cards.</Note> : null}
      <Note>Groups come from the offline history: nationality, world champions, teams a driver raced for, and the decade of their first race.</Note>
    </Screen>);
}

// ---------- Hangman: drivers, circuits and teams ----------
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); const LIVES = 7;
export function HangmanScreen() {
  const rr = useRef(rngOf(seedOf(`hm${Date.now()}`))).current; const [w, setW] = useState(() => { try { return hangmanWord(rr); } catch { return null; } });
  const [got, setGot] = useState([]); const [streak, setStreak] = useState(0); const [best, setBest] = useState(0); const [pack, setPack] = useState(false);
  useEffect(() => { kvGet('hm:best', 0).then(setBest); }, []);
  if (!w) return <Screen header={false}><Note>Could not pick a word.</Note></Screen>;
  const need = [...new Set(w.letters.replace(/[^A-Z]/g, '').split(''))]; const wrong = got.filter((l) => !need.includes(l)).length; const won = need.every((l) => got.includes(l)); const lost = wrong >= LIVES;
  const guess = async (l) => { if (won || lost || got.includes(l)) return; const next = [...got, l]; setGot(next); const ok = need.includes(l); ok ? hap.tap() : hap.bad();
    if (need.every((x) => next.includes(x))) { hap.good(); const n = streak + 1; setStreak(n); if (n > best) { setBest(n); kvSet('hm:best', n); } if (n >= 5) setPack(await awardPack('hm:5')); } else if (next.filter((x) => !need.includes(x)).length >= LIVES) setStreak(0); };
  const next = () => { setGot([]); try { setW(hangmanWord(rr)); } catch {} };
  const shown = w.word.split('').map((ch, i) => { const L = w.letters[i]; return /[A-Z]/.test(L) ? (got.includes(L) || lost ? ch.toUpperCase() : '_') : ch; }).join(' ');
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Hangman  ·  ${w.cat}  ·  streak ${streak}  ·  best ${best}`}</Eyebrow>
        <Text style={{ color: lost ? colors.red : won ? colors.good : colors.fg, fontSize: 30, fontWeight: '900', letterSpacing: 2, marginTop: 14, textAlign: 'center' }}>{shown}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 }}>{Array.from({ length: LIVES }).map((_, i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i < LIVES - wrong ? colors.good : alpha(colors.fg, 0.15) }} />)}</View>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>{won ? 'Solved.' : lost ? 'Out of tyres. The answer is shown above.' : `${LIVES - wrong} tyres left`}</Text></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {KEYS.map((l) => { const used = got.includes(l); const hit = used && need.includes(l); return (<Pressable key={l} accessibilityRole="button" accessibilityLabel={`Letter ${l}`} onPress={() => guess(l)} style={({ pressed }) => [{ width: 44, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: hit ? colors.good : used ? colors.red : colors.line, backgroundColor: hit ? alpha(colors.good, 0.2) : used ? alpha(colors.red, 0.12) : colors.card, opacity: used ? 0.55 : 1 }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 17 }}>{l}</Text></Pressable>); })}
      </View>
      {won || lost ? <Btn onPress={next}>Next word</Btn> : null}
      {pack ? <Note>Five in a row. You earned a card pack. Open it in Cards.</Note> : <Note>Five solved in a row earns a card pack.</Note>}
    </Screen>);
}
