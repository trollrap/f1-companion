import { up } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Countdown, NotifPrefs, Segmented, CircuitBox } from '../components/Shared';
import Timeline from '../components/Timeline';
import TrackMap from '../components/TrackMap';
import { useOutline } from '../lib/outlines';
import { circuitFor } from '../data/circuits';
import { shareMeeting } from '../lib/ics';
import { Alert } from '../lib/dialog';
import { useSeason } from '../hooks/useSeason';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeekendResults from '../components/WeekendResults';
import RacePreview from '../components/RacePreview';
import Grad from '../components/Grad';
import { SprintBadge } from '../components/Badge';
import { useNow } from '../hooks/useSeason';
import { usePrefs } from '../hooks/usePrefs';
import { sessionsOf } from '../api/season';
import { plannedAlerts } from '../lib/notifications';
import { targetOf } from './HomeScreen';
import { colors } from '../theme';
import { placeLine, parseOffset, hm, dayName, dateRange, shortName, flag } from '../lib/time';

export default function RaceDetailScreen({ route, navigation }) {
  const { meeting } = route.params; const now = useNow(); const { prefs, setOpt } = usePrefs();
  const [sessions, setSessions] = useState([]); const [picked, setPicked] = useState(null); const [mode, setMode] = useState(prefs.opts.trackTime ? 'track' : 'device');
  const track = parseOffset(meeting.gmt_offset), off = mode === 'track' ? track : null;
  useEffect(() => { sessionsOf(meeting).then(setSessions).catch(() => {}); }, [meeting.meeting_key]);
  const outline = useOutline(meeting.circuit_key); const circ = circuitFor(meeting); const season = useSeason();
  useEffect(() => { navigation.setOptions({ title: `ROUND ${meeting.round} OF ${season.total || ''}`.trim() }); }, [season.total]);
  const t = sessions.length ? targetOf(meeting, sessions, now) : null;
  const done = sessions.filter((x) => Date.parse(x.date_end) < now); const shown = (picked && done.find((x) => x.session_name === picked)) || done.at(-1);
  const full = (x) => navigation.navigate('Round', { meeting: { ...meeting, year: meeting.year || new Date().getFullYear() }, session: x.session_name });
  const raceDone = sessions.some((x) => /^race$/i.test(x.session_name) && Date.parse(x.date_end) < now); // no lap chart before the race has been run
  const nextAlert = plannedAlerts(sessions, prefs, now)[0];
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.02} radius={28} border={0.4} style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.gp} numberOfLines={3}>{meeting.meeting_name}</Text>
          {meeting.has_sprint ? <View style={{ alignSelf: 'flex-start', marginTop: 6 }}><SprintBadge /></View> : null}
          <Text style={[s.meta, { fontSize: 13, marginTop: 6 }]} numberOfLines={3}>{[circ ? circ.name : meeting.circuit_short_name, circ ? `${circ.stats[2][1]} laps` : null, circ ? circ.stats[0][1] : null].filter(Boolean).join(' · ')}</Text>
          <Text style={[s.meta, { fontSize: 13 }]}>{`${flag(meeting.country_code)} ${placeLine(meeting)} · ${dateRange(meeting)}`}</Text>
        </View>
        {outline ? <View style={{ width: 120, height: 110, alignItems: 'center', justifyContent: 'center' }}><TrackMap pts={outline} width={120} height={104} stroke={2.4} /></View> : null}
      </Grad>
      <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>Weekend timeline</Text>
      {track != null && <Segmented value={mode} onChange={(m) => { setMode(m); setOpt('trackTime', m === 'track'); }} items={[['device', 'My time'], ['track', 'Track time']]} />}
      {sessions.length ? <Timeline sessions={sessions} now={now} off={off} onOpen={(x) => (Date.parse(x.date_end) < now ? setPicked(x.session_name) : full(x))} selected={shown?.session_name} /> : <Note>Session times appear here once the weekend is published.</Note>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['Add to calendar', 'calendar-outline', () => shareMeeting(meeting, sessions).catch((e) => Alert.alert('Could not make the calendar', String(e?.message || e)))], ['Lap chart', 'git-branch-outline', () => navigation.navigate('LapChart', { year: meeting.year || new Date().getFullYear(), round: Number(meeting.round) })], ['Alerts', 'notifications-outline', () => navigation.navigate('AlertsInbox')]].filter(([l]) => l !== 'Lap chart' || raceDone).map(([l, ic, fn]) => (
          <Pressable key={l} onPress={fn} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.8 }]}>
            <Ionicons name={ic} size={17} color={colors.accentText} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{l}</Text>
          </Pressable>))}
      </View>
      {shown ? <WeekendResults meeting={meeting} session={shown} onFull={() => full(shown)} /> : null}
      <Card>
        <NotifPrefs />
        <Note>{nextAlert ? `Next alert: ${nextAlert.session.session_name} at ${hm(nextAlert.at, off)}, ${dayName(nextAlert.at, off)}.` : 'Tap the bell on a session to be notified.'}</Note>
      </Card>
      <CircuitBox meeting={meeting} />
      <RacePreview name={meeting.meeting_name} />
    </Screen>
  );
}
const s = StyleSheet.create({ gp: { color: colors.fg, fontSize: 28, fontWeight: '800', lineHeight: 31, flexShrink: 1 }, meta: { color: colors.onSoft, fontSize: 16 } });
