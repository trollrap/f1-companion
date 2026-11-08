import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, Image, Linking, StyleSheet, Text as RNText } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Skeleton from '../components/Skeleton';
import Screen, { Card, Note } from '../components/Screen';
import Press from '../components/Press';
import Grad from '../components/Grad';
import { useAsync } from '../hooks/useAsync';
import { usePrefs } from '../hooks/usePrefs';
import { SOURCES, fetchNews, fetchArticle } from '../api/news';
import { colors, alpha } from '../theme';

export const ago = (ms) => { if (!ms) return ''; const m = Math.max(0, Math.round((Date.now() - ms) / 60000)); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; const d = Math.round(h / 24); return d < 7 ? `${d} d ago` : new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
// Latest motorsport news from the sources the user picked. Tap a story to read it in your browser.
export default function NewsScreen({ navigation }) {
  const { prefs, setOpt } = usePrefs(); const sel = Array.isArray(prefs.opts.newsSel) && prefs.opts.newsSel.length ? prefs.opts.newsSel : SOURCES.map((s) => s.id);
  const [n, setN] = useState(0); const [shown, setShown] = useState(10);
  const d = useAsync(() => fetchNews(sel, n ? { fresh: true } : undefined), [sel.join(','), n]);
  const toggle = (id) => { const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]; if (next.length) setOpt('newsSel', next); };
  const items = d.v?.items || [];
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>News</Text>
        <Pressable onPress={() => setN(n + 1)} hitSlop={10} accessibilityLabel="Reload news" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6 }, pressed && { opacity: 0.6 }]}><Ionicons name="refresh" size={18} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Reload</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SOURCES.map((s) => { const on = sel.includes(s.id); return (
          <Pressable key={s.id} onPress={() => toggle(s.id)} style={({ pressed }) => [{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface2 }, pressed && { opacity: 0.7 }]}>
            <Text style={{ color: on ? colors.fg : colors.muted, fontWeight: '600', fontSize: 14 }}>{s.name}</Text></Pressable>); })}
      </View>
      {d.loading && <Skeleton rows={4} />}
      {d.error && <Note>News could not be loaded: {d.error}</Note>}
      {d.v && !items.length && <Note>No stories right now. Check your connection, or pick more sources.</Note>}
      {d.v?.failed?.length ? <Note>{`Not reachable right now: ${d.v.failed.join(', ')}.`}</Note> : null}
      {items.slice(0, shown).map((x, i) => (
        <Story key={x.id} x={x} i={i} />))}
      {items.length > shown ? <Press onPress={() => setShown(shown + 8)}><View style={{ height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`Show more (${items.length - shown})`}</Text></View></Press> : null}
    </Screen>
  );
}
// One story. Memoised and drawn with plain views, so a long list stays smooth; tapping opens the article in the phone's browser.
const Story = React.memo(function Story({ x, i }) {
  // Pictures are fetched after the card has appeared (and scaled down by the system), so adding more stories never freezes the list.
  const [pic, setPic] = useState(false); useEffect(() => { const h = setTimeout(() => setPic(true), 80); return () => clearTimeout(h); }, []);
  const img = (style) => (pic && x.image ? <Image source={{ uri: x.image }} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={style} /> : <View style={style} />);
  return (
        <Press onPress={() => Linking.openURL(x.link).catch(() => {})} scale={0.985}>
          <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: i === 0 ? colors.cardC : colors.cardA, borderWidth: 1, borderColor: alpha(colors.accent, 0.3) }}>
            {x.image && i === 0 ? img({ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surface2 }) : null}
            <View style={{ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.accent, fontFamily: 'label', fontSize: 11, letterSpacing: 1.4 }}>{`${x.sourceName.toUpperCase()}${x.date ? ` · ${ago(x.date).toUpperCase()}` : ''}`}</Text>
                <Text style={{ color: colors.fg, fontSize: i === 0 ? 21 : 18, fontWeight: '700', lineHeight: i === 0 ? 25 : 22 }} numberOfLines={4}>{x.title}</Text>
              </View>
              {x.image && i !== 0 ? img({ width: 86, height: 86, borderRadius: 12, backgroundColor: colors.surface2 }) : null}
            </View>
          </View>
        </Press>
  );
});
// A story read inside the app: picture, text and pictures from the article, then a link to the original.
export function ArticleScreen({ route }) {
  const { item } = route.params; const body = useAsync(() => fetchArticle(item), [item.id]);
  return (
    <Screen header={false}>
      {item.image ? <Image source={{ uri: item.image }} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16, backgroundColor: colors.surface2 }} /> : null}
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.accent, fontFamily: 'label', fontSize: 12, letterSpacing: 1.6 }}>{`${item.sourceName.toUpperCase()}${item.date ? ` · ${ago(item.date).toUpperCase()}` : ''}`}</Text>
        <RNText style={{ fontFamily: 'sans-serif', color: colors.fg, fontSize: 26, fontWeight: '800', lineHeight: 32 }}>{item.title}</RNText>
      </View>
      {body.loading && <Skeleton rows={5} />}
      {(body.v || []).map((b, i) => b.t === 'img'
        ? <Image key={i} source={{ uri: b.v }} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: colors.surface2 }} />
        : b.t === 'h' ? <RNText key={i} style={{ fontFamily: 'sans-serif', color: colors.fg, fontSize: 20, fontWeight: '800', marginTop: 8 }}>{b.v}</RNText>
        : b.t === 'quote' ? <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 12 }}><RNText style={{ fontFamily: 'sans-serif', color: colors.fg, fontSize: 17, fontStyle: 'italic', lineHeight: 27 }}>{b.v}</RNText></View>
        : <RNText key={i} style={{ fontFamily: 'sans-serif', color: colors.fg, opacity: 0.93, fontSize: 17, lineHeight: 27, letterSpacing: 0.1 }}>{b.v}</RNText>)}
      {item.link ? (
        <Press onPress={() => Linking.openURL(item.link).catch(() => {})}>
          <View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}>
            <Ionicons name="open-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`Read the original on ${item.sourceName}`}</Text>
          </View>
        </Press>) : null}
    </Screen>
  );
}
