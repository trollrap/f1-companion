import React, { useMemo, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { colors } from '../theme';
import { norm } from '../lib/names';
import { localAllDrivers, localAllTeams } from '../api/history';
import { CIRCUITS } from '../data/circuits';
import { RULES } from '../data/rules';

// One search box over everything that is stored offline: every driver and team in the history, the 25 circuits, the rules text and the app's own pages.
const PAGES = [['RaceDay', 'Race day', 'live, weather, order'], ['Replay', 'Season replay', 'what-if seasons'], ['TimeMachine', 'Time machine', 'watch past races'], ['FanZone', 'Fan zone', 'quiz, higher or lower'], ['Weekend', 'Race weekend', 'timeline and forecast'], ['Leaderboard', 'Leaderboard', 'prediction league'], ['Predict', 'Predictions', 'predict the next race'], ['Quiz', 'Quiz', 'test your knowledge'], ['Records', 'Records', 'records and history'], ['Grid', 'Next season grid', 'drivers and teams'], ['WhatIf', 'What if', 'championship what-if'], ['Settings', 'Settings', 'theme, text, backup']];
const Row = ({ icon, title, sub, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }, pressed && { opacity: 0.7 }]}>
    <Ionicons name={icon} size={20} color={colors.accent} />
    <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{title}</Text>{sub ? <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{sub}</Text> : null}</View>
    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
  </Pressable>);
export default function SearchScreen({ navigation }) {
  const [q, setQ] = useState(''); const n = norm(q);
  const data = useMemo(() => { try { return { d: localAllDrivers(), t: localAllTeams() }; } catch { return { d: [], t: [] }; } }, []);
  const r = useMemo(() => {
    if (n.length < 2) return null; const has = (x) => norm(x).includes(n);
    const d = data.d.filter((x) => has(x.name) || (x.code && norm(x.code) === n)).sort((a, b) => (b.last_year || 0) - (a.last_year || 0)).slice(0, 8);
    const t = data.t.filter((x) => has(x.name)).slice(0, 6);
    const c = CIRCUITS.filter((x) => has(x.name) || has(x.place)).slice(0, 5);
    const rules = []; RULES.forEach((g) => g.items.forEach(([k, v]) => { if (rules.length < 6 && (has(k) || has(v))) rules.push({ g: g.title, k, v }); }));
    const pg = PAGES.filter((x) => has(x[1]) || has(x[2])).slice(0, 5);
    return { d, t, c, rules, pg };
  }, [n, data]);
  const none = r && !r.d.length && !r.t.length && !r.c.length && !r.rules.length && !r.pg.length;
  return (
    <Screen header={false}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Drivers, teams, circuits, rules, pages" placeholderTextColor={colors.muted} accessibilityLabel="Search everything" style={{ flex: 1, color: colors.fg, fontSize: 18, paddingVertical: 8 }} />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear"><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable> : null}
        </View>
      </Card>
      {!r ? <Note>Type at least two letters. Searches every driver and team in the history, all circuits, the rules and the app's pages.</Note> : null}
      {none ? <Note>{`Nothing found for "${q}".`}</Note> : null}
      {r && r.d.length > 0 && <Card><Eyebrow>Drivers</Eyebrow>{r.d.map((x) => <Row key={x.driverId} icon="person" title={x.name} sub={[x.nationality, x.first_year && x.last_year ? `${x.first_year}${x.last_year !== x.first_year ? ` to ${x.last_year}` : ''}` : ''].filter(Boolean).join(' · ')} onPress={() => navigation.navigate('Driver', { driverId: x.driverId, name: x.name, first: x.first, last: x.last })} />)}</Card>}
      {r && r.t.length > 0 && <Card><Eyebrow>Teams</Eyebrow>{r.t.map((x) => <Row key={x.teamId} icon="car-sport" title={x.name} sub={x.nationality} onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name })} />)}</Card>}
      {r && r.c.length > 0 && <Card><Eyebrow>Circuits</Eyebrow>{r.c.map((x) => <Row key={x.key} icon="flag" title={x.name} sub={x.place} onPress={() => navigation.navigate('Circuit', { meeting: { circuit_short_name: x.name, location: x.place, country_name: '', meeting_name: '', circuit_key: null } })} />)}</Card>}
      {r && r.rules.length > 0 && <Card><Eyebrow>Rules</Eyebrow>{r.rules.map((x) => <Row key={x.g + x.k} icon="book" title={x.k} sub={`${x.g}: ${x.v.slice(0, 80)}${x.v.length > 80 ? '…' : ''}`} onPress={() => navigation.navigate('Rules')} />)}</Card>}
      {r && r.pg.length > 0 && <Card><Eyebrow>Pages</Eyebrow>{r.pg.map((x) => <Row key={x[0]} icon="apps" title={x[1]} sub={x[2]} onPress={() => navigation.navigate(x[0])} />)}</Card>}
    </Screen>);
}
