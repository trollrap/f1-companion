import { up } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { weekendAt } from '../lib/weekend';
import { Text } from '../components/Text';
import Svg, { Path } from 'react-native-svg';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import { circuitFor } from '../data/circuits';
import { fetchOutline, YEAR } from '../api/openf1';
import { raceHistory } from '../api/history';
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
  const [miss, setMiss] = useState(''); const [all, setAll] = useState(false); const hist = React.useMemo(() => { try { return raceHistory(meeting.meeting_name); } catch { return null; } }, [meeting.meeting_name]);
  // Opens the race weekend of a given year at this circuit (optionally on a chosen session).
  const open = async (year, session) => { setMiss(''); try { const m = await weekendAt(c, Number(year)); if (m) navigation.push('Round', { meeting: m, session }); else setMiss(`No ${year} race weekend was found for this circuit.`); } catch { setMiss('Could not load that weekend. Check your connection.'); } };
  useEffect(() => { navigation.setOptions({ title: c ? c.name : meeting.circuit_short_name }); fetchOutline(meeting.circuit_key).then((p) => (p ? setPts(p) : setFailed(true))).catch(() => setFailed(true)); }, []);
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.2} to={0.02} style={{ padding: 14 }}>
        <Text style={s.place}>{flag(meeting.country_code)}  {c ? c.place : meeting.location}</Text>
        {pts && pts.length > 20 ? <Outline pts={pts} /> : <Note>{failed ? 'The track map is not available for this circuit yet.' : 'Loading track map…'}</Note>}
      </Grad>
      {c && (
        <View style={s.grid}>
          {c.stats.map(([k, v]) => /^\d{4}$/.test(String(v)) && /first/i.test(k)
            ? <Pressable key={k} onPress={() => open(v, 'Race')} style={({ pressed }) => [s.stat, pressed && { opacity: 0.7 }]}><Text style={s.k}>{up(k)}</Text><Text style={s.v}>{v}</Text><Text style={s.link}>View the race result <Ionicons name="chevron-forward" size={12} /></Text></Pressable>
            : <View key={k} style={s.stat}><Text style={s.k}>{up(k)}</Text><Text style={s.v}>{v}</Text></View>)}
          {c.lapRecord && (
            // Same size as the other boxes. Only when the count is odd does it take a full row, so no empty slot is left.
            <Pressable onPress={() => open(c.lapRecord.year, 'Race')} style={({ pressed }) => [s.stat, (c.stats.length + 1) % 2 === 1 && { width: '100%' }, pressed && { opacity: 0.7 }]}>
              <Text style={s.k}>{up(c.lapRecordLabel || 'Lap record')}</Text>
              <Text style={s.v}>{c.lapRecord.time}</Text>
              <Text style={s.sub} numberOfLines={2}>{c.lapRecord.driver} · {c.lapRecord.year}</Text>
              <Text style={s.link}>View that weekend <Ionicons name="chevron-forward" size={12} /></Text>
            </Pressable>)}
        </View>
      )}
      {miss ? <Note>{miss}</Note> : null}
      {meeting.year && meeting.year < YEAR ? <Note>{`Shown with today's track details. The ${meeting.year} layout may have been different.`}</Note> : null}
      {c && c.facts.length > 0 && <Card><Eyebrow>Notable details</Eyebrow>{c.facts.map(([t, x]) => <Text key={t} style={s.fact}><Text style={{ fontWeight: '700', color: colors.fg }}>{t}. </Text>{x}</Text>)}</Card>}
      {hist ? (
        <Card>
          <Eyebrow>{`Past winners · ${hist.races} races since ${hist.first}`}</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {hist.top.map((t) => (<View key={t.name} style={[s.stat, { width: undefined, flex: 1 }]}><Text style={s.k}>{`${t.wins} WIN${t.wins === 1 ? '' : 'S'}`}</Text><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={2}>{t.name}</Text></View>))}
          </View>
          <Text style={[s.fact, { marginTop: 10 }]}>{`${hist.fromPole} of ${hist.races} were won from pole (${Math.round((hist.fromPole / hist.races) * 100)}%).`}</Text>
          {hist.list.slice(0, all ? 80 : 8).map((x) => (<View key={x.year} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ width: 44, color: colors.muted, fontWeight: '700' }}>{x.year}</Text><Text style={{ flex: 1, color: colors.fg, fontWeight: '600' }} numberOfLines={1}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{`${x.team} · P${x.grid > 0 ? x.grid : 'pit'}`}</Text></View>))}
          {hist.list.length > 8 ? <Pressable onPress={() => setAll(!all)} hitSlop={8} accessibilityRole="button"><Text style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>{all ? 'Show fewer' : `Show all ${hist.list.length}`}</Text></Pressable> : null}
          <Note>Matched by the race's name, so earlier years may have been held at a different circuit.</Note>
        </Card>) : null}
      {c && <Card><Eyebrow>About</Eyebrow><Text style={s.fact}>{c.about}</Text></Card>}
    </Screen>
  );
}
const s = StyleSheet.create({
  place: { color: colors.muted, fontSize: 16, marginBottom: 6 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 }, k: { color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 },
  v: { color: colors.fg, fontSize: 22, fontWeight: '700', marginTop: 2 }, sub: { color: colors.muted, fontSize: 14 }, link: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 }, fact: { color: '#CDD0D8', fontSize: 17, marginTop: 10 },
});
