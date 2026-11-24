import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader, StatRow, SectionLabel } from '../components/StatRows';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import { streakBoard } from '../api/history';

const TABS = [['win', 'Wins'], ['podium', 'Podiums'], ['points', 'Points']];
export default function StreaksScreen() {
  const [t, setT] = useState('win'); const B = useMemo(() => { try { return streakBoard(); } catch { return null; } }, []);
  if (!B) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const all = B.rows[t]; const live = all.filter((x) => x.current > 0).sort((a, b) => b.current - a.current).slice(0, 5); const top = all.slice(0, 15);
  const max = Math.max(1, top[0]?.len || 1);
  return (
    <Screen header={false}>
      <StatHeader title="Streaks" icon="flash" note={`Longest runs of consecutive races entered with a win, a podium or a points finish, from the built-in history up to the last race in it. A race a driver skips does not break a run.`} />
      <Segmented value={t} items={TABS} onChange={setT} />
      {live.length ? (<Card><Eyebrow>Running now</Eyebrow>{live.map((x) => (<View key={x.id || x.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}><Text style={{ color: colors.fg, fontWeight: '600' }}>{x.name}</Text><Text style={{ color: colors.accentText, fontWeight: '800' }}>{x.current}</Text></View>))}</Card>) : null}
      <SectionLabel>Longest ever</SectionLabel>
      {top.map((x, i) => (
        <StatRow key={`${t}${x.id || x.name}`} i={i} medal title={x.name} sub={`${x.from} to ${x.to}${x.current ? ' · still running' : ''}`} value={String(x.len)} frac={x.len / max} color={x.current ? colors.good : colors.accent} />))}
    </Screen>);
}
