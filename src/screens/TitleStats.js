import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import { gridSlotOdds, lineupStrength, titleHistory } from '../api/history';

const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const Bar = ({ v, tint }) => (<View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', flex: 1 }}><View style={{ width: `${Math.max(1, Math.min(100, v * 100))}%`, height: 6, backgroundColor: tint }} /></View>);
const Missing = () => <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;

export function GridOddsScreen() {
  const d = useMemo(() => { try { return gridSlotOdds(); } catch { return null; } }, []);
  const [k, setK] = useState(0); const [m, setM] = useState('wins');
  if (!d) return <Missing />;
  const era = d[k]; const slots = era.slots.slice(0, 20);
  const val = (s) => (m === 'wins' ? s.wins : s.podiums) / s.n;
  const top = Math.max(0.01, ...slots.map(val));
  return (
    <Screen header={false}>
      <StatHeader title="Win odds by grid slot" icon="trophy" note="How often a start position turned into a win or a podium. Counted from every race in the built-in history. Slots with fewer than 30 starts are hidden." />
      <Segmented value={String(k)} items={d.map((e, i) => [String(i), e.label.replace(' to ', '-')])} onChange={(v) => setK(Number(v))} />
      <Segmented value={m} items={[['wins', 'Win'], ['pod', 'Podium']]} onChange={setM} />
      {slots.map((s, i) => (
        <Reveal key={`${k}${s.slot}`} index={Math.min(i, 8)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
            <Text style={{ color: colors.muted, width: 34, fontSize: 14, fontWeight: '700' }}>{`P${s.slot}`}</Text>
            <Bar v={val(s) / top} tint={s.slot === 1 ? colors.gold : colors.accent} />
            <Text style={{ color: colors.fg, width: 52, textAlign: 'right', fontSize: 16, fontWeight: '800' }}>{pct(val(s), val(s) < 0.1 ? 1 : 0)}</Text>
          </View>
        </Reveal>))}
      <Note>{`Based on ${slots[0] ? slots[0].n : 0} races. ${slots[0] ? `Pole won ${slots[0].wins}.` : ''}`}</Note>
    </Screen>);
}

function Pair({ o, i, mode }) {
  return (
    <Reveal index={Math.min(i, 8)}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>{`${i + 1}. ${o.year} ${o.team}`}</Text>
          <Text style={{ color: colors.fg, fontSize: 21, fontWeight: '800' }}>{mode === 'gap' ? `${o.pa - o.pb} pts` : mode === 'close' ? `${Math.abs(o.pa - o.pb)} pts` : pct(o.share, 1)}</Text>
        </View>
        <Text style={{ color: colors.fg, fontSize: 14, marginTop: 4 }}>{`${o.a} ${o.pa}  ·  ${o.b} ${o.pb}`}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{`Together ${o.comb} points, ${pct(o.share, 1)} of everything scored that year`}</Text>
      </Card>
    </Reveal>);
}
export function LineupScreen() {
  const d = useMemo(() => { try { return lineupStrength(); } catch { return null; } }, []);
  const [t, setT] = useState('strongest');
  if (!d) return <Missing />;
  const notes = { strongest: 'The two best scorers of a team, as a share of all points scored that season. A share makes different points systems comparable.', matched: 'Team-mates who finished closest on points. Teams with at least 8% of the season total.', lopsided: 'One driver scored far more than the other. Teams with at least 5% of the season total.', weakest: 'Smallest share of the season for a team\'s top two. Includes tiny teams in big grids.' };
  return (
    <Screen header={false}>
      <StatHeader title="Line-up strength" icon="trophy" note="Each team's two top scorers of a season. Race points only. Sprint points and any dropped scores are not in these totals, so very old seasons may differ a little from the official tables." />
      <Segmented value={t} items={[['strongest', 'Strongest'], ['matched', 'Closest'], ['lopsided', 'Lopsided'], ['weakest', 'Weakest']]} onChange={setT} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{notes[t]}</Text>
      {d[t].map((o, i) => <Pair key={`${t}${o.year}${o.team}`} o={o} i={i} mode={t === 'lopsided' ? 'gap' : t === 'matched' ? 'close' : 'share'} />)}
    </Screen>);
}

function Title({ o, i, extra }) {
  return (
    <Reveal index={Math.min(i, 8)}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>{`${o.year} ${o.name}`}</Text>
          <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '800' }}>{extra}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{`${o.team} · ${o.pts} pts, ${o.margin === 0 ? 'level' : `${o.margin} ahead of ${o.second}`} · ${o.wins} win${o.wins === 1 ? '' : 's'} in ${o.rounds}`}</Text>
        {o.clinch ? <Text style={{ color: colors.fg, fontSize: 13, marginTop: 2 }}>{o.clinch.round === o.clinch.of ? `Won at the last round, ${o.clinch.name}` : `Clinched at round ${o.clinch.round} of ${o.clinch.of}, ${o.clinch.name}`}</Text> : null}
      </Card>
    </Reveal>);
}
export function TitleHistoryScreen() {
  const d = useMemo(() => { try { return titleHistory(); } catch { return null; } }, []);
  const [t, setT] = useState('rows');
  if (!d) return <Missing />;
  const lists = { rows: [d.rows, (o) => `+${o.margin}`], closest: [d.closest, (o) => `+${o.margin}`], biggest: [d.biggest, (o) => `+${o.margin}`], early: [d.early, (o) => `${o.clinch.of - o.clinch.round} left`], fewWins: [d.fewWins, (o) => `${o.wins} win${o.wins === 1 ? '' : 's'}`] };
  const [rows, big] = lists[t];
  const notes = { rows: 'Every drivers\' title, newest first. Clinch rounds are worked out only for 1991 to 2020 (a fixed scoring system, no sprints). Other years show the margin only.', closest: 'Smallest final margin as a share of the champion\'s points. Points systems differ, so the share is what compares.', biggest: 'Biggest final margin as a share of the champion\'s points.', early: '1991 to 2020: titles decided with the most races still to run. Maths assumes the best case for the chaser every round.', fewWins: 'Champions with the fewest wins in the year (seasons of 8 or more rounds).' };
  return (
    <Screen header={false}>
      <StatHeader title="Title history" icon="trophy" note={`How ${d.rows.length} championships were decided. ${d.lastRace.length} of the 1991 to 2020 titles went to the final round.`} />
      <Segmented value={t} items={[['rows', 'All'], ['closest', 'Closest'], ['biggest', 'Biggest'], ['early', 'Early'], ['fewWins', 'Few wins']]} onChange={setT} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{notes[t]}</Text>
      {rows.map((o, i) => <Title key={`${t}${o.year}`} o={o} i={i} extra={big(o)} />)}
    </Screen>);
}
