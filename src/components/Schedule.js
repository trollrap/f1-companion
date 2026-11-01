import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';
import { hm, dayName, dayKey } from '../lib/time';
import { usePrefs } from '../hooks/usePrefs';

export default function Schedule({ sessions, now, off }) {
  const { prefs, toggle } = usePrefs();
  const groups = [];
  sessions.forEach((x) => {
    const ms = Date.parse(x.date_start), k = dayKey(ms, off);
    let g = groups.find((y) => y.k === k); if (!g) groups.push((g = { k, label: dayName(ms, off), items: [] })); g.items.push(x);
  });
  const nextS = sessions.find((x) => Date.parse(x.date_start) > now);
  return (
    <View>
      {groups.map((g) => (
        <View key={g.k}>
          <Text style={s.day}>{g.label}</Text>
          {g.items.map((x) => {
            const a = Date.parse(x.date_start), b = Date.parse(x.date_end), past = now >= b, live = now >= a && now < b, on = !!prefs.types[x.session_name];
            const nxt = !live && x === nextS, grad = live ? [alpha(colors.good, 0.42), alpha('#0E9F6E', 0.1)] : nxt ? [alpha(colors.accent, 0.4), alpha(colors.accent, 0.06)] : null;
            return (
              <View key={x.date_start} style={[s.row, (live || nxt) && { borderWidth: 1, borderColor: alpha(live ? colors.good : colors.accent, 0.55) }]}>
                {grad ? <LinearGradient pointerEvents="none" colors={grad} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /> : null}
                <View style={[s.dot, live && { backgroundColor: colors.good }, nxt && { backgroundColor: colors.accent }]} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.name, past && { color: colors.muted }]} numberOfLines={1}>{x.session_name}</Text>
                  {live ? <View style={s.livePill}><Text style={s.liveTxt}>LIVE</Text></View> : null}
                </View>
                <Text style={[s.time, past && { color: colors.muted }]}>{x.end_estimated ? hm(a, off) : `${hm(a, off)} - ${hm(b, off)}`}</Text>
                <Pressable onPress={() => toggle(x.session_name)} hitSlop={8} accessibilityLabel={`Notify for ${x.session_name}`} style={[s.bell, on && { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={19} color={on ? colors.accent : colors.muted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  day: { color: colors.muted, fontSize: 12, letterSpacing: 2.4, fontWeight: '600', marginTop: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 12, paddingRight: 6, borderRadius: 12, overflow: 'hidden', marginVertical: 4, borderWidth: 1, borderColor: 'transparent' },
  livePill: { backgroundColor: colors.good, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }, liveTxt: { color: '#04130A', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted }, name: { flexShrink: 1, color: colors.fg, fontSize: 18, fontWeight: '600' },
  time: { color: colors.fg, fontSize: 18, fontVariant: ['tabular-nums'] }, bell: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
