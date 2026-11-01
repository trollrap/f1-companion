// Is the title decided? True when the gap between first and second is bigger than every point still available.
// Race: 25 (drivers) or 25+18 (teams); sprint weekends add 8 or 8+7. Needs the round the standings are for.
export function clinched(rows, kind, totalRounds, races) {
  if (!rows || rows.length < 2 || !Number.isFinite(rows.round) || !totalRounds) return false;
  const left = Math.max(0, totalRounds - rows.round), sprints = (races || []).filter((r) => Number(r.round) > rows.round && r.has_sprint).length;
  const per = kind === 'driver' ? [25, 8] : [43, 15];
  return rows[0].points - rows[1].points > left * per[0] + sprints * per[1];
}
