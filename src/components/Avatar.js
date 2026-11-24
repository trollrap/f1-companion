import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './Text';
import { usePrefs } from '../hooks/usePrefs';
import { colors, alpha } from '../theme';

// The user's own profile (kept in prefs.opts.profile). Shared by the profile screen, the Other tab and My F1 card.
export const EMPTY = { name: '', photo: '', driverId: '', teamId: '', number: '', show: { photo: true, driver: true, team: true, number: true, stats: true, bests: true } };
export const useProfile = () => { const { prefs, setOpt } = usePrefs(); const p = { ...EMPTY, ...(prefs.opts.profile || {}), show: { ...EMPTY.show, ...((prefs.opts.profile || {}).show || {}) } }; return [p, (patch) => setOpt('profile', { ...p, ...patch, show: { ...p.show, ...(patch.show || {}) } })]; };
export function Avatar({ p, size = 64 }) {
  return p.photo ? <Image source={{ uri: p.photo }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: alpha(colors.fg, 0.4) }} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(colors.accent, 0.3), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.fg, fontSize: size * 0.42, fontWeight: '800' }}>{(p.name || '?').trim().charAt(0).toUpperCase() || '?'}</Text></View>;
}
