import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from './Text';
import { ui } from '../lib/motion';
import { colors } from '../theme';

// A number that counts up to its value when it first appears (or when it changes).
export function CountUp({ value, duration = 900, delay = 0, decimals = 0, style, suffix = '' }) {
  const v = useRef(new Animated.Value(ui.reduceMotion ? Number(value) || 0 : 0)).current; const [n, setN] = useState(ui.reduceMotion ? Number(value) || 0 : 0);
  useEffect(() => {
    const id = v.addListener(({ value: x }) => setN(x));
    if (ui.reduceMotion) v.setValue(Number(value) || 0); else Animated.timing(v, { toValue: Number(value) || 0, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value]);
  return <Text style={style}>{`${decimals ? n.toFixed(decimals) : Math.round(n)}${suffix}`}</Text>;
}
// A horizontal bar that grows to `pct` (0-100).
export function Bar({ pct = 0, color = colors.accent, height = 8, delay = 0, bg = 'rgba(255,255,255,0.08)', right }) {
  const v = useRef(new Animated.Value(ui.reduceMotion ? 1 : 0)).current;
  useEffect(() => { if (ui.reduceMotion) { v.setValue(1); return; } v.setValue(0); Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [pct]);
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: bg, overflow: 'hidden', alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${p}%`] }) }} />
    </View>
  );
}
// Springs in from slightly small: for results, badges and answers.
export function Pop({ children, delay = 0, style, trigger }) {
  const v = useRef(new Animated.Value(ui.reduceMotion ? 1 : 0)).current;
  useEffect(() => { if (ui.reduceMotion) return; v.setValue(0); Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 90, useNativeDriver: true }).start(); }, [trigger]);
  return <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }]}>{children}</Animated.View>;
}
