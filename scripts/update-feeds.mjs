// Fetches the RSS feeds behind FITZFAX's news pages and saves them as JSON
// in data/, which the pages read. Run by .github/workflows/update-feeds.yml.
// Files are only rewritten when the stories change, to keep commits quiet.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const FEEDS = [
  { file: 'data/news.json', source: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { file: 'data/nufc.json', source: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/teams/newcastle-united/rss.xml' },
];
const MAX_ITEMS = 8;

function decode(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function field(item, name) {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

function parse(xml) {
  const seen = new Set();
  const items = [];
  for (const [, item] of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)) {
    const title = field(item, 'title');
    if (!title || seen.has(title)) continue;
    seen.add(title);
    const date = new Date(field(item, 'pubDate'));
    items.push({
      title,
      summary: field(item, 'description'),
      published: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      link: field(item, 'link'),
    });
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}

async function update({ file, source, url }) {
  const res = await fetch(url, { headers: { 'user-agent': 'FITZFAX teletext (aaronfitzsimmons.com)' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const items = parse(await res.text());
  if (!items.length) throw new Error(`${url} had no stories`);

  const old = await readFile(file, 'utf8').then(JSON.parse).catch(() => null);
  if (old && JSON.stringify(old.items) === JSON.stringify(items)) {
    console.log(`${file}: no change`);
    return;
  }
  await writeFile(file, `${JSON.stringify({ source, fetched: new Date().toISOString(), items }, null, 2)}\n`);
  console.log(`${file}: ${items.length} stories`);
}

await mkdir('data', { recursive: true });
const results = await Promise.allSettled(FEEDS.map(update));
for (const r of results) if (r.status === 'rejected') console.error(r.reason.message);
if (results.every((r) => r.status === 'rejected')) process.exit(1);
