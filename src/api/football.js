// Football scores and tables from ESPN's public JSON (the feed behind espn.com; unofficial, so it can change without notice and
// it could not be reached from the build sandbox: mapped from the known response layout and tested on mocked responses only).
// Every mapper reads fields defensively: a missing field is left out, never invented.
import { cachedJSON, MIN } from '../lib/cache';
export const LEAGUES = [
  { slug: 'eng.1', name: 'Premier League' }, { slug: 'esp.1', name: 'La Liga' }, { slug: 'ger.1', name: 'Bundesliga' }, { slug: 'ita.1', name: 'Serie A' }, { slug: 'fra.1', name: 'Ligue 1' },
  { slug: 'gre.1', name: 'Super League Greece' }, { slug: 'uefa.champions', name: 'Champions League' }, { slug: 'uefa.europa', name: 'Europa League' },
];
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer', V2 = 'https://site.api.espn.com/apis/v2/sports/soccer';
export const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const side = (c) => ({ id: c?.team?.id, name: c?.team?.displayName || c?.team?.name || '—', short: c?.team?.abbreviation || '', logo: c?.team?.logo || c?.team?.logos?.[0]?.href || null, score: c?.score != null && c.score !== '' ? Number(c.score) : null, winner: !!c?.winner });
export function mapEvent(e, league) {
  const comp = e.competitions?.[0] || {}; const cs = comp.competitors || [];
  const home = cs.find((c) => c.homeAway === 'home') || cs[0], away = cs.find((c) => c.homeAway === 'away') || cs[1];
  const st = e.status?.type || comp.status?.type || {};
  return { id: e.id, league, date: e.date, state: st.state || 'pre', completed: !!st.completed, detail: st.shortDetail || st.detail || '', clock: e.status?.displayClock || '', home: side(home), away: side(away), venue: comp.venue?.fullName || '' };
}
export async function scores(slug, dateStr, today) {
  const d = await cachedJSON(`${SITE}/${slug}/scoreboard?dates=${dateStr}`, today ? MIN / 2 : 15 * MIN);
  return (d?.events || []).map((e) => mapEvent(e, LEAGUES.find((l) => l.slug === slug)));
}
export async function allScores(dateStr, today) {
  const lists = await Promise.all(LEAGUES.map((l) => scores(l.slug, dateStr, today).catch(() => [])));
  const flat = lists.flat(); const rank = (x) => (x.state === 'in' ? 0 : x.state === 'pre' ? 1 : 2);
  return flat.sort((a, b) => (LEAGUES.indexOf(a.league) - LEAGUES.indexOf(b.league)) || (rank(a) - rank(b)) || Date.parse(a.date) - Date.parse(b.date));
}
const stat = (e, n) => { const x = (e.stats || []).find((s) => s.name === n || s.abbreviation === n); return x ? Number(x.value ?? x.displayValue) : null; };
export async function table(slug) {
  const d = await cachedJSON(`${V2}/${slug}/standings`, 10 * MIN);
  const groups = d?.children?.length ? d.children : [d]; const out = [];
  groups.forEach((g) => { const es = g?.standings?.entries || []; if (es.length) out.push({ name: g.name || '', rows: es.map((e) => ({ team: e.team?.displayName || e.team?.name || '—', logo: e.team?.logos?.[0]?.href || null, rank: stat(e, 'rank'), played: stat(e, 'gamesPlayed'), won: stat(e, 'wins'), drawn: stat(e, 'ties'), lost: stat(e, 'losses'), gd: stat(e, 'pointDifferential'), points: stat(e, 'points') })).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)) }); });
  return out;
}
export async function match(slug, id) {
  const d = await cachedJSON(`${SITE}/${slug}/summary?event=${id}`, MIN);
  const comp = d?.header?.competitions?.[0] || {}; const cs = comp.competitors || [];
  const home = cs.find((c) => c.homeAway === 'home') || cs[0], away = cs.find((c) => c.homeAway === 'away') || cs[1];
  const events = (d?.keyEvents || []).map((k) => ({ minute: k.clock?.displayValue || '', type: k.type?.text || '', text: k.shortText || k.text || '', team: k.team?.displayName || '' })).filter((k) => k.type || k.text);
  const stats = (d?.boxscore?.teams || []).map((t) => ({ team: t.team?.displayName, stats: Object.fromEntries((t.statistics || []).map((s) => [s.label || s.name, s.displayValue])) }));
  return { state: comp.status?.type?.state || '', detail: comp.status?.type?.shortDetail || '', home: side(home), away: side(away), venue: d?.gameInfo?.venue?.fullName || '', events, stats };
}
