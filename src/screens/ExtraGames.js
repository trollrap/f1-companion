import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Share, Animated, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors, alpha } from '../theme';
import { kvGet, kvSet, seedOf, rngOf } from '../lib/kv';
import { awardPack, loadCards } from '../lib/cards';
import { shareImage, canShareImage } from '../lib/exportImage';
import * as hap from '../lib/haptics';
import { makeFact } from '../lib/tfFacts';

// ---------- Flag and country quiz: a flag, four countries ----------
const toFlag = (cc) => String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)));
// Every country that has hosted a Grand Prix or produced a driver, with its two-letter code.
const COUNTRIES = [['Australia', 'AU'], ['Austria', 'AT'], ['Azerbaijan', 'AZ'], ['Bahrain', 'BH'], ['Belgium', 'BE'], ['Brazil', 'BR'], ['Canada', 'CA'], ['China', 'CN'], ['Denmark', 'DK'], ['Finland', 'FI'], ['France', 'FR'], ['Germany', 'DE'], ['Hungary', 'HU'], ['India', 'IN'], ['Italy', 'IT'], ['Japan', 'JP'], ['Mexico', 'MX'], ['Monaco', 'MC'], ['Netherlands', 'NL'], ['New Zealand', 'NZ'], ['Portugal', 'PT'], ['Qatar', 'QA'], ['Russia', 'RU'], ['Saudi Arabia', 'SA'], ['Singapore', 'SG'], ['South Africa', 'ZA'], ['Spain', 'ES'], ['Sweden', 'SE'], ['Switzerland', 'CH'], ['Thailand', 'TH'], ['Turkey', 'TR'], ['United Arab Emirates', 'AE'], ['United Kingdom', 'GB'], ['United States', 'US'], ['Argentina', 'AR'], ['Poland', 'PL'], ['Venezuela', 'VE'], ['Colombia', 'CO'], ['Chile', 'CL'], ['Indonesia', 'ID'], ['Malaysia', 'MY'], ['Morocco', 'MA'], ['Ireland', 'IE'], ['Czech Republic', 'CZ'], ['Uruguay', 'UY'], ['Rhodesia', null]].filter((x) => x[1]);
const N = 10;
export function FlagQuizScreen() {
  const [seed, setSeed] = useState(1); const [i, setI] = useState(0); const [score, setScore] = useState(0); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('flag:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { const r = rngOf(seedOf(`flag${seed}${Date.now()}`)); const shuf = (a) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
    return shuf(COUNTRIES).slice(0, N).map((c) => ({ c, opts: shuf([c, ...shuf(COUNTRIES.filter((x) => x !== c)).slice(0, 3)]) })); }, [seed]);
  const done = i >= N; const cur = rounds[Math.min(i, N - 1)];
  const answer = (o) => { if (pick || done) return; setPick(o[0]); const ok = o === cur.c; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) setScore(sc);
    setTimeout(async () => { setPick(null); setI((x) => x + 1); if (i + 1 >= N) { if (sc > best) { setBest(sc); kvSet('flag:best', sc); } if (sc >= 9) setGot(await awardPack('flag:9')); } }, 900); };
  const again = () => { setSeed((s) => s + 1); setI(0); setScore(0); setPick(null); setGot(false); };
  if (done) return (
    <Screen header={false}>
      <Card><Eyebrow>Flag quiz</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{score} / {N}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{score === N ? 'Perfect. Every flag.' : score >= 8 ? 'Sharp eye.' : score >= 5 ? 'Solid, a few slipped by.' : 'Back to the atlas.'} Best: {Math.max(best, score)} / {N}</Text>
        <View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card>
      {got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}
      <Note>Score 9 or more once to earn a card pack.</Note>
    </Screen>);
  return (
    <Screen header={false}>
      <Card style={{ alignItems: 'center' }}><Eyebrow>{`Flag ${i + 1} of ${N}  ·  score ${score}`}</Eyebrow>
        <Text style={{ fontSize: 96, marginVertical: 10 }}>{toFlag(cur.c[1])}</Text><Text style={{ color: colors.muted }}>Which country is this?</Text></Card>
      {cur.opts.map((o) => { const right = pick && o === cur.c; const wrong = pick === o[0] && o !== cur.c;
        return (<Pressable key={o[0]} accessibilityRole="button" onPress={() => answer(o)} style={({ pressed }) => [{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: right ? colors.good : wrong ? colors.red : colors.line, backgroundColor: right ? alpha(colors.good, 0.18) : wrong ? alpha(colors.red, 0.18) : colors.card }, pressed && { opacity: 0.8 }]}>
          <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o[0]}</Text></Pressable>); })}
    </Screen>);
}

// ---------- Year in review: everything you did in the app this year, as one shareable card ----------
const lines = (a) => a.filter((x) => x[1] != null && x[1] !== 0 && x[1] !== '0');
export function YearReviewScreen() {
  const [d, setD] = useState(null); const ref = useRef(null); const [msg, setMsg] = useState('');
  useEffect(() => { (async () => {
    const lights = await kvGet('lights:v1', { best: null, list: [] }); const circuit = await kvGet('circuit:best', 0); const flagBest = await kvGet('flag:best', 0);
    const cards = await loadCards().catch(() => ({ owned: {}, opened: 0 })); const fan = await kvGet('fanDaily', { streak: 0, best: 0, scores: {} }); const hl = await kvGet('fanHL', null);
    let preds = {}; try { preds = JSON.parse((await AsyncStorage.getItem('predictions')) || '{}') || {}; } catch {}
    let quiz = 0; try { quiz = Number(await AsyncStorage.getItem('quizBest')) || 0; } catch {}
    let favs = {}; try { favs = JSON.parse((await AsyncStorage.getItem('favs')) || '{}') || {}; } catch {}
    setD({ lights, circuit, flagBest, cards, fan, hl, preds, quiz, favs });
  })(); }, []);
  if (!d) return <Screen header={false}><Note>Collecting your year…</Note></Screen>;
  const owned = Object.keys(d.cards.owned || {}).length; const nPred = Object.keys(d.preds).length;
  const nFav = (Array.isArray(d.favs.drivers) ? d.favs.drivers.length : 0) + (Array.isArray(d.favs.teams) ? d.favs.teams.length : 0);
  const rows = lines([
    ['Best reaction time', d.lights.best != null ? `${(d.lights.best / 1000).toFixed(3)} s` : null], ['Lights-out attempts', (d.lights.list || []).length],
    ['Predictions made', nPred], ['Cards collected', owned], ['Packs opened', d.cards.opened],
    ['Daily quiz streak (best)', d.fan.best], ['F1 quiz best', d.quiz ? `${d.quiz} pts` : null], ['Guess the circuit best', d.circuit ? `${d.circuit} pts` : null], ['Flag quiz best', d.flagBest ? `${d.flagBest} / 10` : null],
    ['Favourites followed', nFav],
  ]);
  const text = `My F1 Companion year\n${rows.map((r) => `${r[0]}: ${r[1]}`).join('\n')}`;
  const share = async () => { setMsg(''); const r = canShareImage() ? await shareImage(ref) : 'unavailable'; if (r === 'unavailable' || r === 'error') { try { await Share.share({ message: text }); } catch {} } };
  return (
    <Screen header={false}>
      <View ref={ref} collapsable={false} style={{ padding: 16, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1, borderColor: alpha(colors.accent, 0.5), gap: 4 }}>
        <Eyebrow color={colors.accent}>Your year in review</Eyebrow>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900', fontStyle: 'italic', marginBottom: 8 }}>F1 Companion</Text>
        {rows.length ? rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: alpha(colors.fg, 0.08) }}>
            <Text style={{ color: colors.muted, fontSize: 15, flex: 1 }}>{k}</Text><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '800' }}>{String(v)}</Text></View>))
          : <Text style={{ color: colors.muted }}>Nothing here yet. Play a game, make a prediction or open a pack, then come back.</Text>}
      </View>
      <Btn icon="share-outline" onPress={share}>Share this card</Btn>
      <Note>Built from what is stored on this phone: games, predictions, cards and favourites. Nothing is sent anywhere.</Note>
    </Screen>);
}

// ---------- True or false: statements written from the offline race history, so every answer is checked against data ----------
export function TrueFalseScreen() {
  const rr = useRef(rngOf(seedOf(`tf${Date.now()}`))).current; const [fact, setFact] = useState(() => { try { return makeFact(rr); } catch { return null; } });
  const [streak, setStreak] = useState(0); const [best, setBest] = useState(0); const [res, setRes] = useState(null); const [over, setOver] = useState(false); const [got, setGot] = useState(false);
  const x = useRef(new Animated.Value(0)).current; const live = useRef({}); live.current = { fact, res, streak, best };
  useEffect(() => { kvGet('tf:best', 0).then(setBest); }, []);
  const answer = (v) => { const L = live.current; if (!L.fact || L.res) return; const ok = v === L.fact.truth; ok ? hap.good() : hap.bad(); setRes({ ok, v });
    Animated.timing(x, { toValue: v ? 400 : -400, duration: 220, useNativeDriver: true }).start();
    setTimeout(async () => { if (ok) { const n = L.streak + 1; setStreak(n); if (n > L.best) { setBest(n); kvSet('tf:best', n); } if (n >= 10) setGot(await awardPack('tf:10')); setRes(null); x.setValue(0); try { setFact(makeFact(rr)); } catch { setFact(null); } } else setOver(true); }, 1500); };
  const pan = useRef(PanResponder.create({ onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8, onPanResponderMove: (_, g) => { if (!live.current.res) x.setValue(g.dx); }, onPanResponderRelease: (_, g) => { if (g.dx > 90) answer(true); else if (g.dx < -90) answer(false); else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(); } })).current;
  const again = () => { setStreak(0); setOver(false); setRes(null); setGot(false); x.setValue(0); try { setFact(makeFact(rr)); } catch { setFact(null); } };
  if (!fact) return <Screen header={false}><Note>Could not make a statement from the history.</Note></Screen>;
  if (over) return (<Screen header={false}><Card><Eyebrow>True or false</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{`Streak ${streak}`}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`Best streak: ${best}`}</Text><Text style={{ color: colors.fg, marginTop: 10 }}>{fact.text}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{`${fact.truth ? 'True' : 'False'}. ${fact.why}`}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card><Note>A streak of 10 earns a card pack.</Note></Screen>);
  const tilt = x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-8deg', '0deg', '8deg'] });
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Streak ${streak}  ·  best ${best}`}</Eyebrow><Text style={{ color: colors.muted, marginTop: 6 }}>Swipe the card right for true, left for false, or use the buttons.</Text></Card>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }, { rotate: tilt }] }}>
        <Card><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', lineHeight: 32, paddingVertical: 20 }}>{fact.text}</Text>
          {res ? <Text style={{ color: res.ok ? colors.good : colors.red, fontWeight: '800' }}>{res.ok ? 'Correct. ' : 'Wrong. '}<Text style={{ color: colors.muted, fontWeight: '500' }}>{fact.why}</Text></Text> : null}</Card>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => answer(false)} style={({ pressed }) => [{ flex: 1, padding: 18, borderRadius: 14, alignItems: 'center', backgroundColor: alpha(colors.red, 0.2), borderWidth: 1, borderColor: colors.red }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 17 }}>False</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => answer(true)} style={({ pressed }) => [{ flex: 1, padding: 18, borderRadius: 14, alignItems: 'center', backgroundColor: alpha(colors.good, 0.2), borderWidth: 1, borderColor: colors.good }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 17 }}>True</Text></Pressable>
      </View>
      {got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}
    </Screen>);
}
