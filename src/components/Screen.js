import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl, Animated, Easing, StyleSheet } from 'react-native';
import { Text } from './Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationState, NavigationRouteContext, NavigationContext } from '@react-navigation/native';
import { STAT_ORDER } from '../lib/statsGroups';
import { Share } from 'react-native';
import { SHARE_ROUTES } from '../lib/shareRoutes';
import { shareScreenImage } from '../lib/exportImage';
import { LinearGradient } from 'expo-linear-gradient';
import Press from './Press';
import Header from './Header';
import Reveal from './Reveal';
import Swipe from './Swipe';
import { useTint } from '../lib/tint';
import { colors, alpha } from '../theme';
import { refreshAll, useOffline } from '../lib/net';
import { usePrefs } from '../hooks/usePrefs';
import { up } from '../lib/i18n';

// Slides in under the header when the data servers cannot be reached twice in a row. Tapping it retries.
function OfflineBanner({ bleed }) {
  const ins = useSafeAreaInsets();
  const off = useOffline(); const v = useRef(new Animated.Value(0)).current; const [shown, setShown] = useState(off);
  useEffect(() => {
    if (off) setShown(true);
    Animated.timing(v, { toValue: off ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => { if (!off) setShown(false); });
  }, [off]);
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[{ opacity: v, maxHeight: v.interpolate({ inputRange: [0, 1], outputRange: [0, 64] }), overflow: 'hidden' }, { position: 'absolute', left: 12, right: 12, top: ins.top + 52, zIndex: 20, borderRadius: 16 }]}>
      <Pressable onPress={refreshAll} style={s.offline} accessibilityRole="button" accessibilityLabel="Offline. Tap to try again">
        <Ionicons name="cloud-offline-outline" size={18} color={colors.gold} />
        <Text style={{ color: colors.fg, fontSize: 15, flex: 1 }}>Can't reach the race data servers. Showing saved data.</Text>
        <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 15 }}>Retry</Text>
      </Pressable>
    </Animated.View>
  );
}
// Children inside <>...</> are lifted out so every block gets the same gap.
// Every block keeps a key that is unique and stable (prefixed by the fragment it came from), so a block appearing or disappearing never remounts or re-animates its neighbours.
const flat = (ch, pre = '') => React.Children.toArray(ch).flatMap((c) => (c && c.type === React.Fragment ? flat(c.props.children, `${pre}${c.key}/`) : [{ el: c, k: `${pre}${c && c.key != null ? c.key : ''}` }]));
export default function Screen({ children, bleed = false, header = true, refreshable = true, scrollRef, swipe: swipeProp, footer, revealKey }) {
  const nav0 = React.useContext(NavigationContext); const route = React.useContext(NavigationRouteContext);
  // Statistics screens swipe sideways to the previous or next one in the Statistics list.
  const si = route && !swipeProp ? STAT_ORDER.indexOf(route.name) : -1;
  const swipe = swipeProp || (si >= 0 && nav0 ? { index: si, count: STAT_ORDER.length, onIndex: (i) => nav0.replace(STAT_ORDER[i]) } : null); const canShare = !!route && SHARE_ROUTES.has(route.name); const own = useRef(null); const sref = scrollRef || own;
  const doShare = async (whole) => { const r = await shareScreenImage(sref, whole === true); if (r === 'unavailable' || r === 'error') { try { await Share.share({ message: `F1 Companion: ${route?.name || ''}` }); } catch {} } };
  // A screen pushed on the stack already has the native header, so it never draws a second header or a second top margin.
  const navType = useNavigationState((st) => st?.type); if (navType === 'stack') header = false;
  const [refreshing, setRefreshing] = useState(false); const { prefs: pp } = usePrefs(); const canPull = refreshable; // vertical pull from the top only; the header no longer has a refresh button
  // Switching tabs inside a screen (revealKey) is one short fade of the whole page, not a new staggered entrance for every block.
  const fade = useRef(new Animated.Value(1)).current; const firstKey = useRef(true);
  useEffect(() => { if (firstKey.current) { firstKey.current = false; return; } fade.setValue(0.3); Animated.timing(fade, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [revealKey]);
  const pull = async () => { setRefreshing(true); try { await refreshAll(); } finally { setRefreshing(false); } };
  // Modals and floating chips (marked `ghost`) take no space in the page, so they never leave a gap between blocks.
  const insets0 = useSafeAreaInsets(); const insT = insets0.top; const inTabs = React.useContext(BottomTabBarHeightContext) != null; const tabH = inTabs ? 66 + Math.max(insets0.bottom, 10) : 0; // the tab bar floats over the page, so the page leaves room under it
  const bodyStyle = [header ? s.bodyH : s.body, tabH ? { paddingBottom: 16 + tabH } : null];
  const all = flat(children); const blocks = all.filter((c) => !c.el?.type?.ghost); const ghosts = all.filter((c) => c.el?.type?.ghost);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={header ? ['top'] : []}>
      <OfflineBanner bleed={bleed} />
      <Animated.View style={{ flex: 1, opacity: fade }}>
      {swipe ? <Swipe {...swipe}>
      <ScrollView ref={sref} directionalLockEnabled alwaysBounceHorizontal={false} contentContainerStyle={bodyStyle} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={canPull ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {blocks.map((c, i) => <Slot key={c.k || i} index={i}>{c.el}</Slot>)}
      </ScrollView>
      </Swipe> : (
      <ScrollView ref={sref} directionalLockEnabled alwaysBounceHorizontal={false} contentContainerStyle={bodyStyle} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={canPull ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface2} /> : undefined}>
        {blocks.map((c, i) => <Slot key={c.k || i} index={i}>{c.el}</Slot>)}
      </ScrollView>
      )}
      </Animated.View>
      {header ? <>
        <LinearGradient pointerEvents="none" colors={colors.isLight ? ['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)'] : ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.26)', 'rgba(0,0,0,0)']} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insT + 64, zIndex: 4 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: insT, zIndex: 5 }}><Header /></View>
      </> : null}
      {ghosts.length ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 92 + tabH }}>{ghosts.map((c, i) => <React.Fragment key={c.k || i}>{c.el}</React.Fragment>)}</View> : null}
      {canShare ? <Pressable accessibilityRole="button" accessibilityLabel="Share what is on screen as a picture. Press and hold for the whole page." onPress={() => doShare(false)} onLongPress={() => doShare(true)} delayLongPress={600} style={({ pressed }) => [{ position: 'absolute', right: 16, bottom: 22 + tabH, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, elevation: 6 }, pressed && { opacity: 0.8 }]}><Ionicons name="share-outline" size={22} color="#fff" /></Pressable> : null}
      {footer || null}
    </SafeAreaView>
  );
}
// Cards carry a soft red-tinted gradient instead of flat grey.
const CARD_GRAD = [alpha(colors.fg, 0.045), alpha(colors.fg, 0.01)]; // flat, glassy: a faint light wash instead of a coloured diagonal
export function Card({ style, children, onPress, hero, flat }) {
  const tint = useTint();
  const inner = (<>{flat ? null : <LinearGradient pointerEvents="none" colors={hero ? [alpha(tint, 0.34), alpha(tint, 0.04)] : CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}{children}</>);
  const st = flat ? [{ gap: 12 }, style] : hero ? [s.card, { borderColor: alpha(tint, 0.45), padding: 16 }, style] : [s.card, style];
  if (!onPress) return <View style={st}>{inner}</View>;
  return <Press onPress={onPress} scale={0.98} style={st}>{inner}</Press>;
}
export const Eyebrow = ({ children, right, color }) => { const tint = useTint(); return (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tint }} />
    <Text style={[s.eyebrow, color && { color }]}>{up(String(children))}</Text>
    {right ? <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>{typeof right === 'string' ? <Text style={s.more}>{right}</Text> : right}<Ionicons name="chevron-forward" size={16} color={colors.muted} /></View> : null}
  </View>
); };
const friendly = (e) => { const t = String((e && e.message) || e || ''); return /fetch|network|abort|timed? ?out|failed/i.test(t) || !t || t === 'undefined' || t === 'null' ? 'the data server could not be reached. Check your connection and try again.' : t; };
export function ErrorNote({ error, onRetry }) {
  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>Could not load this: {friendly(error)}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '700' }}>Try again</Text></Pressable> : null}
    </View>
  );
}
export const Note = ({ children }) => <Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>{children}</Text>;
// A block that renders nothing (a banner with nothing to say) must not leave its share of the gap behind.
function Slot({ index, children }) {
  const [empty, setEmpty] = React.useState(false);
  return <View onLayout={(e) => { const z = e.nativeEvent.layout.height < 1; if (z !== empty) setEmpty(z); }} style={empty ? { marginTop: -12 } : null}><Reveal index={index}>{children}</Reveal></View>;
}
const s = StyleSheet.create({
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'rgba(255,200,60,0.35)' },
  body: { padding: 16, gap: 12 }, bodyH: { padding: 16, paddingTop: 50, gap: 12 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 22, padding: 16, overflow: 'hidden' },
  eyebrow: { fontFamily: 'label', color: colors.muted, fontWeight: '700', fontSize: 11.5, letterSpacing: 1.8 }, more: { color: colors.muted, fontSize: 15 },
});
