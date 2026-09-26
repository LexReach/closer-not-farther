#!/usr/bin/env node
// Records the guided tour (data/tour.json) as a film, with the tour's caption
// card burned in, and cuts a 20-second teaser.
//
//   npm run build && node scripts/render-film.mjs
//
// Needs: Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`,
// or a global install), and ffmpeg with libx264 on PATH (or FFMPEG=/path/to/ffmpeg;
// `pip install imageio-ffmpeg` ships one). Outputs to public/film/:
//   closer-not-farther.mp4   H.264, 1920×1080, target < 20 MB
//   teaser.mp4               first 12 s (opening frame) + 8 s of the timeline sweep
//   closer-not-farther.webm  VP9 copy for browsers without H.264
//   poster.jpg               poster frame for the <video> element
// If H.264 encoding fails the script falls back to WebM (VP9) and says so.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'public/film');
const PORT = Number(process.env.PORT || 4178);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const W = 1920;
const H = 1080;

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const req = createRequire(import.meta.url);
    for (const p of [process.env.PLAYWRIGHT_PATH, '/opt/node22/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
      if (!p) continue;
      try {
        return req(p);
      } catch {
        /* try next */
      }
    }
    throw new Error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
  }
}

function ff(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  return r.status === 0;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const tmp = join(tmpdir(), `film-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  let marks = [];
  try {
    const { chromium } = await loadPlaywright();
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      recordVideo: { dir: tmp, size: { width: W, height: H } },
    });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(`http://localhost:${PORT}/closer-not-farther/?tour=1&film=1`, { waitUntil: 'load' });
    const loadOffset = (Date.now() - t0) / 1000;
    await page.waitForFunction(() => window.__tour?.done === true, null, { timeout: 8 * 60 * 1000, polling: 1000 });
    marks = await page.evaluate(() => window.__tour.marks);
    await context.close();
    await browser.close();
    const webm = readdirSync(tmp).find((f) => f.endsWith('.webm'));
    if (!webm) throw new Error('No video was recorded.');
    const src = join(tmp, webm);
    // Skip the blank frames before the page painted.
    const start = Math.max(0, loadOffset - 0.2).toFixed(2);
    const mp4 = join(OUT, 'closer-not-farther.mp4');
    let ok = false;
    for (const crf of [26, 30, 34]) {
      ok = ff(['-ss', start, '-i', src, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', mp4]);
      if (!ok) break;
      const mb = statSync(mp4).size / 1e6;
      console.log(`film: crf ${crf} → ${mb.toFixed(1)} MB`);
      if (mb < 20) break;
    }
    if (!ok) {
      console.warn('H.264 encoding failed; writing WebM (VP9) instead.');
      rmSync(mp4, { force: true });
      ff(['-ss', start, '-i', src, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', join(OUT, 'closer-not-farther.webm')]) || renameSync(src, join(OUT, 'closer-not-farther.webm'));
    }
    const film = ok ? mp4 : join(OUT, 'closer-not-farther.webm');
    ff(['-ss', '7', '-i', film, '-frames:v', '1', '-q:v', '3', join(OUT, 'poster.jpg')]);
    // A VP9 copy for browsers without H.264 (e.g. some Chromium builds).
    if (ok) ff(['-i', mp4, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', join(OUT, 'closer-not-farther.webm')]);
    // Teaser: the opening frame, then the timeline sweep.
    const tl = marks.find((m) => m.id === 'timeline');
    const tlStart = tl ? tl.t / 1000 + 6.5 : 60;
    const teaser = join(OUT, ok ? 'teaser.mp4' : 'teaser.webm');
    ff([
      '-i', film,
      '-filter_complex',
      `[0:v]trim=0:12,setpts=PTS-STARTPTS[a];[0:v]trim=${tlStart.toFixed(2)}:${(tlStart + 8).toFixed(2)},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]`,
      '-map', '[v]', '-an',
      ...(ok ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] : ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38']),
      teaser,
    ]);
    writeFileSync(join(OUT, 'film.json'), JSON.stringify({ generated: new Date().toISOString(), format: ok ? 'mp4' : 'webm', width: W, height: H, chapters: marks.map((m) => ({ id: m.id, start: +(m.t / 1000).toFixed(2) })) }, null, 2) + '\n');
    for (const f of readdirSync(OUT)) console.log(`  ${f}  ${(statSync(join(OUT, f)).size / 1e6).toFixed(2)} MB`);
  } finally {
    preview.kill();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
