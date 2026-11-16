import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { PAGES } from '../lib/pages';

// Every statistics screen in one place, grouped, with a search box. Descriptions come from lib/pages.js so they stay in step.
const GROUPS = [
  ['Records and rankings', 'trophy', colors.gold, ['Records', 'Dominance', 'TitleHistory', 'GridOdds', 'Lineups', 'Streaks', 'Droughts', 'Winless', 'PoleConversion', 'PlacesGained', 'Comebacks', 'HatTricks', 'AgeRecords', 'BestDebuts', 'DnfRates', 'PodiumPairs', 'HomeHeroes', 'Milestones', 'GridDrops', 'Reliability']],
  ['Seasons and races', 'calendar', colors.accent, ['SeasonStrip', 'SeasonReview', 'CompareSeasons', 'CalendarGrowth', 'GridAge', 'Debuts', 'Travel', 'Passing', 'TitleSwing', 'Rematch', 'TimeMachine', 'Replay', 'WhatIf']],
  ['Drivers, teams and tracks', 'people', colors.good, ['CareerCurves', 'TeamCurves', 'TeamMates', 'Journeymen', 'EngineHistory', 'TeamTrees', 'CircuitCompare']],
  ['Yours', 'person-circle', colors.red, ['ComparePicks', 'FavDigest', 'TrophyRoom', 'YearReview', 'FavCircuits', 'WatchList', 'Rivalry', 'Poster']],
];
const META = { Journeymen: 'drivers who raced for the most teams', GridAge: 'how the average driver age changed', CalendarGrowth: 'races and countries per season', WatchList: 'past races to watch later', StatsHub: '' };
export default function StatsHubScreen({ navigation }) {
  const [q, setQ] = useState('');
  const info = useMemo(() => { const m = {}; PAGES.forEach(([r, t, d]) => { m[r] = [t, d]; }); return m; }, []);
  const TITLES = { Journeymen: 'Journeymen', GridAge: 'Grid age over time', CalendarGrowth: 'Calendar growth', WatchList: 'Watch list' };
  const row = (r) => { const t = (info[r] && info[r][0]) || TITLES[r] || r; const d = (info[r] && info[r][1]) || META[r] || ''; return { r, t, d }; };
  const n = norm(q); const total = GROUPS.reduce((a, g) => a + g[3].length, 0);
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.4} to={0.05} border={0.45} style={{ padding: 16 }}>
        <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>Statistics</Text>
        <Text style={{ color: colors.fg, opacity: 0.8, marginTop: 4 }}>{`${total} screens built from every race since 1950. Search or browse.`}</Text>
      </Grad>
      <TextInput value={q} onChangeText={setQ} placeholder="Search statistics" placeholderTextColor={colors.muted} accessibilityLabel="Search statistics" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} />
      {GROUPS.map(([name, icon, tint, routes]) => {
        const items = routes.map(row).filter((x) => !n || norm(`${x.t} ${x.d}`).includes(n)); if (!items.length) return null;
        return (
          <View key={name} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={icon} size={18} color={tint} /><Eyebrow>{name}</Eyebrow></View>
            {items.map((x, i) => (
              <Reveal key={x.r} index={Math.min(i, 5)}>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate(x.r)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.8 }]}>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{x.t}</Text>{x.d ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{x.d}</Text> : null}</View>
                  <Ionicons name="chevron-forward" size={18} color={alpha(colors.fg, 0.4)} />
                </Pressable>
              </Reveal>))}
          </View>); })}
      {n && !GROUPS.some((g) => g[3].map(row).some((x) => norm(`${x.t} ${x.d}`).includes(n))) ? <Note>Nothing matches.</Note> : null}
    </Screen>);
}
