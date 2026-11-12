import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, ScrollView } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors, alpha, teamColor } from '../theme';
import { ui } from '../lib/motion';
import * as hap from '../lib/haptics';
import { loadCards, subscribe, openPack, cardOf, RARITY, ORDER } from '../lib/cards';

// One collectible card: team-coloured gradient look, rarity border, career numbers.
export function DriverCard({ c, w = 150, count }) {
  const col = teamColor(c.teamId) || colors.accent; const r = RARITY[c.rarity];
  return (
    <View accessible accessibilityLabel={`${c.name}, ${r.label} card. ${c.wins} wins, ${c.titles} titles.`} style={{ width: w, height: w * 1.45, borderRadius: 16, backgroundColor: alpha(col, 0.28), borderWidth: 2.5, borderColor: r.color, padding: 10, justifyContent: 'space-between', overflow: 'hidden' }}>
      <View><Text style={{ color: r.color, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 }}>{r.label.toUpperCase()}</Text>{count > 1 ? <Text style={{ position: 'absolute', right: 0, top: 0, color: colors.fg, fontWeight: '800', fontSize: 12 }}>{`x${count}`}</Text> : null}</View>
      <View style={{ alignItems: 'center' }}><Text style={{ color: alpha(colors.fg, 0.9), fontSize: w * 0.32, fontWeight: '900' }}>{c.code || c.name.slice(0, 3).toUpperCase()}</Text></View>
      <View>
        <Text style={{ color: colors.fg, fontWeight: '800', fontSize: w > 120 ? 15 : 12 }} numberOfLines={2}>{c.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{`${c.nationality || ''} · ${c.first || ''}${c.last && c.last !== c.first ? `-${String(c.last).slice(2)}` : ''}`}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>{[['W', c.wins], ['P', c.podiums], ['T', c.titles]].map(([k, v]) => <Text key={k} style={{ color: colors.fg, fontSize: 12, fontWeight: '800' }}>{`${k} ${v}`}</Text>)}</View>
      </View>
    </View>);
}
// A face-down card that flips (a quick squash on the X axis) when tapped.
function Flip({ c, onFlip }) {
  const v = useRef(new Animated.Value(1)).current; const [up, setUp] = useState(false);
  const flip = () => { if (up) return; if (ui.reduceMotion) { setUp(true); onFlip(); return; } Animated.timing(v, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => { setUp(true); onFlip(); (c.rarity === 'legendary' || c.rarity === 'epic') ? hap.big() : hap.tap(); Animated.spring(v, { toValue: 1, friction: 6, useNativeDriver: true }).start(); }); };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={up ? c.name : 'Flip card'} onPress={flip}>
      <Animated.View style={{ transform: [{ scaleX: v }] }}>
        {up ? <DriverCard c={c} w={104} /> : <View style={{ width: 104, height: 151, borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 34, fontWeight: '900' }}>F1</Text><Text style={{ color: colors.muted, fontSize: 11 }}>TAP</Text></View>}
      </Animated.View>
    </Pressable>);
}
export default function CardScreen() {
  const [m, setM] = useState(null); const [pack, setPack] = useState(null); const [flipped, setFlipped] = useState(0); const [busy, setBusy] = useState(false);
  useEffect(() => { loadCards().then((x) => setM({ ...x })); return subscribe((x) => setM({ ...x })); }, []);
  const open = async () => { if (busy) return; setBusy(true); setFlipped(0); const p = await openPack(); setPack(p); setBusy(false); };
  if (!m) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const cards = Object.keys(m.owned).map((id) => ({ ...cardOf(id), n: m.owned[id] })).filter((c) => c.id && c.name);
  const by = (r) => cards.filter((c) => c.rarity === r).sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Card packs</Eyebrow>
        <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '900', marginTop: 4 }}>{`${m.packs} pack${m.packs === 1 ? '' : 's'}`}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Earn packs once a day from Mystery driver, Guess the circuit, Lights out and the quiz. Each pack has three real drivers from F1 history.</Text>
        <View style={{ marginTop: 12 }}><Btn icon="gift" tone="solid" disabled={m.packs < 1 || busy} onPress={open}>{m.packs < 1 ? 'No packs left' : 'Open a pack'}</Btn></View>
      </Card>
      {pack ? (<Card><Eyebrow>Your pull</Eyebrow><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>{pack.map((c, i) => <Flip key={`${c.id}${i}${m.opened}`} c={c} onFlip={() => setFlipped((f) => f + 1)} />)}</View>{flipped < pack.length ? <Note>Tap each card to turn it over.</Note> : <Note>Added to your collection.</Note>}</Card>) : null}
      {ORDER.map((r) => { const list = by(r); return (
        <View key={r} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: RARITY[r].color, fontFamily: 'label', fontSize: 12, letterSpacing: 2 }}>{RARITY[r].label.toUpperCase()}</Text><Text style={{ color: colors.muted }}>{list.length}</Text></View>
          {list.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>{list.map((c) => <DriverCard key={c.id} c={c} w={118} count={c.n} />)}</ScrollView> : <Text style={{ color: colors.muted, fontSize: 13 }}>None yet.</Text>}
        </View>); })}
      <Note>{`${cards.length} different drivers collected, ${Object.values(m.owned).reduce((a, b) => a + b, 0)} cards in total. Rarity: legendary is a world champion, epic is 10 or more wins, rare is a win or three podiums.`}</Note>
    </Screen>);
}
