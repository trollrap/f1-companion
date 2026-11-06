import React, { useEffect, useState } from 'react';
import { Pressable, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import Grad from './Grad';
import { checkUpdate, installUpdate, canInstallInApp, cleanupUpdates } from '../lib/update';
import { checkOta, applyOta } from '../lib/ota';
import { colors } from '../theme';
// Shown at the top of Home when a newer release exists.
export default function UpdateBanner() {
  const [ota, setOta] = useState(false); const [u, setU] = useState(null); const [pct, setPct] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { cleanupUpdates(); checkOta().then((r) => setOta(r.status === 'ready')).catch(() => {}); checkUpdate(false).then(setU).catch(() => {}); }, []);
  const go = async () => {
    if (pct != null) return;
    if (!canInstallInApp() || !/\.apk$/i.test(u.url)) { Linking.openURL(u.url).catch(() => {}); return; }
    setErr(''); setPct(0); const r = await installUpdate(u, setPct); setPct(null);
    if (!r.ok) { setErr(r.error); Linking.openURL(u.url).catch(() => {}); }
  };
  if (ota) return (
    <Pressable onPress={() => applyOta()} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Grad color={colors.good} from={0.3} to={0.04} border={0.5} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="flash-outline" size={24} color={colors.fg} />
        <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '700' }}>Update downloaded. Tap to restart and use it.</Text>
      </Grad>
    </Pressable>);
  if (u?.status !== 'available') return null;
  return (
    <Pressable onPress={go} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Grad color={colors.good} from={0.3} to={0.04} border={0.5} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="cloud-download-outline" size={24} color={colors.fg} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{pct != null ? `Downloading ${u.version}… ${Math.round(pct * 100)}%` : `Update ${u.version} is ready. Tap to install.`}</Text>{pct != null ? <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 8, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.round(pct * 100)}%`, backgroundColor: colors.fg }} /></View> : err ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{`Could not install here (${err}). Opening the download instead.`}</Text> : null}</View>
      </Grad>
    </Pressable>
  );
}
