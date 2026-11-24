import SpoilerGuard from '../components/SpoilerGuard';
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import Press from '../components/Press';
import SeasonSwitch from '../components/SeasonSwitch';
import { Segmented } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { usePrefs } from '../hooks/usePrefs';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { driverStandings, constructorStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { clinched } from '../lib/champion';
import { colors, alpha } from '../theme';
import Grad from '../components/Grad';
import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';
import { Image } from 'react-native';
import { driverPhoto } from '../lib/media';
import { HeadShot, TeamBadge } from '../components/Shared';

// One tappable label that cycles through the ways of showing the gap.
const modes = (teams) => [['leader', 'Gap to leader'], ['ahead', teams ? 'Interval to team ahead' : 'Interval to car ahead']];
export default function StandingsScreen({ navigation }) {
  const { prefs, setOpt } = usePrefs(); const season = useSeason();
  const [seg, setSeg] = useState('drivers'); const [year, setYear] = useState(YEAR);
  const [mode, setMode] = useState(prefs.opts?.gap === 'ahead' ? 'ahead' : 'leader');
  const favs = useFavs(); const tc = useTeamColor(); const cur = year === YEAR;
  // Leaving the tab for another tab brings back the current season; opening a driver or team page from here does not.
  useEffect(() => navigation.addListener('blur', () => {
    const st = navigation.getState();
    if (st?.routes?.[st.index]?.name !== 'Standings') setYear(YEAR);
  }), [navigation]);
  const switchSeg = (v) => { setSeg(v); if (v === 'teams' && year < 1958) setYear(1958); };
  useEffect(() => { driverStandings(YEAR - 1).catch(() => {}); constructorStandings(YEAR - 1).catch(() => {}); }, []); // warm the cache so the first look at last season is quick
  const d = useAsync(() => driverStandings(year), [year]); const t = useAsync(() => constructorStandings(year), [year]);
  const teams = seg === 'teams'; const st = teams ? t : d; const rows = st.v || [];
  const M = modes(teams), label = M.find(([k]) => k === mode)[1];
  // Points are the big number; the gap sits underneath.
  const right = (r) => `${r.points}`;
  const sub = (r, i) => (i === 0 ? 'Leader' : `−${mode === 'leader' ? rows[0].points - r.points : rows[i - 1].points - r.points}`);
  const next = () => { const k = M[(M.findIndex(([k]) => k === mode) + 1) % M.length][0]; setMode(k); if (k === 'leader' || k === 'ahead') setOpt('gap', k); };
  // Past seasons: the final table, so the leader is the champion. This season: only once it is mathematically decided.
  const leadPhoto = !teams && rows[0] && cur ? driverPhoto(rows[0].driverId) : null;
  const won = rows.length > 0 && (cur ? rows.length > 1 && clinched(rows, teams ? 'constructor' : 'driver', season.races?.length, season.races) : true);
  return (
    <Screen swipe={{ index: teams ? 1 : 0, count: 2, onIndex: (i) => switchSeg(i ? 'teams' : 'drivers') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>Standings</Text>
        <SeasonSwitch pill year={year} onChange={setYear} min={teams ? 1958 : 1950} max={YEAR} />
      </View>
      <Segmented value={seg} onChange={switchSeg} items={[['drivers', 'Drivers'], ['teams', 'Teams']]} />
      {(
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['Chart', 'stats-chart', 'Season chart', { kind: seg, year }], ...(cur ? [['WhatIf', 'git-branch-outline', 'What if…', undefined]] : [])].map(([r, ic, l, p]) => (
            <View key={r} style={{ flex: 1 }}>
              <Press onPress={() => navigation.navigate(r, p)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                  <Ionicons name={ic} size={17} color={colors.accentText} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 14 }}>{l}</Text>
                </View>
              </Press>
            </View>))}
        </View>)}
      {rows.length ? <Pressable onPress={next} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Showing ${label}. Tap to change.`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: -4, opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name="swap-vertical" size={14} color={colors.accentText} />
        <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 13 }}>{label}</Text>
      </Pressable> : null}
      <View style={{ gap: 8 }}>
      {rows.length ? (
        <SpoilerGuard id="standings" label="Standings hidden">
          <Press onPress={() => (teams ? navigation.navigate('Team', { teamId: rows[0].teamId, name: rows[0].name, year: cur ? undefined : year }) : navigation.navigate('Driver', { driverId: rows[0].driverId, name: rows[0].name, first: rows[0].first, last: rows[0].last, teamId: rows[0].teamId, team: rows[0].team, year: cur ? undefined : year }))} accessibilityLabel="Open the leader">
            <Grad color={tc(rows[0].teamId)} from={0.28} to={0.02} radius={28} border={0.4} style={{ padding: 18, minHeight: 138 }}>
              {!teams ? <View pointerEvents="none" style={{ position: 'absolute', right: -8, bottom: 0, width: 160, height: 160, alignItems: 'center', justifyContent: 'flex-end' }}>
                {leadPhoto ? <Image source={leadPhoto} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ width: 160, height: 160 }} /> : null}
              </View> : null}
              {teams ? <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 14, opacity: 0.95 }}><TeamBadge teamId={rows[0].teamId} name={rows[0].name} size={84} /></View> : null}
              <View style={{ paddingRight: teams ? 90 : 130 }}>
                <Text style={{ color: won ? colors.gold : colors.onSoft, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }}>{won ? (cur ? 'CHAMPION' : `CHAMPION ${year}`) : 'LEADER'}</Text>
                <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }} numberOfLines={1}>{teams ? rows[0].name : `${rows[0].first} ${rows[0].last}`}</Text>
                {rows[0].team || rows[0].wins != null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{!teams ? <TeamBadge teamId={rows[0].teamId} name={rows[0].team} size={16} /> : null}<Text style={{ color: colors.onSoft, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{[!teams ? rows[0].team : null, rows[0].wins != null ? `${rows[0].wins} win${rows[0].wins === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}</Text></View> : null}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}><CountUp value={rows[0].points} style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }} /><Text style={{ color: alpha(colors.fg, 0.6), fontSize: 11, letterSpacing: 1.5 }}>PTS</Text></View>
              </View>
            </Grad>
          </Press>
        </SpoilerGuard>) : null}
        {st.loading && <Skeleton />}
        {st.error && <ErrorNote error={st.error} onRetry={st.reload} />}
        {st.v && !rows.length && <Note>{year > YEAR ? 'Standings start after the first race of the season.' : 'No standings published for this season.'}</Note>}
        <SpoilerGuard id="standings" label="Standings hidden"><View style={{ gap: 8 }}>
          {rows.map((r, i) => {
            if (i === 0) return null;
            const id = teams ? r.teamId : r.driverId; const fav = teams ? favs.isTeam(r.teamId) : favs.isDriver(r.driverId); const c = tc(r.teamId); const gap = i === 0 ? null : (mode === 'leader' ? rows[0].points - r.points : rows[i - 1].points - r.points);
            return (
              <Reveal key={id} index={Math.min(i, 5)}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${r.position}. ${teams ? r.name : `${r.first} ${r.last}`}, ${r.points} points`}
                  onPress={() => (teams ? navigation.navigate('Team', { teamId: r.teamId, name: r.name, year: cur ? undefined : year }) : navigation.navigate('Driver', { driverId: r.driverId, name: r.name, first: r.first, last: r.last, teamId: r.teamId, team: r.team, year: cur ? undefined : year }))}
                  style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: teams ? 10 : 0, paddingLeft: 12, paddingRight: 14, minHeight: 76, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderLeftColor: c }, fav && { borderRightWidth: 4, borderRightColor: colors.gold }, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
                  <Text style={{ width: 24, color: colors.muted, fontWeight: '800', fontSize: 15 }}>{r.position}</Text>
                  {teams ? <TeamBadge teamId={r.teamId} name={r.name} size={38} /> : <View style={{ width: 74, height: 74, overflow: 'hidden', alignItems: 'center', alignSelf: 'flex-end' }}>
                    {r.driverId && driverPhoto(r.driverId) ? <Image source={driverPhoto(r.driverId)} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ width: 92, height: 92, marginTop: -6 }} /> : <Text style={{ position: 'absolute', bottom: 12, color: colors.fg, fontWeight: '800', fontSize: 12 }}>{(r.code || r.last || '').slice(0, 3).toUpperCase()}</Text>}
                  </View>}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{teams ? r.name : `${r.first} ${r.last}`}</Text>
                    {!teams && r.team ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><TeamBadge teamId={r.teamId} name={r.team} size={14} /><Text style={{ color: colors.muted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{r.team}</Text></View> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 17 }}>{r.points}</Text>
                    <Text style={{ color: gap <= 10 ? colors.good : colors.muted, fontSize: 11, fontWeight: '700' }}>{`−${gap} gap`}</Text>
                  </View>
                </Pressable>
              </Reveal>);
          })}
        </View></SpoilerGuard>
      </View>
    </Screen>
  );
}
