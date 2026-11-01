// "What if" standings. Points: race 25-18-15-12-10-8-6-4-2-1, sprint 8-7-6-5-4-3-2-1 (no fastest lap point since 2025).
// Ties are kept in the current order; the real rule uses wins and best finishes, so a tie on points may differ.
export const RACE_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_PTS = [8, 7, 6, 5, 4, 3, 2, 1];
export const pointsAt = (kind, i) => ((kind === 'sprint' ? SPRINT_PTS : RACE_PTS)[i] || 0);
export function awarded(orders) {
  const add = {};
  Object.entries(orders).forEach(([kind, order]) => order.forEach((id, i) => { add[id] = (add[id] || 0) + pointsAt(kind, i); }));
  return add;
}
const rank = (rows) => { rows.sort((a, b) => b.total - a.total || a.position - b.position); rows.forEach((r, i) => { r.newPos = i + 1; r.delta = r.position - r.newPos; }); return rows; };
export function projectDrivers(base, orders) {
  const add = awarded(orders);
  return rank(base.map((r) => ({ ...r, add: add[r.driverId] || 0, total: Number(r.points) + (add[r.driverId] || 0) })));
}
export function projectTeams(base, drivers) {
  const add = {}; drivers.forEach((d) => { add[d.teamId] = (add[d.teamId] || 0) + d.add; });
  return rank(base.map((r) => ({ ...r, add: add[r.teamId] || 0, total: Number(r.points) + (add[r.teamId] || 0) })));
}
