import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card, Eyebrow } from './Screen';
import { Btn } from './FunBits';
import { colors } from '../theme';
import { kvGet, kvSet } from '../lib/kv';
import { exportBackup } from '../lib/backup';
import { usePrefs } from '../hooks/usePrefs';

const WEEK = 7 * 864e5, SNOOZE = 2 * 864e5;
// A reminder card at the top of Home when the last backup is more than a week old (counted from the first time the app saw this check, if there was never one).
export default function BackupNudge() {
  const { prefs } = usePrefs(); const [state, setState] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => { let off = false; (async () => {
    let since = await kvGet('backup:since', 0); if (!since) { since = Date.now(); await kvSet('backup:since', since); }
    const last = await kvGet('backup:last', 0); const snooze = await kvGet('backup:snooze', 0);
    const ref = Math.max(last, since); if (!off) setState(Date.now() - ref >= WEEK && Date.now() > snooze ? { last } : false);
  })().catch(() => {}); return () => { off = true; }; }, []);
  if (prefs.opts.backupNudge === false || !state) return null;
  const days = state.last ? Math.floor((Date.now() - state.last) / 864e5) : 0;
  const go = async () => { setMsg('Making the backup…'); try { const r = await exportBackup(); setMsg(String(r)); setTimeout(() => setState(false), 2500); } catch (e) { setMsg(String((e && e.message) || e)); } };
  return (
    <Card>
      <Eyebrow>Back up your saves</Eyebrow>
      <Text style={{ color: colors.fg, fontSize: 15 }}>{state.last ? `Your last backup was ${days} days ago.` : 'You have not made a backup yet.'} It keeps your fantasy seasons, favourites and settings safe if you change phone.</Text>
      {msg ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>{msg}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}><Btn tone="solid" icon="download-outline" onPress={go}>Back up now</Btn></View>
        <View style={{ flex: 1 }}><Btn onPress={() => { kvSet('backup:snooze', Date.now() + SNOOZE); setState(false); }}>Later</Btn></View>
      </View>
    </Card>);
}
