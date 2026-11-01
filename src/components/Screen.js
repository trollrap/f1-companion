import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl, Animated, Easing, StyleSheet } from 'react-native';
import { Text } from './Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Press from './Press';
import Header from './Header';
import Reveal from './Reveal';
import Swipe from './Swipe';
import { colors } from '../theme';
import { refreshAll, useOffline } from '../lib/net';

// Slides in under the header when the data servers cannot be reached twice in a row. Tapping it retries.
function OfflineBanner() {
  const off = useOffline(); const v = useRef(new Animated.Value(0)).current; const [shown, setShown] = useState(off);
  useEffect(() => {
    if (off) setShown(true);
    Animated.timing(v, { toValue: off ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => { if (!off) setShown(false); });
  }, [off]);
  if (!shown) return null;
  return (
    <Animated.View style={{ opacity: v, maxHeight: v.interpolate({ inputRange: [0, 1], outputRange: [0, 64] }), overflow: 'hidden' }}>
      <Pressable onPress={refreshAll} style={s.offline} accessibilityRole="button" accessibilityLabel="Offline. Tap to try again">
        <Ionicons name="cloud-offline-outline" size={18} color={colors.gold} />
        <Text style={{ color: colors.fg, fontSize: 15, flex: 1 }}>Can't reach the race data servers. Showing saved data.</Text>
        <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Retry</Text>
      </Pressable>
    </Animated.View>
  );
}
// Children inside <>...</> are lifted out so every block gets the same gap.
const flat = (ch) => React.Children.toArray(ch).flatMap((c) => (c && c.type === React.Fragment ? flat(c.props.children) : [c]));
export default function Screen({ children, header = true, refreshable = true, scrollRef, swipe }) {
  const [refreshing, setRefreshing] = useState(false);
  const pull = async () => { setRefreshing(true); try { await refreshAll(); } finally { setRefreshing(false); } };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={header ? ['top'] : []}>
      {header && <Header />}
      <OfflineBanner />
      {swipe ? <Swipe {...swipe}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={refreshable ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {flat(children).map((c, i) => <Reveal key={c.key ?? i} index={i}>{c}</Reveal>)}
      </ScrollView>
      </Swipe> : (
      <ScrollView ref={scrollRef} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={refreshable ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {flat(children).map((c, i) => <Reveal key={c.key ?? i} index={i}>{c}</Reveal>)}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
// Cards carry a soft red-tinted gradient instead of flat grey.
const CARD_GRAD = ['#2A1318', '#160C0F'];
export function Card({ style, children, onPress }) {
  const inner = (<><LinearGradient pointerEvents="none" colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />{children}</>);
  if (!onPress) return <View style={[s.card, style]}>{inner}</View>;
  return <Press onPress={onPress} scale={0.98} style={[s.card, style]}>{inner}</Press>;
}
export const Eyebrow = ({ children, right, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: colors.accent }} />
    <Text style={[s.eyebrow, color && { color }]}>{String(children).toUpperCase()}</Text>
    {right ? <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>{typeof right === 'string' ? <Text style={s.more}>{right}</Text> : right}<Ionicons name="chevron-forward" size={16} color={colors.muted} /></View> : null}
  </View>
);
const friendly = (e) => (/fetch|network|abort|timed? ?out/i.test(String(e)) ? 'the data server could not be reached. Check your connection.' : String(e));
export function ErrorNote({ error, onRetry }) {
  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>Could not load this: {friendly(error)}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '700' }}>Try again</Text></Pressable> : null}
    </View>
  );
}
export const Note = ({ children }) => <Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>{children}</Text>;
const s = StyleSheet.create({
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'rgba(255,200,60,0.35)' },
  body: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 14, overflow: 'hidden' },
  eyebrow: { fontFamily: 'label', color: colors.muted, fontWeight: '600', fontSize: 12, letterSpacing: 2.6 }, more: { color: colors.muted, fontSize: 15 },
});
