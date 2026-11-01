import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';
// A card with a soft gradient of one colour (usually a team colour). Uses the native gradient view, so it always fills the card
// (the old SVG version could stay at its first size when the card grew) and costs far less on long lists.
const DIR = { diag: [{ x: 0, y: 0 }, { x: 1, y: 1 }], h: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }], v: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }] };
export default function Grad({ color = colors.accent, from = 0.3, to = 0.03, dir = 'diag', radius = 18, border = 0.32, style, children }) {
  const [start, end] = DIR[dir] || DIR.diag;
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: alpha(color, border) }, style]}>
      <LinearGradient pointerEvents="none" colors={[alpha(color, from), alpha(color, to)]} start={start} end={end} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}
// A dark fade laid over a photo so text on top of it stays readable. dir: 'v' (top to bottom), 'vr' (bottom to top), 'h' (left to right), 'hr' (right to left).
const SDIR = { v: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], vr: [{ x: 0.5, y: 1 }, { x: 0.5, y: 0 }], h: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }], hr: [{ x: 1, y: 0.5 }, { x: 0, y: 0.5 }] };
export function Scrim({ dir = 'v', from = 0, to = 0.8, color = '10,5,6', style }) {
  const [start, end] = SDIR[dir] || SDIR.v;
  return <LinearGradient pointerEvents="none" colors={[`rgba(${color},${from})`, `rgba(${color},${to})`]} start={start} end={end} style={[StyleSheet.absoluteFill, style]} />;
}
