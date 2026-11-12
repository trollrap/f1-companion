// Grid drops: compare where a driver qualified with where they actually lined up. Anyone who starts further back than they qualified
// was penalised or excluded; a grid slot of 0 means a pit-lane start. Reasons are not in the data, so none are guessed.
export function gridDrops(quali, results) {
  const q = {}; quali.forEach((x) => { q[`${x.round}:${x.driverId}`] = x; });
  const races = {};
  results.forEach((r) => {
    const x = q[`${r.round}:${r.driverId}`]; if (!x || !Number.isFinite(x.pos) || !Number.isFinite(r.grid)) return;
    const pit = r.grid === 0; const drop = pit ? null : r.grid - x.pos;
    if (!pit && !(drop > 0)) return;
    (races[r.round] ||= { round: r.round, race: r.race, rows: [] }).rows.push({ driverId: r.driverId, last: x.last, first: x.first, team: x.team, teamId: x.teamId, from: x.pos, to: pit ? 0 : r.grid, drop, pit });
  });
  const byRace = Object.values(races).sort((a, b) => a.round - b.round);
  byRace.forEach((g) => g.rows.sort((a, b) => (b.pit ? 99 : b.drop) - (a.pit ? 99 : a.drop)));
  const drv = {};
  byRace.forEach((g) => g.rows.forEach((r) => { const d = (drv[r.driverId] ||= { driverId: r.driverId, name: `${r.first || ''} ${r.last}`.trim(), team: r.team, teamId: r.teamId, times: 0, places: 0, pit: 0 }); d.times++; d.pit += r.pit ? 1 : 0; d.places += r.pit ? 0 : r.drop; }));
  const drivers = Object.values(drv).sort((a, b) => b.times - a.times || b.places - a.places || a.name.localeCompare(b.name));
  const tm = {}; drivers.forEach((d) => { const t = (tm[d.teamId] ||= { teamId: d.teamId, team: d.team, times: 0, places: 0 }); t.times += d.times; t.places += d.places; });
  return { byRace, drivers, teams: Object.values(tm).sort((a, b) => b.times - a.times || b.places - a.places) };
}
