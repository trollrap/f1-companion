// Team leadership for the 2026 season (STATIC data, typed in by hand: a change in a team's management needs an edit here).
// Keyed by Jolpica constructorId. The first person is the team principal; the photo is assets/principals/<teamId>.png (1:1).
// Each entry is shown in its own box on the team page.
const P = (name, role) => ({ name, role });
const WHEATLEY = [P('Jonathan Wheatley', 'Team Principal'), P('Mattia Binotto', 'Head of Audi F1 Project')];
export const principals = {
  mclaren: [P('Andrea Stella', 'Team Principal'), P('Zak Brown', 'CEO')],
  mercedes: [P('Toto Wolff', 'Team Principal & CEO')],
  red_bull: [P('Laurent Mekies', 'Team Principal')],
  ferrari: [P('Fred Vasseur', 'Team Principal & Managing Director')],
  williams: [P('James Vowles', 'Team Principal')],
  rb: [P('Alan Permane', 'Team Principal'), P('Peter Bayer', 'CEO')],
  aston_martin: [P('Adrian Newey', 'Managing Technical Partner & Team Principal'), P('Andy Cowell', 'CEO')],
  haas: [P('Ayao Komatsu', 'Team Principal'), P('Gene Haas', 'Founder & Chairman')],
  audi: WHEATLEY, sauber: WHEATLEY,
  alpine: [P('Flavio Briatore', 'Executive Advisor'), P('Steve Nielsen', 'Managing Director')],
  cadillac: [P('Graeme Lowdon', 'Team Principal')],
};
export const principalsOf = (teamId) => principals[teamId] || [];
