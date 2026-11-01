// Every line below was checked against the cited page on 26 Oct 2026. Do not add a rule without a source.
const F1_2026 = 'https://www.formula1.com/en/latest/article/the-beginners-guide-to-the-2026-regulations.6j0tS0hrHG2T01tpmK6XYz';
const F1_2026B = 'https://formula1.com/en/latest/article/everything-you-need-to-know-about-the-new-f1-rules-for-2026.48bv0VTxhIlhrQXmxercXk';
const SPRINT = 'https://www.formula1.com/en/latest/article/2024-f1-sprint-rules-format-explained.5pQvaAY52nnX9vZYAYgf3O';
const RN365 = 'https://racingnews365.com/f1-rules-explained';
export const RULES = [
  { key: '2026', title: '2026 regulations', sources: [['formula1.com: beginner’s guide', F1_2026], ['formula1.com: new rules', F1_2026B]], items: [
    ['Power unit', 'Still a 1.6-litre V6 turbo hybrid. Roughly half the power is electrical and half from the combustion engine. The MGU-H is gone.'],
    ['Fuel', 'Advanced Sustainable Fuels, made from carbon capture, municipal waste and non-food biomass, independently certified.'],
    ['Active aerodynamics', 'Replaces DRS. In Straight Mode the front and rear flaps open to cut drag. In Corner Mode they stay closed for downforce.'],
    ['Overtake Mode', 'A car within one second of the car ahead at a designated point gets extra electrical power for the next lap.'],
    ['Boost', 'The driver can trigger a power setting for attack or defence anywhere on the lap, if the battery has charge.'],
    ['Car size and weight', 'Maximum wheelbase 3.4 m (200 mm shorter). Floor width 1.9 m (100 mm narrower). Minimum weight 768 kg, down from 800 kg.'],
    ['Tyres', 'Pirelli 18-inch tyres, 25 mm narrower at the front and 30 mm narrower at the rear.'],
    ['Aerodynamics', 'Simpler front wings, a flatter floor instead of long ground-effect tunnels, and no rear beam wing.'],
    ['Safety', 'The roll-hoop vertical impact test rises from 16g to 20g. A two-stage nose cone keeps protecting after a first impact.'],
    ['Grid', 'Eleven teams and 22 cars, with Cadillac joining.'],
  ]},
  { key: 'weekend', title: 'Race weekend', sources: [['racingnews365: rules explained', RN365], ['formula1.com: sprint format', SPRINT], ['formula1.com: beginner’s guide', F1_2026]], items: [
    ['Qualifying', 'All 22 cars run in Q1 and the six slowest are out. Six more are out after Q2. The top 10 fight for pole in Q3. Sprint Qualifying uses the same SQ1, SQ2, SQ3 elimination.'],
    ['Race distance', 'A race must cover at least 300 km plus one extra lap, apart from Monaco, which is shorter (about 260 km).'],
    ['Race time limit', 'Two hours from the start. Time under a red flag does not count, so a race can last three hours in total.'],
    ['Sprint weekend', 'FP1, then Sprint Qualifying, then the Sprint, then Qualifying, then the Grand Prix. This order is from the 2024 format guide.'],
    ['Sprint', 'About 100 km, around 30 minutes, with no planned pit stops.'],
    ['Sprint Qualifying', 'SQ1 is 12 minutes, SQ2 is 10 and SQ3 is 8. Medium tyres in SQ1 and SQ2, soft tyres in SQ3. These durations are from the 2024 guide.'],
  ]},
  { key: 'points', title: 'Points', sources: [['racingnews365: rules explained', RN365], ['formula1.com: sprint format', SPRINT]], items: [
    ['Race', '1st 25, 2nd 18, 3rd 15, 4th 12, 5th 10, 6th 8, 7th 6, 8th 4, 9th 2, 10th 1.'],
    ['Fastest lap', 'The extra point for fastest lap was abolished from 2025.'],
    ['Sprint', '1st 8, 2nd 7, 3rd 6, 4th 5, 5th 4, 6th 3, 7th 2, 8th 1.'],
  ]},
  { key: 'flags', title: 'Flags', sources: [['racingnews365: rules explained', RN365]], items: [
    ['Yellow', 'Danger. Reduce speed and no overtaking.'],
    ['Red', 'The race is stopped. Reduce speed and return to the pits.'],
    ['Blue', 'The approaching driver has lapped you. Let them pass.'],
    ['Black', 'With a start number: that driver is disqualified and must return to the pit lane immediately.'],
    ['Black and white', 'With a start number: a warning. A further indiscretion on the track will lead to a penalty.'],
    ['Green', 'The track is clear again. Continue racing.'],
    ['Chequered', 'The race has finished.'],
  ]},
  { key: 'penalties', title: 'Penalties', sources: [['racingnews365: rules explained', RN365]], items: [
    ['Time penalty', 'Usually 5 or 10 seconds added to the driver’s race time.'],
    ['Drive-through', 'The driver must drive through the pit lane at pit-lane speed without stopping.'],
    ['Stop-and-go', 'For more serious offences: the driver stops for 10 seconds at their garage.'],
    ['Disqualification', 'The driver is removed from the results.'],
  ]},
];
