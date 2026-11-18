import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { PAGES } from '../lib/pages';
import { usePrefs } from '../hooks/usePrefs';

// Every statistics screen in one place, grouped, with a search box. Descriptions come from lib/pages.js so they stay in step.
const GROUPS = [
  ['Records and rankings', 'trophy', colors.gold, ['Records', 'Dominance', 'TitleHistory', 'ConstructorTitles', 'SeasonParity', 'OpenersClosers', 'PointsPerStart', 'GridOdds', 'Lineups', 'Streaks', 'Droughts', 'Winless', 'PoleConversion', 'PlacesGained', 'Comebacks', 'HatTricks', 'AgeRecords', 'BestDebuts', 'DnfRates', 'PodiumPairs', 'HomeHeroes', 'Milestones', 'GridDrops', 'Reliability']],
  ['Seasons and races', 'calendar', colors.accent, ['LapChart', 'SeasonHeatmap', 'QualiBattles', 'SeasonStrip', 'EraExplorer', 'SeasonReview', 'CompareSeasons', 'CalendarGrowth', 'GridAge', 'Debuts', 'Travel', 'Passing', 'TitleSwing', 'Rematch', 'TimeMachine', 'Replay', 'WhatIf']],
  ['Drivers, teams and tracks', 'people', colors.good, ['CareerCurves', 'TeamCurves', 'TeamMates', 'Journeymen', 'EngineHistory', 'TeamTrees', 'CircuitCompare']],
  ['Yours', 'person-circle', colors.red, ['ComparePicks', 'FavDigest', 'CountdownCard', 'GameStats', 'Achievements', 'DailyChallenges', 'TrophyRoom', 'YearReview', 'FavCircuits', 'WatchList', 'Rivalry', 'Poster', 'MyCard', 'Birthday']],
];
const ICONS = { Records: 'ribbon', Dominance: 'flame', TitleHistory: 'trophy', ConstructorTitles: 'trophy', SeasonParity: 'git-compare', OpenersClosers: 'flag', PointsPerStart: 'speedometer', GridOdds: 'dice', Lineups: 'people', Streaks: 'flash', Droughts: 'hourglass', Winless: 'sad', PoleConversion: 'locate', PlacesGained: 'trending-up', Comebacks: 'arrow-up-circle', HatTricks: 'medal', AgeRecords: 'hourglass', BestDebuts: 'rocket', DnfRates: 'warning', PodiumPairs: 'people-circle', HomeHeroes: 'home', Milestones: 'ribbon', GridDrops: 'arrow-down-circle', Reliability: 'build', SeasonStrip: 'reorder-three', EraExplorer: 'time', SeasonReview: 'newspaper', CompareSeasons: 'git-compare', CalendarGrowth: 'calendar', GridAge: 'analytics', Debuts: 'enter', Travel: 'airplane', Passing: 'swap-horizontal', TitleSwing: 'pulse', Rematch: 'repeat', TimeMachine: 'hourglass', Replay: 'play-circle', WhatIf: 'help-circle', CareerCurves: 'trending-up', TeamCurves: 'trending-up', TeamMates: 'people', Journeymen: 'walk', EngineHistory: 'cog', TeamTrees: 'git-branch', CircuitCompare: 'map', ComparePicks: 'checkmark-done', FavDigest: 'star', TrophyRoom: 'trophy', YearReview: 'albums', FavCircuits: 'heart', WatchList: 'bookmark', Rivalry: 'flame', Poster: 'image', MyCard: 'card', Birthday: 'gift', LapChart: 'pulse', SeasonHeatmap: 'grid', QualiBattles: 'people', CountdownCard: 'timer', Achievements: 'ribbon', DailyChallenges: 'checkmark-done', GameStats: 'game-controller' };
const META = { Journeymen: 'drivers who raced for the most teams', GridAge: 'how the average driver age changed', CalendarGrowth: 'races and countries per season', WatchList: 'past races to watch later', StatsHub: '' };
export default function StatsHubScreen({ navigation }) {
  const [q, setQ] = useState(''); const { prefs, setOpt } = usePrefs(); const pinned = prefs.opts.pins || [];
  const flip = (r) => { const on = pinned.includes(r); if (!on && pinned.length >= 8) return; setOpt('pins', on ? pinned.filter((x) => x !== r) : [...pinned, r]); };
  const info = useMemo(() => { const m = {}; PAGES.forEach(([r, t, d]) => { m[r] = [t, d]; }); return m; }, []);
  const TITLES = { Journeymen: 'Journeymen', GridAge: 'Grid age over time', CalendarGrowth: 'Calendar growth', WatchList: 'Watch list' };
  const row = (r) => { const t = (info[r] && info[r][0]) || TITLES[r] || r; const d = (info[r] && info[r][1]) || META[r] || ''; return { r, t, d }; };
  const n = norm(q); const total = GROUPS.reduce((a, g) => a + g[3].length, 0);
  return (
    <Screen header={false}>
      <StatHeader title="Statistics" icon="stats-chart" note={`${total} screens built from every race since 1950. Search or browse. Tap the pin to put one on Home (up to 8).`} />
      <TextInput value={q} onChangeText={setQ} placeholder="Search statistics" placeholderTextColor={colors.muted} accessibilityLabel="Search statistics" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} />
      {GROUPS.map(([name, icon, tint, routes]) => {
        const items = routes.map(row).filter((x) => !n || norm(`${x.t} ${x.d}`).includes(n)); if (!items.length) return null;
        return (
          <View key={name} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: tint }} /><Ionicons name={icon} size={18} color={tint} /><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '800' }}>{name}</Text><View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, backgroundColor: alpha(tint, 0.2) }}><Text style={{ color: tint, fontSize: 12, fontWeight: '800' }}>{items.length}</Text></View></View>
            {items.map((x, i) => (
              <Reveal key={x.r} index={Math.min(i, 5)}>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate(x.r)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.8 }]}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, marginRight: 12, backgroundColor: alpha(tint, 0.18), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ICONS[x.r] || icon} size={19} color={tint} /></View>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{x.t}</Text>{x.d ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{x.d}</Text> : null}</View>
                  <Pressable accessibilityRole="button" accessibilityLabel={pinned.includes(x.r) ? `Unpin ${x.t} from Home` : `Pin ${x.t} to Home`} hitSlop={8} onPress={() => flip(x.r)} style={{ padding: 6, marginRight: 6 }}><Ionicons name={pinned.includes(x.r) ? 'pin' : 'pin-outline'} size={18} color={pinned.includes(x.r) ? colors.accent : colors.muted} /></Pressable>
                  <Ionicons name="chevron-forward" size={18} color={alpha(colors.fg, 0.4)} />
                </Pressable>
              </Reveal>))}
          </View>); })}
      {n && !GROUPS.some((g) => g[3].map(row).some((x) => norm(`${x.t} ${x.d}`).includes(n))) ? <Note>Nothing matches.</Note> : null}
    </Screen>);
}
