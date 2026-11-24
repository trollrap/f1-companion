import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import Grad from './Grad';
import Press from './Press';
import { colors, alpha } from '../theme';
import { catOf } from '../lib/gameCatalog';
import { ui } from '../lib/motion';

// Shared look for the newer games: one header with live stats, answer buttons with feedback, a lives row and a result panel.
export function GameHeader({ cat = 'quiz', title, icon, stats = [], hint }) {
  const c = catOf(cat).color; const [open, setOpen] = useState(false);
  return (
    <Grad color={c} from={0.42} to={0.06} border={0.45} radius={20} style={{ padding: 14 }}>
      <Ionicons name={icon} size={110} color={alpha(c, 0.14)} style={{ position: 'absolute', right: -14, top: -16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: alpha(c, 0.3), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={colors.fg} /></View>
        <Text style={{ flex: 1, color: colors.fg, fontSize: 22, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{title}</Text>
        {hint ? <Pressable accessibilityRole="button" accessibilityLabel="How to play" hitSlop={10} onPress={() => setOpen((v) => !v)}><Ionicons name={open ? 'close-circle' : 'help-circle-outline'} size={24} color={colors.onSoft} /></Pressable> : null}
      </View>
      {stats.length ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {stats.map(([l, v]) => (<View key={l} style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: alpha('#000', 0.28), alignItems: 'center' }}>
            <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{v}</Text>
            <Text style={{ color: colors.onSoft, fontSize: 10, letterSpacing: 1.2, fontFamily: 'label' }}>{String(l).toUpperCase()}</Text></View>))}
        </View>) : null}
      {hint && open ? <Text style={{ color: colors.fg, fontSize: 14, marginTop: 10, lineHeight: 19 }}>{hint}</Text> : null}
    </Grad>);
}

export function Lives({ n, max = 3, size = 20 }) {
  return <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`${n} of ${max} lives left`}>{Array.from({ length: max }, (_, i) => <Ionicons key={i} name={i < n ? 'heart' : 'heart-outline'} size={size} color={i < n ? colors.accent : colors.muted} />)}</View>;
}

// A question or prompt card.
export function Prompt({ kicker, children, color = colors.accent }) {
  return (
    <View style={{ padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: alpha(color, 0.4), gap: 6 }}>
      {kicker ? <Text style={{ color, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{String(kicker).toUpperCase()}</Text> : null}
      <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>{children}</Text>
    </View>);
}

// An answer button. state: '' | 'right' | 'wrong'. A right answer pulses once; a wrong one shakes.
export function Answer({ label, sub, letter, state = '', onPress, disabled }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (ui.reduceMotion || !state) return; v.setValue(0); Animated.timing(v, { toValue: 1, duration: 360, useNativeDriver: true }).start(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = state === 'right', wrong = state === 'wrong'; const tone = right ? colors.good : wrong ? colors.accent : colors.line;
  const tx = wrong ? v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -6, 6, -3, 0] }) : 0;
  const sc = right ? v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] }) : 1;
  return (
    <Animated.View style={{ transform: [{ translateX: tx }, { scale: sc }] }}>
      <Press onPress={onPress} disabled={disabled} scale={0.98}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: tone, backgroundColor: right ? alpha(colors.good, 0.16) : wrong ? alpha(colors.accent, 0.16) : colors.card }}>
          {letter ? <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: right ? colors.good : wrong ? colors.accent : alpha(colors.fg, 0.1) }}><Text style={{ color: right || wrong ? '#fff' : colors.onSoft, fontWeight: '800', fontSize: 13 }}>{letter}</Text></View> : null}
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>{sub ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}</View>
          {right ? <Ionicons name="checkmark-circle" size={22} color={colors.good} /> : wrong ? <Ionicons name="close-circle" size={22} color={colors.accentText} /> : null}
        </View>
      </Press>
    </Animated.View>);
}

// A short line under a question: explains the answer.
export function Feedback({ ok, children }) {
  return (<View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: alpha(ok ? colors.good : colors.accent, 0.14) }}>
    <Ionicons name={ok ? 'checkmark-circle' : 'information-circle'} size={18} color={ok ? colors.good : colors.accentText} /><Text style={{ flex: 1, color: colors.fg, fontSize: 14 }}>{children}</Text></View>);
}

// The result panel at the end of a game.
export function ResultPanel({ cat = 'quiz', kicker, big, sub, best, win = true, icon }) {
  const c = catOf(cat).color;
  return (
    <Grad color={win ? c : colors.muted} from={0.5} to={0.06} border={0.5} radius={24} style={{ padding: 22, alignItems: 'center', gap: 4 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: alpha(win ? c : colors.muted, 0.3), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon || (win ? 'trophy' : 'flag')} size={28} color={colors.fg} /></View>
      <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2, marginTop: 6 }}>{String(kicker || '').toUpperCase()}</Text>
      <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 42, textAlign: 'center' }}>{big}</Text>
      {sub ? <Text style={{ color: colors.onSoft, fontSize: 14, textAlign: 'center' }}>{sub}</Text> : null}
      {best ? <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.gold }}><Text style={{ color: '#000', fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>NEW BEST</Text></View> : null}
    </Grad>);
}

// A turn banner for two-player games.
export function TurnBanner({ who, label, color }) {
  const c = color || (who === 1 ? colors.accent : colors.good);
  return (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: alpha(c, 0.18), borderWidth: 1, borderColor: alpha(c, 0.5) }}>
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{who}</Text></View>
    <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '800' }}>{label}</Text></View>);
}

export function Hint({ children }) { return <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{children}</Text>; }
