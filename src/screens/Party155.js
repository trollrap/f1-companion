import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import ShareResult from '../components/ShareResult';
import { colors, alpha } from '../theme';
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
  if (over) { const sc = len - 1; return (<Screen header={false}><ShareResult text={`F1 Companion colour memory: ${sc} in a row`}><Card><Eyebrow>Team colour memory</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${sc} in a row`}</Text><Note>{`Best ${Math.max(best, sc)}.`}</Note></Card></ShareResult><Btn tone="solid" onPress={() => { run.current++; restart(); }}>Play again</Btn></Screen>); }
  return (
    <Screen header={false}>
      <Card><Eyebrow>Team colour memory</Eyebrow><Note>{phase === 'show' ? 'Watch the colours…' : phase === 'input' ? `Your turn: ${pos} of ${len}` : 'Next round…'}</Note><Note>{`Round ${len}. Best ${best}. Saved as you go.`}</Note></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {PADS.map(([n, c], p) => (<Pressable key={n} accessibilityRole="button" accessibilityLabel={n} onPress={() => press(p)} style={{ width: '46%', height: 130, borderRadius: 18, backgroundColor: lit === p ? c : alpha(c, 0.28), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: lit === p ? colors.fg : 'transparent' }}><Text style={{ color: lit === p ? '#000' : colors.fg, fontWeight: '800', fontSize: 16 }}>{n}</Text></Pressable>))}
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
    return { bg: shot ? (has ? alpha(colors.accent, dead ? 0.9 : 0.6) : alpha(colors.fg, 0.08)) : reveal && has ? alpha(colors.good, 0.45) : alpha(colors.fg, 0.14), txt: shot ? (has ? '✹' : '·') : '' }; };
  const grid = (ships, shots, reveal, onTap, label) => (
    <View style={{ alignSelf: 'center', gap: 3 }} accessibilityLabel={label}>
      {Array.from({ length: BN }, (_, r) => (<View key={r} style={{ flexDirection: 'row', gap: 3 }}>{Array.from({ length: BN }, (_, c) => { const i = r * BN + c; const k = cell(ships, shots, i, reveal);
        return (<Pressable key={c} disabled={!onTap} accessibilityRole={onTap ? 'button' : undefined} accessibilityLabel={`Row ${r + 1} column ${c + 1}`} onPress={() => onTap && onTap(i)} style={{ width: S, height: S, borderRadius: 6, backgroundColor: k.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontSize: S * 0.5, fontWeight: '800' }}>{k.txt}</Text></Pressable>); })}</View>))}
    </View>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Track battleship</Eyebrow><Note>{`Hunt the phone's four cars (4, 3, 3 and 2 tiles long) before it finds yours. Your fleet is placed at random. Best win: ${best ? `${best} shots` : '—'}. Saved as you go.`}</Note><Text style={{ color: colors.fg, fontSize: 15, marginTop: 6 }}>{g.msg}</Text></Card>
      <Eyebrow>Enemy waters</Eyebrow>{grid(g.foe, g.mine, done, done ? null : fire, 'Enemy waters')}
      <Eyebrow>Your fleet</Eyebrow>{grid(g.me, g.theirs, true, null, 'Your fleet')}
      {done ? <ShareResult text={`F1 Companion track battleship: ${won ? `won in ${g.mine.length} shots` : 'lost to the phone'}`}><Card><Eyebrow>{won ? 'Victory' : 'Defeat'}</Eyebrow><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800' }}>{won ? `${g.mine.length} shots` : 'Fleet sunk'}</Text></Card></ShareResult> : null}
      {done ? <Btn tone="solid" onPress={restart}>New battle</Btn> : null}
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
        <ShareResult text={txt}><Card><Eyebrow>{g.race}</Eyebrow><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{w < 0 ? 'A draw' : `Player ${w + 1} wins`}</Text><Note>{`Player 1 ${a} points, Player 2 ${b} points. Level points go to the better finishing position.`}</Note></Card></ShareResult>
        {[0, 1].map((k) => (<Card key={k}><Eyebrow>{`Player ${k + 1} · ${total(k)} pts`}</Eyebrow>{g.picks[k].map((i) => { const x = g.pool.find((y) => y.idx === i); return <Text key={i} style={{ color: colors.fg, fontSize: 15, paddingVertical: 2 }}>{`${x.name} (${x.team}): ${x.pos ? `P${x.pos}` : 'did not finish'}, ${x.pts} pts`}</Text>; })}</Card>))}
        <Btn tone="solid" onPress={restart}>New race</Btn>
      </Screen>);
  }
  return (
    <Screen header={false}>
      <Card><Eyebrow>Draft duel</Eyebrow><Note>{`A real Grand Prix is hidden. Take turns drafting ${P} drivers each. The points they scored in that race decide the winner. Saved as you go.`}</Note><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800', marginTop: 6 }}>{`Player ${g.turn + 1}, pick a driver`}</Text><Note>{`P1: ${g.picks[0].length}/${P}   P2: ${g.picks[1].length}/${P}`}</Note></Card>
      {g.pool.map((x) => { const by = g.picks[0].includes(x.idx) ? 1 : g.picks[1].includes(x.idx) ? 2 : 0;
        return (<Pressable key={x.idx} accessibilityRole="button" disabled={!!by} onPress={() => pick(x.idx)} style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: by ? colors.line : colors.accent, backgroundColor: by ? alpha(colors.fg, 0.05) : colors.card, opacity: by ? 0.6 : 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{x.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${x.team} · started P${x.grid}`}</Text></View>
          {by ? <Text style={{ color: colors.muted, fontWeight: '800' }}>{`P${by}`}</Text> : null}</Pressable>); })}
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
  const cl = (c) => (<Text style={{ color: colors.fg, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{c.label}</Text>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Tic-tac-toe grid</Eyebrow><Note>Tap a square and name a driver who fits both its row clue and its column clue. A wrong name loses your turn. Each driver can be used once. Three in a line wins. Saved as you go.</Note>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800', marginTop: 4 }}>{done ? (winner ? `Player ${winner} wins` : 'A draw') : `Player ${g.turn} (${g.turn === 1 ? 'X' : 'O'}) to move`}</Text></Card>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}><View style={{ flex: 1 }} />{g.cols.map((c, i) => <View key={i} style={{ flex: 2, justifyContent: 'center', minHeight: 44 }}>{cl(c)}</View>)}</View>
        {[0, 1, 2].map((r) => (<View key={r} style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{cl(g.rows[r])}</View>
          {[0, 1, 2].map((c) => { const i = r * 3 + c; const o = g.own[i]; const win = line && line.includes(i);
            return (<Pressable key={c} accessibilityRole="button" accessibilityLabel={`Square ${r + 1}, ${c + 1}${o ? `, taken by player ${o}` : ''}`} onPress={() => { if (!done && !o) { setSel(i); setText(''); } }} style={{ flex: 2, minHeight: 84, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1.5, borderColor: win ? colors.gold : sel === i ? colors.accent : colors.line, backgroundColor: o ? alpha(o === 1 ? colors.accent : colors.good, 0.25) : colors.card }}>
              {o ? <><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>{o === 1 ? 'X' : 'O'}</Text><Text style={{ color: colors.muted, fontSize: 10 }} numberOfLines={1}>{nameOfIdx(g.who[i])}</Text></> : null}</Pressable>); })}
        </View>))}
      </View>
      {sel !== null && !done ? (<Card><Eyebrow>{`${g.rows[Math.floor(sel / 3)].label} and ${g.cols[sel % 3].label}`}</Eyebrow>
        <TextInput value={text} onChangeText={setText} autoFocus autoCorrect={false} placeholder="Type a driver's name" placeholderTextColor={colors.muted} accessibilityLabel="Driver name" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.bg, marginTop: 6 }} />
        {hits.map((h) => (<Pressable key={h.idx} accessibilityRole="button" onPress={() => choose(h)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg, fontSize: 15 }}>{`${h.name}  ·  ${h.starts} starts`}</Text></Pressable>))}</Card>) : null}
      {g.msg ? <Note>{g.msg}</Note> : null}
      {done ? <ShareResult text={`F1 Companion tic-tac-toe grid: ${winner ? `Player ${winner} won` : 'a draw'}`}><Card><Eyebrow>Tic-tac-toe grid</Eyebrow><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800' }}>{winner ? `Player ${winner} wins` : 'A draw'}</Text></Card></ShareResult> : null}
      {done ? <Btn tone="solid" onPress={() => { setSel(null); setText(''); restart(); }}>New grid</Btn> : null}
    </Screen>);
}
