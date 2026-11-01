import React, { useState } from 'react';
import { View, Switch, Pressable, StyleSheet, Linking, LayoutAnimation, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import { NotifPrefs } from '../components/Shared';
import Dropdown from '../components/Dropdown';
import { usePrefs, SESSION_TYPES, OPTS } from '../hooks/usePrefs';
import { runDiagnostics } from '../lib/diagnostics';
import { sendTestNotification, notificationsAvailable } from '../lib/notifications';
import { checkResults } from '../lib/resultAlerts';
import { checkUpdate, currentVersion, updatesConfigured } from '../lib/update';
import { clearCache } from '../lib/cache';
import Reveal from '../components/Reveal';
import { colors } from '../theme';

const Btn = ({ children, onPress, disabled }) => (
  <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, (pressed || disabled) && { opacity: 0.6 }]}><Text style={s.btnText}>{children}</Text></Pressable>
);
const Sw = ({ label, hint, value, onChange }) => (
  <View style={s.row}><View style={{ flex: 1, paddingRight: 12 }}><Text style={s.label}>{label}</Text>{hint ? <Text style={s.hint}>{hint}</Text> : null}</View>
    <Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" /></View>
);
// One collapsed row per group of options; tap to unfold.
function Section({ icon, title, summary, children, start = false }) {
  const [open, setOpen] = useState(start); const rot = React.useRef(new Animated.Value(start ? 1 : 0)).current;
  const flip = () => { LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')); Animated.timing(rot, { toValue: open ? 0 : 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); setOpen(!open); };
  return (
    <View style={s.sec}>
      <LinearGradient pointerEvents="none" colors={['#2A1318', '#160C0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Pressable onPress={flip} style={({ pressed }) => [s.secHead, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={s.ico}><Ionicons name={icon} size={20} color={colors.accent} /></View>
        <View style={{ flex: 1 }}><Text style={s.secTitle}>{title}</Text>{summary ? <Text style={s.hint} numberOfLines={1}>{summary}</Text> : null}</View>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={20} color={colors.muted} /></Animated.View>
      </Pressable>
      {open ? <Reveal><View style={s.secBody}>{children}</View></Reveal> : null}
    </View>
  );
}
const GAPS = [['leader', 'To the leader'], ['ahead', 'To the car ahead']];
export default function SettingsScreen() {
  const { prefs, toggle, toggleResults, setOpt } = usePrefs(); const o = prefs.opts;
  const [results, setResults] = useState([]); const [running, setRunning] = useState(false); const [msg, setMsg] = useState(''); const [upd, setUpd] = useState('');
  const check = async () => { setResults([]); setRunning(true); try { await runDiagnostics((r) => setResults((x) => [...x, r])); } finally { setRunning(false); } };
  const on = SESSION_TYPES.filter((t) => prefs.types[t]).length;
  return (
    <Screen header={false}>
      <Section icon="notifications-outline" title="Notifications" summary={`${on} sessions · ${prefs.results ? 'results on' : 'results off'}`}>
        {!notificationsAvailable() && <Note>Alerts only work in the installed app, not in Expo Go.</Note>}
        {SESSION_TYPES.map((t) => <Sw key={t} label={t} value={prefs.types[t]} onChange={() => toggle(t)} />)}
        <View style={{ marginTop: 10 }}><NotifPrefs title="Remind me before" /></View>
        <Sw label="Session results" hint="A notification once a qualifying, sprint or race result is published. Android can be minutes late." value={prefs.results} onChange={toggleResults} />
        <Btn onPress={async () => { const n = await checkResults({ force: true }); setMsg(n ? `Sent ${n} result alert${n > 1 ? 's' : ''}.` : 'No new results to send right now.'); }}>Check for results now</Btn>
        <Btn onPress={async () => { const r = await sendTestNotification(); setMsg(r === 'ok' ? 'A test alert arrives in 5 seconds.' : r === 'denied' ? 'Notifications are not allowed for this app. Enable them in system settings.' : 'Alerts only work in the installed app.'); }}>Send a test alert</Btn>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Section icon="options-outline" title="Display" summary={`${o.clock24 ? '24-hour' : '12-hour'} clock · gaps ${GAPS.find(([k]) => k === o.gap)[1].toLowerCase()}`}>
        <Sw label="24-hour clock" value={o.clock24} onChange={(v) => setOpt('clock24', v)} />
        <Sw label="Start race pages in track time" hint="Otherwise they open in your device's time." value={o.trackTime} onChange={(v) => setOpt('trackTime', v)} />
        <Sw label="Team principal on Paddock cards" value={o.padPrincipal !== false} onChange={(v) => setOpt('padPrincipal', v)} />
        <Sw label="Driver position and points on Paddock cards" value={o.padStats !== false} onChange={(v) => setOpt('padStats', v)} />
        <Text style={[s.label, { marginTop: 12, marginBottom: 8 }]}>Default gap style</Text>
        <Dropdown value={o.gap} options={GAPS} onChange={(v) => setOpt('gap', v)} />
      </Section>
      <Section icon="speedometer-outline" title="Performance" summary={`photos ${o.photos ? 'on' : 'off'} · motion ${o.reduceMotion ? 'reduced' : 'full'}`}>
        <Sw label="Driver photos in lists" hint="Turn off if lists feel slow on this phone." value={o.photos} onChange={(v) => setOpt('photos', v)} />
        <Sw label="Reduce motion" hint="Fewer animations." value={o.reduceMotion} onChange={(v) => setOpt('reduceMotion', v)} />
        <Btn onPress={async () => setMsg(`Cleared ${await clearCache()} cached responses.`)}>Clear cached data</Btn>
      </Section>
      <Section icon="cloud-download-outline" title="App updates" summary={`Installed ${currentVersion()}`}>
        <Note>{updatesConfigured() ? 'Checks GitHub for a newer release.' : 'Not set up: add your GitHub repository in src/config.js.'}</Note>
        {updatesConfigured() ? <Btn onPress={async () => { setUpd('Checking…'); const r = await checkUpdate(true); setUpd(r.status === 'available' ? `Version ${r.version} is available.` : r.status === 'current' ? 'You have the latest version.' : r.status === 'none' ? 'No release has been published on GitHub yet, so there is nothing to update to.' : r.status === 'error' ? `Could not check: ${r.error}` : ''); if (r.status === 'available') Linking.openURL(r.url).catch(() => {}); }}>Check for updates</Btn> : null}
        {upd ? <Note>{upd}</Note> : null}
      </Section>
      <Section icon="pulse-outline" title="Data check" summary="Test every service from this phone">
        <Btn onPress={check} disabled={running}>{running ? 'Checking…' : 'Check data sources'}</Btn>
        {results.map((r) => (
          <View key={r.name} style={s.res}>
            <Text style={[s.mark, { color: r.ok ? colors.good : colors.accent }]}>{r.ok ? '✓' : '✗'}</Text>
            <View style={{ flex: 1 }}><Text style={s.label}>{r.name}</Text><Text style={s.hint}>{r.detail} · {r.ms} ms</Text></View>
          </View>))}
      </Section>
      <Section icon="refresh-outline" title="Reset" summary="Back to the default settings">
        <Btn onPress={() => { Object.entries(OPTS).forEach(([k, v]) => setOpt(k, v)); setMsg('Display and performance settings were reset.'); }}>Reset display settings</Btn>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.ico}><Ionicons name="information-circle-outline" size={22} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={s.secTitle}>About</Text><Text style={s.hint}>{`F1 Companion v${currentVersion()}`}</Text></View>
        </View>
        <View style={s.bubble}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>👋 Hi from trollrap!</Text><Text style={s.hint}>Every bug you find is a hidden feature. Probably.</Text></View>
        <Text style={[s.hint, { marginTop: 10 }]}>Times follow your device's timezone unless a screen is switched to track time.</Text>
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  sec: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, secBody: { paddingHorizontal: 14, paddingBottom: 14 },
  ico: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  secTitle: { color: colors.fg, fontSize: 19, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  label: { color: colors.fg, fontSize: 17, fontWeight: '600' }, hint: { color: colors.muted, fontSize: 14 },
  btn: { marginTop: 12, backgroundColor: colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line }, btnText: { color: colors.fg, fontWeight: '700', fontSize: 16 },
  res: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, mark: { width: 20, fontSize: 18, fontWeight: '800' },
  bubble: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(240,20,30,0.35)', gap: 2 },
});
