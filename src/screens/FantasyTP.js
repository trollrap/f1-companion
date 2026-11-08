import React, { useEffect } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import Reveal from '../components/Reveal';
import { Btn } from '../components/FunBits';
import { CountUp, Bar, Pop } from '../components/Anim';
import { TA } from '../fun/sim';
import { UPGRADES, EXTEND_COST, costOf, startTP, endTP, settle, buy, extend, pressFor, answerPress, eventFor, resolveEvent, latestRaceId, position, teamPoints, rivalries } from '../fun/tp';
import { colors, alpha } from '../theme';

const ord = (n) => `${n}${[, 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10] || 'th'}`;
const field = (t, k) => (k === 'car' ? t.car ?? 65 : TA(t)[k]);

export function TeamPrincipal({ f, id, fun, reveal = 0 }) {
  const tp = f.tp;
  // Races run since the last visit are paid out as soon as this screen is open.
  useEffect(() => { if (tp) fun.update(id, settle); }, [f.results, f.season, !!tp]);
  if (!tp) {
    return (
      <>
        <Reveal index={reveal}><Grad color={colors.accent} from={0.35} to={0.04} border={0.4} style={{ padding: 16 }}>
          <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>Become a Team Principal</Text>
          <Text style={{ color: colors.fg, opacity: 0.85, fontSize: 16, marginTop: 6, lineHeight: 22 }}>Pick a team and run it: prize money pays for car upgrades, press conferences build (or burn) your reputation, and contracts keep your drivers from being poached.</Text>
        </Grad></Reveal>
        {f.teams.map((t, i) => (
          <Reveal key={t.id} index={reveal + 1 + i}>
            <Pressable onPress={() => Alert.alert(`Run ${t.name}?`, 'You can leave the team again at any time.', [{ text: 'Cancel' }, { text: 'Start', onPress: () => fun.update(id, (g) => startTP(g, t.id)) }])} style={({ pressed }) => pressed && { opacity: 0.75 }}>
              <Grad color={t.color} from={0.4} to={0.05} radius={16} border={0.35} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{t.name}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{`Car ${t.car ?? 65} · Reliability ${TA(t).rel} · Pit crew ${TA(t).pit}`}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Grad>
            </Pressable>
          </Reveal>))}
      </>);
  }
  const team = f.teams.find((t) => t.id === tp.teamId); if (!team) return <Note>This team no longer exists.</Note>;
  const pos = position(f), mine = f.drivers.filter((d) => d.teamId === team.id); const pid = latestRaceId(f); const press = pid ? pressFor(f, pid) : null; const done = pid ? tp.press[pid] : null;
  const raceName = pid ? f.races.find((r) => r.id === pid)?.name : '';
  const doBuy = (k) => { const cost = costOf(f, k); if (tp.budget < cost) { Alert.alert('Upgrade', 'Not enough budget.'); return; }
    Alert.alert(UPGRADES[k].label, 'Safe gives a steady gain. Bold can be a breakthrough, but about 4 in 10 gambles fail and the part makes the car slower.', [
      { text: 'Safe', onPress: () => fun.update(id, (g) => buy(g, k, 'safe').f) },
      { text: 'Bold gamble', style: 'destructive', onPress: () => { let msg = ''; fun.update(id, (g) => { const r = buy(g, k, 'bold'); msg = r.text; return r.f; }); setTimeout(() => { if (msg) Alert.alert('Result', msg); }, 150); } },
      { text: 'Cancel', style: 'cancel' }]); };
  const evt = pid ? eventFor(f, pid) : null; const evDone = evt ? tp.events?.[pid] : null;
  return (
    <View style={{ gap: 12 }}>
      <Reveal index={reveal}>
        <Grad color={team.color} from={0.5} to={0.06} border={0.5} style={{ padding: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, letterSpacing: 3 }}>YOUR TEAM</Text>
          <Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800' }}>{team.name}</Text>
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2 }}>BUDGET</Text><CountUp value={tp.budget} decimals={1} style={{ color: colors.gold, fontSize: 30, fontWeight: '800' }} /></View>
            <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2 }}>CHAMPIONSHIP</Text><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{ord(pos)}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2 }}>POINTS</Text><CountUp value={teamPoints(f, team.id)} style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }} /></View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, marginTop: 12 }}>REPUTATION</Text>
          <View style={{ marginTop: 5 }}><Bar pct={tp.hype} color={tp.hype >= 60 ? colors.good : tp.hype >= 35 ? colors.gold : colors.red} height={9} /></View>
          <Text style={{ color: colors.fg, fontSize: 14, marginTop: 10 }}>{`Board target: finish ${ord(tp.target)} or better. ${pos <= tp.target ? 'You are on track.' : `You are ${pos - tp.target} place${pos - tp.target === 1 ? '' : 's'} short.`}`}</Text>
        </Grad>
      </Reveal>
      {press ? (
        <Reveal index={reveal + 1}>
          <Card>
            <Eyebrow>{`Press conference · ${raceName}`}</Eyebrow>
            <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '600', lineHeight: 25, marginTop: 6 }}>{`"${press.q}"`}</Text>
            {done ? <Pop trigger={done}><Text style={{ color: colors.gold, fontSize: 16, marginTop: 10, fontWeight: '600' }}>{done}</Text></Pop> : press.answers.map((a) => (
              <Pressable key={a.id} onPress={() => fun.update(id, (g) => answerPress(g, pid, a.id).f)} style={({ pressed }) => [{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}>
                <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{a.label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{a.hint}</Text>
              </Pressable>))}
          </Card>
        </Reveal>) : null}
      {evt ? (
        <Reveal index={reveal + 1}>
          <Card>
            <Eyebrow>{`Paddock drama · ${evt.title}`}</Eyebrow>
            <Text style={{ color: colors.fg, fontSize: 18, lineHeight: 24, marginTop: 6 }}>{evt.q}</Text>
            {evDone ? <Pop trigger={evDone}><Text style={{ color: colors.gold, fontSize: 16, marginTop: 10, fontWeight: '600' }}>{evDone}</Text></Pop> : evt.opts.map((o) => (
              <Pressable key={o.id} onPress={() => fun.update(id, (g) => resolveEvent(g, pid, o.id).f)} style={({ pressed }) => [{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}>
                <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o.label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{o.hint}</Text>
              </Pressable>))}
          </Card>
        </Reveal>) : null}
      <Reveal index={reveal + 2}>
        <Card>
          <Eyebrow>Upgrades</Eyebrow>
          {Object.keys(UPGRADES).map((k, i) => { const u = UPGRADES[k]; const cost = costOf(f, k); const can = tp.budget >= cost; const val = field(team, u.field);
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: alpha(team.color, 0.22), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={u.icon} size={19} color={colors.fg} /></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{u.label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${u.blurb} Now ${Math.round(val * 10) / 10}${tp.levels[k] ? ` · ${tp.levels[k]} upgrade${tp.levels[k] > 1 ? 's' : ''}` : ''}`}</Text></View>
                <Pressable onPress={() => doBuy(k)} style={({ pressed }) => [{ paddingHorizontal: 14, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: can ? colors.accent : 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.7 }]}><Text style={{ color: can ? '#fff' : colors.muted, fontWeight: '800' }}>{cost}</Text></Pressable>
              </View>); })}
          <Note>Each upgrade costs more every time you buy it. Pick safe or a bold gamble. Budget comes from prize money after every race.</Note>
        </Card>
      </Reveal>
      <Reveal index={reveal + 3}>
        <Card>
          <Eyebrow>Car development · all teams</Eyebrow>
          {[...f.teams].sort((a, b) => (b.car ?? 65) - (a.car ?? 65)).map((t, i) => { const h = f.carHist?.[t.id] || []; const d = h.length > 1 ? Math.round((h[h.length - 1] - h[0]) * 10) / 10 : 0;
            return (<View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <Text style={{ width: 22, color: colors.muted, fontSize: 13 }}>{i + 1}</Text>
              <Text style={{ width: 110, color: t.id === team.id ? colors.gold : colors.fg, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{t.name}</Text>
              <View style={{ flex: 1 }}><Bar pct={Math.max(4, ((t.car ?? 65) - 40) * 1.8)} color={t.color} height={7} /></View>
              <Text style={{ width: 54, textAlign: 'right', color: d > 0 ? colors.good : d < 0 ? colors.red : colors.muted, fontSize: 13, fontWeight: '700' }}>{`${Math.round((t.car ?? 65) * 10) / 10}${d ? ` ${d > 0 ? '+' : ''}${d}` : ''}`}</Text>
            </View>); })}
          <Note>Rivals bring updates after every race. The teams at the back develop a little faster. The small number is the change since the first race.</Note>
        </Card>
      </Reveal>
      <Reveal index={reveal + 4}>
        <Card>
          <Eyebrow>Driver contracts</Eyebrow>
          {mine.map((d, i) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <Text style={{ width: 34, color: team.color, fontWeight: '800', fontSize: 18 }}>{d.number}</Text>
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{d.name}</Text><Text style={{ color: d.contract > 0 ? colors.good : colors.muted, fontSize: 13 }}>{d.contract > 0 ? `Contract: ${d.contract} more winter${d.contract > 1 ? 's' : ''} (cannot be poached)` : 'No contract: may be tempted away over the winter'}</Text></View>
              <Pressable onPress={() => { const r = extend(f, d.id); if (!r.ok) { Alert.alert('Not enough budget', `A two-year extension costs ${EXTEND_COST}.`); return; } fun.update(id, (g) => extend(g, d.id).f); }} style={({ pressed }) => [{ paddingHorizontal: 12, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tp.budget >= EXTEND_COST ? alpha(colors.accent, 0.9) : 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.7 }]}><Text style={{ color: tp.budget >= EXTEND_COST ? '#fff' : colors.muted, fontWeight: '800', fontSize: 13 }}>{`+2 yrs · ${EXTEND_COST}`}</Text></Pressable>
            </View>))}
        </Card>
      </Reveal>
      {tp.log?.length ? (<Reveal index={reveal + 4}><Card><Eyebrow>Team log</Eyebrow>{tp.log.slice(0, 6).map((l, i) => <Text key={i} style={{ color: i ? colors.muted : colors.fg, fontSize: 14, marginTop: 6 }}>{l.text}</Text>)}</Card></Reveal>) : null}
      <Btn icon="exit-outline" onPress={() => Alert.alert('Leave the team?', 'Your budget and upgrades history will be forgotten (the car keeps its upgrades).', [{ text: 'Cancel' }, { text: 'Leave', style: 'destructive', onPress: () => fun.update(id, endTP) }])}>Leave team</Btn>
    </View>);
}

export function Rivalries({ f, reveal = 0 }) {
  const list = rivalries(f, 6);
  if (!list.length) return <Card><Eyebrow>Rivalries</Eyebrow><Note>Rivalries grow out of clashes and close fights. Run a few races and they will show up here.</Note></Card>;
  const colOf = (d) => f.teams.find((t) => t.id === d.teamId)?.color || colors.muted;
  return (
    <View style={{ gap: 12 }}>
      {list.map((r, i) => (
        <Reveal key={r.a + r.b} index={reveal + i}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: colOf(r.da), fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{r.da.last || r.da.name}</Text>
              <Text style={{ color: colors.muted, fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>VS</Text>
              <Text style={{ flex: 1, textAlign: 'right', color: colOf(r.db), fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{r.db.last || r.db.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {[r.clashes ? `${r.clashes} clash${r.clashes > 1 ? 'es' : ''}` : null, r.mates ? 'Team-mates' : null, r.close >= 4 ? `${r.close} close fights` : null, r.clashes >= 2 ? 'Heated' : null].filter(Boolean).map((t) => (
                <View key={t} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: t === 'Heated' ? alpha(colors.red, 0.25) : 'rgba(255,255,255,0.08)', justifyContent: 'center' }}><Text style={{ color: t === 'Heated' ? '#ff8a8a' : colors.fg, fontSize: 12, fontWeight: '700' }}>{t}</Text></View>))}
            </View>
            {r.aw + r.bw ? (<View style={{ marginTop: 10 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{r.aw}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>FINISHED AHEAD (NEARBY)</Text><Text style={{ color: colors.fg, fontWeight: '800' }}>{r.bw}</Text></View><View style={{ marginTop: 4 }}><Bar pct={(r.aw / (r.aw + r.bw)) * 100} color={colOf(r.da)} bg={alpha(colOf(r.db), 0.6)} height={6} delay={i * 60} /></View></View>) : null}
          </Card>
        </Reveal>))}
    </View>);
}
