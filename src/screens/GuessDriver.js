import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { GameHeader } from '../components/GameKit';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { awardPack } from '../lib/cards';
import { useGameSave, useLeaveGuard } from '../lib/gameSave';
import { profileOf, secretPool, searchDrivers, compare } from '../lib/guessDriver';

const MAX = 8;
const COLS = [['nat', 'Nation'], ['team', 'Last team'], ['first', 'Debut'], ['born', 'Born'], ['wins', 'Wins'], ['champ', 'Champion']];
const arrow = { up: ' ▲', down: ' ▼', eq: '', no: '' };
const val = (p, k) => (k === 'champ' ? (p.champ ? 'Yes' : 'No') : p[k] == null ? '?' : String(p[k]));

function Cell({ k, p, st, i }) {
  const bg = st === 'eq' ? alpha(colors.good, 0.35) : st === 'no' ? alpha(colors.muted, 0.15) : alpha(colors.gold, 0.28);
  return (<View style={{ flex: 1 }}><Reveal index={i}><View style={{ minHeight: 46, borderRadius: 8, backgroundColor: bg, paddingHorizontal: 3, justifyContent: 'center' }}><Text style={{ color: colors.fg, fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{`${val(p, k)}${arrow[st]}`}</Text></View></Reveal></View>);
}

export default function GuessDriverScreen() {
  const [g, upd, restart] = useGameSave('gd', () => { const pool = secretPool(); return { secret: pool[Math.floor(Math.random() * pool.length)], guesses: [], over: false }; });
  const [q, setQ] = useState(''); const [got, setGot] = useState(false);
  const secret = useMemo(() => (g?.secret ? profileOf(g.secret) : null), [g?.secret]);
  const guesses = useMemo(() => (g?.guesses || []).map(profileOf).filter(Boolean), [g?.guesses]);
  const won = !!secret && guesses.some((x) => x.id === secret.id); const lost = !won && guesses.length >= MAX; const done = won || lost;
  useLeaveGuard(!!secret && guesses.length > 0 && !done);
  if (!g) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (!secret) return <Screen header={false}><Note>Could not pick a driver from the history.</Note></Screen>;
  const sugg = done ? [] : searchDrivers(q, g.guesses);
  const guess = async (id) => { const n = [...g.guesses, id]; const w = id === secret.id; w ? hap.good() : hap.tap(); upd({ guesses: n, over: w || n.length >= MAX }); setQ(''); if (w) setGot(await awardPack('gd:win')); };
  const again = () => { setGot(false); setQ(''); restart(); };
  return (
    <Screen header={false}>
      <GameHeader cat="daily" icon="grid" title="Driver wordle" hint={`Find the mystery driver in ${MAX} guesses. Green is a match. Yellow with an arrow means the answer is later (▲) or earlier (▼), or more (▲) or fewer (▼) wins. Drivers since 1995 with 40+ starts.`} />
      <View style={{ flexDirection: 'row', gap: 4 }}>{COLS.map(([k, l]) => <Text key={k} style={{ flex: 1, color: colors.muted, fontSize: 10, textAlign: 'center' }}>{l}</Text>)}</View>
      {guesses.map((p) => { const c = compare(p, secret); return (
        <View key={p.id} style={{ gap: 3 }}>
          <Text style={{ color: p.id === secret.id ? colors.good : colors.fg, fontWeight: '700', fontSize: 14 }}>{p.name}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>{COLS.map(([k], i) => <Cell key={k} k={k} p={p} st={c[k]} i={i} />)}</View>
        </View>); })}
      {done ? (
        <Card>
          <Text style={{ color: won ? colors.good : colors.accent, fontSize: 22, fontWeight: '800' }}>{won ? `Got it in ${guesses.length}!` : 'Out of guesses'}</Text>
          <Text style={{ color: colors.fg, marginTop: 4 }}>{`${secret.name} · ${secret.nat} · ${secret.team} · ${secret.first}-${secret.last} · ${secret.wins} wins`}</Text>
          {got ? <Note>You earned a card pack.</Note> : null}
          <View style={{ marginTop: 10 }}><Btn tone="solid" onPress={again}>Play again</Btn></View>
        </Card>) : (
        <View>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4 }}>{`Guess ${guesses.length + 1} of ${MAX}`}</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Type a driver's name" placeholderTextColor={colors.muted} accessibilityLabel="Type a driver's name" autoCorrect={false} style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} />
          {sugg.map((d) => (<Pressable key={d.id} accessibilityRole="button" onPress={() => guess(d.id)} style={{ paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '600' }}>{`${d.name} `}<Text style={{ color: colors.muted }}>{`${d.first}-${d.lastYear}`}</Text></Text></Pressable>))}
        </View>)}
    </Screen>);
}
