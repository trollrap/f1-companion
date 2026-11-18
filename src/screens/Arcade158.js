import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, PanResponder, AppState, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import ShareResult from '../components/ShareResult';
import { GameHeader, ResultPanel, TurnBanner, Hint } from '../components/GameKit';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet } from '../lib/kv';
import { useGameSave, useLeaveGuard, useTimers } from '../lib/gameSave';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;

// ---------- Snake (DRS trail): steer the trail, collect DRS tokens, never touch the wall or your own trail ----------
const COLS = 14, ROWS = 18;
const mk = () => ({ body: [[7, 9], [6, 9], [5, 9]], dir: [1, 0], food: [11, 9], score: 0, over: false });
export const foodFor = (body) => { const free = []; for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (!body.some((s) => s[0] === x && s[1] === y)) free.push([x, y]); return free.length ? free[Math.floor(Math.random() * free.length)] : null; };
// One step. Returns the next state, or { over: true } when the head hits a wall or the trail (the tail square counts as free unless the snake just ate).
export function stepSnake(g, want) {
  const dir = want && !(want[0] === -g.dir[0] && want[1] === -g.dir[1]) ? want : g.dir; const h = g.body[0]; const n = [h[0] + dir[0], h[1] + dir[1]];
  if (n[0] < 0 || n[1] < 0 || n[0] >= COLS || n[1] >= ROWS) return { ...g, dir, over: true };
  const ate = g.food && n[0] === g.food[0] && n[1] === g.food[1]; const body = [n, ...g.body]; if (!ate) body.pop();
  if (body.slice(1).some((s) => s[0] === n[0] && s[1] === n[1])) return { ...g, dir, over: true };
  if (ate) { const f = foodFor(body); return { ...g, dir, body, score: g.score + 1, food: f, over: !f }; }
  return { ...g, dir, body };
}
export function SnakeScreen() {
  const [g, upd, restart, ref] = useGameSave('snake', mk); const [best, setBest] = useState(0); const [, force] = useState(0); const [paused, setPaused] = useState(true);
  const want = useRef(null); const { width } = useWindowDimensions(); const cell = Math.floor(Math.min(width - 32, 380) / COLS);
  useEffect(() => { kvGet('snake:best', 0).then(setBest); }, []);
  const started = !!g && (g.score > 0 || g.body.length !== 3 || g.moved);
  useLeaveGuard(!!g && !g.over && g.score > 0);
  const save = () => { if (ref.current) kvSet('game:snake', { g: ref.current }); };
  const steer = (d) => { want.current = d; if (ref.current && !ref.current.over) { ref.current = { ...ref.current, moved: true }; setPaused(false); } };
  const pan = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => true, onPanResponderRelease: (e, s) => { const ax = Math.abs(s.dx), ay = Math.abs(s.dy); if (Math.max(ax, ay) < 14) { setPaused((p) => !p); return; } steer(ax > ay ? [s.dx > 0 ? 1 : -1, 0] : [0, s.dy > 0 ? 1 : -1]); } })).current;
  const live = !!g && !g.over && !paused;
  useEffect(() => {
    if (!live) return undefined;
    const ms = Math.max(70, 150 - (ref.current ? ref.current.score : 0) * 3);
    const id = setInterval(() => {
      const cur = ref.current; if (!cur || cur.over) return; const nx = stepSnake(cur, want.current); want.current = null;
      if (nx.over) { ref.current = nx; setPaused(true); hap.bad(); const sc = nx.score; kvGet('snake:best', 0).then((b) => { if (sc > b) { kvSet('snake:best', sc); setBest(sc); } }); kvSet('game:snake', { g: nx }); force((n) => n + 1); return; }
      ref.current = { ...nx, moved: true }; if (nx.score !== cur.score) { hap.tap(); save(); }
      force((n) => n + 1);
    }, ms);
    return () => clearInterval(id);
  }, [live, ref.current && ref.current.score]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') { setPaused(true); save(); } }); return () => { sub.remove(); save(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g || !g.body) return <Loading />;
  const cur = ref.current || g;
  return (
    <Screen header={false}>
      <GameHeader cat="arcade" icon="git-branch" title="Snake (DRS trail)" stats={[['Score', cur.score], ['Best', best]]} hint="Swipe the board or use the arrows to steer. Collect the gold DRS tokens to grow the trail and speed up. Hitting the wall or your own trail ends the run. Tap the board to pause. Your run is saved when you leave." />
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={{ width: cell * COLS, height: cell * ROWS, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d1117', borderWidth: 2, borderColor: alpha(colors.accent, 0.6) }}>
          {Array.from({ length: ROWS }, (_, y) => (y % 2 ? <View key={y} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y * cell, height: cell, backgroundColor: alpha('#fff', 0.03) }} /> : null))}
          {cur.food ? <View pointerEvents="none" style={{ position: 'absolute', left: cur.food[0] * cell + 2, top: cur.food[1] * cell + 2, width: cell - 4, height: cell - 4, borderRadius: cell / 2, backgroundColor: colors.gold, borderWidth: 2, borderColor: '#fff6' }} /> : null}
          {cur.body.map((s, i) => (<View key={i} pointerEvents="none" style={{ position: 'absolute', left: s[0] * cell + 1, top: s[1] * cell + 1, width: cell - 2, height: cell - 2, borderRadius: i === 0 ? cell / 2.5 : 4, backgroundColor: i === 0 ? '#fff' : colors.accent, opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.03), borderWidth: i === 0 ? 2 : 0, borderColor: colors.accent }} />))}
          {paused && !cur.over ? <View pointerEvents="none" style={{ ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, backgroundColor: alpha('#000', 0.55), alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ionicons name="play-circle" size={54} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{started ? 'Paused. Tap to go' : 'Tap or swipe to start'}</Text></View> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>{[['left', 'arrow-back', [-1, 0]], ['up', 'arrow-up', [0, -1]], ['down', 'arrow-down', [0, 1]], ['right', 'arrow-forward', [1, 0]]].map(([d, ic, v]) => (<Pressable key={d} accessibilityRole="button" accessibilityLabel={`Steer ${d}`} onPress={() => steer(v)} style={{ width: 62, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}><Ionicons name={ic} size={22} color={colors.fg} /></Pressable>))}</View>
      {cur.over ? <ShareResult text={`F1 Companion Snake: ${cur.score} DRS tokens`}><ResultPanel cat="arcade" win={cur.score >= best && cur.score > 0} icon="git-branch" kicker="Run over" big={`${cur.score}`} sub={`DRS tokens collected. Best ${Math.max(best, cur.score)}.`} /></ShareResult> : null}
      <Btn tone={cur.over ? 'solid' : undefined} icon="refresh" onPress={() => { want.current = null; restart(); setPaused(true); }}>New run</Btn>
    </Screen>);
}

// ---------- Checkers (English draughts): forced captures, multi-jumps, kings. Against the computer or a friend. Saved on every move. ----------
// Board: 64 squares, index r * 8 + c, only the dark squares (r + c odd) are used. 1 = your man (moves up), 3 = your king, 2 = computer man (moves down), 4 = its king.
export const startBoard = () => { const b = Array(64).fill(0); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) { if (r < 3) b[r * 8 + c] = 2; else if (r > 4) b[r * 8 + c] = 1; } return b; };
const mine = (p, x) => (p === 1 ? x === 1 || x === 3 : x === 2 || x === 4);
const isKing = (x) => x === 3 || x === 4;
const dirsOf = (x) => (isKing(x) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : x === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const crowns = (p, r) => (p === 1 ? r === 0 : r === 7);
// Every legal move for side p as { from, to, caps }. When any capture exists, only captures are legal. A man that reaches the far row ends its turn.
export function genMoves(b, p) {
  const jumps = [], steps = [];
  for (let i = 0; i < 64; i++) {
    const x = b[i]; if (!mine(p, x)) continue;
    const dfs = (pos, piece, caps, board) => {
      let any = false; const r = Math.floor(pos / 8), c = pos % 8;
      for (const [dr, dc] of dirsOf(piece)) {
        const or = r + dr, oc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc; if (!inb(lr, lc)) continue; const o = or * 8 + oc, l = lr * 8 + lc;
        if (board[o] && !mine(p, board[o]) && !board[l] && !caps.includes(o)) {
          any = true; const nb = board.slice(); nb[o] = 0; const crowned = !isKing(piece) && crowns(p, lr); const np = crowned ? (p === 1 ? 3 : 4) : piece;
          if (crowned) jumps.push({ from: i, to: l, caps: [...caps, o] }); else dfs(l, np, [...caps, o], nb);
        }
      }
      if (!any && caps.length) jumps.push({ from: i, to: pos, caps });
    };
    const base = b.slice(); base[i] = 0; dfs(i, x, [], base);
    const r = Math.floor(i / 8), c = i % 8;
    for (const [dr, dc] of dirsOf(x)) { const nr = r + dr, nc = c + dc; if (inb(nr, nc) && !b[nr * 8 + nc]) steps.push({ from: i, to: nr * 8 + nc, caps: [] }); }
  }
  return jumps.length ? jumps : steps;
}
export function applyMove(b, m) {
  const nb = b.slice(); const x = nb[m.from]; nb[m.from] = 0; m.caps.forEach((o) => { nb[o] = 0; });
  const p = x === 1 || x === 3 ? 1 : 2; nb[m.to] = !isKing(x) && crowns(p, Math.floor(m.to / 8)) ? (p === 1 ? 3 : 4) : x; return nb;
}
function evalB(b, me) {
  let s = 0; for (let i = 0; i < 64; i++) { const x = b[i]; if (!x) continue; const p = x === 1 || x === 3 ? 1 : 2; const r = Math.floor(i / 8); const adv = p === 1 ? 7 - r : r; const v = isKing(x) ? 170 : 100 + adv * 3; s += p === me ? v : -v; } return s;
}
function ab(b, depth, a, z, me, turn) {
  const mv = genMoves(b, turn); if (!mv.length) return turn === me ? -10000 - depth : 10000 + depth; if (depth === 0) return evalB(b, me);
  if (turn === me) { let v = -1e9; for (const m of mv) { v = Math.max(v, ab(applyMove(b, m), depth - 1, a, z, me, 3 - turn)); a = Math.max(a, v); if (a >= z) break; } return v; }
  let v = 1e9; for (const m of mv) { v = Math.min(v, ab(applyMove(b, m), depth - 1, a, z, me, 3 - turn)); z = Math.min(z, v); if (a >= z) break; } return v;
}
export function aiMove(b, me = 2, depth = 5) {
  const mv = genMoves(b, me); if (!mv.length) return null; let best = mv[0], bv = -1e9;
  mv.forEach((m) => { const v = ab(applyMove(b, m), depth - 1, -1e9, 1e9, me, 3 - me) + Math.random() * 0.5; if (v > bv) { bv = v; best = m; } }); return best;
}
const freshC = () => ({ b: startBoard(), turn: 1, mode: 'cpu', sel: -1, idle: 0, last: null, over: false });
export function CheckersScreen() {
  const [g, upd, , ref] = useGameSave('chk', freshC); const later = useTimers(); const [wins, setWins] = useState(0); const { width } = useWindowDimensions();
  useEffect(() => { kvGet('chk:best', 0).then(setWins); }, []);
  const moves = useMemo(() => (g && g.b ? genMoves(g.b, g.turn) : []), [g && g.b, g && g.turn]); // eslint-disable-line react-hooks/exhaustive-deps
  const moved = !!g && !!g.b && g.last != null; useLeaveGuard(moved && !g.over);
  const finish = (nb, turn, idle) => { const none = !genMoves(nb, turn).length; if (none) return { over: true, winner: 3 - turn }; if (idle >= 80) return { over: true, winner: 0 }; return {}; };
  const play = (m) => { const cur = ref.current; const nb = applyMove(cur.b, m); const idle = m.caps.length || isKing(cur.b[m.from]) !== isKing(nb[m.to]) ? 0 : cur.idle + 1; const turn = 3 - cur.turn; hap.tap(); upd({ b: nb, turn, sel: -1, idle, last: [m.from, m.to], ...finish(nb, turn, idle) }); };
  useEffect(() => { // computer reply
    if (!g || !g.b || g.over || g.mode !== 'cpu' || g.turn !== 2) return undefined;
    const id = later(() => { const m = aiMove(ref.current.b, 2); if (m) play(m); }, 600); return () => clearTimeout(id);
  }, [g && g.turn, g && g.mode, g && g.over]); // eslint-disable-line react-hooks/exhaustive-deps
  const winCounted = useRef(false);
  useEffect(() => { if (g && g.over && g.winner === 1 && g.mode === 'cpu' && !winCounted.current) { winCounted.current = true; const n = wins + 1; setWins(n); kvSet('chk:best', n); } if (g && !g.over) winCounted.current = false; }, [g && g.over]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g || !g.b) return <Loading />;
  const S = Math.floor(Math.min(width - 32, 400) / 8); const myTurn = !g.over && (g.mode === 'two' || g.turn === 1);
  const selMoves = g.sel >= 0 ? moves.filter((m) => m.from === g.sel) : []; const movable = new Set(moves.map((m) => m.from));
  const tap = (i) => {
    if (!myTurn) return; const m = selMoves.find((x) => x.to === i); if (m) { play(m); return; }
    if (mine(g.turn, g.b[i]) && movable.has(i)) upd({ sel: g.sel === i ? -1 : i }); else if (g.sel >= 0) upd({ sel: -1 });
  };
  const col = (p) => (p === 1 ? colors.accent : '#e6e6e6');
  const who = (p) => (g.mode === 'cpu' ? (p === 1 ? 'You' : 'Computer') : `Player ${p}`);
  const forced = moves.length && moves[0].caps.length;
  return (
    <Screen header={false}>
      <GameHeader cat="two" icon="grid" title="Checkers" stats={[['Wins vs CPU', wins], ['Mode', g.mode === 'cpu' ? 'CPU' : '2P']]} hint="Tap a piece, then tap where it should land. Pieces move diagonally forward; kings go both ways. If you can jump an opponent you must, and a jump can chain. Reach the far row to become a king. The side that cannot move loses. Saved after every move." />
      {!moved ? <Segmented value={g.mode} items={[['cpu', 'Vs computer'], ['two', 'Two players']]} onChange={(m) => upd({ mode: m })} /> : null}
      {g.over ? <ResultPanel cat="two" win={g.winner === 1 || (g.mode === 'two' && g.winner > 0)} icon={g.winner ? 'trophy' : 'remove-circle'} kicker="Checkers" big={g.winner ? `${who(g.winner)} win${who(g.winner) === 'You' ? '' : 's'}` : 'A draw'} sub={g.winner ? 'The other side cannot move.' : 'Forty moves each without a capture or a crown.'} />
        : <TurnBanner who={g.turn} color={col(g.turn)} label={g.mode === 'cpu' ? (g.turn === 1 ? (forced ? 'Your move. You must capture' : 'Your move') : 'Computer is thinking…') : `${who(g.turn)}${forced ? ' must capture' : ', your move'}`} />}
      <View style={{ alignSelf: 'center', borderRadius: 10, overflow: 'hidden', borderWidth: 3, borderColor: '#5a3b22' }}>
        {Array.from({ length: 8 }, (_, r) => (<View key={r} style={{ flexDirection: 'row' }}>{Array.from({ length: 8 }, (_, c) => { const i = r * 8 + c, dark = (r + c) % 2 === 1, x = g.b[i]; const tgt = selMoves.some((m) => m.to === i); const last = g.last && (g.last[0] === i || g.last[1] === i);
          return (<Pressable key={c} accessibilityLabel={x ? `${mine(1, x) ? 'red' : 'white'} ${isKing(x) ? 'king' : 'piece'}` : dark ? 'empty square' : undefined} onPress={() => tap(i)} style={{ width: S, height: S, backgroundColor: dark ? (last ? '#6b4a2b' : '#4a2f1b') : '#e2c79a', alignItems: 'center', justifyContent: 'center' }}>
            {tgt ? <View style={{ width: S * 0.34, height: S * 0.34, borderRadius: S, backgroundColor: alpha(colors.good, 0.9) }} /> : null}
            {x ? <View style={{ width: S * 0.8, height: S * 0.8, borderRadius: S, backgroundColor: col(mine(1, x) ? 1 : 2), borderWidth: g.sel === i ? 3 : 2, borderColor: g.sel === i ? colors.good : alpha('#000', 0.35), alignItems: 'center', justifyContent: 'center', opacity: !g.over && myTurn && mine(g.turn, x) && !movable.has(i) ? 0.6 : 1 }}>{isKing(x) ? <Text style={{ color: mine(1, x) ? '#fff' : '#333', fontSize: S * 0.42, fontWeight: '900' }}>♛</Text> : null}</View> : null}
          </Pressable>); })}</View>))}
      </View>
      {g.over ? <Btn tone="solid" icon="refresh" onPress={() => upd({ ...freshC(), mode: g.mode })}>Play again</Btn> : <Hint>{g.mode === 'cpu' ? 'You are red and move up. The computer looks five moves ahead.' : 'Red moves up, white moves down. Pass the phone after each move.'}</Hint>}
    </Screen>);
}
