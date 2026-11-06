import React, { useRef, useState, useEffect } from 'react';
import { View, Image, Pressable, TextInput, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';

// Round-cornered picture of a driver (own photo) or a team logo; falls back to the number or initials on the team colour.
export function Avatar({ uri, source, size = 48, color = colors.muted, label, radius }) {
  const src = source || (uri ? { uri } : null);
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.28, overflow: 'hidden', backgroundColor: alpha(color, 0.35), alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={src} resizeMode="cover" style={{ width: size, height: size }} /> : <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: size * 0.4 }}>{Array.from(String(label ?? '')).slice(0, 3).join('')}</Text>}
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
          {r.photo !== undefined ? <Avatar source={r.photo} color={r.color} label={r.code} size={22} radius={11} /> : null}
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
          {r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 18, height: 18 }} /> : null}
          <Text style={{ color: colors.muted, fontSize: 13, maxWidth: 110 }} numberOfLines={1}>{r.team}</Text>
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
          <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: r.color }} />
          {r.teamRow ? (r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 22, height: 22 }} /> : <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: alpha(r.color || colors.muted, 0.5) }} />) : (r.photo !== undefined ? <Avatar source={r.photo} color={r.color} label={r.code} size={22} radius={11} /> : null)}
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
          {!r.teamRow && r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 18, height: 18 }} /> : null}
          <Text style={{ color: colors.muted, fontSize: 13, maxWidth: 110 }} numberOfLines={1}>{r.team}</Text>
          <Text style={{ minWidth: 40, textAlign: 'right', color: colors.fg, fontSize: 15, fontWeight: '800' }}>{r.points}</Text>
        </View>))}
      <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8 }}>FANTASY · F1 COMPANION</Text>
    </View>
  );
}

// Season highlights made to be shared as a picture: rows of label and value, with the champion on top.
export function SummaryCard({ title, sub, hero, rows, shotRef }) {
  return (
    <View ref={shotRef} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden', padding: 12, backgroundColor: colors.deep, borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.5 }}>{String(sub).toUpperCase()}</Text>
      </View>
      {hero ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: alpha(hero.color || colors.gold, 0.22), borderWidth: 1, borderColor: alpha(colors.gold, 0.6), marginBottom: 6 }}>
          <Avatar source={hero.photo} color={hero.color} label={hero.code} size={46} radius={23} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.gold, fontFamily: 'label', fontSize: 10, letterSpacing: 2 }}>{hero.label}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{hero.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{hero.sub}</Text></View>
          {hero.logo ? <Image source={hero.logo} resizeMode="contain" style={{ width: 34, height: 34 }} /> : null}
        </View>) : null}
      {rows.map((r) => (
        <View key={r.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <Text style={{ width: 92, color: colors.muted, fontSize: 13 }}>{r.k}</Text>
          {r.photo !== undefined ? <Avatar source={r.photo} color={r.color} label={r.code} size={24} radius={12} /> : null}
          {r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 18, height: 18 }} /> : null}
          <Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{r.v}</Text>
          <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }}>{r.n}</Text>
        </View>))}
      <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8 }}>FANTASY · F1 COMPANION</Text>
    </View>
  );
}

// A slider that moves in steps of one and follows the finger smoothly; the value is committed as it changes.
export function Slide({ label, value, min = 30, max = 99, onChange, color = colors.accent }) {
  const [w, setW] = useState(0); const [live, setLive] = useState(null); const geo = useRef({ w: 0, min, max, last: value, start: 0 }); geo.current.w = w; geo.current.min = min; geo.current.max = max;
  const cb = useRef(onChange); cb.current = onChange; const shown = live ?? value;
  useEffect(() => { if (live == null) geo.current.last = value; }, [value]);
  const at = (x) => { const g = geo.current; if (!g.w) return g.last; return Math.max(g.min, Math.min(g.max, Math.round(g.min + (Math.max(0, Math.min(g.w, x)) / g.w) * (g.max - g.min)))); };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { const v = at(e.nativeEvent.locationX); geo.current.start = e.nativeEvent.locationX - 0; geo.current.x0 = e.nativeEvent.pageX; geo.current.v0x = e.nativeEvent.locationX; setLive(v); if (v !== geo.current.last) { geo.current.last = v; cb.current(v); } },
    onPanResponderMove: (e, gs) => { const v = at(geo.current.v0x + gs.dx); setLive(v); if (v !== geo.current.last) { geo.current.last = v; cb.current(v); } },
    onPanResponderRelease: () => setLive(null), onPanResponderTerminate: () => setLive(null),
  })).current;
  const pct = ((shown - min) / (max - min)) * 100;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }}>{label}</Text><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800', minWidth: 34, textAlign: 'right' }}>{shown}</Text></View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers} style={{ height: 34, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: 8, backgroundColor: color }} /></View>
        <View pointerEvents="none" style={{ position: 'absolute', left: `${pct}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 3, borderColor: color }} />
      </View>
    </View>
  );
}
// "Undo last change" chip, shown only when there is something to undo.
export function UndoChip({ show, onPress }) {
  if (!show) return null;
  return (<Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}><Ionicons name="arrow-undo" size={16} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 14 }}>Undo last change</Text></Pressable>);
}
