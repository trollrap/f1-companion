// Power unit used by each constructor, 2014 to 2025 (the hybrid V6 turbo era). STATIC data written by hand; check it when a new season is added.
// Format: supplier -> [constructorId, fromYear, toYear]. Constructor ids are the ones in the history file.
// Notes: Red Bull and its sister team ran Honda-built units under the Red Bull Powertrains name from 2022, so they stay under Honda here.
// Marussia/Manor: 2014 and 2015 Ferrari, 2016 Mercedes. Toro Rosso: 2014-15 Renault, 2016 Ferrari (2015 spec), 2017 Renault, 2018 Honda.
export const ENGINES = {
  Mercedes: [['mercedes', 2014, 2025], ['williams', 2014, 2025], ['force_india', 2014, 2018], ['racing_point', 2019, 2020], ['aston_martin', 2021, 2025], ['mclaren', 2014, 2014], ['mclaren', 2021, 2025], ['lotus_f1', 2015, 2015], ['manor', 2016, 2016]],
  Ferrari: [['ferrari', 2014, 2025], ['sauber', 2014, 2018], ['alfa', 2019, 2023], ['sauber', 2024, 2025], ['haas', 2016, 2025], ['marussia', 2014, 2015], ['toro_rosso', 2016, 2016]],
  Renault: [['red_bull', 2014, 2018], ['toro_rosso', 2014, 2015], ['toro_rosso', 2017, 2017], ['lotus_f1', 2014, 2014], ['caterham', 2014, 2014], ['renault', 2016, 2020], ['mclaren', 2018, 2020], ['alpine', 2021, 2025]],
  Honda: [['mclaren', 2015, 2017], ['toro_rosso', 2018, 2019], ['alphatauri', 2020, 2023], ['rb', 2024, 2025], ['red_bull', 2019, 2025]],
};
