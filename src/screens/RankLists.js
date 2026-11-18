import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader, StatRow, StatList } from '../components/StatRows';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { winDroughts, winless, placesGained } from '../api/history';

function Rows({ rows, big, sub, max, tint }) {
  return <StatList>{rows.map((o, i) => <StatRow key={`${o.name}${i}`} i={i} medal badge={i + 1} title={o.name} sub={sub(o)} value={big(o)} frac={max ? Math.abs(max(o)) / (rows.maxV || 1) : undefined} color={tint || colors.accent} />)}</StatList>;
}
function Wrap({ data, tabs, intro }) {
  const [t, setT] = useState(tabs[0][0]);
  if (!data) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const tab = tabs.find((x) => x[0] === t) || tabs[0]; const rows = data[t] || []; rows.maxV = Math.max(1, ...rows.map((r) => Math.abs((tab[3] || ((x) => x.n))(r))));
  return (
    <Screen header={false}>
      <StatHeader title={intro[0]} icon={intro[2] || 'podium'} note={intro[1]} />
      <Segmented value={t} items={tabs.map((x) => [x[0], x[1]])} onChange={setT} />
      {tab[4] ? <Text style={{ color: colors.muted, fontSize: 13 }}>{tab[4]}</Text> : null}
      <Rows rows={rows} big={tab[2][0]} sub={tab[2][1]} max={tab[3] || ((x) => x.n)} tint={tab[5]} />
    </Screen>);
}

export function DroughtsScreen() {
  const d = useMemo(() => { try { return winDroughts(); } catch { return null; } }, []);
  return <Wrap data={d} intro={['Win droughts', 'Counted in races the driver entered, from the built-in history. A race a driver skips is not counted.']} tabs={[
    ['between', 'Between wins', [(o) => `${o.n}`, (o) => `${o.from} to ${o.to}`], null, 'Longest stretch of races between two wins.'],
    ['waits', 'First win', [(o) => `${o.n}`, (o) => `First win at ${o.to}, after ${o.n} races without one`], null, 'Races entered before the first win.'],
    ['now', 'Right now', [(o) => `${o.n}`, (o) => `Last win ${o.from}`], null, 'Drivers still racing, races since their last win.'],
  ]} />;
}
export function WinlessScreen() {
  const d = useMemo(() => { try { return winless(); } catch { return null; } }, []);
  return <Wrap data={d} intro={['Best without a win', 'Drivers with 40 or more starts who never won, and drivers who won exactly once.']} tabs={[
    ['never', 'Never won', [(o) => `${o.podiums}`, (o) => `${o.podiums} podiums in ${o.starts} starts, best P${o.best} · ${o.yrs}`], (o) => o.podiums, 'Ranked by podiums.'],
    ['one', 'One win', [(o) => `${o.starts}`, (o) => `Won once, in ${o.win} · ${o.podiums} podiums · ${o.yrs}`], (o) => o.starts, d ? `${d.oneCount} drivers won exactly once. Showing the 25 with most starts.` : ''],
  ]} />;
}
export function PlacesGainedScreen() {
  const d = useMemo(() => { try { return placesGained(); } catch { return null; } }, []);
  const f = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
  return <Wrap data={d} intro={['Places gained', 'Average places gained from the starting grid to the flag, in races the driver started on the grid and was classified. Older eras look big because the grids were large and cars started far back. Compare like with like.']} tabs={[
    ['drivers', 'Drivers', [(o) => f(o.avg), (o) => `${o.n} races`], (o) => o.avg, '50 or more races. Best at the top; scroll for the drivers who lost places.'],
    ['teams', 'Teams', [(o) => f(o.avg), (o) => `${o.n} races`], (o) => o.avg, '100 or more races.'],
    ['years', 'Seasons', [(o) => f(o.avg), (o) => `${o.n} races`], (o) => o.avg, 'Newest first. A big number means a lot of overtaking.'],
  ]} />;
}
