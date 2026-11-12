import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { seasonFacts, seasonStory, debutsOf, historyYears } from '../api/history';
import { CIRCUITS } from '../data/circuits';
import { colors, alpha } from '../theme';

const yrs = () => { try { return historyYears(); } catch { return []; } };
const Line = ({ children, first }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>{children}</View>;
const Stat = ({ k, v, s }) => (<View style={{ flex: 1, minWidth: '45%', paddingVertical: 6 }}><Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>{k}</Text><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>{v}</Text>{s ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{s}</Text> : null}</View>);

// ---------- Season review ----------
export function SeasonReviewScreen() {
  const years = useMemo(yrs, []); const [year, setYear] = useState(years[0] || 2025);
  const F = useMemo(() => seasonFacts(year), [year]); const S = useMemo(() => seasonStory(year), [year]);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Season review</Eyebrow><View style={{ marginTop: 10 }}><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" /></View>
        <Note>Built from the offline race history. The season in progress appears after the next history update.</Note></Card>
      {F && S ? (<>
        <ShareCard title={`${year} F1 season: ${S.champion} champion`}>
          <Card><Eyebrow>{`${year} in review`}</Eyebrow>
            <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900', marginTop: 6 }}>{S.champion}</Text>
            <Text style={{ color: colors.muted }}>{`World champion · ${F.champPts} points${F.secondPts != null ? `, ${F.champPts - F.secondPts} clear of second` : ''}`}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              <Stat k="RACES" v={F.races} s={`${F.winners} different winners`} />
              <Stat k="MOST WINS" v={F.mostWins ? `${F.mostWins.name} (${F.mostWins.n})` : '-'} />
              <Stat k="TOP TEAM" v={F.mostTeamWins ? `${F.mostTeamWins.name} (${F.mostTeamWins.n} wins)` : '-'} />
              <Stat k="MOST POLES" v={F.mostPoles ? `${F.mostPoles.name} (${F.mostPoles.n})` : '-'} />
              <Stat k="MOST PODIUMS" v={S.mostPodiums ? `${S.mostPodiums.name} (${S.mostPodiums.n})` : '-'} />
              <Stat k="FINISH RATE" v={`${Math.round(F.finishRate * 100)}%`} s={`${F.avgCars.toFixed(0)} cars per race`} />
            </View></Card>
        </ShareCard>
        <Card><Eyebrow>The title fight</Eyebrow>
          <Text style={{ color: colors.fg, fontSize: 15, marginTop: 6, lineHeight: 22 }}>{S.leadChanges === 0 ? `${S.champion} led the championship from the first race to the last.` : `The championship lead changed hands ${S.leadChanges} time${S.leadChanges === 1 ? '' : 's'} between ${S.leadersSeen.length} drivers (${S.leadersSeen.join(', ')}). ${S.champion} took the lead for good in round ${S.leaderForGoodAfter}.`}</Text>
          {S.comeback ? <Text style={{ color: colors.fg, fontSize: 15, marginTop: 10, lineHeight: 22 }}>{`Best comeback win: ${S.comeback.winner} won the ${S.comeback.name} from P${S.comeback.grid}.`}</Text> : null}</Card>
        <Card><Eyebrow>Every winner</Eyebrow>
          {S.winners.map((w, i) => (<Line key={w.round} first={i === 0}><Text style={{ width: 28, color: colors.muted, fontWeight: '800' }}>{`R${w.round}`}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{w.winner}</Text><Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{`${w.name} · ${w.team}`}</Text></View>{w.grid > 0 ? <Text style={{ color: colors.muted, fontSize: 12 }}>{`from P${w.grid}`}</Text> : null}</Line>))}</Card>
      </>) : <Note>No data for this season.</Note>}
    </Screen>);
}

// ---------- Debuts and farewells ----------
export function DebutsScreen() {
  const years = useMemo(yrs, []); const [year, setYear] = useState(years[0] || 2025); const [tab, setTab] = useState('debut');
  const D = useMemo(() => { try { return debutsOf(year); } catch { return null; } }, [year]);
  const list = D ? (tab === 'debut' ? D.debuts : D.farewells) : [];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Debuts and farewells</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}><Segmented value={tab} onChange={setTab} items={[['debut', 'Debuts'], ['far', 'Farewells']]} /><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" /></View>
        <Note>A debut is a driver's first season in the history, a farewell their last. Drivers still racing in the newest season are not listed as farewells. Early seasons include one-off entries such as drivers from the Indianapolis 500.</Note></Card>
      {D && tab === 'far' && year >= D.upTo ? <Note>The newest season has no farewells yet: nobody can be called finished until a later season is added.</Note> : null}
      {list.length ? (
        <Card><Eyebrow>{`${tab === 'debut' ? 'Debuts' : 'Farewells'} in ${year} · ${list.length}`}</Eyebrow>
          {list.map((x, i) => (<Line key={x.id + x.round} first={i === 0}><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{tab === 'debut' ? `${x.nat || ''} · ${x.team} · ${x.race}: started P${x.grid > 0 ? x.grid : 'pit lane'}, ${x.dnf ? 'did not finish' : `finished P${x.pos}`}` : `${x.nat || ''} · ${x.team} · last race ${x.race} · ${x.starts} starts, ${x.wins} win${x.wins === 1 ? '' : 's'}`}</Text></View></Line>))}</Card>
      ) : (D && !(tab === 'far' && year >= D.upTo) ? <Note>None found for this season.</Note> : null)}
    </Screen>);
}

// ---------- Circuit comparison ----------
const num = (v) => { const m = String(v || '').match(/[\d.]+/); return m ? Number(m[0]) : null; };
const statOf = (c, k) => (c.stats.find((s) => s[0] === k) || [])[1] || '-';
export function CircuitCompareScreen() {
  const opts = useMemo(() => CIRCUITS.map((c) => [c.key, c.name]), []);
  const [a, setA] = useState(CIRCUITS[0].key); const [b, setB] = useState((CIRCUITS[1] || CIRCUITS[0]).key);
  const A = CIRCUITS.find((c) => c.key === a), B = CIRCUITS.find((c) => c.key === b);
  const rows = [['Lap length', 'Lap length'], ['Turns', 'Turns'], ['Race laps', 'Race laps'], ['Race distance', 'Race distance'], ['First Grand Prix', 'First Grand Prix']];
  const bar = (k, x, y) => { const nx = num(x), ny = num(y); if (nx == null || ny == null || k === 'First Grand Prix') return null; const m = Math.max(nx, ny) || 1; return (<View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}><View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: alpha(colors.fg, 0.1), overflow: 'hidden', alignItems: 'flex-end' }}><View style={{ width: `${(nx / m) * 100}%`, height: 5, backgroundColor: colors.accent }} /></View><View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: alpha(colors.fg, 0.1), overflow: 'hidden' }}><View style={{ width: `${(ny / m) * 100}%`, height: 5, backgroundColor: colors.gold }} /></View></View>); };
  const rec = (c) => (c.lapRecord ? `${c.lapRecord.time}, ${c.lapRecord.driver} (${c.lapRecord.year})` : '-');
  return (
    <Screen header={false}>
      <Card><Eyebrow>Circuit comparison</Eyebrow>
        <View style={{ marginTop: 10, gap: 8 }}><Dropdown value={a} options={opts} onChange={setA} prefix="Circuit" /><Dropdown value={b} options={opts} onChange={setB} prefix="Versus" /></View></Card>
      {A && B ? (
        <ShareCard title={`${A.name} vs ${B.name}`}>
          <Card>
            <View style={{ flexDirection: 'row', paddingBottom: 4 }}><View style={{ flex: 1 }}><Text style={{ color: colors.accent, fontWeight: '900', fontSize: 16 }} numberOfLines={2}>{A.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{A.place}</Text></View><View style={{ width: 10 }} /><View style={{ flex: 1 }}><Text style={{ color: colors.gold, fontWeight: '900', fontSize: 16 }} numberOfLines={2}>{B.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{B.place}</Text></View></View>
            {rows.map(([k, label]) => { const x = statOf(A, k), y = statOf(B, k); return (
              <View key={k} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{label.toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', marginTop: 2 }}><Text style={{ flex: 1, color: colors.fg, fontWeight: '800' }}>{x}</Text><View style={{ width: 10 }} /><Text style={{ flex: 1, color: colors.fg, fontWeight: '800' }}>{y}</Text></View>{bar(k, x, y)}</View>); })}
            <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>LAP RECORD</Text>
              <View style={{ flexDirection: 'row', marginTop: 2 }}><Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 13 }}>{rec(A)}</Text><View style={{ width: 10 }} /><Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 13 }}>{rec(B)}</Text></View></View>
          </Card>
        </ShareCard>) : null}
      <Note>Lap length, turns, distance and lap records are the figures shown on each circuit's own page. Bars compare the two numbers.</Note>
    </Screen>);
}
