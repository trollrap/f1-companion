import React, { useEffect, useRef } from 'react';
import { View, Modal, Animated, Easing, ScrollView, Pressable, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Avatar } from './FunBits';
import Grad from './Grad';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, alpha } from '../theme';

// Full-screen moments: the transfer window, the champion, a qualifying or race result. Everything fades and slides in one after the other.
function Pop({ i = 0, step = 380, children, from = 24, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 420, delay: i * step, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }, style]}>{children}</Animated.View>;
}
const Logo = ({ src, color, label, size = 30 }) => (src ? <Image source={src} resizeMode="contain" style={{ width: size, height: size }} /> : <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: alpha(color || colors.muted, 0.5), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.fg, fontSize: size * 0.4, fontWeight: '800' }}>{String(label || '').slice(0, 2)}</Text></View>);

function Shell({ visible, title, sub, onClose, children, cta = 'Continue', glow = colors.accent }) {
  const ins = useSafeAreaInsets(); const bottom = Math.max(ins.bottom, 16) + 16;
  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={colors.deep} />
      <View style={{ flex: 1, backgroundColor: colors.deep }}>
        <LinearGradient pointerEvents="none" colors={[alpha(glow, 0.45), alpha(glow, 0.12), alpha(colors.deep, 0)]} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 360 }} />
        <View style={{ paddingTop: Math.max(ins.top, 12) + 16, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 12, letterSpacing: 3 }}>{String(sub || '').toUpperCase()}</Text><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800', fontStyle: 'italic', marginTop: 4 }}>{title}</Text></View>
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}><Ionicons name="close" size={22} color={colors.fg} /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 10 }}>{visible ? children : null}</ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom, backgroundColor: colors.deep }}>
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{cta}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

// items: [{ kind, who:{...}, photo (source), from:{name,color,logo}, to:{...}, step, origin }]
export function TransferShow({ visible, season, items, onClose }) {
  const list = items || []; const count = (k) => list.filter((x) => x.kind === k).length;
  return (
    <Shell visible={visible} sub={`Season ${season}`} title="Transfer window" onClose={onClose} cta="Continue">
      {list.length ? (
        <Pop i={0}><View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {[['🔁', count('move'), 'moves'], ['🏁', count('retire'), 'retirements'], ['🌱', count('rookie'), 'rookies']].map(([e, n, l]) => (<View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}><Text style={{ fontSize: 18 }}>{e}</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{n}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{l}</Text></View>))}
        </View></Pop>) : null}
      {!list.length ? <Pop i={1}><Text style={{ color: colors.muted, fontSize: 17 }}>A quiet winter: nobody moved.</Text></Pop> : null}
      {list.map((x, i) => {
        const retire = x.kind === 'retire', rookie = x.kind === 'rookie'; const col = x.to?.color || x.from?.color || colors.muted;
        const head = retire ? 'Retires from racing' : rookie ? `Debut · from ${x.origin === 'Other series' ? 'another series' : x.origin}` : x.step ? 'Steps up' : 'Changes team';
        const sub = [x.who?.number != null ? `#${x.who.number}` : '', x.who?.age ? `age ${x.who.age}` : '', x.who?.ovr ? `overall ${x.who.ovr}` : '', rookie && x.who?.pot ? `potential ${x.who.pot}` : ''].filter(Boolean).join(' · ');
        return (
          <Pop key={i} i={i + 1} step={420}>
            <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: alpha(retire ? colors.muted : col, 0.18), borderWidth: 1, borderColor: alpha(retire ? colors.muted : col, 0.5), padding: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar source={x.photo} color={col} label={x.who?.number} size={58} radius={29} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'label', letterSpacing: 1.6 }}>{head.toUpperCase()}</Text>
                  <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{x.who?.last || x.who?.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{`${x.who?.first || ''}${sub ? ' · ' + sub : ''}`}</Text>
                </View>
                {retire ? <Text style={{ fontSize: 28 }}>🏁</Text> : null}
              </View>
              {!retire ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
                  {x.from ? (<><Logo src={x.from.logo} color={x.from.color} label={x.from.name} size={30} /><Text style={{ flex: 1, color: colors.muted, fontSize: 14 }} numberOfLines={1}>{x.from.name}</Text></>) : <Text style={{ flex: 1, color: colors.muted, fontSize: 14 }}>New to the grid</Text>}
                  <Ionicons name="arrow-forward" size={18} color={colors.fg} />
                  <Logo src={x.to?.logo} color={x.to?.color} label={x.to?.name} size={36} /><Text style={{ flex: 1, color: colors.fg, fontSize: 15, fontWeight: '700', textAlign: 'right' }} numberOfLines={1}>{x.to?.name}</Text>
                </View>) : (x.from ? <Text style={{ color: colors.muted, fontSize: 13 }}>{`Leaves ${x.from.name}`}</Text> : null)}
            </View>
          </Pop>);
      })}
    </Shell>
  );
}

export function ChampionShow({ visible, season, driver, photo, team, teamLogo, teamChamp, teamChampLogo, points, wins, stats, podium, teamPodium, onClose }) {
  const s = useRef(new Animated.Value(0)).current; const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) { s.setValue(0); Animated.spring(s, { toValue: 1, friction: 5, tension: 60, delay: 300, useNativeDriver: true }).start(); const loop = Animated.loop(Animated.sequence([Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(spin, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })])); loop.start(); return () => loop.stop(); } }, [visible]);
  const col = team?.color || colors.gold;
  return (
    <Shell visible={visible} sub={`Season ${season}`} title="World champion" onClose={onClose} cta="Awesome" glow={colors.gold}>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 6 }}>
        <Animated.View style={{ transform: [{ scale: s }, { translateY: spin.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
          <View style={{ padding: 6, borderRadius: 100, borderWidth: 3, borderColor: colors.gold }}><Avatar source={photo} color={col} label={driver?.number} size={170} radius={85} /></View>
        </Animated.View>
        <Pop i={2}><Text style={{ fontSize: 40, textAlign: 'center' }}>🏆</Text></Pop>
        <Pop i={3}><Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' }}>{driver?.last || driver?.name}</Text><Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center' }}>{`${driver?.first || ''}${driver?.number != null ? '  ·  #' + driver.number : ''}`}</Text></Pop>
        <Pop i={4}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Logo src={teamLogo} color={col} label={team?.name} size={34} /><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{team?.name}</Text></View></Pop>
      </View>
      {stats && stats.length ? (
        <Pop i={5}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{stats.map(([k, v]) => (<View key={k} style={{ width: '31%', flexGrow: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{String(v)}</Text><Text style={{ color: colors.muted, fontSize: 11, fontFamily: 'label', letterSpacing: 1 }}>{k.toUpperCase()}</Text></View>))}</View></Pop>) : null}
      {podium && podium.length ? (
        <Pop i={6}><View style={{ gap: 6, marginTop: 8 }}><Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>DRIVERS' TOP 3</Text>
          {podium.map((p, i) => (<View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: alpha(p.color || colors.muted, 0.2) }}><Text style={{ width: 22, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{i + 1}</Text><Avatar source={p.photo} color={p.color} label={p.number} size={34} radius={17} /><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }}>{p.points}</Text></View>))}
        </View></Pop>) : null}
      {teamPodium && teamPodium.length ? (
        <Pop i={7}><View style={{ gap: 6, marginTop: 8 }}><Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>CONSTRUCTORS' TOP 3</Text>
          {teamPodium.map((p, i) => (<View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: alpha(p.color || colors.muted, 0.2) }}><Text style={{ width: 22, color: i === 0 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{i + 1}</Text><Logo src={p.logo} color={p.color} label={p.name} size={30} /><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }}>{p.points}</Text></View>))}
        </View></Pop>) : null}
    </Shell>
  );
}

// rows: [{ key, pos, name, photo, logo, color, right }] shown from the back of the field to the front
export function SessionShow({ visible, title, sub, rows, onClose }) {
  const list = (rows || []).slice(0, 22);
  return (
    <Shell visible={visible} sub={sub} title={title} onClose={onClose} cta="Close">
      {list.map((r, idx) => (
        <Pop key={r.key} i={list.length - 1 - idx} step={r.pos <= 3 ? 90 : 110} from={30}>
          <Grad color={r.color} from={r.pos <= 3 ? 0.55 : 0.28} to={0.04} dir="h" radius={14} border={r.pos === 1 ? 0.9 : 0.3} style={[{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, r.pos === 1 && { borderColor: colors.gold }]}>
            <Text style={{ width: 30, color: r.pos === 1 ? colors.gold : colors.fg, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{r.pos}</Text>
            <Avatar source={r.photo} color={r.color} label={r.code} size={36} radius={18} />
            <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
            {r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 22, height: 22 }} /> : null}
            <Text style={{ color: colors.fg, fontSize: 14, minWidth: 70, textAlign: 'right' }} numberOfLines={1}>{r.right}</Text>
          </Grad>
        </Pop>))}
    </Shell>
  );
}
