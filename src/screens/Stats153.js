import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { constructorTitleHistory, seasonParity, openersClosers, pointsPerStart } from '../api/history';

const Missing = () => <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
const Row = ({ a, b, c, i, tint }) => (
  <Reveal index={Math.min(i, 8)}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ color: colors.muted, width: 44, fontWeight: '700', fontSize: 14 }}>{a}</Text>
      <View style={{ flex: 1 }}>{b}</View>
      <Text style={{ color: tint || colors.fg, fontWeight: '800', fontSize: 15, textAlign: 'right' }}>{c}</Text>
    </View>
  </Reveal>);
const T = ({ children, sub }) => (<View><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{children}</Text>{sub ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{sub}</Text> : null}</View>);
const pc = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;

export function ConstructorTitlesScreen() {
  const d = useMemo(() => { try { return constructorTitleHistory(); } catch { return null; } }, []);
  const [m, setM] = useState('close');
  if (!d || !d.rows.length) return <Missing />;
  const list = m === 'close' ? d.closest : m === 'big' ? d.biggest : d.rows;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Constructors' titles</Eyebrow><Note>How each constructors' championship was decided, from 1958. Margin is the points gap to the runner-up as a share of the winner's total. Points systems changed over the years, so compare within an era. A renamed team is counted under each name.</Note></Card>
      <Segmented value={m} items={[['close', 'Closest'], ['big', 'Biggest'], ['all', 'Every year']]} onChange={setM} />
      {list.map((r, i) => (<Row key={`${m}${r.year}`} i={i} a={r.year} b={<T sub={`${r.pts} pts to ${r.second} ${r.secPts} · ${r.wins} win${r.wins === 1 ? '' : 's'} in ${r.rounds}`}>{r.team}</T>} c={m === 'all' ? `+${Math.round(r.margin * 10) / 10}` : `${pc(r.pct)}`} />))}
      <Eyebrow>Most titles</Eyebrow>
      <Card>{d.teams.slice(0, 10).map((t, i) => (<Row key={t.team} i={i} a={`${t.n}`} b={<T sub={`${t.from} to ${t.to}`}>{t.team}</T>} c={t.streak > 1 ? `${t.streak} in a row` : ''} tint={colors.gold} />))}</Card>
    </Screen>);
}

export function SeasonParityScreen() {
  const d = useMemo(() => { try { return seasonParity(); } catch { return null; } }, []);
  const [m, setM] = useState('open');
  if (!d || !d.rows.length) return <Missing />;
  const list = m === 'open' ? d.open : m === 'one' ? d.oneSided : d.rows;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Season parity</Eyebrow><Note>{`How many different drivers won races each year. The average is ${d.avg.toFixed(1)} winners per season. Seasons with 8 or more rounds.`}</Note></Card>
      <Segmented value={m} items={[['open', 'Most open'], ['one', 'One-sided'], ['all', 'Every year']]} onChange={setM} />
      {list.map((r, i) => (<Row key={`${m}${r.year}`} i={i} a={r.year} b={<T sub={`${r.teams} team${r.teams === 1 ? '' : 's'} · top: ${r.topName} ${r.topWins}`}>{`${r.drivers} winner${r.drivers === 1 ? '' : 's'} in ${r.rounds}`}</T>} c={m === 'one' ? pc(r.share) : `${r.drivers}`} tint={m === 'one' ? colors.accent : colors.good} />))}
    </Screen>);
}

export function OpenersClosersScreen() {
  const d = useMemo(() => { try { return openersClosers(); } catch { return null; } }, []);
  const [m, setM] = useState('both');
  if (!d || !d.rows.length) return <Missing />;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Opening and closing races</Eyebrow><Note>{`The first and last race of each season. The opener's winner went on to take the title ${d.openerChamps} times in ${d.n} seasons; the finale's winner ${d.closerChamps} times.`}</Note></Card>
      <Segmented value={m} items={[['both', 'Won both'], ['open', 'Openers'], ['close', 'Finales'], ['all', 'Every year']]} onChange={setM} />
      {m === 'both' ? (d.both.length ? d.both.map((r, i) => (<Row key={r.year} i={i} a={r.year} b={<T sub={`${r.openerRace} and ${r.closerRace}`}>{r.opener}</T>} c={r.openerChamp ? 'Champion' : ''} tint={colors.gold} />)) : <Note>No driver has done it.</Note>) : null}
      {m === 'open' ? d.openers.map((r, i) => (<Row key={r.name} i={i} a={`${r.n}`} b={<T>{r.name}</T>} c="openers" tint={colors.muted} />)) : null}
      {m === 'close' ? d.closers.map((r, i) => (<Row key={r.name} i={i} a={`${r.n}`} b={<T>{r.name}</T>} c="finales" tint={colors.muted} />)) : null}
      {m === 'all' ? d.rows.map((r, i) => (<Row key={r.year} i={i} a={r.year} b={<T sub={`${r.openerRace}: ${r.opener}${r.openerChamp ? ' (champion)' : ''}`}>{`${r.closerRace}: ${r.closer}${r.closerChamp ? ' (champion)' : ''}`}</T>} c={r.both ? 'Both' : ''} tint={colors.gold} />)) : null}
    </Screen>);
}

export function PointsPerStartScreen() {
  const d = useMemo(() => { try { return pointsPerStart(); } catch { return null; } }, []);
  const [m, setM] = useState('share');
  if (!d || !d.count) return <Missing />;
  const list = m === 'share' ? d.share : d.raw;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Points per start</Eyebrow><Note>{`Drivers with 40 or more starts (${d.count} of them). "Share of a win" is the average of each race's points divided by the winner's points, so different scoring eras can be compared. Raw points per start favours modern years. Sprint points and shared drives are not separated out.`}</Note></Card>
      <Segmented value={m} items={[['share', 'Share of a win'], ['raw', 'Raw points']]} onChange={setM} />
      {list.map((r, i) => (<Row key={`${m}${r.name}`} i={i} a={`${i + 1}`} b={<T sub={`${r.n} starts · ${r.from} to ${r.to}`}>{r.name}</T>} c={m === 'share' ? pc(r.share) : r.avg.toFixed(1)} tint={colors.accent} />))}
    </Screen>);
}
