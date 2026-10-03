// FITZFAX's own pages. Each row is written in the markup from markup.js:
// every {code} costs a cell, just like it did on air.

import { blockText, centre, dotted, padEnd } from '../markup.js';

const banner = (bg, fg, title) => [`{${bg}}{newbg}{dh}{${fg}} ${title}`, ''];

const LOGO = blockText('FITZFAX');

const index = {
  number: 100,
  fastext: [['News', 101], ['NUFC', 340], ['Weather', 401], ['Quiz', 150]],
  subpages: [[
    ...LOGO.map((l) => `{gblue}{newbg}{gyellow}${centre(l, 37)}`),
    `{blue}{newbg}{white}${centre('THE AARON FITZSIMMONS TELETEXT', 37)}`,
    '',
    `{dh}{cyan}${centre("WHAT'S ON FITZFAX", 38)}`,
    '',
    ...[
      ['white', 'News headlines', '101'],
      ['cyan', 'How to use FITZFAX', '105'],
      ['white', 'Daily quiz', '150'],
      ['cyan', 'Newcastle United', '340'],
      ['white', 'Weather map', '401'],
      ['cyan', 'UK temperatures', '402'],
      ['white', 'Subtitles', '888'],
    ].flatMap(([colour, name, num]) => [`{${colour}}  ${dotted(name, `{yellow}${num}`, 33)}`]),
    '',
    `{yellow}  LIVE {white}News, NUFC and weather pages`,
    `{white}  update through the day.`,
    '',
    `{gred}{newbg}{yellow}${centre('TYPE A PAGE NUMBER ON YOUR REMOTE', 37)}`,
  ]],
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

export default [index, help, subtitles];
