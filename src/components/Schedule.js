import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, alpha } from '../theme';
import { hm, dayName, dayKey } from '../lib/time';
import { usePrefs } from '../hooks/usePrefs';

export default function Schedule({ sessions, now, off, onOpen, selected }) {
  const { prefs, toggle } = usePrefs();
  const groups = [];
  sessions.forEach((x) => {
    const ms = Date.parse(x.date_start), k = dayKey(ms, off);
    let g = groups.find((y) => y.k === k); if (!g) groups.push((g = { k, label: dayName(ms, off), items: [] })); g.items.push(x);
  });
  const anyLive = sessions.some((x) => now >= Date.parse(x.date_start) && now < Date.parse(x.date_end));
  const nextS = anyLive ? null : sessions.find((x) => Date.parse(x.date_start) > now); // the next session is only marked once the running one is over
  return (
    <View>
      {groups.map((g) => (
        <View key={g.k}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 17, top: 36, bottom: 8, width: 2, backgroundColor: colors.line }} />
          <Text style={s.day}>{g.label}</Text>
          {g.items.map((x) => {
            const a = Date.parse(x.date_start), b = Date.parse(x.date_end), past = now >= b, live = now >= a && now < b, on = !!prefs.types[x.session_name];
            const nxt = !live && x === nextS, grad = live ? [alpha(colors.accent, 0.55), alpha('#7A0A12', 0.12)] : nxt ? [alpha(colors.accent, 0.2), alpha(colors.accent, 0.03)] : null;
            const qualiDone = sessions.some((y) => y.session_name === 'Qualifying' && now >= Date.parse(y.date_end)), sqDone = sessions.some((y) => y.session_name === 'Sprint Qualifying' && now >= Date.parse(y.date_end));
            const open = onOpen && (past || (x.session_name === 'Race' && qualiDone) || (x.session_name === 'Sprint' && sqDone)) ? () => onOpen(x) : null;
            return (
              <Pressable key={x.date_start} disabled={!open} onPress={open} accessibilityRole={open ? 'button' : undefined} accessibilityLabel={open ? `${x.session_name} results` : undefined} style={({ pressed }) => [s.row, selected === x.session_name && !live && !nxt && { borderWidth: 1, borderColor: alpha(colors.good, 0.6) }, (live || nxt) && { borderWidth: 1, borderColor: alpha(colors.accent, live ? 0.9 : 0.4) }, pressed && open && { opacity: 0.75 }]}>
                {grad ? <LinearGradient pointerEvents="none" colors={grad} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /> : null}
                <View style={[s.dot, past && { backgroundColor: colors.good }, (live || nxt) && { backgroundColor: colors.accent, width: 12, height: 12, borderRadius: 6, shadowColor: colors.accent, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 }]} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.name, past && { color: colors.muted }]} numberOfLines={1}>{x.session_name}</Text>
                  {live ? <View style={s.livePill}><Text style={s.liveTxt}>LIVE</Text></View> : null}
                </View>
                <Text style={[s.time, past && { color: colors.muted }]}>{x.end_estimated ? hm(a, off) : `${hm(a, off)} - ${hm(b, off)}`}</Text>
                {open ? <Ionicons name="stats-chart" size={15} color={colors.accentText} /> : null}
                <Pressable onPress={() => toggle(x.session_name)} hitSlop={8} accessibilityLabel={`Notify for ${x.session_name}`} style={[s.bell, on && { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={19} color={on ? colors.accentText : colors.muted} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  day: { color: colors.onSoft, fontSize: 12, letterSpacing: 1.8, fontWeight: '800', marginTop: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 12, paddingRight: 6, borderRadius: 16, overflow: 'hidden', marginVertical: 4, borderWidth: 1, borderColor: 'transparent' },
  livePill: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }, liveTxt: { color: colors.fg, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line, borderWidth: 2, borderColor: colors.surface }, name: { flexShrink: 1, color: colors.fg, fontSize: 18, fontWeight: '600' },
  time: { color: colors.fg, fontSize: 18, fontVariant: ['tabular-nums'] }, bell: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
