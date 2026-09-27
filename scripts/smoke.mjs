// Smoke test of the deployed site: node scripts/smoke.mjs <base url>
// Waits for the new build to be served, then checks the Reader, the Why page
// and the Library in a phone-sized and a desktop browser.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2].replace(/\/?$/, '/');
const sha = process.env.GITHUB_SHA ?? '';
fs.mkdirSync('smoke', { recursive: true });
const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails.push(msg);
};

// Pages can take a minute to serve the new build.
for (let i = 0; i < 20 && sha; i++) {
  const v = await fetch(base + 'version.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
  if (v.commit && sha.startsWith(v.commit)) break;
  await new Promise((r) => setTimeout(r, 15000));
}

const browser = await chromium.launch();
for (const [w, hgt, tag] of [[400, 860, 'phone'], [1280, 900, 'desktop']]) {
  const page = await browser.newPage({ viewport: { width: w, height: hgt } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const rowsFor = async (hash, n) => {
    await page.goto(base + 'read/' + hash, { waitUntil: 'networkidle' });
    return page.waitForFunction((k) => document.querySelectorAll('.rd-row').length === k, n, { timeout: 15000 }).then(() => n, async () => page.locator('.rd-row').count());
  };
  check((await rowsFor('#john.1', 51)) === 51, `${tag}: John 1 shows 51 verses`);
  check((await page.locator('.rd-vertag').innerText().catch(() => '')).includes('BSB'), `${tag}: the chapter header names the version (BSB)`);
  // First tap on a fresh profile: the one-time hint must not move verse 1 away from the click.
  await page.waitForTimeout(1200);
  await page.locator('.rd-row[data-v="1"] .rd-cell').first().click();
  await page.waitForTimeout(300);
  const firstHash = await page.evaluate(() => location.hash);
  check(/\.1\.1$/.test(firstHash), `${tag}: first click on John 1:1 selects verse 1 (${firstHash})`);
  const t0 = Date.now();
  check((await rowsFor('#romans.8', 39)) === 39, `${tag}: Romans 8 shows 39 verses`);
  check((await rowsFor('#genesis.1', 31)) === 31, `${tag}: Genesis 1 shows 31 verses`);
  console.log(`     chapter switches took ${Date.now() - t0} ms`);
  await page.goto('about:blank'); // a real deep link, not a hash change inside the Reader
  await rowsFor('#john.1.1', 51);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `smoke/read-${tag}.png` });
  // Evidence panel, when the build has one.
  // A deep link paints the chapter with the verse lit, then opens the panel collapsed to one line.
  const peek = await page.waitForSelector('.ev.is-collapsed .ev-peek', { timeout: 8000 }).then(() => 1, () => 0);
  check(peek === 1, `${tag}: a deep link opens the evidence panel collapsed`);
  if (peek) {
    check((await page.locator('.rd-row[data-v="1"].is-sel').count()) === 1, `${tag}: deep link lights John 1:1`);
    check(/Carried by \d+ manuscripts? · oldest/.test(await page.locator('.ev-peek').innerText()), `${tag}: collapsed panel reads "${(await page.locator('.ev-peek__text').innerText()).trim()}"`);
    await page.screenshot({ path: `smoke/read-collapsed-${tag}.png` });
    await page.locator('.ev-peek').click();
  }
  const ev = await page.waitForSelector('.ev .ev-title', { timeout: 8000 }).then(() => 1, () => 0);
  if (ev) {
    check((await page.locator('.ev-title').innerText()).length > 0, `${tag}: evidence panel opens for John 1:1`);
    await page.screenshot({ path: `smoke/evidence-${tag}.png` });
  }
  for (const p of ['why', 'library', 'about', 'telephone', 'present']) {
    await page.goto(base + p + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    check((await page.locator('main, .pr').count()) > 0, `${tag}: /${p} renders`);
  }
  await page.goto(base + 'why/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `smoke/why-${tag}.png` });
  check(errors.length === 0, `${tag}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
if (fails.length) {
  console.error(`${fails.length} check(s) failed`);
  process.exit(1);
}
