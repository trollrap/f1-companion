import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import UpdateBanner from '../components/UpdateBanner';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { Countdown, ResultRow, ResultLine, DriverName } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import { SprintBadge } from '../components/Badge';
import { useSeason, useNow } from '../hooks/useSeason';
import { useAsync } from '../hooks/useAsync';
import { driverStandings } from '../api/jolpica';
import LastSession from '../components/LastSession';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';
import { useTeamColor } from '../hooks/useTeams';
import { ScrollView, Image } from 'react-native';
import { driverPhoto } from '../lib/media';
import { useFavs } from '../hooks/useFavs';
import { dateRange, shortName, flag } from '../lib/time';

export function targetOf(next, sessions, now) {
  const cur = sessions.find((x) => now >= Date.parse(x.date_start) && now < Date.parse(x.date_end));
  const up = sessions.find((x) => Date.parse(x.date_start) > now);
  return { cur, target: cur ? Date.parse(cur.date_end) : up ? Date.parse(up.date_start) : Date.parse(next.date_start),
    label: cur ? `${cur.session_name} ends in` : up ? `Until ${up.session_name}` : 'Until lights out' };
}
export default function HomeScreen({ navigation }) {
  const season = useSeason(); const now = useNow();
  const favs = useFavs(); const tc = useTeamColor();
  const stand = useAsync(() => driverStandings(YEAR), []);
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (season.status !== 'loading') { setSlow(false); return; } const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [season.status]);
  if (season.status === 'loading') return (
    <Screen>
      <Skeleton />
      {slow ? <Note>Still loading. The race data servers are slow or unreachable from this device. Open Settings (gear icon) and run Check data sources.</Note> : null}
    </Screen>
  );
  if (season.status === 'error') return <Screen><Card><Text style={s.big}>Couldn't load the season</Text><ErrorNote error={season.error} onRetry={season.reload} /></Card></Screen>;
  const { next, sessions, total } = season; const t = next && targetOf(next, sessions, now);
  const rows = stand.v || []; const mine = rows.filter((r) => favs.isDriver(r.driverId));
  const openDriver = (r) => navigation.navigate('Driver', { driverId: r.driverId, name: r.name, first: r.first, last: r.last, teamId: r.teamId, team: r.team });
  return (
    <Screen>
      <UpdateBanner />
      {next ? (
        <Pressable onPress={() => navigation.navigate('RaceDetail', { meeting: next })} style={({ pressed }) => pressed && { transform: [{ scale: 0.99 }] }}>
          <Grad color={colors.accent} from={0.34} to={0.04} border={0.45} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Eyebrow color={colors.accent}>{Date.parse(next.date_start) <= now ? 'Race weekend · in progress' : 'Next race'}</Eyebrow>{next.has_sprint ? <SprintBadge /> : null}
              <Text style={s.pill}>R{next.round} / {total}</Text>
            </View>
            <View style={s.top}>
              <Text style={{ fontSize: 30 }}>{flag(next.country_code)}</Text>
              <View style={{ flex: 1 }}><Text style={s.gp}>{shortName(next.meeting_name)}</Text><Text style={s.meta}>{dateRange(next)}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
            <Text style={[s.meta, { marginTop: 12, letterSpacing: 2, fontSize: 11 }]}>{t.label.toUpperCase()}</Text>
            <Countdown ms={t.target - now} />
            <Pressable onPress={() => navigation.navigate('Predict')} hitSlop={6} accessibilityLabel="Predict this race" style={({ pressed }) => [{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: alpha(colors.accent, 0.6) }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="trophy-outline" size={15} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 14 }}>Predict</Text>
            </Pressable>
          </Grad>
        </Pressable>
      ) : <Card><Text style={s.big}>Season complete</Text></Card>}

      {mine.length > 0 && (
        <View>
          <Eyebrow>Your drivers</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
            {mine.map((r) => { const photo = driverPhoto(r.driverId); return (
              <Pressable key={r.driverId} onPress={() => openDriver(r)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Grad color={tc(r.teamId)} from={0.6} to={0.08} radius={16} style={{ width: 170, height: 148 }}>
                  {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -14, bottom: -12, width: 156, height: 156 }} /> : null}
                  {photo ? <Scrim dir="v" from={0} to={0.82} style={{ top: '35%' }} /> : null}
                  <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 30, color: colors.fg }}>P{r.position}</Text>
                    <View><DriverName first={r.first} last={r.last} size={19} /><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{r.points} pts</Text></View>
                  </View>
                </Grad>
              </Pressable>); })}
          </ScrollView>
        </View>
      )}

      <LastSession season={season} navigation={navigation} />

      <Card>
        <Eyebrow>Driver standings</Eyebrow>
        {stand.loading && <Skeleton />}
        {stand.error && <ErrorNote error={stand.error} onRetry={stand.reload} />}
        <View style={{ marginTop: 6 }}>
          {rows.slice(0, 5).map((r, i) => (
            <ResultLine key={r.driverId} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} fav={favs.isDriver(r.driverId)}
              right={i === 0 ? 'Leader' : `−${rows[0].points - r.points}`} sub={`${r.points} pts`} photoId={r.driverId} logoId={r.teamId} onPress={() => openDriver(r)} />))}
        </View>
        {rows.length > 0 && <Pressable onPress={() => navigation.navigate('Standings')} style={s.more}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>Full standings</Text><Ionicons name="chevron-forward" size={16} color={colors.accent} /></Pressable>}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  gp: { color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }, meta: { color: colors.muted, fontSize: 16 }, big: { color: colors.fg, fontSize: 22, fontWeight: '700' },
  pill: { marginLeft: 'auto', color: colors.fg, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', fontWeight: '600', fontSize: 12 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 6 },
});
