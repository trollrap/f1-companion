import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { kvGet, today } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { settleShield } from '../lib/shield';
import { colors, alpha } from '../theme';

const ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Current and best run of consecutive days with a game played, counting back from today (or yesterday, so today is not a broken streak yet).
export function streaks(days) {
  const set = new Set(days); let cur = 0; const d = new Date(); if (!set.has(ds(d))) d.setDate(d.getDate() - 1);
  while (set.has(ds(d))) { cur++; d.setDate(d.getDate() - 1); }
  const sorted = [...set].sort(); let best = 0, run = 0, prev = null;
  sorted.forEach((x) => { const t = new Date(`${x}T12:00:00`); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; prev = t; if (run > best) best = run; });
  return { cur, best };
}
// A month grid of the days you played, with the streak. A card pack at 7 and 30 days in a row.
export default function PlayCalendar() {
  const [days, setDays] = useState([]); const [gift, setGift] = useState(''); const [sh, setSh] = useState({ st: { have: 0, covered: [] }, note: '' });
  useFocusEffect(useCallback(() => { let on = true; kvGet('playDays', []).then(async (l) => { if (!on) return; const a0 = Array.isArray(l) ? l : []; let r = null; try { r = await settleShield(a0); } catch {} if (!on) return; const cov = r ? r.st.covered : []; const a = [...new Set([...a0, ...cov])]; setDays(a); if (r) setSh(r); const { cur } = streaks(a); let g = r && r.note ? r.note : ''; if (cur >= 7 && (await awardPack('streak:7'))) g = '7 days in a row: a card pack for you!'; if (cur >= 30 && (await awardPack('streak:30'))) g = '30 days in a row: a card pack for you!'; if (on && g) setGift(g); }); return () => { on = false; }; }, []));
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(); const first = (new Date(y, m, 1).getDay() + 6) % 7; const n = new Date(y, m + 1, 0).getDate(); const set = new Set(days); const cov = new Set(sh.st.covered); const t = today();
  const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]; const { cur, best } = streaks(days);
  return (
    <Card>
      <Eyebrow>{`Play calendar · ${now.toLocaleString([], { month: 'long' })}`}</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 20, marginBottom: 8 }}><View><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }}>{cur}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>day streak</Text></View><View><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }}>{best}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>best streak</Text></View></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <Text key={i} style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontSize: 11 }}>{x}</Text>)}
        {cells.map((c, i) => { const key = c ? `${y}-${String(m + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}` : ''; const on = c && set.has(key); const isT = key === t;
          return (<View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 }}>{c ? <View accessible accessibilityLabel={`${c}${on ? ', played' : ''}`} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (cov.has(key) ? alpha(colors.gold, 0.7) : colors.accent) : 'transparent', borderWidth: isT ? 1.5 : 0, borderColor: colors.accent }}><Text style={{ color: on ? '#fff' : colors.fg, fontSize: 13, fontWeight: on ? '800' : '500' }}>{c}</Text></View> : null}</View>); })}
      </View>
      {gift ? <Note>{gift}</Note> : <Note>Finish or play any game to light up the day. 7 days in a row earns a card pack, 30 days another.</Note>}
      <Note>{sh.st.have ? 'Streak shield ready: it covers one missed day.' : 'A 7-day streak earns a shield that covers one missed day (gold days).'}</Note>
    </Card>);
}
