import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import HomeBtn from '../components/HomeBtn';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { StatGrid, ExpandStats, StarButton, DriverBox, TeamBadge } from '../components/Shared';
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
import { successor, NOW_NAMES } from '../data/lineage';
import Press from '../components/Press';
import { colors, alpha } from '../theme';
import { TintCtx } from '../lib/tint';

const dash = (v) => (v == null ? '—' : String(v));
export default function TeamScreen({ route, navigation }) {
  const { teamId, name } = route.params; const favs = useFavs(); const tc = useTeamColor(); const meta = usePaddockMeta(); const season0 = useSeason();
  const [year, setYear] = React.useState(route.params.year || YEAR); const isCur = year === YEAR;
  const seasons = useAsync(() => constructorSeasonsList(teamId), [teamId]);
  const season = useAsync(() => constructorSeason(year, teamId), [teamId, year]);
  // The season figures go first; the all-time record and titles start once they are on screen.
  const early = !season.loading;
  const career = useAsync(() => (early ? constructorCareer(teamId, YEAR) : Promise.resolve(null)), [teamId, early]);
  const titles = useAsync(() => (early ? constructorTitles(teamId, YEAR) : Promise.resolve(null)), [teamId, early]);
  const table = useAsync(() => constructorStandings(year), [year]);
  const stand = { v: table.v ? table.v.find((x) => x.teamId === teamId) || null : table.v, loading: table.loading };
  // This season: only the drivers who raced in the latest Grand Prix (reserves never appear). Earlier seasons: everyone who drove for the team.
  const drivers = useAsync(async () => {
    const [lu, dt] = await Promise.all([isCur ? lineups(YEAR) : teamDrivers(year, teamId).then((l) => ({ [teamId]: l })), driverStandings(year)]);
    return (lu[teamId] || []).map((d) => ({ ...d, teamId, st: dt.find((x) => x.driverId === d.driverId), team: name })).sort((a, b) => (a.st?.position ?? 99) - (b.st?.position ?? 99));
  }, [teamId, year]);
  React.useEffect(() => { navigation.setOptions({ headerTransparent: true, headerTitle: '', headerStyle: { backgroundColor: 'transparent' }, headerRight: () => <HomeBtn><StarButton bare on={favs.isTeam(teamId)} onPress={() => favs.toggleTeam(teamId)} label="Favourite" /></HomeBtn> }); }, [favs.teams]);
  const C = career.v, S = season.v, st = stand.v, color = tc(teamId), photo = isCur ? principalPhoto(teamId) : null, pr = isCur ? principalsOf(teamId) : [];
  const nowTeam = successor[teamId] && successor[teamId] !== teamId ? successor[teamId] : null; // the team that carries this one today
  const tName = st?.name || name; // the name the team raced under that year
  const champion = !!table.v && table.v.length > 1 && table.v[0].teamId === teamId && (isCur ? clinched(table.v, 'constructor', season0.races?.length, season0.races) : true);
  return (
    <TintCtx.Provider value={color}><Screen header={false} bleed>
      <View style={{ marginHorizontal: -16, marginTop: -16, height: 300, overflow: 'hidden', backgroundColor: colors.bg }}>
        <LinearGradient pointerEvents="none" colors={[alpha(color, 0.62), alpha(color, 0.2), colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -40, width: 360, height: 360 }}>
          {Array.from({ length: 12 }, (_, gi) => { const k = 1 - gi * 0.075; return <View key={gi} style={{ position: 'absolute', width: 360 * k, height: 360 * k, borderRadius: 180 * k, top: 180 * (1 - k), left: 180 * (1 - k), backgroundColor: alpha(color, 0.035) }} />; })}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 20, top: 72 }}><TeamBadge teamId={teamId} name={tName} size={34} /></View>
        {photo ? <Image pointerEvents="none" source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -24, top: 50, width: 270, height: 270, opacity: 0.9 }} /> : null}
        <LinearGradient pointerEvents="none" colors={[alpha(colors.bg, 0), alpha(colors.bg, 0.75), colors.bg]} locations={[0, 0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }} />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 14 }}>
          <Text style={{ color: '#C9CED8', fontSize: 12, letterSpacing: 1.8, fontWeight: '700' }}>{(isCur ? 'CONSTRUCTOR' : `CONSTRUCTOR · ${year}`)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flexShrink: 1, color: colors.fg, fontSize: 38, fontWeight: '900', lineHeight: 42 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{String(tName).toUpperCase()}</Text>{champion ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: alpha(colors.gold, 0.18), borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: alpha(colors.gold, 0.6) }}><Ionicons name="trophy" size={12} color={colors.gold} /><Text style={{ color: colors.gold, fontFamily: 'label', fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>{`CHAMPION ${year}`}</Text></View> : null}</View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[['STANDING', st ? `P${st.position}` : '—'], ['POINTS', dash(st?.points)], ['WINS', dash(st?.wins)]].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 18, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }}>{v}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' }}>{k}</Text>
          </View>))}
      </View>
      {(seasons.v || []).length > 1 ? <SeasonSwitch compact year={year} years={seasons.v} onChange={setYear} /> : null}
      {nowTeam ? (
        <Press onPress={() => navigation.push('Team', { teamId: nowTeam, name: NOW_NAMES[nowTeam] || nowTeam })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
            <Ionicons name="swap-horizontal" size={16} color={color} />
            <Text style={{ color: colors.muted, fontSize: 14, flex: 1 }}>{`Raced as ${tName}${isCur ? '' : ` in ${year}`}. Today this team is ${NOW_NAMES[nowTeam] || nowTeam}.`}</Text>
          </View>
        </Press>) : null}
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
                <Text style={{ color: colors.onSoft, fontSize: 13, letterSpacing: 0.4 }} numberOfLines={2}>{p.role}</Text>
                <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{p.name}</Text>
              </Grad>))}
          </View>
        </View>) : null}
      <Press onPress={() => navigation.navigate('TeamCompare', { a: { teamId, name: tName }, year: isCur ? undefined : year })}>
        <View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: alpha(color, 0.18), borderWidth: 1, borderColor: alpha(color, 0.55) }}>
          <Ionicons name="git-compare" size={18} color={color} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>Compare with another team</Text>
        </View>
      </Press>
      <Card>
        <Eyebrow>{`${year} season`}</Eyebrow>
        {(season.loading || stand.loading) && <Skeleton />}
        {S && <ExpandStats cols={3} items={[
          ['Position', st ? `P${st.position}` : '—'], ['Points', dash(st?.points)], ['Wins', dash(S.wins)],
          ['Podiums', dash(S.podiums)], ['Poles', dash(S.poles)], ['Fast laps', dash(S.fastest)],
          ['Races', dash(S.races)], ['1-2 finishes', dash(S.doubles)], ['DNF / NC', dash(S.dnf)],
        ]} />}
      </Card>
      <Card>
        <Eyebrow>All-time record</Eyebrow>
        {(career.loading || !early) && <><Skeleton /><Note>Loading team history. The first time can take several seconds.</Note></>}
        {career.error && <ErrorNote error={career.error} onRetry={career.reload} />}
        {C && <StatGrid cols={3} items={[['Wins', dash(C.wins)], ['Poles', dash(C.poles)], ['Titles', titles.loading ? '…' : dash(titles.v)], ['Seasons', dash(C.seasons)], ['First year', dash(C.first)]]} />}
      </Card>
    </Screen></TintCtx.Provider>
  );
}
const s = StyleSheet.create({ name: { fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', color: colors.fg, fontSize: 32 } });
