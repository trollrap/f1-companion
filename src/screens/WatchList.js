import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import Dropdown from '../components/Dropdown';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { readWatch, writeWatch, hasWatch } from '../lib/watchlist';
import { historyYears, roundsOf } from '../api/history';

export default function WatchListScreen({ navigation }) {
  const [list, setList] = useState(null); const years = useMemo(() => { try { return historyYears(); } catch { return []; } }, []);
  const [year, setYear] = useState(years[1] || years[0]); const rounds = useMemo(() => (year ? roundsOf(year) : []), [year]);
  useEffect(() => { readWatch().then(setList); }, []);
  if (!list) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const put = (n) => { setList(n); writeWatch(n); };
  const add = (r) => { if (hasWatch(list, year, r.round)) return; hap.good(); put([{ y: year, r: r.round, name: r.name, done: false }, ...list]); };
  const todo = list.filter((x) => !x.done), done = list.filter((x) => x.done);
  const Row = ({ x, i }) => (
    <Reveal index={Math.min(i, 6)}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: x.done }} accessibilityLabel={`${x.done ? 'Mark not watched' : 'Mark watched'}: ${x.y} ${x.name}`} hitSlop={8} onPress={() => { hap.tap(); put(list.map((y) => (y === x ? { ...y, done: !y.done } : y))); }}>
            <Ionicons name={x.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={x.done ? colors.good : colors.muted} />
          </Pressable>
          <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => navigation.navigate('TimeMachine', { year: x.y, round: x.r })}>
            <Text style={{ color: x.done ? colors.muted : colors.fg, fontSize: 16, fontWeight: '700' }}>{`${x.y} ${x.name}`}</Text><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>Open in Time machine</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove from the watch list" hitSlop={8} onPress={() => put(list.filter((y) => y !== x))}><Ionicons name="close" size={20} color={colors.muted} /></Pressable>
        </View>
      </Card>
    </Reveal>);
  return (
    <Screen header={false}>
      <StatHeader title="Watch list" icon="bookmark" note={`Save past races to watch later, tick them off when you have, and jump straight into the Time machine.`} />
      <Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(y) => setYear(Number(y))} prefix="Season" />
      <View style={{ gap: 6 }}>
        {rounds.map((r) => { const on = hasWatch(list, year, r.round); return (
          <Pressable key={r.round} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => add(r)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: on ? alpha(colors.accent, 0.14) : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
            <Text style={{ color: colors.fg }}>{`R${r.round} · ${r.name}`}</Text><Ionicons name={on ? 'bookmark' : 'bookmark-outline'} size={18} color={on ? colors.accent : colors.muted} /></Pressable>); })}
      </View>
      <Eyebrow>{`To watch (${todo.length})`}</Eyebrow>
      {todo.map((x, i) => <Row key={`${x.y}-${x.r}`} x={x} i={i} />)}
      {!todo.length ? <Note>Nothing waiting. Tap a race above to save it.</Note> : null}
      {done.length ? <><Eyebrow>{`Watched (${done.length})`}</Eyebrow>{done.map((x, i) => <Row key={`${x.y}-${x.r}`} x={x} i={i} />)}<Btn onPress={() => put(list.filter((x) => !x.done))}>Clear watched</Btn></> : null}
    </Screen>);
}
