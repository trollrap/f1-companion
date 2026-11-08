import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl, Animated, Easing, StyleSheet } from 'react-native';
import { Text } from './Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationState } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Press from './Press';
import Header from './Header';
import Reveal from './Reveal';
import Swipe from './Swipe';
import { useTint } from '../lib/tint';
import { colors } from '../theme';
import { refreshAll, useOffline } from '../lib/net';
import { usePrefs } from '../hooks/usePrefs';
import { up } from '../lib/i18n';

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
// Every block keeps a key that is unique and stable (prefixed by the fragment it came from), so a block appearing or disappearing never remounts or re-animates its neighbours.
const flat = (ch, pre = '') => React.Children.toArray(ch).flatMap((c) => (c && c.type === React.Fragment ? flat(c.props.children, `${pre}${c.key}/`) : [{ el: c, k: `${pre}${c && c.key != null ? c.key : ''}` }]));
export default function Screen({ children, header = true, refreshable = true, scrollRef, swipe, footer, revealKey }) {
  // A screen pushed on the stack already has the native header, so it never draws a second header or a second top margin.
  const navType = useNavigationState((st) => st?.type); if (navType === 'stack') header = false;
  const [refreshing, setRefreshing] = useState(false); const { prefs: pp } = usePrefs(); const canPull = refreshable && pp.opts.pullRefresh === true;
  // Switching tabs inside a screen (revealKey) is one short fade of the whole page, not a new staggered entrance for every block.
  const fade = useRef(new Animated.Value(1)).current; const firstKey = useRef(true);
  useEffect(() => { if (firstKey.current) { firstKey.current = false; return; } fade.setValue(0.3); Animated.timing(fade, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [revealKey]);
  const pull = async () => { setRefreshing(true); try { await refreshAll(); } finally { setRefreshing(false); } };
  // Modals and floating chips (marked `ghost`) take no space in the page, so they never leave a gap between blocks.
  const all = flat(children); const blocks = all.filter((c) => !c.el?.type?.ghost); const ghosts = all.filter((c) => c.el?.type?.ghost);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={header ? ['top'] : []}>
      {header && <Header />}
      <OfflineBanner />
      <Animated.View style={{ flex: 1, opacity: fade }}>
      {swipe ? <Swipe {...swipe}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={canPull ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {blocks.map((c, i) => <Reveal key={c.k || i} index={i}>{c.el}</Reveal>)}
      </ScrollView>
      </Swipe> : (
      <ScrollView ref={scrollRef} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={canPull ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {blocks.map((c, i) => <Reveal key={c.k || i} index={i}>{c.el}</Reveal>)}
      </ScrollView>
      )}
      </Animated.View>
      {ghosts.length ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 92 }}>{ghosts.map((c, i) => <React.Fragment key={c.k || i}>{c.el}</React.Fragment>)}</View> : null}
      {footer || null}
    </SafeAreaView>
  );
}
// Cards carry a soft red-tinted gradient instead of flat grey.
const CARD_GRAD = [colors.cardA, colors.cardB];
export function Card({ style, children, onPress }) {
  const inner = (<><LinearGradient pointerEvents="none" colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />{children}</>);
  if (!onPress) return <View style={[s.card, style]}>{inner}</View>;
  return <Press onPress={onPress} scale={0.98} style={[s.card, style]}>{inner}</Press>;
}
export const Eyebrow = ({ children, right, color }) => { const tint = useTint(); return (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: tint }} />
    <Text style={[s.eyebrow, color && { color }]}>{up(String(children))}</Text>
    {right ? <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>{typeof right === 'string' ? <Text style={s.more}>{right}</Text> : right}<Ionicons name="chevron-forward" size={16} color={colors.muted} /></View> : null}
  </View>
); };
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
