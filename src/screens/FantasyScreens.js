import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, Alert, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad, { Scrim } from '../components/Grad';
import Press from '../components/Press';
import Dropdown from '../components/Dropdown';
import Skeleton from '../components/Skeleton';
import { Segmented, StatGrid, ResultLine } from '../components/Shared';
import ExportBar from '../components/ExportBar';
import { demonymToCountry } from '../fun/juniors';
import { BarView } from '../components/TabBar';
import { Avatar, Cutout, Field, Stepper, Btn, Swatches, SessionCard, StandingsCard, SummaryCard, Slide, UndoChip } from '../components/FunBits';
import { TransferShow, ChampionShow, SessionShow } from '../components/Shows';
import { flagOfPlace, flagOfCountry, countryNames } from '../fun/geo';
import { useFun, pickImage, uid, canPickImage } from '../fun/store';
import LiveRace from '../components/LiveRace';
import { makeGrid, nextStep, runStep, runWeekend, runSeason, sessionsOf, standings, freeNumber, randomDriver, TEAM_COLORS, DRIVER_ATTRS, TEAM_ATTRS, A, TA, ovr, makeDriverAttrs, simulateTransfers } from '../fun/sim';
import { attrsFor } from '../fun/talent';
import { driverPic, teamPic, viewOf, seasonList, seasonNo, careerOf, numberClash, closeSeason, isDone, allTime, seasonSummary, titleStatus } from '../fun/look';
import { buildNews } from '../fun/articles';
import { loadRealGrid } from '../fun/realGrid';
import { getSaveFolder, chooseSaveFolder, canChooseFolder } from '../lib/exportImage';
import { nameParts } from './FunScreens';
import { LibDriverPicker, LibRacePicker, libDriver, libRace } from './PresetScreens';
import { useAsync } from '../hooks/useAsync';
import { usePrefs } from '../hooks/usePrefs';
import { allDrivers, driverCareer, driverTitles } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { CIRCUITS } from '../data/circuits';
import { colors, alpha } from '../theme';

const dash = (v) => (v == null ? '—' : String(v));
// Changing one attribute keeps the others (older drivers only had a single skill number).
const attrPatch = (d, k, v) => { const m = { ...A(d), [k]: v }; return { pace: m.pace, quali: m.quali, race: m.race, cons: m.cons, wet: m.wet, aggr: m.aggr, age: m.age, pot: m.pot, skill: ovr(m) }; };
const sum = (a, b) => (a == null || b == null ? null : a + b);
const tcol = (f, tid) => f.teams.find((t) => t.id === tid)?.color || colors.muted;
const teamOf = (f, tid) => f.teams.find((t) => t.id === tid);
const lapsOf = (c) => Number((c.stats || []).find(([k]) => k === 'Race laps')?.[1]) || 55;
const PICK = CIRCUITS.filter((c) => c.key !== 'sepang');
const SPRINTS = new Set(['shanghai', 'miami', 'villeneuve', 'silverstone', 'zandvoort', 'singapore']); // the 2026 sprint weekends
const circuitRace = (c) => ({ id: c.key, name: c.name, place: c.place, laps: lapsOf(c), sprint: SPRINTS.has(c.key), custom: false, flag: flagOfPlace(c.place) });
const defaultRaces = () => PICK.map(circuitRace);
const raceFlag = (r) => r?.flag || flagOfPlace(r?.place) || '';
// Transfer news turned into what the full-screen show needs (driver photo, old and new team with logos).
const showItems = (f, log) => (log || []).filter((x) => x.who).map((x) => { const T = (id) => { const t = f.teams.find((y) => y.id === id); return t ? { name: t.name, color: t.color, logo: teamPic(t) } : null; }; return { kind: x.kind, who: x.who, photo: driverPic(x.who), from: T(x.from), to: T(x.to), step: x.step, origin: x.origin }; });
// The story of a finished race, worked out from its results: winner, pole, fastest lap, biggest climb, driver of the day, retirements.
const raceReport = (v, race) => {
  const res = v.results?.[race.id]; const rows = res?.Race; if (!rows || !rows.length) return null;
  const D = (did) => v.drivers.find((d) => d.id === did); const out = [];
  const win = rows[0], q = res.Qualifying?.[0], fl = rows.find((r) => r.fl);
  const fin = rows.filter((r) => r.status === 'OK' && r.grid > 0); const climb = [...fin].sort((a, b) => (b.grid - b.pos) - (a.grid - a.pos))[0];
  // Driver of the day: the biggest climb, with a bonus for a podium or a win from far back.
  const dotd = [...fin].sort((a, b) => ((b.grid - b.pos) + (b.pos <= 3 ? 3 : 0) + (b.pos === 1 && b.grid > 3 ? 3 : 0)) - ((a.grid - a.pos) + (a.pos <= 3 ? 3 : 0) + (a.pos === 1 && a.grid > 3 ? 3 : 0)))[0];
  const out_ = rows.filter((r) => r.status !== 'OK');
  if (win) out.push({ icon: 'trophy', c: colors.gold, k: 'Winner', v: D(win.driverId)?.name, sub: win.grid > 0 ? `from P${win.grid}` : '' });
  if (q) out.push({ icon: 'speedometer', c: colors.accent, k: 'Pole', v: D(q.driverId)?.name, sub: '' });
  if (fl) out.push({ icon: 'flash', c: colors.purple, k: 'Fastest lap', v: D(fl.driverId)?.name, sub: fl.flTime || '' });
  if (climb && climb.grid - climb.pos >= 3) out.push({ icon: 'trending-up', c: colors.good, k: 'Biggest climb', v: D(climb.driverId)?.name, sub: `P${climb.grid} → P${climb.pos}` });
  if (dotd) out.push({ icon: 'star', c: colors.gold, k: 'Driver of the day', v: D(dotd.driverId)?.name, sub: '' });
  if (out_.length) out.push({ icon: 'close-circle', c: colors.muted, k: 'Retired', v: `${out_.length} driver${out_.length > 1 ? 's' : ''}`, sub: out_.slice(0, 3).map((r) => surname(D(r.driverId))).join(', ') });
  return out.filter((x) => x.v);
};
// What stands in the little picture when there is no photo: made-up drivers show their country's flag, real ones their three letters.
const codeOf = (d) => { const fl = d && d.nat ? flagOfCountry(d.nat) || flagOfCountry(demonymToCountry(d.nat)) : ''; return fl || String((d && (d.last || d.name)) || '').slice(0, 3).toUpperCase(); };
const surname = (d) => String(d?.last || d?.name || '').trim() || '?';
const order = (r, i) => { const k = CIRCUITS.findIndex((c) => c.key === r.id); return k >= 0 ? k : 1000 + i; };

// "That's me" sits on one driver only: choosing it clears it from every other driver and copies your photo, name and number from your profile.
export function makeMe(f, profile, did) {
  return { ...f, drivers: f.drivers.map((x) => (x.id === did ? { ...x, ...nameParts(profile.name), name: profile.name || 'Me', number: profile.number || x.number, photo: profile.photo, me: true, ref: null, ...makeDriverAttrs(76, 24) }
    : x.me ? { ...x, me: false, photo: null } : profile.number && x.number === profile.number ? { ...x, number: freeNumber(f.drivers.map((y) => y.number).concat(profile.number)) } : x)) };
}

/* ------------------------------------------------------------------ calendar picker (new season and transfer window) */
function RacePicker({ races, onChange }) {
  const [cn, setCn] = useState(''); const [cp, setCp] = useState(''); const [cl, setCl] = useState('55'); const [cc, setCc] = useState(''); const [lib, setLib] = useState(false);
  const has = (k) => races.find((r) => r.id === k);
  const put = (l) => onChange(l.map((r, i) => [r, i]).sort((a, b) => order(a[0], a[1]) - order(b[0], b[1])).map((x) => x[0]));
  const toggle = (c) => put(has(c.key) ? races.filter((r) => r.id !== c.key) : [...races, circuitRace(c)]);
  const setSprint = (id) => onChange(races.map((r) => (r.id === id ? { ...r, sprint: !r.sprint } : r)));
  const laps = Math.max(1, Math.min(200, parseInt(cl, 10) || 0));
  return (<>
    <Card>
      <Eyebrow>{`Races · ${races.length}`}</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><Btn onPress={() => put([...races.filter((r) => r.custom), ...defaultRaces()])} style={{ flex: 1 }}>{`Default · ${PICK.length}`}</Btn><Btn onPress={() => onChange(races.filter((r) => r.custom))} style={{ flex: 1 }}>None</Btn></View>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>Default is every race, with the usual sprint weekends. Tap SPRINT to change one.</Text>
      <View style={{ marginTop: 10, gap: 6 }}>
        {PICK.map((c) => { const r = has(c.key), on = !!r; return (
          <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => toggle(c)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: on ? colors.accentSoft : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.accent : colors.muted} /><Text style={{ fontSize: 22 }}>{flagOfPlace(c.place)}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{c.place}</Text></View>
            </Pressable>
            {on ? <Pressable onPress={() => setSprint(c.key)} style={{ paddingHorizontal: 9, height: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: r.sprint ? colors.sprint : colors.surface2, borderWidth: 1, borderColor: r.sprint ? colors.sprint : colors.line }}><Text style={{ color: r.sprint ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>SPRINT</Text></Pressable> : null}
          </View>); })}
      </View>
    </Card>
    <Card>
      <Eyebrow>Add your own race</Eyebrow>
      <View style={{ marginTop: 10, gap: 10 }}>
        <Field label="Race name" value={cn} onChange={setCn} placeholder="e.g. Midnight Street GP" />
        <Field label="Place" value={cp} onChange={setCp} placeholder="City" />
        <Dropdown value={cc || ''} options={[['', 'No flag'], ...countryNames.map((n) => [n, `${flagOfCountry(n)}  ${n}`])]} onChange={setCc} prefix="Country" />
        <Field label="Laps" value={cl} onChange={(x) => setCl(x.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="e.g. 55" />
        <Btn icon="add" disabled={!cn.trim() || !parseInt(cl, 10)} onPress={() => { onChange([...races, { id: uid(), name: cn.trim(), place: [cp.trim(), cc].filter(Boolean).join(', '), laps, sprint: false, custom: true, flag: flagOfCountry(cc) }]); setCn(''); setCp(''); setCc(''); }}>Add race</Btn>
        <Btn icon="bookmark-outline" onPress={() => setLib(!lib)}>Add one of my saved races</Btn>
        {lib ? <LibRacePicker onClose={() => setLib(false)} onPick={(r) => onChange([...races, libRace(r)])} /> : null}
        {races.filter((r) => r.custom).map((r) => (<View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 16 }} numberOfLines={1}>{`${raceFlag(r)} ${r.name} · ${r.laps} laps`}</Text><Pressable onPress={() => setSprint(r.id)}><Text style={{ color: r.sprint ? colors.sprint : colors.muted, fontWeight: '700' }}>SPRINT</Text></Pressable><Pressable onPress={() => onChange(races.filter((x) => x.id !== r.id))} hitSlop={8}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable></View>))}
      </View>
    </Card>
  </>);
}

// A team in Setup or Transfers: logo and name only; the editor (logo, name, colour, attributes) opens on request.
function TeamEditor({ t, setTeam, children }) {
  const [open, setOpen] = useState(false); const [msg, setMsg] = useState('');
  const logo = async () => { const r = await pickImage(); if (r.uri) setTeam({ logo: r.uri }); else if (r.error) setMsg(r.error); };
  return (
    <Grad color={t.color} from={0.3} to={0.04} radius={16} border={0.35} style={{ padding: 12, gap: 10 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`Edit ${t.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar source={teamPic(t)} color={t.color} label={t.name} size={38} radius={10} />
        <Text style={{ flex: 1, color: colors.fg, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{t.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: alpha('#000000', 0.25) }}><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '700' }}>{open ? 'Close' : 'Edit team'}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.fg} /></View>
      </Pressable>
      {open ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn icon="image-outline" onPress={logo} style={{ flex: 1, height: 42 }}>{t.logo ? 'Change logo' : 'Add logo'}</Btn>
            {t.logo ? <Btn icon="close" onPress={() => setTeam({ logo: null })} style={{ height: 42 }}>Remove</Btn> : null}
          </View>
          {msg ? <Note>{msg}</Note> : null}
          <Field label="Team name" value={t.name} onChange={(v) => setTeam({ name: v })} maxLength={26} />
          <Swatches value={t.color} onChange={(c) => setTeam({ color: c })} list={TEAM_COLORS} />
          {TEAM_ATTRS.map(([k, label]) => <Slide key={k} label={label} value={Math.round(TA(t)[k])} min={30} max={99} color={t.color} onChange={(v) => setTeam({ [k]: v })} />)}
          <Text style={{ color: colors.muted, fontSize: 13 }}>Between seasons a team only sometimes gets a little faster or slower.</Text>
        </View>) : null}
      {children}
    </Grad>
  );
}

/* ------------------------------------------------------------------ search any real driver, past or present */
function DriverPicker({ exclude, onPick, onClose }) {
  const all = useAsync(() => allDrivers(), []); const [q, setQ] = useState('');
  const list = useMemo(() => { const t = q.trim().toLowerCase(); if (!all.v || t.length < 2) return []; return all.v.filter((d) => !exclude.includes(d.driverId) && d.name.toLowerCase().includes(t)).slice(0, 25); }, [all.v, q]);
  return (
    <View style={{ gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search any F1 driver, past or present" placeholderTextColor={colors.muted} autoFocus style={{ flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 12, color: colors.fg, fontSize: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} />
        <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
      </View>
      {all.loading ? <Skeleton rows={2} /> : null}
      {all.error ? <Text style={{ color: colors.muted }}>The driver list could not be loaded.</Text> : null}
      {list.map((d) => (<Press key={d.driverId} onPress={() => onPick(d)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}><Avatar source={driverPic({ ref: d.driverId })} color={colors.accent} label={d.code || d.last.slice(0, 3)} size={38} /><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{d.nationality}</Text></View></Press>))}
      {q.trim().length >= 2 && all.v && !list.length ? <Text style={{ color: colors.muted }}>Nobody found.</Text> : null}
    </View>
  );
}
const newDriver = (f, teamId, real) => {
  const nm = real ? { first: real.first, last: real.last, name: real.name } : randomDriver(f.drivers); const used = f.drivers.map((d) => d.number);
  const n = real && Number(real.number) && !used.includes(Number(real.number)) ? Number(real.number) : freeNumber(used);
  const at = real ? attrsFor(real.driverId, real.dob ? Number(String(real.dob).slice(0, 4)) : null) : makeDriverAttrs(68, 19 + Math.floor(Math.random() * 14));
  return { id: uid(), ...nm, number: n, teamId, photo: null, ref: real ? real.driverId : null, ...at, known: undefined };
};

/* ------------------------------------------------------------------ one driver's number, with the clash check */
function NumField({ f, d, onSet }) {
  const [t, setT] = useState(String(d.number ?? '')); useEffect(() => setT(String(d.number ?? '')), [d.number]);
  const n = Number(t), clash = t !== '' ? numberClash(f, d.id, n) : null, bad = t === '' || !/^\d{1,2}$/.test(t) || n < 1;
  return (
    <View style={{ width: 92 }}>
      <Field label="Number" value={t} onChange={(v) => { const x = v.replace(/[^0-9]/g, ''); setT(x); const k = Number(x); if (x && k >= 1 && !numberClash(f, d.id, k)) onSet(k); }} keyboardType="number-pad" maxLength={2} />
      {bad || clash ? <Text style={{ color: colors.gold, fontSize: 12, marginTop: 2 }}>{clash ? `Taken by ${clash.last}` : '1 to 99'}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ new fantasy */
export function FantasyNew({ navigation }) {
  const fun = useFun(); const p = fun.profile;
  const [name, setName] = useState(`Fantasy ${fun.fantasies.length + 1}`); const [mode, setMode] = useState('real'); const [count, setCount] = useState(11);
  const [races, setRaces] = useState(defaultRaces); const presets = fun.presets; const [presetId, setPresetId] = useState(null); const [me, setMe] = useState(false); const [meTeam, setMeTeam] = useState(0); const [seed, setSeed] = useState(0);
  const real = useAsync(() => (mode === 'real' ? loadRealGrid([]) : Promise.resolve(null)), [mode]);
  const invented = useMemo(() => makeGrid(count, [p?.number].filter(Boolean)), [count, seed, p?.number]);
  const pre = presets.find((x) => x.id === presetId) || presets[0] || null;
  // A preset grid is copied with fresh ids, so the save never changes the preset.
  const presetGrid = useMemo(() => { if (!pre) return null; const map = {}; const teams = pre.teams.map((t) => { const id = uid(); map[t.id] = id; return { ...t, id }; }); return { teams, drivers: pre.drivers.map((d) => ({ ...d, id: uid(), teamId: map[d.teamId] })) }; }, [pre?.id, pre?.teams, pre?.drivers]);
  const grid = mode === 'real' ? real.v : mode === 'preset' ? presetGrid : invented; const ok = !!grid && grid.teams.length > 0;
  const [usePresetRaces, setUsePresetRaces] = useState(true);
  const create = () => {
    if (!ok || !(races.length || (mode === 'preset' && usePresetRaces && pre?.races.length))) return;
    let f = { id: uid(), name: name.trim() || 'Fantasy season', created: Date.now(), mode, season: 1, history: [], teams: grid.teams, drivers: grid.drivers, races: mode === 'preset' && usePresetRaces ? pre.races.map((r) => ({ ...r, id: r.custom ? uid() : r.id })) : races, results: {} };
    if (me && p) { const t = grid.teams[Math.min(meTeam, grid.teams.length - 1)], own = grid.drivers.filter((d) => d.teamId === t.id), mine = own[1] || own[0]; f = makeMe(f, p, mine.id); f = { ...f, drivers: f.drivers.map((d) => (d.me ? { ...d, skill: 76 } : d)) }; }
    fun.addFantasy(f); navigation.replace('Fantasy', { id: f.id });
  };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Name</Eyebrow><View style={{ marginTop: 10 }}><Field value={name} onChange={setName} maxLength={30} /></View></Card>
      <Card>
        <Eyebrow>Grid</Eyebrow>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Segmented value={mode} onChange={setMode} items={[['real', 'Real grid'], ['invented', 'Made-up grid'], ['preset', `My presets${presets.length ? ` · ${presets.length}` : ''}`]]} />
          {mode === 'preset' ? (<>
            {!presets.length ? <Note>No grid preset yet. Make one in Fun → Presets, or save a grid from any save's Setup tab.</Note> : (<>
              <Dropdown value={pre?.id} options={presets.map((x) => [x.id, `${x.name} · ${x.teams.length} teams`])} onChange={setPresetId} prefix="Preset" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>{`Use the preset's ${pre?.races.length || 0} races`}</Text><Switch value={usePresetRaces} onValueChange={setUsePresetRaces} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View>
            </>)}
          </>) : mode === 'real' ? (<>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{`This season's real teams, logos and drivers. Their strength comes from the real championship. You can change drivers, add your own or real ones from any year, and edit numbers later.`}</Text>
            {real.loading ? <Skeleton rows={2} /> : null}
            {real.error ? <Note>The real grid could not be loaded. Check your connection, or use a made-up grid.</Note> : null}
          </>) : (<>
            <Stepper label="Number of teams" value={count} min={2} max={16} onChange={setCount} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>{`Two drivers per team: ${count * 2} cars. Names, logos and colours can be changed after.`}</Text>
            <Btn icon="shuffle" onPress={() => setSeed(seed + 1)}>Shuffle teams and drivers</Btn>
          </>)}
          {grid ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{grid.teams.map((t) => <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: alpha(t.color, 0.2), borderWidth: 1, borderColor: alpha(t.color, 0.6) }}><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '600' }}>{t.name}</Text></View>)}</View> : null}
        </View>
      </Card>
      <Card>
        <Eyebrow>You</Eyebrow>
        <View style={{ marginTop: 10, gap: 10 }}>
          {p ? (<>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Avatar uri={p.photo} size={44} color={p.color} label={p.number} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{p.name || 'Your driver'}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>That is me: race as this driver</Text></View><Switch value={me} onValueChange={setMe} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View>
            {me && grid ? <Dropdown value={meTeam} options={grid.teams.map((t, i) => [i, t.name])} onChange={setMeTeam} prefix="Team" /> : null}
            {me ? <Note>You take the place of the team's second driver. Only one driver per season can be you.</Note> : null}
          </>) : <Note>Create your driver in Fun first to race as yourself.</Note>}
        </View>
      </Card>
      {mode === 'preset' && usePresetRaces ? null : <RacePicker races={races} onChange={setRaces} />}
      <Btn tone="solid" icon="flag" onPress={create} disabled={!ok || !(races.length || (mode === 'preset' && usePresetRaces && pre?.races.length))}>{!ok ? (mode === 'preset' ? 'Pick a preset first' : 'Waiting for the grid…') : (races.length || (mode === 'preset' && usePresetRaces)) ? 'Create the season' : 'Pick at least one race'}</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ one fantasy season */
export function Fantasy({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const insets = useSafeAreaInsets(); const f = fun.get(id); const [tab, setTab] = useState(f?.ended ? 'stats' : 'home'); const [sub, setSub] = useState('drivers'); const [art, setArt] = useState(null); const [busy, setBusy] = useState(false); const [sel, setSel] = useState(null); const [exp, setExp] = useState(false); const [shw, setShw] = useState(null); const [live, setLive] = useState(null); const shotD = useRef(null), shotT = useRef(null);
  useEffect(() => { if (f) navigation.setOptions({ title: f.name }); }, [f?.name]);
  // Back (button or swipe) from an article or from another tab lands on this fantasy's Home, and only from Home leaves the fantasy.
  const sref = useRef(null); useEffect(() => { sref.current?.scrollTo?.({ y: 0, animated: false }); }, [tab, art]);
  const nav = useRef({ art, tab, leave: false }); nav.current.art = art; nav.current.tab = tab;
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    const { art: a, tab: t, leave } = nav.current; if (leave || (!a && t === 'home')) return;
    e.preventDefault(); setArt(null); setTab('home');
  }), [navigation]);
  if (!f) return <Screen header={false}><Note>{fun.loaded ? 'This season no longer exists.' : 'Loading…'}</Note></Screen>;
  const cur = seasonNo(f), n = sel && seasonList(f).includes(sel) ? sel : cur, isCur = n === cur, v = viewOf(f, n), st = standings(v), off = !!f.off && isCur;
  const ended = !!f.ended && isCur, step = isCur && !off && !ended ? nextStep(f) : null, done = v.races.filter((r) => sessionsOf(r).every((s) => v.results?.[r.id]?.[s])).length, complete = isDone(v) && !off;
  const { settings } = fun;
  // Runs a simulation, then (if the animations are on) shows the result full screen: the session, or the champion when the season just ended.
  const apply = (fn, last) => { setBusy(true); setTimeout(() => { fun.update(id, fn); setBusy(false); const g = fun.get(id); if (!g) return; if (isDone(g) && !g.off && settings.animSeason) setShw({ type: 'champ' }); else if (last && settings.animSessions) setShw({ type: 'session', raceId: last.race.id, session: last.session }); }, 30); };
  const ts = isCur && !ended && !off && !complete ? titleStatus(v, 'drivers') : null, tsT = isCur && !ended && !off && !complete ? titleStatus(v, 'teams') : null;
  const banner = (x) => (x ? <Grad color={x.decided ? colors.gold : colors.accent} from={0.3} to={0.04} radius={14} border={0.6} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ fontSize: 22 }}>{x.decided ? '🏆' : '🚩'}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '600' }}>{x.text}</Text></Grad> : null);
  const startLive = () => {
    const st0 = nextStep(f); if (!st0) return; const g = runStep(f, st0); const res = g.results?.[st0.race.id]?.[st0.session] || []; if (!res.length) return;
    const nm = (x) => surname(g.drivers.find((d) => d.id === x));
    const drivers = res.map((r) => { const d = g.drivers.find((x) => x.id === r.driverId); const t = d && teamOf(g, d.teamId); return { id: r.driverId, name: surname(d), code: codeOf(d), photo: d ? driverPic(d) : null, color: t?.color || colors.muted, pos: r.pos, grid: r.grid || r.pos, stops: r.status === 'OK' ? (r.stops || 0) : 0, out: r.status !== 'OK', lap: r.lap || 0, reason: r.reason, crash: !!r.crash, with: r.with, fault: !!r.fault, gap: r.status === 'OK' ? (r.gap ? parseFloat(String(r.gap).replace('+', '')) : 0) : null }; });
    const laps = st0.session === 'Sprint' ? Math.max(10, Math.round((st0.race.laps || 57) / 3)) : (st0.race.laps || 57);
    setLive({ g, st: st0, drivers, laps, sc: !!res[0]?.sc, wet: !!res[0]?.wet });
  };
  const endLive = () => { const l = live; setLive(null); if (l) apply(() => l.g, l.st); };
  const sessRows = (g, raceId, ses) => { const gv = g; const rs = gv.results?.[raceId]?.[ses] || []; return rs.map((r) => { const d = gv.drivers.find((x) => x.id === r.driverId); const t = d && teamOf(gv, d.teamId); return { key: r.driverId, pos: r.pos, name: surname(d), code: codeOf(d), photo: d ? driverPic(d) : null, logo: teamPic(t), color: t?.color || colors.muted, right: r.points ? `${r.time}  +${r.points}` : r.time }; }); };
  const champ = complete ? st.drivers[0] : null, tchamp = complete ? st.teams[0] : null; const tabs = ['home', 'calendar', 'standings', 'news', 'stats', 'paddock', 'settings']; const news = tab === 'news' || tab === 'home' || art ? buildNews(f, v, st, n) : [];
  const shown = art ? 'article' : tab;
  const bar = <BarView active={tab} onPress={(k) => { setArt(null); setTab(k); }} items={[['home', 'home', 'Home'], ['calendar', 'calendar', 'Calendar'], ['standings', 'trophy', 'Standings'], ['news', 'newspaper', 'News'], ['stats', 'stats-chart', 'Stats'], ['paddock', 'people', 'Paddock']]} />;
  const openDriver = (d) => navigation.navigate('FantasyDriver', { id, driverId: d.id, season: n });
  const driverRows = st.drivers.map((d) => ({ key: d.id, name: surname(d), team: teamOf(v, d.teamId)?.name || '', color: tcol(v, d.teamId), points: d.points, photo: driverPic(v.drivers.find((x) => x.id === d.id)), code: codeOf(d), logo: teamPic(teamOf(v, d.teamId)) }));
  const teamRows = st.teams.map((t) => ({ key: t.id, name: t.name, team: `${t.wins} wins`, color: t.color, points: t.points, logo: teamPic(t), teamRow: true }));
  return (
    <Screen header={false} scrollRef={sref} revealKey={`${shown}:${sub}`} footer={bar} swipe={{ index: Math.min(5, tabs.indexOf(tab)), count: 6, onIndex: (i) => { setArt(null); setTab(tabs[i]); } }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>{seasonList(f).length > 1 ? <Dropdown value={n} options={seasonList(f).map((k) => [k, k === cur ? `Season ${k} · ${off ? 'transfers' : 'current'}` : `Season ${k}`])} onChange={(k) => { setSel(k); setExp(false); }} prefix="Season" /> : null}</View>
        <Pressable onPress={() => { setArt(null); setTab(tab === 'settings' ? 'home' : 'settings'); }} hitSlop={10} accessibilityLabel="Fantasy settings" style={({ pressed }) => [{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === 'settings' ? alpha(colors.accent, 0.3) : 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.6 }]}><Ionicons name="settings-outline" size={20} color={colors.fg} /></Pressable>
      </View>
      <UndoChip depth={fun.undoDepth(id)} onPress={() => fun.undo(id)} />
      <LiveRace visible={!!live} race={live?.st.race.name || ''} laps={live?.laps} drivers={live?.drivers} sc={live?.sc} wet={live?.wet} onClose={endLive} />
      <SessionShow visible={shw?.type === 'session'} title={(shw?.type === 'session' && f.races.find((r) => r.id === shw.raceId)?.name) || ''} sub={shw?.session} rows={shw?.type === 'session' ? sessRows(f, shw.raceId, shw.session) : []} onClose={() => setShw(null)} />
      <TransferShow visible={shw?.type === 'transfers'} season={shw?.season} items={shw?.items || []} onClose={() => setShw(null)} />
      <ChampionShow visible={shw?.type === 'champ'} season={cur} driver={st.drivers[0]} photo={driverPic(st.drivers[0])} team={teamOf(f, st.drivers[0]?.teamId)} teamLogo={teamPic(teamOf(f, st.drivers[0]?.teamId))} points={st.drivers[0]?.points} wins={st.drivers[0]?.wins}
        stats={st.drivers[0] ? [['Points', st.drivers[0].points], ['Wins', st.drivers[0].wins], ['Podiums', st.drivers[0].podiums], ['Poles', st.drivers[0].poles], ['Fastest laps', st.drivers[0].fl || 0], ['Margin', st.drivers[1] ? `${st.drivers[0].points - st.drivers[1].points} pts` : '—']] : []}
        podium={st.drivers.slice(0, 3).map((d) => ({ name: surname(d), photo: driverPic(d), color: tcol(f, d.teamId), number: d.number, points: d.points }))}
        teamPodium={st.teams.slice(0, 3).map((t) => ({ name: t.name, logo: teamPic(t), color: t.color, points: t.points }))} onClose={() => setShw(null)} />
      {shown === 'home' && (<>
        {banner(ts)}
        {ended ? (
          <Card>
            <Eyebrow>Save ended</Eyebrow>
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>This save is closed. Everything that happened is in the Stats tab.</Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              <Btn tone="solid" icon="stats-chart" onPress={() => setTab('stats')}>Show the total stats</Btn>
              <Btn icon="refresh" onPress={() => fun.update(id, (g) => ({ ...g, ended: false }))}>Reopen this save</Btn>
            </View>
          </Card>
        ) : off ? (
          <Card>
            <Eyebrow>{`Season ${cur} · transfers`}</Eyebrow>
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>Move drivers between teams, change numbers, add new drivers and choose the calendar. Then start the season.</Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              <Btn tone="solid" icon="swap-horizontal" onPress={() => navigation.navigate('FantasyTransfers', { id })}>Open transfers</Btn>
              <Btn icon="play" onPress={() => fun.update(id, (g) => ({ ...g, off: false }))}>{`Start season ${cur} as it is`}</Btn>
            </View>
          </Card>
        ) : (
          <Card>
            <Eyebrow>{complete ? `Season ${n} complete` : isCur ? 'Next up' : `Season ${n}`}</Eyebrow>
            {champ ? (<View style={{ marginTop: 10, gap: 4 }}><Text style={{ color: colors.gold, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }}>{`🏆 ${champ.name}`}</Text><Text style={{ color: colors.muted, fontSize: 16 }}>{`${champ.points} points · ${teamOf(v, champ.teamId)?.name || ''}`}</Text>{tchamp ? <Text style={{ color: colors.muted, fontSize: 15 }}>{`Constructors: ${tchamp.name}`}</Text> : null}</View>)
              : step ? (<View style={{ marginTop: 10, gap: 4 }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{step.race.name}</Text><Text style={{ color: colors.muted, fontSize: 16 }}>{`Race ${step.index + 1} of ${f.races.length} · ${step.session}`}</Text></View>) : null}
            {step ? (
              <View style={{ gap: 10, marginTop: 14 }}>
                <Btn tone="solid" icon="play" disabled={busy} onPress={() => { const st0 = nextStep(f); apply((g) => runStep(g, nextStep(g)), st0); }}>{`Simulate ${step.session.toLowerCase()}`}</Btn>
                {step.session === 'Race' || step.session === 'Sprint' ? <Btn icon="radio" disabled={busy} onPress={startLive}>{`Watch ${step.session.toLowerCase()} live`}</Btn> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn icon="play-skip-forward" disabled={busy} onPress={() => { const st0 = nextStep(f); apply(runWeekend, { race: st0.race, session: 'Race' }); }} style={{ flex: 1 }}>Whole weekend</Btn>
                  <Btn icon="fast-forward" disabled={busy} onPress={() => apply(runSeason)} style={{ flex: 1 }}>Whole season</Btn>
                </View>
              </View>) : null}
            {complete && isCur && !ended ? (
              <View style={{ gap: 10, marginTop: 14 }}>
                <Btn tone="solid" icon="arrow-forward-circle" onPress={() => {
                  const mode = settings.transfers; let g = closeSeason(f, settings.evolve);
                  if (mode === 'auto') { const r = simulateTransfers(g); g = { ...r.f, off: false }; } else if (mode === 'none') g = { ...g, off: false, news: [] };
                  fun.update(id, () => g); setSel(null);
                  if (mode === 'manual') navigation.navigate('FantasyTransfers', { id }); else if (mode === 'auto' && settings.animSeason) setShw({ type: 'transfers', items: showItems(g, g.news), season: cur + 1 });
                }}>{`Continue to season ${cur + 1}`}</Btn>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{`${settings.transfers === 'auto' ? 'Transfers happen by themselves.' : settings.transfers === 'none' ? 'No transfers: everyone stays.' : 'You choose the transfers.'} ${settings.evolve ? 'Ratings change a little.' : 'Ratings stay as they are.'} Change this in the fantasy settings (Settings tab).`}</Text>
              </View>) : null}
          </Card>)}
        {(() => { const lastR = [...v.races].reverse().find((r) => v.results?.[r.id]?.Race); return lastR && !off ? <Press onPress={() => navigation.navigate('FantasyRace', { id, raceId: lastR.id, season: n })}><ReportCard title={`Last race · ${lastR.name}`} items={raceReport(v, lastR)} /></Press> : null; })()}
        {!off ? (() => { const left = v.races.length - done; const pct = v.races.length ? done / v.races.length : 0; return (
          <Grad color={colors.accent} from={0.35} to={0.05} radius={16} border={0.5} style={{ padding: 14, gap: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{complete ? 'SEASON COMPLETE' : 'COUNTDOWN'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '800', fontStyle: 'italic' }}>{complete ? done : left}</Text><Text style={{ color: colors.muted, fontSize: 17, marginBottom: 8 }}>{complete ? `races run in season ${n}` : `${left === 1 ? 'race' : 'races'} to go`}</Text></View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ width: `${Math.round(pct * 100)}%`, height: 6, backgroundColor: colors.accent }} /></View>
          </Grad>); })() : null}
        {st.drivers.length && done ? (<View style={{ gap: 8 }}><Eyebrow>Top 3</Eyebrow>{st.drivers.slice(0, 3).map((d, i) => { const t = teamOf(v, d.teamId); return <ResultLine key={d.id} pos={i + 1} first={d.first} last={d.last} color={tcol(v, d.teamId)} right={String(d.points)} sub={`${d.wins} wins · ${t?.name || ''}`} fav={d.me} photoSrc={driverPic(d)} logoSrc={teamPic(t)} onPress={() => openDriver(d)} />; })}<Btn icon="trophy-outline" onPress={() => setTab('standings')}>Full standings</Btn></View>) : null}
        {news.length ? (<View style={{ gap: 8 }}><Eyebrow>Headlines</Eyebrow>{news.slice(0, 3).map((a) => <NewsCard key={a.id} a={a} compact onPress={() => setArt(a)} />)}</View>) : null}
      </>)}
      {shown === 'calendar' && (<>
        {banner(ts)}
        <View><Eyebrow>{`Calendar · ${done}/${v.races.length}`}</Eyebrow></View>
        {v.races.map((r, i) => {
          const k = sessionsOf(r).filter((s) => v.results?.[r.id]?.[s]).length, all = sessionsOf(r).length, win = v.results?.[r.id]?.Race?.[0], w = win && v.drivers.find((d) => d.id === win.driverId);
          return (
            <Press key={r.id} onPress={() => navigation.navigate('FantasyRace', { id, raceId: r.id, season: n })}>
              <Grad color={w ? tcol(v, w.teamId) : colors.accent} from={k === all ? 0.4 : 0.14} to={0.03} dir="h" radius={14} border={0.3} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.accent, 0.2) }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{`R${i + 1}`}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{`${raceFlag(r) ? raceFlag(r) + ' ' : ''}${r.name}`}{r.sprint ? '  · SPRINT' : ''}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{w ? `Winner: ${w.name}` : `${k}/${all} sessions`}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Grad>
            </Press>);
        })}
      </>)}
      {shown === 'standings' && <Segmented value={sub} onChange={setSub} items={[['drivers', 'Drivers'], ['teams', 'Teams']]} />}
      {shown === 'standings' && sub === 'drivers' && (<>
        {banner(ts)}
        <Btn icon="share-social-outline" onPress={() => setExp(!exp)}>{exp ? 'Hide the export picture' : 'Export the drivers standings'}</Btn>
        {exp ? <><StandingsCard shotRef={shotD} title={`${f.name} · drivers`} sub={`Season ${n}`} rows={driverRows} /><ExportBar target={shotD} /></> : null}
        {st.drivers.map((d, i) => { const t = teamOf(v, d.teamId); return <ResultLine key={d.id} pos={i + 1} first={d.first} last={d.last} color={tcol(v, d.teamId)} right={String(d.points)} sub={`${d.nat ? flagOfCountry(d.nat) + ' ' : ''}${d.wins} wins · ${t?.name || ''}`} fav={d.me} champion={complete && i === 0} photoSrc={driverPic(d)} logoSrc={teamPic(t)} onPress={() => openDriver(d)} />; })}
      </>)}
      {shown === 'standings' && sub === 'teams' && (<>
        {banner(tsT)}
        <Btn icon="share-social-outline" onPress={() => setExp(!exp)}>{exp ? 'Hide the export picture' : 'Export the teams standings'}</Btn>
        {exp ? <><StandingsCard shotRef={shotT} title={`${f.name} · teams`} sub={`Season ${n}`} rows={teamRows} /><ExportBar target={shotT} /></> : null}
        {st.teams.map((t, i) => (
          <Grad key={t.id} color={t.color} from={0.5} to={0.06} dir="h" radius={16} border={complete && i === 0 ? 0.9 : 0.4} style={[{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, complete && i === 0 && { borderColor: colors.gold }]}>
            <Text style={{ width: 26, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>{i + 1}</Text>
            <Avatar source={teamPic(t)} color={t.color} label={t.name} size={44} radius={12} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{t.name}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{`${t.wins} wins`}</Text></View>
            <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{t.points}</Text>
          </Grad>))}
      </>)}

      {shown === 'article' && (<>
        <Btn icon="arrow-back" onPress={() => { setArt(null); setTab('home'); }}>Back to home</Btn>
        <NewsCard a={art} full />
      </>)}
      {shown === 'news' && (<>
        <Note>{`Written by the fantasy paddock, season ${n}. New stories appear as races are run.`}</Note>
        {news.map((a) => <NewsCard key={a.id} a={a} onPress={() => setArt(a)} />)}
      </>)}
      {shown === 'paddock' && (<>
        {st.teams.map((t) => { const ds = st.drivers.filter((d) => d.teamId === t.id); return (
          <Grad key={t.id} color={t.color} from={0.5} to={0.06} dir="h" radius={18} border={0.4} style={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar source={teamPic(t)} color={t.color} label={t.name} size={44} radius={12} />
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{t.name}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{`${t.points} pts · ${t.wins} ${t.wins === 1 ? 'win' : 'wins'} · car ${TA(t).car}`}</Text></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ds.map((d) => (
                <Pressable key={d.id} onPress={() => openDriver(d)} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)' }, pressed && { opacity: 0.7 }]}>
                  <Avatar source={driverPic(v.drivers.find((x) => x.id === d.id))} color={t.color} label={codeOf(d)} size={38} radius={19} />
                  <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{surname(d)}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }} numberOfLines={1}>{`${d.nat ? flagOfCountry(d.nat) + ' ' : ''}#${d.number} · ${d.points} pts`}</Text></View>
                </Pressable>))}
            </View>
          </Grad>); })}
      </>)}
      {shown === 'stats' && <AllStats f={f} v={v} n={n} closed={complete || (ended && isCur)} navigation={navigation} />}
      {shown === 'settings' && <FunSettingsCard />}
      {shown === 'settings' && (<Card><Eyebrow>Save</Eyebrow><View style={{ gap: 10, marginTop: 10 }}>
        {fun.canUndo(id) ? <Btn icon="arrow-undo" onPress={() => fun.undo(id)}>Undo last change</Btn> : null}
        <Btn icon={f.archived ? 'archive' : 'archive-outline'} onPress={() => { fun.update(id, (g) => ({ ...g, archived: !g.archived })); if (!f.archived) { nav.current.leave = true; navigation.goBack(); } }}>{f.archived ? 'Restore from the archive' : 'Archive this save'}</Btn>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Archived saves move out of the main list into an Archived section. Nothing is deleted and you can restore them any time.</Text>
        {isCur && !ended ? <Btn icon="flag" onPress={() => Alert.alert('End this save?', 'The save is closed and the total stats of every season are shown. You can reopen it later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'End save', onPress: () => { fun.update(id, (g) => ({ ...g, ended: true, endedAt: Date.now(), off: false })); setTab('stats'); } }])}>End this save and show total stats</Btn> : null}
      </View></Card>)}
      {shown === 'settings' && (isCur ? <Setup f={f} update={(fn) => fun.update(id, fn)} profile={fun.profile} navigation={navigation} onDelete={() => Alert.alert('Delete this fantasy?', 'All its seasons are deleted and cannot be brought back.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { nav.current.leave = true; fun.remove(id); navigation.goBack(); } }])} /> : <Note>Past seasons cannot be edited. Switch back to the current season to change the setup.</Note>)}
    </Screen>
  );
}

function Setup({ f, update, profile, navigation, onDelete }) {
  const [msg, setMsg] = useState(''); const [pick, setPick] = useState(null); const [lp, setLp] = useState(null); const fun = useFun();
  const setTeam = (tid, patch) => update((g) => ({ ...g, teams: g.teams.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
  const logo = async (tid) => { const r = await pickImage(); if (r.uri) setTeam(tid, { logo: r.uri }); else if (r.error) setMsg(r.error); };
  const started = Object.keys(f.results || {}).length > 0;
  const add = (tid, real) => update((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, tid, real)] }));
  return (<>
    <Card><Eyebrow>Season name</Eyebrow><View style={{ marginTop: 10 }}><Field value={f.name} onChange={(v) => update((g) => ({ ...g, name: v }))} maxLength={30} /></View></Card>
    {f.teams.map((t) => (
      <TeamEditor key={t.id} t={t} setTeam={(patch) => setTeam(t.id, patch)}>
        {f.drivers.filter((d) => d.teamId === t.id).map((d) => (
          <Press key={d.id} onPress={() => navigation.navigate('FantasyDriver', { id: f.id, driverId: d.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Avatar source={driverPic(d)} color={t.color} label={d.number} size={40} />
              <View style={{ flex: 1 }}><Text style={{ color: d.me ? colors.gold : colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{d.me ? `★ ${d.name}` : d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`#${d.number} · overall ${ovr(d)} · age ${A(d).age}${d.ref ? ' · real driver' : ''}`}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Press>))}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn icon="add" onPress={() => add(t.id)} style={{ flex: 1, height: 40 }}>Custom</Btn>
          <Btn icon="search" onPress={() => { setPick(pick === t.id ? null : t.id); setLp(null); }} style={{ flex: 1, height: 40 }}>Real</Btn>
          <Btn icon="bookmark-outline" onPress={() => { setLp(lp === t.id ? null : t.id); setPick(null); }} style={{ flex: 1, height: 40 }}>Preset</Btn>
        </View>
        {pick === t.id ? <DriverPicker exclude={f.drivers.map((d) => d.ref).filter(Boolean)} onClose={() => setPick(null)} onPick={(d) => { add(t.id, d); setPick(null); }} /> : null}
        {lp === t.id ? <LibDriverPicker onClose={() => setLp(null)} onPick={(d) => update((g) => ({ ...g, drivers: [...g.drivers, libDriver(g, t.id, d)] }))} /> : null}
      </TeamEditor>))}
    {msg ? <Note>{msg}</Note> : null}
    <Text style={{ color: colors.muted, fontSize: 14 }}>Tap a driver to change the photo, number, team or strength, and to remove them.</Text>
    {!f.preset ? <Btn icon="bookmarks-outline" onPress={() => { const { id, created, history, results, off, ended, endedAt, news, season, ...rest } = f; fun.addFantasy({ ...rest, id: uid(), name: `${f.name} grid`, preset: true, created: Date.now(), season: 1, history: [], results: {}, mode: f.mode, drivers: f.drivers.map((d) => ({ ...d, me: false })), teams: f.teams }); setMsg('Saved as a grid preset. Find it in Fun → Presets.'); }}>Save this grid as a preset</Btn> : null}
    {started ? <Btn icon="refresh" onPress={() => Alert.alert('Reset results?', 'All simulated results of this season are deleted. The teams and drivers stay.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => update((g) => ({ ...g, results: {} })) }])}>Reset this season's results</Btn> : null}
    <Btn icon="trash-outline" onPress={onDelete}>Delete this fantasy</Btn>
  </>);
}

/* ------------------------------------------------------------------ transfer window between seasons */
export function FantasyTransfers({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const f = fun.get(id); const [pick, setPick] = useState(null); const [show, setShow] = useState(false); const [lp, setLp] = useState(null);
  if (!f) return <Screen header={false}><Note>Not found.</Note></Screen>;
  const upd = (fn) => fun.update(id, fn); const setD = (did, patch) => upd((g) => ({ ...g, drivers: g.drivers.map((d) => (d.id === did ? { ...d, ...patch } : d)) }));
  const empty = f.teams.filter((t) => !f.drivers.some((d) => d.teamId === t.id)), canStart = f.races.length > 0 && f.drivers.length >= 2 && !empty.length;
  const prev = (f.history || []).at(-1); const was = (did) => prev?.drivers.find((d) => d.id === did)?.teamId;
  return (
    <Screen header={false}>
      <TransferShow visible={show} season={seasonNo(f)} items={showItems(f, f.news)} onClose={() => setShow(false)} />
      <Card>
        <Eyebrow>{`Season ${seasonNo(f)} · transfers`}</Eyebrow>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>Change the team or number of anyone, release or retire drivers, bring in new ones, then pick the calendar. Last season's results are kept under Season {seasonNo(f) - 1}. Cars changed over the winter; drivers only age.</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Btn tone="solid" icon="flag" disabled={!canStart} onPress={() => { upd((g) => ({ ...g, off: false })); navigation.navigate('Fantasy', { id }); }}>{`Start season ${seasonNo(f)} now`}</Btn>
          <Btn icon="shuffle" onPress={() => { const r = simulateTransfers(f); upd(() => r.f); if (fun.settings.animSeason) setShow(true); }}>{f.news?.length ? 'Simulate the transfers again' : 'Simulate transfers (random)'}</Btn>
          <UndoChip depth={fun.undoDepth(id)} onPress={() => fun.undo(id)} />
        </View>
        {(f.news || []).length ? (<View style={{ gap: 6, marginTop: 12 }}><Eyebrow>Transfer news</Eyebrow>{f.news.map((n, i) => <Text key={i} style={{ color: n.kind === 'retire' ? colors.muted : colors.fg, fontSize: 15 }}>{`${n.kind === 'retire' ? '🏁' : n.kind === 'rookie' ? '🌱' : n.kind === 'move' ? '🔁' : '•'} ${n.text}`}</Text>)}</View>) : null}
      </Card>
      {f.teams.map((t) => (
        <TeamEditor key={t.id} t={t} setTeam={(patch) => upd((g) => ({ ...g, teams: g.teams.map((x) => (x.id === t.id ? { ...x, ...patch } : x)) }))}>
          {f.drivers.filter((d) => d.teamId === t.id).map((d) => (
            <View key={d.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar source={driverPic(d)} color={t.color} label={d.number} size={40} />
                <View style={{ flex: 1 }}><Text style={{ color: d.me ? colors.gold : colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{d.me ? `★ ${d.name}` : d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`Age ${A(d).age} · overall ${ovr(d)}`}</Text>{was(d.id) && was(d.id) !== d.teamId ? <Text style={{ color: colors.good, fontSize: 13 }}>{`Moved from ${prev.teams.find((x) => x.id === was(d.id))?.name || 'another team'}`}</Text> : !was(d.id) ? <Text style={{ color: colors.good, fontSize: 13 }}>New driver</Text> : null}</View>
                <NumField f={f} d={d} onSet={(k) => setD(d.id, { number: k })} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Dropdown value={d.teamId} options={f.teams.map((x) => [x.id, x.name])} onChange={(tid) => setD(d.id, { teamId: tid })} prefix="Team" /></View>
                {!d.me ? <Pressable onPress={() => setD(d.id, { noRetire: !d.noRetire })} hitSlop={8} accessibilityLabel={d.noRetire ? 'Allow retirement' : 'Never retire'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={d.noRetire ? 'shield-checkmark' : 'shield-outline'} size={22} color={d.noRetire ? colors.good : colors.muted} /></Pressable> : null}
                {!d.me ? <Pressable onPress={() => Alert.alert(`Retire ${d.name}?`, 'He stops racing and leaves the grid.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Retire', style: 'destructive', onPress: () => upd((g) => ({ ...g, drivers: g.drivers.filter((x) => x.id !== d.id), news: [...(g.news || []), { kind: 'retire', text: `${d.name} (${A(d).age}) retires from racing.` }] })) }])} hitSlop={8} accessibilityLabel="Retire driver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="flag-outline" size={22} color={colors.muted} /></Pressable> : null}
                <Pressable onPress={() => Alert.alert(`Release ${d.name}?`, 'They leave the grid. Their past results stay in the history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Release', style: 'destructive', onPress: () => upd((g) => ({ ...g, drivers: g.drivers.filter((x) => x.id !== d.id) })) }])} hitSlop={8} accessibilityLabel="Release driver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-remove-outline" size={22} color={colors.muted} /></Pressable>
              </View>
            </View>))}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn icon="add" onPress={() => upd((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, t.id)] }))} style={{ flex: 1, height: 40 }}>Custom</Btn>
            <Btn icon="search" onPress={() => { setPick(pick === t.id ? null : t.id); setLp(null); }} style={{ flex: 1, height: 40 }}>Real</Btn>
            <Btn icon="bookmark-outline" onPress={() => { setLp(lp === t.id ? null : t.id); setPick(null); }} style={{ flex: 1, height: 40 }}>Preset</Btn>
          </View>
          {lp === t.id ? <LibDriverPicker onClose={() => setLp(null)} onPick={(d) => upd((g) => ({ ...g, drivers: [...g.drivers, libDriver(g, t.id, d)] }))} /> : null}
          {pick === t.id ? <DriverPicker exclude={f.drivers.map((d) => d.ref).filter(Boolean)} onClose={() => setPick(null)} onPick={(d) => { upd((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, t.id, d)] })); setPick(null); }} /> : null}
        </TeamEditor>))}
      <RacePicker races={f.races} onChange={(r) => upd((g) => ({ ...g, races: r }))} />
      {empty.length ? <Note>{`${empty.map((t) => t.name).join(', ')} ${empty.length > 1 ? 'have' : 'has'} no drivers yet.`}</Note> : null}
      <Btn tone="solid" icon="flag" disabled={!canStart} onPress={() => { upd((g) => ({ ...g, off: false })); navigation.navigate('Fantasy', { id }); }}>{`Start season ${seasonNo(f)}`}</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ a driver of a fantasy: the same kind of profile as a real driver */
export function FantasyDriver({ route, navigation }) {
  const { id, driverId, season: seasonParam } = route.params; const fun = useFun(); const f = fun.get(id); const [msg, setMsg] = useState(''); const [sv, setSv] = useState(null); const [seasonsOpen, setSeasonsOpen] = useState(false);
  // A driver who retired or left is no longer on the grid: he is found in the history, and the profile opens on the last season he raced.
  const inGrid = !!f?.drivers.some((x) => x.id === driverId); const hist = f ? [...(f.history || [])].reverse().find((h) => h.drivers.some((x) => x.id === driverId)) : null;
  const season = sv ?? seasonParam ?? (inGrid ? undefined : hist?.n);
  const v = f ? viewOf(f, season) : null; const cur = f ? seasonNo(f) : 1; const isCur = !season || season === cur;
  const d = f?.drivers.find((x) => x.id === driverId) || v?.drivers.find((x) => x.id === driverId) || hist?.drivers.find((x) => x.id === driverId);
  const real = useAsync(() => (d?.ref ? Promise.all([driverCareer(d.ref, YEAR), driverTitles(d.ref, YEAR)]) : Promise.resolve(null)), [d?.ref]);
  useEffect(() => { if (d) navigation.setOptions({ title: d.name }); }, [d?.name]);
  if (!f || !d) return <Screen header={false}><Note>This driver is no longer in the season.</Note></Screen>;
  const t = teamOf(v, d.teamId) || teamOf(f, d.teamId), color = t?.color || colors.accent; const C = careerOf(f, d.id); const st = standings(v), me = st.drivers.find((x) => x.id === d.id), rank = st.drivers.findIndex((x) => x.id === d.id) + 1;
  const editable = isCur && f.drivers.some((x) => x.id === d.id); const canMove = !!f.off || !Object.keys(f.results || {}).length;
  const upd = (patch) => fun.update(id, (g) => ({ ...g, drivers: g.drivers.map((x) => (x.id === d.id ? { ...x, ...patch } : x)) }));
  const photo = async () => { const r = await pickImage(); if (r.uri) upd({ photo: r.uri }); else if (r.error) setMsg(r.error); };
  const [rc, rt] = real.v || [null, null]; const hasReal = !!d.ref && real.v;
  const tot = (k) => (hasReal ? sum(rc?.[k] ?? null, C[k]) : C[k]);
  const photoSrc = driverPic(d);
  return (
    <Screen header={false}>
      <Grad color={color} from={0.68} to={0.06} border={0.5} style={{ height: 210 }}>
        {photoSrc ? <Cutout source={photoSrc} size={250} style={{ position: 'absolute', right: -20, bottom: -26 }} /> : <Text style={{ position: 'absolute', right: 8, bottom: -22, fontFamily: 'display', fontWeight: '800', fontSize: 150, color: 'rgba(255,255,255,0.12)' }}>{d.number}</Text>}
        {photoSrc ? <Scrim dir="h" from={0.7} to={0} style={{ right: '25%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 30 }}>{`#${d.number}`}</Text>
          <View style={{ maxWidth: '62%' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} numberOfLines={1}>{d.first}</Text>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 34, color: colors.fg, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{d.last || d.first}</Text>
            <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{d.nat ? `${flagOfCountry(d.nat)} ` : ''}{t?.name}{C.titles ? `  ·  ${C.titles}× champion` : ''}</Text>
          </View>
        </View>
      </Grad>
      <UndoChip depth={fun.undoDepth(id)} onPress={() => fun.undo(id)} />
      {!inGrid ? <Note>{`No longer on the grid. Showing season ${season ?? '—'}, the last one he raced.`}</Note> : null}
      <Text style={{ color: colors.muted, fontSize: 14 }}>{d.me ? "This is you. Your photo, name and number come from your driver profile." : d.ref ? 'A fantasy version of a real driver. What happens here only counts in this fantasy.' : 'A fantasy driver.'}</Text>
      <Card>
        <Eyebrow>{`Season ${season || cur}`}</Eyebrow>
        <StatGrid cols={3} items={[['Position', me && me.races ? `P${rank}` : '—'], ['Points', dash(me?.points)], ['Wins', dash(me?.wins)], ['Podiums', dash(me?.podiums)], ['Poles', dash(me?.poles)], ['Races', dash(me?.races)]]} />
      </Card>
      <Card>
        <Eyebrow>{hasReal ? 'Career · real plus fantasy' : 'Career in this fantasy'}</Eyebrow>
        {d.ref && real.loading ? <Skeleton rows={2} /> : null}
        <StatGrid cols={3} items={[['Titles', dash(hasReal ? sum(rt, C.titles) : C.titles)], ['Races', dash(tot('races'))], ['Wins', dash(tot('wins'))], ['Podiums', dash(tot('podiums'))], ['Poles', dash(tot('poles'))], ['Points', dash(tot('points'))], ['Best finish', C.best ? `P${C.best}` : '—'], ['Seasons', dash(hasReal ? sum(rc?.seasons ?? null, C.seasons) : C.seasons)], ['DNF', dash(C.dnf)]]} />
        {hasReal ? <Note>{`Real career before this fantasy: ${dash(rc?.races)} races, ${dash(rc?.wins)} wins, ${dash(rt)} titles. Fantasy results are added on top and never change the real profile.`}</Note> : null}
      </Card>
      <Card>
        <Eyebrow>{`Attributes · overall ${ovr(d)} · age ${A(d).age}`}</Eyebrow>
        <View style={{ gap: 9, marginTop: 12 }}>
          {DRIVER_ATTRS.map(([k, label]) => { const v = Math.round(A(d)[k]); return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 108, color: colors.muted, fontSize: 14 }}>{label}</Text>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}><View style={{ width: `${Math.max(4, Math.min(100, (v - 30) / 0.69))}%`, height: 8, borderRadius: 4, backgroundColor: v >= 90 ? colors.gold : color }} /></View>
              <Text style={{ width: 28, textAlign: 'right', color: colors.fg, fontWeight: '800', fontSize: 15 }}>{v}</Text>
            </View>); })}
          {t ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{`Team: car ${Math.round(TA(t).car)} · reliability ${Math.round(TA(t).rel)} · pit crew ${Math.round(TA(t).pit)}. The car decides most of the result, talent adds on top.`}</Text> : null}
        </View>
      </Card>
      {C.bySeason.length ? (
        <Card>
          <Pressable onPress={() => setSeasonsOpen(!seasonsOpen)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Eyebrow>Fantasy seasons</Eyebrow><Text style={{ flex: 1, color: colors.muted, fontSize: 14 }}>{`${C.bySeason.length} · tap to ${seasonsOpen ? 'close' : 'open'}`}</Text><Ionicons name={seasonsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.fg} />
          </Pressable>
          {seasonsOpen ? (<View style={{ gap: 6, marginTop: 12 }}>{C.bySeason.map((x) => { const on = (season || cur) === x.n; return (
            <Pressable key={x.n} onPress={() => { setSv(x.n); setSeasonsOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: on ? colors.accentSoft : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
              <Text style={{ width: 30, color: colors.muted, fontWeight: '800' }}>{`S${x.n}`}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{x.team}</Text>
              <Text style={{ color: x.title ? colors.gold : colors.fg, fontWeight: '800', fontSize: 15 }}>{x.title ? '🏆 Champion' : `P${x.rank} · ${x.points} pts`}</Text>
            </Pressable>); })}<Text style={{ color: colors.muted, fontSize: 13 }}>Tap a season to see its results below.</Text></View>) : null}
        </Card>) : null}
      {v.races.filter((r) => v.results?.[r.id]?.Race?.some((x) => x.driverId === d.id)).length ? (
        <Section title={`Results · season ${season || cur}`}>
          <Fold items={[...v.races].filter((r) => v.results?.[r.id]?.Race?.some((x) => x.driverId === d.id)).reverse()} limit={5} label="View all races" gap={5} render={(r) => { const x = v.results?.[r.id]?.Race?.find((y) => y.driverId === d.id); const q = v.results?.[r.id]?.Qualifying?.find((y) => y.driverId === d.id);
            return <ResultLine key={r.id} pos={x.status === 'OK' ? x.pos : 'DNF'} first={raceFlag(r)} last={r.name} color={color} right={x.time} sub={`${q ? `Grid ${q.pos} · ` : ''}${x.points ? `+${x.points}` : '0'} pts`} onPress={() => navigation.navigate('FantasyRace', { id, raceId: r.id, season: season || cur, focus: d.id })} />; }} />
        </Section>) : null}
      {d.ref ? <Btn icon="open-outline" onPress={() => navigation.navigate('Driver', { driverId: d.ref, name: d.name, first: d.first, last: d.last })}>Open the real profile</Btn> : null}
      {editable ? (
        <Card>
          <Eyebrow>Edit driver</Eyebrow>
          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn icon="image-outline" onPress={photo} style={{ flex: 1 }}>{d.photo ? 'Change photo' : 'Add photo'}</Btn>
              {d.photo && !d.me ? <Btn icon="trash-outline" onPress={() => upd({ photo: null })}>Remove</Btn> : null}
            </View>
            {!canPickImage() ? <Note>Photos need the newest app build.</Note> : null}
            {d.me ? <Note>Name, number and photo follow your own driver profile.</Note> : (<>
              <Field label="Name" value={d.name} onChange={(x) => upd({ name: x, ...nameParts(x) })} maxLength={28} />
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><NumField f={f} d={d} onSet={(k) => upd({ number: k })} /><View style={{ flex: 1, paddingTop: 22 }}><Text style={{ color: colors.muted, fontSize: 13 }}>Any number from 1 to 99 that nobody else in this fantasy has.</Text></View></View>
            </>)}
            {DRIVER_ATTRS.map(([k, label]) => <Slide key={k} label={label} value={Math.round(A(d)[k])} min={30} max={99} color={color} onChange={(x) => upd(attrPatch(d, k, x))} />)}
            <Stepper label="Age" value={A(d).age} min={17} max={50} onChange={(x) => upd(attrPatch(d, 'age', x))} />
            {!d.ref ? <Dropdown value={d.nat || ''} options={[['', 'No nationality'], ...countryNames.map((n) => [n, `${flagOfCountry(n)}  ${n}`])]} onChange={(n) => upd({ nat: n })} prefix="Nationality" /> : null}
            {canMove ? <Dropdown value={d.teamId} options={f.teams.map((x) => [x.id, x.name])} onChange={(tid) => upd({ teamId: tid })} prefix="Team" /> : <Note>Drivers change teams between seasons, in the transfers.</Note>}
            {!d.me ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>Never retires by himself</Text><Text style={{ color: colors.muted, fontSize: 13 }}>Random transfers skip this driver. You can still retire him by hand.</Text></View><Switch value={!!d.noRetire} onValueChange={(x) => upd({ noRetire: x })} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View> : null}
            {d.ref && !d.me ? <Btn icon="person-outline" onPress={() => upd({ ref: null })}>Make a custom driver (drops the real career)</Btn> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!d.me ? <Btn icon="person" onPress={() => { if (!fun.profile) { setMsg('Create your driver in Fun first.'); navigation.navigate('FunProfile'); return; } fun.update(id, (g) => makeMe(g, fun.profile, d.id)); }} style={{ flex: 1 }}>That's me</Btn> : <Btn icon="close" onPress={() => upd({ me: false, photo: null })} style={{ flex: 1 }}>Not me</Btn>}
              {canMove ? <Btn icon="person-remove-outline" onPress={() => Alert.alert(`Remove ${d.name}?`, 'They leave the grid of this season.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { fun.update(id, (g) => ({ ...g, drivers: g.drivers.filter((x) => x.id !== d.id) })); navigation.goBack(); } }])} style={{ flex: 1 }}>Remove</Btn> : null}
            </View>
            {msg ? <Text style={{ color: colors.muted, fontSize: 15 }}>{msg}</Text> : null}
          </View>
        </Card>) : null}
    </Screen>
  );
}

/* ------------------------------------------------------------------ one race: the same session menu and rows as the real results, plus exports */

function NewsCard({ a, compact, full, onPress }) {
  const col = a.color || colors.accent; const body = Array.isArray(a.body) ? a.body : [a.body]; const sub = a.subject;
  const mark = sub ? (sub.type === 'driver' ? (sub.number != null ? String(sub.number) : '') : String(sub.name || '').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase()) : '';
  const emblem = (size) => (<Grad color={col} from={0.9} to={0.35} radius={size / 2} border={0} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '800', fontStyle: 'italic' }}>{mark}</Text></Grad>);
  const inner = full ? (
    <View style={{ gap: 14 }}>
      <Grad color={col} from={0.55} to={0.06} dir="h" radius={16} border={0.4} style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {mark ? emblem(64) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'label', fontSize: 11, letterSpacing: 1.8 }} numberOfLines={1}>{a.kicker}</Text>
            {sub ? <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>{sub.name}</Text> : null}
            {sub ? <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }} numberOfLines={1}>{sub.type === 'driver' ? [sub.team, sub.nat].filter(Boolean).join(' · ') : 'Constructor'}</Text> : null}
          </View>
        </View>
        {a.stats?.length ? (<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{a.stats.map(([k, val]) => (<View key={k} style={{ flexGrow: 1, minWidth: '29%', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.28)' }}><Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 1.2, fontWeight: '700' }}>{k}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{val}</Text></View>))}</View>) : null}
      </Grad>
      <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 1.4 }}>{`${a.kind.toUpperCase()} · SEASON ${a.season}`}</Text>
      <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', lineHeight: 32 }}>{a.title}</Text>
      {body.map((p, i) => <Text key={i} style={{ color: colors.fg, fontSize: 16.5, lineHeight: 26, opacity: 0.92 }}>{p}</Text>)}
    </View>
  ) : (
    <Grad color={col} from={0.32} to={0.04} dir="h" radius={14} border={0.4} style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {mark ? emblem(compact ? 44 : 52) : null}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: col, fontFamily: 'label', fontSize: 10, letterSpacing: 1.6, flex: 1 }} numberOfLines={1}>{a.kicker}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{a.kind}</Text></View>
        <Text style={{ color: colors.fg, fontSize: compact ? 16 : 18, fontWeight: '800' }} numberOfLines={3}>{a.title}</Text>
        {compact ? null : <Text style={{ color: colors.muted, fontSize: 14 }} numberOfLines={2}>{body[0]}</Text>}
      </View>
    </Grad>);
  return onPress ? <Press onPress={onPress}>{inner}</Press> : inner;
}

function ReportCard({ items, title = 'Race report' }) {
  if (!items || !items.length) return null;
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {items.map((x) => (<View key={x.k} style={{ width: '47%', flexGrow: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={x.icon} size={14} color={x.c} /><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>{x.k.toUpperCase()}</Text></View>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>{x.v}</Text>
          {x.sub ? <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{x.sub}</Text> : null}
        </View>))}
      </View>
    </Card>
  );
}
const OVT = (od) => (od > 0.62 ? 'Hard to overtake' : od > 0.45 ? 'Medium overtaking' : 'Easy to overtake');
export function FantasyRace({ route, navigation }) {
  const { id, raceId, season, focus } = route.params; const fun = useFun(); const f = fun.get(id); const shotCompact = useRef(null); const [sel, setSel] = useState(null);
  const v = f ? viewOf(f, season) : null; const race = v?.races.find((r) => r.id === raceId);
  if (!f || !race) return <Screen header={false}><Note>Not found.</Note></Screen>;
  const isCur = !season || season === seasonNo(f), all = sessionsOf(race), have = all.filter((x) => v.results?.[raceId]?.[x]);
  const cur = sel && have.includes(sel) ? sel : have.includes('Race') ? 'Race' : have.at(-1); const rows = cur ? v.results[raceId][cur] : [];
  const drv = (did) => v.drivers.find((d) => d.id === did), team = (tid) => teamOf(v, tid), isQ = cur === 'Qualifying' || cur === 'Sprint Qualifying', w = v.results?.[raceId]?._w;
  const missing = all.find((x) => !v.results?.[raceId]?.[x]);
  const simulateMissing = () => fun.update(id, (g) => { let h = g; for (const x of all) if (!h.results?.[raceId]?.[x]) h = runStep(h, { race, session: x, index: 0 }); return h; });
  const fl = !isQ ? rows.find((r) => r.fl) : null, dnf = !isQ ? rows.filter((r) => r.status !== 'OK').length : 0;
  const line = (r, i, anim) => {
    const d = drv(r.driverId); if (!d) return null; const t = team(d.teamId);
    const tags = isQ ? [] : [r.pen ? { text: `+${r.pen}s penalty`, bad: true } : null, r.stops ? { text: `${r.stops} stop${r.stops > 1 ? 's' : ''}`, bad: false } : null, r.fl ? { text: `Fastest lap ${r.flTime}`, bad: false } : null].filter(Boolean);
    const sub = isQ ? `${r.seg}${r.gap ? ` · ${r.gap}` : ''}` : [r.grid > 0 ? `Started P${r.grid}` : '', `${r.points} pts`].filter(Boolean).join(' · ');
    return <ResultLine key={r.driverId} pos={r.pos} first={d.first} last={d.last} color={tcol(v, d.teamId)} right={r.time} sub={sub} tags={tags} fav={d.me} fastest={!!r.fl} flash={focus === d.id} photoSrc={driverPic(d)} logoSrc={teamPic(t)} index={anim ? Math.min(i, 8) : undefined} onPress={anim ? () => navigation.navigate('FantasyDriver', { id, driverId: d.id, season: season || seasonNo(f) }) : undefined} />;
  };
  const cardRows = rows.map((r) => { const d = drv(r.driverId); return { key: r.driverId, pos: r.pos, color: tcol(v, d?.teamId), name: d ? surname(d) : '?', photo: d ? driverPic(d) : null, code: d ? codeOf(d) : '', logo: teamPic(team(d?.teamId)), team: team(d?.teamId)?.name || '', right: !isQ && r.points ? `${r.time}  +${r.points}` : r.time }; });
  const chip = (icon, text) => <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}><Ionicons name={icon} size={14} color={colors.accent} /><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '600' }}>{text}</Text></View>;
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={2}>{`${raceFlag(race) ? raceFlag(race) + ' ' : ''}${race.name}`}</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{`${race.place || 'Custom race'} · ${race.laps} laps${race.sprint ? ' · sprint weekend' : ''}${season && !isCur ? ` · season ${season}` : ''}`}</Text>
      </Grad>
      {w ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chip(w.wet ? 'rainy' : 'sunny', w.wet ? 'Wet race' : 'Dry')}{!isQ && w.sc ? chip('warning', `Safety car${w.sc > 1 ? ` ×${w.sc}` : ''}`) : null}{chip('git-compare', OVT(w.od))}{!isQ && dnf ? chip('close-circle', `${dnf} retired`) : null}</View> : null}
      {missing && isCur && !f.off ? <Btn tone="solid" icon="play-skip-forward" onPress={simulateMissing}>{have.length ? 'Simulate the rest of the weekend' : 'Simulate this weekend'}</Btn> : null}
      {have.includes('Race') ? <ReportCard items={raceReport(v, race)} /> : null}
      {have.length > 0 && (<>
        <Dropdown value={cur} options={have.map((x) => [x, x])} onChange={setSel} />
        {fl ? <Text style={{ color: colors.purple, fontSize: 14 }}>{`Fastest lap: ${drv(fl.driverId)?.name} · ${fl.flTime}`}</Text> : null}
        {rows.map((r, i) => line(r, i, true))}
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>The picture below is the compact version, with team logos and small driver photos.</Text>
        <SessionCard shotRef={shotCompact} title={race.name} sub={cur} rows={cardRows} limit={22} />
        <ExportBar target={shotCompact} />
      </>)}
      {!have.length && <Note>Nothing simulated for this race yet.</Note>}
    </Screen>
  );
}

/* ------------------------------------------------------------------ everything that happened in a save */
// A list that shows its first rows and then a faded one with "View all ..."; tapping opens the rest.
function Fold({ items, limit = 5, label, render, gap = 8 }) {
  const [open, setOpen] = useState(false); const more = items.length > limit; const shown = open || !more ? items : items.slice(0, limit);
  return (
    <View style={{ gap }}>
      {shown.map(render)}
      {more && !open ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
          <View pointerEvents="none" style={{ opacity: 0.28 }}>{render(items[limit], limit)}</View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{label}</Text><Ionicons name="chevron-down" size={18} color={colors.fg} /></View>
        </Pressable>) : null}
      {more && open ? <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Show fewer</Text><Ionicons name="chevron-up" size={16} color={colors.accent} /></Pressable> : null}
    </View>
  );
}
const Section = ({ title, children }) => (<View style={{ gap: 10, marginTop: 10 }}><Eyebrow>{title}</Eyebrow>{children}</View>);

function AllStats({ f, v, n, closed, navigation }) {
  const a = useMemo(() => allTime(f), [f]); const sm = useMemo(() => seasonSummary(v, closed), [v, closed]); const [sx, setSx] = useState(false); const shotS = useRef(null); const [exp, setExp] = useState(false); const shot = useRef(null);
  const tile = (k, val) => (<View key={k} style={{ width: '31%', flexGrow: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }}><Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 1.2 }}>{k.toUpperCase()}</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 2 }}>{String(val)}</Text></View>);
  if (!a.races) return <Card><Note>Nothing has been simulated yet. Once races are run, every total shows up here.</Note></Card>;
  const champ = a.drivers[0]; const ex = a.drivers.map((x) => ({ key: x.id, name: surname(x.d), photo: driverPic(x.d), code: codeOf(x.d), logo: teamPic(x.team), team: x.titles ? `${x.titles} title${x.titles > 1 ? 's' : ''}` : '', color: x.team?.color || colors.muted, points: x.points }));
  const open = (x) => navigation.navigate('FantasyDriver', { id: f.id, driverId: x.id, season: x.last });
  // Season summary: tiles with the leaders of each category
  let summary = null;
  if (sm) {
    const c = sm.champion; const who = (t) => (t ? t.who.map(surname).join(' / ') : '—');
    const awards = [['Most wins', sm.wins], ['Most poles', sm.poles], ['Most podiums', sm.podiums], ['Fastest laps', sm.fl], ['Most retirements', sm.dnf]].filter(([, t]) => t);
    const rows = awards.map(([k, t]) => ({ k, v: who(t), n: t.val, photo: driverPic(t.who[0]), code: codeOf(t.who[0]), color: teamOf(v, t.who[0].teamId)?.color }));
    if (sm.tpoints) rows.push({ k: 'Team champion', v: sm.tpoints.who[0].name, n: sm.tpoints.val, logo: teamPic(sm.tpoints.who[0]) });
    if (sm.margin != null) rows.push({ k: 'Title margin', v: `${sm.races} races · ${sm.winners} winners`, n: `${sm.margin} pts` });
    const hero = c ? { label: sm.closed ? 'CHAMPION' : 'LEADER', name: surname(c), sub: `${c.points} pts · ${c.wins} wins · ${sm.team?.name || ''}`, photo: driverPic(c), color: sm.team?.color, code: codeOf(c), logo: teamPic(sm.team) } : null;
    summary = (
      <Section title={`Season ${n} summary`}>
        {c ? (
          <Grad color={sm.team?.color || colors.gold} from={0.65} to={0.06} radius={20} border={0.9} style={{ height: 170, borderColor: colors.gold }}>
            {driverPic(c) ? <Cutout source={driverPic(c)} size={200} style={{ position: 'absolute', right: -14, bottom: -22 }} /> : null}
            <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
              <View><Text style={{ color: colors.gold, fontFamily: 'label', fontSize: 11, letterSpacing: 2.5 }}>{sm.closed ? '🏆 CHAMPION' : '⏱ LEADER'}</Text><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800', fontStyle: 'italic', marginTop: 2, maxWidth: '62%' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{surname(c)}</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>{c.first}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{teamPic(sm.team) ? <Image source={teamPic(sm.team)} resizeMode="contain" style={{ width: 28, height: 28 }} /> : null}<Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>{`${c.points} pts · ${c.wins} wins`}</Text></View>
            </View>
          </Grad>) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {awards.map(([k, t]) => { const d0 = t.who[0], col = teamOf(v, d0.teamId)?.color || colors.accent; return (
            <Grad key={k} color={col} from={0.4} to={0.05} radius={16} border={0.4} style={{ width: '48%', flexGrow: 1, padding: 12, gap: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 10, letterSpacing: 1.6 }}>{k.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Avatar source={driverPic(d0)} color={col} label={d0.number} size={38} radius={19} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{who(t)}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{t.val}</Text></View></View>
            </Grad>); })}
          {sm.tpoints ? (<Grad color={sm.tpoints.who[0].color} from={0.4} to={0.05} radius={16} border={0.4} style={{ width: '48%', flexGrow: 1, padding: 12, gap: 8 }}><Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 10, letterSpacing: 1.6 }}>TEAM CHAMPION</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Avatar source={teamPic(sm.tpoints.who[0])} color={sm.tpoints.who[0].color} label={sm.tpoints.who[0].name} size={38} radius={10} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{sm.tpoints.who[0].name}</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{sm.tpoints.val}</Text></View></View></Grad>) : null}
        </View>
        <Btn icon="share-social-outline" onPress={() => setSx(!sx)}>{sx ? 'Hide the export picture' : `Export the season ${n} summary`}</Btn>
        {sx ? <><SummaryCard shotRef={shotS} title={`${f.name} · season ${n}`} sub={`${sm.races} races`} hero={hero} rows={rows} /><ExportBar target={shotS} /></> : null}
      </Section>);
  }
  return (<View style={{ gap: 16 }}>
    {f.ended ? <Grad color={colors.gold} from={0.3} to={0.04} border={0.5} style={{ padding: 14 }}><Text style={{ color: colors.gold, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>FINAL STATS</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{f.name}</Text><Text style={{ color: colors.muted, fontSize: 15 }}>{`${a.seasons} season${a.seasons > 1 ? 's' : ''} · ${a.races} races`}</Text></Grad> : null}
    <Card>
      <Eyebrow>Totals</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        {tile('Seasons', a.seasons)}{tile('Races', a.races)}{tile('Drivers', a.drivers.length)}{tile('Champions', new Set(a.champs.map((c) => c.driver.id)).size)}{tile('Winners', a.drivers.filter((x) => x.wins > 0).length)}{tile('Fastest laps', a.drivers.reduce((s, x) => s + x.fl, 0))}
      </View>
      {champ && champ.titles > 0 ? <Text style={{ color: colors.gold, fontSize: 17, fontWeight: '800', marginTop: 14 }}>{`🏆 Most titles: ${surname(champ.d)} (${champ.titles})`}</Text> : null}
    </Card>
    {summary}
    {a.champs.length > 0 && (
      <Section title="Champions">
        <Fold items={a.champs} limit={5} label={`View all ${a.champs.length} seasons`} gap={8} render={(c) => (
          <View key={c.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ width: 30, color: colors.muted, fontWeight: '800', fontSize: 15 }}>{`S${c.n}`}</Text>
            <Avatar source={driverPic(c.driver)} color={c.team?.color} label={c.driver.number} size={38} radius={19} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{surname(c.driver)}</Text><Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{`${c.driver.points} pts · ${c.driver.wins} wins`}</Text></View>
            {teamPic(c.team) ? <Image source={teamPic(c.team)} resizeMode="contain" style={{ width: 24, height: 24 }} /> : null}
          </View>)} />
      </Section>)}
    <Section title="All-time drivers">
      <Fold items={a.drivers} limit={10} label={`View all ${a.drivers.length} drivers`} gap={6} render={(x, i) => (
        <Pressable key={x.id} onPress={() => open(x)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: x.titles && i === 0 ? colors.gold : colors.line }}>
          <Text style={{ width: 24, color: i === 0 ? colors.gold : colors.muted, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>{i + 1}</Text>
          <Avatar source={driverPic(x.d)} color={x.team?.color} label={x.d.number} size={32} radius={16} />
          <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{surname(x.d)}</Text>
          {teamPic(x.team) ? <Image source={teamPic(x.team)} resizeMode="contain" style={{ width: 20, height: 20 }} /> : null}
          <Text style={{ minWidth: 40, textAlign: 'right', color: x.titles ? colors.gold : colors.muted, fontSize: 14, fontWeight: '800' }}>{x.titles ? `🏆 ${x.titles}` : ''}</Text>
          <Text style={{ minWidth: 48, textAlign: 'right', color: colors.fg, fontSize: 15, fontWeight: '800' }}>{x.points}</Text>
        </Pressable>)} />
    </Section>
    <Section title="All-time teams">
      <Fold items={a.teams} limit={6} label={`View all ${a.teams.length} teams`} gap={8} render={(x, i) => (
        <Grad key={x.id} color={x.t.color} from={0.45} to={0.05} dir="h" radius={14} border={0.4} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ width: 24, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{i + 1}</Text>
          <Avatar source={teamPic(x.t)} color={x.t.color} label={x.t.name} size={34} radius={9} />
          <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{x.t.name}</Text>
          <Text style={{ minWidth: 40, textAlign: 'right', color: x.titles ? colors.gold : colors.muted, fontSize: 14, fontWeight: '800' }}>{x.titles ? `🏆 ${x.titles}` : ''}</Text>
          <Text style={{ minWidth: 48, textAlign: 'right', color: colors.fg, fontSize: 15, fontWeight: '800' }}>{x.points}</Text>
        </Grad>)} />
    </Section>
    {(a.rec.wins || a.rec.points) && (
      <Section title="Records">
        <Card><View style={{ gap: 10 }}>
          {a.rec.wins ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Most wins in a season: ${a.rec.wins.val} · ${a.rec.wins.name} (S${a.rec.wins.n})`}</Text> : null}
          {a.rec.points ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Most points in a season: ${a.rec.points.val} · ${a.rec.points.name} (S${a.rec.points.n})`}</Text> : null}
          {a.rec.margin && a.champs.length > 1 ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Biggest title margin: ${a.rec.margin.val} pts · ${a.rec.margin.name} (S${a.rec.margin.n})`}</Text> : null}
          {a.rec.tight && a.champs.length > 1 ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Closest title fight: ${a.rec.tight.val} pts · ${a.rec.tight.name} (S${a.rec.tight.n})`}</Text> : null}
        </View></Card>
      </Section>)}
    <Btn icon="share-social-outline" onPress={() => setExp(!exp)}>{exp ? 'Hide the export picture' : 'Export the all-time drivers table'}</Btn>
    {exp ? <><StandingsCard shotRef={shot} title={`${f.name} · all-time`} sub={`${a.seasons} season${a.seasons > 1 ? 's' : ''}`} rows={ex} /><ExportBar target={shot} /></> : null}
  </View>);
}

/* ------------------------------------------------------------------ settings of the Fun section (kept on the phone) */
export function FunSettingsCard() {
  const fun = useFun(); const st = fun.settings; const [folder, setFolder] = useState(undefined);
  useEffect(() => { getSaveFolder().then((x) => setFolder(x || null)).catch(() => setFolder(null)); }, []);
  const row = (label, hint, key) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{hint}</Text></View>
      <Switch value={!!st[key]} onValueChange={(x) => fun.setSettings({ [key]: x })} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" />
    </View>);
  return (
    <Card>
      <Eyebrow>Fantasy settings</Eyebrow>
      <View style={{ gap: 16, marginTop: 14 }}>
        {row('Ratings change each season', 'Drivers age and develop; cars sometimes get a little faster or slower. Off keeps every rating as it is.', 'evolve')}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>Transfers between seasons</Text>
          <Segmented value={st.transfers} onChange={(x) => fun.setSettings({ transfers: x })} items={[['manual', 'I choose'], ['auto', 'Automatic'], ['none', 'None']]} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>{st.transfers === 'auto' ? 'Every season the transfers happen by themselves and the next season starts straight away.' : st.transfers === 'none' ? 'Nobody changes team and nobody retires.' : 'After each season you open the transfer window and decide.'}</Text>
        </View>
        {row('Animation for each session', 'A full-screen result after every qualifying, sprint and race you simulate.', 'animSessions')}
        {row('Animation for transfers and champions', 'The transfer window and the champion are shown full screen.', 'animSeason')}
        {canChooseFolder() ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>Folder for saved pictures</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{folder ? 'A folder is set: "Save picture" goes straight there, with no menu.' : 'Not set yet. Choose it once and every picture is saved there.'}</Text>
            <Btn icon="folder-open-outline" onPress={async () => { const x = await chooseSaveFolder(); if (x) setFolder(x); }}>{folder ? 'Change folder' : 'Choose folder'}</Btn>
          </View>) : null}
      </View>
    </Card>
  );
}
export function FunSettings() { return <Screen header={false}><FunSettingsCard /></Screen>; }

/* ------------------------------------------------------------------ grid presets: a full grid kept on its own, edited like a save */
export function PresetNew({ navigation }) {
  const fun = useFun(); const [name, setName] = useState(`Grid ${fun.presets.length + 1}`); const [kind, setKind] = useState('invented'); const [count, setCount] = useState(10); const [src, setSrc] = useState(fun.fantasies[0]?.id || null); const real = useAsync(() => (kind === 'real' ? loadRealGrid([]) : Promise.resolve(null)), [kind]);
  const make = () => {
    let teams, drivers, races = defaultRaces();
    if (kind === 'copy') { const g = fun.get(src); if (!g) return; const map = {}; teams = g.teams.map((t) => { const id = uid(); map[t.id] = id; return { ...t, id }; }); drivers = g.drivers.filter((d) => !d.me).map((d) => ({ ...d, id: uid(), teamId: map[d.teamId] })); races = g.races.map((r) => ({ ...r })); }
    else if (kind === 'real') { if (!real.v) return; teams = real.v.teams; drivers = real.v.drivers; } else { const g = makeGrid(count, []); teams = g.teams; drivers = g.drivers; }
    const f = { id: uid(), name: name.trim() || 'Grid preset', created: Date.now(), mode: kind, season: 1, history: [], teams, drivers, races, results: {}, preset: true };
    fun.addFantasy(f); navigation.replace('PresetGrid', { id: f.id });
  };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Name</Eyebrow><View style={{ marginTop: 10 }}><Field value={name} onChange={setName} maxLength={30} /></View></Card>
      <Card>
        <Eyebrow>Start from</Eyebrow>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Segmented value={kind} onChange={setKind} items={[['invented', 'Made-up'], ['real', 'Real grid'], ['copy', 'A save']]} />
          {kind === 'invented' ? <Stepper label="Number of teams" value={count} min={2} max={16} onChange={setCount} /> : null}
          {kind === 'real' ? (real.loading ? <Skeleton rows={2} /> : real.error ? <Note>The real grid could not be loaded.</Note> : <Text style={{ color: colors.muted, fontSize: 14 }}>{`${real.v?.teams.length || 0} real teams and their drivers.`}</Text>) : null}
          {kind === 'copy' ? (fun.fantasies.length ? <Dropdown value={src} options={fun.fantasies.map((x) => [x.id, x.name])} onChange={setSrc} prefix="Save" /> : <Note>You have no saves yet.</Note>) : null}
          <Text style={{ color: colors.muted, fontSize: 14 }}>You can edit every team, driver and race afterwards, and add more.</Text>
        </View>
      </Card>
      <Btn tone="solid" icon="bookmarks-outline" onPress={make} disabled={(kind === 'real' && !real.v) || (kind === 'copy' && !src)}>Create the preset</Btn>
    </Screen>
  );
}
export function PresetGrid({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const f = fun.get(id);
  useEffect(() => { if (f) navigation.setOptions({ title: f.name }); }, [f?.name]);
  if (!f) return <Screen header={false}><Note>{fun.loaded ? 'This preset no longer exists.' : 'Loading…'}</Note></Screen>;
  const upd = (fn) => fun.update(id, fn);
  const addTeam = () => upd((g) => { const used = g.teams.map((t) => t.color); const t = { id: uid(), name: `Team ${g.teams.length + 1}`, color: TEAM_COLORS.find((c) => !used.includes(c)) || TEAM_COLORS[g.teams.length % TEAM_COLORS.length], logo: null, car: 70, rel: 75, dev: 60, pit: 75 }; const g2 = { ...g, drivers: [...g.drivers, newDriver(g, t.id)] }; return { ...g2, teams: [...g.teams, t], drivers: [...g2.drivers, newDriver(g2, t.id)] }; });
  return (
    <Screen header={false}>
      <UndoChip depth={fun.undoDepth(id)} onPress={() => fun.undo(id)} />
      <Note>A preset is a full grid kept for later. Edit teams, drivers (tap one for every attribute) and races, then pick it when you make a new season.</Note>
      <Setup f={f} update={upd} profile={fun.profile} navigation={navigation} onDelete={() => Alert.alert('Delete this preset?', 'Saves made from it are not affected.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { fun.remove(id); navigation.goBack(); } }])} />
      <Btn icon="add" onPress={addTeam}>Add a team</Btn>
      <RacePicker races={f.races} onChange={(r) => upd((g) => ({ ...g, races: r }))} />
    </Screen>
  );
}
