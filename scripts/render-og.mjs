#!/usr/bin/env node
// Renders a 1200×630 OpenGraph card per route into public/og/, and writes
// public/og/meta.json, which scripts/postbuild.mjs uses to put per-route
// <title>, description and og:/twitter: tags into each route's index.html.
//
//   node scripts/render-og.mjs      (needs Playwright + Chromium, like render-film)
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'public/og');

export const PAGES = [
  { id: 'home', path: '/', kicker: 'Closer, Not Farther', title: 'Read the Bible with the manuscripts that carry it', description: 'A Bible reader in four versions with Greek and Hebrew, where every verse opens its manuscript evidence.' },
  { id: 'read', path: '/read', kicker: 'Read', title: 'Read the Bible with the manuscripts that carry it', description: 'A Bible reader in four versions with Greek and Hebrew, where every verse opens its manuscript evidence.' },
  { id: 'why', path: '/why', kicker: 'Why trust the text', title: 'As time goes on, we’re not getting farther from the text. We’re getting closer.', description: 'An interactive look at how the New Testament text was copied, found and checked, with what skeptics say at every step.' },
  { id: 'telephone', path: '/telephone', kicker: 'Module 1', title: 'Telephone vs. Tree', description: 'Copy a text through a single chain and through a branching tree, then try to recover the original by majority vote.' },
  { id: 'timeline', path: '/timeline', kicker: 'Module 2', title: 'Closer, Not Farther', description: 'Five centuries of manuscript discovery: the earliest copy scholars can read has moved back more than a thousand years since 1516.' },
  { id: 'p66', path: '/p66', kicker: 'Module 3', title: 'Read P66 yourself', description: 'A papyrus of John from about 200 AD, lined up word by word with a modern Greek edition and an English translation.' },
  { id: 'variants', path: '/variants', kicker: 'Module 4', title: 'The 110% puzzle', description: 'The famous disputed passages are in your footnotes. See who supports them, and what the 400,000 variants really are.' },
  { id: 'names', path: '/names', kicker: 'Module 5', title: 'Names as fingerprints', description: 'The Gospels use first-century Palestinian names at about the rates the population did, and qualify the common ones.' },
  { id: 'coincidences', path: '/coincidences', kicker: 'Module 6', title: 'Undesigned coincidences', description: 'One Gospel raises a question in passing; another answers it without meaning to.' },
  { id: 'library', path: '/library', kicker: 'The Library', title: 'Every Greek New Testament manuscript, in one place', description: 'The catalogued manuscripts of the Greek New Testament, with page images streamed from the libraries that hold them.' },
  { id: 'present', path: '/present', kicker: 'Present', title: 'The argument, on stage', description: 'Full-screen, keyboard-driven presentation of the live charts.' },
  { id: 'about', path: '/about', kicker: 'About', title: 'Method, sources and limits', description: 'Where every number comes from, what the site does not claim, and every skeptic point with its citation.' },
];

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const req = createRequire(import.meta.url);
    for (const p of [process.env.PLAYWRIGHT_PATH, '/opt/node22/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
      if (!p) continue;
      try {
        return req(p);
      } catch {
        /* next */
      }
    }
    throw new Error('Playwright not found.');
  }
}

const font = (pkg, file) => pathToFileURL(join(ROOT, 'node_modules', pkg, 'files', file)).href;

function card(p) {
  const tree = `<svg width="300" height="300" viewBox="0 0 32 32" style="position:absolute;right:70px;bottom:60px;opacity:.9">
    <g stroke="#1F4E79" stroke-width="0.8" stroke-linecap="round" fill="none"><path d="M16 5 L8 14 M16 5 L24 14 M8 14 L4 24 M8 14 L12 24 M24 14 L20 24 M24 14 L28 24 M4 24 L2 30 M4 24 L6 30 M12 24 L10 30 M12 24 L14 30 M20 24 L18 30 M20 24 L22 30 M28 24 L26 30 M28 24 L30 30"/></g>
    <g fill="#1F4E79"><circle cx="16" cy="5" r="1.6"/><circle cx="8" cy="14" r="1.2"/><circle cx="24" cy="14" r="1.2"/><circle cx="4" cy="24" r="1"/><circle cx="12" cy="24" r="1"/><circle cx="20" cy="24" r="1"/><circle cx="28" cy="24" r="1"/></g>
    <g fill="#A0522D"><circle cx="22" cy="30" r="0.8"/><circle cx="6" cy="30" r="0.8"/></g></svg>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: F; src: url(${font('@fontsource-variable/fraunces', 'fraunces-latin-opsz-normal.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: S; src: url(${font('@fontsource-variable/source-serif-4', 'source-serif-4-latin-opsz-normal.woff2')}) format('woff2'); font-weight: 200 900; }
    @font-face { font-family: P; src: url(${font('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2')}) format('woff2'); font-weight: 600; }
    html,body { margin:0; width:1200px; height:630px; background:#F7F5F0; color:#1E1B16; }
    .c { position:relative; width:1200px; height:630px; box-sizing:border-box; padding:70px 80px; border-left:18px solid #1F4E79; overflow:hidden; }
    .k { font: 600 22px P, sans-serif; letter-spacing:.14em; text-transform:uppercase; color:#A0522D; margin:0 0 26px; }
    h1 { font-family:F, serif; font-weight:500; font-size:${p.title.length > 60 ? 66 : 84}px; line-height:1.02; letter-spacing:-.02em; margin:0 0 26px; max-width:${p.id === 'home' ? 1000 : 820}px; font-variation-settings:"opsz" 144; }
    p.d { font: 400 28px/1.4 S, serif; color:#6B665C; max-width:760px; margin:0; }
    .u { position:absolute; left:80px; bottom:50px; font: 600 18px P, sans-serif; color:#6B665C; letter-spacing:.04em; }
  </style></head><body><div class="c"><p class="k">${p.kicker}</p><h1>${p.title}</h1><p class="d">${p.description}</p><div class="u">lexreach.github.io/closer-not-farther</div>${p.id === 'home' ? '' : tree}</div></body></html>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const meta = {};
  for (const p of PAGES) {
    // Load from a file: URL so the local font files are allowed.
    const tmp = join(OUT, `.card-${p.id}.html`);
    writeFileSync(tmp, card(p));
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    rmSync(tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, `${p.id}.png`) });
    meta[p.path] = { title: p.id === 'home' ? 'Closer, Not Farther' : `${p.title} · Closer, Not Farther`, description: p.description, image: `og/${p.id}.png` };
    console.log('og:', p.id);
  }
  await browser.close();
  writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
