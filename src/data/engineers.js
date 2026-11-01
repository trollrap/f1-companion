// Race engineers for the 2026 season (STATIC data, from motorsport.com's list; engineers move between cars, so edit by hand when they change).
// Keyed by Jolpica driverId. The photo is assets/engineers/<driverId>.png.
export const engineers = {
  norris: 'Will Joseph', piastri: 'Tom Stallard', antonelli: 'Peter Bonnington', russell: 'Marcus Dudley', max_verstappen: 'Gianpiero Lambiase',
  hadjar: 'Richard Wood', hamilton: 'Carlos Santi', leclerc: 'Bryan Bozzi', albon: 'James Urwin', sainz: 'Gaetan Jego', lawson: 'Alexandre Iliopoulos',
  lindblad: 'Pierre Hamelin', alonso: 'Chris Cronin', stroll: 'Gary Gannon', ocon: 'Laura Müller', bearman: "Ronan O'Hare", bortoleto: 'Jose Manuel Lopez',
  hulkenberg: 'Steven Petrik', gasly: 'Josh Peckett', colapinto: 'Stuart Barlow', bottas: 'John Howard', perez: 'Carlo Pasetti',
};
export const engineerOf = (driverId) => engineers[driverId] || null;
