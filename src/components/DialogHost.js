import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, Animated, Easing, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import { useDialogState } from '../lib/dialog';
// The popup used everywhere instead of the system alert: a dark rounded card, the app fonts, accent buttons.
export default function DialogHost() {
  const [d, close] = useDialogState(); const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (d) { v.setValue(0); Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); } }, [d]);
  if (!d) return null;
  const press = (b) => { close(); try { b.onPress && b.onPress(); } catch {} };
  const cancel = d.buttons.find((b) => b.style === 'cancel');
  const stacked = d.buttons.length > 2 || d.buttons.some((b) => String(b.text || '').length > 14);
  const tone = (b) => (b.style === 'destructive' ? { bg: alpha(colors.red, 0.16), fg: colors.red, bd: alpha(colors.red, 0.5) } : b.style === 'cancel' ? { bg: 'transparent', fg: colors.muted, bd: colors.line } : { bg: colors.accent, fg: '#fff', bd: colors.accent });
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => { if (d.cancelable) { close(); try { cancel && cancel.onPress && cancel.onPress(); } catch {} } }}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.66)', justifyContent: 'center', padding: 24, opacity: v }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => { if (d.cancelable) { close(); try { cancel && cancel.onPress && cancel.onPress(); } catch {} } }} />
        <Animated.View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 22, padding: 20, maxHeight: '80%', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginBottom: 14 }} />
          {d.title ? <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700' }}>{d.title}</Text> : null}
          {d.message ? <ScrollView style={{ marginTop: 8, flexGrow: 0 }}><Text style={{ color: colors.muted, fontSize: 16, lineHeight: 22 }}>{d.message}</Text></ScrollView> : null}
          <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            {d.buttons.map((b, i) => { const t = tone(b); return (
              <Pressable key={i} onPress={() => press(b)} style={({ pressed }) => [{ flex: stacked ? 0 : 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: t.bg, borderWidth: 1, borderColor: t.bd }, pressed && { opacity: 0.7 }]}>
                <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{b.text}</Text>
              </Pressable>); })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
