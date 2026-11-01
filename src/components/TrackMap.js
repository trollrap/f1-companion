import React, { useMemo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';
// A track outline from x/y samples, scaled to fit width x height.
export default function TrackMap({ pts, width = 120, height = 80, color = colors.accent, stroke = 2.6, glow = true, opacity = 1, fade = false }) {
  const d = useMemo(() => {
    if (!pts || pts.length < 20) return null;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 6;
    const sc = Math.min((width - 2 * pad) / (x1 - x0 || 1), (height - 2 * pad) / (y1 - y0 || 1)), ox = (width - (x1 - x0) * sc) / 2, oy = (height - (y1 - y0) * sc) / 2;
    return pts.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'}${((p[0] - x0) * sc + ox).toFixed(1)} ${(height - ((p[1] - y0) * sc + oy)).toFixed(1)}`).join(' ') + 'Z';
  }, [pts, width, height]);
  if (!d) return null;
  return (
    <Svg width={width} height={height} opacity={opacity}>
      {fade ? <Defs><LinearGradient id="tmf" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={color} stopOpacity="0" /><Stop offset="0.7" stopColor={color} stopOpacity="1" /></LinearGradient></Defs> : null}
      {glow && !fade ? <Path d={d} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke * 3} fill="none" strokeLinejoin="round" /> : null}
      <Path d={d} stroke={fade ? 'url(#tmf)' : color} strokeWidth={stroke} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
