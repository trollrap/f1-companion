import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Grad from '../components/Grad';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import { useProfile } from '../hooks/useProfile';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { constructorStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { checkBirth, oldEnough } from '../lib/age';
import { colors, alpha } from '../theme';

const SWATCHES = [colors.accent, colors.red, colors.good, colors.gold, colors.purple, colors.sprint, '#2DD4BF', '#FB923C'];
const Btn = ({ children, onPress, disabled, danger, ghost }) => (
  <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, ghost && s.ghost, danger && s.danger, (pressed || disabled) && { opacity: 0.6 }]}>
    <Text style={[s.btnText, danger && { color: colors.red }]}>{children}</Text>
  </Pressable>
);

// Step 1. Neutral on purpose: no pre-filled value, and no hint of the age limit. Only the result is stored, never the date.
function AgeGate() {
  const { passGate, blockGate } = useProfile();
  const [d, setD] = useState(''), [m, setM] = useState(''), [y, setY] = useState(''); const [err, setErr] = useState('');
  const mRef = useRef(null), yRef = useRef(null);
  const go = () => {
    const r = checkBirth(d, m, y); if (!r.ok) { setErr(r.reason); return; }
    setErr(''); setD(''); setM(''); setY('');
    if (oldEnough(r.age)) passGate(); else blockGate();
  };
  return (
    <Card>
      <Eyebrow>Create your profile</Eyebrow>
      <Text style={s.p}>Enter your date of birth to continue.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TextInput value={d} onChangeText={(t) => { const v = t.replace(/\D/g, ''); setD(v); if (v.length === 2) mRef.current?.focus(); }} placeholder="DD" maxLength={2} keyboardType="number-pad" placeholderTextColor={colors.muted} style={[s.input, { width: 64, textAlign: 'center' }]} accessibilityLabel="Day of birth" />
        <TextInput ref={mRef} value={m} onChangeText={(t) => { const v = t.replace(/\D/g, ''); setM(v); if (v.length === 2) yRef.current?.focus(); }} placeholder="MM" maxLength={2} keyboardType="number-pad" placeholderTextColor={colors.muted} style={[s.input, { width: 64, textAlign: 'center' }]} accessibilityLabel="Month of birth" />
        <TextInput ref={yRef} value={y} onChangeText={(t) => setY(t.replace(/\D/g, ''))} placeholder="YYYY" maxLength={4} keyboardType="number-pad" placeholderTextColor={colors.muted} style={[s.input, { width: 92, textAlign: 'center' }]} accessibilityLabel="Year of birth" />
      </View>
      {err ? <Text style={{ color: colors.red, fontSize: 15, marginTop: 10 }}>{err}</Text> : null}
      <Btn onPress={go} disabled={!d || !m || y.length < 4}>Continue</Btn>
      <Note>Used only for this check. Your date of birth is not saved.</Note>
    </Card>
  );
}
function Blocked({ onBack }) {
  return (
    <Card>
      <Eyebrow>Profile unavailable</Eyebrow>
      <Text style={s.p}>Sorry, a profile can't be created on this device. Nothing about you was saved. Everything else in the app works as usual, including favourites and notifications.</Text>
      <Btn onPress={onBack}>Back to the app</Btn>
    </Card>
  );
}
// Step 2 and later edits.
function Form({ onDone }) {
  const { profile, save, remove } = useProfile(); const tc = useTeamColor();
  const [name, setName] = useState(profile?.name || ''), [color, setColor] = useState(profile?.color || SWATCHES[0]);
  const [team, setTeam] = useState(profile?.teamId ? { id: profile.teamId, name: profile.teamName } : null); const [sure, setSure] = useState(false);
  const teams = useAsync(() => constructorStandings(YEAR), []);
  const clean = name.trim().replace(/\s+/g, ' '), valid = clean.length >= 2 && clean.length <= 20;
  const accent = team ? tc(team.id) : color;
  return (<>
    <Grad color={accent} from={0.5} to={0.05} border={0.5} style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar profile={{ name: clean || '?', color }} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 26, color: colors.fg }} numberOfLines={1}>{clean || 'Your name'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }} numberOfLines={1}>{team ? `${team.name} fan` : 'F1 fan'}</Text>
        </View>
      </View>
    </Grad>
    <Card>
      <Eyebrow>Display name</Eyebrow>
      <TextInput value={name} onChangeText={setName} maxLength={20} placeholder="2 to 20 characters" placeholderTextColor={colors.muted} autoCapitalize="words" style={[s.input, { marginTop: 10 }]} accessibilityLabel="Display name" />
      <Note>Shown only on this device. Don't use your full legal name if you prefer not to.</Note>
    </Card>
    <Card>
      <Eyebrow>Colour</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {SWATCHES.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Colour ${c}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color === c ? colors.fg : 'transparent' }}>
            {color === c ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
          </Pressable>))}
      </View>
    </Card>
    <Card>
      <Eyebrow>Favourite team</Eyebrow>
      {teams.loading && <Skeleton rows={2} />}
      {teams.error && <ErrorNote error={teams.error} onRetry={teams.reload} />}
      {teams.v && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {[{ teamId: null, name: 'None' }, ...teams.v].map((t) => {
            const on = (team?.id || null) === t.teamId, c = t.teamId ? tc(t.teamId) : colors.muted;
            return (
              <Pressable key={t.teamId || 'none'} onPress={() => setTeam(t.teamId ? { id: t.teamId, name: t.name } : null)} style={[s.chip, { borderColor: on ? c : colors.line, backgroundColor: on ? alpha(c, 0.22) : colors.surface2 }]}>
                {t.teamId ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /> : null}
                <Text style={{ color: colors.fg, fontSize: 15, fontWeight: on ? '700' : '500' }}>{t.name}</Text>
              </Pressable>);
          })}
        </View>)}
    </Card>
    <Btn disabled={!valid} onPress={() => { save({ ...profile, name: clean, color, teamId: team?.id || null, teamName: team?.name || null }); onDone(); }}>{profile ? 'Save changes' : 'Create profile'}</Btn>
    {profile ? (sure
      ? <Btn danger onPress={() => { remove(); onDone(); }}>Tap again to delete profile</Btn>
      : <Btn ghost onPress={() => { setSure(true); setTimeout(() => setSure(false), 4000); }}>Delete profile</Btn>) : null}
  </>);
}
export default function ProfileScreen({ navigation }) {
  const { loaded, profile, gate } = useProfile();
  const back = () => navigation.goBack();
  return (
    <Screen header={false} refreshable={false}>
      {!loaded ? <Skeleton /> : gate === 'blocked' && !profile ? <Blocked onBack={back} /> : !profile && gate !== 'ok' ? <AgeGate /> : <Form onDone={back} />}
    </Screen>
  );
}
const s = StyleSheet.create({
  p: { color: '#CDD0D8', fontSize: 17, marginTop: 10 },
  input: { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, height: 48, color: colors.fg, fontSize: 18 },
  btn: { backgroundColor: colors.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  ghost: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, danger: { backgroundColor: alpha(colors.red, 0.12), borderWidth: 1, borderColor: alpha(colors.red, 0.5) },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
