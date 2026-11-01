import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import { hm, dayName } from '../lib/time';
// Small box with the one session that matters now: the one in progress (counting down to its end) or else the next one.
const pad = (n) => String(n).padStart(2, '0');
const left = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return d ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`; };
export default function NextSession({ sessions, now, off }) {
  const live = sessions.find((x) => now >= Date.parse(x.date_start) && now < Date.parse(x.date_end));
  const x = live || sessions.find((s) => Date.parse(s.date_start) > now); if (!x) return null;
  const a = Date.parse(x.date_start), b = Date.parse(x.date_end);
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: alpha(colors.accent, live ? 0.8 : 0.4), paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <LinearGradient pointerEvents="none" colors={[alpha(colors.accent, live ? 0.5 : 0.28), alpha(colors.accent, 0.04)]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <Ionicons name={live ? 'radio-button-on' : 'time-outline'} size={22} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 1.8 }}>{live ? 'IN PROGRESS' : 'NEXT SESSION'}</Text>
        <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{x.session_name}</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>{`${dayName(a, off)} · ${hm(a, off)}`}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{left(live ? b - now : a - now)}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{live ? 'until it ends' : 'to go'}</Text>
      </View>
    </View>
  );
}
