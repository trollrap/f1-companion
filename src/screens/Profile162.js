import React, { useMemo, useState, useCallback } from 'react';
import { View, TextInput, Image, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import Grad from '../components/Grad';
import ShareCard from '../components/ShareCard';
import Dropdown from '../components/Dropdown';
import Press from '../components/Press';
import { HeadShot } from '../components/Shared';
import { StatHeader, SectionLabel } from '../components/StatRows';
import { usePrefs } from '../hooks/usePrefs';
import { colors, alpha, teamColor } from '../theme';
import { kvGet } from '../lib/kv';
import { loadCards } from '../lib/cards';
import { localAllDrivers } from '../api/history';
import { GRID_2027 } from '../data/season2027';
import { pickImage } from '../fun/store';
import { TROPHIES, BESTS } from './TrophyRoom';
import { currentVersion } from '../lib/update';
import * as hap from '../lib/haptics';

// Your own profile: name, photo, favourite driver and team, race number, and what the card shows. Kept on this phone (and in backups).
const EMPTY = { name: '', photo: '', driverId: '', teamId: '', number: '', show: { photo: true, driver: true, team: true, number: true, stats: true, bests: true } };
const SHOW = [['photo', 'Photo'], ['driver', 'Favourite driver'], ['team', 'Favourite team'], ['number', 'Race number'], ['stats', 'Trophies and cards'], ['bests', 'Best scores']];
const DRIVERS = (() => { try { return localAllDrivers().filter((d) => (d.last_year || 0) >= 2025).sort((a, b) => a.name.localeCompare(b.name)); } catch { return []; } })();
const TEAMS = GRID_2027.map((t) => [t.teamId, t.name]);
export const useProfile = () => { const { prefs, setOpt } = usePrefs(); const p = { ...EMPTY, ...(prefs.opts.profile || {}), show: { ...EMPTY.show, ...((prefs.opts.profile || {}).show || {}) } }; return [p, (patch) => setOpt('profile', { ...p, ...patch, show: { ...p.show, ...(patch.show || {}) } })]; };
export function Avatar({ p, size = 64 }) {
  return p.photo ? <Image source={{ uri: p.photo }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: alpha(colors.fg, 0.4) }} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(colors.accent, 0.3), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.fg, fontSize: size * 0.42, fontWeight: '800' }}>{(p.name || '?').trim().charAt(0).toUpperCase() || '?'}</Text></View>;
}
export default function ProfileScreen() {
  const [p, set] = useProfile(); const [d, setD] = useState(null); const [msg, setMsg] = useState('');
  useFocusEffect(useCallback(() => { let off = false; (async () => { const m = await loadCards().catch(() => ({ owned: {}, keys: {} })); const keys = m.keys || {}; const bests = []; for (const [k, l] of BESTS) { const v = await kvGet(k, 0); if (typeof v === 'number' && v > 0) bests.push([l, v]); } if (!off) setD({ trophies: TROPHIES.filter((t) => keys[t[0]]).length, cards: Object.keys(m.owned || {}).length, bests: bests.sort((a, b) => b[1] - a[1]).slice(0, 3) }); })(); return () => { off = true; }; }, []));
  const drv = useMemo(() => DRIVERS.find((x) => x.driverId === p.driverId), [p.driverId]); const team = TEAMS.find(([v]) => v === p.teamId);
  const tc = p.teamId ? teamColor(p.teamId) : colors.accent;
  const photo = async () => { const r = await pickImage(); if (r.uri) set({ photo: r.uri }); else if (r.error) setMsg(r.error); };
  const Input = (props) => <TextInput placeholderTextColor={colors.muted} style={{ color: colors.fg, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }} {...props} />;
  return (
    <Screen header={false}>
      <StatHeader title="My profile" icon="person-circle" note="Create yourself: a name, a photo, your favourite driver and team and your race number. Choose below what shows on your card." />
      <ShareCard title={`${p.name || 'My F1 profile'}${drv ? ` · ${drv.name}` : ''}${team ? ` · ${team[1]}` : ''}`}>
        <Grad color={tc} from={0.55} to={0.06} radius={22} border={0.4} style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: colors.onSoft, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>F1 COMPANION PROFILE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {p.show.photo ? <Avatar p={p} size={72} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900' }} numberOfLines={1}>{p.name || 'Your name'}</Text>
              {p.show.team && team ? <Text style={{ color: colors.onSoft, fontSize: 14 }}>{team[1]} fan</Text> : null}
            </View>
            {p.show.number && p.number ? <Text style={{ color: alpha(colors.fg, 0.9), fontSize: 44, fontWeight: '900', fontStyle: 'italic' }}>{p.number}</Text> : null}
          </View>
          {p.show.driver && drv ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><HeadShot id={drv.driverId} size={44} color={tc} /><View><Text style={{ color: colors.muted, fontSize: 11 }}>Favourite driver</Text><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{drv.name}</Text></View></View> : null}
          {p.show.stats && d ? <View style={{ flexDirection: 'row', gap: 22 }}><View><Text style={{ color: colors.gold, fontSize: 22, fontWeight: '800' }}>{`${d.trophies}/${TROPHIES.length}`}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Trophies</Text></View><View><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{d.cards}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Cards</Text></View></View> : null}
          {p.show.bests && d && d.bests.length ? <View style={{ gap: 2 }}>{d.bests.map(([l, v]) => <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.onSoft, fontSize: 13 }}>{l}</Text><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 13 }}>{v}</Text></View>)}</View> : null}
          <Text style={{ color: colors.muted, fontSize: 11 }}>{`F1 Companion ${currentVersion()}`}</Text>
        </Grad>
      </ShareCard>
      <SectionLabel>About you</SectionLabel>
      <Input value={p.name} onChangeText={(t) => set({ name: t.slice(0, 24) })} placeholder="Your name or nickname" accessibilityLabel="Your name" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Press onPress={photo} style={{ flex: 1 }} accessibilityLabel="Choose a photo"><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}><Ionicons name="image-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700' }}>{p.photo ? 'Change photo' : 'Choose photo'}</Text></View></Press>
        {p.photo ? <Press onPress={() => set({ photo: '' })} accessibilityLabel="Remove the photo"><View style={{ minHeight: 46, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontWeight: '700' }}>Remove</Text></View></Press> : null}
      </View>
      {msg ? <Note>{msg}</Note> : null}
      <SectionLabel>Favourites</SectionLabel>
      <Dropdown value={p.driverId || ''} options={[['', 'None'], ...DRIVERS.map((x) => [x.driverId, x.name])]} onChange={(v) => { const x = DRIVERS.find((q) => q.driverId === v); set({ driverId: v, ...(x && x.number && !p.number ? { number: x.number } : {}) }); }} prefix="Driver" />
      <Dropdown value={p.teamId || ''} options={[['', 'None'], ...TEAMS]} onChange={(v) => set({ teamId: v })} prefix="Team" />
      <SectionLabel>Race number</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Input value={p.number} onChangeText={(t) => set({ number: t.replace(/\D/g, '').slice(0, 2) })} placeholder="1 to 99" keyboardType="number-pad" accessibilityLabel="Race number" /></View>
        {drv && drv.number ? <Press onPress={() => { hap.tap(); set({ number: drv.number }); }}><View style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontWeight: '800' }}>{`Use ${drv.last}'s #${drv.number}`}</Text></View></Press> : null}
      </View>
      <SectionLabel>Show on my card</SectionLabel>
      <Card>{SHOW.map(([k, l], i) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
          <Text style={{ flex: 1, color: colors.fg, fontWeight: '600', fontSize: 16 }}>{l}</Text>
          <Switch value={!!p.show[k]} onValueChange={(v) => { hap.tap(); set({ show: { [k]: v } }); }} trackColor={{ true: colors.accent, false: colors.line }} thumbColor="#fff" />
        </View>))}</Card>
    </Screen>);
}
