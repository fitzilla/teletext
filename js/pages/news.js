// Live news pages. The stories come from data/*.json, which a scheduled
// GitHub Action refreshes from BBC RSS feeds (see scripts/update-feeds.mjs).

import { clean, raw, wrap } from '../markup.js';

const when = (iso) => iso
  ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '')
  : '';

function newsPage({ number, file, banner, source, fastext }) {
  return {
    number,
    fastext,
    cycle: 15,
    refresh: 300,
    tips: {
      keys: [['→', 'next story'], ['←', 'back'], ['↑', 'next page'], ['0-9', 'go to page']],
      touch: [['Tap', 'next story'], ['123', 'go to page']],
    },
    async load() {
      const res = await fetch(`data/${file}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`data/${file} ${res.status}`);
      return res.json();
    },
    render(data) {
      const items = (data?.items ?? []).map((it) => ({ ...it, title: clean(it.title), summary: clean(it.summary ?? '') }));
      if (!items.length) {
        return [[
          ...banner, '',
          '{white}The latest stories will appear here',
          '{white}after the next news update.',
          '',
          '{cyan}Please try again later.',
        ]];
      }
      const footer = `{green}Source: ${data.source ?? source}`;

      // Subpage 1: the headlines. Then one subpage per story.
      const list = [...banner, ''];
      items.forEach((it, i) => {
        const lines = wrap(it.title, 36).slice(0, 2);
        if (list.length + lines.length > 20) return;
        lines.forEach((l, j) => list.push(`{${i % 2 ? 'cyan' : 'white'}}${j ? '  ' : `${i + 1} `}${l}`));
      });
      list.length = Math.max(list.length, 21);
      list.push('{yellow}Press → or click for each story', footer);

      const stories = items.map((it) => {
        const rows = [...banner, ''];
        for (const line of wrap(it.title, 38).slice(0, 3)) rows.push(`{dh}{yellow}${line}`, '');
        rows.push('');
        for (const line of wrap(it.summary, 39).slice(0, 23 - rows.length - 4)) rows.push(`{white}${line}`);
        rows.push('', `{cyan}${when(it.published)}`);
        rows.length = Math.max(rows.length, 22);
        rows.push(`${footer}  {yellow}→ next story`);
        return rows;
      });
      return [list.map((r) => r ?? ''), ...stories.map((s) => s.map((r) => r ?? ''))];
    },
  };
}

const headlines = newsPage({
  number: 101,
  file: 'news.json',
  source: 'BBC News',
  banner: ['{red}{newbg}{dh}{white} FITZFAX NEWS', ''],
  fastext: [['Index', 100], ['NUFC', 340], ['Weather', 401], ['Quiz', 150]],
});

// Black and white stripes, for the Magpies.
const STRIPES = raw(0x35);
const newcastle = newsPage({
  number: 340,
  file: 'nufc.json',
  source: 'BBC Sport',
  banner: [`{dh}{gwhite}${STRIPES.repeat(5)}{white} NEWCASTLE UNITED {gwhite}${STRIPES.repeat(7)}`, ''],
  fastext: [['Index', 100], ['News', 101], ['Weather', 401], ['Quiz', 150]],
});

export default [headlines, newcastle];
