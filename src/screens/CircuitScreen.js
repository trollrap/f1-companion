import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import Svg, { Path } from 'react-native-svg';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import { circuitFor } from '../data/circuits';
import { fetchOutline } from '../api/openf1';
import { flag } from '../lib/time';
import { colors } from '../theme';

function Outline({ pts }) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 240, H = 170, pad = 14, sc = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
  const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
  const d = pts.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'}${((p[0] - x0) * sc + ox).toFixed(1)} ${(H - ((p[1] - y0) * sc + oy)).toFixed(1)}`).join(' ') + 'Z';
  return <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={230}><Path d={d} stroke="rgba(255,255,255,0.08)" strokeWidth={11} fill="none" strokeLinejoin="round" /><Path d={d} stroke={colors.accent} strokeWidth={3.2} fill="none" strokeLinejoin="round" strokeLinecap="round" /></Svg>;
}
export default function CircuitScreen({ route, navigation }) {
  const { meeting } = route.params; const c = circuitFor(meeting); const [pts, setPts] = useState(null); const [failed, setFailed] = useState(false);
  useEffect(() => { navigation.setOptions({ title: c ? c.name : meeting.circuit_short_name }); fetchOutline(meeting.circuit_key).then((p) => (p ? setPts(p) : setFailed(true))).catch(() => setFailed(true)); }, []);
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.2} to={0.02} style={{ padding: 14 }}>
        <Text style={s.place}>{flag(meeting.country_code)}  {c ? c.place : meeting.location}</Text>
        {pts && pts.length > 20 ? <Outline pts={pts} /> : <Note>{failed ? 'The track map is not available for this circuit yet.' : 'Loading track map…'}</Note>}
      </Grad>
      {c && (
        <View style={s.grid}>
          {c.stats.map(([k, v]) => <View key={k} style={s.stat}><Text style={s.k}>{k.toUpperCase()}</Text><Text style={s.v}>{v}</Text></View>)}
          {c.lapRecord && (
            // Same size as the other boxes. Only when the count is odd does it take a full row, so no empty slot is left.
            <View style={[s.stat, (c.stats.length + 1) % 2 === 1 && { width: '100%' }]}>
              <Text style={s.k}>{(c.lapRecordLabel || 'Lap record').toUpperCase()}</Text>
              <Text style={s.v}>{c.lapRecord.time}</Text>
              <Text style={s.sub} numberOfLines={2}>{c.lapRecord.driver} · {c.lapRecord.year}</Text>
            </View>)}
        </View>
      )}
      {c && c.facts.length > 0 && <Card><Eyebrow>Notable details</Eyebrow>{c.facts.map(([t, x]) => <Text key={t} style={s.fact}><Text style={{ fontWeight: '700', color: colors.fg }}>{t}. </Text>{x}</Text>)}</Card>}
      {c && <Card><Eyebrow>About</Eyebrow><Text style={s.fact}>{c.about}</Text></Card>}
    </Screen>
  );
}
const s = StyleSheet.create({
  place: { color: colors.muted, fontSize: 16, marginBottom: 6 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 }, k: { color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 },
  v: { color: colors.fg, fontSize: 22, fontWeight: '700', marginTop: 2 }, sub: { color: colors.muted, fontSize: 14 }, fact: { color: '#CDD0D8', fontSize: 17, marginTop: 10 },
});
