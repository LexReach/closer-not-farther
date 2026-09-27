// Opens the Hebrew Bible in the Reader and checks: the Hebrew column is right to
// left and pointed, the cantillation toggle, a word's meaning card, the evidence
// panel and the Witness view (Leningrad and a Dead Sea Scroll), and the coverage
// map's Testament switch. Screenshots at 1280 and 400 pixels wide.
//   node scripts/ot-check.mjs <base url> [outDir=smoke]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2].replace(/\/?$/, '/');
const out = process.argv[3] ?? 'smoke';
fs.mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails.push(msg);
};
const ok = (p) => p.then(() => true, () => false);
const browser = await chromium.launch();

for (const width of [1280, 400]) {
  const tag = `${width}px`;
  const page = await browser.newPage({ viewport: { width, height: width > 600 ? 900 : 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${base}read/#gen.1.1`, { waitUntil: 'networkidle' });
  const heb = page.locator('.rd-cell--orig.hebrew').first();
  check(await ok(heb.waitFor({ timeout: 15000 })), `${tag}: Genesis opens with a Hebrew column`);
  check((await heb.getAttribute('dir')) === 'rtl', `${tag}: Hebrew is right to left`);
  const text = await heb.innerText();
  check(/[ְ-ֻ]/.test(text), `${tag}: Hebrew is pointed`);
  check(/[֑-֯]/.test(text) && !text.includes('/'), `${tag}: cantillation shown, morpheme dividers removed`);
  check((await page.locator('.rd-row').count()) >= 31, `${tag}: Genesis 1 has 31 rows`);
  check(await ok(page.waitForSelector('.ev .ev-title', { timeout: 8000 })), `${tag}: evidence panel opens for Genesis 1:1`);
  const title = await page.locator('.ev-title').innerText().catch(() => '');
  const cards = await page.locator('.ev-card[data-ot]').count();
  check(cards >= 2 && (await page.locator('.ev-card[data-ot="leningrad-codex"]').count()) === 1, `${tag}: ${title}; ${cards} witness cards incl. Leningrad`);
  await page.screenshot({ path: `${out}/ot-gen-1-1-${width}.png` });

  await page.locator('.ev-card[data-ot="leningrad-codex"] .ev-card__btn').click();
  check(await ok(page.waitForSelector('.wv .tx--hebrew .tx__w.is-spot', { timeout: 8000 })), `${tag}: Leningrad witness view renders the verse`);
  check((await page.locator('.wv .wv__outlinks a').count()) >= 1, `${tag}: link-outs to the photographs`);
  await page.screenshot({ path: `${out}/ot-leningrad-${width}.png` });
  await page.locator('.wv .wv__row--ed .wv__w').first().click();
  check(await ok(page.waitForSelector('.wv .mc', { timeout: 5000 })), `${tag}: tapping a Hebrew word opens its meaning above the witness view`);
  await page.waitForTimeout(500);
  const mc = await page.locator('.wv .mc').first().innerText().catch(() => '');
  check(/beginning/i.test(mc), `${tag}: meaning card for בְּרֵאשִׁית says "beginning"`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // Isaiah 53:5: the Great Isaiah Scroll, drawn without vowel signs.
  await page.goto(`${base}read/#isa.53.5`, { waitUntil: 'networkidle' });
  check(await ok(page.waitForSelector('.ev-card[data-ot="1QIsaa"]', { timeout: 10000 })), `${tag}: Isaiah 53:5 lists 1QIsaa`);
  const oldest = await page.locator('.ev-oldest').innerText().catch(() => '');
  check(/Isaiah Scroll|1QIsa/i.test(oldest), `${tag}: ${oldest}`);
  await page.locator('.ev-card[data-ot="1QIsaa"] .ev-card__btn').click();
  const spot = page.locator('.wv .tx--hebrew .tx__w.is-spot').first();
  check(await ok(spot.waitFor({ timeout: 8000 })), `${tag}: 1QIsaa witness view renders`);
  check(!/[ְ-ֻ֑-֯]/.test(await spot.innerText()), `${tag}: the scroll's page is consonants only`);
  await page.screenshot({ path: `${out}/ot-1QIsaa-${width}.png` });
  await page.keyboard.press('Escape');

  // Tap a word in the Reader's Hebrew column.
  await page.goto(`${base}read/#psa.23`, { waitUntil: 'networkidle' });
  await page.locator('.rd-cell--orig.hebrew .rd-g').first().waitFor({ timeout: 10000 });
  await page.locator('.rd-cell--orig.hebrew .rd-g').nth(2).click();
  check(await ok(page.waitForSelector('.mc', { timeout: 5000 })), `${tag}: Reader Hebrew word opens a meaning card`);
  await page.screenshot({ path: `${out}/ot-psa-23-${width}.png` });

  await page.goto(`${base}why/coverage/`, { waitUntil: 'networkidle' });
  const sw = page.locator('.cov__switch button', { hasText: 'Hebrew Bible' });
  check(await ok(sw.waitFor({ timeout: 10000 })), `${tag}: coverage map has a Testament switch`);
  await sw.click();
  await page.waitForTimeout(600);
  const readout = await page.locator('.cov__readout').innerText().catch(() => '');
  check(/23,145 verses/.test(readout), `${tag}: Hebrew Bible map: ${readout}`);
  await page.screenshot({ path: `${out}/ot-coverage-${width}.png` });
  check(errors.length === 0, `${tag}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
if (fails.length) {
  console.error(`${fails.length} check(s) failed`);
  process.exit(1);
}
