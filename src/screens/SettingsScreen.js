import React, { useState, useRef } from 'react';
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
import { SOURCES } from '../api/news';
import { checkNews } from '../lib/newsAlerts';
import { ensurePermission } from '../lib/notifications';
import { checkOta, applyOta } from '../lib/ota';
import { checkUpdate, currentVersion, updatesConfigured, installUpdate, canInstallInApp } from '../lib/update';
import { clearCache } from '../lib/cache';
import Reveal from '../components/Reveal';
import ColorPicker from '../components/ColorPicker';
import { restartApp } from '../lib/reload';
import { homeLayout, HOME_CARDS } from '../lib/homeLayout';
import { PAGES } from '../lib/pages';
import { hideAll } from '../lib/spoiler';
import { Segmented } from '../components/Shared';
import { exportBackup, findBackups, restoreFrom } from '../lib/backup';
import { Alert } from '../lib/dialog';
import CodePrompt from '../components/CodePrompt';
import { useNavigation } from '@react-navigation/native';
import { colors, alpha, teamColors } from '../theme';

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
      <LinearGradient pointerEvents="none" colors={[colors.cardA, colors.cardB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Pressable onPress={flip} style={({ pressed }) => [s.secHead, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={s.ico}><Ionicons name={icon} size={20} color={colors.accent} /></View>
        <View style={{ flex: 1 }}><Text style={s.secTitle}>{title}</Text>{summary ? <Text style={s.hint} numberOfLines={1}>{summary}</Text> : null}</View>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={20} color={colors.muted} /></Animated.View>
      </Pressable>
      {open ? <Reveal><View style={s.secBody}>{children}</View></Reveal> : null}
    </View>
  );
}
const SWATCHES = ['#F0141E', '#FF6A00', '#F5C400', '#22C55E', '#14B8A6', '#2D8CFF', '#7C5CFF', '#FF2D87', '#E5E7EB'];
const GAPS = [['leader', 'To the leader'], ['ahead', 'Interval (to the car ahead)']];
const HOURS = Array.from({ length: 24 }, (_, h) => { const t = `${String(h).padStart(2, '0')}:00`; return [t, t]; });
const TEAM_NAMES = { red_bull: 'Red Bull', rb: 'Racing Bulls', aston_martin: 'Aston Martin', alpine: 'Alpine', haas: 'Haas', mclaren: 'McLaren', mercedes: 'Mercedes', ferrari: 'Ferrari', williams: 'Williams', sauber: 'Sauber', audi: 'Audi', cadillac: 'Cadillac' };
export default function SettingsScreen() {
  const { prefs, toggle, toggleResults, setOpt, setOpts } = usePrefs(); const o = prefs.opts;
  const [results, setResults] = useState([]); const [running, setRunning] = useState(false); const [msg, setMsg] = useState(''); const [upd, setUpd] = useState('');
  const [msgT, setMsgT] = useState(''); const [bk, setBk] = useState('');
  // Secret: five quick taps on About, then the code, open the developer menu.
  const nav = useNavigation(); const taps = useRef({ n: 0, t: 0 }); const [codeOpen, setCodeOpen] = useState(false);
  const aboutTap = () => { const now = Date.now(); const k = taps.current; k.n = now - k.t < 1500 ? k.n + 1 : 1; k.t = now; if (k.n >= 5) { k.n = 0; setCodeOpen(true); } };
  const check = async () => { setResults([]); setRunning(true); try { await runDiagnostics((r) => setResults((x) => [...x, r])); } finally { setRunning(false); } };
  const on = SESSION_TYPES.filter((t) => prefs.types[t]).length;
  const [pickC, setPickC] = useState(o.accent || colors.accent); const [custom, setCustom] = useState(false);
  const applyColour = async (hex) => { setMsg('Saving the colour…'); await setOpt('accent', hex).catch(() => {}); setMsg('Colour saved. The app restarts to use it everywhere. If it does not, close it completely and open it again.'); setTimeout(async () => { const r = await restartApp(); if (!r) setMsg('Colour saved. Close the app completely (swipe it away) and open it again to see it everywhere.'); }, 900); };
  return (
    <Screen header={false}>
      <Section icon="language-outline" title="Language" summary={o.lang === 'el' ? 'Ελληνικά · Beta' : 'English'}>
        {[['en', 'English', null], ['el', 'Ελληνικά', 'BETA']].map(([k, label, tag]) => {
          const on = (o.lang === 'el' ? 'el' : 'en') === k;
          return (
            <Pressable key={k} onPress={() => setOpt('lang', k)} style={({ pressed }) => [s.row, { paddingVertical: 12 }, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[s.label, on && { color: colors.fg, fontWeight: '700' }]}>{label}</Text>
                {tag ? <View style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: colors.accent, fontFamily: 'label', fontWeight: '700', fontSize: 10, letterSpacing: 1.2 }}>{tag}</Text></View> : null}
              </View>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.accent : colors.muted} />
            </Pressable>);
        })}
        <Note>Names of drivers, teams and team principals stay as they are.</Note>
        {o.lang === 'el' ? <Note>The Greek translation is in beta. Some texts may still appear in English.</Note> : null}
      </Section>
      <Section icon="reorder-three-outline" title="Home layout" summary="Reorder or hide the cards on Home">
        {homeLayout(o.homeLayout).map((x, i, arr) => { const label = (HOME_CARDS.find(([k]) => k === x.k) || [])[1]; const move = (d) => { const n = [...arr]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity')); setOpt('homeLayout', n); };
          return (<View key={x.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
            <Switch value={x.on} onValueChange={(v) => setOpt('homeLayout', arr.map((y) => (y.k === x.k ? { ...y, on: v } : y)))} trackColor={{ true: colors.accent }} />
            <Text style={{ color: x.on ? colors.fg : colors.muted, fontSize: 17, flex: 1 }}>{label}</Text>
            <Pressable onPress={() => move(-1)} hitSlop={8} style={{ padding: 8, opacity: i === 0 ? 0.3 : 1 }}><Ionicons name="chevron-up" size={22} color={colors.fg} /></Pressable>
            <Pressable onPress={() => move(1)} hitSlop={8} style={{ padding: 8, opacity: i === arr.length - 1 ? 0.3 : 1 }}><Ionicons name="chevron-down" size={22} color={colors.fg} /></Pressable>
          </View>); })}
        <Btn onPress={() => setOpt('homeLayout', null)}>Reset the order</Btn>
      </Section>
      <Section icon="eye-off-outline" title="Spoiler guard" summary={o.spoiler ? 'On' : 'Off'}>
        <Sw label="Hide results until tapped" hint="For watching races on delay. Hides Home results, the race recap, standings, race results and calendar winners until you tap them. Live timing is not hidden. Taps are forgotten when the app closes." value={!!o.spoiler} onChange={(v) => { setOpt('spoiler', v); hideAll(); }} />
        {o.spoiler ? <Btn onPress={hideAll}>Hide everything again</Btn> : null}
      </Section>
      <Section icon="person-outline" title="Driver names" summary={{ full: 'First and last', surname: 'Surname only', code: 'Three-letter code' }[o.nameStyle || 'full']}>
        <Segmented value={o.nameStyle || 'full'} onChange={(v) => setOpt('nameStyle', v)} items={[['full', 'Full'], ['surname', 'Surname'], ['code', 'Code']]} />
        <Note>Applies to the driver rows in standings, results, Home and Paddock lists. Some screens (headings, quizzes, charts) always use full names. Codes come from the history, and fall back to the first three letters of the surname for brand-new drivers.</Note>
      </Section>
      <Section icon="pin-outline" title="Pinned pages" summary={`${(o.pins || []).length} pinned`}>
        <Note>Pinned pages get a shortcut strip at the top of Home. Up to 8.</Note>
        {PAGES.map(([route, title]) => { const on = (o.pins || []).includes(route); return (
          <View key={route} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <Switch value={on} onValueChange={(v) => { const cur = o.pins || []; if (v && cur.length >= 8) return; setOpt('pins', v ? [...cur, route] : cur.filter((x) => x !== route)); }} trackColor={{ true: colors.accent }} />
            <Text style={{ color: on ? colors.fg : colors.muted, fontSize: 16, flex: 1 }}>{title}</Text>
          </View>); })}
        {(o.pins || []).length ? <Btn onPress={() => setOpt('pins', [])}>Unpin all</Btn> : null}
      </Section>
      <Section icon="text-outline" title="Font and text size" summary={`${o.font === 'system' ? 'Phone font' : 'App font'} · ${Math.round((Number(o.textScale) || 1) * 100)}%`}>
        <Segmented value={o.font === 'system' ? 'system' : 'default'} onChange={(v) => setOpt('font', v)} items={[['default', 'App font'], ['system', 'Phone font']]} />
        <Segmented value={String(Number(o.textScale) || 1)} onChange={(v) => setOpt('textScale', Number(v))} items={[['0.9', 'S'], ['1', 'M'], ['1.1', 'L'], ['1.2', 'XL'], ['1.3', 'XXL']]} />
        <Text style={{ color: colors.fg, fontSize: 17 }}>This is how normal text looks with your choice. Lap 52 of 71, P4, +3.2s.</Text>
        <Note>Changes show as screens redraw. Restart the app if something still looks old.</Note>
      </Section>
      <Section icon="color-palette-outline" title="Team colours" summary={!o.teamTheme || o.teamTheme === 'off' ? 'Off' : o.teamTheme === 'fav' ? 'My favourite team' : (TEAM_NAMES[o.teamTheme] || o.teamTheme)}>
        <Note>Tints the whole app with a team's colour instead of your accent colour. Pick a team, or follow your first favourite team (star a team in the Paddock). Change it any time, for example each race weekend. The app restarts to apply it.</Note>
        <Dropdown value={o.teamTheme || 'off'} options={[['off', 'Off, use my accent colour'], ['fav', 'My first favourite team'], ...Object.keys(teamColors).map((k) => [k, TEAM_NAMES[k] || k])]} onChange={async (v) => { await setOpt('teamTheme', v); setTimeout(() => { restartApp().catch(() => {}); }, 700); }} prefix="Team" />
      </Section>
      <Section icon="phone-portrait-outline" title="Haptics" summary={o.haptics === false ? 'Off' : 'On'}>
        <Sw label="Vibration on key moments" hint="A short buzz at lights out, when a card pack opens, on right and wrong answers in games and on steward calls." value={o.haptics !== false} onChange={(v) => setOpt('haptics', v)} />
        <Note>Sound effects are not included: custom sounds need a new app build.</Note>
      </Section>
      <Section icon="eye-outline" title="Colour-blind friendly" summary={o.colorblind ? 'On: blue and orange' : 'Off'}>
        <Note>Swaps the red and green used for good and bad news (gains, losses, retirements) for blue and orange, which stay distinct for red-green colour blindness. The app restarts to apply it.</Note>
        <Segmented value={o.colorblind ? 'on' : 'off'} onChange={async (v) => { await setOpt('colorblind', v === 'on'); setTimeout(() => { restartApp().catch(() => {}); }, 700); }} items={[['off', 'Off'], ['on', 'On']]} />
      </Section>
      <Section icon="airplane-outline" title="Offline mode" summary={o.offline ? 'On: saved data only' : 'Off'}>
        <Sw label="Use saved data only" hint="Nothing is downloaded. Screens show what the app saved earlier (the offline history always works). Good for saving data or flying. Screens with nothing saved show a message." value={!!o.offline} onChange={(v) => setOpt('offline', v)} />
      </Section>
      <Section icon="save-outline" title="Backup and restore" summary="Move everything to a new phone">
        <Note>A backup holds your fantasy saves, settings, predictions, friends and favourites in one file.</Note>
        <Btn tone="solid" icon="download-outline" onPress={async () => { setBk('Making the backup…'); try { setBk(await exportBackup()); } catch (e) { setBk(''); Alert.alert('Backup failed', String(e?.message || e)); } }}>Back up now</Btn>
        <Btn icon="cloud-upload-outline" onPress={async () => { try { const l = await findBackups(); if (!l.length) { Alert.alert('No backup found', 'Choose the folder that holds your f1-companion-backup file.'); return; }
          Alert.alert('Restore which backup?', 'This replaces the data on this phone with the backup.', [{ text: 'Cancel', style: 'cancel' }, ...l.slice(0, 4).map((b) => ({ text: b.name.slice(-30), onPress: async () => { try { const r = await restoreFrom(b.uri); setBk(`Restored ${r.keys} items (${r.saves} fantasy saves). Restarting…`); setTimeout(() => restartApp(), 1200); } catch (e) { Alert.alert('Restore failed', String(e?.message || e)); } } }))]); } catch (e) { Alert.alert('Restore failed', String(e?.message || e)); } }}>Restore from a backup file</Btn>
        {bk ? <Note>{bk}</Note> : null}
      </Section>
      <Section icon="contrast-outline" title="Theme" summary={o.theme === 'light' ? 'White' : o.theme === 'amoled' ? 'AMOLED black' : 'Dark'}>
        {[['dark', 'Dark', 'The default look.'], ['amoled', 'AMOLED black', 'Pure black background. Saves battery on OLED screens.'], ['light', 'White', 'A light theme. Some screens with photos are still tuned for dark.']].map(([k, label, hint]) => { const on = (o.theme || 'dark') === k; return (
          <Pressable key={k} onPress={async () => { if (on) return; setMsgT('Saving the theme…'); await setOpt('theme', k === 'dark' ? null : k).catch(() => {}); setMsgT('Theme saved. The app restarts to use it everywhere.'); setTimeout(async () => { await restartApp(); }, 900); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, pressed && { opacity: 0.7 }]}>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.accent : colors.muted} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{hint}</Text></View>
          </Pressable>); })}
        {msgT ? <Note>{msgT}</Note> : null}
      </Section>
      <Section icon="color-palette-outline" title="Accent colour" summary={o.accent ? o.accent : 'Default red'}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
          {SWATCHES.map((c) => { const sel = (o.accent || '#F0141E').toUpperCase() === c; return (
            <Pressable key={c} onPress={() => { setPickC(c); setCustom(false); }} accessibilityLabel={`Colour ${c}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, borderWidth: pickC.toUpperCase() === c ? 3 : 1, borderColor: pickC.toUpperCase() === c ? '#fff' : colors.line, alignItems: 'center', justifyContent: 'center' }}>{sel ? <Ionicons name="checkmark" size={20} color="#000" /> : null}</Pressable>); })}
          <Pressable onPress={() => setCustom(!custom)} accessibilityLabel="Pick any colour" style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="color-wand-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700' }}>Custom</Text></Pressable>
        </View>
        {custom ? <View style={{ marginTop: 12 }}><ColorPicker value={pickC} onChange={setPickC} /></View> : null}
        <Btn onPress={() => applyColour(pickC)}>Apply this colour</Btn>
        <Btn onPress={() => { setPickC('#F0141E'); applyColour(null); }}>Back to the default red</Btn>
        <Note>The app restarts once so the colour is used on every screen.</Note>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Section icon="notifications-outline" title="Notifications" summary={`${on} sessions · ${prefs.results ? 'results on' : 'results off'}`}>
        {!notificationsAvailable() && <Note>Alerts only work in the installed app, not in Expo Go.</Note>}
        <Text style={s.hint}>Tap the sessions you want an alert for.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {SESSION_TYPES.filter((t) => o.sport !== 'motogp' || !['Practice 3', 'Sprint Qualifying'].includes(t)).map((t) => { const sel = !!prefs.types[t]; return (
            <Pressable key={t} onPress={() => toggle(t)} accessibilityRole="switch" accessibilityState={{ checked: sel }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: sel ? colors.accent : colors.line, backgroundColor: sel ? colors.accentSoft : colors.surface2 }, pressed && { opacity: 0.7 }]}>
              <Ionicons name={sel ? 'notifications' : 'notifications-off-outline'} size={16} color={sel ? colors.accent : colors.muted} />
              <Text style={{ color: sel ? colors.fg : colors.muted, fontWeight: sel ? '700' : '500', fontSize: 15 }}>{t}</Text>
            </Pressable>); })}
        </View>
        <View style={{ marginTop: 10 }}><NotifPrefs title="Remind me before" /></View>
        <Sw label="Birthdays and win anniversaries" hint="At 9:00 on a favourite driver's birthday and on the anniversary of their first win." value={!!o.bdays} onChange={(v) => setOpt('bdays', v)} />
        <Sw label="Race morning reminder" hint="At 8:00 on the day of a race or sprint, with the start time." value={!!o.raceMorning} onChange={(v) => setOpt('raceMorning', v)} />
        <Sw label="Quiet hours" hint="No alerts between the times below." value={!!o.quiet?.on} onChange={(v) => setOpt('quiet', { from: '23:00', to: '07:00', raceOk: true, ...(o.quiet || {}), on: v })} />
        {o.quiet?.on ? (<View style={{ gap: 10 }}>
          <Dropdown value={o.quiet.from || '23:00'} options={HOURS} onChange={(v) => setOpt('quiet', { ...o.quiet, from: v })} prefix="From" />
          <Dropdown value={o.quiet.to || '07:00'} options={HOURS} onChange={(v) => setOpt('quiet', { ...o.quiet, to: v })} prefix="Until" />
          <Sw label="Still alert me for the race" hint="Race start alerts ignore quiet hours." value={o.quiet.raceOk !== false} onChange={(v) => setOpt('quiet', { ...o.quiet, raceOk: v })} />
          <Note>Alerts already scheduled are updated the next time the app opens. Result and news alerts that arrive during quiet hours are skipped.</Note>
        </View>) : null}
        <Sw label="Session results" hint="A notification once a qualifying, sprint or race result is published. Android can be minutes late." value={prefs.results} onChange={toggleResults} />
        <Btn onPress={async () => { const n = await checkResults({ force: true }); setMsg(n ? `Sent ${n} result alert${n > 1 ? 's' : ''}.` : 'No new results to send right now.'); }}>Check for results now</Btn>
        <Btn onPress={async () => { const r = await sendTestNotification(); setMsg(r === 'ok' ? 'A test alert arrives in 5 seconds.' : r === 'denied' ? 'Notifications are not allowed for this app. Enable them in system settings.' : 'Alerts only work in the installed app.'); }}>Send a test alert</Btn>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Section icon="newspaper-outline" title="News alerts" summary={`${SOURCES.filter((x) => (o.newsAlerts || {})[x.id]).length} sources on`}>
        <Note>Get a notification when a source you pick publishes a new story. Android decides the exact timing, so it can be a few minutes late. Off by default.</Note>
        {SOURCES.map((x) => <Sw key={x.id} label={x.name} value={(o.newsAlerts || {})[x.id]} onChange={async (v) => { if (v) await ensurePermission(); setOpt('newsAlerts', { ...(o.newsAlerts || {}), [x.id]: v }); }} />)}
        <Btn onPress={async () => { const n = await checkNews({ force: true }); setMsg(n ? `Sent ${n} news alert${n > 1 ? 's' : ''}.` : 'No new stories from your sources right now.'); }}>Check news now</Btn>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Section icon="options-outline" title="Display" summary={`${o.clock24 ? '24-hour' : '12-hour'} clock · gaps ${GAPS.find(([k]) => k === o.gap)[1].toLowerCase()}`}>
        <Sw label="24-hour clock" value={o.clock24} onChange={(v) => setOpt('clock24', v)} />
        <Sw label="Start race pages in track time" hint="Otherwise they open in your device's time." value={o.trackTime} onChange={(v) => setOpt('trackTime', v)} />
        <Sw label="Pull down to refresh" hint="Off by default. A refresh button sits at the top instead." value={o.pullRefresh === true} onChange={(v) => setOpt('pullRefresh', v)} />
        <Sw label="Team principal on Paddock cards" value={o.padPrincipal !== false} onChange={(v) => setOpt('padPrincipal', v)} />
        <Sw label="Driver position and points on Paddock cards" value={o.padStats !== false} onChange={(v) => setOpt('padStats', v)} />
        <Text style={[s.label, { marginTop: 12, marginBottom: 8 }]}>Home shows first</Text>
        <Dropdown value={o.homeFirst === 'teams' ? 'teams' : 'drivers'} options={[['drivers', 'Your drivers'], ['teams', 'Your teams']]} onChange={(v) => setOpt('homeFirst', v)} />
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
        {updatesConfigured() ? <Btn onPress={async () => { setUpd('Checking…'); const o = await checkOta(); if (o.status === 'ready') { setUpd('Update downloaded. Restarting…'); if (await applyOta()) return; setUpd('Update downloaded. Close the app completely and open it again to use it.'); return; } const r = await checkUpdate(true); setUpd(r.status === 'available' ? `Version ${r.version} is available.` : r.status === 'current' ? 'You have the latest version.' : r.status === 'none' ? 'No release has been published on GitHub yet, so there is nothing to update to.' : r.status === 'error' ? `Could not check: ${r.error}` : ''); if (r.status === 'available') { if (canInstallInApp() && /\.apk$/i.test(r.url)) { setUpd(`Downloading ${r.version}… 0%`); const i = await installUpdate(r, (p) => setUpd(`Downloading ${r.version}… ${Math.round(p * 100)}%`)); setUpd(i.ok ? 'Download finished. Confirm the install on the Android screen.' : `Could not install here (${i.error}). Opening the download instead.`); if (!i.ok) Linking.openURL(r.url).catch(() => {}); } else Linking.openURL(r.url).catch(() => {}); } }}>Check for updates</Btn> : null}
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
        <Btn onPress={() => { setOpts(Object.fromEntries(Object.entries(OPTS).filter(([k]) => !['lang', 'name', 'welcomed', 'accent', 'sport'].includes(k)))); setMsg('Display and performance settings were reset.'); }}>Reset display settings</Btn>
        {msg ? <Note>{msg}</Note> : null}
      </Section>
      <Card>
        <Btn icon="compass-outline" onPress={() => setOpt('tourDone', false)}>Show the app tour again</Btn>
        <Pressable onPress={aboutTap} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.ico}><Ionicons name="information-circle-outline" size={22} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={s.secTitle}>About</Text><Text style={s.hint}>{`F1 Companion v${currentVersion()}`}</Text></View>
        </Pressable>
        <View style={s.bubble}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>👋 Hi from trollrap!</Text><Text style={s.hint}>Every bug you find is a hidden feature. Probably.</Text></View>
        <Text style={[s.hint, { marginTop: 10 }]}>Times follow your device's timezone unless a screen is switched to track time.</Text>
      </Card>
      <CodePrompt visible={codeOpen} title="Enter the code" onClose={() => setCodeOpen(false)} onSubmit={(c) => { if (c.toLowerCase() !== 'op81') return false; setCodeOpen(false); nav.navigate('Dev'); return true; }} />
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
  bubble: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: alpha(colors.accent, 0.35), gap: 2 },
});
