import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { driverTimeline } from '../api/history';
import { colors, alpha, teamColor } from '../theme';

// A driver's whole career as one bar: every team stint in order, sized by the number of seasons, with title seasons starred.
export default function DriverTimeline({ driverId }) {
  const tl = useMemo(() => { try { return driverTimeline(driverId); } catch { return null; } }, [driverId]);
  if (!tl || !tl.stints.length) return null; const span = tl.to - tl.from + 1;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Career timeline</Eyebrow><Text style={{ color: colors.muted, fontSize: 13 }}>{`${tl.from} to ${tl.to}`}</Text></View>
      <View accessible accessibilityLabel={`Career ${tl.from} to ${tl.to}: ${tl.stints.map((s) => `${s.team} ${s.from} to ${s.to}`).join(', ')}`} style={{ flexDirection: 'row', height: 40, borderRadius: 10, overflow: 'hidden', marginTop: 12, gap: 2 }}>
        {tl.stints.map((s) => (<View key={`${s.teamId}${s.from}`} style={{ flex: s.to - s.from + 1, backgroundColor: teamColor(s.teamId) || colors.muted, justifyContent: 'center', paddingHorizontal: 4, minWidth: 6 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{s.to - s.from + 1 >= Math.max(2, span / 6) ? s.team : ''}</Text></View>))}
      </View>
      {tl.titles.length ? (<View style={{ flexDirection: 'row', height: 16, marginTop: 4 }}>{tl.titles.map((y) => (<View key={y} style={{ position: 'absolute', left: `${((y - tl.from + 0.5) / span) * 100}%`, marginLeft: -7 }}><Ionicons name="star" size={14} color={colors.gold} /></View>))}</View>) : null}
      <View style={{ marginTop: 8 }}>{tl.stints.map((s) => (<View key={`${s.teamId}${s.from}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: teamColor(s.teamId) || colors.muted }} /><Text style={{ flex: 1, color: colors.fg, fontWeight: '700' }} numberOfLines={1}>{s.team}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${s.from === s.to ? s.from : `${s.from}-${String(s.to).slice(2)}`} · ${s.races} races${s.wins ? ` · ${s.wins} win${s.wins === 1 ? '' : 's'}` : ''}`}</Text></View>))}</View>
      {tl.titles.length ? <Note>{`World champion: ${tl.titles.join(', ')}.`}</Note> : null}
    </Card>);
}
