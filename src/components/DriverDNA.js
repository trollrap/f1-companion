import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { dnaOf } from '../api/history';
import { colors, alpha } from '../theme';

// Driver DNA: a six-axis fingerprint from every race in the offline history (qualifying, racecraft, consistency, pace, race pace, wet ability).
export default function DriverDNA({ driverId, color }) {
  const [info, setInfo] = React.useState(false);
  const dna = useMemo(() => { try { return dnaOf(driverId); } catch { return null; } }, [driverId]);
  if (!dna) return null;
  const S = 260, c = S / 2, R = 88, n = dna.axes.length; const pt = (i, v) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)]; };
  const ring = (f) => dna.axes.map((_, i) => pt(i, 100 * f).join(',')).join(' ');
  const shape = dna.axes.map(([, v], i) => pt(i, v).join(',')).join(' '); const col = color || colors.accent;
  const best = [...dna.axes].sort((a, b) => b[1] - a[1])[0];
  return (
    <Card>
      <Pressable onPress={() => setInfo(!info)} accessibilityRole="button" accessibilityLabel="What do these scores mean?" hitSlop={10} style={{ position: 'absolute', right: 14, top: 14, zIndex: 2 }}><Ionicons name={info ? 'close-circle' : 'information-circle-outline'} size={22} color={colors.muted} /></Pressable>
      <Eyebrow>Driver DNA</Eyebrow>
      {info ? (
        <View style={{ marginTop: 8, gap: 5 }}>
          {[['Qualifying', 'Average starting position over their career: closer to pole is higher.'], ['Racecraft', 'Average places gained between the grid and the flag (finished races only).'], ['Consistency', 'How little their finishing positions swing from race to race.'], ['Pace', 'How often they score points when they start a race.'], ['Race pace', 'Average finishing position in classified races.'], ['Wet ability', 'Places gained in a list of well-known rain-affected races. The history has no weather data, so this is an estimate, pulled toward 50 when there are few wet races.']].map(([k, v]) => <Text key={k} style={{ color: colors.muted, fontSize: 12 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 12 }}>{k}: </Text>{v}</Text>)}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>All scores are calculated in the app from the saved results of every race the driver started, scaled 0 to 100.</Text>
        </View>) : null}
      <View accessible accessibilityLabel={`Driver DNA: ${dna.axes.map(([k, v]) => `${k} ${v}`).join(', ')}`} style={{ alignItems: 'center', marginTop: 6 }}>
        <Svg width={S} height={S}>
          {[0.33, 0.66, 1].map((f) => <Polygon key={f} points={ring(f)} fill="none" stroke={colors.line} strokeWidth={1} />)}
          {dna.axes.map((_, i) => { const [x, y] = pt(i, 100); return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={colors.line} strokeWidth={1} />; })}
          <Polygon points={shape} fill={alpha(col, 0.35)} stroke={col} strokeWidth={2} />
          {dna.axes.map(([, v], i) => { const [x, y] = pt(i, v); return <Circle key={i} cx={x} cy={y} r={3.5} fill={col} />; })}
          {dna.axes.map(([k], i) => { const [x, y] = pt(i, 122); return <SvgText key={k} x={x} y={y + 4} fontSize={11} fill={colors.muted} textAnchor="middle">{k}</SvgText>; })}
        </Svg>
      </View>
      <Text style={{ color: colors.fg, fontSize: 14, textAlign: 'center' }}>{`Strongest trait: ${best[0]} (${best[1]}).`}</Text>
      <Note>{`From ${dna.races} races in the offline history. Scores are relative to a 0-100 scale, not to other drivers.`}</Note>
    </Card>);
}
