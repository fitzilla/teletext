// FITZFAX's own pages. Each row is written in the markup from markup.js:
// every {code} costs a cell, just like it did on air.

import { blockText, centre, dotted, padEnd, raw, wrap } from '../markup.js';

const banner = (bg, fg, title) => [`{${bg}}{newbg}{dh}{${fg}} ${title}`, ''];

// Paragraphs alternate white and cyan, Ceefax-style.
function story(headline, paragraphs) {
  const rows = [...banner('red', 'white', 'FITZFAX NEWS'), ''];
  for (const line of wrap(headline, 38)) rows.push(`{dh}{yellow}${line}`, '');
  paragraphs.forEach((p, i) => {
    rows.push('');
    for (const line of wrap(p, 39)) rows.push(`{${i % 2 ? 'cyan' : 'white'}}${line}`);
  });
  return rows;
}

const LOGO = blockText('FITZFAX');

const index = {
  number: 100,
  fastext: [['News', 101], ['Weather', 401], ['Quiz', 150], ['Help', 105]],
  subpages: [[
    ...LOGO.map((l) => `{gblue}{newbg}{gyellow}${centre(l, 37)}`),
    `{blue}{newbg}{white}${centre('THE AARON FITZSIMMONS TELETEXT', 37)}`,
    '',
    `{dh}{cyan}${centre("WHAT'S ON FITZFAX", 38)}`,
    '',
    ...[
      ['white', 'Headlines', '101'],
      ['cyan', 'How to use FITZFAX', '105'],
      ['white', 'Quiz: press REVEAL', '150'],
      ['cyan', 'Engineering test page', '199'],
      ['white', 'Weather map', '401'],
      ['cyan', 'UK temperatures', '402'],
      ['white', 'Subtitles', '888'],
    ].flatMap(([colour, name, num]) => [`{${colour}}  ${dotted(name, `{yellow}${num}`, 33)}`]),
    '',
    `{yellow}  LIVE {white}Pages 401 and 402 update`,
    `{white}  through the day.`,
    '',
    `{gred}{newbg}{yellow}${centre('TYPE A PAGE NUMBER ON YOUR REMOTE', 37)}`,
  ]],
};

const news = {
  number: 101,
  cycle: 18,
  subpages: [
    story('TELETEXT IS BACK, SORT OF', [
      'A new teletext service has started broadcasting from aaronfitzsimmons.com, years after the last Ceefax page went dark.',
      'Pages are built the old way: 40 characters across, 24 rows, eight colours and chunky block graphics.',
      'Type a three-digit page number on the remote or your keyboard. Press 105 for help.',
    ]),
    story('LIVE WEATHER ON PAGE 401', [
      'Temperatures on the FITZFAX weather map are fetched live from Open-Meteo and checked every few minutes.',
      'Page 402 has the full table, with wind and conditions for each city.',
    ]),
    story('CHIP THAT DREW THE LETTERS REBUILT', [
      'Engineers have recreated the 1980s chip that drew teletext letters, down to the way it smoothed diagonal lines.',
      'Colour codes still take up a space on screen, which is why teletext has gaps in odd places.',
      'Page 199 shows the full engineering test page.',
    ]),
    story('AND FINALLY', [
      'Old habits die hard. You will still have to wait for the page counter at the top to roll round to the page you asked for.',
      'Viewers are advised to put the kettle on.',
    ]),
  ],
};

const help = {
  number: 105,
  subpages: [[
    ...banner('blue', 'yellow', 'HOW TO USE FITZFAX'),
    '',
    '{white}Every page has a three-digit number.',
    '{white}Type it and wait for the counter at the',
    '{white}top to roll round to it.',
    '',
    ...[
      ['0-9', 'Page number', '0-9'],
      ['P+ P-', 'Next/previous page', 'Up Down'],
      ['Colours', 'Links on bottom row', 'R G Y C'],
      ['INDEX', 'Back to page 100', 'I'],
      ['HOLD', 'Stop pages turning', 'H'],
      ['REVEAL', 'Show hidden answers', 'V'],
      ['SIZE', 'Double size', 'S'],
      ['TEXT', 'Teletext or telly', 'T'],
      ['MIX', 'Text over telly', 'M'],
    ].map(([key, what, kb]) => `{yellow}${padEnd(key, 8)}{white}${padEnd(what, 20)}{cyan}${kb}`),
    '',
    '{green}Cyan column: keys on your keyboard.',
    '{green}Left and Right step through subpages.',
  ]],
};

const QUIZ = [
  ['Ceefax launched on BBC television in which year?', ['1966', '1974', '1982', '1990'], 1],
  ['The name Ceefax was a play on which phrase?', ['See facts', 'Sea fax', 'Seek facts', 'C for fax'], 0],
  ['How many characters fit across one row of a teletext page?', ['32', '40', '64', '80'], 1],
  ["What was ITV's teletext service called before 1993?", ['Prestel', 'Oracle', 'Viewdata', 'Datavision'], 1],
  ['In which year was Ceefax finally switched off?', ['2002', '2008', '2012', '2016'], 2],
  ['Which page number traditionally carried subtitles?', ['100', '302', '888', '999'], 2],
];

const quiz = {
  number: 150,
  cycle: 25,
  fastext: [['Index', 100], ['News', 101], ['Test', 199], ['Help', 105]],
  subpages: QUIZ.map(([q, options, answer], i) => [
    ...banner('magenta', 'white', 'TELETEXT TRIVIA'),
    '',
    `{cyan}QUESTION ${i + 1} OF ${QUIZ.length}`,
    '',
    ...wrap(q, 38).map((l) => `{dh}{white}${l}`).flatMap((l) => [l, '']),
    '',
    ...options.flatMap((o, j) => [`{yellow} ${'ABCD'[j]}{white}${o}`, '']),
    `{green}Press REVEAL for the answer. HOLD stops`,
    `{green}the questions moving on.`,
    '',
    `{yellow}{conceal}ANSWER: ${'ABCD'[answer]} - ${options[answer]}`,
  ]),
};

// Every mosaic character, contiguous and separated.
const MOSAICS = [];
for (let c = 0x20; c < 0x80; c++) if (c & 0x20) MOSAICS.push(raw(c));
const COLOURS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

const testPage = {
  number: 199,
  fastext: [['Index', 100], ['News', 101], ['Quiz', 150], ['Help', 105]],
  subpages: [[
    ...banner('white', 'blue', 'ENGINEERING TEST PAGE'),
    COLOURS.map((c) => `{${c}}${c.slice(0, 4).toUpperCase()}`).join(''),
    '{gwhite}' + COLOURS.map((c) => `{g${c}}{newbg}${raw(0x20)}`).join('') + '{blackbg}',
    '{white}Mosaics, contiguous and separated:',
    `{gwhite}${MOSAICS.slice(0, 32).join('')}`,
    `{gcyan}${MOSAICS.slice(32).join('')}`,
    `{gwhite}{sep}${MOSAICS.slice(0, 32).join('')}`,
    `{gcyan}{sep}${MOSAICS.slice(32).join('')}`,
    '{white}Hold mosaics, off then on:',
    `{gred}${raw(0x7f)}{gyellow}${raw(0x7f)}{ggreen}${raw(0x7f)}  {hold}{gred}${raw(0x7f)}{gyellow}${raw(0x7f)}{ggreen}${raw(0x7f)}{release}`,
    '',
    '{white}Flash: {flash}FLASHING{steady}{white}and steady',
    '',
    '{dh}{yellow}Double height {cyan}text',
    '',
    '{white}Hidden:{cyan}{conceal}YOU PRESSED REVEAL',
    '',
    '{white}£ ½ ¼ ¾ ÷ ← → ↑ # — ‖ ■',
    '{white}THE QUICK BROWN FOX JUMPS OVER THE',
    '{cyan}the quick brown fox jumps over the lazy',
    '{yellow}0123456789 !"%&\'()*+,-./:;<=>?@',
  ]],
};

// Subtitle pages are see-through apart from the boxed text, and are shown
// over the TV picture.
const SUBS = [
  ['# CHEERFUL 90s TELETEXT MUSIC #', 'yellow'],
  ["You're watching FITZ TV.", 'white'],
  ['Subtitles are on page 888,', 'white'],
  ['just like they always were.', 'white'],
  ['Type 100 for the index.', 'cyan'],
];
const subtitles = {
  number: 888,
  subtitles: true,
  cycle: 3.5,
  subpages: SUBS.map(([line, colour]) => {
    const rows = Array(23).fill('');
    rows[20] = `{dh}${centre(`{${colour}}{box}{box}${line} {endbox}{endbox}`, 39)}`;
    return rows;
  }),
};

export default [index, news, help, quiz, testPage, subtitles];
