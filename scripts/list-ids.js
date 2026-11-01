// Run with: npm run media:ids   (needs Node 18+ and internet)
// Prints the exact file names to use for the current season's drivers and teams (the ids come from Jolpica, the same source the app uses).
const BASE = 'https://api.jolpi.ca/ergast/f1/2026';
(async () => {
  const d = await (await fetch(`${BASE}/drivers.json?limit=100`)).json(), c = await (await fetch(`${BASE}/constructors.json?limit=100`)).json();
  console.log('DRIVER PHOTOS  -> assets/drivers/<name>.png');
  d.MRData.DriverTable.Drivers.forEach((x) => console.log(`  ${x.driverId}.png   (${x.givenName} ${x.familyName})`));
  console.log('\nTEAM CARS      -> assets/cars/<name>.png     TEAM LOGOS -> assets/logos/<name>.png');
  c.MRData.ConstructorTable.Constructors.forEach((x) => console.log(`  ${x.constructorId}.png   (${x.name})`));
})().catch((e) => { console.error('Could not reach Jolpica:', e.message); process.exit(1); });
