import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import { StatHeader, SectionLabel } from '../components/StatRows';
import { usePrefs } from '../hooks/usePrefs';
import { PAGES } from '../lib/pages';
import { GROUPS } from '../lib/statsGroups';
import { GAMES } from '../lib/gameCatalog';
import { norm } from '../lib/names';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';

const MAX = 8;
const byRoute = Object.fromEntries(PAGES.map((p) => [p[0], p]));
// Choose the shortcuts shown at the top of Home. The list is kept in a ref so quick taps never act on an old copy of it.
export default function PinnedPagesScreen() {
  const { prefs, setOpt } = usePrefs(); const have = (prefs.opts.pins || []).filter((r) => byRoute[r]); const live = useRef(have); live.current = have;
  const [q, setQ] = useState(''); const [msg, setMsg] = useState('');
  const set = (next) => { live.current = next; setOpt('pins', next); };
  const toggle = (r) => { const cur = live.current; if (cur.includes(r)) { set(cur.filter((x) => x !== r)); setMsg(''); hap.tap(); } else if (cur.length >= MAX) { setMsg(`Home holds ${MAX} shortcuts. Unpin one first.`); hap.bad(); } else { set([...cur, r]); setMsg(''); hap.tap(); } };
  const move = (i, d) => { const cur = live.current.slice(); const j = i + d; if (j < 0 || j >= cur.length) return; [cur[i], cur[j]] = [cur[j], cur[i]]; set(cur); hap.tap(); };
  const n = norm(q); const shown = (r) => !n || norm(`${byRoute[r][1]} ${byRoute[r][2] || ''}`).includes(n);
  const gameRoutes = new Set(GAMES.map((g) => g.r)); const statRoutes = new Set(GROUPS.flatMap((g) => g[3]));
  const groups = [...GROUPS.map(([name, icon, tint, routes]) => ({ name, tint, routes })), { name: 'Games', tint: colors.purple, routes: PAGES.map((p) => p[0]).filter((r) => gameRoutes.has(r)) }, { name: 'Everything else', tint: colors.muted, routes: PAGES.map((p) => p[0]).filter((r) => !gameRoutes.has(r) && !statRoutes.has(r) && r !== 'PinnedPages') }];
  const Pill = ({ on, onPress, label }) => (<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: on ? alpha(colors.accent, 0.2) : alpha(colors.fg, 0.08), borderWidth: 1, borderColor: on ? colors.accent : colors.line }}><Text style={{ color: on ? colors.accent : colors.fg, fontWeight: '800', fontSize: 13 }}>{on ? 'Pinned' : 'Pin'}</Text></Pressable>);
  return (
    <Screen header={false}>
      <StatHeader title="Pinned pages" icon="pin" color={colors.accent} note={`The shortcuts at the top of Home, in this order. ${have.length} of ${MAX} used.`} />
      <SectionLabel>On Home</SectionLabel>
      {have.length ? (<View style={{ gap: 6 }}>{have.map((r, i) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ width: 20, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text>
          <Text style={{ flex: 1, color: colors.fg, fontWeight: '700' }} numberOfLines={1}>{byRoute[r][1]}</Text>
          {[['arrow-up', -1, i === 0], ['arrow-down', 1, i === have.length - 1]].map(([ic, d, off]) => (<Pressable key={ic} accessibilityRole="button" accessibilityLabel={d < 0 ? 'Move up' : 'Move down'} disabled={off} hitSlop={6} onPress={() => move(i, d)} style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.fg, 0.08), opacity: off ? 0.3 : 1 }}><Ionicons name={ic} size={17} color={colors.fg} /></Pressable>))}
          <Pressable accessibilityRole="button" accessibilityLabel="Unpin" hitSlop={6} onPress={() => toggle(r)} style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.accent, 0.18) }}><Ionicons name="close" size={18} color={colors.accent} /></Pressable>
        </View>))}
        <Pressable accessibilityRole="button" onPress={() => set([])} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}><Text style={{ color: colors.muted, fontWeight: '700' }}>Unpin all</Text></Pressable></View>)
        : <Note>Nothing pinned yet. Pick pages below.</Note>}
      {msg ? <Text style={{ color: colors.accent, fontWeight: '700' }}>{msg}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search pages" placeholderTextColor={colors.muted} accessibilityLabel="Search pages" autoCorrect={false} style={{ flex: 1, color: colors.fg, fontSize: 16, paddingVertical: 12 }} />
      </View>
      {groups.map((g) => { const rs = g.routes.filter((r) => byRoute[r] && shown(r)); if (!rs.length) return null;
        return (<View key={g.name} style={{ gap: 6 }}><SectionLabel color={g.tint}>{`${g.name} (${rs.length})`}</SectionLabel>
          {rs.map((r) => { const on = have.includes(r);
            return (<View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: on ? alpha(colors.accent, 0.5) : colors.line }}>
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '700' }} numberOfLines={1}>{byRoute[r][1]}</Text>{byRoute[r][2] ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{byRoute[r][2]}</Text> : null}</View>
              <Pill on={on} onPress={() => toggle(r)} label={`${on ? 'Unpin' : 'Pin'} ${byRoute[r][1]}`} />
            </View>); })}</View>); })}
    </Screen>);
}
