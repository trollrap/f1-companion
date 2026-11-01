import React, { useState } from 'react';
import { View, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { StatGrid, StarButton, Segmented, TeamBadge } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import { Pill } from '../components/Badge';
import { RaceCard, SeasonRow } from '../components/RaceRows';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { driverInfo, driverSeasonResults, driverSeasonQuali, driverCareer, driverTitles, driverStandings, driverSeasons } from '../api/jolpica';
import SeasonSwitch from '../components/SeasonSwitch';
import { clinched } from '../lib/champion';
import { engineerOf } from '../data/engineers';
import { YEAR } from '../api/openf1';
import { seasonStats, fix } from '../lib/stats';
import { splitName } from '../lib/names';
import { driverPhoto, engineerPhoto, numberImage, teamLogo } from '../lib/media';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';

const ageOn = (born) => { const b = new Date(born), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n < new Date(Date.UTC(n.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()))) a--; return a; };
const longDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dash = (v) => (v == null ? '—' : String(v));

export default function DriverScreen({ route, navigation }) {
  const { driverId, name, teamId, team } = route.params; const favs = useFavs(); const tc = useTeamColor(); const meta = usePaddockMeta(); const season0 = useSeason();
  const nm = route.params.last ? { first: route.params.first, last: route.params.last } : splitName(name);
  const [tab, setTab] = useState('season'); const [all, setAll] = useState(false); const [pick, setPick] = useState(route.params.year || null);
  const info = useAsync(() => driverInfo(driverId), [driverId]);
  const seasons = useAsync(() => driverSeasons(driverId), [driverId]); // every season he raced in, newest first
  // Opens on the current season; a driver who is not racing now opens on the last season he raced in.
  const raced = seasons.v; const nowStand = useAsync(() => driverStandings(YEAR), []);
  const activeNow = !nowStand.v || nowStand.v.some((x) => x.driverId === driverId); // judged by this season's standings, not by a cached career list
  const year = pick != null ? pick : !activeNow && raced && raced.length ? raced.find((y) => y < YEAR) ?? YEAR : YEAR; const isCur = year === YEAR;
  const season = useAsync(async () => {
    const rows = await driverSeasonResults(year, driverId);
    const q = await driverSeasonQuali(year, driverId).catch(() => ({ poles: null, q3: null }));
    return { rows, stats: seasonStats(rows, q.poles, q.q3) };
  }, [driverId, year]);
  const career = useAsync(() => driverCareer(driverId, YEAR), [driverId]);
  const titles = useAsync(() => driverTitles(driverId, YEAR), [driverId]);
  const standAll = useAsync(() => driverStandings(year), [year]);
  const stand = { v: standAll.v ? standAll.v.find((x) => x.driverId === driverId) || null : standAll.v, loading: standAll.loading };
  React.useEffect(() => { navigation.setOptions({ headerRight: () => <StarButton on={favs.isDriver(driverId)} onPress={() => favs.toggleDriver(driverId)} label="Favourite" /> }); }, [favs.drivers]);
  const rows = season.v?.rows || [];
  // The team he drove for in the viewed season (the current team when it is this season).
  const sTeamId = (isCur ? teamId : null) || rows.at(-1)?.teamId || stand.v?.teamId || teamId, sTeam = (isCur ? team : null) || rows.at(-1)?.team || stand.v?.team || team;
  const i = info.v, S = season.v?.stats, C = career.v, st = stand.v, color = (isCur && route.params.color) || tc(sTeamId), photo = driverPhoto(driverId), eng = engineerPhoto(driverId), numImg = numberImage(driverId);
  const number = meta?.drivers?.[driverId]?.number ?? i?.number, code = meta?.drivers?.[driverId]?.code || i?.code;
  const champion = !!standAll.v && standAll.v.length > 1 && standAll.v[0].driverId === driverId && (isCur ? clinched(standAll.v, 'driver', season0.races?.length, season0.races) : true);
  const engName = isCur ? engineerOf(driverId) : null;
  // A reserve or test driver has no Grand Prix record: show the card and a note instead of empty tabs.
  const noHistory = !info.loading && (info.v === null || !!info.error) && !season.loading && !rows.length && !seasons.loading && !(seasons.v || []).length;
  const openRace = (r) => { const m = season0.races?.find((x) => Number(x.round) === r.round); if (m) navigation.navigate('Round', { meeting: m }); };
  return (
    <Screen header={false} swipe={{ index: ['season', 'career', 'profile'].indexOf(tab), count: 3, onIndex: (n) => setTab(['season', 'career', 'profile'][n]) }}>
      <Grad color={champion ? colors.gold : color} from={champion ? 0.55 : 0.68} to={0.06} border={champion ? 0.9 : 0.5} style={{ height: 232 }}>
        {champion ? <LinearGradient pointerEvents="none" colors={[alpha(color, 0.7), alpha(color, 0.05)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
        {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -30, bottom: -30, width: 268, height: 268 }} />
          : number != null ? <Text style={{ position: 'absolute', right: 8, bottom: -22, fontFamily: 'display', fontWeight: '800', fontSize: 150, color: 'rgba(255,255,255,0.12)' }}>{number}</Text> : null}
        {photo ? <Scrim dir="h" from={0.6} to={0} style={{ right: '30%' }} /> : null}
        {photo ? <Scrim dir="v" from={0} to={0.55} style={{ top: '60%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 36 }}>
            {numImg ? <Image source={numImg} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ width: 62, height: 34 }} /> : number != null ? <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 30, lineHeight: 36, color: colors.fg, includeFontPadding: false, textAlignVertical: 'center' }}>{number}</Text> : null}
            {code ? <Pill color={colors.fg} style={{ alignSelf: 'center' }}>{code}</Pill> : null}
            {champion ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: alpha(colors.gold, 0.2), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: alpha(colors.gold, 0.7) }}><Ionicons name="trophy" size={13} color={colors.gold} /><Text style={{ color: colors.gold, fontFamily: 'label', fontWeight: '700', fontSize: 11, letterSpacing: 1.2 }}>{`CHAMPION ${year}`}</Text></View> : null}
          </View>
          <View style={{ maxWidth: '62%' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} numberOfLines={1}>{nm.first}</Text>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 36, color: colors.fg, lineHeight: 42 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{nm.last}</Text>
            {sTeam ? (
              <Pressable onPress={() => sTeamId && navigation.navigate('Team', { teamId: sTeamId, name: sTeam, year: isCur ? undefined : year })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, height: 28 }}>
                <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}><TeamBadge teamId={sTeamId} name={sTeam} size={26} /></View>
                <Text style={{ color: colors.fg, fontSize: 17, lineHeight: 22, fontWeight: '600', includeFontPadding: false }} numberOfLines={1}>{isCur ? sTeam : `${sTeam} · ${year}`}</Text>
              </Pressable>) : null}
          </View>
        </View>
      </Grad>

      {noHistory ? <Card><Eyebrow>No race record</Eyebrow><Note>No Formula 1 race results were found for this driver. Reserve and test drivers only appear in practice sessions.</Note></Card> : (<>
        <Pressable onPress={() => navigation.navigate('Compare', { a: { driverId, name, first: nm.first, last: nm.last, teamId: sTeamId, team: sTeam } })} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Ionicons name="git-compare" size={18} color={colors.accent} /><Text style={s.btnText}>Compare with another driver</Text>
        </Pressable>
        <Segmented value={tab} onChange={setTab} items={[['season', `${year}`], ['career', 'Career'], ['profile', 'Profile']]} />

        {tab === 'season' && (seasons.v || []).length > 1 ? <SeasonSwitch compact year={year} years={[...new Set([...(activeNow ? [YEAR] : []), ...(seasons.v || [])])].sort((a, b) => b - a)} onChange={setPick} caption={sTeam ? `${sTeam} · tap to view another season` : 'tap to view another season'} /> : null}
        {tab === 'season' && (
          <Card>
            <Eyebrow>{`${year} season`}</Eyebrow>
            {(season.loading || stand.loading) && <Skeleton />}
            {season.error && <ErrorNote error={season.error} onRetry={season.reload} />}
            {S && <StatGrid cols={3} items={[
              ['Position', st ? `P${st.position}` : '—'], ['Points', dash(st?.points)], ['Wins', String(S.wins)],
              ['Podiums', String(S.podiums)], ['Poles', dash(S.poles)], ['Fast laps', String(S.fastest)],
              ['Races', String(S.races)], ['In points', String(S.pointsFinishes)], ['DNF / NC', String(S.notClassified)],
              ['Avg grid', fix(S.avgGrid)], ['Avg finish', fix(S.avgFinish)], ['Q3 apps', dash(S.q3)],
            ]} />}
          </Card>
        )}
        {tab === 'season' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow>{isCur ? 'Last 5 races' : `Last 5 races of ${year}`}</Eyebrow>
              {rows.length > 5 ? <Pressable onPress={() => setAll(!all)} hitSlop={8}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>{all ? 'Hide' : `View all ${rows.length}`}</Text></Pressable> : null}
            </View>
            {season.v && !rows.length && <Note>{isCur ? 'No races yet this season.' : 'No races found for this season.'}</Note>}
            {rows.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>{[...rows].reverse().slice(0, 5).map((r) => <RaceCard key={r.round} r={r} color={color} onPress={isCur ? () => openRace(r) : undefined} />)}</ScrollView>}
            {all && (
              <View style={{ marginTop: 10 }}>
                <Eyebrow>{`All ${year} results`}</Eyebrow>
                {[...rows].reverse().map((r) => <SeasonRow key={r.round} r={r} color={color} onPress={isCur ? () => openRace(r) : undefined} />)}
              </View>
            )}
            {rows.length > 0 && (
              <Pressable onPress={() => navigation.navigate('DriverSeasons', { driverId, name, teamId: sTeamId, color })} style={({ pressed }) => [s.btn, { marginTop: 14 }, pressed && { opacity: 0.85 }]}>
                <Ionicons name="time-outline" size={18} color={colors.accent} /><Text style={s.btnText}>Results from previous seasons</Text>
              </Pressable>)}
          </View>
        )}

        {tab === 'season' && isCur && (eng || teamLogo(teamId)) ? (
          <Grad color={color} from={0.6} to={0.06} dir="h" radius={18} border={0.4} style={{ height: 150 }}>
            {eng ? <Image source={eng} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 150, height: 150 }} />
              : <Image source={teamLogo(teamId)} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: 16, top: 15, width: 120, height: 120, opacity: 0.3 }} />}
            {eng ? <Scrim dir="h" from={0.55} to={0} style={{ right: '25%' }} /> : null}
            <View style={{ padding: 14, gap: 6 }}><Eyebrow>Race engineer</Eyebrow>{engName ? <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', maxWidth: '58%' }}>{engName}</Text> : null}</View>
          </Grad>) : null}

        {tab === 'career' && (
          <Card>
            <Eyebrow>Career</Eyebrow>
            {career.loading && <><Skeleton /><Note>Loading career totals. The first time can take several seconds.</Note></>}
            {career.error && <ErrorNote error={career.error} onRetry={career.reload} />}
            {C && <StatGrid cols={3} items={[['Seasons', dash(C.seasons)], ['Races', dash(C.races)], ['Wins', dash(C.wins)], ['Podiums', dash(C.podiums)], ['Poles', dash(C.poles)], ['Fast laps', dash(C.fastest)], ['Titles', titles.loading ? '…' : dash(titles.v)], ['Points', dash(C.points)], ['First year', dash(C.first)]]} />}
          </Card>
        )}

        {tab === 'profile' && (
          <Card>
            <Eyebrow>Profile</Eyebrow>
            {info.loading && <Skeleton />}
            {info.error && <ErrorNote error={info.error} onRetry={info.reload} />}
            {i && <StatGrid cols={3} items={[['Born', i.born ? String(new Date(i.born).getUTCFullYear()) : '—'], ['Age', i.born ? String(ageOn(i.born)) : '—'], ['Number', dash(number)]]} />}
            {i && <Text style={s.bio}>{i.name} is a {i.nationality} driver, born on {longDate(i.born)}.{C?.first ? ` Formula 1 debut season: ${C.first}.` : ''}{rows.length && sTeam ? (isCur ? ` Races for ${sTeam} in ${YEAR}.` : ` Last raced in ${year}, for ${sTeam}.`) : ''}</Text>}
          </Card>
        )}
      </>)}
    </Screen>
  );
}
const s = {
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderRadius: 14, height: 48, borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }, btnText: { color: colors.fg, fontWeight: '700', fontSize: 16 },
  bio: { color: '#CDD0D8', fontSize: 17, marginTop: 14 },
};
