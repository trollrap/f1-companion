// Reliability report: sorts every non-finish of a season into mechanical, accident or other, per team.
const MECH = /engine|gearbox|transmission|hydraul|brake|electric|suspension|power unit|water|oil|turbo|fuel|clutch|overheat|mechanical|exhaust|radiator|cooling|ers|mgu|battery|differential|steering|driveshaft|drive shaft|vibration|oil leak|power loss|technical|pneumatic|wheel nut|wheel|puncture|rear wing|front wing|throttle|ignition|undertray|chassis|handling|tyre|tire/i;
const CRASH = /collision|accident|spun|damage|debris|crash|contact|retired/i;
export const kindOf = (r) => {
  if (r.finished) return 'finished'; const t = String(r.status || '');
  if (/did not (start|qualify)|withdrew|not classified|107%/i.test(t)) return 'dns';
  if (/illness|unwell|injur|disqualif|underweight|skid|illegal|exclu|penalty/i.test(t)) return 'other';
  if (MECH.test(t) && !/collision|accident|spun|debris/i.test(t)) return 'mech';
  if (CRASH.test(t) && !/^retired$/i.test(t)) return 'crash';
  return 'other';
};
// A lapped car is a finisher, so "+1 Lap" and "Finished" are both 'finished' when the source said so; the offline history gives a flag, Jolpica a status text.
export function reliability(rows) {
  const lastRound = Math.max(0, ...rows.map((r) => r.round)); const recentFrom = lastRound - 4; const teams = {}; const causes = {};
  rows.forEach((r) => { const k = kindOf(r); if (k === 'dns') return; const t = (teams[r.teamId] = teams[r.teamId] || { teamId: r.teamId, team: r.team, starts: 0, mech: 0, crash: 0, other: 0, recentMech: 0, recentStarts: 0, list: [] });
    t.starts++; if (r.round >= recentFrom) t.recentStarts++; if (k === 'mech' || k === 'crash' || k === 'other') { t[k]++; t.list.push({ round: r.round, race: r.race, driver: r.last, status: r.status, kind: k }); if (k === 'mech') { if (r.round >= recentFrom) t.recentMech++; causes[r.status] = (causes[r.status] || 0) + 1; } } });
  const list = Object.values(teams).map((t) => ({ ...t, mechRate: t.starts ? t.mech / t.starts : 0, finishRate: t.starts ? 1 - (t.mech + t.crash + t.other) / t.starts : 0, recentRate: t.recentStarts ? t.recentMech / t.recentStarts : 0 })).sort((a, b) => a.mechRate - b.mechRate || b.starts - a.starts);
  const top = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([status, n]) => ({ status, n }));
  return { teams: list, causes: top, races: lastRound, entries: rows.length };
}
