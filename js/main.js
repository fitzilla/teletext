import { decode, paint, toText, WIDTH, HEIGHT } from './teletext.js';
import { VideoFrame, CRT } from './crt.js';
import { Receiver } from './receiver.js';
import staticPages from './pages/static.js';
import weatherPages from './pages/weather.js';
import newsPages from './pages/news.js';
import quizPages from './pages/quiz.js';

const receiver = new Receiver([...staticPages, ...newsPages, ...quizPages, ...weatherPages]);
const video = new VideoFrame();
const crt = new CRT(document.getElementById('screen'));

const pageCanvas = document.createElement('canvas');
pageCanvas.width = WIDTH;
pageCanvas.height = HEIGHT;
const pageCtx = pageCanvas.getContext('2d');
const pageImage = pageCtx.createImageData(WIDTH, HEIGHT);

const pageText = document.getElementById('page-text');
const keypad = document.getElementById('keypad');
const keypadToggle = document.getElementById('keypad-toggle');

// --- power ---------------------------------------------------------------

let on = false;
let powerFrom = 0, powerTo = 0, powerStart = 0;
const POWER_MS = { up: 900, down: 380 };

function setPower(next) {
  on = next;
  powerFrom = crt.power;
  powerTo = on ? 1 : 0;
  powerStart = performance.now();
}

function updatePower(t) {
  const duration = powerTo ? POWER_MS.up : POWER_MS.down;
  const k = Math.min(1, (t - powerStart) / duration);
  crt.power = powerFrom + (powerTo - powerFrom) * (powerTo ? k : k * k);
}

// --- drawing -------------------------------------------------------------

let lastFlash = null;
let lastState = '';
function frame(t) {
  updatePower(t);
  const flashOn = t % 1000 < 750;
  const subs = receiver.subtitles;
  const transparency = subs ? 'box' : receiver.mode === 'mix' ? 'mix' : 'none';
  const state = `${receiver.reveal}${transparency}${receiver.size}${receiver.mode}`;
  const pageChanged = receiver.takeDirty() || flashOn !== lastFlash || state !== lastState;
  lastFlash = flashOn;
  lastState = state;

  if (pageChanged) {
    paint(pageImage.data, decode(receiver.screen), { flashOn, reveal: receiver.reveal, transparency });
    pageCtx.putImageData(pageImage, 0, 0);
  }
  const showPicture = receiver.mode !== 'text' || subs;
  const frameChanged = pageChanged || showPicture;
  if (frameChanged) {
    video.compose(pageCanvas, { showPicture, showPage: receiver.mode !== 'tv', size: receiver.size, time: Date.now() });
  }
  crt.draw(video.canvas, t, frameChanged);
  requestAnimationFrame(frame);
}

receiver.on((type) => {
  if (type === 'search') pageText.textContent = receiver.description;
  if (type === 'printed' || type === 'state') {
    pageText.textContent = receiver.mode === 'tv'
      ? 'TV picture'
      : `${receiver.description}.\n${toText(decode(receiver.screen), { reveal: receiver.reveal })}`;
  }
});

// --- controls ------------------------------------------------------------

function press(key) {
  if (key === 'power') return setPower(!on);
  if (key === 'crt') return crt.setEnabled(!crt.enabled);
  if (!on) return;
  receiver.press(key);
}

document.querySelectorAll('[data-key]').forEach((button) => {
  button.addEventListener('click', () => press(button.dataset.key));
});

const KEYS = {
  r: 'red', g: 'green', y: 'yellow', c: 'cyan', b: 'cyan',
  F1: 'red', F2: 'green', F3: 'yellow', F4: 'cyan',
  i: 'index', h: 'hold', v: 'reveal', '?': 'reveal', s: 'size', t: 'text', m: 'mix', p: 'power', x: 'crt',
  ArrowUp: 'up', PageUp: 'up', '+': 'up', ArrowDown: 'down', PageDown: 'down', '-': 'down',
  ArrowLeft: 'left', ArrowRight: 'right',
};
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select')) return;
  const key = /^[0-9]$/.test(e.key) ? e.key : KEYS[e.key] ?? KEYS[e.key.toLowerCase?.()];
  if (!key) return;
  e.preventDefault();
  press(key);
  const button = document.querySelector(`[data-key="${key}"]`);
  button?.classList.add('pressed');
  setTimeout(() => button?.classList.remove('pressed'), 120);
});

keypadToggle.addEventListener('click', () => {
  keypad.hidden = !keypad.hidden;
  keypadToggle.setAttribute('aria-expanded', String(!keypad.hidden));
});

// The buttons and pointer fade away when you're just watching.
let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 3000);
}
['pointermove', 'pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, wake, { passive: true }));
wake();

// --- go ------------------------------------------------------------------

const hashPage = () => {
  const n = Number(location.hash.slice(1));
  return Number.isInteger(n) && n >= 100 && n <= 899 ? n : null;
};
window.addEventListener('hashchange', () => { if (on && hashPage()) receiver.goTo(hashPage()); });

setPower(true);
receiver.goTo(hashPage() ?? 100);
requestAnimationFrame(frame);
