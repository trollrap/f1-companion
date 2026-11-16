import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { ageRecords, hatTricks, debutSeasons, dnfRates } from '../api/history';

const Row = ({ i, title, big, sub }) => (
  <Reveal index={Math.min(i, 8)}>
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>{`${i + 1}. ${title}`}</Text>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{big}</Text>
      </View>
      {sub ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{sub}</Text> : null}
    </Card>
  </Reveal>);
const Missing = () => <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;

export function AgeRecordsScreen() {
  const d = useMemo(() => { try { return ageRecords(); } catch { return null; } }, []);
  const [c, setC] = useState('win'); const [w, setW] = useState('youngest');
  if (!d) return <Missing />;
  const rows = d[c][w];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Age records</Eyebrow><Note>Each driver appears once, at their best age. Ages are years and days from the birth date in the built-in history, so a day or so can differ from official tables. Pole means starting on the front row slot P1 on the grid.</Note></Card>
      <Segmented value={c} items={[['win', 'Winner'], ['pole', 'Pole'], ['podium', 'Podium'], ['start', 'Started']]} onChange={setC} />
      <Segmented value={w} items={[['youngest', 'Youngest'], ['oldest', 'Oldest']]} onChange={setW} />
      {rows.map((o, i) => <Row key={`${c}${w}${o.name}`} i={i} title={o.name} big={`${o.y}y ${o.d}d`} sub={o.race} />)}
    </Screen>);
}

export function HatTricksScreen() {
  const d = useMemo(() => { try { return hatTricks(); } catch { return null; } }, []);
  const [t, setT] = useState('drivers');
  if (!d) return <Missing />;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Hat-tricks</Eyebrow><Note>{`A race where one driver started on pole, won and set the fastest lap. ${d.total} in the history. The fastest-lap mark is missing for some older races, so old totals may be low. A true grand slam also needs every lap led, which the history does not store.`}</Note></Card>
      <Segmented value={t} items={[['drivers', 'Drivers'], ['years', 'Seasons']]} onChange={setT} />
      {t === 'drivers' ? d.rows.map((o, i) => <Row key={o.name} i={i} title={o.name} big={`${o.n}`} sub={`${o.from === o.to ? o.from : `${o.from} to ${o.to}`} · latest ${o.last}`} />)
        : d.years.map((o, i) => <Row key={o.year} i={i} title={`${o.year}`} big={`${o.n}`} sub="hat-tricks that season" />)}
    </Screen>);
}

export function BestDebutsScreen() {
  const d = useMemo(() => { try { return debutSeasons(); } catch { return null; } }, []);
  const [t, setT] = useState('share');
  if (!d) return <Missing />;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Best debut seasons</Eyebrow><Note>A driver's first season, if it had 8 or more starts. Ranked by their share of all points scored that year, which compares different points systems. Drivers whose first season was shorter than that are left out.</Note></Card>
      <Segmented value={t} items={[['share', 'Points share'], ['wins', 'Most wins']]} onChange={setT} />
      {d[t].map((o, i) => <Row key={`${t}${o.name}`} i={i} title={o.name} big={t === 'share' ? `${(o.share * 100).toFixed(1)}%` : `${o.wins}`} sub={`${o.year} · ${o.pts} pts, ${o.wins} win${o.wins === 1 ? '' : 's'}, ${o.podiums} podium${o.podiums === 1 ? '' : 's'} in ${o.starts} starts`} />)}
    </Screen>);
}

export function DnfRatesScreen() {
  const d = useMemo(() => { try { return dnfRates(); } catch { return null; } }, []);
  const [t, setT] = useState('leastNow');
  if (!d) return <Missing />;
  const notes = { leastNow: 'Raced since 2010, 60 or more starts. Fewest non-finishes.', mostNow: 'Raced since 2010, 60 or more starts. Most non-finishes.', least: 'All time, 100 or more starts. Fewest non-finishes.', most: 'All time, 100 or more starts. Most non-finishes. Older cars broke far more often.' };
  return (
    <Screen header={false}>
      <Card><Eyebrow>DNF rates</Eyebrow><Note>Share of starts that did not end classified: retirements, disqualifications and not classified. Crashes caused by others count too, and so do mechanical failures, so this is about luck and cars as much as the driver.</Note></Card>
      <Segmented value={t} items={[['leastNow', 'Fewest now'], ['mostNow', 'Most now'], ['least', 'Fewest ever'], ['most', 'Most ever']]} onChange={setT} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{notes[t]}</Text>
      {d[t].map((o, i) => <Row key={`${t}${o.name}`} i={i} title={o.name} big={`${(o.rate * 100).toFixed(0)}%`} sub={`${o.out} of ${o.n} starts · ${o.from} to ${o.to}`} />)}
    </Screen>);
}
