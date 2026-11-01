// Circuit facts, checked against Wikipedia and Formula 1 race/circuit pages on 28 Oct 2026, including every 2026 race fastest lap against the stored lap record.
// A figure that could not be confirmed is left out and its row is hidden. Matched against circuit name, city and country (not the Grand Prix name).
export const CIRCUITS = [
{
 "key": "albert_park",
 "match": new RegExp("albert park|melbourne", "i"),
 "name": "Albert Park Circuit",
 "place": "Melbourne, Australia",
 "stats": [
  [
   "Lap length",
   "5.278 km"
  ],
  [
   "Turns",
   "14"
  ],
  [
   "Race laps",
   "58"
  ],
  [
   "Race distance",
   "306.124 km"
  ],
  [
   "First Grand Prix",
   "1996"
  ]
 ],
 "lapRecord": {
  "time": "1:19.813",
  "driver": "Charles Leclerc",
  "team": "Ferrari",
  "year": 2024
 },
 "facts": [
  [
   "Thirty years of Melbourne",
   "2026 marks 30 years since the first F1 World Championship Grand Prix in Melbourne."
  ],
  [
   "Schumacher's record",
   "Michael Schumacher has the most Melbourne wins, with four."
  ],
  [
   "Ferrari's tally",
   "Ferrari has the most Melbourne victories among teams, with 10."
  ]
 ],
 "about": "Albert Park Circuit in Melbourne is a 5.278 km, 14-turn layout that hosts the Australian Grand Prix over 58 laps. The current layout's race lap record is 1:19.813, set by Charles Leclerc in 2024."
},
{
 "key": "shanghai",
 "match": new RegExp("shanghai", "i"),
 "name": "Shanghai International Circuit",
 "place": "Shanghai, China",
 "stats": [
  [
   "Lap length",
   "5.451 km"
  ],
  [
   "Turns",
   "16"
  ],
  [
   "Race laps",
   "56"
  ],
  [
   "Race distance",
   "305.066 km"
  ],
  [
   "First Grand Prix",
   "2004"
  ]
 ],
 "lapRecord": {
  "time": "1:32.238",
  "driver": "Michael Schumacher",
  "team": "Ferrari",
  "year": 2004
 },
 "facts": [
  [
   "Purpose-built for F1",
   "The Shanghai International Circuit is the first in China to be purpose-built for Formula One."
  ],
  [
   "Shang layout",
   "From a bird's-eye view, the circuit layout resembles the Chinese symbol for 'shang', meaning upwards."
  ],
  [
   "Hamilton's wins",
   "Lewis Hamilton has won the most Chinese Grands Prix, with 6 victories."
  ]
 ],
 "about": "Shanghai International Circuit in Jiading is a 5.451 km, 16-turn track that hosted its first Grand Prix in 2004, won by Rubens Barrichello. The Chinese Grand Prix runs 56 laps (305.066 km)."
},
{
 "key": "suzuka",
 "match": new RegExp("suzuka", "i"),
 "name": "Suzuka International Racing Course",
 "place": "Suzuka, Japan",
 "stats": [
  [
   "Lap length",
   "5.807 km"
  ],
  [
   "Turns",
   "18"
  ],
  [
   "Race laps",
   "53"
  ],
  [
   "Race distance",
   "307.471 km"
  ],
  [
   "First Grand Prix",
   "1987"
  ]
 ],
 "lapRecord": {
  "time": "1:30.965",
  "driver": "Andrea Kimi Antonelli",
  "team": "Mercedes",
  "year": 2025
 },
 "facts": [
  [
   "Figure-of-eight",
   "Suzuka is the only figure-of-eight track on the F1 calendar."
  ],
  [
   "Title decider",
   "Suzuka has hosted the season finale six times and crowned 12 world champions, more than any other circuit."
  ],
  [
   "Degner curves",
   "The Degner curves are named after Ernst Degner, who crashed there during the track's inaugural motorcycle meeting in 1962."
  ]
 ],
 "about": "Suzuka is a 5.807 km, 18-turn figure-of-eight circuit in Suzuka City, Mie Prefecture, whose 1987 Japanese Grand Prix was the first held there. The race is run over 53 laps."
},
{
 "key": "bahrain",
 "match": new RegExp("sakhir|bahrain international", "i"),
 "name": "Bahrain International Circuit",
 "place": "Sakhir, Bahrain",
 "stats": [
  [
   "Lap length",
   "5.412 km"
  ],
  [
   "Turns",
   "15"
  ],
  [
   "Race laps",
   "57"
  ],
  [
   "Race distance",
   "308.238 km"
  ],
  [
   "First Grand Prix",
   "2004"
  ]
 ],
 "lapRecord": {
  "time": "1:31.447",
  "driver": "Pedro de la Rosa",
  "team": "McLaren",
  "year": 2005
 },
 "facts": [
  [
   "First in the Middle East",
   "The 2004 Bahrain Grand Prix was the first Formula One Grand Prix to be held in the Middle East."
  ],
  [
   "Schumacher corner",
   "The first corner was renamed in honour of Michael Schumacher in 2014."
  ],
  [
   "Duel in the Desert",
   "In 2014, Hamilton and Rosberg had a close late-race battle that became known as the 'Duel in the Desert'."
  ]
 ],
 "about": "Bahrain International Circuit in Sakhir is a 5.412 km, 15-turn Grand Prix layout that opened on 17 March 2004. Its first Grand Prix was the first Formula One race held in the Middle East."
},
{
 "key": "jeddah",
 "match": new RegExp("jeddah", "i"),
 "name": "Jeddah Corniche Circuit",
 "place": "Jeddah, Saudi Arabia",
 "stats": [
  [
   "Lap length",
   "6.174 km"
  ],
  [
   "Turns",
   "27"
  ],
  [
   "Race laps",
   "50"
  ],
  [
   "Race distance",
   "308.450 km"
  ],
  [
   "First Grand Prix",
   "2021"
  ]
 ],
 "lapRecord": {
  "time": "1:30.734",
  "driver": "Lewis Hamilton",
  "team": "Mercedes",
  "year": 2021
 },
 "facts": [
  [
   "Most corners",
   "With 27 turns, it has the most corners of any circuit on the calendar."
  ],
  [
   "Fastest street circuit",
   "The F1 circuit page calls it the fastest street circuit ever seen in Formula 1."
  ]
 ],
 "about": "Jeddah Corniche Circuit is a 6.174 km, 27-turn temporary street circuit on the Corniche coastal area of Jeddah, which hosted its first Grand Prix in 2021. The Saudi Arabian Grand Prix runs 50 laps (308.45 km)."
},
{
 "key": "miami",
 "match": new RegExp("miami", "i"),
 "name": "Miami International Autodrome",
 "place": "Miami Gardens, United States",
 "stats": [
  [
   "Lap length",
   "5.412 km"
  ],
  [
   "Turns",
   "19"
  ],
  [
   "Race laps",
   "57"
  ],
  [
   "Race distance",
   "308.326 km"
  ],
  [
   "First Grand Prix",
   "2022"
  ]
 ],
 "lapRecord": {
  "time": "1:29.708",
  "driver": "Max Verstappen",
  "team": "Red Bull Racing",
  "year": 2023
 },
 "facts": [
  [
   "Temporary stadium circuit",
   "It is a temporary circuit built around the Hard Rock Stadium complex, home of the NFL's Miami Dolphins."
  ],
  [
   "36 layouts",
   "Designers simulated 36 different layouts before settling on the current one."
  ],
  [
   "Three DRS zones",
   "The track has three straights, three DRS zones, and top speeds above 350 km/h."
  ]
 ],
 "about": "The Miami International Autodrome is a 5.412 km, 19-turn temporary circuit around Hard Rock Stadium in Miami Gardens, Florida. The Miami Grand Prix joined the Formula One calendar in 2022 and runs 57 laps."
},
{
 "key": "villeneuve",
 "match": new RegExp("montr|villeneuve", "i"),
 "name": "Circuit Gilles Villeneuve",
 "place": "Montréal, Canada",
 "stats": [
  [
   "Lap length",
   "4.361 km"
  ],
  [
   "Turns",
   "14"
  ],
  [
   "Race laps",
   "70"
  ],
  [
   "Race distance",
   "305.270 km"
  ],
  [
   "First Grand Prix",
   "1978"
  ]
 ],
 "lapRecord": {
  "time": "1:13.078",
  "driver": "Valtteri Bottas",
  "team": "Mercedes",
  "year": 2019
 },
 "facts": [
  [
   "Island circuit",
   "The circuit is on Notre Dame Island, a man-made island in the St. Lawrence River largely built up for Expo 67."
  ],
  [
   "Wall of Champions",
   "Turn 14 got its nickname after three former World Champions hit the outside wall in the 1999 race."
  ],
  [
   "Longest race",
   "The 2011 race was the longest World Championship Grand Prix ever, at over four hours, because of a rain delay."
  ]
 ],
 "about": "Circuit Gilles Villeneuve sits on Notre Dame Island in the St. Lawrence River, Montréal. It has hosted the Canadian Grand Prix since 1978."
},
{
 "key": "monaco",
 "match": new RegExp("monaco|monte.?carlo", "i"),
 "name": "Circuit de Monaco",
 "place": "Monte Carlo, Monaco",
 "stats": [
  [
   "Lap length",
   "3.337 km"
  ],
  [
   "Turns",
   "19"
  ],
  [
   "Race laps",
   "78"
  ],
  [
   "Race distance",
   "260.286 km"
  ],
  [
   "First Grand Prix",
   "1950"
  ]
 ],
 "lapRecord": {
  "time": "1:12.909",
  "driver": "Lewis Hamilton",
  "team": "Mercedes",
  "year": 2021
 },
 "facts": [
  [
   "Home winner",
   "Charles Leclerc was the first Monégasque to win the Monaco Grand Prix as a Formula One World Championship event."
  ],
  [
   "Slowest corner",
   "The Fairmont Hairpin is the slowest corner in Formula One, taken at just 48 km/h."
  ],
  [
   "Piquet on Monaco",
   "Nelson Piquet likened racing there to \"riding a bicycle around your living room\"."
  ]
 ],
 "about": "The Circuit de Monaco winds through the streets of Monte Carlo and has hosted a Formula One race since the championship began in 1950. The current Grand Prix layout is 3.337 km with 19 turns."
},
{
 "key": "catalunya",
 "match": new RegExp("catalunya|barcelona|montmel", "i"),
 "name": "Circuit de Barcelona-Catalunya",
 "place": "Montmeló, Spain",
 "stats": [
  [
   "Lap length",
   "4.657 km"
  ],
  [
   "Turns",
   "14"
  ],
  [
   "Race laps",
   "66"
  ],
  [
   "Race distance",
   "307.236 km"
  ],
  [
   "First Grand Prix",
   "1991"
  ]
 ],
 "lapRecord": {
  "time": "1:15.743",
  "driver": "Oscar Piastri",
  "team": "McLaren",
  "year": 2025
 },
 "facts": [
  [
   "Debut winners",
   "The circuit has seen two debut Formula One wins: Pastor Maldonado in 2012 and Max Verstappen in 2016."
  ],
  [
   "Sustainability",
   "It was ranked the second most sustainable racetrack in the world in a 2021 report."
  ]
 ],
 "about": "Circuit de Barcelona-Catalunya at Montmeló has hosted the Spanish Grand Prix since 1991. The current layout is 4.657 km with 14 turns and no final chicane."
},
{
 "key": "red_bull_ring",
 "match": new RegExp("spielberg|red bull ring|a1.?ring", "i"),
 "name": "Red Bull Ring",
 "place": "Spielberg, Austria",
 "stats": [
  [
   "Lap length",
   "4.326 km"
  ],
  [
   "Turns",
   "10"
  ],
  [
   "Race laps",
   "71"
  ],
  [
   "Race distance",
   "307.026 km"
  ],
  [
   "First Grand Prix",
   "1970"
  ]
 ],
 "lapRecord": {
  "time": "1:07.924",
  "driver": "Oscar Piastri",
  "team": "McLaren",
  "year": 2025
 },
 "facts": [
  [
   "Niki Lauda Turn",
   "Turn 1 was renamed the Niki Lauda Turn in 2019 in honour of the three-time World Champion."
  ],
  [
   "Old Österreichring",
   "The original Österreichring was considered dangerous, with almost no run-off at the Bosch Kurve."
  ]
 ],
 "about": "The Red Bull Ring is a short, fast circuit in Spielberg, Styria. The Austrian Grand Prix was first held at this site in 1970, when it was the Österreichring."
},
{
 "key": "silverstone",
 "match": new RegExp("silverstone", "i"),
 "name": "Silverstone Circuit",
 "place": "Silverstone, United Kingdom",
 "stats": [
  [
   "Lap length",
   "5.891 km"
  ],
  [
   "Turns",
   "18"
  ],
  [
   "Race laps",
   "52"
  ],
  [
   "Race distance",
   "306.198 km"
  ],
  [
   "First Grand Prix",
   "1950"
  ]
 ],
 "lapRecord": {
  "time": "1:27.097",
  "driver": "Max Verstappen",
  "team": "Red Bull Racing",
  "year": 2020
 },
 "facts": [
  [
   "First championship race",
   "Silverstone hosted the first race of the World Championship of Drivers in 1950."
  ],
  [
   "Mutton Grand Prix",
   "The first informal race in 1947 was nicknamed the Mutton Grand Prix after a driver hit a sheep that wandered onto the airfield."
  ],
  [
   "Mansell and Piquet",
   "In 1987 Nigel Mansell passed Nelson Piquet into Stowe on his way to victory."
  ]
 ],
 "about": "Silverstone is built on a former airfield in Northamptonshire and is the home of the British Grand Prix. The current Arena Grand Prix layout is 5.891 km with 18 turns."
},
{
 "key": "spa",
 "match": new RegExp("\\bspa\\b|francorchamps|stavelot", "i"),
 "name": "Circuit de Spa-Francorchamps",
 "place": "Stavelot, Belgium",
 "stats": [
  [
   "Lap length",
   "7.004 km"
  ],
  [
   "Turns",
   "19"
  ],
  [
   "Race laps",
   "44"
  ],
  [
   "Race distance",
   "308.054 km"
  ],
  [
   "First Grand Prix",
   "1950"
  ]
 ],
 "lapRecord": {
  "time": "1:44.701",
  "driver": "Sergio Pérez",
  "team": "Red Bull Racing",
  "year": 2024
 },
 "facts": [
  [
   "Shortened in 1979",
   "The circuit was cut from about 14.1 km to 6.947 km in 1979 because of safety concerns with the old public-road course."
  ],
  [
   "Jacky Ickx corner",
   "Turn 11 has been called the Jacky Ickx corner since the 2018 Belgian Grand Prix."
  ]
 ],
 "about": "Spa-Francorchamps is the longest circuit on the calendar at 7.004 km. It runs through the Ardennes forest and has hosted the Belgian Grand Prix since the championship began in 1950."
},
{
 "key": "hungaroring",
 "match": new RegExp("hungaroring|budapest|mogyor", "i"),
 "name": "Hungaroring",
 "place": "Mogyoród, Hungary",
 "stats": [
  [
   "Lap length",
   "4.381 km"
  ],
  [
   "Turns",
   "14"
  ],
  [
   "Race laps",
   "70"
  ],
  [
   "Race distance",
   "306.630 km"
  ],
  [
   "First Grand Prix",
   "1986"
  ]
 ],
 "lapRecord": {
  "time": "1:16.627",
  "driver": "Lewis Hamilton",
  "team": "Mercedes",
  "year": 2020
 },
 "facts": [
  [
   "Built in eight months",
   "The circuit was built in eight months, less time than any other Formula One circuit."
  ],
  [
   "Iron Curtain race",
   "The 1986 Hungarian Grand Prix was the only Formula 1 race held behind the Iron Curtain."
  ]
 ],
 "about": "The Hungaroring is a 4.381 km, 14-turn circuit at Mogyoród, Pest County, Hungary, which first hosted a Formula 1 race in 1986. Its twisty, bumpy layout makes overtaking difficult in dry conditions."
},
{
 "key": "zandvoort",
 "match": new RegExp("zandvoort", "i"),
 "name": "Circuit Zandvoort",
 "place": "Zandvoort, Netherlands",
 "stats": [
  [
   "Lap length",
   "4.259 km"
  ],
  [
   "Turns",
   "14"
  ],
  [
   "Race laps",
   "72"
  ],
  [
   "Race distance",
   "306.592 km"
  ],
  [
   "First Grand Prix",
   "1952"
  ]
 ],
 "lapRecord": {
  "time": "1:11.097",
  "driver": "Lewis Hamilton",
  "team": "Mercedes",
  "year": 2021
 },
 "facts": [
  [
   "Banked final corner",
   "The final corner, named after Arie Luyendyk, has 18 degrees of banking, nearly double that of Indianapolis."
  ],
  [
   "Only Dutch GP venue",
   "Zandvoort is the only venue to have hosted the Dutch Grand Prix since 1952."
  ],
  [
   "Built after the war",
   "The track was built after the war, partly using communication roads constructed by the occupying German army."
  ]
 ],
 "about": "Circuit Zandvoort is a 4.259 km, 14-turn circuit in Zandvoort, North Holland, in the sand dunes. The Dutch Grand Prix returned to the F1 calendar in 2021."
},
{
 "key": "monza",
 "match": new RegExp("monza", "i"),
 "name": "Autodromo Nazionale Monza",
 "place": "Monza, Italy",
 "stats": [
  [
   "Lap length",
   "5.793 km"
  ],
  [
   "Turns",
   "11"
  ],
  [
   "Race laps",
   "53"
  ],
  [
   "Race distance",
   "306.720 km"
  ],
  [
   "First Grand Prix",
   "1950"
  ]
 ],
 "lapRecord": {
  "time": "1:20.901",
  "driver": "Lando Norris",
  "team": "McLaren",
  "year": 2025
 },
 "facts": [
  [
   "Built in 110 days",
   "The circuit was built in just 110 days in 1922."
  ],
  [
   "Third purpose-built track",
   "It was the world's third purpose-built race track, after Brooklands and Indianapolis."
  ],
  [
   "Fastest on the calendar",
   "Known as the Temple of Speed, it is the fastest track on the Formula One calendar and has held that distinction since 1991."
  ]
 ],
 "about": "Autodromo Nazionale Monza is a 5.793 km circuit at Monza, Italy, north of Milan, with 11 turns on the modern Grand Prix layout. The Italian Grand Prix has been held there every year since 1950 except one."
},
{
 "key": "madring",
 "match": new RegExp("madring|madrid", "i"),
 "name": "Madring",
 "place": "Madrid, Spain",
 "stats": [
  [
   "Lap length",
   "5.414 km"
  ],
  [
   "Turns",
   "22"
  ],
  [
   "Race laps",
   "57"
  ],
  [
   "Race distance",
   "308.399 km"
  ],
  [
   "First Grand Prix",
   "2026"
  ]
 ],
 "lapRecord": {
  "time": "1:35.587",
  "driver": "George Russell",
  "team": "Mercedes",
  "year": 2026
 },
 "facts": [
  [
   "Banked La Monumental",
   "La Monumental, a banked curve, is 550 m long with a gradient of up to 24%."
  ],
  [
   "First new circuit since Las Vegas",
   "It is the first new circuit added to the F1 calendar since Las Vegas in 2023."
  ],
  [
   "Sainz ambassador",
   "Madrid-born Carlos Sainz is the circuit ambassador, and this is his first true home race."
  ]
 ],
 "about": "Madring is a 22-turn circuit in Madrid that mixes public roads with purpose-built sections around IFEMA Madrid and Valdebebas. It hosted the Spanish Grand Prix on 13 September 2026, won by Kimi Antonelli over 57 laps.",
 "lapRecordLabel": "Fastest race lap (inaugural race)"
},
{
 "key": "baku",
 "match": new RegExp("baku", "i"),
 "name": "Baku City Circuit",
 "place": "Baku, Azerbaijan",
 "stats": [
  [
   "Lap length",
   "6.003 km"
  ],
  [
   "Turns",
   "20"
  ],
  [
   "Race laps",
   "51"
  ],
  [
   "Race distance",
   "306.042 km"
  ],
  [
   "First Grand Prix",
   "2016"
  ]
 ],
 "lapRecord": {
  "time": "1:43.009",
  "driver": "Charles Leclerc",
  "team": "Ferrari",
  "year": 2019
 },
 "facts": [
  [
   "Longest straight",
   "Its 2.2 km main straight is the longest on the F1 calendar."
  ],
  [
   "Narrowest point",
   "The narrowest point, the Turn 8/9 Old Town complex, is 7.6 m wide."
  ]
 ],
 "about": "Baku City Circuit is a 6.003 km, 20-turn street circuit at Azadliq Square in Baku, designed by Hermann Tilke. It hosted the European Grand Prix in 2016 and has hosted the Azerbaijan Grand Prix every year since 2017 except 2020."
},
{
 "key": "sepang",
 "match": new RegExp("sepang", "i"),
 "name": "Sepang International Circuit",
 "place": "Sepang, Malaysia",
 "stats": [
  [
   "Lap length",
   "5.543 km"
  ],
  [
   "Turns",
   "15"
  ],
  [
   "Race laps",
   "56"
  ],
  [
   "First Grand Prix",
   "1999"
  ]
 ],
 "lapRecord": {
  "time": "1:34.080",
  "driver": "Sebastian Vettel",
  "team": "Ferrari",
  "year": 2017
 },
 "facts": [
  [
   "First Tilke circuit",
   "It was the first F1 track Hermann Tilke designed from scratch."
  ],
  [
   "2026 host",
   "The 2026 event is the 22nd Bahrain Grand Prix and the first not held at the Bahrain International Circuit in Sakhir, with Malaysia stepping in as host."
  ],
  [
   "Pole record",
   "Lewis Hamilton and Michael Schumacher share the record for most pole positions at Sepang, with five each."
  ]
 ],
 "about": "Sepang International Circuit hosted its first Formula One Grand Prix in 1999 and is 5.543 km long with 15 turns. It returned to the 2026 calendar as host of the Bahrain Grand Prix in Malaysia, held on 4 October 2026."
},
{
 "key": "singapore",
 "match": new RegExp("singapore|marina bay", "i"),
 "name": "Marina Bay Street Circuit",
 "place": "Singapore, Singapore",
 "stats": [
  [
   "Lap length",
   "4.927 km"
  ],
  [
   "Turns",
   "19"
  ],
  [
   "Race laps",
   "62"
  ],
  [
   "Race distance",
   "305.337 km"
  ],
  [
   "First Grand Prix",
   "2008"
  ]
 ],
 "lapRecord": {
  "time": "1:33.808",
  "driver": "Lewis Hamilton",
  "team": "Ferrari",
  "year": 2025
 },
 "facts": [
  [
   "First night race",
   "It hosted F1's first-ever night race."
  ],
  [
   "Safety car every year",
   "Every Singapore Grand Prix had at least one Safety Car appearance until 2024."
  ],
  [
   "Layout cut for 2023",
   "The layout was reduced from 23 turns to 19 before the 2023 race."
  ]
 ],
 "about": "Marina Bay Street Circuit is a 4.927 km, 19-turn street circuit in Singapore's Downtown Core and Kallang, hosting F1 since 2008. Drivers can shed up to about 3 kg of body weight during a race because of the heat, humidity and demanding circuit."
},
{
 "key": "cota",
 "match": new RegExp("austin|americas", "i"),
 "name": "Circuit of the Americas",
 "place": "Austin, United States",
 "stats": [
  [
   "Lap length",
   "5.513 km"
  ],
  [
   "Turns",
   "20"
  ],
  [
   "Race laps",
   "56"
  ],
  [
   "Race distance",
   "308.432 km"
  ],
  [
   "First Grand Prix",
   "2012"
  ]
 ],
 "lapRecord": {
  "time": "1:36.169",
  "driver": "Charles Leclerc",
  "team": "Ferrari",
  "year": 2019
 },
 "facts": [
  [
   "Purpose-built",
   "It was the first circuit in the United States purpose-built for Formula One."
  ],
  [
   "Counter-clockwise",
   "It runs counter-clockwise, so it has more left-hand than right-hand turns, which places greater physical demands on drivers."
  ],
  [
   "Record crowd",
   "The 2022 Formula One US Grand Prix weekend drew roughly 440,000 attendees, a Formula One record for an event in North America at that time."
  ]
 ],
 "about": "Circuit of the Americas opened on 21 October 2012 in Austin, Texas, and hosted its first United States Grand Prix that November. The 5.513 km Grand Prix circuit has 20 turns and a steep uphill approach to Turn 1."
},
{
 "key": "mexico",
 "match": new RegExp("mexico", "i"),
 "name": "Autódromo Hermanos Rodríguez",
 "place": "Mexico City, Mexico",
 "stats": [
  [
   "Lap length",
   "4.304 km"
  ],
  [
   "Turns",
   "17"
  ],
  [
   "Race laps",
   "71"
  ],
  [
   "First Grand Prix",
   "1963"
  ],
  [
   "Elevation",
   "2,238 m"
  ]
 ],
 "lapRecord": {
  "time": "1:17.774",
  "driver": "Valtteri Bottas",
  "team": "Mercedes",
  "year": 2021
 },
 "facts": [
  [
   "Long main straight",
   "The front straight is about 1.2 km, following the final corner."
  ],
  [
   "Stadium section",
   "Turns 12 to 17 run through the former Foro Sol baseball stadium."
  ],
  [
   "Thin air",
   "The high altitude thins the air, which reduces aerodynamic drag and lets teams run higher downforce setups without losing much straight-line speed."
  ]
 ],
 "about": "Autódromo Hermanos Rodríguez sits in the Magdalena Mixhuca park in Mexico City at 2,238 m above sea level. F1 first visited in 1962 for a non-championship race, with the first championship Grand Prix in 1963."
},
{
 "key": "interlagos",
 "match": new RegExp("interlagos|s[aã]o paulo|jos[eé] carlos pace", "i"),
 "name": "Autódromo José Carlos Pace",
 "place": "São Paulo, Brazil",
 "stats": [
  [
   "Lap length",
   "4.309 km"
  ],
  [
   "Turns",
   "15"
  ],
  [
   "Race laps",
   "71"
  ],
  [
   "Race distance",
   "305.879 km"
  ],
  [
   "First Grand Prix",
   "1973"
  ]
 ],
 "lapRecord": {
  "time": "1:10.540",
  "driver": "Valtteri Bottas",
  "team": "Mercedes",
  "year": 2018
 },
 "facts": [
  [
   "Anti-clockwise",
   "The circuit runs counterclockwise, which pushes drivers' necks to the right, unlike most F1 circuits that run clockwise."
  ],
  [
   "Brazilian winners",
   "Brazilian drivers won the first three Brazilian Grands Prix: Emerson Fittipaldi in 1973 and 1974, and Carlos Pace in 1975."
  ],
  [
   "Title decider",
   "Fernando Alonso won the 2005 and 2006 world titles in Brazil, and Renault also clinched the 2006 constructors' title there."
  ]
 ],
 "about": "Interlagos in São Paulo opened on 12 May 1940 and hosted its first World Championship Brazilian Grand Prix in 1973. The current lap is 4.309 km with 15 turns and includes the Senna S infield section and a banked final turn."
},
{
 "key": "lasvegas",
 "match": new RegExp("las vegas", "i"),
 "name": "Las Vegas Strip Circuit",
 "place": "Paradise (Las Vegas), United States",
 "stats": [
  [
   "Lap length",
   "6.201 km"
  ],
  [
   "Turns",
   "17"
  ],
  [
   "Race laps",
   "50"
  ],
  [
   "Race distance",
   "309.958 km"
  ],
  [
   "First Grand Prix",
   "2023"
  ]
 ],
 "lapRecord": {
  "time": "1:33.365",
  "driver": "Max Verstappen",
  "team": "Red Bull Racing",
  "year": 2025
 },
 "facts": [
  [
   "Designer",
   "The circuit was designed by Carsten Tilke, son of F1 circuit designer Hermann Tilke, and construction began in March 2022."
  ],
  [
   "Top speed",
   "A 2025 F1 car reached 222.6 mph (358.3 km/h), set by Yuki Tsunoda in a Red Bull at the end of the Strip."
  ],
  [
   "Landmarks",
   "The track passes landmarks including the MSG Sphere, Caesars Palace, Bellagio and Paris Las Vegas, which are illuminated at night."
  ]
 ],
 "about": "The Las Vegas Strip Circuit is a 6.201 km, 17-turn street circuit that opened on 16 November 2023 during the first Las Vegas Grand Prix weekend. It runs past landmarks on the Strip such as Caesars Palace and Bellagio."
},
{
 "key": "lusail",
 "match": new RegExp("lusail|losail", "i"),
 "name": "Lusail International Circuit",
 "place": "Lusail, Qatar",
 "stats": [
  [
   "Lap length",
   "5.419 km"
  ],
  [
   "Turns",
   "16"
  ],
  [
   "Race laps",
   "57"
  ],
  [
   "Race distance",
   "308.611 km"
  ],
  [
   "First Grand Prix",
   "2021"
  ]
 ],
 "lapRecord": {
  "time": "1:22.384",
  "driver": "Lando Norris",
  "team": "McLaren",
  "year": 2024
 },
 "facts": [
  [
   "Quick build",
   "The track was built in just under a year by about 1,000 workers at a cost of US$58 million and opened in 2004."
  ],
  [
   "Floodlights",
   "Permanent outdoor lighting was added in 2007 and at the time was the largest permanent venue sports lighting project in the world."
  ],
  [
   "Artificial grass",
   "The circuit is surrounded by artificial grass meant to keep sand from encroaching on the track."
  ]
 ],
 "about": "Lusail International Circuit lies just outside Lusail, north of Doha, and opened in 2004. Its 5.419 km Grand Prix layout has 16 turns and first hosted Formula One in 2021."
},
{
 "key": "yasmarina",
 "match": new RegExp("\\byas\\b|abu dhabi", "i"),
 "name": "Yas Marina Circuit",
 "place": "Abu Dhabi, United Arab Emirates",
 "stats": [
  [
   "Lap length",
   "5.281 km"
  ],
  [
   "Turns",
   "16"
  ],
  [
   "Race laps",
   "58"
  ],
  [
   "Race distance",
   "306.183 km"
  ],
  [
   "First Grand Prix",
   "2009"
  ]
 ],
 "lapRecord": {
  "time": "1:25.637",
  "driver": "Kevin Magnussen",
  "team": "Haas",
  "year": 2024
 },
 "facts": [
  [
   "2021 revamp",
   "For 2021, the former turns 4, 5 and 6 became a single, less severe hairpin, and turns 11 through 14 became a sweeping banked curve."
  ],
  [
   "Track surface",
   "The track surface uses graywacke aggregate shipped from a Shropshire, England quarry, which offers high grip but causes higher tyre wear."
  ]
 ],
 "about": "Yas Marina Circuit on Yas Island hosted its first Grand Prix in 2009 as the season finale. The current layout, in use since 2021, is 5.281 km with 16 turns."
},
];
const norm = (s) => String(s || '').toLowerCase();
// Looks the circuit up by circuit name, city and country, never by Grand Prix name (the 2026 "Bahrain GP" is run at Sepang).
export function circuitFor(meeting) {
  const hay = norm(`${meeting.circuit_short_name} ${meeting.location} ${meeting.country_name}`);
  return CIRCUITS.find((c) => c.match.test(hay)) || null;
}