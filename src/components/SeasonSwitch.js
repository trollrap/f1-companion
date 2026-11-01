import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';
// The season shown in the middle. Tapping it opens a menu with every year, newest first.
export default function SeasonSwitch({ year, onChange, min = 1950, max, years: list, caption, compact }) {
  const v = useRef(new Animated.Value(1)).current; const [open, setOpen] = useState(false); const m = useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [year]);
  useEffect(() => { if (open) { m.setValue(0); Animated.timing(m, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); } }, [open]);
  const close = (y) => { Animated.timing(m, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => { setOpen(false); if (y != null && y !== year) onChange(y); }); };
  const years = list || []; if (!list) for (let y = max; y >= min; y--) years.push(y);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Season ${year}. Tap to choose another season.`} style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: compact ? 8 : 10, borderWidth: 1, borderColor: alpha(colors.accent, 0.35) }, pressed && { opacity: 0.85 }]}>
        <LinearGradient pointerEvents="none" colors={['#34121A', '#160C0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <Animated.View style={{ alignItems: 'center', opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: compact ? 22 : 30, color: colors.fg, letterSpacing: 1 }}>{year}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.accent} />
          </View>
          <Text style={{ color: !caption && year === YEAR_OF(max) ? colors.accent : colors.muted, fontSize: 12, letterSpacing: 2, fontWeight: '700' }} numberOfLines={1}>{caption ? String(caption).toUpperCase() : year === YEAR_OF(max) ? 'CURRENT SEASON' : year > YEAR_OF(max) ? 'UPCOMING' : 'TAP TO CHANGE SEASON'}</Text>
        </Animated.View>
      </Pressable>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', opacity: m, justifyContent: 'center', padding: 20 }}>
          <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={() => close()} />
          <Animated.View style={{ maxHeight: '78%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: alpha(colors.accent, 0.4), transform: [{ scale: m.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }, { translateY: m.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <LinearGradient pointerEvents="none" colors={['#2A1318', '#120A0C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <Text style={{ color: colors.muted, fontFamily: 'label', letterSpacing: 2.4, fontSize: 12, textAlign: 'center', paddingTop: 16 }}>CHOOSE A SEASON</Text>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }} showsVerticalScrollIndicator={false}>
              {years.map((y) => (
                <Pressable key={y} onPress={() => close(y)} style={({ pressed }) => ({ width: '31.5%', alignItems: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: y === year ? colors.accent : colors.line, backgroundColor: y === year ? colors.accentSoft : 'rgba(255,255,255,0.03)', opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ color: y === year ? colors.fg : '#D9CDD0', fontWeight: '800', fontSize: 19, fontVariant: ['tabular-nums'] }}>{y}</Text>
                </Pressable>))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
const YEAR_OF = (max) => (max >= 2027 ? 2026 : max); // "current" is the real current season, even when the picker goes one year further
