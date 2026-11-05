import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad, { Scrim } from '../components/Grad';
import Press from '../components/Press';
import Dropdown from '../components/Dropdown';
import { Segmented, StatGrid } from '../components/Shared';
import ExportBar from '../components/ExportBar';
import { Avatar, Field, Stepper, Btn, Swatches, SessionCard } from '../components/FunBits';
import { useFun, pickImage, uid, canPickImage } from '../fun/store';
import { sessionsOf, standings, freeNumber, TEAM_COLORS } from '../fun/sim';
import { profileStats } from '../fun/profile';
import { usePrefs } from '../hooks/usePrefs';
import { usePaddockMeta } from '../hooks/useTeams';
import { CIRCUITS } from '../data/circuits';
import { colors, alpha } from '../theme';

const realNumbers = (meta) => Object.entries(meta?.drivers || {}).map(([id, d]) => ({ id, number: Number(d.number), name: id.replace(/_/g, ' ') })).filter((x) => x.number);
const dash = (v) => (v == null ? '—' : String(v));
export const nameParts = (full) => { const [first, ...rest] = String(full || '').trim().split(/\s+/); return { first: first || '', last: rest.join(' ') }; };

/* ------------------------------------------------------------------ Fun home (tab) */
export function FunHome({ navigation }) {
  const fun = useFun(); const { prefs } = usePrefs(); const p = fun.profile; const stats = profileStats(p, fun.fantasies);
  return (
    <Screen>
      <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>Fun</Text>
      <Note>Just for fun: nothing here touches the real data.</Note>
      <Press onPress={() => navigation.navigate('FunProfile')}>
        <Grad color={p?.color || colors.accent} from={0.6} to={0.08} radius={18} border={0.5} style={{ height: 138 }}>
          {p?.photo ? <View style={{ position: 'absolute', right: -6, bottom: -6 }}><Avatar uri={p.photo} size={150} radius={20} color={p.color} /></View> : null}
          {p?.photo ? <Scrim dir="h" from={0.6} to={0} style={{ right: '35%' }} /> : null}
          <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>YOUR DRIVER</Text>
            {p ? (<View><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{p.name || 'Unnamed'}</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>{`#${p.number || '–'} · ${p.team || 'No team'} · ${stats.races} races · ${stats.wins} wins`}</Text></View>)
              : (<View><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>Create your driver</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>Photo, number, team, seasons and results</Text></View>)}
          </View>
        </Grad>
      </Press>
      <View><Eyebrow>Fantasy seasons</Eyebrow></View>
      {fun.loaded && !fun.fantasies.length && <Note>No fantasy season yet. Make one: pick how many teams there are, choose the races and simulate.</Note>}
      {fun.fantasies.map((f) => {
        const done = f.races.filter((r) => sessionsOf(r).every((s) => f.results?.[r.id]?.[s])).length; const lead = done ? standings(f).drivers[0] : null;
        return (
          <Press key={f.id} onPress={() => navigation.navigate('Fantasy', { id: f.id })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 15 }}>{`Season ${f.season || 1} · ${f.teams.length} teams · ${done}/${f.races.length} races${lead ? ` · leader ${lead.last}` : ''}`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Card>
          </Press>);
      })}
      <Btn icon="add-circle-outline" tone="solid" onPress={() => navigation.navigate('FantasyNew')}>New fantasy season</Btn>
      <Btn icon="settings-outline" onPress={() => navigation.navigate('FunSettings')}>Fantasy settings</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ own profile */
export function FunProfile({ navigation }) {
  const fun = useFun(); const { prefs } = usePrefs(); const meta = usePaddockMeta(); const real = realNumbers(meta);
  const base = fun.profile || { name: prefs.opts.name || '', number: '', team: 'My Team', color: colors.accent, photo: null, seasons: [] };
  const [d, setD] = useState(base); const [msg, setMsg] = useState(''); const [dirty, setDirty] = useState(false); const init = useRef(false);
  useEffect(() => { if (fun.loaded && !init.current) { init.current = true; if (fun.profile) setD(fun.profile); } }, [fun.loaded]);
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); setDirty(true); };
  const num = Number(d.number); const clash = d.number !== '' && real.find((x) => x.number === num);
  const numErr = d.number !== '' && (!/^\d{1,2}$/.test(String(d.number)) || num < 1) ? 'Use a number from 1 to 99.' : clash ? `#${num} belongs to ${clash.name} on the real grid. Pick another.` : '';
  const stats = profileStats(d, fun.fantasies);
  const photo = async () => { const r = await pickImage(); if (r.uri) set('photo', r.uri); else if (r.error) setMsg(r.error); };
  const save = () => {
    if (numErr) { setMsg(numErr); return; }
    const p = { ...d, number: d.number === '' ? '' : Number(d.number) }; fun.saveProfile(p); setDirty(false); setMsg('Saved.');
    // the same driver in a fantasy season follows the profile; anybody who already has that number gets a free one
    fun.fantasies.forEach((f) => { const me = f.drivers.find((x) => x.me); if (!me) return;
      fun.update(f.id, (g) => { const taken = [...real.map((x) => x.number), p.number]; return { ...g, drivers: g.drivers.map((x) => (x.me ? { ...x, ...nameParts(p.name), name: p.name, number: p.number || x.number, photo: p.photo } : x.number === p.number ? { ...x, number: freeNumber([...taken, ...g.drivers.map((y) => y.number)]) } : x)) }; }); });
  };
  const addSeason = () => set('seasons', [{ id: uid(), year: new Date().getFullYear(), team: d.team || 'My Team', races: [] }, ...d.seasons]);
  const upSeason = (id, fn) => set('seasons', d.seasons.map((s) => (s.id === id ? fn(s) : s)));
  return (
    <Screen header={false}>
      <Grad color={d.color || colors.accent} from={0.68} to={0.06} border={0.5} style={{ height: 210 }}>
        {d.photo ? <View style={{ position: 'absolute', right: -10, bottom: -10 }}><Avatar uri={d.photo} size={220} radius={24} color={d.color} /></View> : d.number !== '' ? <Text style={{ position: 'absolute', right: 8, bottom: -22, fontFamily: 'display', fontWeight: '800', fontSize: 150, color: 'rgba(255,255,255,0.12)' }}>{d.number}</Text> : null}
        {d.photo ? <Scrim dir="h" from={0.7} to={0} style={{ right: '25%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 30 }}>{d.number !== '' ? `#${d.number}` : ''}</Text>
          <View style={{ maxWidth: '62%' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} numberOfLines={1}>{nameParts(d.name).first}</Text>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 34, color: colors.fg, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{nameParts(d.name).last || 'Your name'}</Text>
            <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{d.team}</Text>
          </View>
        </View>
      </Grad>
      <Card>
        <Eyebrow>Your driver</Eyebrow>
        <View style={{ gap: 12, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn icon="image-outline" onPress={photo} style={{ flex: 1 }}>{d.photo ? 'Change photo' : 'Upload photo'}</Btn>
            {d.photo ? <Btn icon="trash-outline" onPress={() => set('photo', null)}>Remove</Btn> : null}
          </View>
          {!canPickImage() ? <Note>Photos need the newest app build.</Note> : null}
          <Field label="Name" value={d.name} onChange={(v) => set('name', v)} placeholder="Your name" maxLength={28} />
          <Field label="Car number (1-99)" value={d.number} onChange={(v) => set('number', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} />
          {numErr ? <Text style={{ color: colors.gold, fontSize: 15 }}>{numErr}</Text> : d.number !== '' ? <Text style={{ color: colors.muted, fontSize: 14 }}>Free: nobody on the real grid uses this number, and fantasy drivers will avoid it.</Text> : null}
          <Field label="Team" value={d.team} onChange={(v) => set('team', v)} placeholder="Team name" maxLength={28} />
          <Swatches value={d.color} onChange={(c) => set('color', c)} list={TEAM_COLORS} />
          <Btn tone="solid" icon="save-outline" onPress={save} disabled={!dirty && !!fun.profile}>Save driver</Btn>
          {msg ? <Text style={{ color: colors.muted, fontSize: 15 }}>{msg}</Text> : null}
        </View>
      </Card>
      <Card>
        <Eyebrow>Career</Eyebrow>
        <StatGrid cols={3} items={[['Seasons', dash(stats.seasons)], ['Races', dash(stats.races)], ['Wins', dash(stats.wins)], ['Podiums', dash(stats.podiums)], ['Poles', dash(stats.poles)], ['Best finish', stats.best ? `P${stats.best}` : '—'], ['Points', dash(stats.points)], ['DNF', dash(stats.dnf)], ['First year', dash(stats.first)]]} />
        <Note>Counts the seasons you add below and every fantasy season where you are the marked driver.</Note>
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Seasons raced</Eyebrow><Pressable onPress={addSeason} hitSlop={8}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>+ Add season</Text></Pressable></View>
      {d.seasons.length === 0 && <Note>Add the seasons you raced in, then your results race by race.</Note>}
      {d.seasons.map((s) => <SeasonEditor key={s.id} s={s} color={d.color} onChange={(fn) => upSeason(s.id, fn)} onDelete={() => set('seasons', d.seasons.filter((x) => x.id !== s.id))} />)}
      {dirty ? <Note>You have unsaved changes: tap Save driver.</Note> : null}
    </Screen>
  );
}
function SeasonEditor({ s, color, onChange, onDelete }) {
  const [race, setRace] = useState(''); const [grid, setGrid] = useState(''); const [pos, setPos] = useState('');
  const add = () => { if (!race.trim()) return; onChange((x) => ({ ...x, races: [...x.races, { id: uid(), race: race.trim(), grid, pos: pos.trim().toUpperCase() === 'DNF' || pos === '' ? 'DNF' : pos }] })); setRace(''); setGrid(''); setPos(''); };
  return (
    <Grad color={color} from={0.3} to={0.04} radius={16} border={0.3} style={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <Field label="Year" value={s.year} onChange={(v) => onChange((x) => ({ ...x, year: v.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" maxLength={4} style={{ width: 90 }} />
        <Field label="Team" value={s.team} onChange={(v) => onChange((x) => ({ ...x, team: v }))} style={{ flex: 1 }} />
        <Pressable onPress={onDelete} hitSlop={8} style={{ height: 46, justifyContent: 'center' }}><Ionicons name="trash-outline" size={22} color={colors.muted} /></Pressable>
      </View>
      {s.races.map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{r.race}</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{r.grid ? `Grid ${r.grid}` : ''}</Text>
          <Text style={{ color: /^\d+$/.test(r.pos) && Number(r.pos) <= 3 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 16, minWidth: 40, textAlign: 'right' }}>{/^\d+$/.test(r.pos) ? `P${r.pos}` : 'DNF'}</Text>
          <Pressable onPress={() => onChange((x) => ({ ...x, races: x.races.filter((y) => y.id !== r.id) }))} hitSlop={8}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
        </View>))}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <Field label="Race" value={race} onChange={setRace} placeholder="e.g. Monaco" style={{ flex: 1 }} />
        <Field label="Grid" value={grid} onChange={(v) => setGrid(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} style={{ width: 58 }} />
        <Field label="Finish" value={pos} onChange={(v) => setPos(v.replace(/[^0-9a-zA-Z]/g, ''))} placeholder="DNF" maxLength={3} style={{ width: 66 }} />
        <Pressable onPress={add} style={{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}><Ionicons name="add" size={24} color="#fff" /></Pressable>
      </View>
    </Grad>
  );
}
