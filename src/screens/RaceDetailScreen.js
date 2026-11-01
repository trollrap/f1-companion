import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Countdown, NotifPrefs, Segmented, CircuitBox } from '../components/Shared';
import Schedule from '../components/Schedule';
import Grad from '../components/Grad';
import { SprintBadge } from '../components/Badge';
import { useNow } from '../hooks/useSeason';
import { usePrefs } from '../hooks/usePrefs';
import { sessionsOf } from '../api/season';
import { plannedAlerts } from '../lib/notifications';
import { targetOf } from './HomeScreen';
import { colors } from '../theme';
import { placeLine, parseOffset, hm, dayName, dateRange, shortName, flag } from '../lib/time';

export default function RaceDetailScreen({ route }) {
  const { meeting } = route.params; const now = useNow(); const { prefs } = usePrefs();
  const [sessions, setSessions] = useState([]); const [mode, setMode] = useState(prefs.opts.trackTime ? 'track' : 'device');
  const track = parseOffset(meeting.gmt_offset), off = mode === 'track' ? track : null;
  useEffect(() => { sessionsOf(meeting).then(setSessions).catch(() => {}); }, [meeting.meeting_key]);
  const t = sessions.length ? targetOf(meeting, sessions, now) : null;
  const nextAlert = plannedAlerts(sessions, prefs, now)[0];
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.34} to={0.04} border={0.45} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 30 }}>{flag(meeting.country_code)}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.gp} numberOfLines={1}>{shortName(meeting.meeting_name)}</Text>{meeting.has_sprint ? <SprintBadge /> : null}</View>
            <Text style={s.meta}>{placeLine(meeting)}</Text><Text style={s.meta}>{dateRange(meeting)}</Text>
          </View>
        </View>
        {t && (<><Text style={[s.meta, { marginTop: 12, letterSpacing: 2, fontSize: 11 }]}>{t.label.toUpperCase()}</Text><Countdown ms={t.target - now} large /></>)}
      </Grad>
      <Card>
        <Eyebrow>Weekend schedule</Eyebrow>
        {track != null && <View style={{ marginTop: 12 }}><Segmented value={mode} onChange={setMode} items={[['device', 'My time'], ['track', 'Track time']]} /></View>}
        {sessions.length ? <Schedule sessions={sessions} now={now} off={off} /> : <Note>Session times appear here once they are published.</Note>}
      </Card>
      <Card>
        <NotifPrefs />
        <Note>{nextAlert ? `Next alert: ${nextAlert.session.session_name} at ${hm(nextAlert.at, off)}, ${dayName(nextAlert.at, off)}.` : 'Tap the bell on a session to be notified.'}</Note>
      </Card>
      <CircuitBox meeting={meeting} />
    </Screen>
  );
}
const s = StyleSheet.create({ gp: { color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }, meta: { color: colors.muted, fontSize: 16 } });
