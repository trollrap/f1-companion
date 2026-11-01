import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import Grad from './Grad';
import { classified } from '../lib/stats';
import { flag, NAME3, shortName } from '../lib/time';
import { colors, alpha } from '../theme';

export const finishText = (r) => (classified(r) ? `P${r.position}` : r.positionText === 'D' ? 'DSQ' : 'DNF');
const finishColor = (r) => (r.position === 1 && classified(r) ? colors.gold : classified(r) && r.position <= 3 ? colors.accent : classified(r) ? colors.fg : colors.muted);
const gridText = (r) => `Grid: ${r.grid || 'Pit'}${r.fastest ? ' · FL' : ''}`;
const shortRace = (r) => shortName(r.race);

// Small card for the "last 5 races" strip.
export function RaceCard({ r, color, onPress }) {
  const body = (
    <Grad color={color} from={0.3} to={0.04} radius={16} border={r.position === 1 && classified(r) ? 0.8 : 0.3} style={[s.rc, r.position === 1 && classified(r) && { borderColor: alpha(colors.gold, 0.6) }]}>
      <Text style={s.rcTop}>R{r.round} {flag(NAME3[r.country] || '')}</Text>
      <Text style={s.rcName} numberOfLines={1}>{shortRace(r)}</Text>
      <Text style={[s.rcFin, { color: finishColor(r) }]}>{finishText(r)}</Text>
      <Text style={s.rcSub}>{gridText(r)}</Text>
      <Text style={s.rcSub}>{r.points} pts</Text>
    </Grad>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}>{body}</Pressable> : body;
}
// Full-width card for a season list. Tappable when onPress is given.
export function SeasonRow({ r, color, onPress }) {
  const podium = classified(r) && r.position <= 3, gold = classified(r) && r.position === 1;
  const body = (
    <Grad color={color} from={0.28} to={0.03} dir="h" radius={14} border={gold ? 0.8 : 0.25} style={[{ marginTop: 8 }, gold && { borderColor: alpha(colors.gold, 0.6) }]}>
      <View style={s.row}>
        <View style={[s.rd, { backgroundColor: alpha(podium ? finishColor(r) : color, 0.22) }]}><Text style={s.rdText}>R{r.round}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.race} numberOfLines={1}>{flag(NAME3[r.country] || '')} {shortRace(r)}</Text>
          <Text style={s.sub}>{gridText(r)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.fin, { color: finishColor(r) }]}>{finishText(r)}</Text>
          <Text style={s.sub}>{r.points} pts</Text>
        </View>
      </View>
    </Grad>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>{body}</Pressable> : body;
}
const s = StyleSheet.create({
  rc: { width: 128, padding: 12, gap: 1 },
  rcTop: { color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 1.2 }, rcName: { color: colors.fg, fontSize: 16, fontWeight: '600', marginTop: 2 }, rcFin: { fontFamily: 'display', fontWeight: '800', fontSize: 28, marginTop: 4 }, rcSub: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10 },
  rd: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rdText: { color: colors.fg, fontFamily: 'label', fontWeight: '700', fontSize: 13 },
  race: { color: colors.fg, fontSize: 18, fontWeight: '700' }, sub: { color: colors.muted, fontSize: 14 }, fin: { fontFamily: 'display', fontWeight: '800', fontSize: 22 },
});
