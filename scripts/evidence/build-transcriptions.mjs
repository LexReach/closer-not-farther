#!/usr/bin/env node
/**
 * build-transcriptions.mjs
 *
 * Builds data/evidence/transcriptions/<GA>/<pageId>.json: page-level diplomatic
 * transcriptions (columns/lines/tokens, with nomina sacra, lacunae and
 * corrections where marked up) for manuscripts that have a machine-readable
 * TEI transcription available.
 *
 * Sources tried, in order, per manuscript:
 *   1. INTF NTVMR transcript API (scripts/evidence/ntvmr.mjs) — any manuscript.
 *   2. IGNTP's John transcriptions (iohannes.com, CC BY) — John-only, used as
 *      a fallback/cross-check for manuscripts containing John.
 *
 * Priority order (spec): the 25 featured manuscripts, then everything dated
 * wholly before 900 AD, then everything else with an image in
 * data/library/images.json — stopping when TIME_BUDGET_MS runs out so a run
 * always finishes inside the workflow's timeout with whatever it got done.
 *
 * Needs network (NTVMR + iohannes.com); only meaningful in CI.
 */

import { writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setCacheDir, sleepMs, runPool } from './lib.mjs';
import { discover } from './ntvmr.mjs';
import { parseTEIPage, teiBody } from './tei.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'transcriptions');
// The raw TEI of every page (the <text> element only, gzipped per manuscript),
// so the parser can be re-run without fetching again: reparse-transcriptions.mjs.
const TEI_DIR = path.join(ROOT, 'data', 'evidence', 'tei');
const CACHE_DIR = path.join(ROOT, '.cache-evidence', 'ntvmr-raw');
const TIME_BUDGET_MS = Number(process.env.EVIDENCE_TRANSCRIPTS_BUDGET_MS || 35 * 60 * 1000);
const START = Date.now();

setCacheDir(CACHE_DIR);

function log(...a) {
  console.log(...a);
}
function timeLeft() {
  return TIME_BUDGET_MS - (Date.now() - START);
}

async function loadJSON(rel, fallback) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
  } catch (err) {
    log(`  (could not load ${rel}: ${err.message})`);
    return fallback;
  }
}

async function buildPriorityList() {
  const catalog = await loadJSON('data/library/catalog.json', { fields: [], rows: [] });
  const idx = Object.fromEntries(catalog.fields.map((f, i) => [f, i]));
  const featured = await loadJSON('data/library/featured.json', { manuscripts: [] });
  const images = await loadJSON('data/library/images.json', { items: {} });

  const order = [];
  const seen = new Set();
  // EVIDENCE_TX_FIRST="P66,01,03": fetch these before anything else.
  const push = (ga) => {
    if (!ga || seen.has(ga)) return;
    seen.add(ga);
    order.push(ga);
  };

  for (const ga of (process.env.EVIDENCE_TX_FIRST || '').split(',')) push(ga.trim());
  for (const m of featured.manuscripts) push(m.ga);

  const early = catalog.rows
    .filter((r) => r[idx.c0] != null && r[idx.c0] <= 9)
    .sort((a, b) => (a[idx.c0] ?? 99) - (b[idx.c0] ?? 99));
  for (const r of early) push(r[idx.ga]);

  for (const ga of Object.keys(images.items || {})) push(ga);

  return order;
}

async function main() {
  // Pages written by an earlier parser are replaced, not mixed with new ones.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TEI_DIR, { recursive: true });
  const order = await buildPriorityList();
  log(`Transcription priority list: ${order.length} manuscripts (featured -> pre-900 -> imaged).`);

  const shape = await discover();
  if (!shape) {
    log('No working NTVMR endpoint discovered; cannot fetch any transcriptions this run.');
    return;
  }

  let manuscriptsDone = 0;
  let pagesDone = 0;
  let stopped = false;
  await runPool(
    order,
    async (ga) => {
      if (stopped || timeLeft() <= 0) {
        stopped = true;
        return;
      }
      const pages = await shape.fetchManuscriptPages(ga);
      const transcribedPages = pages.filter((p) => p.transcribed);
      if (!transcribedPages.length) return;
      const dir = path.join(OUT_DIR, ga);
      await mkdir(dir, { recursive: true });
      let done = 0;
      const raws = {};
      for (const pg of transcribedPages) {
        if (timeLeft() <= 0) {
          stopped = true;
          break;
        }
        const raw = await shape.fetchTranscript(ga, pg.pageId);
        if (!raw) continue;
        if (pagesDone < 3) log(`[sample raw transcript ${ga}/${pg.pageId}] ${teiBody(raw).slice(0, 3000)}`);
        const body = teiBody(raw);
        raws[pg.pageId] = { folio: pg.folio ?? null, xml: body };
        const parsed = parseTEIPage(body, { ga, pageId: pg.pageId, folio: pg.folio ?? null });
        if (!parsed.columns.length) continue;
        await writeFile(path.join(dir, `${pg.pageId}.json`), JSON.stringify(parsed));
        pagesDone++;
        done++;
        await sleepMs(200);
      }
      if (Object.keys(raws).length) await writeFile(path.join(TEI_DIR, `${ga}.json.gz`), zlib.gzipSync(JSON.stringify(raws), { level: 9 }));
      manuscriptsDone++;
      log(`  ${ga}: ${done}/${transcribedPages.length} pages transcribed (of ${pages.length} total pages)`);
    },
    { concurrency: 3, delayMs: 0, onError: (ga, err) => log(`  [transcript] ${ga} failed: ${err.message}`) },
  );
  if (stopped) log(`Time budget exhausted; stopped early.`);
  log(`Done: ${manuscriptsDone} manuscripts, ${pagesDone} pages transcribed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
