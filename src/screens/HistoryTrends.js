import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { journeymen, gridAge, calendarGrowth } from '../api/history';

const Missing = () => <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
// One line over the years. `pts` = [{ y, v }].
function Line1({ pts, unit = '', tint = colors.accent, decimals = 0 }) {
  const [w, setW] = useState(0); const H = 200, L = 40, R = 12, T = 12, B = 24; const iw = Math.max(1, w - L - R);
  const lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)); const min = Math.floor(lo * 0.9), max = Math.ceil(hi) || 1; const y0 = pts[0].y, y1 = pts[pts.length - 1].y;
  const x = (yr) => L + ((yr - y0) / Math.max(1, y1 - y0)) * iw, y = (v) => T + (1 - (v - min) / Math.max(1e-9, max - min)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => min + (max - min) * f);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          {ticks.map((v) => (<React.Fragment key={v}><Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} /><SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{`${v.toFixed(decimals)}${unit}`}</SvgText></React.Fragment>))}
          {[y0, Math.round((y0 + y1) / 2), y1].map((yr) => <SvgText key={yr} x={x(yr)} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{String(yr)}</SvgText>)}
          <Polyline points={pts.map((p) => `${x(p.y).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={tint} strokeWidth={2.4} strokeLinejoin="round" />
          <Circle cx={x(y1)} cy={y(pts[pts.length - 1].v)} r={4} fill={tint} />
        </Svg>) : null}
    </View>);
}

export function JourneymenScreen() {
  const d = useMemo(() => { try { return journeymen(); } catch { return null; } }, []);
  if (!d) return <Missing />;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Journeymen</Eyebrow><Note>Drivers with 20 or more starts, ranked by how many different teams they raced for. A team that was renamed counts as one team when the history keeps the same id, and as two when it does not.</Note></Card>
      {d.map((o, i) => (
        <Reveal key={o.name} index={Math.min(i, 8)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>{`${i + 1}. ${o.name}`}</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{o.teams}</Text></View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{`${o.starts} starts · ${o.trail.join(' > ')}`}</Text>
          </Card>
        </Reveal>))}
    </Screen>);
}

export function GridAgeScreen() {
  const d = useMemo(() => { try { return gridAge(); } catch { return null; } }, []);
  if (!d || !d.length) return <Missing />;
  const last = d[d.length - 1]; const first = d[0]; const decades = d.filter((r) => r.year % 10 === 0 || r === last);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Grid age over time</Eyebrow><Note>Average age of the drivers on the grid, measured at every race and averaged over every start. Drivers with no birth date in the history are left out.</Note></Card>
      <Card><Eyebrow>Average age by season</Eyebrow><Line1 pts={d.map((r) => ({ y: r.year, v: r.avg }))} unit="" decimals={0} /><Note>{`${first.year}: ${first.avg.toFixed(1)} years. ${last.year}: ${last.avg.toFixed(1)} years.`}</Note></Card>
      {decades.map((r, i) => (
        <Reveal key={r.year} index={Math.min(i, 6)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '800' }}>{r.year}</Text><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '800' }}>{`${r.avg.toFixed(1)} years`}</Text></View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{`Oldest ${r.old.name} ${r.old.age.toFixed(0)} · youngest ${r.young.name} ${r.young.age.toFixed(0)}`}</Text>
          </Card>
        </Reveal>))}
    </Screen>);
}

export function CalendarGrowthScreen() {
  const d = useMemo(() => { try { return calendarGrowth(); } catch { return null; } }, []);
  const [m, setM] = useState('races');
  if (!d || !d.length) return <Missing />;
  const big = [...d].sort((a, b) => b.races - a.races || b.year - a.year)[0]; const venues = d.filter((r) => r.fresh.length).slice(-12).reverse();
  return (
    <Screen header={false}>
      <Card><Eyebrow>Calendar growth</Eyebrow><Note>{`Races and countries per season. The busiest season so far had ${big.races} races (${big.year}). "New" lists Grand Prix names seen for the first time, so a renamed race counts as new.`}</Note></Card>
      <Segmented value={m} items={[['races', 'Races'], ['countries', 'Countries']]} onChange={setM} />
      <Card><Line1 pts={d.map((r) => ({ y: r.year, v: r[m] }))} tint={m === 'races' ? colors.accent : colors.gold} /></Card>
      <Eyebrow>Newest additions</Eyebrow>
      {venues.map((r, i) => (<Reveal key={r.year} index={Math.min(i, 6)}><Card><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{r.year}</Text><Text style={{ color: colors.muted }}>{`${r.races} races`}</Text></View><Text style={{ color: colors.fg, fontSize: 13, marginTop: 3 }}>{`New: ${r.fresh.join(', ')}`}</Text></Card></Reveal>))}
    </Screen>);
}
