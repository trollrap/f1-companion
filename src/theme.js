export const colors = {
  bg: '#0A0506', surface: '#140B0D', surface2: '#1E1215', line: '#2E1B20', fg: '#F7F1F2', muted: '#9E8D92',
  accent: '#F0141E', accentSoft: '#3B0C11', red: '#F0141E', good: '#22C55E', gold: '#F5C400', purple: '#B26BFF', sprint: '#FF2D87',
};
// Constructor colours by Jolpica constructorId. These are fallbacks: the app overrides them at runtime with the colours OpenF1
// reports for the current season (see src/api/paddock.js), so new teams get their real colour without a code change.
export const teamColors = { mercedes: '#27F4D2', ferrari: '#E8002D', red_bull: '#3671C6', mclaren: '#FF8000', aston_martin: '#229971', alpine: '#FF87BC', williams: '#64C4FF', haas: '#B6BABD', rb: '#6692FF', sauber: '#52E252' };
const live = {};
export const setLiveTeamColors = (m) => { Object.keys(live).forEach((k) => delete live[k]); Object.assign(live, m); };
// Teams that no longer race (or never reported a colour) still get a stable colour of their own, so old seasons are not all grey.
const OLD = { williams: '#64C4FF', lotus_f1: '#B8A100', renault: '#FFF500', toro_rosso: '#469BFF', alphatauri: '#5E8FAA', racing_point: '#F596C8', force_india: '#F596C8', alfa: '#B12039', sauber: '#52E252', bmw_sauber: '#2F6BBB', jordan: '#F5D90A', benetton: '#00A651', tyrrell: '#1E3F8C', brabham: '#2D6B3F', lotus: '#1F6B3A', minardi: '#222222', jaguar: '#0E6B3B', toyota: '#E10020', honda: '#E5E5E5', brawn: '#C7F000', bar: '#A8A8A8', stewart: '#EEEEEE', ligier: '#2B5FAE', arrows: '#F57C00', march: '#7A5C2E', cooper: '#2A6B3A', maserati: '#B30000', matra: '#2B5FAE', bmw: '#2F6BBB', manor: '#E10600', marussia: '#D22630', caterham: '#0B6B3A', hrt: '#A0A0A0', virgin: '#C8102E', spyker: '#FF6A00', mf1: '#C8102E', super_aguri: '#E10600', midland: '#C8102E', prost: '#2B5FAE', leyton: '#7AB8E0', ferrari_old: '#E8002D', audi: '#B8B8B8', cadillac: '#C8C8C8', rb: '#6692FF' };
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
const stable = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return hsl(h % 360, 45, 50); };
export const teamColor = (id) => live[id] || teamColors[id] || OLD[id] || stable(id);
// '#RRGGBB' + alpha 0..1 -> '#RRGGBBAA'
export const alpha = (hex, a) => hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
