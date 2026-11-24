import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import Press from '../components/Press';
import { StatHeader, SectionLabel } from '../components/StatRows';
import { useAsync } from '../hooks/useAsync';
import { jolpicaSchedule, raceLaps } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha, teamColor } from '../theme';

// Animated lap chart: every car's running order from the grid to the flag. Needs a connection the first time a race is opened; opened races are kept on the phone.
const YEARS = Array.from({ length: YEAR - 2011 }, (_, i) => YEAR - i);
export default function LapChartScreen() {
  const { width } = useWindowDimensions(); const rp = useRoute().params || {}; const [year, setYear] = useState(rp.year || YEAR); const [round, setRound] = useState(rp.round || null);
  const sch = useAsync(() => jolpicaSchedule(year), [year]);
  const done = useMemo(() => (sch.v || []).filter((r) => new Date(`${r.date}T23:59:59Z`) < new Date()), [sch.v]);
  useEffect(() => { if (done.length) setRound((r) => (r && done.some((x) => x.round === r) ? r : done[done.length - 1].round)); }, [done]);
  const q = useAsync(() => (round ? raceLaps(year, round) : Promise.resolve(null)), [year, round]);
  const [lap, setLap] = useState(0); const [play, setPlay] = useState(false); const [pick, setPick] = useState(null); const timer = useRef(null);
  const data = q.v; const N = data ? data.laps : 0;
  useEffect(() => { setLap(0); setPlay(false); setPick(null); }, [year, round]);
  useEffect(() => { // playback: one lap every 220 ms
    if (!play || !N) return undefined;
    timer.current = setInterval(() => setLap((l) => { if (l >= N) { setPlay(false); return l; } return l + 1; }), 220);
    return () => clearInterval(timer.current);
  }, [play, N]);
  const cars = data ? data.cars.filter((c) => c.pos.some((p) => p != null)) : [];
  const M = Math.max(cars.length, 2); const w = width - 32 - 24; const h = 340; const L = 26, R = 34, T = 12, B = 18;
  const X = (k) => L + ((w - L - R) * k) / Math.max(N, 1); const Y = (p) => T + ((h - T - B) * (p - 1)) / (M - 1);
  const order = (k) => (k === 0 ? [...cars].sort((a, b) => a.grid - b.grid) : [...cars].filter((c) => c.pos[k - 1] != null).sort((a, b) => a.pos[k - 1] - b.pos[k - 1]));
  const now = data ? order(lap) : [];
  const race = done.find((r) => r.round === round);
  return (
    <Screen header={false}>
      <StatHeader title="Lap chart" icon="pulse" color={colors.accentText} note="Watch a race unfold: every car's position from the grid to the flag. Press play or drag the lap buttons. Tap a driver to follow them." />
      <Card style={{ gap: 10 }}>
        <Dropdown value={year} options={YEARS.map((y) => [y, String(y)])} onChange={(v) => { setYear(Number(v)); setRound(null); }} prefix="Season" />
        {done.length ? <Dropdown value={round || done[done.length - 1].round} options={done.map((r) => [r.round, `R${r.round} · ${r.raceName.replace(' Grand Prix', '')}`])} onChange={(v) => setRound(Number(v))} prefix="Race" /> : null}
      </Card>
      {sch.loading || q.loading ? <Skeleton rows={6} /> : null}
      {sch.error ? <ErrorNote error={sch.error} onRetry={sch.reload} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {!q.loading && !q.error && round && !data ? <Note>No lap by lap timing is available for this race.</Note> : null}
      {data ? (<>
        <View style={{ padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <Svg width={w} height={h}>
            {Array.from({ length: M }, (_, i) => (<React.Fragment key={i}><Line x1={L} x2={w - R} y1={Y(i + 1)} y2={Y(i + 1)} stroke={alpha(colors.fg, 0.07)} strokeWidth={1} /><SvgText x={L - 6} y={Y(i + 1) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{i + 1}</SvgText></React.Fragment>))}
            {cars.map((c) => {
              const pts = [[0, c.grid]]; for (let k = 1; k <= lap; k++) if (c.pos[k - 1] != null) pts.push([k, c.pos[k - 1]]);
              const col = teamColor(c.teamId); const on = pick === c.id; const dim = pick && !on; const last = pts[pts.length - 1];
              return (<React.Fragment key={c.id}>
                <Polyline points={pts.map(([k, p]) => `${X(k)},${Y(p)}`).join(' ')} fill="none" stroke={col} strokeWidth={on ? 3.5 : 1.8} opacity={dim ? 0.15 : 0.95} strokeLinejoin="round" />
                <Circle cx={X(last[0])} cy={Y(last[1])} r={on ? 5 : 3.5} fill={col} opacity={dim ? 0.25 : 1} />
                {lap > 0 && c.pos[lap - 1] != null ? <SvgText x={X(lap) + 8} y={Y(last[1]) + 3.5} fontSize={9} fontWeight="700" fill={dim ? alpha(colors.fg, 0.3) : colors.fg}>{c.code}</SvgText> : null}
              </React.Fragment>);
            })}
          </Svg>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <Press accessibilityLabel={play ? 'Pause' : 'Play'} onPress={() => { if (lap >= N) setLap(0); setPlay((p) => !p); }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={play ? 'pause' : 'play'} size={22} color="#fff" /></View></Press>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{lap === 0 ? 'Lights out · the grid' : `Lap ${lap} of ${N}`}</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(colors.fg, 0.1), marginTop: 6, overflow: 'hidden' }}><View style={{ width: `${(lap / N) * 100}%`, height: 6, backgroundColor: colors.accent }} /></View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {[['«', () => setLap((l) => Math.max(0, l - 5))], ['‹', () => setLap((l) => Math.max(0, l - 1))], ['›', () => setLap((l) => Math.min(N, l + 1))], ['»', () => setLap((l) => Math.min(N, l + 5))], ['Grid', () => setLap(0)], ['Flag', () => setLap(N)]].map(([t, f]) => (
              <Pressable key={t} accessibilityRole="button" accessibilityLabel={t} onPress={() => { setPlay(false); f(); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: alpha(colors.fg, 0.08) }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{t}</Text></Pressable>))}
          </View>
        </View>
        <SectionLabel>{lap === 0 ? 'Starting grid' : `Order after lap ${lap}`}</SectionLabel>
        <View style={{ gap: 6 }}>{now.map((c, i) => { const d = c.grid - (i + 1); const on = pick === c.id;
          return (<Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}, position ${i + 1}`} onPress={() => setPick(on ? null : c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: on ? alpha(teamColor(c.teamId), 0.22) : colors.card, borderWidth: 1, borderColor: on ? teamColor(c.teamId) : colors.line }}>
            <Text style={{ width: 26, color: colors.fg, fontWeight: '800' }}>{i + 1}</Text>
            <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: teamColor(c.teamId) }} />
            <Text style={{ flex: 1, color: colors.fg, fontWeight: '700' }} numberOfLines={1}>{c.name}</Text>
            {lap > 0 ? <Text style={{ color: d > 0 ? colors.good : d < 0 ? colors.accentText : colors.muted, fontWeight: '800', fontSize: 13 }}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '–'}</Text> : <Text style={{ color: colors.muted, fontSize: 12 }}>{`P${i + 1}`}</Text>}
          </Pressable>); })}</View>
        {race ? <Note>{`${race.raceName} ${year}. Positions come from the official lap timing. A car disappears from the chart when it retires.`}</Note> : null}
      </>) : null}
    </Screen>);
}
