// The teletext decoder in the telly: takes key presses, waits for pages to
// come round in the broadcast carousel, and "prints" them row by row.

import { COLS, ROWS } from './teletext.js';
import { row, page as compilePage, padEnd } from './markup.js';

const ROLL_MS = 65;       // time for one page to go by in the carousel
const PRINT_MS = 14;      // time for one row to arrive
const DEFAULT_CYCLE = 15; // seconds between subpages
const DEFAULT_FASTEXT = [['Index', 100], ['News', 101], ['NUFC', 340], ['Weather', 401]];
const FASTEXT_KEYS = ['red', 'green', 'yellow', 'cyan'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');

// Seeded so the "other pages" in each magazine stay the same between visits.
function fillerPages(magazine, real) {
  let seed = magazine * 7919;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nums = new Set(real);
  for (let i = magazine * 100; i < magazine * 100 + 100; i++) if (rand() < 0.32) nums.add(i);
  return [...nums].sort((a, b) => a - b);
}

export class Receiver {
  constructor(pages) {
    this.pages = new Map(pages.map((p) => [p.number, p]));
    this.carousels = new Map();
    for (let m = 1; m <= 8; m++) {
      this.carousels.set(m, fillerPages(m, [...this.pages.keys()].filter((n) => Math.floor(n / 100) === m)));
    }
    this.live = new Map(); // page number -> { data, error, loadedAt, loading }

    this.screen = Array.from({ length: ROWS }, () => new Uint8Array(COLS).fill(0x20));
    this.current = null;   // page on screen
    this.subIndex = 0;
    this.subCount = 1;
    this.target = null;    // page being searched for
    this.entry = '';       // digits typed so far
    this.rolling = 100;
    this.hold = false;
    this.reveal = false;
    this.size = 0;
    this.mode = 'text';    // 'text' | 'mix' | 'tv'
    this.dirty = true;
    this.listeners = new Set();
    this.timers = [];
    this.startedAt = performance.now();

    setInterval(() => this.#tick(), ROLL_MS);
    setInterval(() => this.#drawHeader(), 1000);
  }

  on(fn) { this.listeners.add(fn); }
  #emit(type) { for (const fn of this.listeners) fn(type, this); }

  takeDirty() { const d = this.dirty; this.dirty = false; return d; }

  get subtitles() { return Boolean(this.current?.subtitles) && !this.target; }

  // --- keys ---------------------------------------------------------------

  press(key) {
    if (/^[0-9]$/.test(key)) return this.#digit(key);
    const fastext = FASTEXT_KEYS.indexOf(key);
    if (fastext >= 0) {
      const link = (this.current?.fastext ?? DEFAULT_FASTEXT)[fastext];
      if (link) this.goTo(link[1]);
      return;
    }
    switch (key) {
      case 'index': return this.goTo(100);
      case 'up': return this.goTo(this.#neighbour(+1));
      case 'down': return this.goTo(this.#neighbour(-1));
      case 'left': return this.#stepSubpage(-1);
      case 'right': return this.#stepSubpage(+1);
      case 'hold':
        this.hold = !this.hold;
        if (!this.hold) this.#scheduleRotation();
        break;
      case 'reveal': this.reveal = !this.reveal; break;
      case 'size': this.size = (this.size + 1) % 3; break;
      case 'text': this.mode = this.mode === 'tv' ? 'text' : 'tv'; break;
      case 'mix': this.mode = this.mode === 'mix' ? 'text' : 'mix'; break;
      default: return;
    }
    this.#drawHeader();
    this.dirty = true;
    this.#emit('state');
  }

  #digit(d) {
    // Magazines run from 1 to 8, so a page number can't start with 0 or 9.
    if (!this.entry && (d === '0' || d === '9')) return;
    if (this.mode === 'tv') this.mode = 'text';
    this.hold = false;
    this.entry += d;
    if (this.entry.length === 3) {
      const n = Number(this.entry);
      this.entry = '';
      this.goTo(n);
    } else {
      this.#drawHeader();
    }
  }

  #neighbour(dir) {
    const nums = [...this.pages.keys()].sort((a, b) => a - b);
    const from = this.target ?? this.current?.number ?? 100;
    if (dir > 0) return nums.find((n) => n > from) ?? nums[0];
    return [...nums].reverse().find((n) => n < from) ?? nums[nums.length - 1];
  }

  goTo(number) {
    if (this.mode === 'tv') this.mode = 'text';
    this.entry = '';
    this.target = number;
    this.hold = false;
    this.reveal = false;
    this.size = 0;
    const page = this.pages.get(number);
    if (page?.load) this.#load(page);
    this.#drawHeader();
    this.#emit('search');
  }

  // --- the carousel -------------------------------------------------------

  #tick() {
    if (this.target == null) return;
    const carousel = this.carousels.get(Math.floor(this.target / 100)) ?? [this.target];
    const step = Math.floor((performance.now() - this.startedAt) / ROLL_MS);
    this.rolling = carousel[step % carousel.length];
    if (this.rolling === this.target) {
      const page = this.pages.get(this.target);
      // A page that doesn't exist never comes round. Live pages only go out
      // once their data has arrived (or failed to).
      if (page && this.#ready(page)) {
        this.target = null;
        this.#show(page, 0);
        return;
      }
    }
    this.#drawHeader();
  }

  #ready(page) {
    if (!page.load) return true;
    const state = this.live.get(page.number);
    return Boolean(state && !state.loading);
  }

  async #load(page, force = false) {
    const state = this.live.get(page.number) ?? {};
    const fresh = state.loadedAt && !state.error && performance.now() - state.loadedAt < (page.refresh ?? 600) * 1000;
    if (state.loading || (fresh && !force)) return;
    state.loading = true;
    this.live.set(page.number, state);
    try {
      state.data = await page.load();
      state.error = null;
    } catch (err) {
      console.warn(`Page ${page.number}:`, err);
      state.error = err;
    }
    state.loading = false;
    state.loadedAt = performance.now();
    // An updated page goes out again on its next transmission.
    if (this.current === page && this.target == null) this.#show(page, this.subIndex);
  }

  // --- putting a page on screen -------------------------------------------

  #subpages(page) {
    if (!page.render) return page.subpages;
    const state = this.live.get(page.number);
    return page.render(state?.data ?? null, state?.error ?? null);
  }

  #show(page, subIndex) {
    const subs = this.#subpages(page);
    this.current = page;
    this.subCount = subs.length;
    this.subIndex = ((subIndex % subs.length) + subs.length) % subs.length;
    const rows = compilePage(subs[this.subIndex]);

    if (subs.length > 1 && !page.subtitles) {
      rows[0].set(row(`{normal}{white}${this.subIndex + 1}/${subs.length}`).subarray(0, 5), COLS - 5);
    }
    rows.push(this.#fastextRow(page));

    try { history.replaceState(null, '', `#${page.number}`); } catch { /* sandboxed frames may refuse */ }
    this.#print(rows);
    this.#drawHeader();
    this.#scheduleRotation();
    if (page.load) this.#load(page);
    this.#emit('page');
  }

  #fastextRow(page) {
    const links = page.fastext ?? DEFAULT_FASTEXT;
    const colours = ['red', 'green', 'yellow', 'cyan'];
    return row(links.map(([label], i) => padEnd(`{${colours[i]}}${label.slice(0, 9)}`, 10)).join(''));
  }

  // Rows 1-24 are erased, then arrive one at a time, top to bottom.
  #print(rows) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    for (let r = 1; r < ROWS; r++) this.screen[r].fill(0x20);
    this.dirty = true;
    rows.forEach((bytes, i) => {
      this.timers.push(setTimeout(() => {
        this.screen[i + 1].set(bytes);
        this.dirty = true;
        if (i === rows.length - 1) this.#emit('printed');
      }, PRINT_MS * (i + 1)));
    });
  }

  #scheduleRotation() {
    clearTimeout(this.rotation);
    const page = this.current;
    // Pages with subpages rotate; live pages check for fresh data, and go
    // out again (via #load) when it has changed.
    if (!page || this.hold || (this.subCount < 2 && !page.load)) return;
    this.rotation = setTimeout(() => {
      if (this.current !== page || this.hold || this.target != null) return;
      if (this.subCount > 1) this.#show(page, this.subIndex + 1);
      else { this.#load(page); this.#scheduleRotation(); }
    }, (page.cycle ?? DEFAULT_CYCLE) * 1000);
  }

  #stepSubpage(dir) {
    if (!this.current || this.subCount < 2 || this.target != null) return;
    this.#show(this.current, this.subIndex + dir);
  }

  // Row 0: the left 8 cells belong to the telly, the rest is broadcast.
  #drawHeader() {
    let status;
    if (this.entry) status = `P${padEnd(this.entry, 3).replace(/ /g, '-')}`;
    else if (this.hold) status = 'HOLD';
    else status = `P${this.target ?? this.current?.number ?? '---'}`;

    const now = new Date();
    const date = `${DAYS[now.getDay()]} ${pad2(now.getDate())} ${MONTHS[now.getMonth()]}`;
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}/${pad2(now.getSeconds())}`;
    const searching = this.target != null;
    const shown = searching ? this.rolling : this.current?.number ?? this.rolling;
    const header = `{white}${padEnd(status, 7)}{yellow}FITZFAX${searching ? '{green}' : '{white}'}${shown} ${date}{yellow}${time}`;
    this.screen[0].set(row(header));
    this.dirty = true;
  }

  // Screen-reader friendly description of what's on screen.
  get description() {
    if (this.target != null) return `Searching for page ${this.target}`;
    return this.current ? `Page ${this.current.number}${this.subCount > 1 ? `, ${this.subIndex + 1} of ${this.subCount}` : ''}` : '';
  }
}

