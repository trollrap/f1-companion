import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { localAllDrivers, localSeasons, localSeasonResults, localDriverInfo } from '../api/history';

const COLS = [colors.accent, colors.gold];
const METRICS = [['wins', 'Wins'], ['podiums', 'Podiums'], ['points', 'Points']];
// Cumulative wins, podiums or race points after each season of a career; x is the season number in the career (1 = debut year).
const curve = (id) => { const ys = (localSeasons(id) || []).slice().sort((a, b) => a - b); if (!ys.length) return null; let w = 0, p = 0, pt = 0;
  return { first: ys[0], pts: ys.map((y) => { (localSeasonResults(y, id) || []).forEach((r) => { if (r.positionText === '1') w++; if (['1', '2', '3'].includes(r.positionText)) p++; pt += Number(r.points) || 0; }); return { y, wins: w, podiums: p, points: pt }; }) }; };

function Pick({ i, id, onPick }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const all = useMemo(() => localAllDrivers(), []);
  const sugg = useMemo(() => { const n = norm(q); if (n.length < 2) return []; return all.filter((d) => norm(d.name).includes(n)).sort((a, b) => (b.last_year || 0) - (a.last_year || 0)).slice(0, 6); }, [q, all]);
  const info = id ? localDriverInfo(id) : null;
  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLS[i], backgroundColor: alpha(COLS[i], 0.12) }}>
        <Text style={{ color: colors.fg, fontWeight: '800' }} numberOfLines={1}>{info ? info.name : 'Pick a driver'}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tap to change</Text></Pressable>
      {open ? (<View style={{ marginTop: 6 }}>
        <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search a driver" placeholderTextColor={colors.muted} accessibilityLabel="Search a driver" style={{ color: colors.fg, fontSize: 16, padding: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} />
        {sugg.map((d) => (<Pressable key={d.driverId} accessibilityRole="button" onPress={() => { onPick(d.driverId); setOpen(false); setQ(''); }} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '600' }}>{d.name}</Text></Pressable>))}
      </View>) : null}
    </View>);
}

export default function CareerCurvesScreen() {
  const [ids, setIds] = useState(() => { const have = (x) => { try { return !!localDriverInfo(x); } catch { return false; } }; return [have('hamilton') ? 'hamilton' : null, have('max_verstappen') ? 'max_verstappen' : null]; });
  const [m, setM] = useState('wins'); const [w, setW] = useState(0);
  const cs = useMemo(() => ids.map((id) => (id ? curve(id) : null)), [ids]);
  const n = Math.max(0, ...cs.map((c) => (c ? c.pts.length : 0))); const top = Math.max(1, ...cs.flatMap((c) => (c ? c.pts.map((p) => p[m]) : [])));
  const H = 220, L = 38, R = 12, T = 12, B = 24; const iw = Math.max(1, w - L - R);
  const x = (k) => L + (n > 1 ? (k / (n - 1)) * iw : iw / 2), y = (v) => T + (1 - v / top) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  return (
    <Screen header={false}>
      <Card><Eyebrow>Career curves</Eyebrow><Note>Two careers on one chart: running total after each season, counted from each driver's debut year. Race results only, so sprint points are not included.</Note></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>{[0, 1].map((i) => <Pick key={i} i={i} id={ids[i]} onPick={(id) => setIds((a) => a.map((x, k) => (k === i ? id : x)))} />)}</View>
      <Segmented value={m} items={METRICS} onChange={setM} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && n > 0 ? (
          <Svg width={w} height={H}>
            {ticks.map((v) => (<React.Fragment key={v}><Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} /><SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{v}</SvgText></React.Fragment>))}
            {Array.from({ length: n }).map((_, k) => ((k % Math.ceil(n / 8) === 0 || k === n - 1) ? <SvgText key={k} x={x(k)} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{String(k + 1)}</SvgText> : null))}
            {cs.map((c, i) => c ? (<React.Fragment key={i}><Polyline points={c.pts.map((p, k) => `${x(k).toFixed(1)},${y(p[m]).toFixed(1)}`).join(' ')} fill="none" stroke={COLS[i]} strokeWidth={2.6} strokeLinejoin="round" /><Circle cx={x(c.pts.length - 1)} cy={y(c.pts[c.pts.length - 1][m])} r={4} fill={COLS[i]} /></React.Fragment>) : null)}
          </Svg>) : null}
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>Season of career</Text>
      {cs.map((c, i) => c ? (<Card key={i}><Text style={{ color: COLS[i], fontWeight: '800' }}>{localDriverInfo(ids[i])?.name}</Text><Text style={{ color: colors.fg, marginTop: 4 }}>{`${c.pts.length} seasons from ${c.first}: ${c.pts[c.pts.length - 1].wins} wins, ${c.pts[c.pts.length - 1].podiums} podiums, ${Math.round(c.pts[c.pts.length - 1].points)} race points`}</Text></Card>) : null)}
    </Screen>);
}
