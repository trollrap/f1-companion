import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Card, Eyebrow } from './Screen';
import { TeamBadge } from './Shared';
import { driverTimeline } from '../api/history';
import { colors, alpha, teamColor } from '../theme';

// A driver's whole career: a slim bar of every team stint (sized by seasons, title seasons starred) and, below it, one card per stint on a vertical line
// with the team logo, years, races and wins.
export default function DriverTimeline({ driverId }) {
  const tl = useMemo(() => { try { return driverTimeline(driverId); } catch { return null; } }, [driverId]);
  if (!tl || !tl.stints.length) return null; const span = tl.to - tl.from + 1;
  const titlesIn = (s) => tl.titles.filter((y) => y >= s.from && y <= s.to);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Career timeline</Eyebrow><Text style={{ color: colors.muted, fontSize: 13 }}>{`${tl.from} to ${tl.to}`}</Text></View>
      <View accessible accessibilityLabel={`Career ${tl.from} to ${tl.to}: ${tl.stints.map((s) => `${s.team} ${s.from} to ${s.to}`).join(', ')}`} style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 12, gap: 2 }}>
        {tl.stints.map((s) => <View key={`${s.teamId}${s.from}`} style={{ flex: s.to - s.from + 1, backgroundColor: teamColor(s.teamId) || colors.muted, minWidth: 6 }} />)}
      </View>
      {tl.titles.length ? <View style={{ height: 16, marginTop: 3 }}>{tl.titles.map((y) => <View key={y} style={{ position: 'absolute', left: `${((y - tl.from + 0.5) / span) * 100}%`, marginLeft: -7 }}><Ionicons name="star" size={14} color={colors.gold} /></View>)}</View> : null}
      <View style={{ marginTop: 10 }}>
        {tl.stints.map((s, i) => { const c = teamColor(s.teamId) || colors.muted; const t = titlesIn(s); const last = i === tl.stints.length - 1; return (
          <View key={`${s.teamId}${s.from}`} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 14 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, marginTop: 18, borderWidth: 2, borderColor: colors.surface }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: alpha(c, 0.45), marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, marginBottom: last ? 0 : 10, borderRadius: 16, padding: 12, backgroundColor: alpha(c, 0.1), borderWidth: 1, borderColor: alpha(c, 0.35), flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TeamBadge teamId={s.teamId} name={s.team} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{s.team}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{s.from === s.to ? `${s.from}` : `${s.from} to ${s.to}`}{` · ${s.races} race${s.races === 1 ? '' : 's'}`}{s.wins ? ` · ${s.wins} win${s.wins === 1 ? '' : 's'}` : ''}</Text>
              </View>
              {t.length ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: alpha(colors.gold, 0.18), borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}><Ionicons name="trophy" size={12} color={colors.gold} /><Text style={{ color: colors.gold, fontWeight: '800', fontSize: 11 }}>{t.length > 1 ? `${t.length} titles` : `${t[0]}`}</Text></View> : null}
            </View>
          </View>); })}
      </View>
    </Card>);
}
