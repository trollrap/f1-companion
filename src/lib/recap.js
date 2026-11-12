// Race recap: a few facts worked out from the classification (grid, finishing order, fastest lap, retirements) and the standings.
export function recapOf(race, standings) {
  if (!race || !race.rows || !race.rows.length) return null;
  const rows = race.rows; const win = rows.find((r) => r.position === 1); if (!win) return null;
  const name = (r) => `${r.first} ${r.last}`;
  const fin = rows.filter((r) => /^\d+$/.test(String(r.positionText)) && r.grid > 0);
  const climb = fin.map((r) => ({ r, d: r.grid - r.position })).sort((a, b) => b.d - a.d)[0];
  const fl = rows.find((r) => r.fastest); const pole = rows.find((r) => r.grid === 1);
  const out = rows.filter((r) => /^(R|W|N|F)$/.test(String(r.positionText))).length;
  const lines = [];
  lines.push({ k: 'Winner', v: `${name(win)} (${win.team}), from P${win.grid > 0 ? win.grid : 'the pit lane'}` });
  lines.push({ k: 'Podium', v: rows.filter((r) => r.position <= 3).map(name).join(', ') });
  if (pole) lines.push({ k: 'Pole', v: `${name(pole)}, ${pole.position === 1 ? 'converted it into the win' : `finished P${/^\d+$/.test(String(pole.positionText)) ? pole.position : 'out'}`}` });
  if (climb && climb.d >= 3) lines.push({ k: 'Biggest climb', v: `${name(climb.r)}, P${climb.r.grid} to P${climb.r.position} (+${climb.d})` });
  if (fl) lines.push({ k: 'Fastest lap', v: `${name(fl)} (${fl.team})` });
  lines.push({ k: 'Retirements', v: out ? String(out) : 'None' });
  if (standings && standings.length > 1) { const a = standings[0], b = standings[1]; const g = a.points - b.points; lines.push({ k: 'Title fight', v: g === 0 ? `${a.last} and ${b.last} level on ${a.points}` : `${a.last} leads ${b.last} by ${g}` }); }
  return { title: race.name, round: race.round, lines };
}
