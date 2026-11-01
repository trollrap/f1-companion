import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { TeamBadge } from './Shared';
import { Scrim } from './Grad';
import { driverPhoto } from '../lib/media';
import { colors, alpha } from '../theme';
// The picture that gets shared: app-themed card with the pole pick and the podium. Rendered on screen and captured as an image.
const Mark = ({ ok }) => (ok == null ? null : (
  <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? '#1F9D55' : '#C8202B' }}>
    <Ionicons name={ok ? 'checkmark' : 'close'} size={16} color="#FFFFFF" />
  </View>));
const Slot = ({ label, d, big, ok }) => {
  const photo = d ? driverPhoto(d.driverId) : null, col = d?.color || colors.muted, H = big ? 210 : 150;
  return (
    <View style={{ flex: big ? 1 : 1, height: H, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: alpha(col, 0.7), backgroundColor: '#140B0D' }}>
      <LinearGradient pointerEvents="none" colors={[alpha(col, 0.75), alpha(col, 0.08)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {photo ? <Image source={photo} resizeMode="cover" style={{ position: 'absolute', right: big ? -10 : -16, bottom: big ? -10 : -12, width: big ? 230 : 120, height: big ? 230 : 120 }} /> : null}
      {photo ? <Scrim dir="v" from={0} to={0.8} style={{ top: '38%' }} /> : null}
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'label', fontSize: 12, letterSpacing: 1.6, fontWeight: '700' }}>{label}</Text>
          {d ? <TeamBadge teamId={d.teamId} name={d.team} size={big ? 30 : 24} /> : null}
        </View>
        <View>
          {d?.first ? <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: big ? 15 : 12 }} numberOfLines={1}>{d.first}</Text> : null}
          <Text style={{ color: colors.fg, fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: big ? 28 : 18 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{d ? d.last : '—'}</Text>
        </View>
      </View>
      <Mark ok={ok} />
    </View>
  );
};
export default function PredictCard({ gp, flag, pole, podium, marks }) {
  return (
    <View collapsable={false} style={{ borderRadius: 22, overflow: 'hidden', padding: 16, backgroundColor: '#0A0506', borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }}>
      <LinearGradient pointerEvents="none" colors={['#3A0E15', '#0A0506']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <Text style={{ color: colors.fg, fontFamily: 'label', fontWeight: '700', letterSpacing: 2.5, fontSize: 16 }}>F1<Text style={{ color: colors.accent }}>·</Text>COMPANION</Text>
      <Text style={{ color: colors.accent, fontFamily: 'label', letterSpacing: 2.4, fontSize: 12, fontWeight: '700', marginTop: 14 }}>MY PREDICTIONS</Text>
      <Text style={{ color: colors.fg, fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 30, marginTop: 2 }} numberOfLines={1}>{`${flag || ''} ${gp}`}</Text>
      <View style={{ marginTop: 14 }}><Slot label="POLE" d={pole} big ok={marks?.pole} /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{podium.map((d, i) => <Slot key={i} label={`P${i + 1}`} d={d} ok={marks?.podium?.[i]} />)}</View>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12, textAlign: 'right' }}>Made with F1 Companion</Text>
    </View>
  );
}
