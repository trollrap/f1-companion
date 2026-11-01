import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors } from '../theme';
export default function Skeleton({ rows = 3 }) {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 0.8, duration: 700, useNativeDriver: true }), Animated.timing(a, { toValue: 0.35, duration: 700, useNativeDriver: true })])); l.start(); return () => l.stop(); }, []);
  return (
    <Animated.View style={{ opacity: a, gap: 10, paddingVertical: 12 }} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => <View key={i} style={{ height: 18, borderRadius: 6, backgroundColor: colors.surface2, width: i === rows - 1 ? '55%' : '100%' }} />)}
    </Animated.View>
  );
}
