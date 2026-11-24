import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Press from '../components/Press';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad from '../components/Grad';
import ShareCard from '../components/ShareCard';
import { colors } from '../theme';
import { useFavs } from '../hooks/useFavs';
import { kvGet } from '../lib/kv';
import { loadCards } from '../lib/cards';
import { localDriverInfo, localCareer, teamNameOf } from '../api/history';
import { TROPHIES, BESTS } from './TrophyRoom';
import { currentVersion } from '../lib/update';

const nice = (id) => String(id || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export default function MyCardScreen() {
  const nav = useNavigation();
  const favs = useFavs(); const [d, setD] = useState(null);
  useFocusEffect(useCallback(() => { let off = false;
    (async () => { const m = await loadCards().catch(() => ({ owned: {}, keys: {} })); const keys = m.keys || {};
      const bests = []; for (const [k, l] of BESTS) { const v = await kvGet(k, 0); if (typeof v === 'number' && v > 0) bests.push([l, v]); }
      if (!off) setD({ trophies: TROPHIES.filter((t) => keys[t[0]]).length, cards: Object.keys(m.owned || {}).length, bests: bests.sort((a, b) => b[1] - a[1]).slice(0, 4) }); })();
    return () => { off = true; }; }, []));
  const did = favs.drivers[0]; const tid = favs.teams[0]; let drv = null, car = null;
  try { if (did) { drv = localDriverInfo(did); car = localCareer(did); } } catch {}
  let team = ''; try { team = tid ? teamNameOf(tid) : ''; } catch {} if (team === tid) team = nice(tid);
  const dn = drv ? drv.name : did ? nice(did) : '';
  return (
    <Screen header={false}>
      <ShareCard title={`My F1 Companion card: ${dn || 'no favourite yet'}${team ? ` · ${team}` : ''}${d ? ` · ${d.trophies}/${TROPHIES.length} trophies` : ''}`}>
        <Grad color={colors.accent} from={0.5} to={0.06} border={0.5} style={{ padding: 18, gap: 10 }}>
          <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>MY F1 CARD</Text>
          <View><Text style={{ color: colors.muted, fontSize: 12 }}>Favourite driver</Text><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{dn || 'Not chosen yet'}</Text>{car ? <Text style={{ color: colors.onSoft, fontSize: 13 }}>{`${car.wins} wins · ${car.podiums} podiums · ${car.races} starts`}</Text> : null}</View>
          <View><Text style={{ color: colors.muted, fontSize: 12 }}>Favourite team</Text><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{team || 'Not chosen yet'}</Text></View>
          {d ? (<View style={{ flexDirection: 'row', gap: 18 }}>
            <View><Text style={{ color: colors.gold, fontSize: 24, fontWeight: '800' }}>{`${d.trophies}/${TROPHIES.length}`}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Trophies</Text></View>
            <View><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>{d.cards}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Cards</Text></View>
          </View>) : null}
          {d && d.bests.length ? (<View style={{ gap: 2 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Best scores</Text>{d.bests.map(([l, v]) => (<View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 14 }}>{l}</Text><Text style={{ color: colors.fg, fontSize: 14, fontWeight: '800' }}>{v}</Text></View>))}</View>) : null}
          <Text style={{ color: colors.muted, fontSize: 11 }}>{`F1 Companion ${currentVersion()}`}</Text>
        </Grad>
      </ShareCard>
      {!did || !tid ? <Note>Pick a favourite driver and team (the star on their pages) and they show up here.</Note> : null}
      <Press onPress={() => nav.navigate('Profile')} accessibilityLabel="Edit my profile"><View style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accentText, fontWeight: '800' }}>Create or edit my profile</Text></View></Press>
    </Screen>);
}
