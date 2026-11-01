import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote } from '../components/Screen';
import Press from '../components/Press';
import Grad from '../components/Grad';
import SeasonSwitch from '../components/SeasonSwitch';
import TrackMap from '../components/TrackMap';
import { useTeamColor } from '../hooks/useTeams';
import { SprintBadge, Pill } from '../components/Badge';
import { useSeason, useNow } from '../hooks/useSeason';
import { useAsync } from '../hooks/useAsync';
import { winnersByRound, jolpicaSchedule } from '../api/jolpica';
import { scheduleToMeeting } from '../api/season';
import { YEAR } from '../api/openf1';
import { wantOutlines, outlineFor, useOutlinesVersion } from '../lib/outlines';
import { colors, alpha } from '../theme';
import { placeLine, shortRange, monthLabel, shortName, flag, daysUntil } from '../lib/time';

const CARD = 72, LABEL = 18, INNER = 10, OUTER = 12, PAD = 16;
// Season calendar. The current season opens on the last finished and the next race; earlier seasons show every winner.
export default function CalendarScreen({ navigation }) {
  const season = useSeason(); const now = useNow(60000); const tc = useTeamColor(); const scroller = useRef(null);
  const [year, setYear] = useState(YEAR); const cur = year === YEAR; useOutlinesVersion();
  const win = useAsync(() => winnersByRound(year), [year]);
  const past = useAsync(async () => (cur ? null : (await jolpicaSchedule(year)).map(scheduleToMeeting)), [year]);
  const races = cur ? season.races : past.v;
  const months = useMemo(() => {
    const out = []; (races || []).forEach((r) => { const k = monthLabel(r); let g = out.find((x) => x.k === k); if (!g) out.push((g = { k, items: [] })); g.items.push(r); }); return out;
  }, [races]);
  const nextKey = cur && season.next ? season.next.meeting_key : null;
  // Exact card heights make the scroll target a sum instead of a measurement.
  const target = useMemo(() => {
    if (!cur || !nextKey) return 0; let y = PAD, hit = null;
    for (const g of months) { const n = g.items.length; const i = g.items.findIndex((r) => r.meeting_key === nextKey); if (i >= 0) { hit = i === 0 ? y - OUTER - CARD : y + LABEL + INNER + (i - 1) * (CARD + INNER); break; } y += LABEL + INNER + n * CARD + (n - 1) * INNER + OUTER; }
    return hit == null ? 0 : Math.max(0, hit - 20);
  }, [months, nextKey, cur]);
  useEffect(() => { jolpicaSchedule(YEAR - 1).catch(() => {}); winnersByRound(YEAR - 1).catch(() => {}); }, []); // warm the cache so last season opens quickly
  const did = useRef(null);
  useEffect(() => { if (cur && races?.length && did.current !== nextKey) { did.current = nextKey; const t = setTimeout(() => scroller.current?.scrollTo({ y: target, animated: false }), 60); return () => clearTimeout(t); } }, [races, target, cur, nextKey]);
  useEffect(() => { // track maps: next race first, then outward
    if (!cur || !races) return; const ni = Math.max(0, races.findIndex((r) => r.meeting_key === nextKey));
    wantOutlines([...races].sort((a, b) => Math.abs(races.indexOf(a) - ni) - Math.abs(races.indexOf(b) - ni)).map((r) => r.circuit_key));
  }, [races, cur, nextKey]);
  if (cur && season.status !== 'ready') return <Screen scrollRef={scroller}><Skeleton /></Screen>;
  const w = win.v || {};
  // The weekend in progress is marked as such; the next race is marked only once that weekend is over.
  const upKey = cur ? (races || []).find((r) => Date.parse(r.date_end) >= now && Date.parse(r.date_start) > now)?.meeting_key : null;
  return (
    <Screen scrollRef={scroller}>
      <SeasonSwitch year={year} onChange={setYear} max={YEAR + 1} />
      {!cur && past.loading && <Skeleton rows={5} />}
      {!cur && past.error && <ErrorNote error={past.error} onRetry={past.reload} />}
      {months.map((g) => (
        <View key={g.k} style={{ gap: INNER }}>
          <Text style={s.month}>{g.k}</Text>
          {g.items.map((r) => {
            const done = cur ? Date.parse(r.date_end) < now : true, live = cur && !done && Date.parse(r.date_start) <= now;
            const isNext = cur && !live && !done && r.meeting_key === upKey;
            const wn = w[Number(r.round)], wcol = done && wn?.teamId ? tc(wn.teamId) : null, pts = cur ? outlineFor(r.circuit_key) : null;
            const body = (<>
              <View style={[s.rn, (isNext || live) && { backgroundColor: alpha(colors.accent, 0.3) }, wcol && { backgroundColor: alpha(wcol, 0.34) }]}><Text style={[s.rb, (isNext || live) && { color: colors.fg }]}>{`R${r.round}`}</Text></View>
              <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.nm} numberOfLines={1}>{flag(r.country_code)} {shortName(r.meeting_name)}</Text>{r.has_sprint ? <SprintBadge /> : null}</View>
                <Text style={s.sub} numberOfLines={1}>{`${shortRange(r)} · ${placeLine(r)}`}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
                {!cur ? (wn ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="trophy" size={13} color={colors.gold} /><Text style={[s.sub, { color: colors.gold, fontWeight: '700' }]}>{wn.last}</Text></View> : null)
                  : done ? <Ionicons name="checkmark-circle" size={20} color={colors.good} /> : live ? <Pill color={colors.good}>Live</Pill> : isNext ? <Pill color={colors.accent}>Next</Pill> : <Text style={s.sub}>{`In ${Math.max(daysUntil(r.date_end), 0)} d`}</Text>}
              </View>
            </>);
            const map = pts ? (
              <View pointerEvents="none" style={s.map}>
                <TrackMap pts={pts} width={150} height={CARD - 12} stroke={2.2} opacity={0.5} fade />
              </View>) : null;
            const card = wcol
              ? <Grad color={wcol} from={0.42} to={0.05} dir="h" radius={16} border={0.4} style={s.card}>{map}{body}</Grad>
              : <View style={[s.card, s.plain, isNext && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, live && { borderColor: colors.good, backgroundColor: alpha(colors.good, 0.12) }]}>{map}{body}</View>;
            if (!cur) return <View key={r.meeting_key}>{card}</View>;
            return <Press key={r.meeting_key} scale={0.98} onPress={() => navigation.navigate('Round', { meeting: r })}>{card}</Press>;
          })}
        </View>))}
    </Screen>
  );
}
const s = StyleSheet.create({
  month: { color: colors.muted, fontFamily: 'label', fontSize: 12, lineHeight: LABEL, letterSpacing: 2.6, fontWeight: '600' },
  card: { height: CARD, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  plain: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  map: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 150, alignItems: 'flex-end', justifyContent: 'center' },
  rn: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }, rb: { color: colors.fg, fontSize: 17, fontWeight: '800' },
  nm: { color: colors.fg, fontSize: 18, fontWeight: '700', flexShrink: 1 }, sub: { color: colors.muted, fontSize: 14 },
});
