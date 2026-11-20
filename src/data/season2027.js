// The 2027 season as announced (24 rounds, 10 sprint weekends; calendar from Formula 1 and the circuits' own announcements, line-ups as confirmed by the teams up to mid-November 2026).
// It is only a fallback: as soon as the data server publishes the 2027 schedule or entry list, the live data is used instead.
const R = (round, raceName, circuitName, locality, country, start, date, sprint = false) => ({ season: '2027', round: String(round), raceName, date, weekendStart: start, sprintWeekend: sprint, Circuit: { circuitName, Location: { locality, country } } });
export const CALENDAR_2027 = [
  R(1, 'Bahrain Grand Prix', 'Bahrain International Circuit', 'Sakhir', 'Bahrain', '2027-03-12', '2027-03-14', true),
  R(2, 'Saudi Arabian Grand Prix', 'Jeddah Corniche Circuit', 'Jeddah', 'Saudi Arabia', '2027-03-19', '2027-03-21'),
  R(3, 'Australian Grand Prix', 'Albert Park Grand Prix Circuit', 'Melbourne', 'Australia', '2027-04-02', '2027-04-04', true),
  R(4, 'Japanese Grand Prix', 'Suzuka Circuit', 'Suzuka', 'Japan', '2027-04-09', '2027-04-11', true),
  R(5, 'Chinese Grand Prix', 'Shanghai International Circuit', 'Shanghai', 'China', '2027-04-16', '2027-04-18'),
  R(6, 'Miami Grand Prix', 'Miami International Autodrome', 'Miami', 'USA', '2027-04-30', '2027-05-02'),
  R(7, 'Canadian Grand Prix', 'Circuit Gilles Villeneuve', 'Montreal', 'Canada', '2027-05-21', '2027-05-23', true),
  R(8, 'Monaco Grand Prix', 'Circuit de Monaco', 'Monte-Carlo', 'Monaco', '2027-06-04', '2027-06-06', true),
  R(9, 'Portuguese Grand Prix', 'Autódromo Internacional do Algarve', 'Portimão', 'Portugal', '2027-06-18', '2027-06-20'),
  R(10, 'British Grand Prix', 'Silverstone Circuit', 'Silverstone', 'UK', '2027-07-02', '2027-07-04', true),
  R(11, 'Austrian Grand Prix', 'Red Bull Ring', 'Spielberg', 'Austria', '2027-07-09', '2027-07-11'),
  R(12, 'Belgian Grand Prix', 'Circuit de Spa-Francorchamps', 'Spa', 'Belgium', '2027-07-23', '2027-07-25'),
  R(13, 'Hungarian Grand Prix', 'Hungaroring', 'Budapest', 'Hungary', '2027-07-30', '2027-08-01'),
  R(14, 'Italian Grand Prix', 'Autodromo Nazionale di Monza', 'Monza', 'Italy', '2027-09-03', '2027-09-05', true),
  R(15, 'Spanish Grand Prix', 'Madring', 'Madrid', 'Spain', '2027-09-10', '2027-09-12'),
  R(16, 'Azerbaijan Grand Prix', 'Baku City Circuit', 'Baku', 'Azerbaijan', '2027-09-24', '2027-09-26'),
  R(17, 'Turkish Grand Prix', 'Istanbul Park', 'Istanbul', 'Turkey', '2027-10-01', '2027-10-03'),
  R(18, 'Singapore Grand Prix', 'Marina Bay Street Circuit', 'Marina Bay', 'Singapore', '2027-10-08', '2027-10-10'),
  R(19, 'United States Grand Prix', 'Circuit of the Americas', 'Austin', 'USA', '2027-10-22', '2027-10-24'),
  R(20, 'Mexico City Grand Prix', 'Autódromo Hermanos Rodríguez', 'Mexico City', 'Mexico', '2027-10-29', '2027-10-31'),
  R(21, 'São Paulo Grand Prix', 'Autódromo José Carlos Pace', 'São Paulo', 'Brazil', '2027-11-05', '2027-11-07', true),
  R(22, 'Las Vegas Grand Prix', 'Las Vegas Strip Street Circuit', 'Las Vegas', 'USA', '2027-11-19', '2027-11-21'),
  R(23, 'Qatar Grand Prix', 'Lusail International Circuit', 'Lusail', 'Qatar', '2027-12-03', '2027-12-05', true),
  R(24, 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', 'Yas Island', 'UAE', '2027-12-10', '2027-12-12', true),
];
const D = (driverId, first, last) => ({ driverId, name: `${first} ${last}`, first, last });
// Haas' second seat (Bearman) and Racing Bulls' line-up were still being finalised in mid-November 2026.
export const GRID_2027 = [
  { teamId: 'mercedes', name: 'Mercedes', drivers: [D('antonelli', 'Kimi', 'Antonelli'), D('russell', 'George', 'Russell')] },
  { teamId: 'ferrari', name: 'Ferrari', drivers: [D('leclerc', 'Charles', 'Leclerc'), D('hamilton', 'Lewis', 'Hamilton')] },
  { teamId: 'red_bull', name: 'Red Bull', drivers: [D('max_verstappen', 'Max', 'Verstappen'), D('hadjar', 'Isack', 'Hadjar')] },
  { teamId: 'mclaren', name: 'McLaren', drivers: [D('norris', 'Lando', 'Norris'), D('piastri', 'Oscar', 'Piastri')] },
  { teamId: 'alpine', name: 'Alpine', drivers: [D('gasly', 'Pierre', 'Gasly'), D('colapinto', 'Franco', 'Colapinto')] },
  { teamId: 'rb', name: 'Racing Bulls', drivers: [D('lawson', 'Liam', 'Lawson'), D('lindblad', 'Arvid', 'Lindblad')] },
  { teamId: 'haas', name: 'Haas F1 Team', drivers: [D('bearman', 'Oliver', 'Bearman'), D('rafael_camara', 'Rafael', 'Câmara')] },
  { teamId: 'audi', name: 'Audi', drivers: [D('hulkenberg', 'Nico', 'Hülkenberg'), D('bortoleto', 'Gabriel', 'Bortoleto')] },
  { teamId: 'williams', name: 'Williams', drivers: [D('sainz', 'Carlos', 'Sainz'), D('albon', 'Alexander', 'Albon')] },
  { teamId: 'aston_martin', name: 'Aston Martin', drivers: [D('alonso', 'Fernando', 'Alonso'), D('stroll', 'Lance', 'Stroll')] },
  { teamId: 'cadillac', name: 'Cadillac', drivers: [D('perez', 'Sergio', 'Pérez'), D('bottas', 'Valtteri', 'Bottas')] },
];
