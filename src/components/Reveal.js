import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { ui } from '../lib/motion';
// Fade, rise and a touch of scale on first mount, staggered by index. Short on purpose: it should be felt, not seen.
export default function Reveal({ index = 0, children, dx = 0 }) {
  const v = useRef(new Animated.Value(ui.reduceMotion ? 1 : 0)).current;
  useEffect(() => { if (!ui.reduceMotion) Animated.timing(v, { toValue: 1, duration: 380, delay: Math.min(index, 7) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dx ? 0 : 16, 0] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>{children}</Animated.View>;
}
