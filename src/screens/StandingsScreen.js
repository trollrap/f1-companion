import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import Press from '../components/Press';
import SeasonSwitch from '../components/SeasonSwitch';
import { Segmented, ResultLine } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { usePrefs } from '../hooks/usePrefs';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { driverStandings, constructorStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { clinched } from '../lib/champion';
import { colors } from '../theme';

// One tappable label that cycles through the ways of showing the gap.
const modes = (teams) => [['leader', 'Gap to leader'], ['ahead', teams ? 'Gap to team ahead' : 'Gap to car ahead']];
export default function StandingsScreen({ navigation }) {
  const { prefs } = usePrefs(); const season = useSeason();
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
  const next = () => setMode(M[(M.findIndex(([k]) => k === mode) + 1) % M.length][0]);
  // Past seasons: the final table, so the leader is the champion. This season: only once it is mathematically decided.
  const won = rows.length > 0 && (cur ? rows.length > 1 && clinched(rows, teams ? 'constructor' : 'driver', season.races?.length, season.races) : true);
  return (
    <Screen swipe={{ index: teams ? 1 : 0, count: 2, onIndex: (i) => switchSeg(i ? 'teams' : 'drivers') }}>
      <SeasonSwitch year={year} onChange={setYear} min={teams ? 1958 : 1950} max={YEAR + 1} />
      <Segmented value={seg} onChange={switchSeg} items={[['drivers', 'Drivers'], ['teams', 'Teams']]} />
      {year <= YEAR && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['Chart', 'stats-chart', 'Season chart', { kind: seg, year }], ...(cur ? [['WhatIf', 'git-branch-outline', 'What if…', undefined]] : [])].map(([r, ic, l, p]) => (
            <View key={r} style={{ flex: 1 }}>
              <Press onPress={() => navigation.navigate(r, p)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}>
                  <Ionicons name={ic} size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{l}</Text>
                </View>
              </Press>
            </View>))}
        </View>)}
      <Card>
        <Eyebrow>{teams ? `${year} teams` : `${year} drivers`}</Eyebrow>
        <Pressable onPress={next} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Showing ${label}. Tap to change.`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="swap-vertical" size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 17 }}>{label}</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>· tap to change</Text>
        </Pressable>
        {st.loading && <Skeleton />}
        {st.error && <ErrorNote error={st.error} onRetry={st.reload} />}
        {st.v && !rows.length && <Note>{year > YEAR ? 'Standings start after the first race of the season.' : 'No standings published for this season.'}</Note>}
        <View style={{ marginTop: 6 }}>
          {rows.map((r, i) => {
            const champion = won && i === 0;
            return teams
              ? <ResultLine key={r.teamId} index={i} pos={r.position} first="" last={r.name} color={tc(r.teamId)} right={right(r)} sub={sub(r, i)} fav={favs.isTeam(r.teamId)} champion={champion} midLogoId={cur ? r.teamId : undefined} slotLogoId={cur ? undefined : r.teamId}
                  onPress={() => navigation.navigate('Team', { teamId: r.teamId, name: r.name, year: cur ? undefined : year })} />
              : <ResultLine key={r.driverId} index={i} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} right={right(r)} sub={sub(r, i)} fav={favs.isDriver(r.driverId)} champion={champion} photoId={cur ? r.driverId : undefined} logoId={cur ? r.teamId : undefined} slotLogoId={cur ? undefined : r.teamId}
                  onPress={() => navigation.navigate('Driver', { driverId: r.driverId, name: r.name, first: r.first, last: r.last, teamId: r.teamId, team: r.team, year: cur ? undefined : year })} />;
          })}
        </View>
      </Card>
    </Screen>
  );
}
