// Live weather pages, using Open-Meteo (free, no key needed).

import { mosaic, padEnd, padStart, raw, CODE } from '../markup.js';

const CITIES = [
  ['Inverness', 57.48, -4.22], ['Aberdeen', 57.15, -2.09], ['Glasgow', 55.86, -4.25],
  ['Newcastle', 54.98, -1.61], ['Belfast', 54.60, -5.93], ['Manchester', 53.48, -2.24],
  ['Dublin', 53.35, -6.26], ['Birmingham', 52.49, -1.89], ['Norwich', 52.63, 1.30],
  ['Cork', 51.90, -8.47], ['Cardiff', 51.48, -3.18], ['London', 51.51, -0.13],
  ['Plymouth', 50.37, -4.14],
];

async function load() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', CITIES.map((c) => c[1]).join(','));
  url.searchParams.set('longitude', CITIES.map((c) => c[2]).join(','));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('timezone', 'Europe/London');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  return {
    fetched: new Date(),
    cities: CITIES.map(([name], i) => ({ name, ...json[i].current })),
  };
}

// WMO weather codes, in teletext-sized words.
function describe(code) {
  if (code === 0) return 'Sunny';
  if (code <= 2) return 'Sunny spells';
  if (code === 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 65) return code >= 65 ? 'Heavy rain' : 'Rain';
  if (code <= 67) return 'Freezing rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunder';
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];
const hhmm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// --- The map ---------------------------------------------------------------
// Rough coastlines (lon, lat), rasterised into mosaic pixels.

const GREAT_BRITAIN = [
  [-5.7, 50.07], [-5.2, 49.96], [-4.1, 50.35], [-3.6, 50.22], [-3.4, 50.6], [-2.45, 50.55],
  [-1.3, 50.75], [-0.8, 50.72], [0.25, 50.73], [0.97, 50.91], [1.35, 51.13], [1.45, 51.38],
  [0.7, 51.5], [1.1, 51.75], [1.35, 51.95], [1.75, 52.48], [1.3, 52.93], [0.3, 52.85],
  [0.35, 53.15], [0.12, 53.58], [-0.08, 54.12], [-0.6, 54.48], [-1.15, 54.62], [-1.42, 55.0],
  [-2.0, 55.77], [-2.15, 55.9], [-2.6, 56.05], [-2.6, 56.28], [-2.9, 56.45], [-2.45, 56.7],
  [-2.07, 57.15], [-1.78, 57.5], [-2.0, 57.69], [-3.0, 57.68], [-3.8, 57.6], [-3.77, 57.86],
  [-3.08, 58.44], [-3.03, 58.64], [-3.37, 58.67], [-5.0, 58.62], [-5.3, 58.3], [-5.8, 57.85],
  [-5.65, 57.3], [-6.2, 56.7], [-5.5, 56.4], [-5.6, 55.9], [-5.8, 55.3], [-4.9, 55.7],
  [-4.6, 55.45], [-5.0, 55.0], [-4.86, 54.64], [-4.0, 54.78], [-3.4, 54.9], [-3.6, 54.55],
  [-3.2, 54.1], [-2.9, 54.0], [-3.05, 53.8], [-3.05, 53.4], [-3.4, 53.35], [-4.1, 53.3],
  [-4.6, 53.3], [-4.75, 52.8], [-4.1, 52.5], [-4.7, 52.1], [-5.3, 51.88], [-5.1, 51.7],
  [-4.3, 51.65], [-4.3, 51.55], [-3.9, 51.6], [-3.2, 51.4], [-2.7, 51.5], [-3.0, 51.3],
  [-3.6, 51.2], [-4.2, 51.2], [-4.5, 51.0], [-4.75, 50.6], [-5.1, 50.4], [-5.45, 50.2],
];

const IRELAND = [
  [-6.0, 55.2], [-7.0, 55.2], [-7.37, 55.38], [-8.3, 55.15], [-8.6, 54.7], [-8.2, 54.5],
  [-8.6, 54.3], [-9.9, 54.25], [-9.9, 53.85], [-9.5, 53.4], [-9.0, 53.25], [-9.3, 53.1],
  [-9.9, 52.6], [-10.4, 52.15], [-10.2, 51.8], [-9.8, 51.45], [-8.5, 51.6], [-8.2, 51.8],
  [-7.0, 52.15], [-6.35, 52.17], [-6.0, 52.95], [-6.2, 53.35], [-6.25, 53.72], [-6.35, 54.0],
  [-5.85, 54.25], [-5.45, 54.4], [-5.6, 54.75], [-5.7, 55.0],
];

const MAP_COLS = 21;        // cells
const MAP_ROWS = 19;        // rows
const MAP_LEFT = 3;         // first map column, after the colour codes
const W = MAP_COLS * 2;     // pixels
const H = MAP_ROWS * 3;
const LON = [-10.6, 2.0];
const LAT = [49.8, 58.8];
const project = (lon, lat) => [
  ((lon - LON[0]) / (LON[1] - LON[0])) * W,
  ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H,
];

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const SHAPES = [GREAT_BRITAIN, IRELAND].map((poly) => poly.map(([lon, lat]) => project(lon, lat)));
const MAP = mosaic(Array.from({ length: H }, (_, y) =>
  Array.from({ length: W }, (_, x) => (SHAPES.some((s) => inside(s, x + 0.5, y + 0.5)) ? '#' : '.')).join('')));

function tempColour(t) {
  if (t < 5) return 'cyan';
  if (t < 20) return 'white';
  return 'yellow';
}

function mapRows(cities) {
  // Each row: blue background, green land, then the right-hand panel.
  const cells = MAP.map((r) => [...r]);
  for (const city of cities ?? []) {
    const [, lat, lon] = CITIES.find((c) => c[0] === city.name);
    const [x, y] = project(lon, lat);
    const r = Math.floor(y / 3);
    const label = String(Math.round(city.temperature_2m));
    // A colour code before the number and a graphics code after it, so the
    // number punches a little hole in the map, as it did on Ceefax.
    let start = Math.floor(x / 2) - 1;
    start = Math.max(0, Math.min(start, MAP_COLS - label.length - 2));
    const put = (i, ch) => { if (i >= 0 && i < MAP_COLS) cells[r][i] = ch; };
    put(start, raw(CODE[tempColour(city.temperature_2m)]));
    [...label].forEach((ch, i) => put(start + 1 + i, ch));
    put(start + 1 + label.length, raw(CODE.ggreen));
  }
  return cells.map((r) => r.join(''));
}

const banner = (title) => [`{yellow}{newbg}{dh}{blue} FITZFAX WEATHER${padStart(title, 19)}`, ''];

function failed() {
  return [[
    ...banner(''),
    '',
    '{white}The weather service could not be',
    '{white}reached just now.',
    '',
    '{cyan}Please try again later.',
  ]];
}

const weatherMap = {
  number: 401,
  load,
  refresh: 600,
  cycle: 60,
  fastext: [['Index', 100], ['Table', 402], ['News', 101], ['Help', 105]],
  render(data) {
    if (!data) return failed();
    const map = mapRows(data.cities);
    const panel = [
      '', '{yellow}TEMPERATURE', '{white}NOW, CELSIUS', '',
      '{cyan}Live from', '{cyan}Open-Meteo', '', `{white}Updated ${hhmm(data.fetched)}`, '',
      '{white}Cold', '{cyan}below 5', '{white}Mild', '{white}5 to 19', '{white}Warm', '{yellow}20 and up',
      '', '{green}Full table', '{green}on page 402',
    ];
    const rows = map.map((m, i) => `{gblue}{newbg}{ggreen}${m}{blackbg}${panel[i] ?? ''}`);
    return [[...banner('LIVE'), ...rows]];
  },
};

const weatherTable = {
  number: 402,
  load,
  refresh: 600,
  cycle: 60,
  fastext: [['Index', 100], ['Map', 401], ['News', 101], ['Help', 105]],
  render(data) {
    if (!data) return failed();
    const rows = data.cities.map((c, i) => {
      const temp = padStart(`${Math.round(c.temperature_2m)}C`, 4);
      const wind = padEnd(`${compass(c.wind_direction_10m)}${Math.round(c.wind_speed_10m)}`, 5);
      return `{${i % 2 ? 'cyan' : 'white'}}${padEnd(c.name, 11)}{yellow}${temp}{green}${wind}{white}${describe(c.weather_code)}`;
    });
    return [[
      ...banner('UK CITIES'),
      '',
      `{yellow}${padEnd('CITY', 11)}{yellow}TEMP{green}WIND {white}WEATHER`,
      '',
      ...rows,
      '',
      `{cyan}Wind in mph. Updated ${hhmm(data.fetched)}.`,
      '{cyan}Data from Open-Meteo.com',
    ]];
  },
};

export default [weatherMap, weatherTable];
