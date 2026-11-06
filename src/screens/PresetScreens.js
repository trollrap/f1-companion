import React, { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import Press from '../components/Press';
import Dropdown from '../components/Dropdown';
import { Segmented } from '../components/Shared';
import { Avatar, Field, Btn, Slide } from '../components/FunBits';
import { useFun, pickImage, uid } from '../fun/store';
import { randomDriver, makeDriverAttrs, freeNumber, DRIVER_ATTRS, A, ovr } from '../fun/sim';
import { flagOfCountry, countryNames, flagOfPlace } from '../fun/geo';
import { driverPic } from '../fun/look';
import { colors, alpha } from '../theme';

const attrPatch = (d, k, v) => { const m = { ...A(d), [k]: v }; return { pace: m.pace, quali: m.quali, race: m.race, cons: m.cons, wet: m.wet, aggr: m.aggr, age: m.age, pot: m.pot, skill: ovr(m) }; };
// A library driver turned into a driver of a save or grid: new id, the team it joins, and a free number.
export function libDriver(g, teamId, item) {
  const used = g.drivers.map((d) => d.number);
  const { id, ...rest } = item;
  return { ...rest, id: uid(), teamId, number: used.includes(Number(item.number)) ? freeNumber(used) : Number(item.number) || freeNumber(used), me: false, ref: null, noRetire: item.noRetire || false };
}
export const libRace = (item) => ({ ...item, id: uid(), custom: true });

/* A small list of the saved drivers: tap one to add it. */
export function LibDriverPicker({ onPick, onClose }) {
  const fun = useFun(); const list = fun.library.drivers;
  return (
    <View style={{ gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: colors.fg, fontWeight: '700', fontSize: 16 }}>My saved drivers</Text><Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={colors.muted} /></Pressable></View>
      {!list.length ? <Text style={{ color: colors.muted }}>Nothing saved yet. Make drivers in Fun → Presets.</Text> : null}
      {list.map((d) => (<Press key={d.id} onPress={() => onPick(d)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}><Avatar source={driverPic(d)} color={colors.accent} label={d.number} size={38} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${d.nat ? flagOfCountry(d.nat) + ' ' : ''}overall ${ovr(d)} · age ${A(d).age}`}</Text></View><Ionicons name="add-circle-outline" size={22} color={colors.accent} /></View></Press>))}
    </View>
  );
}
export function LibRacePicker({ onPick, onClose }) {
  const fun = useFun(); const list = fun.library.races;
  return (
    <View style={{ gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: colors.fg, fontWeight: '700', fontSize: 16 }}>My saved races</Text><Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={colors.muted} /></Pressable></View>
      {!list.length ? <Text style={{ color: colors.muted }}>Nothing saved yet. Make races in Fun → Presets.</Text> : null}
      {list.map((r) => (<Press key={r.id} onPress={() => onPick(r)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}><Text style={{ fontSize: 22 }}>{r.flag || ''}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{`${r.name} · ${r.laps} laps${r.sprint ? ' · sprint' : ''}`}</Text><Ionicons name="add-circle-outline" size={22} color={colors.accent} /></View></Press>))}
    </View>
  );
}

/* One saved driver, edited in place (every attribute). */
function DriverPreset({ d, fun }) {
  const [open, setOpen] = useState(false); const [msg, setMsg] = useState('');
  const set = (patch) => fun.libUpdate('drivers', d.id, patch);
  const name = (first, last) => set({ first, last, name: `${first} ${last}`.trim() });
  const photo = async () => { const r = await pickImage(); if (r.uri) set({ photo: r.uri }); else if (r.error) setMsg(r.error); };
  return (
    <Grad color={colors.accent} from={0.22} to={0.03} radius={16} border={0.3} style={{ padding: 12, gap: 10 }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar source={driverPic(d)} color={colors.accent} label={d.number} size={42} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`#${d.number} · ${d.nat ? flagOfCountry(d.nat) + ' ' : ''}overall ${ovr(d)} · age ${A(d).age}`}</Text></View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}><Field label="First name" value={d.first || ''} onChange={(v) => name(v, d.last || '')} maxLength={16} style={{ flex: 1 }} /><Field label="Surname" value={d.last || ''} onChange={(v) => name(d.first || '', v)} maxLength={18} style={{ flex: 1 }} /></View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <Field label="Number" value={String(d.number ?? '')} onChange={(v) => { const x = v.replace(/[^0-9]/g, ''); if (x) set({ number: Number(x) }); }} keyboardType="number-pad" maxLength={2} style={{ width: 90 }} />
            <View style={{ flex: 1 }}><Dropdown value={d.nat || ''} options={[['', 'No nationality'], ...countryNames.map((n) => [n, `${flagOfCountry(n)}  ${n}`])]} onChange={(n) => set({ nat: n || null })} prefix="From" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}><Btn icon="image-outline" onPress={photo} style={{ flex: 1, height: 42 }}>{d.photo ? 'Change photo' : 'Add photo'}</Btn>{d.photo ? <Btn icon="close" onPress={() => set({ photo: null })} style={{ height: 42 }}>Remove</Btn> : null}</View>
          {msg ? <Note>{msg}</Note> : null}
          {DRIVER_ATTRS.map(([k, label]) => <Slide key={k} label={label} value={Math.round(A(d)[k])} min={30} max={99} color={colors.accent} onChange={(v) => set(attrPatch(d, k, v))} />)}
          <Slide label="Age" value={A(d).age} min={17} max={45} color={colors.accent} onChange={(v) => set(attrPatch(d, 'age', v))} />
          <Slide label="Potential" value={Math.round(A(d).pot)} min={30} max={99} color={colors.accent} onChange={(v) => set(attrPatch(d, 'pot', v))} />
          <Btn icon="trash-outline" onPress={() => Alert.alert(`Delete ${d.name}?`, 'It is removed from your presets. Saves that already use it keep it.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => fun.libRemove('drivers', d.id) }])}>Delete this preset</Btn>
        </View>) : null}
    </Grad>
  );
}
function RacePreset({ r, fun }) {
  const set = (patch) => fun.libUpdate('races', r.id, patch);
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 24 }}>{r.flag || '🏁'}</Text>
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${r.place || 'Custom'} · ${r.laps} laps`}</Text></View>
        <Pressable onPress={() => set({ sprint: !r.sprint })} style={{ paddingHorizontal: 9, height: 32, borderRadius: 10, justifyContent: 'center', backgroundColor: r.sprint ? colors.sprint : colors.bg, borderWidth: 1, borderColor: r.sprint ? colors.sprint : colors.line }}><Text style={{ color: r.sprint ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>SPRINT</Text></Pressable>
        <Pressable onPress={() => fun.libRemove('races', r.id)} hitSlop={8}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}><Field label="Laps" value={String(r.laps)} onChange={(v) => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); if (n) set({ laps: Math.min(200, n) }); }} keyboardType="number-pad" maxLength={3} style={{ width: 90 }} /></View>
    </View>
  );
}

/* Fun → Presets: saved drivers and races on their own, and whole grids. */
export function FantasyPresets({ navigation }) {
  const fun = useFun(); const [tab, setTab] = useState('grids');
  const [cn, setCn] = useState(''); const [cp, setCp] = useState(''); const [cc, setCc] = useState(''); const [cl, setCl] = useState('55');
  const newDriver = () => { const nm = randomDriver(fun.library.drivers); fun.libAdd('drivers', { id: uid(), ...nm, number: freeNumber(fun.library.drivers.map((x) => x.number)), photo: null, nat: null, ...makeDriverAttrs(68, 19 + Math.floor(Math.random() * 14)) }); };
  return (
    <Screen header={false}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>Presets are saved for later: drivers and races with no team or season, and full grids you can start a season from.</Text>
      <Segmented value={tab} onChange={setTab} items={[['grids', `Grids · ${fun.presets.length}`], ['drivers', `Drivers · ${fun.library.drivers.length}`], ['races', `Races · ${fun.library.races.length}`]]} />
      {tab === 'grids' && (<>
        {!fun.presets.length ? <Note>No grid preset yet. A grid preset is a full set of teams, drivers and races that you can edit and start any season from.</Note> : null}
        {fun.presets.map((g) => (
          <Press key={g.id} onPress={() => navigation.navigate('PresetGrid', { id: g.id })}>
            <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>{g.name}</Text><Text style={{ color: colors.muted, fontSize: 15 }}>{`${g.teams.length} teams · ${g.drivers.length} drivers · ${g.races.length} races`}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View></Card>
          </Press>))}
        <Btn tone="solid" icon="add-circle-outline" onPress={() => navigation.navigate('PresetNew')}>New grid preset</Btn>
      </>)}
      {tab === 'drivers' && (<>
        {!fun.library.drivers.length ? <Note>No saved drivers yet. Make one here, edit every attribute, then add it to any save from Setup or Transfers (Presets button).</Note> : null}
        {fun.library.drivers.map((d) => <DriverPreset key={d.id} d={d} fun={fun} />)}
        <Btn tone="solid" icon="person-add-outline" onPress={newDriver}>New driver</Btn>
      </>)}
      {tab === 'races' && (<>
        {fun.library.races.map((r) => <RacePreset key={r.id} r={r} fun={fun} />)}
        <Card>
          <Eyebrow>New race</Eyebrow>
          <View style={{ marginTop: 10, gap: 10 }}>
            <Field label="Race name" value={cn} onChange={setCn} placeholder="e.g. Midnight Street GP" />
            <Field label="Place" value={cp} onChange={setCp} placeholder="City" />
            <Dropdown value={cc || ''} options={[['', 'No flag'], ...countryNames.map((n) => [n, `${flagOfCountry(n)}  ${n}`])]} onChange={setCc} prefix="Country" />
            <Field label="Laps" value={cl} onChange={(x) => setCl(x.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" />
            <Btn icon="add" disabled={!cn.trim() || !parseInt(cl, 10)} onPress={() => { fun.libAdd('races', { id: uid(), name: cn.trim(), place: [cp.trim(), cc].filter(Boolean).join(', '), laps: parseInt(cl, 10), sprint: false, custom: true, flag: flagOfCountry(cc) || flagOfPlace(cp) }); setCn(''); setCp(''); setCc(''); }}>Save race</Btn>
          </View>
        </Card>
      </>)}
    </Screen>
  );
}
