import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, Easing, Platform } from 'react-native';
import { ui } from '../lib/motion';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors, alpha } from '../theme';

// One bottom bar for the whole app (main tabs and the fantasy tabs): filled icon when selected, small label right under it, compact and low on the
// screen. Tabs can be passed as [key, icon, label] for screens that manage their own tab state.
// The selected tab's icon pops a little when it becomes active (skipped when reduced motion is on).
function TabIcon({ name, on, color }) {
  const v = useRef(new Animated.Value(1)).current; const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (on && !ui.reduceMotion) { v.setValue(0.8); Animated.spring(v, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start(); } }, [on]);
  return <Animated.View style={{ transform: [{ scale: v }] }}><Ionicons name={name} size={22} color={color} /></Animated.View>;
}
export function BarView({ items, active, onPress, float }) {
  const insets = useSafeAreaInsets();
  const n = items.length; const idx = Math.max(0, items.findIndex(([k]) => k === active));
  const [w, setW] = React.useState(0); const pos = useRef(new Animated.Value(idx)).current; const [p, setP] = React.useState(idx); const first = useRef(true);
  useEffect(() => { const id = pos.addListener(({ value }) => setP(value)); return () => pos.removeListener(id); }, [pos]);
  useEffect(() => {
    if (first.current || ui.reduceMotion) { pos.setValue(idx); first.current = false; return; }
    Animated.timing(pos, { toValue: idx, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  // The selected item grows to show its label; the others shrink to just an icon. One highlight glides between them.
  const total = Math.max(0, w - 8), big = Math.min(total * 0.3, 124), small = n > 1 ? (total - big) / (n - 1) : total;
  const f = (i) => Math.max(0, 1 - Math.abs(p - i));
  const wi = items.map((_, i) => small + (big - small) * f(i));
  const left = (i) => wi.slice(0, i).reduce((a, c) => a + c, 0);
  const a0 = Math.max(0, Math.min(n - 1, Math.floor(p))), a1 = Math.min(n - 1, a0 + 1), fr = p - a0;
  const hl = { left: left(a0) + (left(a1) - left(a0)) * fr, width: wi[a0] + (wi[a1] - wi[a0]) * fr };
  return (
    <View pointerEvents="box-none" style={[{ backgroundColor: 'transparent', paddingHorizontal: 14, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 10) }, float && { position: 'absolute', left: 0, right: 0, bottom: 0 }]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: 4, height: 62, borderRadius: 31 }}>
        {[[-18, 22, 0.07], [-12, 16, 0.1], [-6, 11, 0.14], [0, 6, 0.24]].map(([sp, dy, o], i) => <View key={i} style={{ position: 'absolute', left: sp, right: sp, top: sp + dy, bottom: -sp - dy + 2 * (sp < 0 ? 0 : 0), borderRadius: 31 - sp, backgroundColor: `rgba(0,0,0,${o})` }} />)}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', height: 62, backgroundColor: colors.surface, borderRadius: 31, padding: 4, shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
        {total ? <View pointerEvents="none" style={{ position: 'absolute', top: 8, bottom: 8, left: 4 + hl.left, width: hl.width, borderRadius: 23, backgroundColor: alpha(colors.accent, 0.22) }} /> : null}
        {items.map(([k, ic, label], i) => { const on = active === k; const fi = f(i); const lw = Math.min(String(label).length * 9.2 + 4, big - 50); return (
          <Pressable key={k} onPress={() => onPress(k)} accessibilityRole="tab" accessibilityLabel={String(label)} accessibilityState={{ selected: on }} hitSlop={{ top: 6, bottom: 6 }} style={{ width: total ? wi[i] : undefined, flex: total ? undefined : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <TabIcon name={on ? ic : `${ic}-outline`} on={on} color={on ? colors.accentText : colors.muted} />
            <View style={{ width: Math.max(0, lw * fi), marginLeft: 6 * fi, overflow: 'hidden', opacity: Math.max(0, (fi - 0.4) / 0.6) }}><Text style={{ fontSize: 13, color: colors.fg, fontWeight: '800' }} numberOfLines={1}>{label}</Text></View>
          </Pressable>); })}
      </View>
    </View>
  );
}
// Adapter for React Navigation's bottom tabs: tabBar={(p) => <NavBar {...p} icons={ICONS} />}
export function NavBar({ state, navigation, descriptors, icons }) {
  const items = state.routes.map((r) => [r.name, icons[r.name] || 'ellipse', descriptors[r.key].options.tabBarLabel || r.name]);
  return <BarView float items={items} active={state.routes[state.index].name} onPress={(name) => { const r = state.routes.find((x) => x.name === name); const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true }); if (state.routes[state.index].name !== name && !ev.defaultPrevented) navigation.navigate(name); }} />;
}
