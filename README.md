# aaronfitzsimmons.com

**FITZFAX**: a 90s-style teletext service, shown on a CRT telly with a remote.

It's a static site with no build step. To run it locally, serve the folder (for example `npx http-server .`) and open it in a browser. ES modules don't load from `file://`.

## How it works

- `js/teletext.js` is a Level 1 teletext decoder. Pages are real 40×25 byte grids. Control codes take up a cell and follow the SAA5050's set-at/set-after rules: hold mosaics, double height, flash, conceal and boxing. Letters use the SAA5050 character ROM (`js/font.js`), with its diagonal smoothing.
- `js/receiver.js` is the TV's decoder. It handles the page carousel and rolling header (pages that don't exist never arrive), prints rows top to bottom, rotates subpages, and runs Fastext, HOLD, REVEAL, SIZE, TEXT and MIX.
- `js/crt.js` builds a PAL-shaped frame and runs it through a WebGL CRT shader. If WebGL isn't available, it shows the frame flat.
- `js/pages/` holds the pages.

## Writing a page

Rows are strings. Each `{code}` is one control character and takes up one cell, just as it did on air:

```js
{
  number: 300,
  fastext: [['Index', 100], ['News', 101], ['Weather', 401], ['Help', 105]],
  subpages: [[
    '{red}{newbg}{dh}{white} SPORT',   // double-height white on red
    '',                                 // (row swallowed by double height)
    '{yellow}Headline{white}Body text',
    '{gcyan}' + 'mosaic chars…',
    '{white}Answer:{cyan}{conceal}HIDDEN', // colour codes cancel conceal, so put them first
  ]],
}
```

Codes: `red green yellow blue magenta cyan white`, graphics versions `gred … gwhite`, `flash steady dh normal conceal contig sep blackbg newbg hold release box endbox`.

For live pages, use `load()` (async) and `render(data)` instead of `subpages`. See `js/pages/weather.js`.

## Pages

| Page | What |
|---|---|
| 100 | Index |
| 101 | News headlines (BBC News) |
| 105 | How to use FITZFAX |
| 150 | Daily quiz: six general knowledge questions, new each day |
| 340 | Newcastle United news (BBC Sport) |
| 401, 402 | Live weather map and table (Open-Meteo) |
| 888 | Subtitles |

## Live news

Browsers can't read the BBC's RSS feeds directly, so the GitHub Action in `.github/workflows/update-feeds.yml` runs `scripts/update-feeds.mjs` every 30 minutes. The script saves the latest stories to `data/news.json` and `data/nufc.json`, and commits them only when they change. Pages 101 and 340 read those files. You can also run the Action from the Actions tab (**Run workflow**). Headlines and summaries are shown with credit to the BBC.
