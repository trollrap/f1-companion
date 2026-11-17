import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors } from '../theme';
import { readCrashes, clearCrashes } from '../lib/crashlog';
import { currentVersion } from '../lib/update';

export default function CrashLogScreen() {
  const [l, setL] = useState(null);
  useEffect(() => { readCrashes().then(setL); }, []);
  if (!l) return <Screen header={false}><Note>Loading…</Note></Screen>;
  const all = `F1 Companion ${currentVersion()}\n\n${l.map((x) => `${new Date(x.t).toISOString()} [${x.where}]\n${x.msg}`).join('\n\n')}`;
  return (
    <Screen header={false}>
      <Card><Eyebrow>Crash log</Eyebrow><Note>Errors the app caught on this phone, newest first. Send the text to get a problem fixed. Freezes and sessions that ended without closing properly are listed too, with the screen that was open.</Note></Card>
      {l.length ? <Btn tone="solid" icon="share-outline" onPress={() => { Share.share({ message: all }).catch(() => {}); }}>Share the log</Btn> : <Note>No crashes recorded.</Note>}
      {l.map((x, i) => (<Card key={i}><Text style={{ color: colors.muted, fontSize: 12 }}>{`${new Date(x.t).toLocaleString()} · ${x.where}`}</Text><Text style={{ color: colors.fg, fontSize: 12, marginTop: 4 }} numberOfLines={14}>{x.msg}</Text></Card>))}
      {l.length ? <Btn onPress={() => { clearCrashes(); setL([]); }}>Clear the log</Btn> : null}
    </Screen>);
}
