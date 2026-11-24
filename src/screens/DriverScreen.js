import { isGreek, longDateEl, flag, NAME3 } from '../lib/time';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeBtn from '../components/HomeBtn';
import { View, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { TeammatesBody } from './TeammatesScreen';
import DriverDNA from '../components/DriverDNA';
import DriverTimeline from '../components/DriverTimeline';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { StatGrid, ExpandStats, StarButton, Segmented, TeamBadge } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import { Pill } from '../components/Badge';
import { RaceCard, SeasonRow } from '../components/RaceRows';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { driverTeamsList, driverInfo, driverSeasonResults, driverSeasonQuali, driverCareer, driverPoints, driverTitles, driverStandings, driverSeasons } from '../api/jolpica';
import SeasonSwitch from '../components/SeasonSwitch';
import { lastTeamOf } from '../api/history';
import { clinched } from '../lib/champion';
import { engineerOf } from '../data/engineers';
import { YEAR } from '../api/openf1';
import { seasonStats, fix } from '../lib/stats';
import { splitName } from '../lib/names';
import { openPastRace } from '../lib/openRace';
import { PERM_NUMBERS } from '../api/paddock';
import { driverPhoto, engineerPhoto, numberImage, teamLogo } from '../lib/media';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';
import { TintCtx } from '../lib/tint';
import CountUp from '../components/CountUp';
import { Animated, Easing, StyleSheet } from 'react-native';
import { ui } from '../lib/motion';

// The 1:1 photo fades in from below so its cut edge never shows.
function PhotoRise({ source }) {
  const v = React.useRef(new Animated.Value(ui.reduceMotion ? 1 : 0)).current;
  React.useEffect(() => { if (!ui.reduceMotion) Animated.timing(v, { toValue: 1, duration: 650, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -20, top: 56, width: 290, height: 290, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}><Image source={source} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ width: 290, height: 290 }} /></Animated.View>;
}

const ageOn = (born) => { const b = new Date(born), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n < new Date(Date.UTC(n.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()))) a--; return a; };
const longDate = (iso) => isGreek() ? longDateEl(iso) : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dash = (v) => (v == null ? '—' : String(v));

export default function DriverScreen({ route, navigation }) {
  const { driverId, name } = route.params; const lt0 = (!route.params.teamId && lastTeamOf(driverId)) || null; const teamId = route.params.teamId || lt0?.teamId, team = route.params.team || lt0?.team; const favs = useFavs(); const tc = useTeamColor(); const meta = usePaddockMeta(); const season0 = useSeason();
  const nm = route.params.last ? { first: route.params.first, last: route.params.last } : splitName(name);
  const [tab, setTab] = useState('season'); const [all, setAll] = useState(false); const [pick, setPick] = useState(route.params.year || null);
  const info = useAsync(() => driverInfo(driverId), [driverId]);
  const seasons = useAsync(() => driverSeasons(driverId), [driverId]); // every season he raced in, newest first
  // Opens on the current season; a driver who is not racing now opens on the last season he raced in.
  const raced = seasons.v; const nowStand = useAsync(() => driverStandings(YEAR), []);
  const activeNow = !nowStand.v || nowStand.v.some((x) => x.driverId === driverId); // judged by this season's standings, not by a cached career list
  // The seasons he actually raced decide where it opens (this one only when he raced in it), so a driver opened from a statistic never lands on an empty current season.
  const year = pick != null ? pick : raced && raced.length ? (raced.includes(YEAR) && activeNow ? YEAR : raced.find((y) => y < YEAR) ?? raced[0]) : YEAR; const isCur = year === YEAR;
  const season = useAsync(async () => {
    const [rows, q] = await Promise.all([driverSeasonResults(year, driverId), driverSeasonQuali(year, driverId).catch(() => ({ poles: null, q3: null }))]); // side by side
    return { rows, stats: seasonStats(rows, q.poles, q.q3) };
  }, [driverId, year]);
  // The season tab is what opens first, so it gets the connection to itself: career totals, titles and the team list start once another tab is opened.
  const [wantMore, setWantMore] = useState(false); React.useEffect(() => { if (tab !== 'season') setWantMore(true); }, [tab]);
  const career = useAsync(() => (wantMore ? driverCareer(driverId, YEAR) : Promise.resolve(null)), [driverId, wantMore]);
  const pts = useAsync(() => (wantMore ? driverPoints(driverId) : Promise.resolve(null)), [driverId, wantMore]);
  const titles = useAsync(() => (wantMore ? driverTitles(driverId, YEAR) : Promise.resolve(null)), [driverId, wantMore]);
  const teamsList = useAsync(() => (wantMore ? driverTeamsList(driverId) : Promise.resolve(null)), [driverId, wantMore]);
  const standAll = useAsync(() => driverStandings(year), [year]);
  const stand = { v: standAll.v ? standAll.v.find((x) => x.driverId === driverId) || null : standAll.v, loading: standAll.loading };
  React.useEffect(() => { navigation.setOptions({ headerTransparent: true, headerTitle: '', headerStyle: { backgroundColor: 'transparent' }, headerRight: () => <HomeBtn><StarButton bare on={favs.isDriver(driverId)} onPress={() => favs.toggleDriver(driverId)} label="Favourite" /></HomeBtn> }); }, [favs.drivers]);
  const rows = season.v?.rows || [];
  // The team he drove for in the viewed season (the current team when it is this season).
  const sTeamId = (isCur ? teamId : null) || rows.at(-1)?.teamId || stand.v?.teamId || teamId, sTeam = (isCur ? team : null) || rows.at(-1)?.team || stand.v?.team || team;
  const i = info.v, S = season.v?.stats, C = career.v, st = stand.v, color = (isCur && route.params.color) || tc(sTeamId), photo = driverPhoto(driverId), eng = engineerPhoto(driverId), numImg = numberImage(driverId);
  const insTop = useSafeAreaInsets().top;
  const number = isCur ? (meta?.drivers?.[driverId]?.number ?? i?.number ?? PERM_NUMBERS[driverId]) : (st?.permNumber ?? i?.number ?? PERM_NUMBERS[driverId]), code = (isCur && meta?.drivers?.[driverId]?.code) || st?.code || i?.code;
  const champion = !!standAll.v && standAll.v.length > 1 && standAll.v[0].driverId === driverId && (isCur ? clinched(standAll.v, 'driver', season0.races?.length, season0.races) : true);
  const engName = isCur ? engineerOf(driverId) : null;
  // A reserve or test driver has no Grand Prix record: show the card and a note instead of empty tabs.
  const noHistory = !info.loading && (info.v === null || !!info.error) && !season.loading && !rows.length && !seasons.loading && !(seasons.v || []).length;
  const openRace = (r) => openPastRace(navigation, season0, year, r, driverId);
  return (
    <TintCtx.Provider value={color}><Screen header={false} bleed swipe={{ index: ['season', 'career', 'profile'].indexOf(tab), count: 3, onIndex: (n) => setTab(['season', 'career', 'profile'][n]) }}>
      <View style={{ marginHorizontal: -16, marginTop: -16, height: 345, overflow: 'hidden', backgroundColor: colors.bg }}>
        <LinearGradient pointerEvents="none" colors={[alpha(color, 0.62), alpha(color, 0.2), colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -40, width: 360, height: 360 }}>
          {Array.from({ length: 12 }, (_, gi) => { const k = 1 - gi * 0.075; return <View key={gi} style={{ position: 'absolute', width: 360 * k, height: 360 * k, borderRadius: 180 * k, top: 180 * (1 - k), left: 180 * (1 - k), backgroundColor: alpha(color, 0.035) }} />; })}
        </View>
        {!photo && (number != null || code) ? <Text pointerEvents="none" style={{ position: 'absolute', right: 14, top: insTop + 70, fontFamily: 'display', fontStyle: 'italic', fontWeight: '900', fontSize: 120, lineHeight: 124, color: alpha(colors.fg, 0.07), includeFontPadding: false }}>{number != null ? number : code}</Text> : null}
        <View pointerEvents="none" style={{ position: 'absolute', left: 20, top: insTop + 66, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {number != null || code ? <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: number != null ? 34 : 26, lineHeight: 38, color: alpha(colors.fg, 0.9), includeFontPadding: false }}>{number != null ? number : code}</Text> : null}
          {sTeam ? <TeamBadge teamId={sTeamId} name={sTeam} size={30} /> : null}
        </View>
        {photo ? <PhotoRise source={photo} /> : null}
        <LinearGradient pointerEvents="none" colors={[alpha(colors.bg, 0), alpha(colors.bg, 0.75), colors.bg]} locations={[0, 0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }} />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 14 }}>
          {sTeam ? (
            <Pressable onPress={() => sTeamId && navigation.navigate('Team', { teamId: sTeamId, name: sTeam, year: isCur ? undefined : year })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: '#C9CED8', fontSize: 12, letterSpacing: 1.8, fontWeight: '700' }} numberOfLines={1}>{(isCur ? sTeam : `${sTeam} · ${year}`).toUpperCase()}{i?.nationality ? ` · ${i.nationality.toUpperCase()}` : ''}{code ? ` · ${code}` : ''}</Text>
            </Pressable>) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ color: alpha(colors.fg, 0.62), fontSize: 22, fontWeight: '300', lineHeight: 26, letterSpacing: 0.5, flexShrink: 1 }} numberOfLines={1}>{nm.first}</Text>{champion ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: alpha(colors.gold, 0.18), borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: alpha(colors.gold, 0.6) }}><Ionicons name="trophy" size={12} color={colors.gold} /><Text style={{ color: colors.gold, fontFamily: 'label', fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>{`CHAMPION ${year}`}</Text></View> : null}</View>
          <Text style={{ color: colors.fg, fontSize: 40, fontWeight: '900', lineHeight: 44 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{(nm.last || '').toUpperCase()}</Text>
        </View>
      </View>
      {!noHistory ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[['STANDING', st ? `P${st.position}` : '—'], ['POINTS', dash(st?.points)], ['WINS', S ? String(S.wins) : '—']].map(([k, v]) => (
            <View key={k} style={{ flex: 1, borderRadius: 18, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <CountUp value={String(v).replace(/^P/, '')} style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }} />
              <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' }}>{k}</Text>
            </View>))}
        </View>) : null}

      {noHistory ? <Card><Eyebrow>No race record</Eyebrow><Note>No Formula 1 race results were found for this driver. Reserve and test drivers only appear in practice sessions.</Note></Card> : (<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[['season', 'Season'], ['career', 'Career'], ['team', 'Team-mate'], ['profile', 'Bio'], ['cmp', 'Compare']].map(([k, l]) => { const on = tab === k; return (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => (k === 'cmp' ? navigation.navigate('Compare', { a: { driverId, name, first: nm.first, last: nm.last, teamId: sTeamId, team: sTeam }, year: isCur ? undefined : year }) : setTab(k))}
              style={({ pressed }) => [{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? colors.accent : colors.surface, borderWidth: 1, borderColor: on ? colors.accent : colors.line }, pressed && { opacity: 0.8 }]}>
              <Text style={{ color: on ? colors.onAccent : colors.muted, fontWeight: on ? '800' : '700', fontSize: 13 }}>{l}</Text>
            </Pressable>); })}
        </ScrollView>

        {tab === 'season' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow>{isCur ? 'Last 5 races' : `Last 5 races of ${year}`}</Eyebrow>
              {rows.length > 5 ? <Pressable onPress={() => setAll(!all)} hitSlop={8}><Text style={{ color, fontWeight: '700', fontSize: 15 }}>{all ? 'Hide' : `View all ${rows.length}`}</Text></Pressable> : null}
            </View>
            {season.v && !rows.length && <Note>{isCur ? 'No races yet this season.' : 'No races found for this season.'}</Note>}
            {rows.length >= 2 && (() => { const last5 = [...rows].sort((a, b) => a.round - b.round).slice(-5); return (
              <View style={{ marginTop: 10, borderRadius: 22, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' }}>{isCur ? 'LAST 5 RACES' : `LAST 5 RACES OF ${year}`}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 84, marginTop: 10 }}>
                  {last5.map((r) => { const ok = Number(r.position) > 0 && !/^(R|D|W|N|E|F)$/.test(String(r.positionText)); const pos = ok ? Number(r.position) : null; const h = pos ? Math.max(14, 84 * (21 - Math.min(pos, 20)) / 20) : 14; const dnf = pos == null; const c = dnf ? colors.red : pos === 1 ? colors.gold : pos <= 3 ? colors.good : Number(r.points) > 0 ? '#5FB98A' : '#59606E'; const ink = dnf || !(pos <= 3 || Number(r.points) > 0) ? '#FFFFFF' : 'rgba(5,10,8,0.85)'; return (
                    <View key={r.round} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}><Text style={{ color: colors.fg, fontSize: 12, fontWeight: '800', marginBottom: 3 }}>{pos ? `P${pos}` : 'DNF'}</Text><View style={{ width: '100%', height: Math.max(h * 0.72, 34), borderRadius: 8, backgroundColor: c, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 }}><Text style={{ fontSize: 14 }}>{flag(NAME3[r.country] || r.country)}</Text><Text style={{ color: ink, fontSize: 10, fontWeight: '900' }}>{`R${r.round}`}</Text></View></View>); })}
                </View>
              </View>); })()}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setTab('team')} style={({ pressed }) => [{ flex: 1, borderRadius: 18, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.85 }]}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>VS TEAM-MATE</Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10 }}><View style={{ width: '55%', height: 6, borderRadius: 3, backgroundColor: color }} /></View>
                <Text style={{ color: colors.fg, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Career head-to-head</Text>
              </Pressable>
              {sTeam ? <Pressable onPress={() => sTeamId && navigation.navigate('Team', { teamId: sTeamId, name: sTeam, year: isCur ? undefined : year })} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}>
                <Grad color={color} from={0.55} to={0.08} radius={18} border={0.4} style={{ padding: 12, minHeight: 74, justifyContent: 'center' }}>
                  <View pointerEvents="none" style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' }}><TeamBadge teamId={sTeamId} name={sTeam} size={50} /></View>
                  <Text style={{ color: colors.onSoft, fontSize: 11, fontWeight: '700' }}>TEAM</Text>
                  <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800', marginTop: 4, paddingRight: 56 }} numberOfLines={2}>{sTeam}</Text>
                </Grad>
              </Pressable> : null}
            </View>
            {rows.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>{[...rows].reverse().slice(0, 5).map((r) => <RaceCard key={r.round} r={r} color={color} onPress={() => openRace(r)} />)}</ScrollView>}
            {rows.length >= 3 && (() => {
              const asc = [...rows].sort((a, b) => a.round - b.round); const fin = (r) => (Number(r.position) > 0 && !/^(R|D|W|N|E|F)$/.test(String(r.positionText)) ? Number(r.position) : null);
              const last = asc.slice(-5), prev = asc.slice(-10, -5); const avg = (a) => { const v = a.map(fin).filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
              const a1 = avg(last), a0 = prev.length >= 3 ? avg(prev) : null; const pts = last.reduce((x, r) => x + (Number(r.points) || 0), 0);
              const gain = last.map((r) => (Number(r.grid) > 0 && fin(r) != null ? Number(r.grid) - fin(r) : null)).filter((x) => x != null); const g = gain.length ? gain.reduce((x, y) => x + y, 0) / gain.length : null;
              let streak = 0; for (let i = asc.length - 1; i >= 0 && Number(asc[i].points) > 0; i--) streak++;
              const pod = last.filter((r) => fin(r) != null && fin(r) <= 3).length; const dnf = last.filter((r) => fin(r) == null).length;
              const trend = a1 != null && a0 != null ? (a0 - a1 > 0.5 ? 'up' : a1 - a0 > 0.5 ? 'down' : 'flat') : null;
              const Cell = ({ k, v, c }) => (<View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: c || colors.fg, fontSize: 20, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>{k}</Text></View>);
              return (
                <View accessible accessibilityLabel={`Form over the last ${last.length} races`} style={{ marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: alpha(color, 0.1), borderWidth: 1, borderColor: alpha(color, 0.3), gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>{`Form, last ${last.length}`}</Eyebrow>{trend ? <Text style={{ color: trend === 'up' ? colors.good : trend === 'down' ? colors.red : colors.muted, fontWeight: '800', fontSize: 13 }}>{trend === 'up' ? '▲ Improving' : trend === 'down' ? '▼ Slipping' : '● Steady'}</Text> : null}</View>
                  <View style={{ flexDirection: 'row' }}><Cell k="AVG FINISH" v={a1 != null ? a1.toFixed(1) : '-'} /><Cell k="POINTS" v={String(pts)} /><Cell k="GRID GAIN" v={g != null ? `${g > 0 ? '+' : ''}${g.toFixed(1)}` : '-'} c={g != null ? (g > 0 ? colors.good : g < 0 ? colors.red : undefined) : undefined} /></View>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{`${pod} podium${pod === 1 ? '' : 's'}, ${dnf} not classified. Scoring in ${streak} race${streak === 1 ? '' : 's'} in a row.`}</Text>
                </View>);
            })()}
            {all && (
              <View style={{ marginTop: 10 }}>
                <Eyebrow>{`All ${year} results`}</Eyebrow>
                {[...rows].reverse().map((r) => <SeasonRow key={r.round} r={r} color={color} onPress={() => openRace(r)} />)}
              </View>
            )}
            {rows.length > 0 && (
              <Pressable onPress={() => navigation.navigate('DriverSeasons', { driverId, name, teamId: sTeamId, color })} style={({ pressed }) => [s.btn, { backgroundColor: alpha(color, 0.18), borderColor: alpha(color, 0.55) }, { marginTop: 14 }, pressed && { opacity: 0.85 }]}>
                <Ionicons name="time-outline" size={18} color={color} /><Text style={s.btnText}>Results from previous seasons</Text>
              </Pressable>)}
          </View>
        )}

        {tab === 'season' && (seasons.v || []).length > 1 ? <SeasonSwitch compact year={year} years={[...new Set([...(activeNow ? [YEAR] : []), ...(seasons.v || [])])].sort((a, b) => b - a)} onChange={setPick} /> : null}
        {tab === 'season' && (
          <Card>
            <Eyebrow>{`${year} season`}</Eyebrow>
            {(season.loading || stand.loading) && <Skeleton />}
            {season.error && <ErrorNote error={season.error} onRetry={season.reload} />}
            {S && <ExpandStats cols={3} items={[
              ['Position', st ? `P${st.position}` : '—'], ['Points', dash(st?.points)], ['Wins', String(S.wins)],
              ['Podiums', String(S.podiums)], ['Poles', dash(S.poles)], ['Fast laps', String(S.fastest)],
              ['Races', String(S.races)], ['In points', String(S.pointsFinishes)], ['DNF / NC', String(S.notClassified)],
              ['Avg grid', fix(S.avgGrid)], ['Avg finish', fix(S.avgFinish)], ['Q3 apps', dash(S.q3)],
            ]} />}
          </Card>
        )}
        {tab === 'season' && isCur && (eng || engName) ? (
          <Grad color={color} from={0.5} to={0.05} dir="h" radius={14} border={0.35} style={{ height: eng ? 96 : 60 }}>
            {eng ? <Image source={eng} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 96, height: 96 }} /> : null}
            <View style={{ flex: 1, paddingHorizontal: 14, justifyContent: 'center' }}>
              <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 10, letterSpacing: 1.6 }}>RACE ENGINEER</Text>
              {engName ? <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', maxWidth: '70%' }} numberOfLines={1}>{engName}</Text> : null}
            </View>
          </Grad>) : null}

        {tab === 'career' && (
          <Card>
            <Eyebrow>Career</Eyebrow>
            {career.loading && <><Skeleton /><Note>Loading career totals…</Note></>}
            {career.error && <ErrorNote error={career.error} onRetry={career.reload} />}
            {C && <StatGrid cols={3} items={[['Seasons', dash(C.seasons)], ['Races', dash(C.races)], ['Wins', dash(C.wins)], ['Podiums', dash(C.podiums)], ['Poles', dash(C.poles)], ['Fast laps', dash(C.fastest)], ['Titles', titles.loading ? '…' : dash(titles.v)], ['Points', pts.loading ? '…' : dash(pts.v)], ['First year', dash(C.first)]]} />}
          </Card>
        )}
        {tab === 'team' ? <View style={{ gap: 12 }}><TeammatesBody driverId={driverId} name={name} color={color} /></View> : null}
        {tab === 'career' ? <DriverTimeline driverId={driverId} /> : null}
        {tab === 'career' ? <DriverDNA driverId={driverId} color={color} /> : null}
        {tab === 'career' && (teamsList.v || []).length > 0 && (
          <Card>
            <Eyebrow>Teams</Eyebrow>
            {teamsList.v.map((x) => (
              <Pressable key={x.teamId + x.from} onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name, year: x.to })} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, opacity: pressed ? 0.7 : 1 }]}>
                <TeamBadge teamId={x.teamId} name={x.name} size={34} />
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{x.from === x.to ? `${x.from}` : `${x.from} – ${x.to === YEAR ? 'now' : x.to}`}{x.races ? ` · ${x.races} races` : ''}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>))}
          </Card>)}

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
    </Screen></TintCtx.Provider>
  );
}
const s = {
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderRadius: 14, height: 48, borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }, btnText: { color: colors.fg, fontWeight: '700', fontSize: 16 },
  bio: { color: '#CDD0D8', fontSize: 17, marginTop: 14 },
};
