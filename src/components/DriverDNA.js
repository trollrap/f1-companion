import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { dnaOf } from '../api/history';
import { colors, alpha } from '../theme';

// Driver DNA: a six-axis fingerprint from every race in the offline history (qualifying, racecraft, consistency, reliability, podiums, fastest laps).
export default function DriverDNA({ driverId, color }) {
  const dna = useMemo(() => { try { return dnaOf(driverId); } catch { return null; } }, [driverId]);
  if (!dna) return null;
  const S = 260, c = S / 2, R = 88, n = dna.axes.length; const pt = (i, v) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)]; };
  const ring = (f) => dna.axes.map((_, i) => pt(i, 100 * f).join(',')).join(' ');
  const shape = dna.axes.map(([, v], i) => pt(i, v).join(',')).join(' '); const col = color || colors.accent;
  const best = [...dna.axes].sort((a, b) => b[1] - a[1])[0];
  return (
    <Card>
      <Eyebrow>Driver DNA</Eyebrow>
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
