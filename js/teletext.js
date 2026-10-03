// Level 1 teletext decoder and renderer.
//
// A page is 25 rows of 40 bytes. Bytes below 0x20 are "spacing attributes":
// control codes that occupy a cell (shown as a blank) and change the colour,
// size, flashing etc. of everything to their right on that row. This file
// follows the SAA5050 rules for which codes act "set-at" (on their own cell)
// and which act "set-after" (from the next cell), hold mosaics, double height
// and character rounding, so pages look like they did on a 90s telly.

import { GLYPHS } from './font.js';

export const COLS = 40;
export const ROWS = 25;
export const CELL_W = 12;
export const CELL_H = 20;
export const WIDTH = COLS * CELL_W;
export const HEIGHT = ROWS * CELL_H;

export const PALETTE = [
  [0, 0, 0], [255, 0, 0], [0, 255, 0], [255, 255, 0],
  [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
];

export const SPACE = 0x20;

// The SAA5050 doubles each 5x9 dot glyph to 10x18 and fills in the inner
// corners of diagonals, which is what gives teletext its rounded look.
function roundGlyph(hex) {
  const src = (x, y) => (x > 0 && x < 6 && y >= 0 && y < 10)
    ? (parseInt(hex.substr(y * 2, 2), 16) >> (5 - x)) & 1
    : 0;
  const out = new Uint8Array(CELL_W * CELL_H);
  const set = (x, y) => { if (x < CELL_W && y < CELL_H) out[y * CELL_W + x] = 1; };
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 6; x++) {
      if (src(x, y)) { set(2 * x, 2 * y); set(2 * x + 1, 2 * y); set(2 * x, 2 * y + 1); set(2 * x + 1, 2 * y + 1); }
    }
  }
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 5; x++) {
      const a = src(x, y), b = src(x + 1, y), c = src(x, y + 1), d = src(x + 1, y + 1);
      if (a && d && !b && !c) { set(2 * x + 2, 2 * y + 1); set(2 * x + 1, 2 * y + 2); }
      if (b && c && !a && !d) { set(2 * x + 1, 2 * y + 1); set(2 * x + 2, 2 * y + 2); }
    }
  }
  return out;
}

// Mosaic ("graphics") characters split the cell into a 2x3 grid of blocks.
// Bits 0-4 and 6 of the character code say which blocks are lit.
const SEXTANT_BITS = [[0x01, 0x02], [0x04, 0x08], [0x10, 0x40]];
const BLOCK_TOP = [0, 6, 14];
const BLOCK_H = [6, 8, 6];

function mosaicGlyph(code, separated) {
  const out = new Uint8Array(CELL_W * CELL_H);
  for (let y = 0; y < CELL_H; y++) {
    const row = y < 6 ? 0 : y < 14 ? 1 : 2;
    for (let x = 0; x < CELL_W; x++) {
      const col = x < 6 ? 0 : 1;
      if (!(code & SEXTANT_BITS[row][col])) continue;
      if (separated && ((x - col * 6) < 2 || (y - BLOCK_TOP[row]) >= BLOCK_H[row] - 2)) continue;
      out[y * CELL_W + x] = 1;
    }
  }
  return out;
}

const ALPHA = GLYPHS.map(roundGlyph);
const MOSAIC = [[], []];
for (let c = 0x20; c < 0x80; c++) {
  if (c & 0x20) {
    MOSAIC[0][c] = mosaicGlyph(c, false);
    MOSAIC[1][c] = mosaicGlyph(c, true);
  }
}

function blankCell(bg) {
  return { ch: SPACE, mosaic: false, sep: false, fg: 7, bg, flash: false, conceal: false, boxed: false, dh: 0 };
}

// Turn 25 rows of bytes into 1000 cells with their resolved attributes.
export function decode(rows) {
  const cells = new Array(ROWS * COLS);
  for (let r = 0; r < ROWS; r++) {
    const bytes = rows[r];
    let fg = 7, bg = 0, mosaic = false, sep = false, flash = false, conceal = false;
    let dh = false, hold = false, held = SPACE, heldSep = false, boxed = false;
    let rowHasDouble = false;

    for (let c = 0; c < COLS; c++) {
      const code = bytes ? bytes[c] & 0x7f : SPACE;

      // Set-at attributes: take effect on this cell.
      if (code === 0x09) flash = false;
      else if (code === 0x0a) boxed = false;
      else if (code === 0x0c) { if (dh) held = SPACE; dh = false; }
      else if (code === 0x18) conceal = true;
      else if (code === 0x19) sep = false;
      else if (code === 0x1a) sep = true;
      else if (code === 0x1c) bg = 0;
      else if (code === 0x1d) bg = fg;
      else if (code === 0x1e) hold = true;

      let ch = code, isMosaic = false, cellSep = sep;
      if (code < 0x20) {
        // Control cells are blank, unless hold mosaics repeats the last block.
        if (hold && mosaic) { ch = held; isMosaic = held !== SPACE; cellSep = heldSep; }
        else ch = SPACE;
      } else if (mosaic && (code & 0x20)) {
        isMosaic = true;
        held = code; heldSep = sep;
      }

      if (dh) rowHasDouble = true;
      cells[r * COLS + c] = { ch, mosaic: isMosaic, sep: cellSep, fg, bg, flash, conceal, boxed, dh: dh ? 1 : 0 };

      // Set-after attributes: take effect from the next cell.
      if (code >= 0x01 && code <= 0x07) {
        if (mosaic) held = SPACE;
        fg = code; mosaic = false; conceal = false;
      } else if (code >= 0x11 && code <= 0x17) {
        if (!mosaic) held = SPACE;
        fg = code - 0x10; mosaic = true; conceal = false;
      } else if (code === 0x08) flash = true;
      else if (code === 0x0b) boxed = true;
      else if (code === 0x0d) { if (!dh) held = SPACE; dh = true; }
      else if (code === 0x1f) hold = false;
    }

    // A double-height row swallows the row beneath it: that row shows the
    // bottom halves of the tall characters and the upper row's backgrounds.
    if (rowHasDouble && r > 0 && r < ROWS - 2) {
      for (let c = 0; c < COLS; c++) {
        const upper = cells[r * COLS + c];
        cells[(r + 1) * COLS + c] = upper.dh
          ? { ...upper, dh: 2 }
          : { ...blankCell(upper.bg), boxed: upper.boxed };
      }
      r++;
    }
  }
  return cells;
}

// Paint decoded cells into an RGBA buffer of WIDTH x HEIGHT.
//   flashOn: which half of the flash cycle we're in
//   reveal:  show concealed text
//   transparency: 'none' | 'mix' (black backgrounds see-through, the MIX key)
//                 | 'box' (only boxed text visible, for subtitles/newsflashes)
export function paint(data, cells, { flashOn = true, reveal = false, transparency = 'none' } = {}) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r * COLS + c];
      const visible = !(cell.flash && !flashOn) && !(cell.conceal && !reveal);
      const glyph = cell.mosaic ? MOSAIC[cell.sep ? 1 : 0][cell.ch] : ALPHA[cell.ch - 0x20];
      const fg = PALETTE[cell.fg];
      const bg = PALETTE[cell.bg];
      const hideCell = transparency === 'box' && !cell.boxed;
      const clearBg = hideCell || (transparency === 'mix' && cell.bg === 0);

      for (let py = 0; py < CELL_H; py++) {
        const sy = cell.dh === 1 ? py >> 1 : cell.dh === 2 ? 10 + (py >> 1) : py;
        let o = ((r * CELL_H + py) * WIDTH + c * CELL_W) * 4;
        for (let px = 0; px < CELL_W; px++, o += 4) {
          const on = visible && !hideCell && glyph[sy * CELL_W + px];
          const col = on ? fg : bg;
          data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2];
          data[o + 3] = on || !clearBg ? 255 : 0;
        }
      }
    }
  }
}

// Plain-text version of a decoded page, for screen readers.
const TEXT_MAP = { 0x23: '£', 0x5b: '←', 0x5c: '½', 0x5d: '→', 0x5e: '↑', 0x5f: '#', 0x60: '—', 0x7b: '¼', 0x7c: '‖', 0x7d: '¾', 0x7e: '÷', 0x7f: '■' };
export function toText(cells, { reveal = false } = {}) {
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r * COLS + c];
      if (cell.dh === 2 || cell.mosaic || (cell.conceal && !reveal)) { line += ' '; continue; }
      line += TEXT_MAP[cell.ch] ?? String.fromCharCode(cell.ch);
    }
    lines.push(line.trimEnd());
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
