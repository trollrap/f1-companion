import { yearSessions, openf1Season, YEAR } from '../api/openf1';
// Calendar file (.ics) of upcoming sessions, with a reminder before each. kind: 'races' | 'quali' | 'all'.
const pad = (n) => String(n).padStart(2, '0');
const utc = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
const esc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
// Lines longer than 75 bytes are folded, as the format requires.
const fold = (l) => { if (l.length <= 74) return l; const out = []; let r = l; out.push(r.slice(0, 74)); r = r.slice(74); while (r.length) { out.push(' ' + r.slice(0, 73)); r = r.slice(73); } return out.join('\r\n'); };
const KEEP = { races: /^(Race|Sprint)$/, quali: /^(Race|Sprint|Qualifying|Sprint Qualifying|Sprint Shootout)$/, all: /./ };
export function buildIcs(sessions, kind = 'races', lead = 30, now = Date.now()) {
  // `kind` is a preset name or an object { types: ['Race', ...], next: number of race weekends (0 = all) }.
  const types = kind && typeof kind === 'object' ? new Set(kind.types) : null; const keep = types ? { test: (n) => types.has(n) } : (KEEP[kind] || KEEP.races);
  let list = sessions.filter((s) => keep.test(s.session_name) && Date.parse(s.date_end || s.date_start) > now);
  if (kind && typeof kind === 'object' && kind.next > 0) { const keys = []; list.forEach((s) => { if (!keys.includes(s.meeting_key)) keys.push(s.meeting_key); }); const ok = new Set(keys.slice(0, kind.next)); list = list.filter((s) => ok.has(s.meeting_key)); }
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//F1 Companion//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:F1 ${YEAR}`];
  list.forEach((s) => { const a = Date.parse(s.date_start), b = Date.parse(s.date_end) || a + 3600e3; const name = `${s.meeting_name || s.country_name || 'F1'}`.replace(/ Grand Prix$/i, ' GP');
    L.push('BEGIN:VEVENT', `UID:f1c-${s.session_key}@f1-companion`, `DTSTAMP:${utc(now)}`, `DTSTART:${utc(a)}`, `DTEND:${utc(b)}`, fold(`SUMMARY:${esc(`F1 ${s.session_name}: ${name}`)}`), fold(`LOCATION:${esc([s.circuit_short_name, s.country_name].filter(Boolean).join(', '))}`), 'BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(`${s.session_name} starts in ${lead} minutes`)}`), `TRIGGER:-PT${lead}M`, 'END:VALARM', 'END:VEVENT'); });
  L.push('END:VCALENDAR'); return { text: L.join('\r\n') + '\r\n', count: list.length };
}
export async function shareCalendar(kind = 'races', lead = 30) {
  const FS = require('expo-file-system/legacy'); const sessions = await yearSessions(); const { text, count } = buildIcs(sessions, kind, lead);
  if (!count) throw new Error('There are no upcoming sessions left this season.');
  const path = `${FS.documentDirectory}f1-${YEAR}-${typeof kind === 'string' ? kind : 'custom'}.ics`; await FS.writeAsStringAsync(path, text);
  const Sharing = require('expo-sharing'); if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(path, { mimeType: 'text/calendar', dialogTitle: 'Add to your calendar', UTI: 'public.calendar-event' }); return `${count} sessions`;
}
