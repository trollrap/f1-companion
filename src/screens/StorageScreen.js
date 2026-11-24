import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { Alert } from '../lib/dialog';
import { colors } from '../theme';

// Groups of stored keys. `clear` = safe to delete (it is rebuilt or only a record); the others are listed for information.
const GROUPS = [
  { id: 'cache', name: 'Downloaded data', note: 'Race, standings and driver data kept for offline use. It downloads again when needed.', test: (k) => k.startsWith('c:'), clear: true },
  { id: 'games', name: 'Saved games', note: 'Unfinished games waiting to be resumed.', test: (k) => k.startsWith('game:'), clear: true },
  { id: 'logs', name: 'Alert and check logs', note: 'The alerts inbox and news check records.', test: (k) => ['alertInbox', 'newsLog', 'bgRuns'].includes(k), clear: true },
  { id: 'fantasy', name: 'Fantasy seasons', note: 'Your fantasy saves. Not cleared here.', test: (k) => k.startsWith('fun:'), clear: false },
  { id: 'other', name: 'Settings, favourites and everything else', note: 'Not cleared here (use Backup in Settings to export it).', test: () => true, clear: false },
];
const fmt = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default function StorageScreen() {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    try { const keys = await AsyncStorage.getAllKeys(); const pairs = await AsyncStorage.multiGet(keys); const out = GROUPS.map((g) => ({ ...g, keys: [], bytes: 0 }));
      pairs.forEach(([k, v]) => { const g = out.find((x) => x.test(k)); g.keys.push(k); g.bytes += (k.length + (v ? v.length : 0)) * 2; }); setRows(out);
    } catch { setRows([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const wipe = (g) => Alert.alert(`Clear ${g.name.toLowerCase()}?`, g.id === 'games' ? 'Unfinished games will start again from the beginning.' : 'This only frees space. Nothing you made is lost.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: async () => { try { await AsyncStorage.multiRemove(g.keys); } catch {} load(); } }]);
  const total = (rows || []).reduce((n, g) => n + g.bytes, 0);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Storage</Eyebrow><Note>What the app keeps on this phone. The built-in F1 history ships with the app and is not part of this.</Note>{rows ? <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', marginTop: 6 }}>{fmt(total)}</Text> : null}</Card>
      {(rows || []).map((g) => (
        <Card key={g.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16, flex: 1 }}>{g.name}</Text><Text style={{ color: colors.accentText, fontWeight: '800' }}>{fmt(g.bytes)}</Text></View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{`${g.note} (${g.keys.length} item${g.keys.length === 1 ? '' : 's'})`}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 8, overflow: 'hidden' }}><View style={{ width: `${Math.max(2, Math.round((g.bytes / Math.max(1, total)) * 100))}%`, height: 6, borderRadius: 3, backgroundColor: g.clear ? colors.accent : colors.muted }} /></View>
          {g.clear && g.keys.length ? <View style={{ marginTop: 8 }}><Btn icon="trash-outline" onPress={() => wipe(g)}>Clear</Btn></View> : null}
        </Card>))}
    </Screen>);
}
