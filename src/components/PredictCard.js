import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Scrim } from './Grad';
import { driverPhoto, appLogo } from '../lib/media';
import { colors, alpha } from '../theme';
// The picture that gets shared: app-themed card with the pole pick and the podium. Rendered on screen and captured as an image.
const Slot = ({ label, d, big }) => {
  const photo = d ? driverPhoto(d.driverId) : null;
  return (
    <View style={{ flex: big ? 1.15 : 1, height: big ? 150 : 128, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: alpha(d?.color || colors.muted, 0.7), backgroundColor: '#140B0D' }}>
      <LinearGradient pointerEvents="none" colors={[alpha(d?.color || colors.muted, 0.75), alpha(d?.color || colors.muted, 0.08)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {photo ? <Image source={photo} resizeMode="cover" style={{ position: 'absolute', right: -14, bottom: -14, width: 130, height: 130 }} /> : null}
      {photo ? <Scrim dir="v" from={0} to={0.75} style={{ top: '40%' }} /> : null}
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'label', fontSize: 12, letterSpacing: 1.6, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: colors.fg, fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: big ? 22 : 19 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{d ? d.last : '—'}</Text>
      </View>
    </View>
  );
};
export default function PredictCard({ gp, flag, pole, podium }) {
  return (
    <View collapsable={false} style={{ borderRadius: 22, overflow: 'hidden', padding: 16, backgroundColor: '#0A0506', borderWidth: 1, borderColor: alpha(colors.accent, 0.5) }}>
      <LinearGradient pointerEvents="none" colors={['#3A0E15', '#0A0506']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {appLogo ? <Image source={appLogo} resizeMode="contain" style={{ height: 22, aspectRatio: 1704 / 205, alignSelf: 'flex-start' }} /> : <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', letterSpacing: 2 }}>F1 COMPANION</Text>}
      <Text style={{ color: colors.accent, fontFamily: 'label', letterSpacing: 2.4, fontSize: 12, fontWeight: '700', marginTop: 14 }}>MY PREDICTIONS</Text>
      <Text style={{ color: colors.fg, fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 30, marginTop: 2 }} numberOfLines={1}>{`${flag || ''} ${gp}`}</Text>
      <View style={{ marginTop: 14 }}><Slot label="POLE" d={pole} big /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{podium.map((d, i) => <Slot key={i} label={`P${i + 1}`} d={d} />)}</View>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12, textAlign: 'right' }}>Made with F1 Companion</Text>
    </View>
  );
}
