import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import ShareCard from '../components/ShareCard';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import { Segmented } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { gridData } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { gridDrops } from '../lib/gridDrops';
import { colors, alpha, teamColor } from '../theme';

// Grid penalties tracker: who started further back than they qualified, per race and per driver.
export default function GridDropsScreen() {
  const years = useMemo(() => { const a = []; for (let y = YEAR; y >= 2023; y--) a.push(y); return a; }, []);
  const [year, setYear] = useState(YEAR); const [tab, setTab] = useState('race');
  const q = useAsync(() => gridData(year), [year]); const G = useMemo(() => (q.v ? gridDrops(q.v.quali, q.v.results) : null), [q.v]);
  const bar = (id) => <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: teamColor(id) }} />;
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Grid penalties tracker</Eyebrow>
        <View style={{ marginTop: 10 }}><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" /></View>
        <View style={{ marginTop: 10 }}><Segmented value={tab} onChange={setTab} items={[['race', 'By race'], ['driver', 'By driver'], ['team', 'By team']]} /></View>
        <Note>Compares each driver's qualifying position with the grid slot they started from. A worse slot means a penalty or exclusion, and 0 means a pit-lane start. The data does not say why, so no reason is shown. Seasons from 2023, when the race grid is set by Qualifying.</Note>
      </Card>
      {q.loading ? <Skeleton rows={5} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {G && !G.byRace.length ? <Note>No grid drops found for this season yet.</Note> : null}
      {G && tab === 'race' ? G.byRace.map((g) => (
        <ShareCard key={g.round} title={`Grid drops, round ${g.round} ${g.race}`}><Card>
          <Eyebrow>{`Round ${g.round} · ${g.race}`}</Eyebrow>
          {g.rows.map((r) => (
            <View key={r.driverId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line }}>
              {bar(r.teamId)}
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{`${r.first || ''} ${r.last}`.trim()}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{r.team}</Text></View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{r.pit ? `Qualified P${r.from}` : `P${r.from} to P${r.to}`}</Text>
              <Text style={{ color: colors.red, fontWeight: '900', fontSize: 15, minWidth: 64, textAlign: 'right' }}>{r.pit ? 'Pit lane' : `−${r.drop}`}</Text>
            </View>))}
        </Card></ShareCard>)) : null}
      {G && tab === 'driver' && G.drivers.length ? (
        <Card><Eyebrow>Most grid drops</Eyebrow>
          {G.drivers.map((d) => (
            <View key={d.driverId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line }}>
              {bar(d.teamId)}
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{d.team}</Text></View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{`${d.places} places${d.pit ? ` · ${d.pit} pit lane` : ''}`}</Text>
              <Text style={{ color: colors.red, fontWeight: '900', fontSize: 16, minWidth: 28, textAlign: 'right' }}>{d.times}</Text>
            </View>))}
        </Card>) : null}
      {G && tab === 'team' && G.teams.length ? (
        <Card><Eyebrow>Most grid drops</Eyebrow>
          {G.teams.map((t) => (
            <View key={t.teamId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line }}>
              {bar(t.teamId)}<Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{t.team}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{`${t.places} places`}</Text>
              <Text style={{ color: colors.red, fontWeight: '900', fontSize: 16, minWidth: 28, textAlign: 'right' }}>{t.times}</Text>
            </View>))}
        </Card>) : null}
    </Screen>);
}
