import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Text } from './Text';

// A number that counts up to its value when it first appears (whole numbers only; anything else is shown as is).
export default function CountUp({ value, style, duration = 700 }) {
  const n = Number(value); const ok = Number.isFinite(n) && Math.abs(n) < 1e7 && String(value).trim() !== '' && Number.isInteger(n);
  const v = useRef(new Animated.Value(0)).current; const [shown, setShown] = useState(ok ? 0 : value);
  useEffect(() => {
    if (!ok) { setShown(value); return undefined; }
    const id = v.addListener(({ value: x }) => setShown(Math.round(x)));
    Animated.timing(v, { toValue: n, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Text style={style}>{String(shown)}</Text>;
}
