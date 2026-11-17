import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import Dropdown from '../components/Dropdown';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { kvGet, kvSet } from '../lib/kv';
import { birthdayData, eraStats } from '../api/history';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const Line = ({ a, b, c, i }) => (
  <Reveal index={Math.min(i, 8)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
    <Text style={{ color: colors.muted, width: 44, fontWeight: '700', fontSize: 14 }}>{a}</Text>
    <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{b}</Text></View>
    <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>{c}</Text></View></Reveal>);

export function BirthdayScreen() {
  const [bd, setBd] = useState(null);
  useEffect(() => { kvGet('birthday:v1', null).then((v) => setBd(v && v.m ? v : { m: 1, d: 1, set: false })); }, []);
  const d = useMemo(() => { if (!bd) return null; try { return birthdayData(bd.m, bd.d); } catch { return { born: [], races: [] }; } }, [bd && bd.m, bd && bd.d]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!bd) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const put = (n) => { const x = { ...n, set: true }; if (x.d > LEN[x.m - 1]) x.d = LEN[x.m - 1]; setBd(x); kvSet('birthday:v1', x); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>On my birthday</Eyebrow><Note>Pick a day. Only the month and day are used and they stay on this phone.</Note>
        <Dropdown value={bd.m} options={MONTHS.map((n, i) => [i + 1, n])} onChange={(m) => put({ ...bd, m })} />
        <Dropdown value={bd.d} options={Array.from({ length: LEN[bd.m - 1] }, (_, i) => [i + 1, String(i + 1)])} onChange={(v) => put({ ...bd, d: v })} prefix="Day" /></Card>
      <Eyebrow>{`Drivers born on ${bd.d} ${MONTHS[bd.m - 1]}`}</Eyebrow>
      <Card>{d.born.length ? d.born.map((x, i) => <Line key={x.name} i={i} a={x.year} b={x.name} c={`${x.starts} starts${x.wins ? ` · ${x.wins} wins` : ''}${x.titles ? ` · ${x.titles} title${x.titles > 1 ? 's' : ''}` : ''}`} />) : <Note>No F1 driver in the history was born on this day.</Note>}</Card>
      <Eyebrow>{`Grands Prix held on ${bd.d} ${MONTHS[bd.m - 1]}`}</Eyebrow>
      <Card>{d.races.length ? d.races.map((x, i) => <Line key={`${x.year}${x.name}`} i={i} a={x.year} b={x.name} c={x.winner ? `won by ${x.winner}` : ''} />) : <Note>No Grand Prix was held on this date.</Note>}</Card>
    </Screen>);
}

const DECS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
export function EraExplorerScreen() {
  const [dec, setDec] = useState(2010);
  const d = useMemo(() => { try { return eraStats(dec); } catch { return null; } }, [dec]);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Era explorer</Eyebrow><Note>Pick a decade. The 2020s run to the latest season in the built-in history.</Note>
        <Segmented value={String(dec)} items={DECS.map((x) => [String(x), `${String(x).slice(2)}s`])} onChange={(v) => setDec(Number(v))} /></Card>
      {!d ? <Note>No races in this decade.</Note> : (<>
        <Card><Eyebrow>{`${d.from} to ${d.to}`}</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 }}>
            {[[`${d.races}`, 'races'], [d.perSeason.toFixed(1), 'per season'], [d.cars.toFixed(0), 'cars per race'], [`${Math.round(d.finishRate * 100)}%`, 'classified'], [d.winnersPerYear.toFixed(1), 'winners a year']].map(([v, l]) => (<View key={l}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{l}</Text></View>))}
          </View>
          <Note>Classified means finished with a numbered position, so it also counts drivers a few laps down.</Note></Card>
        <Eyebrow>World champions</Eyebrow><Card>{d.champs.map((c, i) => <Line key={c.year} i={i} a={c.year} b={c.name} c="" />)}</Card>
        <Eyebrow>Most wins</Eyebrow><Card>{d.drivers.map((c, i) => <Line key={c.name} i={i} a={`${c.n}`} b={c.name} c="" />)}</Card>
        <Eyebrow>Most wins by team</Eyebrow><Card>{d.teams.map((c, i) => <Line key={c.name} i={i} a={`${c.n}`} b={c.name} c="" />)}</Card>
        {d.close ? <Card><Eyebrow>Closest title</Eyebrow><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{`${d.close.year}: ${d.close.name}`}</Text><Note>{`${d.close.margin} points over ${d.close.second}.`}</Note></Card> : null}
      </>)}
    </Screen>);
}
