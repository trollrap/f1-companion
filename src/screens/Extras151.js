import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import { Btn } from '../components/FunBits';
import Grad from '../components/Grad';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { Alert } from '../lib/dialog';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { kvGet, kvSet } from '../lib/kv';
import { driverPhoto } from '../lib/media';
import * as hap from '../lib/haptics';
import { localAllDrivers, careerStats, titlesOf, careerTeams } from '../api/history';
import { CIRCUITS } from '../data/circuits';

// ---------- Poster maker: a driver poster to share ----------
const STAT_DEFS = { wins: ['Wins', (c) => c.wins], podiums: ['Podiums', (c) => c.podiums], poles: ['Poles', (c) => c.poles], starts: ['Starts', (c) => c.races], titles: ['Titles', (c, id) => titlesOf(id)], points: ['Points', (c) => Math.round(c.points)] };
const PALETTE = [['Red', '#E10600'], ['Gold', '#F5C542'], ['Blue', '#3B9CFF'], ['Green', '#3DD16C'], ['Violet', '#9B6BFF'], ['Orange', '#FF8000'], ['Teal', '#27C9B5'], ['Pink', '#FF5FA2'], ['White', '#FFFFFF'], ['Black', '#16181D']];
export function PosterScreen() {
  const all = useMemo(() => { try { return localAllDrivers(); } catch { return []; } }, []);
  const [id, setId] = useState('max_verstappen'); const [q, setQ] = useState(''); const [pick, setPick] = useState(['wins', 'podiums', 'titles']); const [col, setCol] = useState(PALETTE[0][1]); const [lay, setLay] = useState('bold');
  const info = all.find((d) => d.driverId === id) || all.find((d) => d.last === 'Verstappen') || null;
  const c = useMemo(() => { try { return info ? careerStats(info.driverId) : null; } catch { return null; } }, [info?.driverId]); // eslint-disable-line react-hooks/exhaustive-deps
  const team = useMemo(() => { try { return info ? careerTeams(info.driverId)?.main : ''; } catch { return ''; } }, [info?.driverId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sugg = useMemo(() => { const n = norm(q); if (n.length < 2) return []; return all.filter((d) => norm(d.name).includes(n)).sort((a, b) => (b.last_year || 0) - (a.last_year || 0)).slice(0, 6); }, [q, all]);
  const toggle = (k) => setPick((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length < 3 ? [...p, k] : [...p.slice(1), k]));
  if (!info || !c) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const photo = driverPhoto(info.driverId);
  const text = `${info.name}: ${pick.map((k) => `${STAT_DEFS[k][1](c, info.driverId)} ${STAT_DEFS[k][0].toLowerCase()}`).join(', ')}. F1 Companion`;
  return (
    <Screen header={false}>
      <StatHeader title="Poster maker" icon="sparkles" note="Pick any driver from the history, three stats and a colour, then share the poster as a picture." />
      <TextInput value={q} onChangeText={setQ} placeholder="Search a driver" placeholderTextColor={colors.muted} accessibilityLabel="Search a driver" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} />
      {sugg.map((d) => (<Pressable key={d.driverId} accessibilityRole="button" onPress={() => { setId(d.driverId); setQ(''); hap.tap(); }} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg }}>{d.name}</Text></Pressable>))}
      <ShareCard title={text}>
        <Grad color={col} from={0.65} to={0.1} dir="v" radius={18} style={{ aspectRatio: 0.8, padding: 22, justifyContent: 'space-between' }}>
          {info.number && lay !== 'min' ? <Text style={{ position: 'absolute', left: lay === 'split' ? undefined : -6, right: lay === 'split' ? -6 : undefined, top: 40, color: alpha(colors.fg, 0.12), fontSize: 230, fontWeight: '900', fontStyle: 'italic' }}>{info.number}</Text> : null}
          {photo && lay !== 'min' ? <Image source={photo} resizeMode="contain" style={{ position: 'absolute', ...(lay === 'split' ? { left: -10 } : { right: -10 }), bottom: 60, width: '78%', height: '72%', opacity: 0.95 }} /> : null}
          <View style={lay === 'split' ? { alignItems: 'flex-end' } : null}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '600', opacity: 0.85 }}>{info.first}</Text><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', letterSpacing: 1 }} numberOfLines={1} adjustsFontSizeToFit>{String(info.last).toUpperCase()}</Text>{team ? <Text style={{ color: colors.fg, opacity: 0.8, marginTop: 2 }}>{team}</Text> : null}</View>
          <View>
            <View style={{ flexDirection: 'row', gap: 10 }}>{pick.map((k) => (<View key={k} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: alpha('#000000', 0.35) }}><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '900' }}>{STAT_DEFS[k][1](c, info.driverId)}</Text><Text style={{ color: colors.fg, opacity: 0.8, fontSize: 12 }}>{STAT_DEFS[k][0]}</Text></View>))}</View>
            <Text style={{ color: colors.fg, opacity: 0.7, fontSize: 11, marginTop: 10, letterSpacing: 2 }}>{`F1 COMPANION · ${c.first || ''}${c.last && c.last !== c.first ? ` TO ${c.last}` : ''}`}</Text>
          </View>
        </Grad>
      </ShareCard>
      <Eyebrow>Layout</Eyebrow>
      <Segmented value={lay} onChange={setLay} items={[['bold', 'Bold'], ['split', 'Split'], ['min', 'Minimal']]} />
      <Eyebrow>Stats (pick three)</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.keys(STAT_DEFS).map((k) => (<Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: pick.includes(k) }} onPress={() => toggle(k)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: pick.includes(k) ? alpha(colors.accent, 0.25) : colors.card, borderWidth: 1, borderColor: pick.includes(k) ? colors.accent : colors.line }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 13 }}>{STAT_DEFS[k][0]}</Text></Pressable>))}</View>
      <Eyebrow>Colour</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 10 }}>{PALETTE.map(([n, h]) => (<Pressable key={h} accessibilityRole="button" accessibilityLabel={n} onPress={() => setCol(h)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: h, borderWidth: col === h ? 3 : 0, borderColor: colors.fg }} />))}</View>
    </Screen>);
}

// ---------- Favourite circuits: mark the ones you love and the ones you have been to ----------
export function FavCircuitsScreen() {
  const [m, setM] = useState(null); const [f, setF] = useState('all');
  useEffect(() => { kvGet('circuitMarks', {}).then(setM); }, []);
  if (!m) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const flip = (key, what) => { hap.tap(); const cur = m[key] || {}; const n = { ...m, [key]: { ...cur, [what]: !cur[what] } }; setM(n); kvSet('circuitMarks', n); };
  const loved = CIRCUITS.filter((c) => m[c.key]?.love), been = CIRCUITS.filter((c) => m[c.key]?.been);
  const list = CIRCUITS.filter((c) => f === 'all' || (f === 'love' && m[c.key]?.love) || (f === 'been' && m[c.key]?.been));
  const Tog = ({ on, icon, label, onPress }) => (<Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: on ? alpha(colors.accent, 0.22) : alpha(colors.fg, 0.06) }}><Ionicons name={on ? icon : `${icon}-outline`} size={16} color={on ? colors.accent : colors.muted} /><Text style={{ color: on ? colors.fg : colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text></Pressable>);
  return (
    <Screen header={false}>
      <ShareCard title={`My F1 circuits: ${loved.length} loved (${loved.map((c) => c.place.split(',')[0]).join(', ') || 'none yet'}), ${been.length} visited.`}>
        <Card><Eyebrow>My circuits</Eyebrow><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{`${loved.length} loved · ${been.length} visited`}</Text><Note>{loved.length ? `Loved: ${loved.map((c) => c.place.split(',')[0]).join(', ')}` : 'Tap the heart on a circuit to love it, and the flag if you have been there.'}</Note></Card>
      </ShareCard>
      <Segmented value={f} items={[['all', 'All'], ['love', 'Loved'], ['been', 'Visited']]} onChange={setF} />
      {list.map((c) => (
        <Card key={c.key} style={{ borderLeftWidth: 4, borderLeftColor: m[c.key]?.love ? colors.accent : m[c.key]?.been ? colors.good : colors.line }}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{c.place}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Tog on={!!m[c.key]?.love} icon="heart" label="Love" onPress={() => flip(c.key, 'love')} /><Tog on={!!m[c.key]?.been} icon="flag" label="Been there" onPress={() => flip(c.key, 'been')} /></View>
        </Card>))}
      {!list.length ? <Note>Nothing here yet.</Note> : null}
    </Screen>);
}

// ---------- Data freshness: how old each downloaded source is, with a refresh per source ----------
const SRC = [['api.jolpi.ca', 'Race results and standings (Jolpica)'], ['api.openf1.org', 'Sessions, weather and live timing (OpenF1)'], ['site.api.espn.com', 'Football (ESPN)'], ['api.motogp.pulselive.com', 'MotoGP'], ['other', 'News feeds and everything else']];
const hostOf = (k) => { const m = /^c:https?:\/\/([^/]+)/.exec(k); return m ? m[1] : 'other'; };
const ago = (ms) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); if (s < 90) return 'just now'; const m = Math.round(s / 60); if (m < 90) return `${m} min ago`; const h = Math.round(m / 60); if (h < 48) return `${h} h ago`; return `${Math.round(h / 24)} days ago`; };
export function FreshnessScreen() {
  const [rows, setRows] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('c:')); const pairs = await AsyncStorage.multiGet(keys); const out = {};
      pairs.forEach(([k, v]) => { const h = hostOf(k); const g = SRC.some((s) => s[0] === h) ? h : 'other'; const t = Number(((v || '').slice(0, 40).match(/"t":(\d+)/) || [])[1]) || 0; const o = (out[g] ||= { n: 0, newest: 0, oldest: Infinity, keys: [] }); o.n++; o.keys.push(k); if (t) { o.newest = Math.max(o.newest, t); o.oldest = Math.min(o.oldest, t); } });
      setRows(out); } catch { setRows({}); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refresh = (g) => Alert.alert('Refresh this source?', 'Its saved copy is removed, so the next screen that needs it downloads fresh data. Needs a connection.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Refresh', onPress: async () => { setBusy(true); try { await AsyncStorage.multiRemove(rows[g].keys); } catch {} setBusy(false); load(); } }]);
  if (!rows) return <Screen header={false}><Note>Loading…</Note></Screen>;
  return (
    <Screen header={false}>
      <StatHeader title="Data freshness" icon="sparkles" note="The app keeps a saved copy of everything it downloads, and refreshes it in the background when you open a screen. This shows how recent each saved copy is. Past seasons come from the built-in history and never change." />
      {SRC.map(([g, label]) => { const r = rows[g]; return (
        <Card key={g}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>
          {r && r.n ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{`${r.n} saved item${r.n === 1 ? '' : 's'}${r.newest ? ` · newest ${ago(r.newest)}, oldest ${ago(r.oldest)}` : ''}`}</Text> : <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Nothing saved yet.</Text>}
          {r && r.n ? <View style={{ marginTop: 8 }}><Btn onPress={() => refresh(g)} disabled={busy}>Refresh this source</Btn></View> : null}
        </Card>); })}
    </Screen>);
}
