import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { Card, Eyebrow, Note } from '../components/Screen';
import { colors, alpha } from '../theme';
import { rumoursNow, rumourBoard } from '../fun/rumours';

// Paddock rumours card for the fantasy Home: believe or doubt each rumour about the next race, then see how the calls turned out.
export default function FantasyRumours({ f, onPick }) {
  const now = rumoursNow(f); const board = rumourBoard(f);
  if (!now && !board.made) return null;
  const Choice = ({ r, v, label }) => { const on = now.picks[r.id] === v; const lock = now.started; return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} disabled={lock} onPress={() => onPick(now.race.id, r.id, on ? null : v)} style={({ pressed }) => [{ flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : alpha(colors.accent, 0.12), borderWidth: 1, borderColor: on ? colors.accent : alpha(colors.accent, 0.4), opacity: lock && !on ? 0.4 : 1 }, pressed && { opacity: 0.8 }]}><Text style={{ color: on ? '#fff' : colors.fg, fontWeight: '800' }}>{label}</Text></Pressable>); };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Paddock rumours</Eyebrow>{board.made ? <Text style={{ color: colors.gold, fontWeight: '800' }}>{`${board.score} pts · ${board.right}/${board.made}`}</Text> : null}</View>
      {now && now.list.length ? (
        <View style={{ marginTop: 8, gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{`Whispers before ${now.race.name}. Believe or doubt each one, then find out after the race.`}</Text>
          {now.list.map((r) => (
            <View key={r.id} style={{ gap: 8 }}>
              <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>{`"${r.text}"`}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{`Form says about ${Math.round(r.p * 100)}% likely.`}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}><Choice r={r} v="yes" label="Believe" /><Choice r={r} v="no" label="Doubt" /></View>
            </View>))}
          {now.started ? <Note>This race has started, so the rumours are locked in.</Note> : null}
        </View>) : null}
      {board.rows.length ? (
        <View style={{ marginTop: 12 }}><Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>HOW THEY TURNED OUT</Text>
          {board.rows.slice(0, 6).map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Ionicons name={x.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={x.ok ? colors.good : colors.red} />
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 14 }} numberOfLines={2}>{x.text}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`You ${x.pick === 'yes' ? 'believed' : 'doubted'} it. It was ${x.res ? 'true' : 'false'}.`}</Text></View>
              {x.pts ? <Text style={{ color: colors.gold, fontWeight: '800' }}>{`+${x.pts}`}</Text> : null}
            </View>))}
        </View>) : null}
    </Card>);
}
