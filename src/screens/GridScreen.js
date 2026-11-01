import React from 'react';
import { View } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Note } from '../components/Screen';
import Grad from '../components/Grad';
import { TeamBadge } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { entryList, lineups } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

// Next season's grid. It reads the entry list straight from the data server, so it fills in by itself as teams and drivers are confirmed.
export default function GridScreen() {
  const tc = useTeamColor(); const next = YEAR + 1;
  const g = useAsync(() => entryList(next), []); const now = useAsync(() => lineups(YEAR), []);
  const was = {}; Object.entries(now.v || {}).forEach(([tid, l]) => l.forEach((d) => { was[d.driverId] = tid; }));
  return (
    <Screen header={false}>
      <Card><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>{`${next} grid`}</Text><Text style={{ color: colors.muted, fontSize: 15, marginTop: 4 }}>Updates by itself as the entry list is published. Pull down to refresh.</Text></Card>
      {g.loading && <Skeleton rows={4} />}
      {g.error && <ErrorNote error={g.error} onRetry={g.reload} />}
      {g.v && !g.v.length && <Card><Note>{`The ${next} entry list has not been published yet. It appears here as soon as it is.`}</Note></Card>}
      {g.v?.map((t) => (
        <Grad key={t.teamId} color={tc(t.teamId)} from={0.6} to={0.08} dir="h" radius={18} border={0.45} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TeamBadge teamId={t.teamId} name={t.name} size={34} /><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700' }}>{t.name}</Text></View>
          <View style={{ marginTop: 10, gap: 8 }}>
            {t.drivers.map((d) => {
              const moved = was[d.driverId] && was[d.driverId] !== t.teamId, fresh = now.v && !was[d.driverId];
              return (
                <View key={d.driverId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ width: 44, textAlign: 'right', fontFamily: 'display', fontWeight: '800', fontSize: 22, color: colors.fg, fontStyle: 'italic' }}>{d.number ?? ''}</Text>
                  <View style={{ width: 2, height: 28, borderRadius: 1, backgroundColor: alpha('#FFFFFF', 0.55) }} />
                  <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{`${d.first} ${String(d.last).toUpperCase()}`}</Text>
                  {moved || fresh ? <View style={{ backgroundColor: alpha(colors.gold, 0.2), borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{moved ? 'NEW TEAM' : 'NEW'}</Text></View> : null}
                </View>);
            })}
          </View>
        </Grad>))}
    </Screen>
  );
}
