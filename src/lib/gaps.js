// "+5.300" -> 5.3, anything else (a lap time, "+1 Lap", "DNF") -> null.
export const parseGap = (t) => { const m = /^\+(\d+(?:\.\d+)?)$/.exec(String(t || '').trim()); return m ? Number(m[1]) : null; };
// Gaps to the car in front, from gaps to the leader. The leader (row 0) has no gap; entries that are not plain seconds are left as they were.
export function aheadList(list) {
  return list.map((t, i) => {
    const x = parseGap(t); if (i === 0 || x == null) return t;
    const prev = i === 1 ? 0 : parseGap(list[i - 1]); if (prev == null) return t;
    return `+${(x - prev).toFixed(3)}`;
  });
}
