import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import { hm, dayName } from '../lib/time';
import { usePrefs } from '../hooks/usePrefs';

const clock = (ms) => { let t = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(t / 3600); t %= 3600; const m = Math.floor(t / 60); t %= 60; const p = (n) => String(n).padStart(2, '0'); return h >= 24 ? `${Math.floor(h / 24)}d ${p(h % 24)}h` : `${p(h)}:${p(m)}:${p(t)}`; };
// The weekend as a vertical timeline: a dot per session joined by a line, finished ones green, the next one in a highlighted card.
export default function Timeline({ sessions, now, off, onOpen, selected }) {
  const { prefs, toggle } = usePrefs();
  const anyLive = sessions.some((x) => now >= Date.parse(x.date_start) && now < Date.parse(x.date_end));
  const nextS = anyLive ? null : sessions.find((x) => Date.parse(x.date_start) > now);
  const qualiDone = sessions.some((y) => y.session_name === 'Qualifying' && now >= Date.parse(y.date_end)), sqDone = sessions.some((y) => y.session_name === 'Sprint Qualifying' && now >= Date.parse(y.date_end));
  return (
    <View style={{ paddingLeft: 6 }}>
      {sessions.map((x, i) => {
        const a = Date.parse(x.date_start), b = Date.parse(x.date_end), past = now >= b, live = now >= a && now < b, nxt = x === nextS, hot = live || nxt, last = i === sessions.length - 1;
        const on = !!prefs.types[x.session_name]; const open = onOpen && (past || (x.session_name === 'Race' && qualiDone) || (x.session_name === 'Sprint' && sqDone)) ? () => onOpen(x) : null;
        const dot = hot ? colors.accent : past ? colors.good : colors.line;
        return (
          <View key={x.date_start} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center', width: 16 }}>
              <View style={{ marginTop: hot ? 16 : 4, width: hot ? 14 : 12, height: hot ? 14 : 12, borderRadius: 7, backgroundColor: dot, ...(hot ? { shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4, borderWidth: 0 } : null) }} />
              {!last ? <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2 }} /> : null}
            </View>
            <Pressable disabled={!open} onPress={open} accessibilityRole={open ? 'button' : undefined} accessibilityLabel={open ? `${x.session_name} results` : x.session_name}
              style={({ pressed }) => [{ flex: 1, marginBottom: 14, paddingVertical: hot ? 12 : 2, paddingHorizontal: hot ? 12 : 0, borderRadius: 16 }, hot && { backgroundColor: alpha(colors.accent, 0.12), borderWidth: 1, borderColor: alpha(colors.accent, 0.4), marginTop: 4 }, selected === x.session_name && !hot && { backgroundColor: alpha(colors.good, 0.08), paddingHorizontal: 10, borderRadius: 14 }, pressed && { opacity: 0.8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: colors.fg, fontWeight: hot ? '800' : '700', fontSize: 16 }} numberOfLines={1}>{x.session_name}</Text>
                <Text style={{ color: hot ? colors.fg : colors.muted, fontSize: 13 }}>{`${dayName(a, off).slice(0, 3)} ${hm(a, off)}`}</Text>
                {open ? <Ionicons name="stats-chart" size={14} color={colors.accentText} /> : null}
                <Pressable onPress={() => toggle(x.session_name)} hitSlop={8} accessibilityLabel={`Notify for ${x.session_name}`}><Ionicons name={on ? 'notifications' : 'notifications-outline'} size={17} color={on ? colors.accentText : colors.muted} /></Pressable>
              </View>
              {past ? <Text style={{ color: colors.good, fontSize: 12, fontWeight: '700' }}>Finished</Text> : live ? <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '800' }}>LIVE now</Text> : nxt ? <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '800' }}>{`Next · in ${clock(a - now)}`}</Text> : null}
            </Pressable>
          </View>);
      })}
    </View>
  );
}
