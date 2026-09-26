#!/usr/bin/env node
/**
 * build-coverage.mjs
 *
 * Builds data/evidence/coverage/<BOOK>.json + coverage/summary.json: for every
 * verse in the New Testament, the list of manuscripts whose pages contain it.
 *
 * Priority (per coordinator direction): real NTVMR page-level coverage, via
 * the metadata/liste/search "indexContent" (OSIS ref) search, matters most —
 * catalogue-level fallback is a last resort, not the main event, and must
 * never overstate a fragmentary manuscript's actual coverage:
 *
 *  Phase B (network, INTF NTVMR, primary): for each NT book, query
 *    metadata/liste/search/?indexContent=<osis>&detail=page&format=json to get
 *    every page (any manuscript) whose transcribed/indexed content intersects
 *    that book, then place each page's verse range into every verse it
 *    covers, as page-verified hits ["<GA>", "<pageId>", "<range or single c:v>"].
 *
 *  Phase A (no network, restricted fallback): catalogue-level coverage is
 *    added ONLY for minuscules ('m') and lectionaries ('L') NOT already
 *    page-verified for that verse, marked ["<GA>", null, "c"]. It is NEVER
 *    applied to papyri ('P') or majuscules ('M'): those catalogue rows carry
 *    no reliable "this is a complete, unbroken copy" guarantee (many papyri
 *    are single small fragments), so claiming corpus-wide coverage for them
 *    from the 'contents' letter alone would be misleading. If page-level hits
 *    already cover most of a book's verses (>= FALLBACK_DROP_THRESHOLD), the
 *    catalogue fallback is dropped for that book entirely.
 *
 * summary.json's per-verse `count` is the number of manuscripts actually
 * listed for that verse (not the size of the whole catalogue corpus roster).
 *
 * Network access only works from GitHub Actions (see .github/workflows/data-evidence.yml);
 * phase B is skipped (with a log line) if fetches fail, and phase A alone is kept.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NT_BOOKS, iterVerses } from './nt-books.mjs';
import { setCacheDir } from './lib.mjs';
import { discover } from './ntvmr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'coverage');
const CACHE_DIR = path.join(ROOT, '.cache-evidence', 'ntvmr-raw');
const SKIP_NETWORK = process.env.EVIDENCE_SKIP_NETWORK === '1';
// Wall-clock budget for the NTVMR fetch phase (books are processed oldest/most-attested
// first isn't guaranteed, but every book's file is written as soon as it's computed, so
// running out of time here still leaves a valid, committable result — just with fewer
// books enriched with real page-level data this run; the rest keep their previous file).
const COVERAGE_BUDGET_MS = Number(process.env.EVIDENCE_COVERAGE_BUDGET_MS || 20 * 60 * 1000);
const START = Date.now();

setCacheDir(CACHE_DIR);

function log(...args) {
  console.log(...args);
}
function timeLeft() {
  return COVERAGE_BUDGET_MS - (Date.now() - START);
}

async function loadCatalog() {
  const raw = JSON.parse(await readFile(path.join(ROOT, 'data', 'library', 'catalog.json'), 'utf8'));
  const idx = Object.fromEntries(raw.fields.map((f, i) => [f, i]));
  return raw.rows.map((r) => ({
    ga: r[idx.ga],
    cat: r[idx.cat],
    c0: r[idx.c0],
    c1: r[idx.c1],
    contents: r[idx.contents] || '',
  }));
}

// ---------------------------------------------------------------------------
// Phase A: catalogue-level baseline
// ---------------------------------------------------------------------------

function buildCatalogueBaseline(catalog) {
  // corpus letter -> [{ga, c0}] sorted by c0 asc (undated last), for oldest-first summaries
  const byCorpus = { e: [], a: [], p: [], c: [], r: [] };
  for (const row of catalog) {
    const letters = row.contents.split(',').map((s) => s.trim()).filter(Boolean);
    for (const l of letters) {
      if (byCorpus[l]) byCorpus[l].push(row);
    }
  }
  for (const l of Object.keys(byCorpus)) {
    byCorpus[l].sort((a, b) => (a.c0 ?? 99) - (b.c0 ?? 99));
  }
  return byCorpus;
}

// A book's catalogue fallback is dropped entirely once page-verified hits
// already reach this fraction of its verses (coordinator direction: "if
// page-level coverage exists for most of a book, drop the fallback for that
// book entirely").
const FALLBACK_DROP_THRESHOLD = 0.5;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const catalog = await loadCatalog();
  log(`Loaded ${catalog.length} catalog rows.`);

  const byCorpus = buildCatalogueBaseline(catalog);
  // Catalogue-level fallback is restricted to minuscules ('m') and lectionaries
  // ('L') only: papyri and majuscules are frequently small fragments, and the
  // catalogue's corpus-letter classification carries no "this copy is complete"
  // guarantee, so applying it to them would overstate their actual coverage
  // (e.g. claiming P104, a single scrap, attests all of Matthew).
  const fallbackByCorpus = {};
  for (const l of Object.keys(byCorpus)) {
    fallbackByCorpus[l] = byCorpus[l].filter((r) => r.cat === 'm' || r.cat === 'L');
    log(`  corpus ${l}: ${byCorpus[l].length} catalogued (all cats), ${fallbackByCorpus[l].length} eligible for fallback (m/L only)`);
  }

  const catalogByGA = new Map(catalog.map((r) => [r.ga, r]));
  let shape = null;
  let phaseBAttempted = false;
  if (!SKIP_NETWORK) {
    phaseBAttempted = true;
    shape = await discover('P52');
    if (!shape) log('No confirmed NTVMR page-index shape this run; using catalogue-level (m/L) coverage only.');
  } else {
    log('EVIDENCE_SKIP_NETWORK=1: skipping NTVMR phase B, catalogue-level only.');
  }

  const summary = {}; // "BOOK.c:v" -> [count, oldestGA, oldestCentury]
  let totalVerses = 0;
  let totalPageVerified = 0;
  let totalCatalogueFallback = 0;
  let booksWithPageData = 0;

  // Fetch order: John first (the most-discussed book throughout this build, and where
  // P52/P66/P75 etc. matter most), then the rest of the Gospels + Acts, then everything
  // else in canonical order — so if the time budget runs out partway, the books most
  // people will actually look at are the ones most likely to have finished.
  const FETCH_PRIORITY = ['JHN', 'MAT', 'MRK', 'LUK', 'ACT'];
  const fetchOrder = [
    ...FETCH_PRIORITY.map((id) => NT_BOOKS.find((b) => b.id === id)),
    ...NT_BOOKS.filter((b) => !FETCH_PRIORITY.includes(b.id)),
  ];

  // Processed one book at a time (not merged into one global structure): verse
  // keys ("c:v") are only unique WITHIN a book, so a single flat ga->"c:v" map
  // spanning every book would silently collide (nearly every book has a "1:1").
  for (const book of fetchOrder) {
    const fallbackRoster = fallbackByCorpus[book.corpus];
    const verseKeys = [...iterVerses(book)];

    // pageData: ga -> Map("c:v" -> {pageId, range}), scoped to this book only.
    const pageData = new Map();
    if (shape && timeLeft() <= 0) {
      log(`  ${book.id}: coverage time budget (${COVERAGE_BUDGET_MS}ms) exhausted; writing catalogue-fallback-only for this book.`);
    }
    if (shape && timeLeft() > 0) {
      try {
        const rows = await shape.fetchBookPages(book, START + COVERAGE_BUDGET_MS); // [{ga, pageId, folio, verseKeys:["c:v",...], range}]
        for (const row of rows) {
          if (!pageData.has(row.ga)) pageData.set(row.ga, new Map());
          const m = pageData.get(row.ga);
          for (const vk of row.verseKeys) m.set(vk, { pageId: row.pageId, range: row.range });
        }
        log(`  ${book.id}: ${rows.length} page rows from indexContent, ${pageData.size} distinct manuscripts`);
      } catch (err) {
        log(`  ${book.id}: indexContent fetch failed: ${err.message}`);
      }
    }
    if (pageData.size) booksWithPageData++;

    // Decide whether page-level coverage already reaches "most" of this
    // book's verses; if so, drop the catalogue fallback for the whole book.
    let versesWithPageHit = 0;
    for (const key of verseKeys) {
      for (const m of pageData.values()) {
        if (m.has(key)) {
          versesWithPageHit++;
          break;
        }
      }
    }
    const pageFraction = verseKeys.length ? versesWithPageHit / verseKeys.length : 0;
    const useFallback = pageFraction < FALLBACK_DROP_THRESHOLD;

    const verses = {};
    for (const key of verseKeys) {
      const hits = [];
      const seen = new Set();
      let oldestC0 = Infinity;
      let oldestGA = null;
      for (const [ga, m] of pageData) {
        const hit = m.get(key);
        if (!hit) continue;
        hits.push(hit.range ? [ga, hit.pageId, hit.range] : [ga, hit.pageId]);
        seen.add(ga);
        totalPageVerified++;
        const row = catalogByGA.get(ga);
        const c0 = row && row.c0 != null ? row.c0 : Infinity;
        if (c0 < oldestC0) {
          oldestC0 = c0;
          oldestGA = ga;
        }
      }
      if (useFallback) {
        for (const row of fallbackRoster) {
          if (seen.has(row.ga)) continue;
          hits.push([row.ga, null, 'c']);
          totalCatalogueFallback++;
          const c0 = row.c0 != null ? row.c0 : Infinity;
          if (c0 < oldestC0) {
            oldestC0 = c0;
            oldestGA = row.ga;
          }
        }
      }
      verses[key] = hits;
      totalVerses++;
      // count = manuscripts actually listed for this verse (not the whole corpus roster).
      summary[`${book.id}.${key}`] = [hits.length, oldestGA, Number.isFinite(oldestC0) ? oldestC0 : null];
    }
    const basis = pageData.size > 0 ? 'ntvmr-index' : 'catalog-contents';
    const payload = { book: book.id, basis, verses };
    await writeFile(path.join(OUT_DIR, `${book.id}.json`), JSON.stringify(payload));
    log(
      `Wrote coverage/${book.id}.json (${Object.keys(verses).length} verses, basis=${basis}, ` +
        `pageFraction=${pageFraction.toFixed(2)}, fallbackUsed=${useFallback})`,
    );
  }

  await writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary));
  log(`Wrote coverage/summary.json (${Object.keys(summary).length} verse entries)`);
  log(
    `Totals: ${totalVerses} verse-slots, ${totalPageVerified} page-verified hits, ` +
      `${totalCatalogueFallback} catalogue-fallback hits, phaseBAttempted=${phaseBAttempted}, booksWithPageData=${booksWithPageData}/${NT_BOOKS.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
