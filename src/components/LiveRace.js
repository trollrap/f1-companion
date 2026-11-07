import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Modal, Pressable, ScrollView, Image, StatusBar, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Avatar } from './FunBits';
import { colors, alpha } from '../theme';

// Live race watch mode: replays a simulated race lap by lap (positions, gaps, pit stops, retirements, lead changes).
// The result is already decided by the simulation; this builds a believable lap chart that ends exactly on that result.
const PIT = 22; // seconds lost per stop
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

function plan(drv, laps, seed) {
  const fin = drv.filter((d) => !d.out).sort((a, b) => a.pos - b.pos);
  // final gap of every finisher in seconds; lapped cars only have a text gap, so keep them in order after the last timed car
  let last = 0; fin.forEach((d, i) => { const g = i === 0 ? 0 : Number.isFinite(d.gap) ? d.gap : last + 28 + i; d.fgap = Math.max(g, last); last = d.fgap; });
  const slopes = fin.map((d) => (d.fgap - PIT * d.stops - (d.grid - 1) * 0.4) / laps).sort((a, b) => a - b);
  const mid = slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0.5;
  drv.forEach((d) => {
    d.off0 = (d.grid - 1) * 0.4;
    d.slope = d.out ? mid + ((hash(d.id + seed) % 100) - 50) / 400 : (d.fgap - PIT * d.stops - d.off0) / laps;
    d.stopLaps = Array.from({ length: d.stops }, (_, k) => {
      const base = Math.round((laps * (k + 1)) / (d.stops + 1)); const j = (hash(d.id + seed + k) % 7) - 3;
      return Math.max(3, Math.min(laps - 2, base + j));
    });
  });
  const at = (d, L) => d.off0 + d.slope * L + PIT * d.stopLaps.filter((p) => p <= L).length;
  const chart = []; // chart[L] = [ids in order]
  for (let L = 0; L <= laps; L++) {
    const alive = drv.filter((d) => !d.out || d.lap > L || L === 0);
    chart.push(alive.map((d) => ({ d, t: at(d, L) })).sort((a, b) => a.t - b.t || a.d.grid - b.d.grid).map((x) => ({ id: x.d.id, t: x.t })));
  }
  chart[laps] = fin.map((d) => ({ id: d.id, t: d.fgap }));
  return chart;
}

function eventsOf(drv, chart, laps, sc, wet) {
  const ev = Array.from({ length: laps + 1 }, () => []); const by = {}; drv.forEach((d) => { by[d.id] = d; });
  ev[0].push({ k: 'flag', t: wet ? 'Lights out in the wet. Everybody starts on intermediates.' : 'Lights out and away we go.' });
  drv.forEach((d) => {
    d.stopLaps.forEach((p) => { if (!d.out || p < d.lap) ev[p].push({ k: 'pit', id: d.id, t: `${d.name} pits (stop ${d.stopLaps.indexOf(p) + 1} of ${d.stops})` }); });
    if (d.out) { const w = d.with && by[d.with]; ev[Math.min(d.lap, laps)].push({ k: 'out', id: d.id, t: w && d.fault ? `${d.name} hits ${w.name} and is out` : w ? `${d.name} is out after contact with ${w.name}` : d.crash ? `${d.name} crashes out` : `${d.name} stops: ${String(d.reason || 'mechanical').toLowerCase()}` }); }
  });
  if (sc) { const s = Math.max(4, Math.min(laps - 6, 5 + (hash(drv.map((d) => d.id).join('')) % Math.max(1, laps - 14)))); ev[s].push({ k: 'sc', t: 'Safety car deployed' }); ev[Math.min(laps, s + 3)].push({ k: 'sc', t: 'Safety car in, racing resumes' }); }
  for (let L = 1; L <= laps; L++) {
    const a = chart[L - 1][0]?.id, b = chart[L][0]?.id;
    if (L > 1 && a && b && a !== b && !(by[a].out && by[a].lap <= L)) ev[L].push({ k: 'lead', id: b, t: `${by[b].name} takes the lead from ${by[a].name}` });
    else if (L > 1 && a && b && a !== b) ev[L].push({ k: 'lead', id: b, t: `${by[b].name} inherits the lead` });
  }
  ev[laps].push({ k: 'flag', t: `Chequered flag: ${by[chart[laps][0]?.id]?.name || ''} wins` });
  return ev;
}

export default function LiveRace({ visible, race, laps, drivers, sc, wet, onClose }) {
  const ins = useSafeAreaInsets();
  const total = Math.max(1, laps || 1);
  const model = useMemo(() => { if (!visible || !drivers?.length) return null; const drv = drivers.map((d) => ({ ...d })); const chart = plan(drv, total, race); return { drv, chart, ev: eventsOf(drv, chart, total, sc, wet) }; }, [visible, drivers, total, sc, wet, race]);
  const [lap, setLap] = useState(0); const [play, setPlay] = useState(true); const [speed, setSpeed] = useState(1); const [log, setLog] = useState([]);
  const lapRef = useRef(0);
  useEffect(() => { if (visible) { lapRef.current = 0; setLap(0); setPlay(true); setSpeed(1); setLog(model?.ev[0].map((e) => ({ ...e, lap: 0 })) || []); } }, [visible, model]);
  const done = lap >= total;
  useEffect(() => {
    if (!visible || !play || done || !model) return undefined;
    const h = setInterval(() => {
      const nx = Math.min(total, lapRef.current + 1); lapRef.current = nx;
      try { LayoutAnimation.configureNext(LayoutAnimation.create(Math.min(380, 700 / speed), 'easeInEaseOut', 'opacity')); } catch (e) { /* ignore */ }
      setLap(nx); const add = model.ev[nx].map((e) => ({ ...e, lap: nx })); if (add.length) setLog((l) => [...add.reverse(), ...l].slice(0, 40));
    }, Math.max(90, 900 / speed));
    return () => clearInterval(h);
  }, [visible, play, done, speed, model, total]);
  const skip = () => { if (!model) return; lapRef.current = total; setLap(total); setLog((l) => [...model.ev[total].map((e) => ({ ...e, lap: total })), ...l].slice(0, 40)); setPlay(false); };
  const by = useMemo(() => { const m = {}; (model?.drv || []).forEach((d) => { m[d.id] = d; }); return m; }, [model]);
  const order = model ? model.chart[Math.min(lap, total)] : [];
  const outs = model ? model.drv.filter((d) => d.out && d.lap <= lap && lap > 0).sort((a, b) => b.lap - a.lap) : [];
  const pitNow = new Set(model ? model.drv.filter((d) => d.stopLaps.includes(lap) && (!d.out || d.lap > lap)).map((d) => d.id) : []);
  const lead = order[0]?.t || 0;
  const Speed = ({ v }) => (<Pressable onPress={() => setSpeed(v)} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: speed === v ? colors.accent : 'rgba(255,255,255,0.10)' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{`${v}x`}</Text></Pressable>);
  return (
    <Modal visible={!!visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={colors.deep} />
      <View style={{ flex: 1, backgroundColor: colors.deep }}>
        <LinearGradient pointerEvents="none" colors={[alpha(colors.accent, 0.35), alpha(colors.accent, 0)]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 240 }} />
        <View style={{ paddingTop: Math.max(ins.top, 12) + 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 12, letterSpacing: 3 }}>{done ? 'FINISHED' : 'LIVE'}</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{race}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{`${Math.min(lap, total)}/${total}`}</Text><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2 }}>LAP</Text></View>
        </View>
        <View style={{ height: 4, marginHorizontal: 16, marginTop: 10, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}><View style={{ height: 4, width: `${(Math.min(lap, total) / total) * 100}%`, backgroundColor: colors.accent }} /></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 5 }}>
          {order.map((o, i) => { const d = by[o.id]; if (!d) return null; const gap = i === 0 ? 'Leader' : `Interval +${(o.t - order[i - 1].t).toFixed(1)}`; const pit = pitNow.has(d.id);
            return (
              <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: alpha(d.color, i < 3 ? 0.28 : 0.14), borderWidth: 1, borderColor: alpha(d.color, i === 0 ? 0.8 : 0.25) }}>
                <Text style={{ width: 26, textAlign: 'center', color: i === 0 ? colors.gold : '#fff', fontWeight: '800', fontSize: 16 }}>{i + 1}</Text>
                <Avatar source={d.photo} color={d.color} label={d.code} size={30} radius={15} />
                <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{d.name}</Text>
                {pit ? <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.gold }}><Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>PIT</Text></View> : null}
                <Text style={{ color: i === 0 ? colors.gold : colors.muted, fontSize: 13, minWidth: 92, textAlign: 'right' }}>{gap}</Text>
              </View>); })}
          {outs.map((d) => (
            <View key={`o${d.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', opacity: 0.7 }}>
              <Text style={{ width: 26, textAlign: 'center', color: colors.red, fontWeight: '800', fontSize: 12 }}>OUT</Text>
              <Avatar source={d.photo} color={colors.muted} label={d.code} size={26} radius={13} />
              <Text style={{ flex: 1, color: colors.muted, fontSize: 14 }} numberOfLines={1}>{d.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{`lap ${d.lap}`}</Text>
            </View>))}
          <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2, marginTop: 12 }}>RACE CONTROL</Text>
          {log.slice(0, 8).map((e, i) => (<View key={`${e.lap}-${i}-${e.t}`} style={{ flexDirection: 'row', gap: 8, opacity: Math.max(0.35, 1 - i * 0.1) }}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13, width: 44 }}>{`LAP ${e.lap}`}</Text><Text style={{ flex: 1, color: e.k === 'out' ? '#ff8a8a' : e.k === 'lead' ? colors.gold : '#fff', fontSize: 14 }}>{e.t}</Text></View>))}
          <View style={{ height: 120 }} />
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(ins.bottom, 12) + 8, paddingTop: 12, paddingHorizontal: 16, backgroundColor: 'rgba(10,5,6,0.96)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {done ? (
            <Pressable onPress={onClose} style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>See the result</Text></Pressable>
          ) : (
            <>
              <Pressable onPress={() => setPlay((p) => !p)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={play ? 'pause' : 'play'} size={22} color="#fff" /></Pressable>
              <Speed v={1} /><Speed v={3} /><Speed v={8} />
              <View style={{ flex: 1 }} />
              <Pressable onPress={skip} style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}><Ionicons name="play-skip-forward" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Skip</Text></Pressable>
            </>)}
        </View>
      </View>
    </Modal>
  );
}
