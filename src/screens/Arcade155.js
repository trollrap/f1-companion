/* global cancelAnimationFrame */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, PanResponder, AppState, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import ShareResult from '../components/ShareResult';
import { GameHeader, ResultPanel, Hint } from '../components/GameKit';
import { Ionicons } from '@expo/vector-icons';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet } from '../lib/kv';
import { useGameSave, useLeaveGuard } from '../lib/gameSave';

const Loading = () => <Screen header={false}><Note>Loading…</Note></Screen>;

// ---------- Slipstream dodge: three lanes, swipe or tap to change lane. Only the best distance is saved (the run is real time). ----------
const LANES = 3, CAR_H = 58, CAR_W = 34;
export function SlipstreamScreen() {
  const { width } = useWindowDimensions(); const W = Math.min(width - 32, 360), H = 440, LW = W / LANES, PY = H - CAR_H - 20;
  const [phase, setPhase] = useState('ready'); const [, tick] = useState(0); const [best, setBest] = useState(0); const [lane, setLaneS] = useState(1);
  const winW = useRef(width); winW.current = width;
  const R = useRef({ cars: [], lane: 1, dist: 0, t: 0, spawn: 0.6, id: 0, raf: 0, last: 0, over: false });
  useEffect(() => { kvGet('slip:best', 0).then(setBest); }, []);
  useEffect(() => () => { cancelAnimationFrame(R.current.raf); }, []);
  useEffect(() => { const sub = AppState.addEventListener('change', (st) => { if (st !== 'active' && R.current.raf) { cancelAnimationFrame(R.current.raf); R.current.raf = 0; R.current.over = true; setPhase('over'); } }); return () => sub.remove(); }, []);
  const setLane = (l) => { const n = Math.max(0, Math.min(LANES - 1, l)); R.current.lane = n; setLaneS(n); };
  const end = () => { const r = R.current; cancelAnimationFrame(r.raf); r.raf = 0; r.over = true; hap.bad(); const d = Math.floor(r.dist); setPhase('over'); setBest((b) => { if (d > b) { kvSet('slip:best', d); return d; } return b; }); };
  const frame = (ts) => {
    const r = R.current; if (r.over) return; const dt = Math.min(0.05, r.last ? (ts - r.last) / 1000 : 0.016); r.last = ts; r.t += dt;
    const speed = 200 + Math.min(260, r.dist * 0.35); r.dist += (speed * dt) / 12;
    r.spawn -= dt; if (r.spawn <= 0) { const n = Math.random() < Math.min(0.45, 0.1 + r.dist / 1500) ? 2 : 1; const free = Math.floor(Math.random() * LANES); const ls = [0, 1, 2].filter((x) => x !== free); const use = n === 2 ? ls : [ls[Math.floor(Math.random() * 2)]]; use.forEach((l) => { r.cars.push({ id: r.id++, lane: l, y: -CAR_H - 10, c: ['#f5c400', colors.good, colors.purple, '#4da3ff', '#ff8c42'][r.id % 5] }); }); r.spawn = Math.max(0.42, 1.0 - r.dist / 900); }
    r.cars.forEach((c) => { c.y += speed * dt; }); r.cars = r.cars.filter((c) => c.y < H + 10);
    if (r.cars.some((c) => c.lane === r.lane && c.y + CAR_H - 6 > PY + 6 && c.y + 6 < PY + CAR_H)) { tick((x) => x + 1); end(); return; }
    tick((x) => x + 1); r.raf = requestAnimationFrame(frame);
  };
  const start = () => { const r = R.current; cancelAnimationFrame(r.raf); Object.assign(r, { cars: [], lane: 1, dist: 0, t: 0, spawn: 0.6, last: 0, over: false }); setLaneS(1); setPhase('run'); r.raf = requestAnimationFrame(frame); };
  const pan = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => true, onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) > 24) setLane(R.current.lane + (g.dx > 0 ? 1 : -1)); else setLane(R.current.lane + (g.x0 > winW.current / 2 ? 1 : -1)); } })).current;
  const r = R.current; const d = Math.floor(r.dist);
  const off = (r.dist * 7) % 60;
  const Car = ({ c, me, x, y }) => (
    <View style={{ position: 'absolute', left: x, top: y, width: CAR_W, height: CAR_H, borderRadius: 10, backgroundColor: c, borderWidth: me ? 3 : 0, borderColor: colors.accent, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 }}>
      <View style={{ position: 'absolute', left: 5, right: 5, top: me ? 12 : 30, height: 14, borderRadius: 4, backgroundColor: alpha('#000', 0.55) }} />
      <View style={{ position: 'absolute', left: 3, top: me ? 2 : CAR_H - 6, width: 8, height: 4, borderRadius: 2, backgroundColor: me ? '#fff6c8' : '#ff3b3b' }} />
      <View style={{ position: 'absolute', right: 3, top: me ? 2 : CAR_H - 6, width: 8, height: 4, borderRadius: 2, backgroundColor: me ? '#fff6c8' : '#ff3b3b' }} />
    </View>);
  return (
    <Screen header={false}>
      <GameHeader cat="arcade" icon="speedometer" title="Slipstream dodge" hint="Swipe or tap the left and right half of the screen to change lane. Do not touch the other cars. The run is real time, so your best distance is what gets saved." stats={[['Distance', `${d} m`], ['Best', `${Math.max(best, d)} m`]]} />
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={{ width: W, height: H, backgroundColor: '#17181c', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
          {Array.from({ length: Math.ceil(H / 30) + 2 }, (_, k) => (<View key={`k${k}`} style={{ position: 'absolute', left: 0, top: k * 30 - 30 + (off % 30), width: 8, height: 15, backgroundColor: k % 2 ? '#e10600' : '#fff', opacity: 0.85 }} />))}
          {Array.from({ length: Math.ceil(H / 30) + 2 }, (_, k) => (<View key={`r${k}`} style={{ position: 'absolute', right: 0, top: k * 30 - 30 + (off % 30), width: 8, height: 15, backgroundColor: k % 2 ? '#e10600' : '#fff', opacity: 0.85 }} />))}
          {[1, 2].map((k) => Array.from({ length: Math.ceil(H / 60) + 2 }, (_, j) => (<View key={`${k}-${j}`} style={{ position: 'absolute', left: k * LW - 2, top: j * 60 - 60 + off, width: 4, height: 30, borderRadius: 2, backgroundColor: alpha('#fff', 0.35) }} />)))}
          {r.cars.map((c) => <Car key={c.id} c={c.c} x={c.lane * LW + (LW - CAR_W) / 2} y={c.y} />)}
          <Car me c="#f4f4f6" x={lane * LW + (LW - CAR_W) / 2} y={PY} />
          {phase === 'ready' ? <View style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 40, alignItems: 'center', gap: 6 }}><Ionicons name="swap-horizontal" size={40} color={colors.fg} /><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>Swipe to change lane</Text></View> : null}
        </View>
      </View>
      {phase === 'over' ? <ShareResult text={`F1 Companion slipstream dodge: ${d} m${d >= best ? ' (new best)' : ''}`}><ResultPanel cat="arcade" win={false} icon="car-sport" kicker="Crashed" big={`${d} m`} sub={`Best ${Math.max(best, d)} m`} best={d > 0 && d >= best} /></ShareResult> : null}
      {phase !== 'run' ? <Btn tone="solid" icon={phase === 'over' ? 'refresh' : 'play'} onPress={start}>{phase === 'over' ? 'Go again' : 'Start'}</Btn> : <Hint>Swipe or tap left and right to dodge.</Hint>}
    </Screen>);
}

// ---------- Safety car sweeper: minesweeper on an 8 by 8 track. Debris is the mines. Progress is saved. ----------
const N = 8, MINES = 10;
const nbrs = (i) => { const r = Math.floor(i / N), c = i % N, o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const y = r + a, x = c + b; if (y >= 0 && y < N && x >= 0 && x < N) o.push(y * N + x); } return o; };
const COUNT_COL = ['', '#4da3ff', '#3fcf8e', '#ff5a4d', '#9b6bff', '#e8a33d', '#2bc4c4', '#ffffff', '#999999'];
const fresh = () => ({ mines: null, open: Array(N * N).fill(false), flag: Array(N * N).fill(false), start: 0, end: 0, state: 'play' });
export function SweeperScreen() {
  const [g, upd, restart] = useGameSave('sweeper', fresh); const [flagMode, setFlagMode] = useState(false); const [best, setBest] = useState(0); const [, tk] = useState(0); const { width } = useWindowDimensions(); const S = Math.floor((Math.min(width - 32, 400) - 7 * 3) / N);
  useEffect(() => { kvGet('sweeper:best', 0).then(setBest); }, []);
  useEffect(() => { if (!g || g.state !== 'play' || !g.start) return undefined; const id = setInterval(() => tk((x) => x + 1), 1000); return () => clearInterval(id); }, [g && g.start, g && g.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = !!g && g.state === 'play' && !!g.start; useLeaveGuard(playing);
  if (!g || !g.open) return <Loading />;
  const secs = g.start ? Math.floor(((g.end || Date.now()) - g.start) / 1000) : 0; const around = (m, i) => nbrs(i).filter((x) => m[x]).length;
  const flags = g.flag.filter(Boolean).length;
  const reveal = (i) => {
    if (g.state !== 'play' || g.flag[i] || g.open[i]) return;
    let mines = g.mines, start = g.start;
    if (!mines) { const safe = new Set([i, ...nbrs(i)]); const cells = Array.from({ length: N * N }, (_, k) => k).filter((k) => !safe.has(k)); for (let k = cells.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [cells[k], cells[j]] = [cells[j], cells[k]]; } mines = Array(N * N).fill(false); cells.slice(0, MINES).forEach((k) => { mines[k] = true; }); start = Date.now(); }
    const open = [...g.open];
    if (mines[i]) { open[i] = true; hap.bad(); upd({ mines, start, open, end: Date.now(), state: 'lost' }); return; }
    const q = [i]; while (q.length) { const k = q.pop(); if (open[k] || g.flag[k]) continue; open[k] = true; if (around(mines, k) === 0) nbrs(k).forEach((x) => { if (!open[x]) q.push(x); }); }
    const won = open.filter(Boolean).length === N * N - MINES; const end = won ? Date.now() : 0;
    upd({ mines, start, open, end, state: won ? 'won' : 'play', over: won });
    if (won) { hap.good(); const t = Math.max(1, Math.floor((end - start) / 1000)); if (!best || t < best) { setBest(t); kvSet('sweeper:best', t); } }
  };
  const toggleFlag = (i) => { if (g.state !== 'play' || g.open[i]) return; const f = [...g.flag]; f[i] = !f[i]; hap.tap(); upd({ flag: f }); };
  const tap = (i) => (flagMode ? toggleFlag(i) : reveal(i));
  const done = g.state !== 'play';
  return (
    <Screen header={false}>
      <GameHeader cat="arcade" icon="warning" title="Safety car sweeper" hint={`Clear every tile that has no debris. A number says how many of the 8 tiles around it hold debris. There are ${MINES} pieces. Tap to clear, switch to Flag (or long-press) to mark debris. Saved as you go.`} stats={[['Flags left', MINES - flags], ['Time', `${secs}s`], ['Best', best ? `${best}s` : '—']]} />
      <Segmented2 value={flagMode} onChange={setFlagMode} />
      <View style={{ alignSelf: 'center', gap: 3, padding: 6, borderRadius: 16, backgroundColor: alpha('#000', 0.35), borderWidth: 1, borderColor: colors.line }}>
        {Array.from({ length: N }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: N }, (_, c) => { const i = r * N + c; const o = g.open[i]; const m = g.mines && g.mines[i]; const show = o || (done && m); const n = g.mines && o && !m ? around(g.mines, i) : 0;
              return (<Pressable key={c} accessibilityRole="button" accessibilityLabel={`Row ${r + 1} column ${c + 1}${o ? (m ? ', debris' : `, ${n}`) : g.flag[i] ? ', flagged' : ', hidden'}`} onPress={() => !done && tap(i)} onLongPress={() => !done && toggleFlag(i)} style={{ width: S, height: S, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: show ? (m ? alpha(colors.accent, 0.7) : alpha(colors.fg, 0.05)) : alpha(colors.fg, 0.2), borderWidth: 1, borderTopColor: show ? colors.line : alpha('#fff', 0.28), borderLeftColor: show ? colors.line : alpha('#fff', 0.2), borderRightColor: show ? colors.line : alpha('#000', 0.4), borderBottomColor: show ? colors.line : alpha('#000', 0.5) }}>
                {show ? (m ? <Ionicons name="flame" size={S * 0.55} color="#fff" /> : <Text style={{ fontSize: S * 0.52, fontWeight: '800', color: COUNT_COL[n] }}>{n || ''}</Text>) : g.flag[i] ? <Ionicons name="flag" size={S * 0.5} color={colors.accentText} /> : null}</Pressable>); })}
          </View>))}
      </View>
      {done ? <ShareResult text={`F1 Companion safety car sweeper: ${g.state === 'won' ? `cleared in ${secs}s` : 'hit debris'}`}><ResultPanel cat="arcade" win={g.state === 'won'} icon={g.state === 'won' ? 'checkmark-done' : 'flame'} kicker={g.state === 'won' ? 'Track clear' : 'Debris hit'} big={g.state === 'won' ? `${secs} s` : 'Safety car out'} best={g.state === 'won' && secs <= best} /></ShareResult> : <Hint>Tap to clear. Flag mode or long-press marks debris.</Hint>}
      {done ? <Btn tone="solid" icon="refresh" onPress={restart}>New track</Btn> : null}
    </Screen>);
}
function Segmented2({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[[false, 'Clear', 'hand-left'], [true, 'Flag', 'flag']].map(([v, l, ic]) => (<Pressable key={l} accessibilityRole="button" onPress={() => onChange(v)} style={{ flex: 1, flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: value === v ? colors.accent : colors.card, borderWidth: 1, borderColor: value === v ? colors.accent : colors.line }}><Ionicons name={ic} size={16} color={value === v ? '#fff' : colors.muted} /><Text style={{ color: value === v ? '#fff' : colors.fg, fontWeight: '800' }}>{l}</Text></Pressable>))}
    </View>);
}

// ---------- Points 2048: slide and merge. Swipe the board or use the arrows. Progress is saved. ----------
const TILE = { 0: 'transparent', 2: '#454c5e', 4: '#58627a', 8: '#e8a33d', 16: '#ff8c42', 32: '#ff5a4d', 64: '#e10600', 128: '#9b6bff', 256: '#4da3ff', 512: '#22c9b8', 1024: '#3fcf8e', 2048: '#ffd24d' };
function slideRow(row) { const a = row.filter(Boolean); let gain = 0; for (let i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2; gain += a[i]; a.splice(i + 1, 1); } } while (a.length < 4) a.push(0); return [a, gain]; }
export function move(b, dir) {
  const get = (i, k) => { const r = dir === 'left' ? [i, k] : dir === 'right' ? [i, 3 - k] : dir === 'up' ? [k, i] : [3 - k, i]; return r[0] * 4 + r[1]; };
  const out = [...b]; let gain = 0, moved = false;
  for (let i = 0; i < 4; i++) { const line = [0, 1, 2, 3].map((k) => b[get(i, k)]); const [n, g] = slideRow(line); gain += g; n.forEach((v, k) => { if (out[get(i, k)] !== v) moved = true; out[get(i, k)] = v; }); }
  return { b: out, gain, moved };
}
const spawn = (b) => { const e = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); if (!e.length) return b; const o = [...b]; o[e[Math.floor(Math.random() * e.length)]] = Math.random() < 0.9 ? 2 : 4; return o; };
const stuck = (b) => !['left', 'right', 'up', 'down'].some((d) => move(b, d).moved);
const newBoard = () => ({ b: spawn(spawn(Array(16).fill(0))), score: 0, won: false });
export function Points2048Screen() {
  const [g, upd, restart] = useGameSave('p2048', newBoard); const [best, setBest] = useState(0); const { width } = useWindowDimensions(); const S = Math.floor((Math.min(width - 32, 360) - 5 * 8) / 4);
  const ref = useRef(null); ref.current = g;
  useEffect(() => { kvGet('p2048:best', 0).then(setBest); }, []);
  const go = (dir) => { const cur = ref.current; if (!cur || !cur.b || cur.over) return; const r = move(cur.b, dir); if (!r.moved) return; const nb = spawn(r.b); const score = cur.score + r.gain; const won = cur.won || nb.includes(512); const over = stuck(nb); hap.tap(); upd({ b: nb, score, won, over }); if (score > best) { setBest(score); kvSet('p2048:best', score); } };
  const pan = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => true, onPanResponderRelease: (e, s) => { const ax = Math.abs(s.dx), ay = Math.abs(s.dy); if (Math.max(ax, ay) < 20) return; go(ax > ay ? (s.dx > 0 ? 'right' : 'left') : (s.dy > 0 ? 'down' : 'up')); } })).current;
  if (!g || !g.b) return <Loading />;
  const hi = Math.max(...g.b);
  return (
    <Screen header={false}>
      <GameHeader cat="puzzle" icon="apps" title="Points 2048" hint="Swipe the board to slide every tile. Equal tiles merge into one. Reach 512 to win, then carry on for a higher score. Saved as you go." stats={[['Score', g.score], ['Best', Math.max(best, g.score)], ['Top tile', hi]]} />
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={{ padding: 8, borderRadius: 20, backgroundColor: alpha('#000', 0.4), gap: 8, borderWidth: 1, borderColor: colors.line }}>
          {[0, 1, 2, 3].map((r) => (<View key={r} style={{ flexDirection: 'row', gap: 8 }}>{[0, 1, 2, 3].map((c) => { const v = g.b[r * 4 + c]; const col = v ? (TILE[v] || '#ffd24d') : 'transparent';
            return (<View key={c} accessible accessibilityLabel={v ? `${v}` : 'empty'} style={{ width: S, height: S, borderRadius: 12, backgroundColor: v ? col : alpha(colors.fg, 0.06), alignItems: 'center', justifyContent: 'center', borderWidth: v ? 1 : 0, borderColor: alpha('#fff', 0.25), shadowColor: col, shadowOpacity: v >= 64 ? 0.7 : 0, shadowRadius: 10, elevation: v >= 64 ? 6 : 0 }}>{v ? <Text style={{ color: v <= 4 ? colors.fg : '#fff', fontFamily: 'display', fontWeight: '800', fontSize: v >= 1024 ? S * 0.3 : v >= 128 ? S * 0.36 : S * 0.46 }}>{v}</Text> : null}</View>); })}</View>))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>{[['left', 'arrow-back'], ['up', 'arrow-up'], ['down', 'arrow-down'], ['right', 'arrow-forward']].map(([d, ic]) => (<Pressable key={d} accessibilityRole="button" accessibilityLabel={`Slide ${d}`} onPress={() => go(d)} style={({ pressed }) => ({ width: 64, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? alpha(colors.accent, 0.3) : colors.card, borderWidth: 1, borderColor: colors.line })}><Ionicons name={ic} size={22} color={colors.fg} /></Pressable>))}</View>
      {g.won && !g.over ? <Hint>You reached 512. Keep going for a higher score.</Hint> : null}
      {g.over ? <ShareResult text={`F1 Companion Points 2048: score ${g.score}, top tile ${hi}`}><ResultPanel cat="puzzle" win={g.won} icon="apps" kicker="No moves left" big={`${g.score}`} sub={`Top tile ${hi}. Best ${Math.max(best, g.score)}.`} best={g.score > 0 && g.score >= best} /></ShareResult> : null}
      <Btn tone={g.over ? 'solid' : undefined} icon="refresh" onPress={restart}>New game</Btn>
    </Screen>);
}
