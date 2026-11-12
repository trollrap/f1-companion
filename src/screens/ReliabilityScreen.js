import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import { useAsync } from '../hooks/useAsync';
import { seasonStatuses } from '../api/jolpica';
import { historyYears } from '../api/history';
import { YEAR } from '../api/openf1';
import { reliability } from '../lib/reliability';
import { colors, alpha, teamColor } from '../theme';

// Reliability report: retirements by team, split into mechanical, accidents and other, with a recent-form arrow.
export default function ReliabilityScreen() {
  const years = useMemo(() => { try { return [YEAR, ...historyYears().filter((y) => y !== YEAR)].sort((a, b) => b - a); } catch { return [YEAR]; } }, []);
  const [year, setYear] = useState(YEAR); const [open, setOpen] = useState(null);
  const q = useAsync(() => seasonStatuses(year), [year]); const R = useMemo(() => (q.v && q.v.length ? reliability(q.v) : null), [q.v]);
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Reliability report</Eyebrow>
        <View style={{ marginTop: 10 }}><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => { setYear(Number(v)); setOpen(null); }} prefix="Season" /></View>
        <Note>Every race a car did not finish, sorted by the status the result gives: mechanical (engine, gearbox, hydraulics and so on), accident (collisions, spins, damage) or other.</Note>
      </Card>
      {q.loading ? <Skeleton rows={5} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {R && R.teams.length === 0 ? <Note>No results for this season yet.</Note> : null}
      {R ? (<>
        <Card>
          <Eyebrow>Teams, most reliable first</Eyebrow>
          {R.teams.map((t) => { const c = teamColor(t.teamId); const lately = t.recentStarts >= 4 ? (t.recentRate > t.mechRate + 0.08 ? 'worse' : t.recentRate < t.mechRate - 0.08 ? 'better' : 'same') : null; const on = open === t.teamId; return (
            <View key={t.teamId} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${t.team}: ${t.mech} mechanical retirements in ${t.starts} starts`} onPress={() => setOpen(on ? null : t.teamId)} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: c }} />
                  <Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{t.team}</Text>
                  {lately ? <Text style={{ color: lately === 'worse' ? colors.red : lately === 'better' ? colors.good : colors.muted, fontSize: 12, fontWeight: '800' }}>{lately === 'worse' ? '▼ worse lately' : lately === 'better' ? '▲ better lately' : '● steady'}</Text> : null}
                  <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                </View>
                <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: alpha(colors.good, 0.35) }}>
                  {t.starts ? <View style={{ flex: t.mech, backgroundColor: colors.red }} /> : null}{t.starts ? <View style={{ flex: t.crash, backgroundColor: colors.gold }} /> : null}{t.starts ? <View style={{ flex: t.other, backgroundColor: colors.muted }} /> : null}<View style={{ flex: Math.max(0, t.starts - t.mech - t.crash - t.other) }} />
                </View>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{`${t.starts} starts · ${t.mech} mechanical · ${t.crash} accident · ${t.other} other · ${Math.round(t.finishRate * 100)}% finished`}</Text>
              </Pressable>
              {on ? (<View style={{ marginTop: 6 }}>{t.list.length ? t.list.map((x, i) => (<View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}><Text style={{ width: 28, color: colors.muted }}>{`R${x.round}`}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 14 }} numberOfLines={1}>{`${x.driver}: ${x.status}`}</Text><Text style={{ color: x.kind === 'mech' ? colors.red : x.kind === 'crash' ? colors.gold : colors.muted, fontSize: 12, fontWeight: '800' }}>{x.kind === 'mech' ? 'MECH' : x.kind === 'crash' ? 'ACCIDENT' : 'OTHER'}</Text></View>)) : <Text style={{ color: colors.muted }}>No retirements.</Text>}</View>) : null}
            </View>); })}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>{[[colors.red, 'Mechanical'], [colors.gold, 'Accident'], [colors.muted, 'Other']].map(([c, l]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} /><Text style={{ color: colors.muted, fontSize: 12 }}>{l}</Text></View>))}</View>
        </Card>
        {R.causes.length ? (<Card><Eyebrow>Most common mechanical causes</Eyebrow>{R.causes.map((x) => (<View key={x.status} style={{ flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>{x.status}</Text><Text style={{ color: colors.fg, fontWeight: '800' }}>{x.n}</Text></View>))}</Card>) : null}
      </>) : null}
    </Screen>);
}
