import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import Screen, { ErrorNote } from '../components/Screen';
import { Segmented, DriverBox, TeamRow } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { usePaddockMeta } from '../hooks/useTeams';
import { driverStandings, constructorStandings, lineups } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import Press from '../components/Press';
import { colors } from '../theme';

export default function PaddockScreen({ navigation }) {
  const [seg, setSeg] = useState('drivers'); const favs = useFavs(); const meta = usePaddockMeta();
  const d = useAsync(() => driverStandings(YEAR), []); const t = useAsync(() => constructorStandings(YEAR), []); const lu = useAsync(() => lineups(YEAR), []);
  const st = seg === 'drivers' ? d : t; const luv = lu.v || {};
  const teams = t.v || [], drivers = d.v || [];
  // Teams in championship order, favourite teams first; each team's drivers sit side by side.
  const ordered = [...teams.filter((x) => favs.isTeam(x.teamId)), ...teams.filter((x) => !favs.isTeam(x.teamId))];
  const pos = (id) => drivers.find((x) => x.driverId === id)?.position ?? 99;
  // The two drivers who raced for the team last time, favourites first, then by championship position.
  const crew = (teamId) => [...(luv[teamId] || [])].map((x) => ({ ...x, pos: drivers.find((y) => y.driverId === x.driverId)?.position, pts: drivers.find((y) => y.driverId === x.driverId)?.points, number: meta?.drivers?.[x.driverId]?.number ?? drivers.find((y) => y.driverId === x.driverId)?.permNumber ?? null })).sort((a, b) => pos(a.driverId) - pos(b.driverId));
  const tmName = (id) => teams.find((x) => x.teamId === id)?.name;
  const openDriver = (x) => navigation.navigate('Driver', { driverId: x.driverId, name: x.name, first: x.first, last: x.last, teamId: x.teamId, team: x.team });
  const box = (x) => <DriverBox key={x.driverId} d={x} fav={favs.isDriver(x.driverId)} onPress={() => openDriver({ ...x, team: tmName(x.teamId) })} onStar={() => favs.toggleDriver(x.driverId)} />;
  return (
    <Screen swipe={{ index: seg === 'teams' ? 1 : 0, count: 2, onIndex: (i) => setSeg(i ? 'teams' : 'drivers') }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Segmented value={seg} onChange={setSeg} items={[['drivers', 'Drivers'], ['teams', 'Teams']]} /></View>
        <Pressable onPress={() => navigation.navigate('Rules')} style={({ pressed }) => [s.rules, pressed && { opacity: 0.8 }]} accessibilityLabel="F1 rules"><Ionicons name="book-outline" size={18} color={colors.accent} /><Text style={s.rulesText}>Rules</Text></Pressable>
      </View>
      {seg === 'drivers' && (
        <Press onPress={() => navigation.navigate('Grid')}>
          <View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}>
            <Ionicons name="people-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`View the ${YEAR + 1} grid`}</Text>
          </View>
        </Press>)}
      {(st.loading || lu.loading) && <Skeleton rows={4} />}
      {st.error && <ErrorNote error={st.error} onRetry={st.reload} />}
      {seg === 'drivers' && ordered.map((tm) => {
        const ds = crew(tm.teamId);
        if (!ds.length) return null;
        return (
          <View key={tm.teamId} style={{ gap: 8 }}>
            <Pressable onPress={() => navigation.navigate('Team', { teamId: tm.teamId, name: tm.name })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.team}>{tm.name.toUpperCase()}</Text><Ionicons name="chevron-forward" size={14} color={colors.muted} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>{ds.slice(0, 2).map(box)}{ds.length === 1 ? <View style={{ flex: 1 }} /> : null}</View>
          </View>);
      })}
      {seg === 'teams' && ordered.map((x) => <TeamRow key={x.teamId} t={x} lineup={crew(x.teamId)} fav={favs.isTeam(x.teamId)} onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name })} onStar={() => favs.toggleTeam(x.teamId)} />)}
    </Screen>
  );
}
const s = StyleSheet.create({
  rules: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: colors.accent }, rulesText: { color: colors.fg, fontWeight: '700' },
  team: { color: colors.muted, fontFamily: 'label', fontSize: 12, letterSpacing: 2.2, fontWeight: '600' },
});
