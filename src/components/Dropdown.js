import React, { useRef, useState } from 'react';
import { View, Pressable, Animated, Easing, StyleSheet, LayoutAnimation } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
// Inline dropdown: a tappable header showing the current choice, and the options unfold beneath it.
export default function Dropdown({ value, options, onChange, prefix }) {
  const [open, setOpen] = useState(false); const rot = useRef(new Animated.Value(0)).current, fade = useRef(new Animated.Value(0)).current;
  const flip = (to) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setOpen(to);
    Animated.timing(rot, { toValue: to ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (to) { fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start(); }
  };
  const cur = options.find(([v]) => v === value);
  return (
    <View>
      <Pressable onPress={() => flip(!open)} style={({ pressed }) => [s.head, open && { borderColor: colors.accent }, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <Text style={s.cur} numberOfLines={1}>{cur ? cur[1] : '—'}</Text>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={20} color={colors.muted} /></Animated.View>
      </Pressable>
      {open && (
        <Animated.View style={[s.list, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}>
          {options.map(([v, l], i) => (
            <Pressable key={String(v)} onPress={() => { onChange(v); flip(false); }} style={({ pressed }) => [s.opt, i > 0 && s.sep, pressed && { backgroundColor: colors.surface }]}>
              <Text style={[s.optText, v === value && { color: colors.accent }]}>{l}</Text>
              {v === value ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>))}
        </Animated.View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, height: 48 },
  prefix: { color: colors.muted, fontSize: 14 }, cur: { flex: 1, color: colors.fg, fontSize: 18, fontWeight: '600' },
  list: { marginTop: 6, backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 }, sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  optText: { color: colors.fg, fontSize: 17, fontWeight: '600' },
});
