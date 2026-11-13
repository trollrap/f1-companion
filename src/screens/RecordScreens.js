import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { driverStandings, driverCareer } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { homeRecords, podiumPairs, comebacks } from '../api/history';
import { colors, alpha, teamColor } from '../theme';

const Line = ({ children, first }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>{children}</View>;

// ---------- Driver milestones: the next round-number record each current driver is heading for ----------
const STEPS = { races: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500], wins: [1, 5, 10, 25, 50, 75, 100, 125, 150], podiums: [1, 5, 10, 25, 50, 75, 100, 150, 200], poles: [1, 5, 10, 25, 50, 75, 100] };
const LABEL = { races: 'Grand Prix starts', wins: 'wins', podiums: 'podiums', poles: 'pole positions' };
const nextStep = (k, v) => { const s = STEPS[k].find((x) => x > v); return s ? { target: s, togo: s - v, prev: [0, ...STEPS[k]].filter((x) => x <= v).pop() } : null; };
export function MilestonesScreen() {
  const q = useAsync(async () => { const st = await driverStandings(YEAR); const rows = await Promise.all(st.map(async (d) => { try { return { d, c: await driverCareer(d.driverId) }; } catch { return null; } })); return rows.filter(Boolean); }, []);
  const items = useMemo(() => (q.v || []).map(({ d, c }) => ({ d, ms: ['races', 'wins', 'podiums', 'poles'].map((k) => (c && Number.isFinite(c[k]) ? { k, v: c[k], ...(nextStep(k, c[k]) || {}) } : null)).filter((m) => m && m.target) })), [q.v]);
  const closest = useMemo(() => items.flatMap((x) => x.ms.filter((m) => m.togo <= 5 && !(m.k !== 'races' && m.target === 1 && m.v > 0)).map((m) => ({ ...m, d: x.d }))).sort((a, b) => a.togo - b.togo || b.target - a.target).slice(0, 10), [items]);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Driver milestones</Eyebrow><Note>The next round-number career milestone for each driver on this season's grid. Counts come from the built-in history plus this season's races; sprint races are not counted as starts. Needs a connection.</Note></Card>
      {q.loading ? <Skeleton rows={6} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {closest.length ? (
        <ShareCard title="Closest F1 milestones">
          <Card><Eyebrow>Closest milestones</Eyebrow>
            {closest.map((m, i) => (<Line key={m.d.driverId + m.k} first={i === 0}><View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: teamColor(m.d.teamId) }} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{`${m.d.first} ${m.d.last}`}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${m.v} now · ${m.target} ${LABEL[m.k]}`}</Text></View><Text style={{ color: colors.gold, fontWeight: '900' }}>{m.togo === 1 ? '1 to go' : `${m.togo} to go`}</Text></Line>))}</Card>
        </ShareCard>) : null}
      {items.map((x) => (
        <Card key={x.d.driverId}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: teamColor(x.d.teamId) }} /><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 16, flex: 1 }} numberOfLines={1}>{`${x.d.first} ${x.d.last}`}</Text></View>
          {x.ms.map((m) => (<View key={m.k} style={{ marginTop: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.muted, fontSize: 13 }}>{`${m.v} / ${m.target} ${LABEL[m.k]}`}</Text><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 13 }}>{`${m.togo} to go`}</Text></View><View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(colors.fg, 0.1), marginTop: 4, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, ((m.v - m.prev) / (m.target - m.prev)) * 100)}%`, height: 6, backgroundColor: teamColor(x.d.teamId) }} /></View></View>))}</Card>))}
    </Screen>);
}

// ---------- Home-race heroes ----------
export function HomeHeroesScreen() {
  const all = useMemo(() => { try { return homeRecords(); } catch { return []; } }, []);
  const countries = useMemo(() => [...new Set(all.map((x) => x.country))].sort(), [all]);
  const [tab, setTab] = useState('wins'); const [country, setCountry] = useState(countries[0] || 'UK');
  const rows = useMemo(() => {
    if (tab === 'wins') return all.filter((x) => x.wins > 0).sort((a, b) => b.wins - a.wins || b.podiums - a.podiums).slice(0, 25);
    if (tab === 'podiums') return all.filter((x) => x.podiums > 0).sort((a, b) => b.podiums - a.podiums || b.wins - a.wins).slice(0, 25);
    return all.filter((x) => x.country === country).sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.starts - a.starts).slice(0, 40);
  }, [all, tab, country]);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Home-race heroes</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}><Segmented value={tab} onChange={setTab} items={[['wins', 'Home wins'], ['podiums', 'Home podiums'], ['country', 'By country']]} />{tab === 'country' ? <Dropdown value={country} options={countries.map((c) => [c, c])} onChange={setCountry} prefix="Country" /> : null}</View>
        <Note>A driver's home race is any Grand Prix held in their own country, so Italians count Monza and Imola, and Americans count every US race (the 1950s Indianapolis 500 is left out). Pole means the grid slot P1, which can differ slightly from official qualifying poles. Offline history.</Note></Card>
      <ShareCard title="Home-race heroes">
        <Card>
          {rows.map((x, i) => (<Line key={x.id} first={i === 0}><Text style={{ width: 24, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{`${x.starts} home starts · ${x.podiums} podiums · ${x.poles} from P1${x.best < 99 ? ` · best P${x.best}` : ''}`}</Text></View><Text style={{ color: colors.gold, fontWeight: '900', fontSize: 16 }}>{`${x.wins} W`}</Text></Line>))}
          {!rows.length ? <Text style={{ color: colors.muted }}>Nothing found.</Text> : null}
        </Card>
      </ShareCard>
    </Screen>);
}

// ---------- Podium pairs ----------
export function PodiumPairsScreen() {
  const [era, setEra] = useState('1950'); const [tab, setTab] = useState('podium');
  const P = useMemo(() => { try { return podiumPairs(Number(era)); } catch { return null; } }, [era]);
  const rows = P ? P[tab] : [];
  const unit = tab === 'podium' ? 'shared podiums' : tab === 'onetwo' ? '1-2 finishes' : 'front rows';
  return (
    <Screen header={false}>
      <Card><Eyebrow>Podium pairs</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}><Segmented value={tab} onChange={setTab} items={[['podium', 'Shared podiums'], ['onetwo', '1-2 finishes'], ['front', 'Front rows']]} /><Dropdown value={era} options={[['1950', 'All time'], ['2000', 'Since 2000'], ['2010', 'Since 2010']]} onChange={setEra} prefix="Era" /></View>
        <Note>Which two drivers appeared together most often. "As team-mates" says how many of those were for the same team. Front row is the first two grid slots. Offline history.</Note></Card>
      <ShareCard title={`Most ${unit}`}>
        <Card><Eyebrow>{`Most ${unit}`}</Eyebrow>
          {rows.map((x, i) => (<Line key={x.a + x.b} first={i === 0}><Text style={{ width: 24, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={2}>{`${x.a} and ${x.b}`}</Text>{x.mates ? <Text style={{ color: colors.muted, fontSize: 12 }}>{`${x.mates} as team-mates`}</Text> : null}</View><Text style={{ color: colors.gold, fontWeight: '900', fontSize: 16 }}>{x.n}</Text></Line>))}
        </Card>
      </ShareCard>
    </Screen>);
}

// ---------- Biggest comebacks ----------
export function ComebacksScreen() {
  const [tab, setTab] = useState('wins'); const [era, setEra] = useState('1950');
  const C = useMemo(() => { try { return comebacks(Number(era)); } catch { return null; } }, [era]);
  const rows = C ? C[tab] : [];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Biggest comebacks</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}><Segmented value={tab} onChange={setTab} items={[['wins', 'Wins'], ['podiums', 'Podiums']]} /><Dropdown value={era} options={[['1950', 'All time'], ['1990', 'Since 1990'], ['2010', 'Since 2010']]} onChange={setEra} prefix="Era" /></View>
        <Note>Ranked by the grid slot the driver started from. Starts from the pit lane are not counted, and a grid slot can come from penalties as well as qualifying. Offline history.</Note></Card>
      <ShareCard title={`Biggest comeback ${tab}`}>
        <Card>
          {rows.map((x, i) => (<Line key={`${x.year}${x.race}${x.name}`} first={i === 0}><Text style={{ width: 24, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{`${x.year} ${x.race} · ${x.team}`}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.gold, fontWeight: '900', fontSize: 16 }}>{`P${x.grid} to P${x.pos}`}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{`+${x.gain} places`}</Text></View></Line>))}
        </Card>
      </ShareCard>
    </Screen>);
}
