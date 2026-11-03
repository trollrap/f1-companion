import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import Reveal from '../components/Reveal';
import Press from '../components/Press';
import { usePrefs } from '../hooks/usePrefs';
import { ensurePermission, notificationsAvailable } from '../lib/notifications';
import { colors, alpha } from '../theme';

const FEATURES = [
  ['speedometer-outline', 'Everything F1', 'Calendar with every session, live standings, full race results with grids and penalties, tire strategy and a profile for every driver and team since 1950.'],
  ['newspaper-outline', 'News', 'Stories from the best motorsport sites, readable inside the app, with alerts from the sources you choose.'],
  ['game-controller-outline', 'Fun', 'Make your own driver, build fantasy seasons with any number of teams and simulate them race by race.'],
  ['notifications-outline', 'Alerts', 'A reminder before every session you care about, and a message when results are in.'],
  ['bicycle-outline', 'MotoGP and Football', 'Tap the name at the top to switch sport.'],
];
// Shown once, on the first launch: what the app does, a name (kept on the phone only) and the permissions it uses.
export default function WelcomeScreen() {
  const { setOpts } = usePrefs(); const [step, setStep] = useState(0); const [name, setName] = useState(''); const [notif, setNotif] = useState(false); const [note, setNote] = useState('');
  const finish = () => setOpts({ name: name.trim().slice(0, 24), welcomed: true });
  const Next = ({ label, onPress }) => (<Press onPress={onPress}><View style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{label}</Text></View></Press>);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient pointerEvents="none" colors={[alpha(colors.accent, 0.35), 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 320 }} />
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 40, gap: 18, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (<>
          <Reveal><Text style={{ color: colors.accent, fontFamily: 'label', fontSize: 13, letterSpacing: 3 }}>WELCOME</Text></Reveal>
          <Reveal index={1}><Text style={{ color: colors.fg, fontSize: 38, fontWeight: '800', fontStyle: 'italic', lineHeight: 42 }}>F1 Companion</Text></Reveal>
          <Reveal index={2}><Text style={{ color: colors.muted, fontSize: 18 }}>Your pocket guide to the grid. Here is what you get:</Text></Reveal>
          {FEATURES.map(([icon, t, d], i) => (
            <Reveal key={t} index={i + 3}>
              <View style={{ flexDirection: 'row', gap: 14, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }}><Ionicons name={icon} size={22} color={colors.accent} /></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{t}</Text><Text style={{ color: colors.muted, fontSize: 15 }}>{d}</Text></View>
              </View>
            </Reveal>))}
          <View style={{ flex: 1 }} /><Next label="Let's go" onPress={() => setStep(1)} />
        </>)}
        {step === 1 && (<>
          <Reveal><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800', fontStyle: 'italic' }}>What should we call you?</Text></Reveal>
          <Reveal index={1}><Text style={{ color: colors.muted, fontSize: 17 }}>Your name stays on this phone. It is used for greetings and as the default name of your driver in Fun.</Text></Reveal>
          <Reveal index={2}><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} maxLength={24} autoFocus style={{ height: 56, borderRadius: 16, paddingHorizontal: 16, color: colors.fg, fontSize: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent }} /></Reveal>
          <View style={{ flex: 1 }} /><Next label={name.trim() ? 'Continue' : 'Skip'} onPress={() => setStep(2)} />
        </>)}
        {step === 2 && (<>
          <Reveal><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800', fontStyle: 'italic' }}>Stay in the loop</Text></Reveal>
          <Reveal index={1}><Text style={{ color: colors.muted, fontSize: 17 }}>The app only asks for what it needs, and you can change everything later in Settings.</Text></Reveal>
          <Reveal index={2}>
            <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="notifications-outline" size={24} color={colors.accent} />
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>Notifications</Text><Text style={{ color: colors.muted, fontSize: 15 }}>Session reminders, results and news alerts.</Text></View>
                <Switch value={notif} onValueChange={async (v) => { if (!v) { setNotif(false); return; } const ok = await ensurePermission(); setNotif(ok); setNote(ok ? '' : notificationsAvailable() ? 'Notifications are blocked for this app. You can allow them in the phone settings.' : 'Notifications work in the installed app, not in Expo Go.'); }} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor="#fff" />
              </View>
              {note ? <Text style={{ color: colors.muted, fontSize: 14 }}>{note}</Text> : null}
            </View>
          </Reveal>
          <Reveal index={3}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <Ionicons name="images-outline" size={24} color={colors.accent} />
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>Photos</Text><Text style={{ color: colors.muted, fontSize: 15 }}>Only asked for when you save a picture, or pick a photo for your own driver.</Text></View>
            </View>
          </Reveal>
          <View style={{ flex: 1 }} /><Next label={name.trim() ? `Start, ${name.trim()}` : 'Start'} onPress={finish} />
        </>)}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 4 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? colors.accent : colors.line }} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
