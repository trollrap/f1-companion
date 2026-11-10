import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { useAsync } from '../hooks/useAsync';
import { pitStops } from '../api/openf1';
import { colors, alpha } from '../theme';

const Line = ({ left, mid, right, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
    <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: color || colors.muted }} />
    <Text style={{ flex: 1, color: colors.fg, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{left}</Text>
    <Text style={{ color: colors.muted, fontSize: 13 }}>{mid}</Text>
    <Text style={{ width: 62, textAlign: 'right', color: colors.fg, fontWeight: '800', fontSize: 15 }}>{right}</Text>
  </View>);
// Race stats: biggest movers from the grid (Jolpica results) and the fastest pit stops (OpenF1, when the race has a session key).
export default function RaceStats({ rows, sessionKey, colorOf }) {
  const pit = useAsync(() => (sessionKey ? pitStops(sessionKey) : Promise.resolve(null)), [sessionKey]);
  const fin = (rows || []).filter((r) => r.grid > 0 && !/^(R|D|W|N|E|F)$/.test(String(r.positionText)) && Number(r.position) > 0);
  const mv = fin.map((r) => ({ r, d: r.grid - Number(r.position) }));
  const up = [...mv].filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3), down = [...mv].filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
  const pr = pit.v?.rows || []; const col = (r) => (colorOf ? colorOf(r.teamId) : null);
  if (!mv.length && !pr.length && !pit.loading) return null;
  return (
    <Card>
      <Eyebrow>Race stats</Eyebrow>
      {up.length > 0 && (<View style={{ marginTop: 10 }}><Text style={{ color: colors.good, fontWeight: '800', fontSize: 12, letterSpacing: 1.5, marginBottom: 2 }}>BIGGEST CLIMBERS</Text>
        {up.map((x) => <Line key={x.r.driverId} left={x.r.last} mid={`P${x.r.grid} to P${x.r.position}`} right={`+${x.d}`} color={col(x.r)} />)}</View>)}
      {down.length > 0 && (<View style={{ marginTop: 10 }}><Text style={{ color: colors.red, fontWeight: '800', fontSize: 12, letterSpacing: 1.5, marginBottom: 2 }}>BIGGEST FALLERS</Text>
        {down.map((x) => <Line key={x.r.driverId} left={x.r.last} mid={`P${x.r.grid} to P${x.r.position}`} right={`${x.d}`} color={col(x.r)} />)}</View>)}
      {pit.loading ? <View style={{ marginTop: 10 }}><Skeleton rows={2} /></View> : null}
      {pr.length > 0 && (<View style={{ marginTop: 10 }}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1.5, marginBottom: 2 }}>{pit.v.stat ? 'FASTEST PIT STOPS' : 'FASTEST PIT LANE TIMES'}</Text>
        {pr.slice(0, 5).map((p, i) => <Line key={`${p.number}-${p.lap}-${i}`} left={p.last} mid={`${p.team || ''} · lap ${p.lap}`} right={`${p.dur.toFixed(2)}s`} color={p.color} />)}
        <Note>{`${pit.v.total} stops in the race. ${pit.v.stat ? 'Time stationary.' : 'Time in the pit lane, so it includes the drive through.'}`}</Note></View>)}
      {!mv.length && !pr.length && !pit.loading ? <Note>No stats are available for this race yet.</Note> : null}
    </Card>);
}
