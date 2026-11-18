import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Press from '../components/Press';
import { GameHeader, ResultPanel, TurnBanner, Hint, Feedback } from '../components/GameKit';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;

// ---------- Connect four (pit lane): drop discs, four in a row wins. Against the computer or a friend. Saved on every move. ----------
const W = 7, H = 6;
const at = (b, r, c) => (r < 0 || r >= H || c < 0 || c >= W ? -1 : b[r * W + c]);
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
export function fourOf(b) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const p = b[r * W + c]; if (!p) continue;
    for (const [dr, dc] of DIRS) { let k = 1; while (k < 4 && at(b, r + dr * k, c + dc * k) === p) k++; if (k === 4) return [0, 1, 2, 3].map((j) => (r + dr * j) * W + c + dc * j); }
  }
  return null;
}
export const drop = (b, c, p) => { for (let r = H - 1; r >= 0; r--) if (!b[r * W + c]) { const n = b.slice(); n[r * W + c] = p; return [n, r * W + c]; } return null; };
const open = (b) => [3, 2, 4, 1, 5, 0, 6].filter((c) => !b[c]);
// Scores a board for player p: windows of four holding only p and blanks count by how many p discs they hold.
function score(b, p) {
  let s = 0; const q = 3 - p;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [dr, dc] of DIRS) {
    const cells = [0, 1, 2, 3].map((k) => at(b, r + dr * k, c + dc * k)); if (cells.includes(-1)) continue;
    const mine = cells.filter((x) => x === p).length, theirs = cells.filter((x) => x === q).length;
    if (mine && theirs) continue; if (mine === 3) s += 5; else if (mine === 2) s += 2; else if (theirs === 3) s -= 6; else if (theirs === 2) s -= 1;
  }
  for (let r = 0; r < H; r++) if (at(b, r, 3) === p) s += 3;
  return s;
}
function search(b, depth, a, z, me, turn) {
  if (fourOf(b)) return turn === me ? -1000 - depth : 1000 + depth;
  if (depth === 0 || !open(b).length) return score(b, me);
  if (turn === me) { let v = -1e9; for (const c of open(b)) { v = Math.max(v, search(drop(b, c, turn)[0], depth - 1, a, z, me, 3 - turn)); a = Math.max(a, v); if (a >= z) break; } return v; }
  let v = 1e9; for (const c of open(b)) { v = Math.min(v, search(drop(b, c, turn)[0], depth - 1, a, z, me, 3 - turn)); z = Math.min(z, v); if (a >= z) break; } return v;
}
export function cpuMove(b, me = 2, depth = 4) {
  let best = null, bv = -1e9; for (const c of open(b)) { const v = search(drop(b, c, me)[0], depth - 1, -1e9, 1e9, me, 3 - me); if (v > bv) { bv = v; best = c; } } return best;
}
export function ConnectFourScreen() {
  const [g, upd, restart] = useGameSave('c4', () => ({ b: Array(W * H).fill(0), turn: 1, mode: 'cpu', last: -1 }));
  const later = useTimers(); const [wins, setWins] = useState(0); const { width } = useWindowDimensions();
  useEffect(() => { kvGet('c4:best', 0).then(setWins); }, []);
  const moved = !!g && !!g.b && g.b.some(Boolean); useLeaveGuard(moved && !g.over);
  const win = useMemo(() => (g && g.b ? fourOf(g.b) : null), [g && g.b]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = !!g && !!g.b && g.b.slice(0, W).every(Boolean);
  const done = !!win || full;
  useEffect(() => { // computer reply
    if (!g || !g.b || done || g.mode !== 'cpu' || g.turn !== 2) return;
    const id = later(() => { const c = cpuMove(g.b); if (c == null) return; const [nb, i] = drop(g.b, c, 2); hap.tap(); upd({ b: nb, turn: 1, last: i }); }, 520); return () => clearTimeout(id);
  }, [g && g.turn, g && g.mode, done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (g && win && g.mode === 'cpu' && g.b[win[0]] === 1 && !g.counted) { const n = wins + 1; setWins(n); kvSet('c4:best', n); upd({ counted: true }); } }, [!!win]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g || !g.b) return <Loading />;
  const cell = Math.min(46, Math.floor((width - 32 - 12 - 6 * 4) / W));
  const play = (c) => { if (done || (g.mode === 'cpu' && g.turn !== 1)) return; const r = drop(g.b, c, g.turn); if (!r) { hap.bad(); return; } hap.tap(); upd({ b: r[0], turn: 3 - g.turn, last: r[1], over: !!fourOf(r[0]) || r[0].slice(0, W).every(Boolean) }); };
  const col = (p) => (p === 1 ? colors.accent : colors.gold);
  const who = (p) => (g.mode === 'cpu' ? (p === 1 ? 'You' : 'Computer') : `Player ${p}`);
  const wp = win ? g.b[win[0]] : 0;
  return (
    <Screen header={false}>
      <GameHeader cat="two" icon="ellipse" title="Connect four" stats={[['Wins vs CPU', wins], ['Mode', g.mode === 'cpu' ? 'CPU' : '2P']]} hint="Tap a column to drop a disc. The first to line up four, across, down or diagonally, wins. The game saves after every move. Changing the mode starts a new game." />
      {!moved ? <Segmented value={g.mode} items={[['cpu', 'Vs computer'], ['two', 'Two players']]} onChange={(m) => upd({ mode: m })} /> : null}
      {done ? <ResultPanel cat="two" win={!!win && !(g.mode === 'cpu' && wp === 2)} icon={win ? 'trophy' : 'remove-circle'} kicker="Connect four" big={win ? `${who(wp)} win${who(wp) === 'You' ? '' : 's'}` : 'A draw'} sub={win ? 'Four in a row.' : 'The board is full.'} />
        : <TurnBanner who={g.turn} color={col(g.turn)} label={g.mode === 'cpu' ? (g.turn === 1 ? 'Your move' : 'Computer is thinking…') : `Player ${g.turn}, pick a column`} />}
      <View style={{ alignSelf: 'center', padding: 6, borderRadius: 18, backgroundColor: '#1d4ed8', borderWidth: 2, borderColor: '#3b82f6' }}>
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {Array.from({ length: W }, (_, c) => (<Pressable key={c} accessibilityRole="button" accessibilityLabel={`Drop in column ${c + 1}`} onPress={() => play(c)} style={{ width: cell, height: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha('#000', 0.25) }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>▼</Text></Pressable>))}
        </View>
        {Array.from({ length: H }, (_, r) => (<View key={r} style={{ flexDirection: 'row', gap: 4, marginBottom: r < H - 1 ? 4 : 0 }}>
          {Array.from({ length: W }, (_, c) => { const i = r * W + c, p = g.b[i]; const hit = win && win.includes(i);
            return (<Pressable key={c} onPress={() => play(c)} accessible={false} style={{ width: cell, height: cell, borderRadius: cell / 2, backgroundColor: p ? col(p) : '#0b1d4d', borderWidth: hit ? 3 : g.last === i ? 2 : 0, borderColor: hit ? '#fff' : alpha('#fff', 0.7), opacity: win && !hit && p ? 0.55 : 1 }} />); })}
        </View>))}
      </View>
      {done ? <Btn tone="solid" icon="refresh" onPress={() => upd({ b: Array(W * H).fill(0), turn: 1, last: -1, over: false, counted: false })}>Play again</Btn> : <Hint>{g.mode === 'cpu' ? 'You are red. The computer looks four moves ahead.' : 'Player 1 is red, player 2 is yellow.'}</Hint>}
    </Screen>);
}

// ---------- Blackjack 21 (race edition): a normal game of blackjack with a bankroll that is saved ----------
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const val = (c) => (c.r === 0 ? 11 : Math.min(10, c.r + 1));
export function handTotal(h) { let t = h.reduce((s, c) => s + val(c), 0), a = h.filter((c) => c.r === 0).length; while (t > 21 && a-- > 0) t -= 10; return t; }
const isBJ = (h) => h.length === 2 && handTotal(h) === 21;
const newDeck = () => { const d = []; for (let k = 0; k < 2; k++) for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ r, s }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
function Card({ c, hide }) {
  const red = c && (c.s === 1 || c.s === 2);
  return (<View style={{ width: 52, height: 74, borderRadius: 9, backgroundColor: hide ? '#7a1020' : '#f6f6f2', borderWidth: hide ? 2 : 0, borderColor: '#e8a33d', alignItems: 'center', justifyContent: 'center' }}>
    {hide ? <Text style={{ color: '#e8a33d', fontSize: 22, fontWeight: '900' }}>F1</Text> : (<><Text style={{ color: red ? '#c4122f' : '#111', fontSize: 20, fontWeight: '800' }}>{RANKS[c.r]}</Text><Text style={{ color: red ? '#c4122f' : '#111', fontSize: 20 }}>{SUITS[c.s]}</Text></>)}</View>);
}
const START = 1000;
const fresh = () => ({ bank: START, bet: 50, deck: newDeck(), you: [], dealer: [], phase: 'bet', msg: '', peak: START, hands: 0 });
export function BlackjackScreen() {
  const [g, upd, restart] = useGameSave('bj', fresh); const [best, setBest] = useState(START);
  useEffect(() => { kvGet('bj:best', START).then(setBest); }, []);
  useLeaveGuard(!!g && g.phase === 'play');
  if (!g || !g.deck) return <Loading />;
  const settle = (you, dealer, deck, bet, bank, hands, peak, why) => {
    const y = handTotal(you), d = handTotal(dealer); let delta = 0, msg;
    if (y > 21) { delta = -bet; msg = `Bust with ${y}. You lose ${bet}.`; }
    else if (isBJ(you) && !isBJ(dealer)) { delta = Math.floor(bet * 1.5); msg = `Blackjack! You win ${delta}.`; }
    else if (d > 21) { delta = bet; msg = `Dealer busts with ${d}. You win ${bet}.`; }
    else if (isBJ(dealer) && !isBJ(you)) { delta = -bet; msg = `Dealer has blackjack. You lose ${bet}.`; }
    else if (y > d) { delta = bet; msg = `${y} beats ${d}. You win ${bet}.`; }
    else if (y < d) { delta = -bet; msg = `${d} beats ${y}. You lose ${bet}.`; }
    else msg = `Both on ${y}. Push, your bet comes back.`;
    const nb = bank + delta; const np = Math.max(peak, nb); hap[delta > 0 ? 'good' : delta < 0 ? 'bad' : 'tap']();
    if (np > best) { setBest(np); kvSet('bj:best', np); }
    upd({ you, dealer, deck, bank: nb, bet: Math.min(bet, Math.max(nb, 0)) || 0, phase: 'done', msg: why ? `${why} ${msg}` : msg, last: delta, peak: np, hands: hands + 1, over: nb <= 0 });
  };
  const deal = () => {
    let deck = g.deck.length < 20 ? newDeck() : g.deck.slice(); const you = [deck.pop(), deck.pop()], dealer = [deck.pop(), deck.pop()]; hap.tap();
    if (isBJ(you) || isBJ(dealer)) settle(you, dealer, deck, g.bet, g.bank, g.hands, g.peak); else upd({ you, dealer, deck, phase: 'play', msg: '' });
  };
  const finish = (you, deck, bet, why) => { const dealer = g.dealer.slice(); const dk = deck.slice(); if (handTotal(you) <= 21) while (handTotal(dealer) < 17) dealer.push(dk.pop()); settle(you, dealer, dk, bet, g.bank, g.hands, g.peak, why); };
  const hit = () => { const dk = g.deck.slice(); const you = [...g.you, dk.pop()]; hap.tap(); if (handTotal(you) >= 21) finish(you, dk, g.bet); else upd({ you, deck: dk }); };
  const stand = () => finish(g.you, g.deck, g.bet);
  const dbl = () => { const dk = g.deck.slice(); const you = [...g.you, dk.pop()]; finish(you, dk, g.bet * 2, 'Doubled down.'); };
  const next = () => upd({ you: [], dealer: [], phase: 'bet', msg: '', bet: Math.min(g.bet, g.bank) });
  const playing = g.phase === 'play'; const bank = g.bank;
  return (
    <Screen header={false}>
      <GameHeader cat="two" icon="albums" title="Blackjack 21" stats={[['Bankroll', bank], ['Best', best], ['Hands', g.hands]]} hint="Get closer to 21 than the dealer without going over. Aces count 11 or 1, face cards 10. Blackjack pays 3 to 2, the dealer stands on every 17, and you can double down on your first two cards. The bankroll is saved. If it hits zero the game resets." />
      {g.over ? (<>
        <ResultPanel cat="two" win={false} icon="flag" kicker="Blackjack 21" big="Out of chips" sub={`${g.hands} hands played. Peak bankroll ${g.peak}.`} />
        <Btn tone="solid" icon="refresh" onPress={() => restart()}>{`Start again with ${START}`}</Btn></>) : (<>
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: '#0e3b2a', borderWidth: 1, borderColor: alpha(colors.good, 0.5), gap: 12 }}>
          <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{`DEALER${g.dealer.length ? ` · ${playing ? val(g.dealer[0]) : handTotal(g.dealer)}` : ''}`}</Text>
          <View style={{ flexDirection: 'row', gap: 8, minHeight: 74 }}>{g.dealer.map((c, i) => <Card key={i} c={c} hide={playing && i === 1} />)}</View>
          <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{`YOU${g.you.length ? ` · ${handTotal(g.you)}` : ''}`}</Text>
          <View style={{ flexDirection: 'row', gap: 8, minHeight: 74, flexWrap: 'wrap' }}>{g.you.map((c, i) => <Card key={i} c={c} />)}</View>
        </View>
        {g.msg ? <Feedback ok={(g.last || 0) >= 0}>{g.msg}</Feedback> : null}
        {g.phase === 'bet' ? (<>
          <TurnBanner who={1} label={`Place your bet: ${g.bet}`} color={colors.gold} />
          <View style={{ flexDirection: 'row', gap: 8 }}>{[10, 50, 100, 250].map((v) => (<Press key={v} onPress={() => upd({ bet: Math.min(v, bank) })} style={{ flex: 1 }}><View style={{ paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: g.bet === Math.min(v, bank) ? alpha(colors.gold, 0.3) : colors.card, borderWidth: 1.5, borderColor: g.bet === Math.min(v, bank) ? colors.gold : colors.line }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{v}</Text></View></Press>))}</View>
          <Btn tone="solid" icon="play" onPress={deal}>Deal</Btn></>) : null}
        {playing ? (<View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Btn tone="solid" icon="add" onPress={hit}>Hit</Btn></View>
          <View style={{ flex: 1 }}><Btn icon="hand-left" onPress={stand}>Stand</Btn></View>
          {g.you.length === 2 && bank >= g.bet * 2 ? <View style={{ flex: 1 }}><Btn icon="flash" onPress={dbl}>Double</Btn></View> : null}</View>) : null}
        {g.phase === 'done' ? <Btn tone="solid" icon="refresh" onPress={next}>Next hand</Btn> : null}
        <Hint>One deck pair, reshuffled when it runs low.</Hint></>)}
    </Screen>);
}
