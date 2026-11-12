import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { passingByRace, seasonFacts, historyYears } from '../api/history';
import { colors, alpha } from '../theme';

// ---------- Overtaking by circuit ----------
const ERAS = [['2010', 'Since 2010'], ['2000', 'Since 2000'], ['1950', 'All time']];
export function PassingScreen() {
  const [era, setEra] = useState('2010'); const [tab, setTab] = useState('most');
  const rows = useMemo(() => { try { return passingByRace(Number(era)); } catch { return []; } }, [era]);
  const sorted = useMemo(() => [...rows].sort((a, b) => (tab === 'most' ? b.avgMoved - a.avgMoved : a.avgMoved - b.avgMoved)).slice(0, 25), [rows, tab]);
  const max = Math.max(1, ...rows.map((r) => r.avgMoved));
  return (
    <Screen header={false}>
      <Card><Eyebrow>Overtaking by circuit</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}><Segmented value={tab} onChange={setTab} items={[['most', 'Most movement'], ['least', 'Processional']]} /><Dropdown value={era} options={ERAS} onChange={setEra} prefix="Era" /></View>
        <Note>The average number of places the finishers moved between grid and flag at each Grand Prix. Pit stops, strategy and first-lap chaos move cars too, so this shows how much the order shuffles, not an exact count of overtakes. Grands Prix with fewer than 40 classified finishers in the era are left out.</Note></Card>
      <ShareCard title={`Most ${tab === 'most' ? 'movement' : 'processional'} Grands Prix, ${ERAS.find((e) => e[0] === era)[1]}`}>
        <Card>
          {sorted.map((r, i) => (
            <View key={r.name} style={{ paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ width: 24, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text><Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{r.name}</Text><Text style={{ color: colors.fg, fontWeight: '900' }}>{r.avgMoved.toFixed(1)}</Text></View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(colors.fg, 0.1), marginTop: 5, overflow: 'hidden' }}><View style={{ width: `${Math.round((r.avgMoved / max) * 100)}%`, height: 6, backgroundColor: colors.accent }} /></View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{`${r.races} races · pole won ${Math.round(r.poleRate * 100)}% · winners started P${r.avgWinnerStart.toFixed(1)} on average`}</Text>
            </View>))}
        </Card>
      </ShareCard>
    </Screen>);
}

// ---------- Compare two seasons ----------
export function CompareSeasonsScreen() {
  const years = useMemo(() => { try { return historyYears(); } catch { return []; } }, []);
  const [a, setA] = useState(years[0] || 2025); const [b, setB] = useState(years[Math.min(10, years.length - 1)] || 2015);
  const A = useMemo(() => seasonFacts(a), [a]), B = useMemo(() => seasonFacts(b), [b]);
  const rows = A && B ? [
    ['Races', A.races, B.races], ['Different winners', A.winners, B.winners], ['Cars per race', A.avgCars.toFixed(1), B.avgCars.toFixed(1)], ['Finish rate', `${Math.round(A.finishRate * 100)}%`, `${Math.round(B.finishRate * 100)}%`],
    ['Champion', A.champion, B.champion], ['Champion points', A.champPts, B.champPts], ['Title margin', A.secondPts != null ? A.champPts - A.secondPts : '-', B.secondPts != null ? B.champPts - B.secondPts : '-'],
    ['Most wins', A.mostWins ? `${A.mostWins.name} (${A.mostWins.n})` : '-', B.mostWins ? `${B.mostWins.name} (${B.mostWins.n})` : '-'], ['Most poles', A.mostPoles ? `${A.mostPoles.name} (${A.mostPoles.n})` : '-', B.mostPoles ? `${B.mostPoles.name} (${B.mostPoles.n})` : '-'],
    ['Top team (wins)', A.mostTeamWins ? `${A.mostTeamWins.name} (${A.mostTeamWins.n})` : '-', B.mostTeamWins ? `${B.mostTeamWins.name} (${B.mostTeamWins.n})` : '-'],
  ] : [];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Compare two seasons</Eyebrow>
        <View style={{ marginTop: 10, gap: 8 }}><Dropdown value={a} options={years.map((y) => [y, String(y)])} onChange={(v) => setA(Number(v))} prefix="Season" /><Dropdown value={b} options={years.map((y) => [y, String(y)])} onChange={(v) => setB(Number(v))} prefix="Versus" /></View>
        <Note>Offline race history. Title points are as scored in each era (a win was worth 8, then 9, then 10, then 25 points), so compare margins, not totals.</Note></Card>
      {A && B ? (
        <ShareCard title={`${a} vs ${b}`}>
          <Card>
            <View style={{ flexDirection: 'row', paddingBottom: 6 }}><View style={{ flex: 1 }} /><Text style={{ flex: 1.3, color: colors.accent, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>{a}</Text><Text style={{ flex: 1.3, color: colors.gold, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>{b}</Text></View>
            {rows.map(([k, x, y], i) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
                <Text style={{ flex: 1, color: colors.muted, fontSize: 12, fontWeight: '700' }}>{k}</Text><Text style={{ flex: 1.3, color: colors.fg, fontWeight: '800', textAlign: 'center', fontSize: 14 }}>{String(x)}</Text><Text style={{ flex: 1.3, color: colors.fg, fontWeight: '800', textAlign: 'center', fontSize: 14 }}>{String(y)}</Text>
              </View>))}
          </Card>
        </ShareCard>) : <Note>No data for one of these seasons.</Note>}
    </Screen>);
}
