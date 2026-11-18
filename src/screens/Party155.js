import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import ShareResult from '../components/ShareResult';
import { GameHeader, ResultPanel, TurnBanner, Hint, Feedback } from '../components/GameKit';
import { Ionicons } from '@expo/vector-icons';
import { catOf } from '../lib/gameCatalog';
import { colors, alpha, teamColor } from '../theme';
import { norm } from '../lib/names';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';
import { bingoSearch, gridDuelCard, gridFits, draftRace, nameOfIdx } from '../api/history';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;

// ---------- Team colour memory: watch the pads flash, repeat the order. The sequence is saved. ----------
const PADS = [['Ferrari', '#e10600'], ['McLaren', '#ff8000'], ['Mercedes', '#27f4d2'], ['Red Bull', '#3671c6']];
export function ColourMemoryScreen() {
  const [g, upd, restart] = useGameSave('simon', () => ({ seq: [Math.floor(Math.random() * 4)] })); const later = useTimers();
  const [phase, setPhase] = useState('show'); const [lit, setLit] = useState(-1); const [pos, setPos] = useState(0); const [best, setBest] = useState(0); const run = useRef(0);
  useEffect(() => { kvGet('simon:best', 0).then(setBest); }, []);
  const len = g && g.seq ? g.seq.length : 0; const over = !!g && !!g.over;
  useEffect(() => {
    if (!g || !g.seq || over) return;
    const id = ++run.current; setPhase('show'); setPos(0); const seq = g.seq;
    seq.forEach((p, k) => { later(() => { if (run.current === id) setLit(p); }, 700 + 600 * k); later(() => { if (run.current === id) setLit(-1); }, 700 + 600 * k + 380); });
    later(() => { if (run.current === id) setPhase('input'); }, 700 + 600 * seq.length);
  }, [len, over]); // eslint-disable-line react-hooks/exhaustive-deps
  useLeaveGuard(!!g && !over && len > 1);
  if (!g || !g.seq) return <Loading />;
  const press = (p) => {
    if (phase !== 'input') return; setLit(p); later(() => setLit(-1), 160); hap.tap();
    if (p === g.seq[pos]) { const n = pos + 1; if (n === len) { hap.good(); setPhase('wait'); upd({ seq: [...g.seq, Math.floor(Math.random() * 4)] }); } else setPos(n); }
    else { hap.bad(); const sc = len - 1; upd({ over: true }); if (sc > best) { setBest(sc); kvSet('simon:best', sc); } }
  };
  if (over) { const sc = len - 1; return (<Screen header={false}><ShareResult text={`F1 Companion colour memory: ${sc} in a row`}><ResultPanel cat="puzzle" win={sc > 0} icon="color-palette" kicker="Team colour memory" big={`${sc} in a row`} sub={`Best ${Math.max(best, sc)}`} best={sc > 0 && sc >= best} /></ShareResult><Btn tone="solid" icon="refresh" onPress={() => { run.current++; restart(); }}>Play again</Btn></Screen>); }
  return (
    <Screen header={false}>
      <GameHeader cat="puzzle" icon="color-palette" title="Team colour memory" hint="Watch the pads light up, then repeat the order. One more colour every round. Saved as you go." stats={[['Round', len], ['In a row', Math.max(0, len - 1)], ['Best', best]]} />
      <View style={{ alignItems: 'center', padding: 8 }}><Text style={{ color: phase === 'input' ? colors.good : colors.onSoft, fontSize: 18, fontWeight: '800' }}>{phase === 'show' ? 'Watch…' : phase === 'input' ? `Your turn  ${pos} / ${len}` : 'Correct!'}</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {PADS.map(([n, c], p) => (<Pressable key={n} accessibilityRole="button" accessibilityLabel={n} onPress={() => press(p)} style={{ width: '47%', height: 140, borderRadius: 22, backgroundColor: lit === p ? c : alpha(c, 0.22), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: lit === p ? '#fff' : alpha(c, 0.6), shadowColor: c, shadowOpacity: lit === p ? 0.9 : 0, shadowRadius: 24, elevation: lit === p ? 10 : 0 }}><Ionicons name="car-sport" size={34} color={lit === p ? '#000' : alpha(c, 0.9)} /><Text style={{ color: lit === p ? '#000' : colors.fg, fontWeight: '800', fontSize: 16, marginTop: 6 }}>{n}</Text></Pressable>))}
      </View>
    </Screen>);
}

// ---------- Track battleship: 8 by 8 grid, four cars each (4, 3, 3, 2 tiles). Random placement for both sides. ----------
const BN = 8, LENS = [4, 3, 3, 2];
function place(r) { const taken = new Set(); const ships = []; LENS.forEach((L) => { for (let t = 0; t < 200; t++) { const h = r() < 0.5; const row = Math.floor(r() * (h ? BN : BN - L + 1)), col = Math.floor(r() * (h ? BN - L + 1 : BN)); const cells = Array.from({ length: L }, (_, k) => (h ? row * BN + col + k : (row + k) * BN + col)); if (cells.some((c) => taken.has(c))) continue; cells.forEach((c) => taken.add(c)); ships.push(cells); break; } }); return ships; }
const sunk = (ships, shots) => ships.filter((s) => s.every((c) => shots.includes(c)));
const allSunk = (ships, shots) => sunk(ships, shots).length === ships.length;
function aiShot(myShips, shots, r) {
  const open = Array.from({ length: BN * BN }, (_, i) => i).filter((i) => !shots.includes(i)); const done = new Set(sunk(myShips, shots).flat());
  const live = shots.filter((c) => myShips.some((s) => s.includes(c)) && !done.has(c));
  const near = []; live.forEach((c) => { const row = Math.floor(c / BN), col = c % BN; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { const y = row + a, x = col + b; if (y >= 0 && y < BN && x >= 0 && x < BN && open.includes(y * BN + x)) near.push(y * BN + x); }); });
  const pool = near.length ? near : (open.filter((i) => (Math.floor(i / BN) + (i % BN)) % 2 === 0).length ? open.filter((i) => (Math.floor(i / BN) + (i % BN)) % 2 === 0) : open);
  return pool[Math.floor(r() * pool.length)];
}
export function BattleshipScreen() {
  const [g, upd, restart] = useGameSave('battle', () => { const r = Math.random; return { me: place(r), foe: place(r), mine: [], theirs: [], msg: 'Your move: tap a tile in the enemy waters.' }; });
  const [best, setBest] = useState(0); const { width } = useWindowDimensions(); const S = Math.floor((Math.min(width - 32, 400) - 7 * 3) / BN);
  useEffect(() => { kvGet('battle:best', 0).then(setBest); }, []);
  useLeaveGuard(!!g && !g.over && g.mine && g.mine.length > 0);
  if (!g || !g.me) return <Loading />;
  const won = allSunk(g.foe, g.mine), lost = allSunk(g.me, g.theirs); const done = won || lost;
  const fire = (i) => {
    if (done || g.mine.includes(i)) return; const mine = [...g.mine, i]; const hit = g.foe.some((s) => s.includes(i)); const was = sunk(g.foe, g.mine).length; const now = sunk(g.foe, mine).length;
    let msg = now > was ? 'You sank a car!' : hit ? 'Hit!' : 'Miss.'; hit ? hap.good() : hap.tap();
    if (allSunk(g.foe, mine)) { upd({ mine, msg: 'You sank the whole fleet!', over: true }); if (!best || mine.length < best) { setBest(mine.length); kvSet('battle:best', mine.length); } return; }
    const t = aiShot(g.me, g.theirs, Math.random); const theirs = [...g.theirs, t]; const ah = g.me.some((s) => s.includes(t)); const asunk = sunk(g.me, theirs).length > sunk(g.me, g.theirs).length;
    msg += ` The phone fired${asunk ? ' and sank one of your cars!' : ah ? ' and hit you.' : ' and missed.'}`; if (allSunk(g.me, theirs)) { msg = 'The phone sank your fleet.'; upd({ mine, theirs, msg, over: true }); return; }
    upd({ mine, theirs, msg });
  };
  const cell = (ships, shots, i, reveal) => { const has = ships.some((s) => s.includes(i)); const shot = shots.includes(i); const dead = has && sunk(ships, shots).some((s) => s.includes(i));
    return { bg: shot ? (has ? alpha(colors.accent, dead ? 0.95 : 0.65) : alpha('#4da3ff', 0.1)) : reveal && has ? alpha('#9aa4b8', 0.55) : alpha('#4da3ff', 0.2), icon: shot ? (has ? (dead ? 'skull' : 'flame') : null) : null, dot: shot && !has, border: shot && has ? colors.accent : alpha('#4da3ff', 0.35) }; };
  const grid = (ships, shots, reveal, onTap, label) => (
    <View style={{ alignSelf: 'center', gap: 3, padding: 6, borderRadius: 16, backgroundColor: alpha('#0a2540', 0.55), borderWidth: 1, borderColor: alpha('#4da3ff', 0.3) }} accessibilityLabel={label}>
      {Array.from({ length: BN }, (_, r) => (<View key={r} style={{ flexDirection: 'row', gap: 3 }}>{Array.from({ length: BN }, (_, c) => { const i = r * BN + c; const k = cell(ships, shots, i, reveal);
        return (<Pressable key={c} disabled={!onTap} accessibilityRole={onTap ? 'button' : undefined} accessibilityLabel={`Row ${r + 1} column ${c + 1}`} onPress={() => onTap && onTap(i)} style={{ width: S, height: S, borderRadius: 7, backgroundColor: k.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: k.border }}>{k.icon ? <Ionicons name={k.icon} size={S * 0.55} color="#fff" /> : k.dot ? <View style={{ width: S * 0.18, height: S * 0.18, borderRadius: S * 0.09, backgroundColor: alpha('#fff', 0.5) }} /> : null}</Pressable>); })}</View>))}
    </View>);
  const mySunk = sunk(g.me, g.theirs).length, foeSunk = sunk(g.foe, g.mine).length;
  return (
    <Screen header={false}>
      <GameHeader cat="arcade" icon="locate" title="Track battleship" hint="Hunt the phone's four cars (4, 3, 3 and 2 tiles long) before it finds yours. Your fleet is placed at random. Fewest shots is the best score. Saved as you go." stats={[['Your shots', g.mine.length], ['Cars sunk', `${foeSunk}/4`], ['Best', best ? `${best}` : '—']]} />
      <Feedback ok={!/missed|Miss|sank your|hit you/.test(g.msg || '')}>{g.msg}</Feedback>
      <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>ENEMY WATERS</Text>{grid(g.foe, g.mine, done, done ? null : fire, 'Enemy waters')}
      <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{`YOUR FLEET  ·  ${4 - mySunk} OF 4 LEFT`}</Text>{grid(g.me, g.theirs, true, null, 'Your fleet')}
      {done ? <ShareResult text={`F1 Companion track battleship: ${won ? `won in ${g.mine.length} shots` : 'lost to the phone'}`}><ResultPanel cat="arcade" win={won} icon={won ? 'trophy' : 'skull'} kicker={won ? 'Victory' : 'Defeat'} big={won ? `${g.mine.length} shots` : 'Fleet sunk'} best={won && g.mine.length <= best} /></ShareResult> : null}
      {done ? <Btn tone="solid" icon="refresh" onPress={restart}>New battle</Btn> : null}
    </Screen>);
}

// ---------- Draft duel (pass and play): take turns drafting drivers from one hidden real race; the race's points decide. ----------
export function DraftDuelScreen() {
  const [g, upd, restart] = useGameSave('draft', () => { const d = draftRace(rngOf(seedOf(`dr${Date.now()}`))); return d ? { ...d, picks: [[], []], turn: 0 } : null; });
  useLeaveGuard(!!g && !g.over && g.picks && g.picks[0].length + g.picks[1].length > 0);
  if (!g) return <Loading />;
  if (!g.pool) return <Screen header={false}><Note>The built-in history could not build a draft.</Note></Screen>;
  const P = 3; const taken = new Set([...g.picks[0], ...g.picks[1]]); const total = (k) => g.picks[k].reduce((s, i) => s + (g.pool.find((x) => x.idx === i)?.pts || 0), 0);
  const done = g.picks[0].length >= P && g.picks[1].length >= P;
  const best = (k) => Math.min(...g.picks[k].map((i) => { const x = g.pool.find((y) => y.idx === i); return x && x.pos ? x.pos : 99; }));
  const pick = (idx) => { if (done || taken.has(idx)) return; hap.tap(); const picks = [[...g.picks[0]], [...g.picks[1]]]; picks[g.turn].push(idx); const fin = picks[0].length >= P && picks[1].length >= P; upd({ picks, turn: 1 - g.turn, over: fin }); };
  if (done) {
    const a = total(0), b = total(1); const w = a !== b ? (a > b ? 0 : 1) : best(0) !== best(1) ? (best(0) < best(1) ? 0 : 1) : -1; const txt = `F1 Companion draft duel (${g.race}): Player 1 ${a} pts, Player 2 ${b} pts${w < 0 ? ', a draw' : `, Player ${w + 1} wins`}`;
    return (
      <Screen header={false}>
        <ShareResult text={txt}><ResultPanel cat="two" win={w >= 0} icon="trophy" kicker={g.race} big={w < 0 ? 'A draw' : `Player ${w + 1} wins`} sub={`${a} points to ${b}. Level points go to the better finishing position.`} /></ShareResult>
        {[0, 1].map((k) => (<View key={k} style={{ padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: alpha(k ? colors.good : colors.accent, w === k ? 0.9 : 0.3), gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: k ? colors.good : colors.accent, fontFamily: 'label', fontSize: 12, letterSpacing: 2 }}>{`PLAYER ${k + 1}`}</Text><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{`${total(k)} pts`}</Text></View>
          {g.picks[k].map((i) => { const x = g.pool.find((y) => y.idx === i); return (<View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: teamColor(x.tid) }} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{x.team}</Text></View><Text style={{ color: colors.fg, fontSize: 14, fontWeight: '800' }}>{`${x.pos ? `P${x.pos}` : 'DNF'}  ·  ${x.pts}`}</Text></View>); })}
        </View>))}
        <Btn tone="solid" icon="refresh" onPress={restart}>New race</Btn>
      </Screen>);
  }
  return (
    <Screen header={false}>
      <GameHeader cat="two" icon="people" title="Draft duel" hint={`A real Grand Prix is hidden. Take turns drafting ${P} drivers each. The points they scored in that race decide the winner. Saved as you go.`} stats={[['P1 picks', `${g.picks[0].length}/${P}`], ['P2 picks', `${g.picks[1].length}/${P}`]]} />
      <TurnBanner who={g.turn + 1} label={`Player ${g.turn + 1}, pick a driver`} />
      {g.pool.map((x) => { const by = g.picks[0].includes(x.idx) ? 1 : g.picks[1].includes(x.idx) ? 2 : 0; const tc = teamColor(x.tid);
        return (<Pressable key={x.idx} accessibilityRole="button" accessibilityLabel={`${x.name}, ${x.team}, started P${x.grid}`} disabled={!!by} onPress={() => pick(x.idx)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: by ? alpha(by === 1 ? colors.accent : colors.good, 0.6) : colors.line, backgroundColor: pressed ? alpha(tc, 0.25) : by ? alpha(by === 1 ? colors.accent : colors.good, 0.1) : colors.card, opacity: by ? 0.7 : 1 })}>
          <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: tc }} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{x.team}</Text></View>
          {by ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: by === 1 ? colors.accent : colors.good, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{by}</Text></View> : <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }}>{`P${x.grid}`}</Text><Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1 }}>GRID</Text></View>}</Pressable>); })}
    </Screen>);
}

// ---------- Tic-tac-toe grid (two players): a square is yours if you name a driver who fits its row clue and its column clue ----------
const L8 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function GridDuelScreen() {
  const [g, upd, restart] = useGameSave('ttt', () => { const c = gridDuelCard(rngOf(seedOf(`tt${Date.now()}`))); return c ? { rows: c.rows, cols: c.cols, own: Array(9).fill(0), who: Array(9).fill(-1), turn: 1, msg: '' } : null; });
  const [sel, setSel] = useState(null); const [text, setText] = useState('');
  const hits = useMemo(() => (sel === null ? [] : bingoSearch(text, norm)), [sel, text]);
  const line = g && g.own ? L8.find((l) => l.every((k) => g.own[k] === g.own[l[0]] && g.own[l[0]])) : null; const full = !!g && !!g.own && g.own.every(Boolean); const done = !!line || full;
  useLeaveGuard(!!g && !!g.own && !done && g.own.some(Boolean));
  if (!g) return <Loading />;
  if (!g.rows) return <Screen header={false}><Note>The built-in history could not build a grid.</Note></Screen>;
  const used = new Set(g.who.filter((x) => x >= 0));
  const choose = (h) => {
    if (used.has(h.idx)) { upd({ msg: `${h.name} is already on the grid.` }); return; }
    const r = Math.floor(sel / 3), c = sel % 3; const ok = gridFits(g.rows[r], g.cols[c], h.idx);
    if (ok) { hap.good(); const own = [...g.own]; own[sel] = g.turn; const who = [...g.who]; who[sel] = h.idx; const w = L8.some((l) => l.every((k) => own[k] === g.turn)); upd({ own, who, turn: 3 - g.turn, msg: `${h.name} fits. ${w ? '' : `Player ${3 - g.turn}'s turn.`}`, over: w || own.every(Boolean) }); setSel(null); setText(''); }
    else { hap.bad(); upd({ turn: 3 - g.turn, msg: `${h.name} does not fit. Player ${3 - g.turn}'s turn.` }); setSel(null); setText(''); }
  };
  const winner = line ? g.own[line[0]] : 0;
  const cl = (c) => (<View style={{ paddingHorizontal: 6, paddingVertical: 6, borderRadius: 10, backgroundColor: alpha(catOf('two').color, 0.18), alignItems: 'center', justifyContent: 'center', minHeight: 44 }}><Text style={{ color: colors.fg, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>{c.label}</Text></View>);
  if (done) return (
    <Screen header={false}>
      <ShareResult text={`F1 Companion tic-tac-toe grid: ${winner ? `Player ${winner} won` : 'a draw'}`}><ResultPanel cat="two" win={!!winner} icon={winner ? 'trophy' : 'remove-circle'} kicker="Tic-tac-toe grid" big={winner ? `Player ${winner} wins` : 'A draw'} /></ShareResult>
      <Btn tone="solid" icon="refresh" onPress={() => { setSel(null); setText(''); restart(); }}>New grid</Btn>
    </Screen>);
  return (
    <Screen header={false}>
      <GameHeader cat="two" icon="grid" title="Tic-tac-toe grid" hint="Tap a square and name a driver who fits both its row clue and its column clue. A wrong name loses your turn. Each driver can be used once. Three in a line wins. Saved as you go." stats={[['Player 1', 'X'], ['Player 2', 'O']]} />
      <TurnBanner who={g.turn} label={`Player ${g.turn} (${g.turn === 1 ? 'X' : 'O'}) to move`} />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}><View style={{ width: 78 }} />{g.cols.map((c, i) => <View key={i} style={{ flex: 1 }}>{cl(c)}</View>)}</View>
        {[0, 1, 2].map((r) => (<View key={r} style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ width: 78, justifyContent: 'center' }}>{cl(g.rows[r])}</View>
          {[0, 1, 2].map((c) => { const i = r * 3 + c; const o = g.own[i]; const tone = o === 1 ? colors.accent : colors.good;
            return (<Pressable key={c} accessibilityRole="button" accessibilityLabel={`Square ${r + 1}, ${c + 1}${o ? `, taken by player ${o}` : ''}`} onPress={() => { if (!o) { setSel(i); setText(''); } }} style={{ flex: 1, aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1.5, borderColor: sel === i ? colors.fg : o ? alpha(tone, 0.7) : colors.line, backgroundColor: o ? alpha(tone, 0.22) : colors.card }}>
              {o ? <><Text style={{ color: tone, fontFamily: 'display', fontSize: 34, fontWeight: '800' }}>{o === 1 ? 'X' : 'O'}</Text><Text style={{ color: colors.onSoft, fontSize: 10 }} numberOfLines={1}>{nameOfIdx(g.who[i])}</Text></> : <Ionicons name="add" size={22} color={alpha(colors.fg, 0.25)} />}</Pressable>); })}
        </View>))}
      </View>
      {sel !== null ? (<View style={{ padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: alpha(catOf('two').color, 0.5), gap: 6 }}><Text style={{ color: catOf('two').color, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{`${g.rows[Math.floor(sel / 3)].label}  +  ${g.cols[sel % 3].label}`.toUpperCase()}</Text>
        <TextInput value={text} onChangeText={setText} autoFocus autoCorrect={false} placeholder="Type a driver's name" placeholderTextColor={colors.muted} accessibilityLabel="Driver name" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.bg }} />
        {hits.map((h) => (<Pressable key={h.idx} accessibilityRole="button" onPress={() => choose(h)} style={{ paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>{h.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${h.starts} starts`}</Text></Pressable>))}</View>) : null}
      {g.msg ? <Feedback ok={/fits\./.test(g.msg) && !/not fit/.test(g.msg)}>{g.msg}</Feedback> : null}
    </Screen>);
}
