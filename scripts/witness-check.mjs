// Opens the Witness view for transcribed pages and checks the typographic
// rendering: the page is drawn line by line, the verse is spotlit, and the
// "As written" row carries the verse's words.
//   node scripts/witness-check.mjs <base url> [outDir=smoke]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2].replace(/\/?$/, '/');
const out = process.argv[3] ?? 'smoke';
fs.mkdirSync(out, { recursive: true });
const CASES = [
  { hash: 'john.1.1', ga: 'P66', label: 'P66 John 1:1' },
  { hash: 'john.18.1', ga: '01', label: 'Sinaiticus John 18:1' },
  { hash: 'mark.16.8', ga: '03', label: 'Vaticanus Mark 16:8' },
];

const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails.push(msg);
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const c of CASES) {
  await page.goto(`${base}read/#${c.hash}`, { waitUntil: 'networkidle' });
  const card = page.locator(`.ev-card[data-ga="${c.ga}"] .ev-card__btn`);
  const found = await card.waitFor({ timeout: 15000 }).then(() => true, () => false);
  check(found, `${c.label}: card in the evidence panel`);
  if (!found) continue;
  check(/transcribed/.test((await card.getAttribute('aria-label')) ?? ''), `${c.label}: card is marked transcribed`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const lit = await page.waitForSelector('.wv .wv__page .tx__w.is-spot', { timeout: 15000 }).then(() => true, () => false);
  const lines = await page.locator('.wv .wv__page .tx__line').count();
  const spot = await page.locator('.wv .wv__page .tx__w.is-spot').count();
  const words = await page.locator('.wv .wv__row--ms .wv__w').count();
  const text = (await page.locator('.wv .wv__row--ms .wv__rowtext').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
  check(lit && spot > 0, `${c.label}: verse spotlit on the page (${spot} tokens, ${lines} lines)`);
  check(lines >= 5, `${c.label}: page drawn line by line`);
  check(words >= 3, `${c.label}: "As written" row has ${words} words: ${text}`);
  await page.screenshot({ path: `${out}/witness-${c.ga}-${c.hash}.png` });
  await page.keyboard.press('Escape');
}
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
if (fails.length) {
  console.error(`${fails.length} check(s) failed`);
  process.exit(1);
}
