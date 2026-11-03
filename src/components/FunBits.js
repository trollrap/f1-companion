import React from 'react';
import { View, Image, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';

// Round-cornered picture of a driver (own photo) or a team logo; falls back to the number or initials on the team colour.
export function Avatar({ uri, source, size = 48, color = colors.muted, label, radius }) {
  const src = source || (uri ? { uri } : null);
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.28, overflow: 'hidden', backgroundColor: alpha(color, 0.35), alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={src} resizeMode="cover" style={{ width: size, height: size }} /> : <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: size * 0.4 }}>{String(label ?? '').slice(0, 3)}</Text>}
    </View>
  );
}
export function Field({ label, value, onChange, placeholder, keyboardType, maxLength, style }) {
  return (
    <View style={[{ gap: 4 }, style]}>
      {label ? <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 1.6 }}>{String(label).toUpperCase()}</Text> : null}
      <TextInput value={value == null ? '' : String(value)} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} maxLength={maxLength}
        style={{ height: 46, borderRadius: 12, paddingHorizontal: 12, color: colors.fg, fontSize: 17, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }} />
    </View>
  );
}
export function Stepper({ label, value, min, max, onChange, step = 1 }) {
  const B = ({ icon, d }) => (<Pressable onPress={() => onChange(Math.max(min, Math.min(max, value + d)))} hitSlop={6} style={({ pressed }) => [{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.6 }]}><Ionicons name={icon} size={20} color={colors.accent} /></Pressable>);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600', flex: 1 }}>{label}</Text>
      <B icon="remove" d={-step} /><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800', minWidth: 36, textAlign: 'center' }}>{value}</Text><B icon="add" d={step} />
    </View>
  );
}
export function Btn({ icon, children, onPress, tone = 'soft', disabled, style }) {
  const solid = tone === 'solid';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, backgroundColor: solid ? colors.accent : colors.accentSoft, borderWidth: 1, borderColor: colors.accent, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={18} color={solid ? '#fff' : colors.accent} /> : null}
      <Text style={{ color: solid ? '#fff' : colors.fg, fontWeight: '700', fontSize: 16 }}>{children}</Text>
    </Pressable>
  );
}
export function Swatches({ value, onChange, list }) {
  return (<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{list.map((c) => (<Pressable key={c} onPress={() => onChange(c)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: value === c ? 3 : 1, borderColor: value === c ? '#fff' : colors.line }} />))}</View>);
}
// A compact result card made to be shared as a picture: title line, then one tight row per driver.
export function SessionCard({ title, sub, rows, shotRef, limit = 20 }) {
  return (
    <View ref={shotRef} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden', padding: 12, backgroundColor: colors.deep, borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 }}>{String(sub).toUpperCase()}</Text>
      </View>
      {rows.slice(0, limit).map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
          <Text style={{ width: 22, color: r.pos === 1 ? colors.gold : colors.muted, fontWeight: '800', fontSize: 14, textAlign: 'right' }}>{r.pos}</Text>
          <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: r.color }} />
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{r.team}</Text>
          <Text style={{ minWidth: 62, textAlign: 'right', color: colors.fg, fontSize: 14, fontVariant: ['tabular-nums'] }}>{r.right}</Text>
        </View>))}
      <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8 }}>FANTASY · F1 COMPANION</Text>
    </View>
  );
}

// Compact championship table made to be shared as a picture (drivers or teams).
export function StandingsCard({ title, sub, rows, shotRef, limit = 22 }) {
  return (
    <View ref={shotRef} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden', padding: 12, backgroundColor: colors.deep, borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 }}>{String(sub).toUpperCase()}</Text>
      </View>
      {rows.slice(0, limit).map((r, i) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
          <Text style={{ width: 22, color: i === 0 ? colors.gold : colors.muted, fontWeight: '800', fontSize: 14, textAlign: 'right' }}>{i + 1}</Text>
          <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: r.color }} />
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{r.team}</Text>
          <Text style={{ minWidth: 40, textAlign: 'right', color: colors.fg, fontSize: 15, fontWeight: '800' }}>{r.points}</Text>
        </View>))}
      <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8 }}>FANTASY · F1 COMPANION</Text>
    </View>
  );
}
