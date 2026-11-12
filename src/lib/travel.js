// Distance between the rounds of a season, as the crow flies (great circle). Real freight and flights take other routes, so treat it as a lower bound.
const R = 6371; const rad = (d) => (d * Math.PI) / 180;
export const km = (a, b) => { const dl = rad(b.lat - a.lat), dn = rad(b.lng - a.lng); const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
export function travel(races) {
  const pts = (races || []).map((r) => ({ round: Number(r.round), name: r.raceName, place: r.Circuit?.Location?.locality, country: r.Circuit?.Location?.country, lat: Number(r.Circuit?.Location?.lat), lng: Number(r.Circuit?.Location?.long) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).sort((a, b) => a.round - b.round);
  if (pts.length < 2) return null;
  const legs = pts.slice(1).map((p, i) => ({ from: pts[i], to: p, km: km(pts[i], p) }));
  const total = legs.reduce((a, l) => a + l.km, 0);
  const sorted = [...legs].sort((a, b) => b.km - a.km);
  return { rounds: pts.length, countries: new Set(pts.map((p) => p.country)).size, legs, total, longest: sorted[0], shortest: sorted[sorted.length - 1], avg: total / legs.length, laps: total / 40075 };
}
