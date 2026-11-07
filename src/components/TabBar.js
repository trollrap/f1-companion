import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from '../theme';

// One bottom bar for the whole app (main tabs and the fantasy tabs): filled icon when selected, small label right under it, compact and low on the
// screen. Tabs can be passed as [key, icon, label] for screens that manage their own tab state.
export function BarView({ items, active, onPress }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 6) }}>
      {items.map(([k, ic, label]) => { const on = active === k; return (
        <Pressable key={k} onPress={() => onPress(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 4, gap: 1 }}>
          <Ionicons name={on ? ic : `${ic}-outline`} size={22} color={on ? colors.accent : colors.muted} />
          <Text style={{ fontSize: 10.5, color: on ? colors.accent : colors.muted, fontWeight: on ? '700' : '500' }} numberOfLines={1}>{label}</Text>
        </Pressable>); })}
    </View>
  );
}
// Adapter for React Navigation's bottom tabs: tabBar={(p) => <NavBar {...p} icons={ICONS} />}
export function NavBar({ state, navigation, descriptors, icons }) {
  const items = state.routes.map((r) => [r.name, icons[r.name] || 'ellipse', descriptors[r.key].options.tabBarLabel || r.name]);
  return <BarView items={items} active={state.routes[state.index].name} onPress={(name) => { const r = state.routes.find((x) => x.name === name); const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true }); if (state.routes[state.index].name !== name && !ev.defaultPrevented) navigation.navigate(name); }} />;
}
