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
  await page.goto(base + 'read/#john.1', { waitUntil: 'networkidle' });
  const rows = await page.locator('.rd-row').count();
  check(rows === 51, `${tag}: John 1 shows ${rows} verses (expect 51)`);
  const t0 = Date.now();
  await page.goto(base + 'read/#romans.8', { waitUntil: 'networkidle' });
  check((await page.locator('.rd-row').count()) === 39, `${tag}: Romans 8 shows 39 verses`);
  await page.goto(base + 'read/#genesis.1', { waitUntil: 'networkidle' });
  check((await page.locator('.rd-row').count()) === 31, `${tag}: Genesis 1 shows 31 verses`);
  console.log(`     chapter switches took ${Date.now() - t0} ms`);
  await page.goto(base + 'read/#john.1.1', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `smoke/read-${tag}.png` });
  // Evidence panel, when the build has one.
  const ev = await page.locator('.ev').count();
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
