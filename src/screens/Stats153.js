import React, { useMemo, useState } from 'react';
import Screen, { Note } from '../components/Screen';
import { Segmented } from '../components/Shared';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import { colors } from '../theme';
import { constructorTitleHistory, seasonParity, openersClosers, pointsPerStart } from '../api/history';

const Missing = () => <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
const pc = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;

export function ConstructorTitlesScreen() {
  const d = useMemo(() => { try { return constructorTitleHistory(); } catch { return null; } }, []);
  const [m, setM] = useState('close');
  if (!d || !d.rows.length) return <Missing />;
  const list = m === 'close' ? d.closest : m === 'big' ? d.biggest : d.rows; const mx = Math.max(...list.map((r) => r.pct), 0.01); const tm = Math.max(...d.teams.map((t) => t.n), 1);
  return (
    <Screen header={false}>
      <StatHeader title="Constructors' titles" icon="ribbon" color={colors.gold} note="How each constructors' championship was decided, from 1958. The percentage is the points gap to the runner-up as a share of the winner's total. Points systems changed, so compare within an era. A renamed team counts under each name." />
      <Segmented value={m} items={[['close', 'Closest'], ['big', 'Biggest'], ['all', 'Every year']]} onChange={setM} />
      <StatList>{list.map((r, i) => (<StatRow key={`${m}${r.year}`} i={i} badge={r.year} title={r.team} sub={`${r.pts} pts to ${r.second} ${r.secPts} · ${r.wins} win${r.wins === 1 ? '' : 's'} in ${r.rounds}`} value={m === 'all' ? `+${Math.round(r.margin * 10) / 10}` : pc(r.pct)} frac={m === 'close' ? 1 - r.pct / mx * 0.9 : r.pct / mx} color={colors.gold} />))}</StatList>
      <SectionLabel color={colors.gold}>Most titles</SectionLabel>
      <StatList>{d.teams.slice(0, 10).map((t, i) => (<StatRow key={t.team} i={i} medal badge={t.n} title={t.team} sub={`${t.from} to ${t.to}`} value={t.streak > 1 ? `${t.streak} in a row` : ''} frac={t.n / tm} color={colors.gold} />))}</StatList>
    </Screen>);
}

export function SeasonParityScreen() {
  const d = useMemo(() => { try { return seasonParity(); } catch { return null; } }, []);
  const [m, setM] = useState('open');
  if (!d || !d.rows.length) return <Missing />;
  const list = m === 'open' ? d.open : m === 'one' ? d.oneSided : d.rows; const mxd = Math.max(...d.rows.map((r) => r.drivers), 1);
  return (
    <Screen header={false}>
      <StatHeader title="Season parity" icon="shuffle" color={colors.good} note={`How many different drivers won races each year. The average is ${d.avg.toFixed(1)} winners per season. Seasons with 8 or more rounds.`} />
      <Segmented value={m} items={[['open', 'Most open'], ['one', 'One-sided'], ['all', 'Every year']]} onChange={setM} />
      <StatList>{list.map((r, i) => (<StatRow key={`${m}${r.year}`} i={i} badge={r.year} title={`${r.drivers} winner${r.drivers === 1 ? '' : 's'} in ${r.rounds} races`} sub={`${r.teams} team${r.teams === 1 ? '' : 's'} · top: ${r.topName} ${r.topWins}`} value={m === 'one' ? pc(r.share) : `${r.drivers}`} frac={m === 'one' ? r.share : r.drivers / mxd} color={m === 'one' ? colors.accent : colors.good} />))}</StatList>
    </Screen>);
}

export function OpenersClosersScreen() {
  const d = useMemo(() => { try { return openersClosers(); } catch { return null; } }, []);
  const [m, setM] = useState('both');
  if (!d || !d.rows.length) return <Missing />;
  const mo = Math.max(...d.openers.map((r) => r.n), 1), mc = Math.max(...d.closers.map((r) => r.n), 1);
  return (
    <Screen header={false}>
      <StatHeader title="Openers and finales" icon="flag" color={colors.accent} note={`The first and last race of each season. The opener's winner went on to take the title ${d.openerChamps} times in ${d.n} seasons; the finale's winner ${d.closerChamps} times.`} />
      <Segmented value={m} items={[['both', 'Won both'], ['open', 'Openers'], ['close', 'Finales'], ['all', 'Every year']]} onChange={setM} />
      <StatList>
        {m === 'both' ? (d.both.length ? d.both.map((r, i) => (<StatRow key={r.year} i={i} badge={r.year} title={r.opener} sub={`${r.openerRace} and ${r.closerRace}`} value={r.openerChamp ? 'Champion' : ''} color={colors.gold} />)) : <Note>No driver has done it.</Note>) : null}
        {m === 'open' ? d.openers.map((r, i) => (<StatRow key={r.name} i={i} medal badge={r.n} title={r.name} sub="season openers won" frac={r.n / mo} />)) : null}
        {m === 'close' ? d.closers.map((r, i) => (<StatRow key={r.name} i={i} medal badge={r.n} title={r.name} sub="season finales won" frac={r.n / mc} />)) : null}
        {m === 'all' ? d.rows.map((r, i) => (<StatRow key={r.year} i={i} badge={r.year} title={`${r.openerRace}: ${r.opener}${r.openerChamp ? ' (champion)' : ''}`} sub={`${r.closerRace}: ${r.closer}${r.closerChamp ? ' (champion)' : ''}`} value={r.both ? 'Both' : ''} color={colors.gold} />)) : null}
      </StatList>
    </Screen>);
}

export function PointsPerStartScreen() {
  const d = useMemo(() => { try { return pointsPerStart(); } catch { return null; } }, []);
  const [m, setM] = useState('share');
  if (!d || !d.count) return <Missing />;
  const list = m === 'share' ? d.share : d.raw; const mx = Math.max(...list.map((r) => (m === 'share' ? r.share : r.avg)), 0.01);
  return (
    <Screen header={false}>
      <StatHeader title="Points per start" icon="analytics" color={colors.purple} note={`Drivers with 40 or more starts (${d.count} of them). "Share of a win" divides each race's points by the winner's points, so scoring eras can be compared. Raw points per start favours modern years. Sprint points and shared drives are not separated out.`} />
      <Segmented value={m} items={[['share', 'Share of a win'], ['raw', 'Raw points']]} onChange={setM} />
      <StatList>{list.map((r, i) => (<StatRow key={`${m}${r.name}`} i={i} medal badge={i + 1} title={r.name} sub={`${r.n} starts · ${r.from} to ${r.to}`} value={m === 'share' ? pc(r.share) : r.avg.toFixed(1)} frac={(m === 'share' ? r.share : r.avg) / mx} color={colors.purple} />))}</StatList>
    </Screen>);
}
