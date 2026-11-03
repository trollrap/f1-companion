import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, PanResponder, Pressable } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';

// Static drawing of the chart: only re-rendered when zoom, size or data change (never while a finger reads a value).
const Plot = React.memo(function Plot({ w, height, series, rounds, lo, hi, n, top, ticks, every }) {
  const L = 34, R = 12, T = 12, B = 24, span = Math.max(1, hi - lo), innerW = Math.max(1, w - L - R);
  const fin = (v) => (Number.isFinite(v) ? v : 0);
  const x = (i) => fin(L + ((i - lo) / span) * innerW), y = (v) => fin(T + (1 - v / top) * (height - T - B)), xi = (i) => x(i) - L;
  return (
    <Svg width={w} height={height}>
      {ticks.map((v) => (<React.Fragment key={v}><Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} /><SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{String(v)}</SvgText></React.Fragment>))}
      {rounds.map((r, i) => (i >= Math.ceil(lo - 0.001) && i <= hi + 0.001 && ((i - Math.ceil(lo)) % every === 0 || i === n - 1) ? <SvgText key={r.round} x={x(i)} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{String(r.round)}</SvgText> : null))}
      <Svg x={L} y={0} width={innerW} height={height}>
        {series.map((s) => (s.values.length > 1 ? <Polyline key={s.id} points={s.values.map((v, i) => `${xi(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.4} strokeDasharray={s.dash ? '6,4' : undefined} strokeLinejoin="round" strokeLinecap="round" /> : null))}
      </Svg>
    </Svg>
  );
});
// Line chart with zoom and a read-out. series: [{ id, label, color, dash, values[] }]; one value per round; rounds: [{ round, name }].
// One finger: slide along the chart to read a race. Two fingers (pinch) or the + / - buttons: zoom; two fingers also pan. Double-tap area resets with the reset button.
export default function LineChart({ series, rounds, height = 240 }) {
  const [w, setW] = useState(0); const n = rounds.length;
  const [win, setWin] = useState([0, Math.max(1, n - 1)]); const [hit, setHitRaw] = useState(null); const setHit = (v) => setHitRaw((o) => (o === v ? o : v));
  useEffect(() => { setWin([0, Math.max(1, n - 1)]); setHit(null); }, [n]);
  const lo = Math.max(0, Math.min(win[0], n - 1)), hi = Math.min(n - 1, Math.max(win[1], Math.min(n - 1, lo + 1)));
  const L = 34, R = 12, T = 12, B = 24, span = Math.max(1, hi - lo), innerW = Math.max(1, w - L - R);
  const st = useRef({}), g = useRef({ d0: null, px: 0, win0: [0, 1], panning: false }); // st: geometry of the latest render; g: the gesture in progress (must survive re-renders)
  Object.assign(st.current, { lo, hi, n, innerW, L, w });
  const clamp = (a, b) => { const min = Math.min(3, n - 1); let len = Math.max(min, b - a); len = Math.min(len, n - 1); let s = a; if (s < 0) s = 0; if (s + len > n - 1) s = n - 1 - len; return [s, s + len]; };
  const zoom = (f, c) => { const { lo: a, hi: b } = st.current; const mid = c ?? (a + b) / 2; setWin(clamp(mid - (mid - a) * f, mid + (b - mid) * f)); };
  const idxAt = (x) => { const { lo: a, hi: b, L: l, innerW: iw, n: nn } = st.current; return Math.max(0, Math.min(nn - 1, Math.round(a + ((x - l) / iw) * (b - a)))); };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { const c = st.current, q = g.current; q.d0 = null; q.px = e.nativeEvent.pageX; q.win0 = [c.lo, c.hi]; q.panning = false; if ((e.nativeEvent.touches || []).length === 1) setHit(idxAt(e.nativeEvent.locationX)); },
    onPanResponderMove: (e) => {
      const t = e.nativeEvent.touches || [], q = g.current;
      if (t.length >= 2) {
        const d = Math.abs(t[0].pageX - t[1].pageX), cx = (t[0].locationX + t[1].locationX) / 2; setHit(null);
        if (q.d0 && d > 8) { const f = q.d0 / d; if (Math.abs(1 - f) > 0.02) { zoom(f, st.current.lo + ((cx - st.current.L) / st.current.innerW) * (st.current.hi - st.current.lo)); q.d0 = d; } }
        else q.d0 = d;
      } else if (t[0]) {
        const c = st.current; q.d0 = null; const dx = t[0].pageX - q.px, zoomedNow = q.win0[1] - q.win0[0] < c.n - 1 - 0.01;
        // Zoomed in: a sideways drag moves the window to other rounds. Otherwise the finger reads the race under it.
        if (zoomedNow && (q.panning || Math.abs(dx) > 10)) { q.panning = true; setHit(null); const len = q.win0[1] - q.win0[0]; const sh = -(dx / c.innerW) * len; setWin(clamp(q.win0[0] + sh, q.win0[0] + sh + len)); }
        else setHit(idxAt(t[0].locationX));
      }
    },
    onPanResponderRelease: () => { g.current.d0 = null; g.current.panning = false; },
    onPanResponderTerminationRequest: () => false,
  })).current;
  const vis = useMemo(() => series.map((s) => ({ ...s, v: s.values.slice(Math.floor(lo), Math.ceil(hi) + 1) })), [series, lo, hi]);
  const max = Math.max(10, ...vis.flatMap((s) => s.v).filter((v) => Number.isFinite(v)));
  const step = max <= 30 ? 5 : max <= 60 ? 10 : max <= 150 ? 25 : max <= 300 ? 50 : max <= 600 ? 100 : 200, top = Math.ceil(max / step) * step;
  const fin = (n) => (Number.isFinite(n) ? n : 0);
  const x = (i) => fin(L + ((i - lo) / span) * innerW), y = (v) => fin(T + (1 - v / top) * (height - T - B)), xi = (i) => x(i) - L;
  const ticks = useMemo(() => { const t = []; for (let v = 0; v <= top; v += step) t.push(v); return t; }, [top, step]);
  const count = Math.floor(hi) - Math.ceil(lo) + 1, every = count > 16 ? 3 : count > 9 ? 2 : 1;
  const zoomed = hi - lo < n - 1 - 0.01;
  const tip = hit != null && hit >= lo - 0.5 && hit <= hi + 0.5 ? hit : null;
  const rows = tip == null ? [] : series.map((s) => ({ s, v: s.values[tip] })).filter((r) => r.v != null).sort((a, b) => b.v - a.v);
  const Btn = ({ icon, onPress, off, label }) => (<Pressable onPress={onPress} disabled={off} hitSlop={6} accessibilityLabel={label} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, opacity: off ? 0.35 : pressed ? 0.7 : 1 })}><Ionicons name={icon} size={18} color={colors.fg} /></Pressable>);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{tip == null ? zoomed ? 'Drag sideways to move to other rounds · tap a point to read it' : 'Slide a finger along the chart · pinch to zoom' : ' '}</Text>
        <Btn icon="remove" label="Zoom out" off={!zoomed} onPress={() => zoom(1.6)} />
        <Btn icon="add" label="Zoom in" off={hi - lo <= Math.min(3, n - 1)} onPress={() => zoom(1 / 1.6)} />
        <Btn icon="scan-outline" label="Reset zoom" off={!zoomed} onPress={() => { setWin([0, Math.max(1, n - 1)]); setHit(null); }} />
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} {...pan.panHandlers}>
        {w > 0 && <Plot w={w} height={height} series={series} rounds={rounds} lo={lo} hi={hi} n={n} top={top} ticks={ticks} step={step} every={every} />}
        {/* the read-out is drawn with plain views, so the chart itself is not redrawn while a finger moves */}
        {tip != null && w > 0 ? (<>
          <View pointerEvents="none" style={{ position: 'absolute', left: x(tip) - 0.5, top: T, width: 1, height: height - T - B, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          {series.map((s) => (s.values[tip] != null && Number.isFinite(s.values[tip]) ? <View key={s.id} pointerEvents="none" style={{ position: 'absolute', left: x(tip) - 5, top: y(s.values[tip]) - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: s.color, borderWidth: 1.5, borderColor: colors.deep }} /> : null))}
        </>) : null}
        {tip != null && w > 0 && rounds[tip] ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 6, [x(tip) > w / 2 ? 'left' : 'right']: 40, backgroundColor: alpha(colors.deep, 0.94), borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '62%' }}>
            <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{`R${rounds[tip].round} · ${String(rounds[tip].name || '').replace(' Grand Prix', '')}`}</Text>
            {rows.slice(0, 6).map(({ s, v }) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                <Text style={{ color: colors.fg, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{s.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 'auto' }}>{v}</Text>
              </View>))}
          </View>) : null}
      </View>
    </View>
  );
}
