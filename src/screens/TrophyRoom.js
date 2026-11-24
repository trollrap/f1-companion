import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import { kvGet } from '../lib/kv';
import { loadCards } from '../lib/cards';
import PlayCalendar from '../components/PlayCalendar';

// key = the card-pack key the game awards once, so a trophy is earned exactly when the pack was.
export const TROPHIES = [
  ['tf:10', 'Swipe master', '10 true or false answers in a row', 'swap-horizontal'], ['flag:9', 'Flag expert', '9 or more of 10 in the flag quiz', 'flag'],
  ['radio:7', 'Radio operator', '7 or more of 8 on team radio', 'radio'], ['num:9', 'Number cruncher', '9 or more in the number quiz', 'calculator'],
  ['duel:10', 'Duel winner', '10 career duels in a row', 'people'], ['cn:350', 'Sharp guesser', '350 points in Closest number', 'locate'],
  ['wg:7', 'Race caller', '7 or more winners guessed', 'trophy'], ['hm:5', 'Wordsmith', '5 hangman words in a row', 'text'],
  ['lap:2', 'Lap perfect', 'A clean run in Lap tapper', 'repeat'], ['pit:fast', 'Pit crew', 'A fast pit stop', 'timer'],
  ['cx:win', 'Connector', 'Solved Connections', 'git-network'], ['gd:win', 'Driver detective', 'Solved Driver wordle', 'search'], ['tl:great', 'Time traveller', '16 or more in Timeline sorter', 'time'], ['season:8', 'Historian', '8 or more in Name that season', 'calendar'], ['path:8', 'Career spotter', '8 or more in Career path', 'git-branch'], ['sd:15', 'Stat machine', '15 right in Stat showdown', 'flash'], ['pairs:10', 'Sharp memory', 'Match pairs in 10 moves or fewer', 'copy'], ['odd:9', 'Sharp eye', '9 or more in Odd one out', 'eye'], ['bingo:line', 'Bingo!', 'A line on the race weekend bingo', 'grid'], ['streak:7', 'Week streak', 'Played 7 days in a row', 'flame'], ['streak:30', 'Month streak', 'Played 30 days in a row', 'rocket'],
];
export const BESTS = [['c4:best', 'Connect four wins'], ['bj:best', 'Blackjack peak bankroll'], ['mate:best', 'Team-mate quiz'], ['tf:best', 'True or false streak'], ['flag:best', 'Flag quiz'], ['radio:best', 'Team radio'], ['num:best', 'Number quiz'], ['duel:best', 'Career duel streak'], ['cn:best', 'Closest number'], ['wg:best', 'Winner guess'], ['hm:best', 'Hangman streak'], ['lap:best', 'Lap tapper'], ['circuit:best', 'Guess the circuit'], ['tl:best', 'Timeline sorter'], ['odd:best', 'Odd one out'], ['season:best', 'Name that season'], ['path:best', 'Career path'], ['sd:best', 'Stat showdown']];

export default function TrophyRoomScreen() {
  const [have, setHave] = useState(null); const [best, setBest] = useState({});
  useFocusEffect(useCallback(() => { loadCards().then((m) => setHave(m.keys || {})).catch(() => setHave({})); Promise.all(BESTS.map(([k]) => kvGet(k, 0))).then((v) => setBest(Object.fromEntries(BESTS.map(([k], i) => [k, v[i]])))); }, []));
  const n = have ? TROPHIES.filter((t) => have[t[0]]).length : 0;
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>Trophy room</Eyebrow><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{`${n} / ${TROPHIES.length}`}</Text><Note>Earned in the games. Each one also gave you a card pack.</Note></Card>
      <PlayCalendar />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {TROPHIES.map(([k, name, how, icon], i) => { const got = !!(have && have[k]);
          return (<View key={k} style={{ width: '48%' }}><Reveal index={i}><View accessible accessibilityLabel={`${name}. ${how}. ${got ? 'Earned' : 'Not earned yet'}`} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: got ? colors.gold : colors.line, backgroundColor: got ? alpha(colors.gold, 0.14) : colors.card, minHeight: 130 }}>
            <Ionicons name={got ? icon : 'lock-closed'} size={30} color={got ? colors.gold : colors.muted} />
            <Text style={{ color: got ? colors.fg : colors.muted, fontWeight: '800', fontSize: 16, marginTop: 6 }}>{name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{how}</Text></View></Reveal></View>); })}
      </View>
      <Eyebrow>Personal bests</Eyebrow>
      <Card>{BESTS.filter(([k]) => typeof best[k] === 'number' && best[k] > 0).length ? BESTS.filter(([k]) => typeof best[k] === 'number' && best[k] > 0).map(([k, l]) => (<View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}><Text style={{ color: colors.fg }}>{l}</Text><Text style={{ color: colors.accentText, fontWeight: '800' }}>{String(best[k])}</Text></View>)) : <Note>Play a game and your best scores show up here.</Note>}</Card>
    </Screen>);
}
