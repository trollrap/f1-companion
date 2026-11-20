import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import ShareCard from '../components/ShareCard';
import { Text } from '../components/Text';
import Screen, { Card, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import { StatHeader, SectionLabel } from '../components/StatRows';
import { useAsync } from '../hooks/useAsync';
import { historyYears, seasonHeat } from '../api/history';
import { teamBattles } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha, teamColor } from '../theme';

// ---------- Season heatmap: every driver at every round, coloured by where they finished ----------
export const heatColor = (c) => {
  if (!c) return alpha(colors.fg, 0.04);
  if (c.out) return alpha(colors.accent, 0.45);
  if (c.pos === 1) return '#f5c400';
  if (c.pos === 2) return '#c9ced6'; if (c.pos === 3) return '#cd7f32';
  if (c.pos <= 10) return alpha(colors.good, 0.85 - (c.pos - 4) * 0.09);
  return alpha(colors.fg, 0.12);
};
const NAME = 40;
export function SeasonHeatmapScreen() {
  const years = historyYears(); const [year, setYear] = useState(years[0]); const [pick, setPick] = useState(null);
  const d = useMemo(() => seasonHeat(year), [year]);
  const { width: W } = useWindowDimensions(); const CELL = d ? Math.max(12, Math.min(30, Math.floor((W - 32 - 16 - NAME) / d.rounds.length))) : 30; // every round fits the width, so the whole season is on screen and in the shared picture
  const cell = pick && d ? d.drivers.find((x) => x.idx === pick.d).cells[pick.r] : null;
  return (
    <Screen header={false}>
      <StatHeader title="Season heatmap" icon="grid" color={colors.good} note="One row per driver, one column per round, in championship order. Gold, silver and bronze are the podium, green is a points finish, grey is a finish outside the points and red is a retirement. Tap a square for the detail." />
      <Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => { setYear(Number(v)); setPick(null); }} prefix="Season" />
      {d ? (<>
        <ShareCard title={`${year} season heatmap`}>
        <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 8 }}>
          <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15, marginBottom: 6 }}>{`${year} season, race by race`}</Text>
          <View>
            <View>
              <View style={{ flexDirection: 'row', marginLeft: NAME, marginBottom: 4 }}>{d.rounds.map((r) => <View key={r.round} style={{ width: CELL, alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{r.round}</Text></View>)}</View>
              {d.drivers.map((dr) => (
                <View key={dr.idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                  <View style={{ width: NAME, flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: teamColor(dr.teamId) }} /><Text style={{ color: colors.fg, fontSize: 12, fontWeight: '800' }}>{dr.code}</Text></View>
                  {dr.cells.map((c, ri) => { const on = pick && pick.d === dr.idx && pick.r === ri;
                    return (<View key={ri} accessible accessibilityLabel={c ? `${dr.name}, ${d.rounds[ri].name}: ${c.pos ? `P${c.pos}` : c.status || 'did not finish'}` : `${dr.name}, ${d.rounds[ri].name}: did not take part`} onTouchEnd={() => setPick(on ? null : { d: dr.idx, r: ri })} style={{ width: CELL - 3, height: Math.min(26, CELL), marginRight: 3, borderRadius: 6, backgroundColor: heatColor(c), alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 0, borderColor: colors.fg }}>
                      <Text style={{ color: c && c.pos && c.pos <= 3 ? '#111' : colors.fg, fontSize: CELL < 18 ? 8 : 11, fontWeight: '800' }}>{c ? (c.pos || '×') : ''}</Text></View>); })}
                </View>))}
            </View>
          </View>
        </View>
        </ShareCard>
        {pick && cell ? <Card><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{`${d.drivers.find((x) => x.idx === pick.d).name} · ${d.rounds[pick.r].name} Grand Prix`}</Text>
          <Text style={{ color: colors.onSoft, marginTop: 4 }}>{`${cell.pos ? `Finished P${cell.pos}` : cell.status || 'Did not finish'}${cell.grid ? ` · started P${cell.grid}` : ''}${cell.pts ? ` · ${cell.pts} pts` : ''}${cell.fast ? ' · fastest lap' : ''}`}</Text></Card>
          : pick ? <Card><Text style={{ color: colors.onSoft }}>Did not take part in this round.</Text></Card> : null}
        <SectionLabel>Key</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{[['Win', '#f5c400'], ['Podium', '#c9ced6'], ['Points', colors.good], ['No points', alpha(colors.fg, 0.2)], ['Out', alpha(colors.accent, 0.6)]].map(([l, c]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} /><Text style={{ color: colors.onSoft, fontSize: 12 }}>{l}</Text></View>))}</View>
        <Note>Results come from the offline history. Sprint points are included in the points but not shown as separate squares.</Note>
      </>) : <Note>No data for that season.</Note>}
    </Screen>);
}

// ---------- Team-mate head-to-head: who beat whom in qualifying and in the race ----------
const dot = (v, a, b) => (v === 1 ? colors.accent : v === -1 ? colors.blue || '#4da3ff' : alpha(colors.fg, 0.15));
export function QualiBattlesScreen() {
  const years = Array.from({ length: YEAR - 2005 }, (_, i) => YEAR - i); const [year, setYear] = useState(YEAR);
  const q = useAsync(() => teamBattles(year), [year]);
  return (
    <Screen header={false}>
      <StatHeader title="Team-mate battles" icon="people" color={colors.blue || '#4da3ff'} note="For every team: who qualified ahead of their team-mate and who finished ahead in the race, round by round. The first driver listed is the one who raced for the team most. Rounds where either driver took no part in the session do not count." />
      <Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" />
      {q.loading ? <Skeleton rows={6} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {q.v && !q.v.teams.length ? <Note>No finished races for this season yet.</Note> : null}
      {q.v ? q.v.teams.map((t) => (
        <View key={t.teamId} style={{ padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: alpha(teamColor(t.teamId), 0.5), gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: teamColor(t.teamId) }} /><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{t.name}</Text></View>
          {[['Qualifying', t.q, t.qa, t.qb], ['Race', t.r, t.ra, t.rb]].map(([l, arr, x, y]) => (
            <View key={l} style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: colors.fg, fontWeight: '700' }} numberOfLines={1}>{t.a.last}</Text>
                <Text style={{ color: colors.fg, fontWeight: '900', fontSize: 18 }}>{`${x} – ${y}`}</Text>
                <Text style={{ flex: 1, color: colors.fg, fontWeight: '700', textAlign: 'right' }} numberOfLines={1}>{t.b.last}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 2 }}>{arr.map((v, i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: dot(v) }} />)}</View>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{l}</Text>
            </View>))}
        </View>)) : null}
      {q.v && q.v.teams.length ? <Note>Red bars are rounds the first driver was ahead, blue the second, grey no comparison. Qualifying and race results come from Jolpica and are loaded once, then kept on the phone.</Note> : null}
    </Screen>);
}
