import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import Press from '../components/Press';
import Dropdown from '../components/Dropdown';
import Skeleton from '../components/Skeleton';
import { Segmented, StatGrid, ResultLine } from '../components/Shared';
import ExportBar from '../components/ExportBar';
import { Avatar, Field, Stepper, Btn, Swatches, SessionCard, StandingsCard, SummaryCard } from '../components/FunBits';
import { useFun, pickImage, uid, canPickImage } from '../fun/store';
import { makeGrid, nextStep, runStep, runWeekend, runSeason, sessionsOf, standings, freeNumber, randomDriver, TEAM_COLORS, DRIVER_ATTRS, TEAM_ATTRS, A, TA, ovr, makeDriverAttrs, simulateTransfers } from '../fun/sim';
import { attrsFor } from '../fun/talent';
import { driverPic, teamPic, viewOf, seasonList, seasonNo, careerOf, numberClash, closeSeason, isDone, allTime, seasonSummary } from '../fun/look';
import { loadRealGrid } from '../fun/realGrid';
import { nameParts } from './FunScreens';
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
const circuitRace = (c) => ({ id: c.key, name: c.name, place: c.place, laps: lapsOf(c), sprint: false, custom: false });
const order = (r, i) => { const k = CIRCUITS.findIndex((c) => c.key === r.id); return k >= 0 ? k : 1000 + i; };

// "That's me" sits on one driver only: choosing it clears it from every other driver and copies your photo, name and number from your profile.
export function makeMe(f, profile, did) {
  return { ...f, drivers: f.drivers.map((x) => (x.id === did ? { ...x, ...nameParts(profile.name), name: profile.name || 'Me', number: profile.number || x.number, photo: profile.photo, me: true, ref: null, ...makeDriverAttrs(76, 24) }
    : x.me ? { ...x, me: false, photo: null } : profile.number && x.number === profile.number ? { ...x, number: freeNumber(f.drivers.map((y) => y.number).concat(profile.number)) } : x)) };
}

/* ------------------------------------------------------------------ calendar picker (new season and transfer window) */
function RacePicker({ races, onChange }) {
  const [cn, setCn] = useState(''); const [cp, setCp] = useState(''); const [cl, setCl] = useState(55);
  const has = (k) => races.find((r) => r.id === k);
  const put = (l) => onChange(l.map((r, i) => [r, i]).sort((a, b) => order(a[0], a[1]) - order(b[0], b[1])).map((x) => x[0]));
  const toggle = (c) => put(has(c.key) ? races.filter((r) => r.id !== c.key) : [...races, circuitRace(c)]);
  const setSprint = (id) => onChange(races.map((r) => (r.id === id ? { ...r, sprint: !r.sprint } : r)));
  return (<>
    <Card>
      <Eyebrow>{`Races · ${races.length}`}</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><Btn onPress={() => put([...races.filter((r) => r.custom), ...CIRCUITS.map((c) => has(c.key) || circuitRace(c))])} style={{ flex: 1 }}>{`All ${CIRCUITS.length}`}</Btn><Btn onPress={() => onChange(races.filter((r) => r.custom))} style={{ flex: 1 }}>None</Btn></View>
      <View style={{ marginTop: 10, gap: 6 }}>
        {CIRCUITS.map((c) => { const r = has(c.key), on = !!r; return (
          <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => toggle(c)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: on ? colors.accentSoft : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.accent : colors.muted} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{c.place}</Text></View>
            </Pressable>
            {on ? <Pressable onPress={() => setSprint(c.key)} style={{ paddingHorizontal: 9, height: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: r.sprint ? colors.sprint : colors.surface2, borderWidth: 1, borderColor: r.sprint ? colors.sprint : colors.line }}><Text style={{ color: r.sprint ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>SPRINT</Text></Pressable> : null}
          </View>); })}
      </View>
    </Card>
    <Card>
      <Eyebrow>Add your own race</Eyebrow>
      <View style={{ marginTop: 10, gap: 10 }}>
        <Field label="Race name" value={cn} onChange={setCn} placeholder="e.g. Midnight Street GP" />
        <Field label="Place" value={cp} onChange={setCp} placeholder="City, country" />
        <Stepper label="Laps" value={cl} min={20} max={80} step={5} onChange={setCl} />
        <Btn icon="add" disabled={!cn.trim()} onPress={() => { onChange([...races, { id: uid(), name: cn.trim(), place: cp.trim(), laps: cl, sprint: false, custom: true }]); setCn(''); setCp(''); }}>Add race</Btn>
        {races.filter((r) => r.custom).map((r) => (<View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 16 }} numberOfLines={1}>{`${r.name} · ${r.laps} laps`}</Text><Pressable onPress={() => setSprint(r.id)}><Text style={{ color: r.sprint ? colors.sprint : colors.muted, fontWeight: '700' }}>SPRINT</Text></Pressable><Pressable onPress={() => onChange(races.filter((x) => x.id !== r.id))}><Ionicons name="close" size={18} color={colors.muted} /></Pressable></View>))}
      </View>
    </Card>
  </>);
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
  const [races, setRaces] = useState(() => CIRCUITS.slice(0, 8).map(circuitRace)); const [me, setMe] = useState(false); const [meTeam, setMeTeam] = useState(0); const [seed, setSeed] = useState(0);
  const real = useAsync(() => (mode === 'real' ? loadRealGrid([]) : Promise.resolve(null)), [mode]);
  const invented = useMemo(() => makeGrid(count, [p?.number].filter(Boolean)), [count, seed, p?.number]);
  const grid = mode === 'real' ? real.v : invented; const ok = !!grid && grid.teams.length > 0;
  const create = () => {
    if (!ok || !races.length) return;
    let f = { id: uid(), name: name.trim() || 'Fantasy season', created: Date.now(), mode, season: 1, history: [], teams: grid.teams, drivers: grid.drivers, races, results: {} };
    if (me && p) { const t = grid.teams[Math.min(meTeam, grid.teams.length - 1)], own = grid.drivers.filter((d) => d.teamId === t.id), mine = own[1] || own[0]; f = makeMe(f, p, mine.id); f = { ...f, drivers: f.drivers.map((d) => (d.me ? { ...d, skill: 76 } : d)) }; }
    fun.addFantasy(f); navigation.replace('Fantasy', { id: f.id });
  };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Name</Eyebrow><View style={{ marginTop: 10 }}><Field value={name} onChange={setName} maxLength={30} /></View></Card>
      <Card>
        <Eyebrow>Grid</Eyebrow>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Segmented value={mode} onChange={setMode} items={[['real', 'Real grid'], ['invented', 'Made-up grid']]} />
          {mode === 'real' ? (<>
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
      <RacePicker races={races} onChange={setRaces} />
      <Btn tone="solid" icon="flag" onPress={create} disabled={!ok || !races.length}>{!ok ? 'Waiting for the grid…' : races.length ? 'Create the season' : 'Pick at least one race'}</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ one fantasy season */
export function Fantasy({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const f = fun.get(id); const [tab, setTab] = useState('season'); const [busy, setBusy] = useState(false); const [sel, setSel] = useState(null); const [exp, setExp] = useState(false); const [evolve, setEvolve] = useState(true); const shotD = useRef(null), shotT = useRef(null);
  useEffect(() => { if (f) navigation.setOptions({ title: f.name }); }, [f?.name]);
  if (!f) return <Screen header={false}><Note>{fun.loaded ? 'This season no longer exists.' : 'Loading…'}</Note></Screen>;
  const cur = seasonNo(f), n = sel && seasonList(f).includes(sel) ? sel : cur, isCur = n === cur, v = viewOf(f, n), st = standings(v), off = !!f.off && isCur;
  const ended = !!f.ended && isCur, step = isCur && !off && !ended ? nextStep(f) : null, done = v.races.filter((r) => sessionsOf(r).every((s) => v.results?.[r.id]?.[s])).length, complete = isDone(v) && !off;
  const apply = (fn) => { setBusy(true); setTimeout(() => { fun.update(id, fn); setBusy(false); }, 30); };
  const champ = complete ? st.drivers[0] : null, tchamp = complete ? st.teams[0] : null; const tabs = ['season', 'drivers', 'teams', 'stats', 'setup'];
  const openDriver = (d) => navigation.navigate('FantasyDriver', { id, driverId: d.id, season: n });
  const driverRows = st.drivers.map((d) => ({ key: d.id, name: d.name, team: teamOf(v, d.teamId)?.name || '', color: tcol(v, d.teamId), points: d.points, photo: driverPic(v.drivers.find((x) => x.id === d.id)), code: String(d.last || d.name).slice(0, 3).toUpperCase(), logo: teamPic(teamOf(v, d.teamId)) }));
  const teamRows = st.teams.map((t) => ({ key: t.id, name: t.name, team: `${t.wins} wins`, color: t.color, points: t.points, logo: teamPic(t) }));
  return (
    <Screen header={false} swipe={{ index: tabs.indexOf(tab), count: 5, onIndex: (i) => setTab(tabs[i]) }}>
      {seasonList(f).length > 1 ? <Dropdown value={n} options={seasonList(f).map((k) => [k, k === cur ? `Season ${k} · ${off ? 'transfers' : 'current'}` : `Season ${k}`])} onChange={(k) => { setSel(k); setExp(false); }} prefix="Season" /> : null}
      <Segmented value={tab} onChange={setTab} items={[['season', 'Season'], ['drivers', 'Drivers'], ['teams', 'Teams'], ['stats', 'Stats'], ['setup', 'Setup']]} />
      {tab === 'season' && (<>
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
                <Btn tone="solid" icon="play" disabled={busy} onPress={() => apply((g) => runStep(g, nextStep(g)))}>{`Simulate ${step.session.toLowerCase()}`}</Btn>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn icon="play-skip-forward" disabled={busy} onPress={() => apply(runWeekend)} style={{ flex: 1 }}>Whole weekend</Btn>
                  <Btn icon="fast-forward" disabled={busy} onPress={() => apply(runSeason)} style={{ flex: 1 }}>Whole season</Btn>
                </View>
              </View>) : null}
            {complete && isCur && !ended ? (
              <View style={{ gap: 10, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>Ratings change a little for the new season</Text><Switch value={evolve} onValueChange={setEvolve} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View>
                <Btn tone="solid" icon="arrow-forward-circle" onPress={() => { fun.update(id, (g) => closeSeason(g, evolve)); setSel(null); navigation.navigate('FantasyTransfers', { id }); }}>{`Continue to season ${cur + 1}`}</Btn>
              </View>) : null}
          </Card>)}
        <View><Eyebrow>{`Calendar · ${done}/${v.races.length}`}</Eyebrow></View>
        {v.races.map((r, i) => {
          const k = sessionsOf(r).filter((s) => v.results?.[r.id]?.[s]).length, all = sessionsOf(r).length, win = v.results?.[r.id]?.Race?.[0], w = win && v.drivers.find((d) => d.id === win.driverId);
          return (
            <Press key={r.id} onPress={() => navigation.navigate('FantasyRace', { id, raceId: r.id, season: n })}>
              <Grad color={w ? tcol(v, w.teamId) : colors.accent} from={k === all ? 0.4 : 0.14} to={0.03} dir="h" radius={14} border={0.3} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.accent, 0.2) }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{`R${i + 1}`}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{r.name}{r.sprint ? '  · SPRINT' : ''}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{w ? `Winner: ${w.name}` : `${k}/${all} sessions`}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Grad>
            </Press>);
        })}
        {isCur && !ended ? <Btn icon="flag" onPress={() => Alert.alert('End this save?', 'The save is closed and the total stats of every season are shown. You can reopen it later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'End save', onPress: () => { fun.update(id, (g) => ({ ...g, ended: true, endedAt: Date.now(), off: false })); setTab('stats'); } }])}>End this save and show total stats</Btn> : null}
      </>)}
      {tab === 'drivers' && (<>
        <Btn icon="share-social-outline" onPress={() => setExp(!exp)}>{exp ? 'Hide the export picture' : 'Export the drivers standings'}</Btn>
        {exp ? <><StandingsCard shotRef={shotD} title={`${f.name} · drivers`} sub={`Season ${n}`} rows={driverRows} /><ExportBar target={shotD} /></> : null}
        {st.drivers.map((d, i) => { const t = teamOf(v, d.teamId); return <ResultLine key={d.id} pos={i + 1} first={d.first} last={d.last} color={tcol(v, d.teamId)} right={String(d.points)} sub={`${d.wins} wins · ${t?.name || ''}`} fav={d.me} champion={complete && i === 0} photoSrc={driverPic(d)} logoSrc={teamPic(t)} onPress={() => openDriver(d)} />; })}
      </>)}
      {tab === 'teams' && (<>
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
      {tab === 'stats' && <AllStats f={f} v={v} n={n} closed={complete || (ended && isCur)} navigation={navigation} />}
      {tab === 'setup' && (isCur ? <Setup f={f} update={(fn) => fun.update(id, fn)} profile={fun.profile} navigation={navigation} onDelete={() => Alert.alert('Delete this fantasy?', 'All its seasons are deleted and cannot be brought back.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { fun.remove(id); navigation.goBack(); } }])} /> : <Note>Past seasons cannot be edited. Switch back to the current season to change the setup.</Note>)}
    </Screen>
  );
}

function Setup({ f, update, profile, navigation, onDelete }) {
  const [msg, setMsg] = useState(''); const [pick, setPick] = useState(null);
  const setTeam = (tid, patch) => update((g) => ({ ...g, teams: g.teams.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
  const logo = async (tid) => { const r = await pickImage(); if (r.uri) setTeam(tid, { logo: r.uri }); else if (r.error) setMsg(r.error); };
  const started = Object.keys(f.results || {}).length > 0;
  const add = (tid, real) => update((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, tid, real)] }));
  return (<>
    <Card><Eyebrow>Season name</Eyebrow><View style={{ marginTop: 10 }}><Field value={f.name} onChange={(v) => update((g) => ({ ...g, name: v }))} maxLength={30} /></View></Card>
    {f.teams.map((t) => (
      <Grad key={t.id} color={t.color} from={0.3} to={0.04} radius={16} border={0.35} style={{ padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => logo(t.id)} accessibilityLabel="Choose team logo"><Avatar source={teamPic(t)} color={t.color} label={t.name} size={54} radius={14} /><View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={12} color="#fff" /></View></Pressable>
          <Field value={t.name} onChange={(v) => setTeam(t.id, { name: v })} style={{ flex: 1 }} maxLength={26} />
          {t.logo ? <Pressable onPress={() => setTeam(t.id, { logo: null })} hitSlop={8} accessibilityLabel="Remove custom logo"><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable> : null}
        </View>
        <Swatches value={t.color} onChange={(c) => setTeam(t.id, { color: c })} list={TEAM_COLORS} />
        {TEAM_ATTRS.map(([k, label]) => <Stepper key={k} label={label} value={Math.round(TA(t)[k])} min={30} max={99} step={2} onChange={(v) => setTeam(t.id, { [k]: v })} />)}
        {f.drivers.filter((d) => d.teamId === t.id).map((d) => (
          <Press key={d.id} onPress={() => navigation.navigate('FantasyDriver', { id: f.id, driverId: d.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Avatar source={driverPic(d)} color={t.color} label={d.number} size={40} />
              <View style={{ flex: 1 }}><Text style={{ color: d.me ? colors.gold : colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{d.me ? `★ ${d.name}` : d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`#${d.number} · overall ${ovr(d)} · age ${A(d).age}${d.ref ? ' · real driver' : ''}`}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Press>))}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn icon="add" onPress={() => add(t.id)} style={{ flex: 1, height: 40 }}>Custom driver</Btn>
          <Btn icon="search" onPress={() => setPick(pick === t.id ? null : t.id)} style={{ flex: 1, height: 40 }}>Real driver</Btn>
        </View>
        {pick === t.id ? <DriverPicker exclude={f.drivers.map((d) => d.ref).filter(Boolean)} onClose={() => setPick(null)} onPick={(d) => { add(t.id, d); setPick(null); }} /> : null}
      </Grad>))}
    {msg ? <Note>{msg}</Note> : null}
    <Text style={{ color: colors.muted, fontSize: 14 }}>Tap a driver to change the photo, number, team or strength, and to remove them.</Text>
    {started ? <Btn icon="refresh" onPress={() => Alert.alert('Reset results?', 'All simulated results of this season are deleted. The teams and drivers stay.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => update((g) => ({ ...g, results: {} })) }])}>Reset this season's results</Btn> : null}
    <Btn icon="trash-outline" onPress={onDelete}>Delete this fantasy</Btn>
  </>);
}

/* ------------------------------------------------------------------ transfer window between seasons */
export function FantasyTransfers({ route, navigation }) {
  const { id } = route.params; const fun = useFun(); const f = fun.get(id); const [pick, setPick] = useState(null);
  if (!f) return <Screen header={false}><Note>Not found.</Note></Screen>;
  const upd = (fn) => fun.update(id, fn); const setD = (did, patch) => upd((g) => ({ ...g, drivers: g.drivers.map((d) => (d.id === did ? { ...d, ...patch } : d)) }));
  const empty = f.teams.filter((t) => !f.drivers.some((d) => d.teamId === t.id)), canStart = f.races.length > 0 && f.drivers.length >= 2 && !empty.length;
  const prev = (f.history || []).at(-1); const was = (did) => prev?.drivers.find((d) => d.id === did)?.teamId;
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>{`Season ${seasonNo(f)} · transfers`}</Eyebrow>
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>Change the team or number of anyone, release or retire drivers, bring in new ones, then pick the calendar. Last season's results are kept under Season {seasonNo(f) - 1}. Cars changed over the winter; drivers only age.</Text>
        <View style={{ marginTop: 12 }}><Btn icon="shuffle" onPress={() => upd((g) => simulateTransfers(g).f)}>{f.news?.length ? 'Simulate the transfers again' : 'Simulate transfers (random)'}</Btn></View>
        {(f.news || []).length ? (<View style={{ gap: 6, marginTop: 12 }}><Eyebrow>Transfer news</Eyebrow>{f.news.map((n, i) => <Text key={i} style={{ color: n.kind === 'retire' ? colors.muted : colors.fg, fontSize: 15 }}>{`${n.kind === 'retire' ? '🏁' : n.kind === 'rookie' ? '🌱' : n.kind === 'move' ? '🔁' : '•'} ${n.text}`}</Text>)}</View>) : null}
      </Card>
      {f.teams.map((t) => (
        <Grad key={t.id} color={t.color} from={0.3} to={0.04} radius={16} border={0.35} style={{ padding: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Avatar source={teamPic(t)} color={t.color} label={t.name} size={40} radius={11} /><Text style={{ flex: 1, color: colors.fg, fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{t.name}</Text></View>
          {f.drivers.filter((d) => d.teamId === t.id).map((d) => (
            <View key={d.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar source={driverPic(d)} color={t.color} label={d.number} size={40} />
                <View style={{ flex: 1 }}><Text style={{ color: d.me ? colors.gold : colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{d.me ? `★ ${d.name}` : d.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`Age ${A(d).age} · overall ${ovr(d)}`}</Text>{was(d.id) && was(d.id) !== d.teamId ? <Text style={{ color: colors.good, fontSize: 13 }}>{`Moved from ${prev.teams.find((x) => x.id === was(d.id))?.name || 'another team'}`}</Text> : !was(d.id) ? <Text style={{ color: colors.good, fontSize: 13 }}>New driver</Text> : null}</View>
                <NumField f={f} d={d} onSet={(k) => setD(d.id, { number: k })} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Dropdown value={d.teamId} options={f.teams.map((x) => [x.id, x.name])} onChange={(tid) => setD(d.id, { teamId: tid })} prefix="Team" /></View>
                {!d.me ? <Pressable onPress={() => Alert.alert(`Retire ${d.name}?`, 'He stops racing and leaves the grid.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Retire', style: 'destructive', onPress: () => upd((g) => ({ ...g, drivers: g.drivers.filter((x) => x.id !== d.id), news: [...(g.news || []), { kind: 'retire', text: `${d.name} (${A(d).age}) retires from racing.` }] })) }])} hitSlop={8} accessibilityLabel="Retire driver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="flag-outline" size={22} color={colors.muted} /></Pressable> : null}
                <Pressable onPress={() => Alert.alert(`Release ${d.name}?`, 'They leave the grid. Their past results stay in the history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Release', style: 'destructive', onPress: () => upd((g) => ({ ...g, drivers: g.drivers.filter((x) => x.id !== d.id) })) }])} hitSlop={8} accessibilityLabel="Release driver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-remove-outline" size={22} color={colors.muted} /></Pressable>
              </View>
            </View>))}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn icon="add" onPress={() => upd((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, t.id)] }))} style={{ flex: 1, height: 40 }}>Custom driver</Btn>
            <Btn icon="search" onPress={() => setPick(pick === t.id ? null : t.id)} style={{ flex: 1, height: 40 }}>Real driver</Btn>
          </View>
          {pick === t.id ? <DriverPicker exclude={f.drivers.map((d) => d.ref).filter(Boolean)} onClose={() => setPick(null)} onPick={(d) => { upd((g) => ({ ...g, drivers: [...g.drivers, newDriver(g, t.id, d)] })); setPick(null); }} /> : null}
        </Grad>))}
      <RacePicker races={f.races} onChange={(r) => upd((g) => ({ ...g, races: r }))} />
      {empty.length ? <Note>{`${empty.map((t) => t.name).join(', ')} ${empty.length > 1 ? 'have' : 'has'} no drivers yet.`}</Note> : null}
      <Btn tone="solid" icon="flag" disabled={!canStart} onPress={() => { upd((g) => ({ ...g, off: false })); navigation.navigate('Fantasy', { id }); }}>{`Start season ${seasonNo(f)}`}</Btn>
    </Screen>
  );
}

/* ------------------------------------------------------------------ a driver of a fantasy: the same kind of profile as a real driver */
export function FantasyDriver({ route, navigation }) {
  const { id, driverId, season } = route.params; const fun = useFun(); const f = fun.get(id); const [msg, setMsg] = useState('');
  const v = f ? viewOf(f, season) : null; const cur = f ? seasonNo(f) : 1; const isCur = !season || season === cur;
  const d = f?.drivers.find((x) => x.id === driverId) || v?.drivers.find((x) => x.id === driverId);
  const real = useAsync(() => (d?.ref ? Promise.all([driverCareer(d.ref, YEAR), driverTitles(d.ref, YEAR)]) : Promise.resolve(null)), [d?.ref]);
  useEffect(() => { if (d) navigation.setOptions({ title: d.name }); }, [d?.name]);
  if (!f || !d) return <Screen header={false}><Note>This driver is no longer in the season.</Note></Screen>;
  const t = teamOf(f, d.teamId) || teamOf(v, d.teamId), color = t?.color || colors.accent; const C = careerOf(f, d.id); const st = standings(v), me = st.drivers.find((x) => x.id === d.id), rank = st.drivers.findIndex((x) => x.id === d.id) + 1;
  const editable = isCur && f.drivers.some((x) => x.id === d.id); const canMove = !!f.off || !Object.keys(f.results || {}).length;
  const upd = (patch) => fun.update(id, (g) => ({ ...g, drivers: g.drivers.map((x) => (x.id === d.id ? { ...x, ...patch } : x)) }));
  const photo = async () => { const r = await pickImage(); if (r.uri) upd({ photo: r.uri }); else if (r.error) setMsg(r.error); };
  const [rc, rt] = real.v || [null, null]; const hasReal = !!d.ref && real.v;
  const tot = (k) => (hasReal ? sum(rc?.[k] ?? null, C[k]) : C[k]);
  const photoSrc = driverPic(d);
  return (
    <Screen header={false}>
      <Grad color={color} from={0.68} to={0.06} border={0.5} style={{ height: 210 }}>
        {photoSrc ? <View style={{ position: 'absolute', right: -10, bottom: -10 }}><Avatar source={photoSrc} size={220} radius={24} color={color} /></View> : <Text style={{ position: 'absolute', right: 8, bottom: -22, fontFamily: 'display', fontWeight: '800', fontSize: 150, color: 'rgba(255,255,255,0.12)' }}>{d.number}</Text>}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 30 }}>{`#${d.number}`}</Text>
          <View style={{ maxWidth: '62%' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} numberOfLines={1}>{d.first}</Text>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 34, color: colors.fg, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{d.last || d.first}</Text>
            <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{t?.name}{C.titles ? `  ·  ${C.titles}× champion` : ''}</Text>
          </View>
        </View>
      </Grad>
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
          {t ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{`Team: car ${Math.round(TA(t).car)} · reliability ${Math.round(TA(t).rel)} · development ${Math.round(TA(t).dev)} · pit crew ${Math.round(TA(t).pit)}. The car decides most of the result, talent adds on top.`}</Text> : null}
        </View>
      </Card>
      {C.bySeason.length ? (<>
        <View><Eyebrow>Fantasy seasons</Eyebrow></View>
        {C.bySeason.map((s) => (<Card key={s.n}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '700' }}>{`Season ${s.n} · ${s.team}`}</Text><Text style={{ color: s.title ? colors.gold : colors.fg, fontWeight: '800', fontSize: 17 }}>{s.title ? '🏆 Champion' : `P${s.rank} · ${s.points} pts`}</Text></View></Card>))}
      </>) : null}
      {v.races.filter((r) => v.results?.[r.id]?.Race?.some((x) => x.driverId === d.id)).length ? (<>
        <View><Eyebrow>{`Results · season ${season || cur}`}</Eyebrow></View>
        {v.races.map((r) => { const x = v.results?.[r.id]?.Race?.find((y) => y.driverId === d.id); if (!x) return null; const q = v.results?.[r.id]?.Qualifying?.find((y) => y.driverId === d.id);
          return <ResultLine key={r.id} pos={x.status === 'OK' ? x.pos : 'DNF'} first="" last={r.name} color={color} right={x.time} sub={`${q ? `Grid ${q.pos} · ` : ''}${x.points ? `+${x.points}` : '0'} pts`} onPress={() => navigation.navigate('FantasyRace', { id, raceId: r.id, season: season || cur, focus: d.id })} />; })}
      </>) : null}
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
            {DRIVER_ATTRS.map(([k, label]) => <Stepper key={k} label={label} value={Math.round(A(d)[k])} min={30} max={99} step={2} onChange={(v) => upd(attrPatch(d, k, v))} />)}
            <Stepper label="Age" value={A(d).age} min={17} max={50} onChange={(v) => upd(attrPatch(d, 'age', v))} />
            {canMove ? <Dropdown value={d.teamId} options={f.teams.map((x) => [x.id, x.name])} onChange={(tid) => upd({ teamId: tid })} prefix="Team" /> : <Note>Drivers change teams between seasons, in the transfers.</Note>}
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
  const cardRows = rows.map((r) => { const d = drv(r.driverId); return { key: r.driverId, pos: r.pos, color: tcol(v, d?.teamId), name: d ? d.name : '?', photo: d ? driverPic(d) : null, code: d ? String(d.last).slice(0, 3).toUpperCase() : '', logo: teamPic(team(d?.teamId)), team: team(d?.teamId)?.name || '', right: !isQ && r.points ? `${r.time}  +${r.points}` : r.time }; });
  const chip = (icon, text) => <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}><Ionicons name={icon} size={14} color={colors.accent} /><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '600' }}>{text}</Text></View>;
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={2}>{race.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{`${race.place || 'Custom race'} · ${race.laps} laps${race.sprint ? ' · sprint weekend' : ''}${season && !isCur ? ` · season ${season}` : ''}`}</Text>
      </Grad>
      {w ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chip(w.wet ? 'rainy' : 'sunny', w.wet ? 'Wet race' : 'Dry')}{!isQ && w.sc ? chip('warning', `Safety car${w.sc > 1 ? ` ×${w.sc}` : ''}`) : null}{chip('git-compare', OVT(w.od))}{!isQ && dnf ? chip('close-circle', `${dnf} retired`) : null}</View> : null}
      {missing && isCur && !f.off ? <Btn tone="solid" icon="play-skip-forward" onPress={simulateMissing}>{have.length ? 'Simulate the rest of the weekend' : 'Simulate this weekend'}</Btn> : null}
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
function AllStats({ f, v, n, closed, navigation }) {
  const a = useMemo(() => allTime(f), [f]); const sm = useMemo(() => seasonSummary(v, closed), [v, closed]); const [sx, setSx] = useState(false); const shotS = useRef(null); const [all, setAll] = useState(false); const [exp, setExp] = useState(false); const shot = useRef(null);
  const tile = (k, v) => (<View key={k} style={{ width: '31.5%', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }}><Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 1.2 }}>{k.toUpperCase()}</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 2 }}>{String(v)}</Text></View>);
  if (!a.races) return <Card><Note>Nothing has been simulated yet. Once races are run, every total shows up here.</Note></Card>;
  const rows = all ? a.drivers : a.drivers.slice(0, 10); const champ = a.drivers[0];
  const ex = a.drivers.map((x) => ({ key: x.id, name: x.d.name, photo: driverPic(x.d), code: String(x.d.last || '').slice(0, 3).toUpperCase(), logo: teamPic(x.team), team: `${x.titles} titles · ${x.wins} wins`, color: x.team?.color || colors.muted, points: x.points }));
  return (<>
    {f.ended ? <Grad color={colors.gold} from={0.3} to={0.04} border={0.5} style={{ padding: 14 }}><Text style={{ color: colors.gold, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>FINAL STATS</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{f.name}</Text><Text style={{ color: colors.muted, fontSize: 15 }}>{`${a.seasons} season${a.seasons > 1 ? 's' : ''} · ${a.races} races`}</Text></Grad> : null}
    <Card>
      <Eyebrow>Totals</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {tile('Seasons', a.seasons)}{tile('Races', a.races)}{tile('Drivers', a.drivers.length)}{tile('Champions', new Set(a.champs.map((c) => c.driver.id)).size)}{tile('Winners', a.drivers.filter((x) => x.wins > 0).length)}{tile('Fastest laps', a.drivers.reduce((s, x) => s + x.fl, 0))}
      </View>
      {champ && champ.titles > 0 ? <Text style={{ color: colors.gold, fontSize: 17, fontWeight: '800', marginTop: 12 }}>{`🏆 Most titles: ${champ.d.name} (${champ.titles})`}</Text> : null}
    </Card>
    {a.champs.length > 0 && (
      <Card>
        <Eyebrow>Champions</Eyebrow>
        <View style={{ marginTop: 8 }}>{a.champs.map((c) => (
          <View key={c.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ width: 30, color: colors.muted, fontWeight: '800', fontSize: 15 }}>{`S${c.n}`}</Text>
            <Avatar source={driverPic(c.driver)} color={c.team?.color} label={c.driver.number} size={36} radius={18} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{c.driver.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{`${c.team?.name || ''} · ${c.driver.points} pts · ${c.driver.wins} wins`}</Text></View>
            <Text style={{ color: colors.muted, fontSize: 12, maxWidth: 90, textAlign: 'right' }} numberOfLines={2}>{c.tteam ? `Teams: ${c.tteam.name}` : ''}</Text>
          </View>))}</View>
      </Card>)}
    {sm ? (() => {
      const names = (t) => (t ? t.who.map((d) => d.name).join(', ') : '—'); const c = sm.champion;
      const rows = [['Most wins', sm.wins], ['Most poles', sm.poles], ['Most podiums', sm.podiums], ['Fastest laps', sm.fl], ['Most retirements', sm.dnf]].filter(([, t]) => t).map(([k, t]) => ({ k, v: names(t), n: t.val }));
      if (sm.tpoints) rows.push({ k: 'Team champion', v: sm.tpoints.who[0].name, n: sm.tpoints.val, logo: teamPic(sm.tpoints.who[0]) });
      if (sm.margin != null) rows.push({ k: 'Title margin', v: `${sm.races} races, ${sm.winners} winners`, n: `${sm.margin} pts` });
      const hero = c ? { label: sm.closed ? 'CHAMPION' : 'LEADER', name: c.name, sub: `${c.points} pts · ${c.wins} wins · ${sm.team?.name || ''}`, photo: driverPic(c), color: sm.team?.color, code: String(c.last || '').slice(0, 3).toUpperCase(), logo: teamPic(sm.team) } : null;
      return (<>
        <View><Eyebrow>{`Season ${n} summary`}</Eyebrow></View>
        <Card>
          {hero ? <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '800' }}>{`${sm.closed ? '🏆' : '⏱'} ${hero.name}`}</Text> : null}
          <View style={{ marginTop: 8, gap: 6 }}>{rows.map((r) => <View key={r.k} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ width: 120, color: colors.muted, fontSize: 15 }}>{r.k}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700' }}>{r.v}</Text><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }}>{r.n}</Text></View>)}</View>
        </Card>
        <Btn icon="share-social-outline" onPress={() => setSx(!sx)}>{sx ? 'Hide the export picture' : `Export the season ${n} summary`}</Btn>
        {sx ? <><SummaryCard shotRef={shotS} title={`${f.name} · season ${n}`} sub={`${sm.races} races`} hero={hero} rows={rows} /><ExportBar target={shotS} /></> : null}
      </>);
    })() : null}
    <View><Eyebrow>All-time drivers</Eyebrow></View>
    {rows.map((x, i) => <ResultLine key={x.id} pos={i + 1} first={x.d.first} last={x.d.last} color={x.team?.color || colors.muted} right={String(x.points)} sub={`${x.titles} titles · ${x.wins} wins · ${x.podiums} podiums · ${x.poles} poles`} fav={x.d.me} champion={x.titles > 0 && i === 0} photoSrc={driverPic(x.d)} logoSrc={teamPic(x.team)} onPress={() => navigation.navigate('FantasyDriver', { id: f.id, driverId: x.id })} />)}
    {a.drivers.length > 10 ? <Btn icon={all ? 'chevron-up' : 'chevron-down'} onPress={() => setAll(!all)}>{all ? 'Show the top 10' : `Show all ${a.drivers.length} drivers`}</Btn> : null}
    <View><Eyebrow>All-time teams</Eyebrow></View>
    {a.teams.map((x, i) => (
      <Grad key={x.id} color={x.t.color} from={0.5} to={0.06} dir="h" radius={16} border={0.4} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ width: 26, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>{i + 1}</Text>
        <Avatar source={teamPic(x.t)} color={x.t.color} label={x.t.name} size={44} radius={12} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{x.t.name}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{`${x.titles} titles · ${x.wins} wins · ${x.seasons} seasons`}</Text></View>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{x.points}</Text>
      </Grad>))}
    {(a.rec.wins || a.rec.points) && (
      <Card>
        <Eyebrow>Records</Eyebrow>
        <View style={{ marginTop: 8, gap: 8 }}>
          {a.rec.wins ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Most wins in a season: ${a.rec.wins.val} · ${a.rec.wins.name} (S${a.rec.wins.n})`}</Text> : null}
          {a.rec.points ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Most points in a season: ${a.rec.points.val} · ${a.rec.points.name} (S${a.rec.points.n})`}</Text> : null}
          {a.rec.margin && a.champs.length > 1 ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Biggest title margin: ${a.rec.margin.val} pts · ${a.rec.margin.name} (S${a.rec.margin.n})`}</Text> : null}
          {a.rec.tight && a.champs.length > 1 ? <Text style={{ color: colors.fg, fontSize: 16 }}>{`Closest title fight: ${a.rec.tight.val} pts · ${a.rec.tight.name} (S${a.rec.tight.n})`}</Text> : null}
        </View>
      </Card>)}
    <Btn icon="share-social-outline" onPress={() => setExp(!exp)}>{exp ? 'Hide the export picture' : 'Export the all-time drivers table'}</Btn>
    {exp ? <><StandingsCard shotRef={shot} title={`${f.name} · all-time`} sub={`${a.seasons} season${a.seasons > 1 ? 's' : ''}`} rows={ex} /><ExportBar target={shot} /></> : null}
  </>);
}
