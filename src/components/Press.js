import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { ui } from '../lib/motion';
// Pressable that springs in on touch and back out on release. Used for every tappable card so the whole app feels the same.
export default function Press({ onPress, style, children, scale = 0.975, disabled, ...rest }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x) => { if (!ui.reduceMotion) Animated.spring(v, { toValue: x, speed: 40, bounciness: x === 1 ? 7 : 0, useNativeDriver: true }).start(); };
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(scale)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[{ transform: [{ scale: v }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
