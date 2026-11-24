import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import Dropdown from '../components/Dropdown';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import { kvGet, kvSet } from '../lib/kv';
import { birthdayData, eraStats } from '../api/history';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function BirthdayScreen() {
  const [bd, setBd] = useState(null);
  useEffect(() => { kvGet('birthday:v1', null).then((v) => setBd(v && v.m ? v : { m: 1, d: 1, set: false })); }, []);
  const d = useMemo(() => { if (!bd) return null; try { return birthdayData(bd.m, bd.d); } catch { return { born: [], races: [] }; } }, [bd && bd.m, bd && bd.d]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!bd) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const put = (n) => { const x = { ...n, set: true }; if (x.d > LEN[x.m - 1]) x.d = LEN[x.m - 1]; setBd(x); kvSet('birthday:v1', x); };
  return (
    <Screen header={false}>
      <StatHeader title="On my birthday" icon="gift" color={colors.accentText} note="Pick a day. Only the month and day are used and they stay on this phone." />
      <Card><Dropdown value={bd.m} options={MONTHS.map((n, i) => [i + 1, n])} onChange={(m) => put({ ...bd, m })} />
        <Dropdown value={bd.d} options={Array.from({ length: LEN[bd.m - 1] }, (_, i) => [i + 1, String(i + 1)])} onChange={(v) => put({ ...bd, d: v })} prefix="Day" /></Card>
      <SectionLabel>{`Drivers born on ${bd.d} ${MONTHS[bd.m - 1]}`}</SectionLabel>
      <StatList>{d.born.length ? d.born.map((x, i) => <StatRow key={x.name} i={i} medal badge={x.year} title={x.name} sub={`${x.starts} start${x.starts === 1 ? '' : 's'}`} value={x.titles ? `${x.titles} title${x.titles > 1 ? 's' : ''}` : x.wins ? `${x.wins} wins` : ''} color={colors.accentText} />) : <Note>No F1 driver in the history was born on this day.</Note>}</StatList>
      <SectionLabel color={colors.gold}>{`Grands Prix held on ${bd.d} ${MONTHS[bd.m - 1]}`}</SectionLabel>
      <StatList>{d.races.length ? d.races.map((x, i) => <StatRow key={`${x.year}${x.name}`} i={i} badge={x.year} title={x.name} sub={x.winner ? `won by ${x.winner}` : ''} color={colors.gold} />) : <Note>No Grand Prix was held on this date.</Note>}</StatList>
    </Screen>);
}

const DECS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
export function EraExplorerScreen() {
  const [dec, setDec] = useState(2010);
  const d = useMemo(() => { try { return eraStats(dec); } catch { return null; } }, [dec]);
  return (
    <Screen header={false}>
      <StatHeader title="Era explorer" icon="time" color={colors.purple} note="Pick a decade. The 2020s run to the latest season in the built-in history." />
      <Segmented value={String(dec)} items={DECS.map((x) => [String(x), `${String(x).slice(2)}s`])} onChange={(v) => setDec(Number(v))} />
      {!d ? <Note>No races in this decade.</Note> : (<>
        <Card><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{`${d.from} to ${d.to}`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {[[`${d.races}`, 'races'], [d.perSeason.toFixed(1), 'per season'], [d.cars.toFixed(0), 'cars a race'], [`${Math.round(d.finishRate * 100)}%`, 'classified'], [d.winnersPerYear.toFixed(1), 'winners a year']].map(([v, l]) => (<View key={l} style={{ minWidth: '30%', flexGrow: 1, padding: 10, borderRadius: 12, backgroundColor: alpha(colors.purple, 0.14) }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }}>{l}</Text></View>))}
          </View>
          <Note>Classified means finished with a numbered position, so it also counts drivers a few laps down.</Note></Card>
        <SectionLabel color={colors.gold}>World champions</SectionLabel>
        <StatList>{d.champs.map((c, i) => <StatRow key={c.year} i={i} badge={c.year} title={c.name} color={colors.gold} />)}</StatList>
        <SectionLabel>Most wins</SectionLabel>
        <StatList>{d.drivers.map((c, i) => <StatRow key={c.name} i={i} medal badge={c.n} title={c.name} frac={c.n / d.drivers[0].n} />)}</StatList>
        <SectionLabel color={colors.good}>Most wins by team</SectionLabel>
        <StatList>{d.teams.map((c, i) => <StatRow key={c.name} i={i} medal badge={c.n} title={c.name} frac={c.n / d.teams[0].n} color={colors.good} />)}</StatList>
        {d.close ? <Card><SectionLabel color={colors.gold}>Closest title</SectionLabel><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800', marginTop: 8 }}>{`${d.close.year}: ${d.close.name}`}</Text><Note>{`${d.close.margin} points over ${d.close.second}.`}</Note></Card> : null}
      </>)}
    </Screen>);
}
