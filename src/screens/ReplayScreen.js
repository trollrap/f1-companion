import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import { Segmented } from '../components/Shared';
import { colors, teamColor } from '../theme';
import { historyYears } from '../api/history';
import { replay, SYSTEMS } from '../lib/historyWhatIf';

const arrow = (n, was) => (was == null ? 'new' : was - n > 0 ? `▲${was - n}` : was - n < 0 ? `▼${n - was}` : '–');
// Season replay: any past season from the offline history, with another points system, a driver taken out, or the worst results dropped.
export default function ReplayScreen() {
  const years = useMemo(() => historyYears().filter((y) => y < new Date().getFullYear() + 1), []);
  const [year, setYear] = useState(years[1] || years[0]); const [system, setSystem] = useState('actual'); const [remove, setRemove] = useState('none'); const [drop, setDrop] = useState(0); const [sprint, setSprint] = useState(true); const [view, setView] = useState('drivers');
  const base = useMemo(() => replay(year, {}), [year]);
  const r = useMemo(() => replay(year, { system, remove: remove === 'none' ? null : remove, drop, sprint }), [year, system, remove, drop, sprint]);
  if (!r) return <Screen header={false}><Card><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>No data for {year}</Text></Card></Screen>;
  const changed = r.champion.now?.id !== r.champion.was?.id; const list = view === 'drivers' ? r.drivers : r.teams;
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Season replay</Eyebrow>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(y) => { setYear(Number(y)); setRemove('none'); }} prefix="Season" />
          <Dropdown value={system} options={SYSTEMS.map((x) => [x[0], x[1]])} onChange={setSystem} prefix="Points" />
          <Dropdown value={remove} options={[['none', 'Nobody'], ...(base?.roster || []).map((x) => [x.id, x.name])]} onChange={setRemove} prefix="Take out" />
          <Dropdown value={drop} options={[[0, 'None'], [1, 'Worst 1'], [2, 'Worst 2'], [3, 'Worst 3'], [4, 'Worst 4']]} onChange={(v) => setDrop(Number(v))} prefix="Drop results" />
          <Dropdown value={sprint ? 'yes' : 'no'} options={[['yes', 'Counted as scored'], ['no', 'Left out']]} onChange={(v) => setSprint(v === 'yes')} prefix="Sprint points" />
        </View>
      </Card>
      <Card>
        <Eyebrow>{`${year} · ${r.races} races`}</Eyebrow>
        <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 6 }}>{`Champion: ${r.champion.now?.name || '-'}`}</Text>
        <Text style={{ color: changed ? colors.gold : colors.muted, fontSize: 16, marginTop: 2 }}>{changed ? `It was ${r.champion.was?.name}. The title changes hands.` : 'Same champion as in real life.'}</Text>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 6 }}>{`Constructors: ${r.constructor.now?.name || '-'}${r.constructor.now?.name !== r.constructor.was?.name ? ` (was ${r.constructor.was?.name})` : ''}`}</Text>
      </Card>
      <Segmented value={view} onChange={setView} items={[['drivers', 'Drivers'], ['teams', 'Constructors']]} />
      <Card>
        {list.slice(0, 22).map((x, i) => (
          <View key={x.id || x.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <Text style={{ width: 28, color: i === 0 ? colors.gold : colors.muted, fontSize: 17, fontWeight: '800' }}>{x.pos}</Text>
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{x.name}</Text>{view === 'drivers' ? <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{x.team}</Text> : null}</View>
            <Text style={{ width: 46, textAlign: 'right', color: x.was != null && x.was - x.pos > 0 ? colors.good : x.was != null && x.was - x.pos < 0 ? colors.red : colors.muted, fontSize: 14, fontWeight: '700' }}>{arrow(x.pos, x.was)}</Text>
            <Text style={{ width: 54, textAlign: 'right', color: colors.fg, fontSize: 18, fontWeight: '800' }}>{x.total}</Text>
          </View>))}
        <Note>Built from race results in the offline history: sprint points are the season totals as scored (they do not change with the points system) and old best-N-results rules are not applied unless you drop results. Fastest-lap points are only counted where that rule is chosen.</Note>
      </Card>
    </Screen>
  );
}
