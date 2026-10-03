// A small authoring language for teletext rows.
//
//   row('{dh}{yellow}HEADLINE{white}more text')
//
// Each {token} becomes one control code and, as on a real page, takes up one
// cell. Everything is padded or clipped to 40 cells. Characters outside the
// teletext set become '?'.

import { COLS } from './teletext.js';

export const CODE = {
  red: 0x01, green: 0x02, yellow: 0x03, blue: 0x04, magenta: 0x05, cyan: 0x06, white: 0x07,
  flash: 0x08, steady: 0x09, endbox: 0x0a, box: 0x0b, normal: 0x0c, dh: 0x0d,
  gred: 0x11, ggreen: 0x12, gyellow: 0x13, gblue: 0x14, gmagenta: 0x15, gcyan: 0x16, gwhite: 0x17,
  conceal: 0x18, contig: 0x19, sep: 0x1a, blackbg: 0x1c, newbg: 0x1d, hold: 0x1e, release: 0x1f,
};

// The UK character set swaps a few ASCII positions for symbols.
const CHARS = {
  '£': 0x23, '←': 0x5b, '½': 0x5c, '→': 0x5d, '↑': 0x5e, '#': 0x5f, '—': 0x60,
  '¼': 0x7b, '|': 0x7c, '‖': 0x7c, '¾': 0x7d, '÷': 0x7e, '■': 0x7f,
};
const UNAVAILABLE = new Set(['[', '\\', ']', '^', '_', '`', '{', '}', '~']);

// Raw bytes (mosaic characters, unusual codes) travel through strings as
// private-use characters so they can be mixed with ordinary text.
const RAW_BASE = 0xe000;
export const raw = (code) => String.fromCharCode(RAW_BASE + code);
export const ctl = (name) => raw(CODE[name]);

const TOKEN = /\{([a-z]+)\}/g;
export function expand(str) {
  return str.replace(TOKEN, (m, name) => {
    if (!(name in CODE)) throw new Error(`Unknown teletext code {${name}}`);
    return raw(CODE[name]);
  });
}

function byteFor(ch) {
  const n = ch.charCodeAt(0);
  if (n >= RAW_BASE && n < RAW_BASE + 0x80) return n - RAW_BASE;
  if (ch in CHARS) return CHARS[ch];
  if (n >= 0x20 && n < 0x7f && !UNAVAILABLE.has(ch)) return n;
  return 0x3f;
}

// Number of cells a marked-up string takes.
export const width = (str) => [...expand(str)].length;

// Real-world text (news feeds) uses characters teletext never had.
const SUBSTITUTES = {
  '‘': "'", '’': "'", '‚': "'", '′': "'", '“': '"', '”': '"', '„': '"', '″': '"',
  '–': '-', '‑': '-', '−': '-', '…': '...', '\u00a0': ' ', '[': '(', ']': ')', '{': '(', '}': ')',
  '•': '-', '×': 'x', '€': 'EUR', '°': ' deg',
};
export function clean(text) {
  return text
    .replace(/[‘’‚′“”„″–‑−…\u00a0\[\]{}•×€°]/g, (ch) => SUBSTITUTES[ch])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function row(str = '') {
  const out = new Uint8Array(COLS).fill(0x20);
  const chars = [...expand(str)];
  for (let i = 0; i < Math.min(chars.length, COLS); i++) out[i] = byteFor(chars[i]);
  return out;
}

// Pages are written as rows 1-23; missing rows are blank.
export function page(lines) {
  const out = [];
  for (let i = 0; i < 23; i++) out.push(row(lines[i] ?? ''));
  return out;
}

export const padEnd = (str, n) => str + ' '.repeat(Math.max(0, n - width(str)));
export const padStart = (str, n) => ' '.repeat(Math.max(0, n - width(str))) + str;
export const centre = (str, n) => padEnd(' '.repeat(Math.max(0, Math.floor((n - width(str)) / 2))) + str, n);

// "News ........... 101" style index lines.
export function dotted(left, right, n, dot = '.') {
  const gap = n - width(left) - width(right);
  return left + (gap > 1 ? ' ' + dot.repeat(gap - 2) + ' ' : ' '.repeat(Math.max(gap, 0))) + right;
}

// Word-wrap plain text to a width.
export function wrap(text, n) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > n) { lines.push(line); line = ''; }
    line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// Convert a pixel bitmap (strings of '#' and '.') into rows of mosaic
// characters: each cell covers 2 pixels across and 3 down.
export function mosaic(bitmap) {
  const h = bitmap.length;
  const w = Math.max(...bitmap.map((l) => l.length));
  const on = (x, y) => y < h && bitmap[y][x] === '#';
  const rows = [];
  for (let y = 0; y < h; y += 3) {
    let s = '';
    for (let x = 0; x < w; x += 2) {
      let code = 0x20;
      if (on(x, y)) code |= 0x01;
      if (on(x + 1, y)) code |= 0x02;
      if (on(x, y + 1)) code |= 0x04;
      if (on(x + 1, y + 1)) code |= 0x08;
      if (on(x, y + 2)) code |= 0x10;
      if (on(x + 1, y + 2)) code |= 0x40;
      s += raw(code);
    }
    rows.push(s);
  }
  return rows;
}

// Chunky block letters for logos, 6 pixels wide and 9 tall (3 x 3 cells).
const BLOCK_FONT = {
  A: ['.####.', '######', '##..##', '##..##', '######', '######', '##..##', '##..##', '##..##'],
  E: ['######', '######', '##....', '##....', '#####.', '#####.', '##....', '######', '######'],
  F: ['######', '######', '##....', '##....', '#####.', '#####.', '##....', '##....', '##....'],
  I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '######', '######'],
  T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  X: ['##..##', '##..##', '.####.', '.####.', '..##..', '.####.', '.####.', '##..##', '##..##'],
  Z: ['######', '######', '....##', '...##.', '..##..', '.##...', '##....', '######', '######'],
  ' ': Array(9).fill('...'),
};

export function blockText(text, gap = 2) {
  const lines = Array(9).fill('');
  [...text].forEach((ch, i) => {
    const glyph = BLOCK_FONT[ch] ?? BLOCK_FONT[' '];
    for (let y = 0; y < 9; y++) lines[y] += (i ? '.'.repeat(gap) : '') + glyph[y];
  });
  return mosaic(lines);
}
