import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import Press from '../components/Press';
import { colors, alpha } from '../theme';
import { CATS, GAMES } from '../lib/gameCatalog';
import { useGameStatus } from './GamesHub';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Longest and current run of consecutive days with a game played. The current run still counts if you last played yesterday.
export function runs(days) {
  const set = new Set(days); const sorted = [...set].sort(); let best = 0, cur = 0, prev = null;
  sorted.forEach((s) => { const d = new Date(`${s}T12:00:00`); cur = prev && Math.round((d - prev) / 86400000) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; });
  const t = new Date(); t.setHours(12); const y = new Date(t); y.setDate(y.getDate() - 1);
  let now = 0; let d = set.has(ymd(t)) ? t : set.has(ymd(y)) ? y : null; while (d && set.has(ymd(d))) { now++; d = new Date(d); d.setDate(d.getDate() - 1); }
  return { best, now, total: set.size };
}
export default function GameStatsScreen({ navigation }) {
  const st = useGameStatus(); const r = useMemo(() => runs(st.days), [st.days]);
  const withBest = GAMES.filter((g) => st.best[g.r]); const unplayed = GAMES.filter((g) => g.b && !st.best[g.r]);
  const tiles = [[r.total, 'days played', colors.accent], [r.now, 'day streak', colors.gold], [r.best, 'longest streak', colors.good], [withBest.length, 'games with a best', colors.purple]];
  return (
    <Screen header={false}>
      <StatHeader title="Games stats" icon="game-controller" color={colors.purple} note="Everything you have played in one place: your streaks and your best score in each game. It all stays on this phone." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map(([v, l, c]) => (<View key={l} style={{ width: '47.5%', flexGrow: 1, padding: 14, borderRadius: 16, backgroundColor: alpha(c, 0.14), borderWidth: 1, borderColor: alpha(c, 0.4) }}><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{st.loaded ? v : '–'}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }}>{l}</Text></View>))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>{[['Achievements', 'ribbon', colors.gold], ['DailyChallenges', 'checkmark-done', colors.good]].map(([r, ic, c]) => (<Press key={r} onPress={() => navigation.navigate(r)} style={{ flex: 1 }} accessibilityLabel={r === 'Achievements' ? 'Achievements' : 'Daily challenges'}><View style={{ padding: 12, borderRadius: 14, backgroundColor: alpha(c, 0.14), borderWidth: 1, borderColor: alpha(c, 0.45), flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={ic} size={20} color={c} /><Text style={{ color: colors.fg, fontWeight: '800' }}>{r === 'Achievements' ? 'Achievements' : 'Daily challenges'}</Text></View></Press>))}</View>
      {st.resume.length ? (<><SectionLabel color={colors.gold}>Unfinished</SectionLabel>
        <StatList>{st.resume.map((rt, i) => { const g = GAMES.find((x) => x.r === rt); return g ? <Press key={rt} onPress={() => navigation.navigate(rt)}><StatRow i={i} badge="▶" title={g.n} sub="Saved, tap to continue" color={colors.gold} /></Press> : null; })}</StatList></>) : null}
      {CATS.map((c) => { const items = withBest.filter((g) => g.c === c.id); if (!items.length) return null;
        return (<View key={c.id} style={{ gap: 8 }}><SectionLabel color={c.color}>{c.label}</SectionLabel>
          <StatList>{items.map((g, i) => <StatRow key={g.r} i={i} badge="★" title={g.n} sub={g.s} value={g.f ? g.f.replace('{}', st.best[g.r]) : st.best[g.r]} color={c.color} />)}</StatList></View>); })}
      {st.loaded && !withBest.length ? <Card><Note>No best scores yet. Play a game and it shows up here.</Note></Card> : null}
      {unplayed.length ? <Note>{`${unplayed.length} games with a best score have not been played yet.`}</Note> : null}
    </Screen>);
}
