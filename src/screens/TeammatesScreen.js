import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { colors } from '../theme';
import { localTeammates } from '../api/history';

const Split = ({ a, b, color, label }) => { const t = a + b || 1; return (
  <View style={{ gap: 4 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: a > b ? colors.fg : colors.muted, fontSize: 17, fontWeight: '800' }}>{a}</Text><Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 1.4 }}>{label}</Text><Text style={{ color: b > a ? colors.fg : colors.muted, fontSize: 17, fontWeight: '800' }}>{b}</Text></View>
    <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.surface2 }}><View style={{ flex: a / t, backgroundColor: color }} /><View style={{ flex: b / t, backgroundColor: colors.muted, opacity: 0.45 }} /></View>
  </View>); };
// Every team-mate the driver has had, season by season, from the offline history.
export default function TeammatesScreen({ route, navigation }) {
  const { driverId, name, color = colors.accent } = route.params || {}; const rows = localTeammates(driverId);
  if (!rows || !rows.length) return <Screen header={false}><Card><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>No team-mate data</Text><Note>The offline history has no seasons with a team-mate for this driver (new drivers appear after the next history update).</Note></Card></Screen>;
  const tot = rows.reduce((a, r) => ({ qa: a.qa + r.qa, qb: a.qb + r.qb, ra: a.ra + r.ra, rb: a.rb + r.rb }), { qa: 0, qb: 0, ra: 0, rb: 0 });
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>{`${name || 'Driver'} · all team-mates`}</Eyebrow>
        <View style={{ gap: 12, marginTop: 10 }}><Split a={tot.qa} b={tot.qb} color={color} label="QUALIFYING" /><Split a={tot.ra} b={tot.rb} color={color} label="RACE FINISH" /></View>
        <Note>Counted over races both drivers started for the same team. Grid slot decides qualifying; a driver who retired counts as behind.</Note>
      </Card>
      {rows.map((r) => (
        <Card key={`${r.year}:${r.mate}`}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}><Text style={{ color: color, fontSize: 22, fontWeight: '800' }}>{r.year}</Text><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', flex: 1 }} numberOfLines={1}>{`vs ${r.mateName}`}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{r.team}</Text></View>
          <View style={{ gap: 10, marginTop: 10 }}><Split a={r.qa} b={r.qb} color={color} label="QUALIFYING" /><Split a={r.ra} b={r.rb} color={color} label="RACE" /><Split a={Math.round(r.pa)} b={Math.round(r.pb)} color={color} label="POINTS" /></View>
        </Card>))}
    </Screen>
  );
}
