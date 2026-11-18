import React, { useRef } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { GameHeader } from '../components/GameKit';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { rngOf, seedOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { useGameSave } from '../lib/gameSave';

const EVENTS = ['Safety car', 'Virtual safety car', 'Red flag', 'Rain', 'Crash on lap 1', 'Pole sitter wins', 'Driver gets a penalty', 'Pit stop under 2.2 seconds', 'Slow pit stop', 'Fastest lap on the last lap', 'Team radio complaint', 'Car stops on track', 'Overtake into turn 1', 'Track limits warning', 'Rookie scores points', 'Podium of three different teams', 'Lap 1 lead change', 'Driver of the day is not a podium finisher', 'Late overtake for the lead', 'Double points finish for a team', 'Puncture', 'Wing damage', 'Someone spins', 'Commentator says "lights out and away we go"'];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const make = () => { const r = rngOf(seedOf(`bingo${Date.now()}`)); const a = [...EVENTS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return { card: a.slice(0, 9), ticked: [], over: false }; };
// Tick what happens while you watch. Saved on the phone; a new card any time.
export default function RaceBingoScreen() {
  const [g, upd, restart] = useGameSave('bingo', make); const paid = useRef(false);
  if (!g) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const t = g.ticked || []; const lines = LINES.filter((l) => l.every((k) => t.includes(k))); const bingo = lines.length > 0;
  const tap = (k) => { hap.tap(); const n = t.includes(k) ? t.filter((x) => x !== k) : [...t, k]; upd({ ticked: n }); if (!paid.current && LINES.some((l) => l.every((x) => n.includes(x)))) { paid.current = true; hap.good(); awardPack('bingo:line'); } };
  return (
    <Screen header={false}>
      <GameHeader cat="puzzle" icon="apps" title="Race weekend bingo" hint={`Watch a session and tap a square when it happens. Three in a row, column or diagonal is a bingo. Your card is saved until you make a new one.`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {g.card.map((e, k) => { const on = t.includes(k); const win = lines.some((l) => l.includes(k));
          return (<View key={`${e}${k}`} style={{ width: '31.5%' }}><Reveal index={k}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => tap(k)} style={{ aspectRatio: 1, borderRadius: 14, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: win ? colors.gold : on ? colors.accent : colors.line, backgroundColor: win ? alpha(colors.gold, 0.22) : on ? alpha(colors.accent, 0.2) : colors.card }}><Text style={{ color: colors.fg, fontSize: 12, fontWeight: on ? '800' : '600', textAlign: 'center' }}>{e}</Text></Pressable></Reveal></View>); })}
      </View>
      {bingo ? <Card><Text style={{ color: colors.gold, fontSize: 24, fontWeight: '800' }}>Bingo!</Text><Note>{`${lines.length} line${lines.length === 1 ? '' : 's'}. Keep ticking for more.`}</Note></Card> : <Note>{`${t.length} of 9 ticked.`}</Note>}
      <Btn icon="refresh" onPress={() => { paid.current = false; restart(); }}>New card</Btn>
    </Screen>);
}
