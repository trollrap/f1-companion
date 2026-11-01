import { ui } from './motion';
// Two display modes: device time (null offset) and track time (fixed UTC offset from OpenF1 gmt_offset).
export function parseOffset(s) {
  const m = /^([+-])?(\d+):(\d+)/.exec(s || ''); if (!m) return null;
  const v = Number(m[2]) * 60 + Number(m[3]); return m[1] === '-' ? -v : v;
}
const opts = {
  get hm() { return { hour: '2-digit', minute: '2-digit', hourCycle: ui.clock24 ? 'h23' : 'h12' }; }, day: { weekday: 'long' }, key: { year: 'numeric', month: '2-digit', day: '2-digit' },
};
export function fmt(kind, ms, off = null) {
  const o = { ...opts[kind], ...(off == null ? {} : { timeZone: 'UTC' }) };
  return new Intl.DateTimeFormat('en-GB', o).format(new Date(ms + (off == null ? 0 : off * 60000)));
}
export const hm = (ms, off) => fmt('hm', ms, off);
export const dayName = (ms, off) => fmt('day', ms, off).toUpperCase();
export const dayKey = (ms, off) => fmt('key', ms, off);
export function offLabel(off) {
  if (off == null) off = -new Date().getTimezoneOffset();
  const a = Math.abs(off); return 'UTC' + (off < 0 ? '-' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : '');
}
const trackDate = (iso, m) => new Date(Date.parse(iso) + (parseOffset(m.gmt_offset) || 0) * 60000); // read with UTC getters
export function dateRange(m) {
  const a = trackDate(m.date_start, m), b = trackDate(m.date_end, m), mo = (x) => x.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  if (a.getUTCDate() === b.getUTCDate() && mo(a) === mo(b)) return `${a.getUTCDate()} ${mo(a)}`;
  return mo(a) === mo(b) ? `${a.getUTCDate()}–${b.getUTCDate()} ${mo(a)} ${b.getUTCFullYear()}` : `${a.getUTCDate()} ${mo(a)} – ${b.getUTCDate()} ${mo(b)} ${b.getUTCFullYear()}`;
}
// "23–25 Oct" or "30 Oct – 1 Nov", read in track time.
export function shortRange(m) {
  const a = trackDate(m.date_start, m), b = trackDate(m.date_end, m), mo = (x) => x.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  if (a.getUTCDate() === b.getUTCDate() && mo(a) === mo(b)) return `${a.getUTCDate()} ${mo(a)}`;
  return mo(a) === mo(b) ? `${a.getUTCDate()}–${b.getUTCDate()} ${mo(a)}` : `${a.getUTCDate()} ${mo(a)} – ${b.getUTCDate()} ${mo(b)}`;
}
export const monthLabel = (m) => trackDate(m.date_start, m).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
// "Mexico City Grand Prix" -> "Mexico", "Spanish Grand Prix" -> "Spain". Unknown names just lose the "Grand Prix".
const GP = { 'mexico city': 'Mexico', mexican: 'Mexico', spanish: 'Spain', canadian: 'Canada', japanese: 'Japan', chinese: 'China', australian: 'Australia', british: 'Britain', italian: 'Italy', austrian: 'Austria', belgian: 'Belgium', dutch: 'Netherlands', hungarian: 'Hungary', brazilian: 'Brazil', 'são paulo': 'Brazil', 'sao paulo': 'Brazil', 'united states': 'USA', american: 'USA', 'saudi arabian': 'Saudi Arabia', french: 'France', portuguese: 'Portugal', turkish: 'Turkey', german: 'Germany', 'emilia romagna': 'Imola', 'san marino': 'Imola', russian: 'Russia', azerbaijan: 'Azerbaijan', 'qatar': 'Qatar', 'abu dhabi': 'Abu Dhabi', 'las vegas': 'Las Vegas', miami: 'Miami', monaco: 'Monaco', singapore: 'Singapore', bahrain: 'Bahrain' };
export const shortName = (n) => { const b = String(n || '').replace(/\s*(Grand Prix|GP)\s*$/i, '').trim(); return GP[b.toLowerCase()] || b; };
export function daysUntil(iso) {
  const a = new Date(iso), b = new Date();
  return Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) - Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) / 864e5);
}
const CC = { AUS:'AU',CHN:'CN',JPN:'JP',BRN:'BH',BHR:'BH',KSA:'SA',USA:'US',ITA:'IT',MON:'MC',MCO:'MC',ESP:'ES',CAN:'CA',AUT:'AT',GBR:'GB',BEL:'BE',HUN:'HU',NED:'NL',NLD:'NL',AZE:'AZ',SGP:'SG',SIN:'SG',MEX:'MX',BRA:'BR',QAT:'QA',UAE:'AE',ARE:'AE',MAS:'MY',MYS:'MY',DEU:'DE',GER:'DE',FRA:'FR',PRT:'PT',POR:'PT',TUR:'TR',RUS:'RU',ARG:'AR',ZAF:'ZA',RSA:'ZA',KOR:'KR',IND:'IN',CHE:'CH',SUI:'CH',SWE:'SE',MAR:'MA',LUX:'LU',VNM:'VN' };
// Country name (as Jolpica spells it) to the 3-letter code OpenF1 uses.
export const NAME3 = { Australia:'AUS',China:'CHN',Japan:'JPN',Bahrain:'BHR','Saudi Arabia':'KSA',USA:'USA','United States':'USA',Italy:'ITA',Monaco:'MON',Spain:'ESP',Canada:'CAN',Austria:'AUT',UK:'GBR','United Kingdom':'GBR',Belgium:'BEL',Hungary:'HUN',Netherlands:'NED',Azerbaijan:'AZE',Singapore:'SGP',Mexico:'MEX',Brazil:'BRA',Qatar:'QAT',UAE:'UAE','United Arab Emirates':'UAE',Malaysia:'MAS',Germany:'DEU',France:'FRA',Portugal:'PRT',Turkey:'TUR',Russia:'RUS',Argentina:'ARG','South Africa':'ZAF',Korea:'KOR','South Korea':'KOR',India:'IND',Switzerland:'CHE',Sweden:'SWE',Morocco:'MAR',Luxembourg:'LUX',Vietnam:'VNM' };
export const placeLine = (m) => (m.circuit_short_name && m.circuit_short_name !== m.location ? `${m.circuit_short_name}, ${m.location}` : m.location);
export const flag = (c) => CC[c] ? String.fromCodePoint(...[...CC[c]].map((ch) => 127397 + ch.charCodeAt(0))) : '🏁';
