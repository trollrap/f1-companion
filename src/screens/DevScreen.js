import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, LayoutAnimation } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import { Field, Btn } from '../components/FunBits';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { Alert } from '../lib/dialog';
import { usePrefs } from '../hooks/usePrefs';
import { useFun, pickImage } from '../fun/store';
import { runWeekend, runSeason } from '../fun/sim';
import { devSet, devClear, devSnapshot, devResetAll } from '../lib/dev';
import { clearCache } from '../lib/cache';
import { restartApp } from '../lib/reload';
import { checkOta } from '../lib/ota';
import { currentVersion } from '../lib/update';

const COLOR_KEYS = ['bg', 'surface', 'surface2', 'line', 'fg', 'muted', 'accent', 'accentSoft', 'cardA', 'cardB', 'cardC', 'good', 'gold', 'red', 'purple', 'sprint'];
const PHOTO_KINDS = [['drivers', 'Driver photo'], ['cars', 'Car'], ['logos', 'Team logo'], ['principals', 'Principal'], ['engineers', 'Engineer'], ['numbers', 'Number']];
const HEX = /^#[0-9a-f]{6}$/i;
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

function Sec({ title, icon, children, open: o0 = false }) {
  const [open, setOpen] = useState(o0);
  return (
    <Card>
      <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); setOpen(!open); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon} size={20} color={colors.accent} /><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', flex: 1 }}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? <View style={{ gap: 10, marginTop: 12 }}>{children}</View> : null}
    </Card>
  );
}

export default function DevScreen() {
  const { prefs, setOpt } = usePrefs(); const fun = useFun();
  const [persist, setPersist] = useState(true); const [, tick] = useState(0); const bump = () => tick((n) => n + 1);
  const toast = (m) => Alert.alert('Done', m);
  // ---------------- colours
  const [cv, setCv] = useState({});
  const applyColor = async (k) => { const v = (cv[k] ?? colors[k]).trim(); if (!HEX.test(v)) { Alert.alert('Not a colour', 'Use a hex colour like #1A2B3C.'); return; } await devSet('colors', k, v.toUpperCase(), persist); bump(); };
  // ---------------- photos
  const [pk, setPk] = useState('drivers'); const [pid, setPid] = useState(''); const [purl, setPurl] = useState('');
  const savePhoto = async (uri) => { const id = pid.trim(); if (!id || !uri) { Alert.alert('Missing', 'Fill in the id and a picture.'); return; } await devSet(`photos.${pk}`, id, uri, persist); setPurl(''); bump(); };
  const gallery = async () => { const r = await pickImage(); if (r.error) { Alert.alert('Photos', r.error); return; } if (r.uri) await savePhoto(r.uri); };
  // ---------------- team colours
  const [tid, setTid] = useState(''); const [tcol, setTcol] = useState('');
  // ---------------- fantasy editor
  const saves = fun.fantasies || []; const [sid, setSid] = useState(null); const f = fun.get(sid || saves[0]?.id) || null; const fid = f?.id;
  const snaps = useRef({});
  const edit = (fn) => { if (!fid) return; if (!persist && !snaps.current[fid]) snaps.current[fid] = fun.get(fid); fun.update(fid, fn); };
  const [teamId, setTeamId] = useState(null); const team = f?.teams.find((t) => t.id === (teamId || f?.teams[0]?.id)); const [drvId, setDrvId] = useState(null); const drv = f?.drivers.find((d) => d.id === (drvId || f?.drivers[0]?.id));
  const patchTeam = (k, raw, numeric) => { const v = numeric ? num(raw) : raw; if (numeric && v == null) return; edit((g) => ({ ...g, teams: g.teams.map((t) => (t.id === team.id ? { ...t, [k]: v } : t)) })); };
  const patchDrv = (k, raw, numeric) => { const v = numeric ? num(raw) : raw; if (numeric && v == null) return; edit((g) => ({ ...g, drivers: g.drivers.map((d) => (d.id === drv.id ? { ...d, [k]: v } : d)) })); };
  // ---------------- options
  const opts = prefs.opts || {}; const oldOpts = useRef({}); const [ov, setOv] = useState({});
  const applyOpt = async (k) => { let raw = ov[k]; if (raw == null) return; let val; try { val = JSON.parse(raw); } catch { val = raw; } if (!persist && !(k in oldOpts.current)) oldOpts.current[k] = opts[k]; await setOpt(k, val); bump(); };
  const [newK, setNewK] = useState(''); const [newV, setNewV] = useState('');
  // ---------------- storage
  const [keys, setKeys] = useState(null); const [sk, setSk] = useState(null); const [sv, setSv] = useState('');
  const loadKeys = useCallback(async () => { try { const ks = await AsyncStorage.getAllKeys(); const pairs = await AsyncStorage.multiGet(ks); setKeys(pairs.map(([k, v]) => [k, (v || '').length]).sort((a, b) => b[1] - a[1])); } catch (e) { Alert.alert('Storage', String(e?.message || e)); } }, []);
  const openKey = async (k) => { setSk(k); setSv((await AsyncStorage.getItem(k)) || ''); };
  // ---------------- misc
  const [boom, setBoom] = useState(false); if (boom) throw new Error('Test crash from the developer menu');
  const info = (() => { let U = {}; try { U = require('expo-updates'); } catch {} return [['Version', currentVersion()], ['Runtime', U.runtimeVersion || '-'], ['Update id', U.updateId || 'embedded'], ['Channel', U.channel || '-'], ['Created', U.createdAt ? String(U.createdAt) : '-'], ['Updates enabled', String(!!U.isEnabled)], ['Expo SDK', String(Constants.expoConfig?.sdkVersion || '-')]]; })();
  const ds = devSnapshot();
  const list = (obj) => Object.entries(obj || {});

  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Developer menu</Eyebrow>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 6 }}>Changes made here are applied as you choose below. Temporary changes disappear when the app is closed (fantasy edits can be reverted); Keep changes stay on the phone.</Text>
        <View style={{ marginTop: 10 }}><Segmented value={persist ? 'perm' : 'temp'} onChange={(v) => setPersist(v === 'perm')} items={[['temp', 'Temporary'], ['perm', 'Keep']]} /></View>
      </Card>

      <Sec title="Colours" icon="color-palette" >
        <Note>Edit any colour of the app. Some parts are drawn once at start-up, so tap Restart to see everything.</Note>
        {COLOR_KEYS.map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: HEX.test(cv[k] ?? colors[k]) ? (cv[k] ?? colors[k]) : colors.surface2, borderWidth: 1, borderColor: colors.line }} />
            <Field label={k} value={cv[k] ?? colors[k]} onChange={(x) => setCv({ ...cv, [k]: x })} style={{ flex: 1 }} maxLength={7} />
            <Pressable onPress={() => applyColor(k)} style={{ height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Set</Text></Pressable>
          </View>))}
        <Btn icon="refresh" onPress={() => restartApp().then((ok) => { if (!ok) Alert.alert('Restart', 'This build cannot restart itself. Close the app fully and open it again.'); })}>Restart the app</Btn>
        <Btn icon="trash-outline" onPress={async () => { for (const k of Object.keys(ds.all.colors)) await devClear('colors', k); toast('Colour overrides removed. Restart the app.'); bump(); }}>Remove all colour overrides</Btn>
      </Sec>

      <Sec title="Photos and logos" icon="image">
        <Dropdown value={pk} options={PHOTO_KINDS} onChange={setPk} prefix="Kind" />
        <Field label={pk === 'drivers' || pk === 'engineers' || pk === 'numbers' ? 'Driver id (e.g. max_verstappen)' : 'Team id (e.g. ferrari)'} value={pid} onChange={setPid} placeholder="id" />
        <Btn icon="images" tone="solid" onPress={gallery}>Choose from gallery</Btn>
        <Field label="Or an image link" value={purl} onChange={setPurl} placeholder="https://..." />
        <Btn icon="link" disabled={!purl.trim()} onPress={() => savePhoto(purl.trim())}>Use this link</Btn>
        {PHOTO_KINDS.flatMap(([k, label]) => list(ds.all.photos[k]).map(([id, u]) => (
          <View key={`${k}:${id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.fg, flex: 1, fontSize: 15 }} numberOfLines={1}>{`${label} · ${id}`}</Text>
            <Pressable onPress={async () => { await devClear(`photos.${k}`, id); bump(); }}><Ionicons name="close-circle" size={22} color={colors.red} /></Pressable>
          </View>)))}
      </Sec>

      <Sec title="Team colours" icon="brush">
        <Field label="Team id" value={tid} onChange={setTid} placeholder="e.g. ferrari" />
        <Field label="Colour (#RRGGBB)" value={tcol} onChange={setTcol} placeholder="#E8002D" maxLength={7} />
        <Btn icon="checkmark" tone="solid" onPress={async () => { if (!tid.trim() || !HEX.test(tcol.trim())) { Alert.alert('Check the fields', 'Fill in a team id and a hex colour.'); return; } await devSet('teamColors', tid.trim(), tcol.trim().toUpperCase(), persist); bump(); }}>Set team colour</Btn>
        {list(ds.all.teamColors).map(([id, c]) => (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c }} /><Text style={{ color: colors.fg, flex: 1 }}>{`${id}  ${c}`}</Text><Pressable onPress={async () => { await devClear('teamColors', id); bump(); }}><Ionicons name="close-circle" size={22} color={colors.red} /></Pressable></View>))}
      </Sec>

      <Sec title="Fantasy editor" icon="construct">
        {!saves.length ? <Note>No fantasy saves yet.</Note> : (<>
          <Dropdown value={fid} options={saves.map((x) => [x.id, x.name])} onChange={setSid} prefix="Save" />
          {f ? (<>
            <Eyebrow>Team</Eyebrow>
            <Dropdown value={team?.id} options={f.teams.map((t) => [t.id, t.name])} onChange={setTeamId} prefix="Team" />
            {team ? (<View style={{ gap: 8 }}>
              <Field label="Name" value={team.name} onChange={(x) => patchTeam('name', x)} />
              <Field label="Colour" value={team.color} onChange={(x) => { if (HEX.test(x)) patchTeam('color', x.toUpperCase()); }} maxLength={7} />
              {['car', 'rel', 'pit', 'dev'].map((k) => <Field key={k} label={k === 'car' ? 'Car rating' : k === 'rel' ? 'Reliability' : k === 'pit' ? 'Pit crew' : 'Development'} value={team[k] ?? ''} onChange={(x) => patchTeam(k, x, true)} keyboardType="decimal-pad" />)}
            </View>) : null}
            <Eyebrow>Driver</Eyebrow>
            <Dropdown value={drv?.id} options={f.drivers.map((d) => [d.id, `${d.name} · ${f.teams.find((t) => t.id === d.teamId)?.name || ''}`])} onChange={setDrvId} prefix="Driver" />
            {drv ? (<View style={{ gap: 8 }}>
              <Field label="Name" value={drv.name} onChange={(x) => patchDrv('name', x)} />
              <Field label="Rating" value={drv.ovr ?? ''} onChange={(x) => patchDrv('ovr', x, true)} keyboardType="decimal-pad" />
              <Field label="Number" value={drv.number ?? ''} onChange={(x) => patchDrv('number', x.replace(/[^0-9]/g, ''), true)} keyboardType="number-pad" maxLength={2} />
              <Field label="Contract years" value={drv.contract ?? 0} onChange={(x) => patchDrv('contract', x, true)} keyboardType="number-pad" />
              <Dropdown value={drv.teamId} options={f.teams.map((t) => [t.id, t.name])} onChange={(v) => patchDrv('teamId', v)} prefix="Team" />
            </View>) : null}
            {f.tp ? (<><Eyebrow>Team Principal</Eyebrow>
              <Field label="Budget" value={f.tp.budget} onChange={(x) => { const v = num(x); if (v != null) edit((g) => ({ ...g, tp: { ...g.tp, budget: v } })); }} keyboardType="decimal-pad" />
              <Field label="Reputation 0-100" value={f.tp.hype} onChange={(x) => { const v = num(x); if (v != null) edit((g) => ({ ...g, tp: { ...g.tp, hype: Math.max(0, Math.min(100, v)) } })); }} keyboardType="decimal-pad" /></>) : null}
            <Eyebrow>Quick actions</Eyebrow>
            <Btn icon="flag" onPress={() => edit((g) => runWeekend(g))}>Run the next race weekend</Btn>
            <Btn icon="fast-forward" onPress={() => edit((g) => runSeason(g))}>Run the rest of the season</Btn>
            {f.tp ? <Btn icon="cash" onPress={() => edit((g) => ({ ...g, tp: { ...g.tp, budget: Math.round((g.tp.budget + 100) * 10) / 10 } }))}>Add 100 budget</Btn> : null}
            <Btn icon="arrow-undo" onPress={() => fun.undo(fid)}>Undo last edit</Btn>
            {!persist ? <Btn icon="time" onPress={() => { const sn = snaps.current[fid]; if (!sn) { Alert.alert('Nothing to revert', 'No temporary edits were made on this save.'); return; } fun.update(fid, () => sn); delete snaps.current[fid]; toast('Temporary edits reverted.'); }}>Revert temporary edits</Btn> : null}
          </>) : null}
        </>)}
      </Sec>

      <Sec title="App options" icon="options">
        <Note>Every saved option of the app. Values are text or JSON (true, 12, "abc").</Note>
        {Object.keys(opts).sort().map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Field label={k} value={ov[k] ?? (typeof opts[k] === 'string' ? opts[k] : JSON.stringify(opts[k]))} onChange={(x) => setOv({ ...ov, [k]: x })} style={{ flex: 1 }} />
            <Pressable onPress={() => applyOpt(k)} style={{ height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Set</Text></Pressable>
          </View>))}
        <Eyebrow>New option</Eyebrow>
        <Field label="Name" value={newK} onChange={setNewK} /><Field label="Value" value={newV} onChange={setNewV} />
        <Btn icon="add" disabled={!newK.trim()} onPress={async () => { let v = newV; try { v = JSON.parse(newV); } catch {} await setOpt(newK.trim(), v); setNewK(''); setNewV(''); bump(); }}>Add option</Btn>
        {!persist ? <Btn icon="time" onPress={async () => { for (const k of Object.keys(oldOpts.current)) await setOpt(k, oldOpts.current[k]); oldOpts.current = {}; setOv({}); toast('Temporary option changes reverted.'); }}>Revert temporary option changes</Btn> : null}
      </Sec>

      <Sec title="Storage" icon="server">
        <Btn icon="list" onPress={loadKeys}>Show stored keys</Btn>
        {keys ? keys.map(([k, n]) => (
          <Pressable key={k} onPress={() => openKey(k)} style={{ flexDirection: 'row', paddingVertical: 6, gap: 8 }}><Text style={{ color: sk === k ? colors.accent : colors.fg, flex: 1, fontSize: 15 }} numberOfLines={1}>{k}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{n > 1024 ? `${Math.round(n / 102.4) / 10} KB` : `${n} B`}</Text></Pressable>)) : null}
        {sk ? (<View style={{ gap: 8 }}>
          <Eyebrow>{sk}</Eyebrow>
          <TextInput value={sv.length > 20000 ? `${sv.slice(0, 20000)}…` : sv} editable={sv.length <= 20000} onChangeText={setSv} multiline style={{ minHeight: 140, maxHeight: 320, color: colors.fg, backgroundColor: colors.surface2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.line, textAlignVertical: 'top', fontSize: 14 }} />
          {sv.length > 20000 ? <Note>Too large to edit here. You can still delete it.</Note> : <Btn icon="save" tone="solid" onPress={async () => { await AsyncStorage.setItem(sk, sv); toast('Saved. Restart the app so it reads the new value.'); loadKeys(); }}>Save this value</Btn>}
          <Btn icon="trash" onPress={() => Alert.alert('Delete key?', `${sk} will be removed from this phone.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem(sk); setSk(null); loadKeys(); } }])}>Delete this key</Btn>
        </View>) : null}
      </Sec>

      <Sec title="Actions" icon="flash">
        <Btn icon="trash-outline" onPress={async () => { await clearCache(); toast('Data cache cleared.'); }}>Clear data cache</Btn>
        <Btn icon="cloud-download" onPress={async () => { const o = await checkOta(); toast(`Update check: ${o.status}`); }}>Check for an update now</Btn>
        <Btn icon="chatbox" onPress={() => Alert.alert('Test popup', 'This is the app popup with three buttons.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }, { text: 'OK' }])}>Show a test popup</Btn>
        <Btn icon="bug" onPress={() => setBoom(true)}>Cause a test crash</Btn>
        <Btn icon="hand-left" onPress={async () => { await setOpt('welcomed', false); toast('The welcome screen will show on the next start.'); }}>Show the welcome screen again</Btn>
        <Btn icon="nuclear" onPress={() => Alert.alert('Remove all developer overrides?', 'Colours, photos and team colours set here are removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { await devResetAll(); bump(); toast('Removed. Restart the app.'); } }])}>Remove all developer overrides</Btn>
      </Sec>

      <Sec title="Info" icon="information-circle">
        {info.map(([k, v]) => <View key={k} style={{ flexDirection: 'row', gap: 10 }}><Text style={{ color: colors.muted, width: 120 }}>{k}</Text><Text style={{ color: colors.fg, flex: 1 }} selectable>{v}</Text></View>)}
      </Sec>
    </Screen>
  );
}
