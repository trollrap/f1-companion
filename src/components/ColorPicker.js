import React, { useRef, useState } from 'react';
import { View, PanResponder, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { colors } from '../theme';

const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
export const hex2hsl = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return [352, 90, 52];
  const n = parseInt(m[1], 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
};
// A horizontal slider drawn over a gradient bar. value 0..1.
function Slider({ value, onChange, stops }) {
  const [w, setW] = useState(1); const live = useRef({}); live.current = { w, onChange };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => live.current.onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / live.current.w))),
    onPanResponderMove: (e) => live.current.onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / live.current.w))),
  })).current;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width || 1)} {...pan.panHandlers} style={{ height: 34, justifyContent: 'center' }}>
      <LinearGradient pointerEvents="none" colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 16, borderRadius: 8 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, Math.min(w - 26, value * w - 13)), top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(0,0,0,0.45)' }} />
    </View>
  );
}
// Hue, saturation and lightness sliders plus a hex field. onChange gets '#RRGGBB'.
export default function ColorPicker({ value, onChange }) {
  const [h, s, l] = hex2hsl(value); const [txt, setTxt] = useState(null);
  const set = (nh, ns, nl) => { setTxt(null); onChange(hsl2hex(nh, ns, nl)); };
  return (
    <View style={{ gap: 4 }}>
      <Slider value={h / 360} onChange={(v) => set(Math.round(v * 360), Math.max(s, 35), Math.min(Math.max(l, 30), 70))} stops={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} />
      <Slider value={s / 100} onChange={(v) => set(h, Math.round(v * 100), l)} stops={[hsl2hex(h, 0, l), hsl2hex(h, 100, l)]} />
      <Slider value={(l - 20) / 60} onChange={(v) => set(h, s, Math.round(20 + v * 60))} stops={[hsl2hex(h, s, 20), hsl2hex(h, s, 50), hsl2hex(h, s, 80)]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: value, borderWidth: 1, borderColor: colors.line }} />
        <TextInput value={txt ?? value} onChangeText={(x) => { setTxt(x); if (/^#?[0-9a-f]{6}$/i.test(x.trim())) onChange(('#' + x.trim().replace('#', '')).toUpperCase()); }} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#F0141E" placeholderTextColor={colors.muted}
          style={{ flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 12, color: colors.fg, fontSize: 17, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }} />
      </View>
    </View>
  );
}
