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
import { makeGrid, nextStep, runStep, runWeekend, runSeason, sessionsOf, standings, freeNumber, TEAM_COLORS } from '../fun/sim';
import { profileStats } from '../fun/profile';
import { usePrefs } from '../hooks/usePrefs';
import { usePaddockMeta } from '../hooks/useTeams';
import { CIRCUITS } from '../data/circuits';
import { colors, alpha } from '../theme';

const realNumbers = (meta) => Object.entries(meta?.drivers || {}).map(([id, d]) => ({ id, number: Number(d.number), name: id.replace(/_/g, ' ') })).filter((x) => x.number);
const dash = (v) => (v == null ? '—' : String(v));
const nameParts = (full) => { const [first, ...rest] = String(full || '').trim().split(/\s+/); return { first: first || '', last: rest.join(' ') }; };

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
                  <Text style={{ color: colors.muted, fontSize: 15 }}>{`${f.teams.length} teams · ${done}/${f.races.length} races${lead ? ` · leader ${lead.last}` : ''}`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Card>
          </Press>);
      })}
      <Btn icon="add-circle-outline" tone="solid" onPress={() => navigation.navigate('FantasyNew')}>New fantasy season</Btn>
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

/* ------------------------------------------------------------------ new fantasy */
export function FantasyNew({ navigation }) {
  const fun = useFun(); const { prefs } = usePrefs(); const meta = usePaddockMeta(); const real = realNumbers(meta).map((x) => x.number);
  const [name, setName] = useState(`Fantasy ${fun.fantasies.length + 1}`); const [count, setCount] = useState(10);
  const [picked, setPicked] = useState(() => CIRCUITS.slice(0, 8).map((c) => c.key)); const [custom, setCustom] = useState([]); const [sprints, setSprints] = useState({});
  const [cn, setCn] = useState(''); const [cp, setCp] = useState(''); const [cl, setCl] = useState(55);
  const [me, setMe] = useState(false); const [meTeam, setMeTeam] = useState(0); const [seed, setSeed] = useState(0);
  const p = fun.profile;
  const grid = useMemo(() => makeGrid(count, [...real, p?.number].filter(Boolean)), [count, seed, real.length, p?.number]);
  const races = [...CIRCUITS.filter((c) => picked.includes(c.key)).map((c) => ({ id: c.key, name: c.name, place: c.place, laps: 50 + (c.key.length % 10), sprint: !!sprints[c.key], custom: false })), ...custom];
  const toggle = (k) => setPicked((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  const addCustom = () => { if (!cn.trim()) return; setCustom((l) => [...l, { id: uid(), name: cn.trim(), place: cp.trim(), laps: cl, sprint: false, custom: true }]); setCn(''); setCp(''); };
  const create = () => {
    if (!races.length) return;
    let { teams, drivers } = grid;
    if (me && p) { const t = teams[Math.min(meTeam, teams.length - 1)]; const mine = drivers.filter((d) => d.teamId === t.id)[1];
      drivers = drivers.map((d) => (d.id === mine.id ? { ...d, ...nameParts(p.name), name: p.name || 'Me', number: p.number || d.number, photo: p.photo, me: true, skill: 76 } : d)); }
    const f = { id: uid(), name: name.trim() || 'Fantasy season', created: Date.now(), teams, drivers, races, results: {} };
    fun.addFantasy(f); navigation.replace('Fantasy', { id: f.id });
  };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Name</Eyebrow><View style={{ marginTop: 10 }}><Field value={name} onChange={setName} maxLength={30} /></View></Card>
      <Card>
        <Eyebrow>Teams</Eyebrow>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Stepper label="Number of teams" value={count} min={2} max={16} onChange={setCount} />
          <Text style={{ color: colors.muted, fontSize: 14 }}>{`Two drivers per team: ${count * 2} cars. Names, logos and colours can be changed after.`}</Text>
          <Btn icon="shuffle" onPress={() => setSeed(seed + 1)}>Shuffle teams and drivers</Btn>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{grid.teams.map((t) => <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: alpha(t.color, 0.2), borderWidth: 1, borderColor: alpha(t.color, 0.6) }}><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '600' }}>{t.name}</Text></View>)}</View>
        </View>
      </Card>
      <Card>
        <Eyebrow>You</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}>
          {p ? (<>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Avatar uri={p.photo} size={44} color={p.color} label={p.number} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{p.name || 'Your driver'}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>That is me: race as this driver</Text></View><Switch value={me} onValueChange={setMe} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View>
            {me ? <Dropdown value={meTeam} options={grid.teams.map((t, i) => [i, t.name])} onChange={setMeTeam} prefix="Team" /> : null}
            {me ? <Note>Only one driver per season can be you. You can move to another driver later in Setup.</Note> : null}
          </>) : <Note>Create your driver in Fun first to race as yourself.</Note>}
        </View>
      </Card>
      <Card>
        <Eyebrow>{`Races · ${races.length}`}</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><Btn onPress={() => setPicked(CIRCUITS.map((c) => c.key))} style={{ flex: 1 }}>All {CIRCUITS.length}</Btn><Btn onPress={() => setPicked([])} style={{ flex: 1 }}>None</Btn></View>
        <View style={{ marginTop: 10, gap: 6 }}>
          {CIRCUITS.map((c) => { const on = picked.includes(c.key); return (
            <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => toggle(c.key)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: on ? colors.accentSoft : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.accent : colors.muted} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{c.place}</Text></View>
              </Pressable>
              {on ? <Pressable onPress={() => setSprints((s) => ({ ...s, [c.key]: !s[c.key] }))} style={{ paddingHorizontal: 9, height: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: sprints[c.key] ? '#FF2D87' : colors.surface2, borderWidth: 1, borderColor: sprints[c.key] ? '#FF2D87' : colors.line }}><Text style={{ color: sprints[c.key] ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>SPRINT</Text></Pressable> : null}
            </View>); })}
        </View>
      </Card>
      <Card>
        <Eyebrow>Add your own race</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}>
          <Field label="Race name" value={cn} onChange={setCn} placeholder="e.g. Midnight Street GP" />
          <Field label="Place" value={cp} onChange={setCp} placeholder="City, country" />
          <Stepper label="Laps" value={cl} min={20} max={80} step={5} onChange={setCl} />
          <Btn icon="add" onPress={addCustom} disabled={!cn.trim()}>Add race</Btn>
          {custom.map((r) => (<View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 16 }} numberOfLines={1}>{`${r.name} · ${r.laps} laps`}</Text><Pressable onPress={() => setCustom((l) => l.map((x) => (x.id === r.id ? { ...x, sprint: !x.sprint } : x)))}><Text style={{ color: r.sprint ? '#FF2D87' : colors.muted, fontWeight: '700' }}>SPRINT</Text></Pressable><Pressable onPress={() => setCustom((l) => l.filter((x) => x.id !== r.id))}><Ionicons name="close" size={18} color={colors.muted} /></Pressable></View>))}
        </View>
      </Card>
      <Btn tone="solid" icon="flag" onPress={create} disabled={!races.length}>{races.length ? 'Create the season' : 'Pick at least one race'}</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ one fantasy season */
export function Fantasy({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const f = fun.get(id); const [tab, setTab] = useState('season'); const [busy, setBusy] = useState(false);
  useEffect(() => { if (f) navigation.setOptions({ title: f.name }); }, [f?.name]);
  if (!f) return <Screen header={false}><Note>{fun.loaded ? 'This season no longer exists.' : 'Loading…'}</Note></Screen>;
  const st = standings(f); const step = nextStep(f); const done = f.races.filter((r) => sessionsOf(r).every((s) => f.results?.[r.id]?.[s])).length;
  const apply = (fn) => { setBusy(true); setTimeout(() => { fun.update(id, fn); setBusy(false); }, 30); };
  const tcol = (tid) => f.teams.find((t) => t.id === tid)?.color || colors.muted;
  const champ = !step && f.races.length ? st.drivers[0] : null;
  return (
    <Screen header={false} swipe={{ index: ['season', 'drivers', 'teams', 'setup'].indexOf(tab), count: 4, onIndex: (i) => setTab(['season', 'drivers', 'teams', 'setup'][i]) }}>
      <Segmented value={tab} onChange={setTab} items={[['season', 'Season'], ['drivers', 'Drivers'], ['teams', 'Teams'], ['setup', 'Setup']]} />
      {tab === 'season' && (<>
        <Card>
          <Eyebrow>{champ ? 'Season complete' : 'Next up'}</Eyebrow>
          {champ ? (<View style={{ marginTop: 10, gap: 4 }}><Text style={{ color: colors.gold, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }}>{`🏆 ${champ.name}`}</Text><Text style={{ color: colors.muted, fontSize: 16 }}>{`${champ.points} points · ${f.teams.find((t) => t.id === champ.teamId)?.name || ''}`}</Text></View>)
            : step ? (<View style={{ marginTop: 10, gap: 4 }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{step.race.name}</Text><Text style={{ color: colors.muted, fontSize: 16 }}>{`Race ${step.index + 1} of ${f.races.length} · ${step.session}`}</Text></View>) : null}
          {step ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              <Btn tone="solid" icon="play" disabled={busy} onPress={() => apply((g) => runStep(g, nextStep(g)))}>{`Simulate ${step.session.toLowerCase()}`}</Btn>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn icon="play-skip-forward" disabled={busy} onPress={() => apply(runWeekend)} style={{ flex: 1 }}>Whole weekend</Btn>
                <Btn icon="fast-forward" disabled={busy} onPress={() => apply(runSeason)} style={{ flex: 1 }}>Whole season</Btn>
              </View>
            </View>) : <View style={{ marginTop: 12 }}><Btn icon="refresh" onPress={() => Alert.alert('Reset results?', 'All simulated results of this season are deleted. The teams and drivers stay.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => fun.update(id, (g) => ({ ...g, results: {} })) }])}>Start the season again</Btn></View>}
        </Card>
        <View><Eyebrow>{`Calendar · ${done}/${f.races.length}`}</Eyebrow></View>
        {f.races.map((r, i) => {
          const n = sessionsOf(r).filter((s) => f.results?.[r.id]?.[s]).length, all = sessionsOf(r).length, win = f.results?.[r.id]?.Race?.[0];
          const w = win && f.drivers.find((d) => d.id === win.driverId);
          return (
            <Press key={r.id} onPress={() => navigation.navigate('FantasyRace', { id, raceId: r.id })}>
              <Grad color={w ? tcol(w.teamId) : colors.accent} from={n === all ? 0.4 : 0.14} to={0.03} dir="h" radius={14} border={0.3} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.accent, 0.2) }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{`R${i + 1}`}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{r.name}{r.sprint ? '  · SPRINT' : ''}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{w ? `Winner: ${w.name}` : `${n}/${all} sessions`}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Grad>
            </Press>);
        })}
      </>)}
      {tab === 'drivers' && st.drivers.map((d, i) => (
        <Grad key={d.id} color={tcol(d.teamId)} from={0.26} to={0.03} dir="h" radius={14} border={d.me ? 0.9 : 0.22} style={[{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, d.me && { borderColor: colors.gold }]}>
          <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(i === 0 ? colors.gold : tcol(d.teamId), 0.3) }}><Text style={{ color: i === 0 ? colors.gold : colors.fg, fontWeight: '800' }}>{i + 1}</Text></View>
          <Avatar uri={d.photo} size={40} color={tcol(d.teamId)} label={d.number} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{d.name}{d.me ? '  (you)' : ''}</Text><Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{`${f.teams.find((t) => t.id === d.teamId)?.name} · ${d.wins} wins · ${d.podiums} podiums`}</Text></View>
          <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{d.points}</Text>
        </Grad>))}
      {tab === 'teams' && st.teams.map((t, i) => (
        <Grad key={t.id} color={t.color} from={0.5} to={0.06} dir="h" radius={16} border={0.4} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ width: 26, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>{i + 1}</Text>
          <Avatar uri={t.logo} size={44} color={t.color} label={t.name} radius={12} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{t.name}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{`${t.wins} wins`}</Text></View>
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{t.points}</Text>
        </Grad>))}
      {tab === 'setup' && <Setup f={f} update={(fn) => fun.update(id, fn)} profile={fun.profile} navigation={navigation} onDelete={() => Alert.alert('Delete this season?', 'It cannot be brought back.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { fun.remove(id); navigation.goBack(); } }])} />}
    </Screen>
  );
}

function Setup({ f, update, profile, navigation, onDelete }) {
  const [msg, setMsg] = useState('');
  const setTeam = (tid, patch) => update((g) => ({ ...g, teams: g.teams.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
  const setDriver = (did, patch) => update((g) => ({ ...g, drivers: g.drivers.map((d) => (d.id === did ? { ...d, ...patch } : d)) }));
  const logo = async (tid) => { const r = await pickImage(); if (r.uri) setTeam(tid, { logo: r.uri }); else if (r.error) setMsg(r.error); };
  // "That's me" can sit on one driver only: choosing it clears it everywhere else and copies your photo, name and number from your profile.
  const makeMe = (d) => {
    if (!profile) { setMsg('Create your driver in Fun first.'); navigation.navigate('FunProfile'); return; }
    update((g) => ({ ...g, drivers: g.drivers.map((x) => (x.id === d.id ? { ...x, ...nameParts(profile.name), name: profile.name || 'Me', number: profile.number || x.number, photo: profile.photo, me: true }
      : x.me ? { ...x, me: false, photo: null } : x.number === profile.number ? { ...x, number: freeNumber(g.drivers.map((y) => y.number).concat(profile.number)) } : x)) }));
  };
  return (<>
    <Card><Eyebrow>Season name</Eyebrow><View style={{ marginTop: 10 }}><Field value={f.name} onChange={(v) => update((g) => ({ ...g, name: v }))} maxLength={30} /></View></Card>
    {f.teams.map((t) => (
      <Grad key={t.id} color={t.color} from={0.3} to={0.04} radius={16} border={0.35} style={{ padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => logo(t.id)} accessibilityLabel="Choose team logo"><Avatar uri={t.logo} size={54} color={t.color} label={t.name} radius={14} /><View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={12} color="#fff" /></View></Pressable>
          <Field value={t.name} onChange={(v) => setTeam(t.id, { name: v })} style={{ flex: 1 }} maxLength={26} />
          {t.logo ? <Pressable onPress={() => setTeam(t.id, { logo: null })} hitSlop={8}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable> : null}
        </View>
        <Swatches value={t.color} onChange={(c) => setTeam(t.id, { color: c })} list={TEAM_COLORS} />
        <Stepper label="Car strength" value={t.car} min={30} max={99} step={3} onChange={(v) => setTeam(t.id, { car: v })} />
        {f.drivers.filter((d) => d.teamId === t.id).map((d) => (
          <View key={d.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar uri={d.photo} size={40} color={t.color} label={d.number} />
              <Field value={d.name} onChange={(v) => setDriver(d.id, { name: v, ...nameParts(v) })} style={{ flex: 1 }} maxLength={28} />
            </View>
            <Stepper label="Skill" value={d.skill} min={30} max={99} step={2} onChange={(v) => setDriver(d.id, { skill: v })} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, color: d.me ? colors.gold : colors.fg, fontSize: 16, fontWeight: '700' }}>{d.me ? "★ That's me" : `#${d.number}`}</Text>
              {!d.me ? <Btn icon="person" onPress={() => makeMe(d)} style={{ height: 38 }}>That's me</Btn> : <Btn icon="close" onPress={() => setDriver(d.id, { me: false, photo: null })} style={{ height: 38 }}>Not me</Btn>}
            </View>
          </View>))}
      </Grad>))}
    {msg ? <Note>{msg}</Note> : null}
    <Btn icon="trash-outline" onPress={onDelete}>Delete this season</Btn>
  </>);
}

/* ------------------------------------------------------------------ one race of a fantasy season */
export function FantasyRace({ route, navigation }) {
  const { id, raceId } = route.params; const fun = useFun(); const f = fun.get(id); const shot = useRef(null);
  const race = f?.races.find((r) => r.id === raceId); const [sel, setSel] = useState(null);
  if (!f || !race) return <Screen header={false}><Note>Not found.</Note></Screen>;
  const all = sessionsOf(race); const have = all.filter((s) => f.results?.[raceId]?.[s]); const cur = sel && have.includes(sel) ? sel : have.includes('Race') ? 'Race' : have.at(-1);
  const rows = cur ? f.results[raceId][cur] : []; const drv = (did) => f.drivers.find((d) => d.id === did); const team = (tid) => f.teams.find((t) => t.id === tid);
  const missing = all.find((s) => !f.results?.[raceId]?.[s]);
  const simulateMissing = () => fun.update(id, (g) => { const prior = g.results?.[raceId] || {}; let h = g; for (const s of all) if (!prior[s] && !h.results?.[raceId]?.[s]) h = runStep(h, { race, session: s, index: 0 }); return h; });
  const cardRows = rows.map((r) => { const d = drv(r.driverId); return { key: r.driverId, pos: r.pos, color: team(d?.teamId)?.color || colors.muted, name: d ? d.name : '?', team: team(d?.teamId)?.name || '', right: cur === 'Race' || cur === 'Sprint' ? (r.points ? `${r.time}  +${r.points}` : r.time) : r.time }; });
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={2}>{race.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{`${race.place || 'Custom race'} · ${race.laps} laps${race.sprint ? ' · sprint weekend' : ''}`}</Text>
      </Grad>
      {missing ? <Btn tone="solid" icon="play-skip-forward" onPress={simulateMissing}>{have.length ? 'Simulate the rest of the weekend' : 'Simulate this weekend'}</Btn> : null}
      {have.length > 0 && (<>
        <Dropdown value={cur} options={have.map((s) => [s, s])} onChange={setSel} />
        {cardRows.length > 0 && <SessionCard shotRef={shot} title={race.name} sub={cur} rows={cardRows} />}
        <ExportBar target={shot} />
      </>)}
      {!have.length && <Note>Nothing simulated for this race yet.</Note>}
    </Screen>
  );
}
