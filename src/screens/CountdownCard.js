import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import Grad from '../components/Grad';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { StatHeader } from '../components/StatRows';
import { useSeason, useNow } from '../hooks/useSeason';
import { useFavs } from '../hooks/useFavs';
import { useTeamColor } from '../hooks/useTeams';
import { dateRange, shortName, flag } from '../lib/time';
import { colors, alpha } from '../theme';

// A shareable picture of the countdown to the next session in the colour of your favourite team (or the app colour). The picture is a snapshot of the moment you share it.
const parts = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60]; };
const two = (n) => String(n).padStart(2, '0');
export default function CountdownCardScreen() {
  const season = useSeason(); const now = useNow(); const favs = useFavs(); const tc = useTeamColor(); const [target, setTarget] = useState('race'); const [style, setStyle] = useState('lock');
  const next = season.next; const sessions = season.sessions || [];
  if (!next) return <Screen header={false}><StatHeader title="Countdown card" icon="timer" note="A picture of the countdown to the next race to share." /><Note>The next race could not be loaded yet. Connect to the internet and open this again.</Note></Screen>;
  const race = sessions.find((x) => /^race$/i.test(x.session_name)); const up = sessions.find((x) => Date.parse(x.date_start) > now);
  const sess = target === 'race' ? (race || up) : (up || race); const when = sess ? Date.parse(sess.date_start) : Date.parse(next.date_start); const label = sess ? sess.session_name : 'Lights out';
  const col = (favs.teams && favs.teams[0] && tc(favs.teams[0])) || colors.accent; const p = parts(when - now); const over = when <= now;
  const big = [[p[0], 'DAYS'], [two(p[1]), 'HRS'], [two(p[2]), 'MIN'], [two(p[3]), 'SEC']];
  return (
    <Screen header={false}>
      <StatHeader title="Countdown card" icon="timer" note="A picture of the countdown in your favourite team's colour, ready to share or use as a wallpaper. The numbers are frozen at the moment you press Share." />
      <Segmented value={target} items={[['race', 'The race'], ['next', 'Next session']]} onChange={setTarget} />
      <Segmented value={style} items={[['lock', 'Lock screen'], ['poster', 'Poster']]} onChange={setStyle} />
      <ShareCard title={`${shortName(next.meeting_name)}: ${p[0]} days ${p[1]} hours to ${label}`}>
        {style === 'lock' ? (
          <Grad color={col} from={0.5} to={0.04} border={0.5} radius={26} style={{ padding: 22, minHeight: 330, justifyContent: 'space-between' }}>
            <View><Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 12, letterSpacing: 3 }}>{`ROUND ${next.round}`}</Text>
              <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800', fontStyle: 'italic', marginTop: 4 }}>{`${flag(next.country_code)} ${shortName(next.meeting_name)}`}</Text>
              <Text style={{ color: colors.onSoft, fontSize: 15, marginTop: 2 }}>{dateRange(next)}</Text></View>
            <View>
              <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 12, letterSpacing: 3, marginBottom: 8 }}>{over ? `${label.toUpperCase()} IS ON` : `${label.toUpperCase()} IN`}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>{big.map(([v, l]) => (<View key={l} style={{ flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: alpha('#000', 0.35), borderWidth: 1, borderColor: alpha(col, 0.6) }}><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{over ? '0' : v}</Text><Text style={{ color: colors.onSoft, fontSize: 10, letterSpacing: 2 }}>{l}</Text></View>))}</View>
            </View>
            <Text style={{ color: alpha(colors.fg, 0.5), fontSize: 11, letterSpacing: 2 }}>F1 COMPANION</Text>
          </Grad>) : (
          <View style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: col, padding: 24, minHeight: 330, justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', opacity: 0.8, fontFamily: 'label', fontSize: 12, letterSpacing: 3 }}>{`${flag(next.country_code)}  ${shortName(next.meeting_name).toUpperCase()}`}</Text>
            <View><Text style={{ color: '#fff', fontSize: 110, fontWeight: '900', fontStyle: 'italic', lineHeight: 112 }}>{over ? '0' : p[0]}</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', fontStyle: 'italic' }}>{`${p[0] === 1 ? 'DAY' : 'DAYS'} ${two(p[1])}H ${two(p[2])}M`}</Text></View>
            <Text style={{ color: '#fff', opacity: 0.85, fontSize: 14, fontWeight: '700' }}>{`until ${label.toLowerCase()} · ${dateRange(next)}`}</Text>
          </View>)}
      </ShareCard>
      <Note>Pick a favourite team in the Paddock to change the colour.</Note>
    </Screen>);
}
