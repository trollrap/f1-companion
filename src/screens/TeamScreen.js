import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { StatGrid, StarButton, DriverBox, TeamBadge } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import SeasonSwitch from '../components/SeasonSwitch';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { constructorCareer, constructorTitles, constructorSeason, constructorStandings, driverStandings, lineups, teamDrivers, constructorSeasonsList } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { principalPhoto } from '../lib/media';
import { principalsOf } from '../data/principals';
import { clinched } from '../lib/champion';
import { colors, alpha } from '../theme';

const dash = (v) => (v == null ? '—' : String(v));
export default function TeamScreen({ route, navigation }) {
  const { teamId, name } = route.params; const favs = useFavs(); const tc = useTeamColor(); const meta = usePaddockMeta(); const season0 = useSeason();
  const [year, setYear] = React.useState(route.params.year || YEAR); const isCur = year === YEAR;
  const seasons = useAsync(() => constructorSeasonsList(teamId), [teamId]);
  const career = useAsync(() => constructorCareer(teamId, YEAR), [teamId]);
  const titles = useAsync(() => constructorTitles(teamId, YEAR), [teamId]);
  const season = useAsync(() => constructorSeason(year, teamId), [teamId, year]);
  const table = useAsync(() => constructorStandings(year), [year]);
  const stand = { v: table.v ? table.v.find((x) => x.teamId === teamId) || null : table.v, loading: table.loading };
  // This season: only the drivers who raced in the latest Grand Prix (reserves never appear). Earlier seasons: everyone who drove for the team.
  const drivers = useAsync(async () => {
    const [lu, dt] = await Promise.all([isCur ? lineups(YEAR) : teamDrivers(year, teamId).then((l) => ({ [teamId]: l })), driverStandings(year)]);
    return (lu[teamId] || []).map((d) => ({ ...d, teamId, st: dt.find((x) => x.driverId === d.driverId), team: name })).sort((a, b) => (a.st?.position ?? 99) - (b.st?.position ?? 99));
  }, [teamId, year]);
  React.useEffect(() => { navigation.setOptions({ headerRight: () => <StarButton on={favs.isTeam(teamId)} onPress={() => favs.toggleTeam(teamId)} label="Favourite" /> }); }, [favs.teams]);
  const C = career.v, S = season.v, st = stand.v, color = tc(teamId), photo = isCur ? principalPhoto(teamId) : null, pr = isCur ? principalsOf(teamId) : [];
  const tName = st?.name || name; // the name the team raced under that year
  const champion = !!table.v && table.v.length > 1 && table.v[0].teamId === teamId && (isCur ? clinched(table.v, 'constructor', season0.races?.length, season0.races) : true);
  return (
    <Screen header={false}>
      <Grad color={champion ? colors.gold : color} from={champion ? 0.55 : 0.68} to={0.06} border={champion ? 0.9 : 0.5} style={{ height: 200 }}>
        {champion ? <LinearGradient pointerEvents="none" colors={[alpha(color, 0.7), alpha(color, 0.05)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -24, bottom: -24, width: 236, height: 236 }} /> : null}
        {photo ? <Scrim dir="h" from={0.6} to={0} style={{ right: '30%' }} /> : null}
        {photo ? <Scrim dir="v" from={0} to={0.55} style={{ top: '60%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TeamBadge teamId={teamId} name={tName} size={52} />
            {champion ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: alpha(colors.gold, 0.2), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: alpha(colors.gold, 0.7) }}><Ionicons name="trophy" size={13} color={colors.gold} /><Text style={{ color: colors.gold, fontFamily: 'label', fontWeight: '700', fontSize: 11, letterSpacing: 1.2 }}>{`CHAMPIONS ${year}`}</Text></View> : null}
          </View>
          <View style={{ maxWidth: '64%' }}>
            <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{tName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17 }}>{st ? `${isCur ? '' : `${year} · `}P${st.position} · ${st.points} pts · ${st.wins} ${st.wins === 1 ? 'win' : 'wins'}` : stand.loading ? ' ' : 'Not in the standings'}</Text>
          </View>
        </View>
      </Grad>
      {(seasons.v || []).length > 1 ? <SeasonSwitch compact year={year} years={seasons.v} onChange={setYear} caption={isCur ? 'tap to view another season' : `${tName} · tap to view another season`} /> : null}
      <View>
        <Eyebrow>{isCur ? 'Drivers' : `Drivers · ${year}`}</Eyebrow>
        {drivers.loading && <Skeleton rows={2} />}
        {drivers.error && <Note>Drivers unavailable: {drivers.error}</Note>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {drivers.v?.map((d) => (
            <View key={d.driverId} style={{ width: drivers.v.length > 2 ? '48%' : undefined, flex: drivers.v.length > 2 ? undefined : 1 }}>
              <DriverBox center d={{ ...d, number: isCur ? meta?.drivers?.[d.driverId]?.number : d.number }} fav={favs.isDriver(d.driverId)} onStar={() => favs.toggleDriver(d.driverId)}
                onPress={() => navigation.navigate('Driver', { driverId: d.driverId, name: d.name, first: d.first, last: d.last, teamId, team: tName, year: isCur ? undefined : year })} />
            </View>))}
        </View>
      </View>
      {pr.length ? (
        <View>
          <Eyebrow>Team leadership</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {pr.map((p, k) => (
              <Grad key={p.name} color={color} from={k === 0 ? 0.4 : 0.22} to={0.04} dir="h" radius={16} border={0.4} style={{ padding: 14, width: pr.length === 1 ? '100%' : '48%', minHeight: 92, justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 0.4 }} numberOfLines={2}>{p.role}</Text>
                <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{p.name}</Text>
              </Grad>))}
          </View>
        </View>) : null}
      <Card>
        <Eyebrow>{`${year} season`}</Eyebrow>
        {(season.loading || stand.loading) && <Skeleton />}
        {S && <StatGrid cols={3} items={[
          ['Position', st ? `P${st.position}` : '—'], ['Points', dash(st?.points)], ['Wins', dash(S.wins)],
          ['Podiums', dash(S.podiums)], ['Poles', dash(S.poles)], ['Fast laps', dash(S.fastest)],
          ['Races', dash(S.races)], ['1-2 finishes', dash(S.doubles)], ['DNF / NC', dash(S.dnf)],
        ]} />}
      </Card>
      <Card>
        <Eyebrow>All-time record</Eyebrow>
        {career.loading && <><Skeleton /><Note>Loading team history. The first time can take several seconds.</Note></>}
        {career.error && <ErrorNote error={career.error} onRetry={career.reload} />}
        {C && <StatGrid cols={3} items={[['Wins', dash(C.wins)], ['Poles', dash(C.poles)], ['Titles', titles.loading ? '…' : dash(titles.v)], ['Seasons', dash(C.seasons)], ['First year', dash(C.first)]]} />}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({ name: { fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', color: colors.fg, fontSize: 32 } });
