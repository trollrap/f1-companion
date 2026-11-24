import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import { colors } from '../theme';
import { readInbox, clearInbox, upcomingAlerts } from '../lib/inbox';

const when = (t) => new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export default function AlertsInboxScreen() {
  const [log, setLog] = useState(null); const [up, setUp] = useState([]);
  const load = useCallback(() => { readInbox().then(setLog); upcomingAlerts().then(setUp); }, []);
  useFocusEffect(load);
  return (
    <Screen header={false}>
      <StatHeader title="Alerts inbox" icon="notifications" note={`What the app sent you recently, and what is queued. Result and news alerts are logged when they are shown. Session reminders are handed to Android in advance, so they appear under "Coming up".`} />
      <Eyebrow>Sent</Eyebrow>
      {log && !log.length ? <Note>Nothing sent yet. If you expected news or result alerts, open Settings > News alerts to see what the checks did.</Note> : null}
      {(log || []).map((x, i) => (
        <Reveal key={`${x.t}${i}`} index={Math.min(i, 6)}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: x.status === 'sent' ? colors.good : colors.gold }}>
            <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{x.title}</Text>
            {x.body ? <Text style={{ color: colors.fg, fontSize: 15 }}>{x.body}</Text> : null}
            <Text style={{ color: x.status === 'sent' ? colors.muted : colors.warn || colors.gold, fontSize: 13, marginTop: 3 }}>{`${when(x.t)} · ${x.status}`}</Text>
          </Card>
        </Reveal>))}
      {log && log.length ? <Btn icon="trash-outline" onPress={() => clearInbox().then(load)}>Clear the list</Btn> : null}
      <Eyebrow>Coming up</Eyebrow>
      {!up.length ? <Note>No reminders are scheduled with Android right now (or this build cannot list them).</Note> : up.slice(0, 25).map((x) => (
        <Card key={x.id}><Text style={{ color: colors.fg, fontWeight: '600' }}>{x.title}</Text>{x.body ? <Text style={{ color: colors.muted, fontSize: 14 }}>{x.body}</Text> : null}<Text style={{ color: colors.accentText, fontSize: 13, marginTop: 3 }}>{when(x.at)}</Text></Card>))}
    </Screen>);
}
