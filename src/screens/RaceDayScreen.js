import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import { colors } from '../theme';
import { liveJSON } from '../lib/cache';
import { OPENF1 } from '../api/openf1';
import { useNow } from '../hooks/useSeason';

const get = async (path) => { const r = await liveJSON(`${OPENF1}/${path}`); if (r.status === 404) return []; if (r.status !== 200 || !Array.isArray(r.json)) throw new Error(`OpenF1 answered ${r.status || 'nothing'}`); return r.json; };
const latestBy = (rows, key) => { const m = {}; rows.forEach((x) => { const k = x[key]; if (!m[k] || String(x.date) >= String(m[k].date)) m[k] = x; }); return m; };
const num = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? '-' : (Math.round(Number(v) * 10 ** d) / 10 ** d).toString());

// Race-day dashboard: the latest session straight from OpenF1 (status, weather, running order, race control). Refreshes by itself while it is open.
export default function RaceDayScreen() {
  const [d, setD] = useState(null); const [err, setErr] = useState(null); const [at, setAt] = useState(null); const alive = useRef(true); const now = useNow(1000);
  const load = useCallback(async () => {
    try {
      const sess = (await get('sessions?session_key=latest'))[0]; if (!sess) { if (alive.current) { setD({ none: true }); setErr(null); } return; }
      const sk = sess.session_key; const live = Date.now() >= Date.parse(sess.date_start) && Date.now() <= Date.parse(sess.date_end);
      const [drivers, pos, weather, rc, itv] = await Promise.all([get(`drivers?session_key=${sk}`), get(`position?session_key=${sk}`), get(`weather?session_key=${sk}`).catch(() => []), get(`race_control?session_key=${sk}`).catch(() => []), get(`intervals?session_key=${sk}`).catch(() => [])]);
      const dm = {}; drivers.forEach((x) => { dm[x.driver_number] = x; }); const lp = latestBy(pos, 'driver_number'); const li = latestBy(itv, 'driver_number');
      const order = Object.values(lp).filter((x) => x.position != null).sort((a, b) => a.position - b.position).map((x) => ({ pos: x.position, n: x.driver_number, d: dm[x.driver_number] || {}, gap: li[x.driver_number] }));
      const w = weather.length ? weather.reduce((a, b) => (String(b.date) >= String(a.date) ? b : a)) : null;
      const msgs = [...rc].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
      if (alive.current) { setD({ sess, live, order, w, msgs }); setErr(null); setAt(Date.now()); }
    } catch (e) { if (alive.current) setErr(String(e?.message || e)); }
  }, []);
  useEffect(() => { alive.current = true; load(); const t = setInterval(load, d?.live ? 15000 : 60000); return () => { alive.current = false; clearInterval(t); }; }, [load, d?.live]);
  if (!d) return <Screen header={false}>{err ? <Card><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>Could not load the session</Text><Note>{err}</Note></Card> : <Skeleton />}</Screen>;
  if (d.none) return <Screen header={false}><Card><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>No session data yet</Text><Note>OpenF1 has no recent session.</Note></Card></Screen>;
  const { sess, live, order, w, msgs } = d; const start = Date.parse(sess.date_start), end = Date.parse(sess.date_end);
  const status = live ? 'LIVE' : now < start ? 'UPCOMING' : 'FINISHED'; const col = live ? colors.red : now < start ? colors.accent : colors.muted;
  const prog = live ? Math.min(1, Math.max(0, (now - start) / (end - start))) : now >= end ? 1 : 0;
  const left = Math.max(0, Math.round((end - now) / 60000)); const toStart = Math.max(0, Math.round((start - now) / 60000));
  const race = /race|sprint/i.test(sess.session_name || '') && !/qualifying/i.test(sess.session_name || '');
  return (
    <Screen header={false}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: col + '2A' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><Text style={{ color: col, fontFamily: 'label', fontSize: 12, letterSpacing: 1.4 }}>{status}</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14, flex: 1, textAlign: 'right' }}>{at ? `Updated ${new Date(at).toLocaleTimeString().slice(0, 8)}` : ''}</Text>
        </View>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', marginTop: 10 }}>{sess.session_name}</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{[sess.circuit_short_name, sess.country_name].filter(Boolean).join(' · ')}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 14, overflow: 'hidden' }}><View style={{ height: 6, width: `${prog * 100}%`, backgroundColor: col, borderRadius: 3 }} /></View>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>{live ? `${left} min left` : now < start ? `Starts in ${toStart >= 60 ? `${Math.floor(toStart / 60)} h ${toStart % 60} min` : `${toStart} min`}` : 'Session finished'}</Text>
      </Card>
      {w ? (
        <Card>
          <Eyebrow>Track conditions</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 14 }}>
            {[['thermometer-outline', 'Air', `${num(w.air_temperature)}°`], ['flame-outline', 'Track', `${num(w.track_temperature)}°`], ['water-outline', 'Humidity', `${num(w.humidity, 0)}%`], ['flag-outline', 'Wind', `${num(w.wind_speed)} m/s`], [w.rainfall ? 'rainy-outline' : 'sunny-outline', 'Rain', w.rainfall ? 'Wet' : 'Dry']].map(([ic, l, v]) => (
              <View key={l} style={{ width: '33.3%', alignItems: 'center', gap: 2 }}><Ionicons name={ic} size={22} color={colors.accent} /><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{l}</Text></View>))}
          </View>
        </Card>) : null}
      <Card>
        <Eyebrow>{live ? 'Running order' : 'Order at the end'}</Eyebrow>
        {!order.length ? <Note>No running order is published for this session.</Note> : (
          <View style={{ marginTop: 8 }}>
            {order.slice(0, 22).map((r) => (
              <View key={r.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
                <Text style={{ width: 26, color: colors.muted, fontSize: 16, fontWeight: '700' }}>{r.pos}</Text>
                <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: r.d.team_colour ? `#${r.d.team_colour}` : colors.line }} />
                <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.d.name_acronym ? `${r.d.name_acronym}  ` : ''}<Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>{r.d.team_name || ''}</Text></Text>
                {race && r.gap ? <Text style={{ color: colors.muted, fontSize: 15 }}>{r.pos === 1 ? 'Leader' : r.gap.interval != null ? `+${num(r.gap.interval)}` : r.gap.gap_to_leader != null ? `+${num(r.gap.gap_to_leader)}` : ''}</Text> : null}
              </View>))}
          </View>)}
      </Card>
      <Card>
        <Eyebrow>Race control</Eyebrow>
        {!msgs.length ? <Note>No messages yet.</Note> : msgs.map((m, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
            <Text style={{ width: 44, color: colors.muted, fontSize: 14 }}>{m.lap_number ? `L${m.lap_number}` : new Date(m.date).toTimeString().slice(0, 5)}</Text>
            <Text style={{ color: /red|yellow|safety|vsc/i.test(`${m.flag} ${m.message}`) ? colors.gold : colors.fg, fontSize: 15, flex: 1 }}>{m.message}</Text>
          </View>))}
      </Card>
      {err ? <Note>{`Last refresh failed: ${err}. Showing the previous data.`}</Note> : <Note>Data from OpenF1. It refreshes by itself while this screen is open.</Note>}
    </Screen>
  );
}
