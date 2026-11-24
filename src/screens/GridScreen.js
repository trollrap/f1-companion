import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFavs } from '../hooks/useFavs';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Note } from '../components/Screen';
import { DriverBox } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { entryList, lineups } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { PERM_NUMBERS } from '../api/paddock';
import { colors } from '../theme';

const ID_FIX = { lindblad: 'arvid_lindblad' }; // the live data knows him by the long id
// Next season's grid. It reads the entry list straight from the data server, so it fills in by itself as teams and drivers are confirmed.
export default function GridScreen() {
  const navigation = useNavigation(); const favs = useFavs(); const next = YEAR + 1;
  const g = useAsync(() => entryList(next), []); const now = useAsync(() => lineups(YEAR), []);
  const numOf = { rafael_camara: 51 }; Object.values(now.v || {}).forEach((l) => l.forEach((d) => { if (d.number) numOf[d.driverId] = d.number; }));
  return (
    <Screen header={false}>
      <Card><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>{`${next} grid`}</Text><Text style={{ color: colors.muted, fontSize: 15, marginTop: 4 }}>Updates by itself as the entry list is published. Pull down to refresh.</Text></Card>
      {g.loading && <Skeleton rows={4} />}
      {g.error && <ErrorNote error={g.error} onRetry={g.reload} />}
      {g.v && !g.v.length && <Card><Note>{`The ${next} entry list has not been published yet. It appears here as soon as it is.`}</Note></Card>}
      {g.v?.map((t0) => { const t = { ...t0, drivers: t0.drivers.map((d) => ({ ...d, driverId: ID_FIX[d.driverId] || d.driverId })) }; return (
        <View key={t.teamId} style={{ gap: 8 }}>
          <Pressable onPress={() => navigation.navigate('Team', { teamId: t.teamId, name: t.name })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 12, letterSpacing: 2.2, fontWeight: '600' }}>{String(t.name).toUpperCase()}</Text><Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {t.drivers.slice(0, 2).map((d) => (
              <DriverBox key={d.driverId} d={{ ...d, teamId: t.teamId, team: t.name, number: d.number ?? numOf[d.driverId] ?? PERM_NUMBERS[d.driverId] }} fav={favs.isDriver(d.driverId)} onStar={() => favs.toggleDriver(d.driverId)}
                onPress={() => navigation.navigate('Driver', { driverId: d.driverId, name: `${d.first} ${d.last}`, first: d.first, last: d.last, teamId: t.teamId, team: t.name })} />))}
            {t.drivers.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        </View>); })}
    </Screen>
  );
}
