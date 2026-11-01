import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Image, Easing } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, alpha } from '../theme';
import { LEADS, usePrefs } from '../hooks/usePrefs';
import { useTeamColor } from '../hooks/useTeams';
import { Card, Eyebrow } from './Screen';
import Grad, { Scrim } from './Grad';
import { circuitFor } from '../data/circuits';
import { flag } from '../lib/time';
import { driverPhoto, teamLogo, numberImage, principalPhoto } from '../lib/media';
import { principalsOf } from '../data/principals';
import { useNavigation } from '@react-navigation/native';
import { useFavs } from '../hooks/useFavs';
import Reveal from './Reveal';
import Press from './Press';

export function Countdown({ ms, large }) {
  let t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400); t %= 86400; const h = Math.floor(t / 3600); t %= 3600; const m = Math.floor(t / 60); t %= 60;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }} accessibilityRole="timer">
      {[[d, 'DAYS'], [h, 'HRS'], [m, 'MIN'], [t, 'SEC']].map(([v, l], i) => (
        <View key={l} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <View style={[s.tile, large && { paddingVertical: 12 }, i === 3 && { borderColor: alpha(colors.accent, 0.5) }]}><Text style={[s.tileText, large && { fontSize: 36 }, i === 3 && { color: colors.accent }]}>{String(v).padStart(2, '0')}</Text></View>
          <Text style={s.tileLabel}>{l}</Text>
        </View>
      ))}
    </View>
  );
}
// Multi-select when `value` is an array.
export function Chips({ items, value, onChange }) {
  const on = (v) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {items.map(([v, l]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} style={({ pressed }) => [s.chip, on(v) && s.chipOn, pressed && { opacity: 0.8 }]}>
          {on(v) && Array.isArray(value) ? <Ionicons name="checkmark" size={14} color={colors.accent} /> : null}
          <Text style={{ color: on(v) ? colors.fg : colors.muted, fontWeight: '600', fontSize: 15 }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function NotifPrefs({ title = 'Notifications' }) {
  const { prefs, toggleLead } = usePrefs();
  return (<View><Eyebrow>{title}</Eyebrow><Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>Choose when to be alerted before a session. Pick as many as you like.</Text><Chips items={LEADS} value={prefs.leads} onChange={toggleLead} /></View>);
}
// Segmented control with a sliding indicator.
export function Segmented({ items, value, onChange }) {
  const [w, setW] = useState(0); const x = useRef(new Animated.Value(0)).current; const idx = Math.max(0, items.findIndex(([v]) => v === value));
  const seg = w ? (w - 8) / items.length : 0;
  useEffect(() => { Animated.timing(x, { toValue: idx * seg, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [idx, seg]);
  return (
    <View style={s.seg} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {seg > 0 && <Animated.View style={[s.segInd, { width: seg, transform: [{ translateX: x }] }]} />}
      {items.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={s.segBtn}><Text style={{ color: value === v ? colors.fg : colors.muted, fontWeight: '600', fontSize: 15 }}>{l}</Text></Pressable>
      ))}
    </View>
  );
}
// Two-line driver name: small first name over a bold surname.
export function DriverName({ first, last, size = 18, align }) {
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {first ? <Text style={{ color: colors.muted, fontSize: Math.max(11, size * 0.62), lineHeight: Math.max(13, size * 0.72) }} numberOfLines={1}>{first}</Text> : null}
      <Text style={{ color: colors.fg, fontSize: size, fontWeight: '700', lineHeight: size * 1.1 }} numberOfLines={1}>{last}</Text>
    </View>
  );
}
// Head and shoulders photo cropped tight on the face. Renders nothing when the driver has no photo.
export function HeadShot({ id, size = 48, color }) {
  const photo = driverPhoto(id); if (!photo) return null;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', backgroundColor: alpha(color || colors.muted, 0.2) }}>
      <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', width: size * 1.8, height: size * 1.8, left: -size * 0.4, top: -size * 0.12 }} />
    </View>
  );
}
// One row of any classification: position, driver, optional head photo or team logo, then time/gap and points.
// Tinted with the team colour; `logoId` adds a faint team logo behind the right side.
export const ResultLine = React.memo(function ResultLine({ pos, first, last, color, right, sub, fav, fastest, onPress, style, photoId, logoId, midLogoId, slotLogoId, champion, index }) {
  const { prefs } = usePrefs(); const photos = prefs.opts.photos !== false; const slot = slotLogoId ? teamLogo(slotLogoId) : null;
  const gold = pos === 1 || champion; const wm = logoId ? teamLogo(logoId) : null, mid = midLogoId ? teamLogo(midLogoId) : null;
  const body = (
    <Grad color={color || colors.muted} from={champion ? 0.42 : 0.26} to={0.03} dir="h" radius={14} border={gold ? 0.7 : 0.22} style={[{ marginTop: 6 }, gold && { borderColor: alpha(colors.gold, champion ? 0.95 : 0.55), borderWidth: champion ? 1.5 : 1 }, style]}>
      {wm ? <Image source={wm} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={s.wm} /> : null}
      {fav ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.gold }} /> : null}
      <View style={s.line}>
        <View style={[s.posBox, { backgroundColor: alpha(gold ? colors.gold : color || colors.muted, gold ? 0.22 : 0.28) }]}><Text style={[s.pos, gold && { color: colors.gold }]}>{pos ?? '–'}</Text></View>
        <View style={{ flex: 1 }}>
          <DriverName first={first} last={last} size={18} />
          {champion ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 3, backgroundColor: alpha(colors.gold, 0.18), borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 }}><Ionicons name="trophy" size={11} color={colors.gold} /><Text style={{ color: colors.gold, fontFamily: 'label', fontWeight: '700', fontSize: 10, letterSpacing: 1.2 }}>CHAMPION</Text></View> : null}
        </View>
        {photoId && photos ? <HeadShot id={photoId} size={46} color={color} /> : null}
        {slot ? <Image source={slot} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ width: 44, height: 44, opacity: 0.95 }} /> : null}
        {mid ? <Image source={mid} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ width: 44, height: 44, opacity: 0.4 }} /> : null}
        <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{fastest ? <Ionicons name="flash" size={14} color={colors.purple} /> : null}<Text style={s.time}>{right}</Text></View>
          {sub ? <Text style={s.sub}>{sub}</Text> : null}
        </View>
      </View>
    </Grad>
  );
  const out = onPress ? <Press onPress={onPress} scale={0.985}>{body}</Press> : body;
  return index == null ? out : <Reveal index={index} dx={14}>{out}</Reveal>;
});
export const driverParams = (r) => ({ driverId: r.driverId, name: r.name || `${r.first} ${r.last}`.trim(), first: r.first, last: r.last, teamId: r.teamId, team: r.team });
// Race and sprint results from Jolpica. Tap a row to open the driver.
export function ResultRow({ r, photo = true, index }) {
  const favs = useFavs(); const tc = useTeamColor(); const nav = useNavigation();
  return <ResultLine pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} right={r.time} sub={`${r.points} pts`} fav={r.driverId && favs.isDriver(r.driverId)} fastest={r.fastest} index={index}
    logoId={r.teamId} photoId={photo ? r.driverId : null} onPress={r.driverId ? () => nav.navigate('Driver', driverParams(r)) : undefined} />;
}
export function CircuitBox({ meeting }) {
  const nav = useNavigation(); const c = circuitFor(meeting);
  return (
    <Card onPress={() => nav.navigate('Circuit', { meeting })}>
      <Eyebrow right="Track info">Circuit</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <Text style={{ fontSize: 30 }}>{flag(meeting.country_code)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700' }}>{c ? c.name : meeting.circuit_short_name}</Text>
          <Text style={s.sub}>{c ? `${c.stats[0][1]} · ${c.stats[1][1]} turns · ${c.stats[2][1]} laps` : 'Track map and details'}</Text>
        </View>
      </View>
    </Card>
  );
}
export function StarButton({ on, onPress, label, small }) {
  const sc = useRef(new Animated.Value(1)).current; const z = small ? 32 : 40;
  const press = () => { Animated.sequence([Animated.timing(sc, { toValue: 0.8, duration: 70, useNativeDriver: true }), Animated.spring(sc, { toValue: 1, friction: 4, useNativeDriver: true })]).start(); onPress(); };
  return (
    <Pressable onPress={press} hitSlop={8} accessibilityLabel={label} accessibilityState={{ selected: on }}>
      <Animated.View style={{ transform: [{ scale: sc }], width: z, height: z, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? alpha(colors.gold, 0.18) : 'rgba(0,0,0,0.28)' }}>
        <Ionicons name={on ? 'star' : 'star-outline'} size={small ? 18 : 22} color={on ? colors.gold : colors.fg} />
      </Animated.View>
    </Pressable>
  );
}
// Compact stat tiles. `cols` per row (2 or 3).
export function StatGrid({ items, cols = 2, accent }) {
  const w = cols === 3 ? '31%' : '48.5%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {items.map(([k, v]) => (
        <View key={k} style={{ width: w, backgroundColor: colors.surface2, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 10, letterSpacing: 1.4 }} numberOfLines={1}>{k.toUpperCase()}</Text>
          <Text style={{ color: accent && k === accent ? colors.accent : colors.fg, fontSize: 22, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
// Driver card (Paddock, compare picker, team page): team gradient, number, and the portrait with a dark fade behind the name.
// `center` puts a faded portrait in the middle of the card (team page).
export const DriverBox = React.memo(function DriverBox({ d, fav, onPress, onStar, height = 150, center }) {
  const tc = useTeamColor(); const color = tc(d.teamId); const photo = driverPhoto(d.driverId), numImg = numberImage(d.driverId); const big = height * 1.12;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <Grad color={color} from={0.6} to={0.08} radius={18} border={fav ? 0.9 : 0.4} style={[{ height }, fav && { borderColor: colors.gold }]}>
        {photo && center ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', alignSelf: 'center', width: height * 1.0, height: height * 1.0, bottom: -height * 0.02, opacity: 1 }} />
          : photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -big * 0.08, bottom: -big * 0.07, width: big, height: big }} />
          : d.number != null ? <Text style={{ position: 'absolute', right: 6, bottom: -14, fontFamily: 'display', fontWeight: '800', fontSize: height * 0.6, color: 'rgba(255,255,255,0.13)' }}>{d.number}</Text> : null}
        {photo ? <Scrim dir="v" from={0} to={0.82} style={{ top: '38%' }} /> : null}
        {photo && !center ? <Scrim dir="h" from={0.45} to={0} style={{ right: '35%' }} /> : null}
        <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {numImg ? <Image source={numImg} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ width: 52, height: 28 }} /> : <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 26, color: colors.fg }}>{photo ? d.number ?? '' : ''}</Text>}
            {onStar ? <StarButton small on={fav} onPress={onStar} label={`Favourite ${d.first} ${d.last}`} /> : null}
          </View>
          <DriverName first={d.first} last={d.last} size={20} />
        </View>
      </Grad>
    </Pressable>
  );
});
export function TeamBadge({ teamId, name, size = 40 }) {
  const tc = useTeamColor(); const logo = teamLogo(teamId);
  if (logo) return <Image source={logo} resizeMode="contain" resizeMethod="resize" style={{ width: size, height: size }} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(tc(teamId), 0.3), borderWidth: 1, borderColor: alpha(tc(teamId), 0.7), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.fg, fontFamily: 'label', fontWeight: '700', fontSize: size * 0.38 }}>{String(name || '?').slice(0, 2).toUpperCase()}</Text></View>;
}
// Team card for the Paddock: driver numbers and names on the left, team name and points below, big faded logo on the right.
// No photos in it, so the whole list stays light.
export const TeamRow = React.memo(function TeamRow({ t, lineup = [], fav, onPress, onStar }) {
  const tc = useTeamColor(); const color = tc(t.teamId); const logo = teamLogo(t.teamId); const { prefs } = usePrefs(); const showBoss = prefs.opts.padPrincipal !== false, showStats = prefs.opts.padStats !== false; const boss = showBoss ? principalsOf(t.teamId)[0] : null, bossPhoto = principalPhoto(t.teamId);
  return (
    <Press onPress={onPress} scale={0.985}>
      <Grad color={color} from={0.8} to={0.1} dir="h" radius={18} border={fav ? 0.9 : 0.45} style={[{ padding: 14 }, fav && { borderColor: colors.gold }]}>
        {logo ? <Image source={logo} resizeMode="contain" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: 96, top: 8, width: 90, height: 90, opacity: 0.3 }} /> : null}
        {boss ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: 12, bottom: 12, width: 84, alignItems: 'center' }}>
            {bossPhoto ? <Image source={bossPhoto} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: alpha('#000000', 0.25) }} /> : null}
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 1, marginTop: 4 }}>TEAM PRINCIPAL</Text>
            <Text style={{ color: colors.fg, fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{boss.name}</Text>
          </View>) : null}
        <View style={{ gap: 8 }}>
          {lineup.map((d) => (
            <View key={d.driverId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 44, textAlign: 'right', fontFamily: 'display', fontWeight: '800', fontSize: 24, color: colors.fg, fontStyle: 'italic' }}>{d.number ?? ''}</Text>
              <View style={{ width: 2, height: 30, borderRadius: 1, backgroundColor: alpha('#FFFFFF', 0.55) }} />
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 14, letterSpacing: 0.6 }} numberOfLines={1}>{String(d.first || '').toUpperCase()}</Text>
                <Text style={{ color: colors.fg, fontSize: 19, lineHeight: 21, fontWeight: '700', letterSpacing: 0.4 }} numberOfLines={1}>{String(d.last || '').toUpperCase()}</Text>
              </View>
              {showStats && d.pos ? <View style={{ marginLeft: 4, backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ color: colors.fg, fontSize: 12, fontWeight: '700' }}>{`P${d.pos} · ${d.pts}`}</Text></View> : null}
            </View>))}
        </View>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '700', marginTop: 12, marginRight: boss ? 92 : 0 }} numberOfLines={1}>{t.name}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, marginRight: boss ? 92 : 0 }}>P{t.position} · {t.points} pts</Text>
        {onStar ? <View style={{ position: 'absolute', top: 10, right: 10 }}><StarButton small on={fav} onPress={onStar} label={`Favourite ${t.name}`} /></View> : null}
      </Grad>
    </Press>
  );
});
const s = StyleSheet.create({
  tile: { width: '100%', backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  tileText: { fontFamily: 'display', color: colors.fg, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }, tileLabel: { fontFamily: 'label', color: colors.muted, fontSize: 10, letterSpacing: 1.8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 99, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  seg: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.line },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' }, segInd: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10 },
  posBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, pos: { color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 16 },
  wm: { position: 'absolute', right: 6, top: 2, bottom: 2, width: 100, opacity: 0.17 },
  time: { color: colors.fg, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '600' }, sub: { color: colors.muted, fontSize: 14 },
});
