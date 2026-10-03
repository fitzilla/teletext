// The floating Fastext buttons, drawn with real teletext mosaic blocks so
// they match the screen.

import { glyph, PALETTE, CELL_W, CELL_H } from './teletext.js';
import { mosaic } from './markup.js';

const CIRCLE = mosaic([
  '..####..',
  '.######.',
  '########',
  '########',
  '########',
  '########',
  '########',
  '.######.',
  '..####..',
]);

const COLOURS = { red: 1, green: 2, yellow: 3, blue: 4, white: 7 };

// rows: strings of characters; graphics: whether they're mosaic blocks.
function draw(canvas, rows, colour, graphics) {
  const cols = Math.max(...rows.map((r) => r.length));
  canvas.width = cols * CELL_W;
  canvas.height = rows.length * CELL_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  const [r, g, b] = PALETTE[COLOURS[colour]];
  rows.forEach((text, row) => {
    [...text].forEach((ch, col) => {
      // Mosaic characters travel as private-use chars (see markup.raw).
      const code = graphics ? ch.charCodeAt(0) - 0xe000 : ch.charCodeAt(0);
      const bits = glyph(code, { mosaic: graphics });
      for (let y = 0; y < CELL_H; y++) {
        for (let x = 0; x < CELL_W; x++) {
          if (!bits[y * CELL_W + x]) continue;
          const o = ((row * CELL_H + y) * canvas.width + col * CELL_W + x) * 4;
          img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
        }
      }
    });
  });
  ctx.putImageData(img, 0, 0);
}

export function drawButtons() {
  for (const button of document.querySelectorAll('[data-colour]')) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    if (button.dataset.label) draw(canvas, [button.dataset.label], button.dataset.colour, false);
    else draw(canvas, CIRCLE, button.dataset.colour, true);
    button.style.setProperty('--glow', `rgb(${PALETTE[COLOURS[button.dataset.colour]].join(' ')})`);
    button.prepend(canvas);
  }
}
