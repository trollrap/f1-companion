// Championship change after one round: position and gap to the leader before and after, from cumulative points per round (seasonPoints).
export function swing(sp, idx) {
  if (!sp || !sp.drivers || !sp.drivers.length || idx < 0 || idx >= sp.rounds.length) return null;
  const rows = sp.drivers.map((d) => { const after = d.pts[idx] || 0, before = idx > 0 ? d.pts[idx - 1] || 0 : 0; return { id: d.driverId, name: `${d.first} ${d.last}`, last: d.last, teamId: d.teamId, before, after, gain: after - before }; }).filter((r) => r.after > 0 || r.before > 0);
  const rank = (key) => { const o = [...rows].sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name)); const m = {}; o.forEach((r, i) => { m[r.id] = i + 1; }); return m; };
  const rb = rank('before'), ra = rank('after'); const lb = Math.max(0, ...rows.map((r) => r.before)), la = Math.max(0, ...rows.map((r) => r.after));
  const out = rows.map((r) => ({ ...r, posBefore: idx > 0 ? rb[r.id] : null, posAfter: ra[r.id], gapBefore: lb - r.before, gapAfter: la - r.after })).sort((a, b) => a.posAfter - b.posAfter);
  return { round: sp.rounds[idx].round, name: sp.rounds[idx].name, rows: out, leaderChanged: idx > 0 && out[0] && out[0].posBefore !== 1 };
}
