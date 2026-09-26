#!/usr/bin/env node
/**
 * build-coverage.mjs
 *
 * Builds data/evidence/coverage/<BOOK>.json + coverage/summary.json: for every
 * verse in the New Testament, the list of manuscripts whose pages contain it.
 *
 * Phase B (network, INTF NTVMR, primary — per coordinator direction, real
 *   page-level coverage matters most): for a PRIORITY subset of manuscripts
 *   (the 25 featured manuscripts + every one dated wholly before 900 AD,
 *   ~590 total), query metadata/liste/search/?gaNum=<ga>&detail=page,
 *   bounded to that one manuscript's own pages (fast and reliably-sized,
 *   unlike an unbounded whole-corpus indexContent scan per book/chapter,
 *   which in testing made individual requests slow enough to blow the whole
 *   workflow's time budget with only a handful of books done). Each page's
 *   indexContent text is parsed into per-book "c:v" keys (a single page can
 *   span more than one book) and recorded as a page-verified hit
 *   ["<GA>", "<pageId>", "<range text>"].
 *
 * Phase A (no network, restricted fallback): catalogue-level coverage is
 *   added ONLY for minuscules ('m') and lectionaries ('L') NOT already
 *   page-verified for that verse, marked ["<GA>", null, "c"]. Never applied
 *   to papyri ('P') or majuscules ('M'): those catalogue rows carry no
 *   reliable "this is a complete, unbroken copy" guarantee (many papyri are
 *   single small fragments), so claiming corpus-wide coverage for them from
 *   the 'contents' letter alone would be misleading. If page-level hits
 *   already cover most of a book's verses (>= FALLBACK_DROP_THRESHOLD), the
 *   catalogue fallback is dropped for that book entirely.
 *
 * summary.json's per-verse `count` is the number of manuscripts actually
 * listed for that verse (not the size of the whole catalogue corpus roster).
 *
 * Network access only works from GitHub Actions (see .github/workflows/data-evidence.yml);
 * phase B is time-boxed (EVIDENCE_COVERAGE_BUDGET_MS) and skipped/truncated
 * gracefully if it runs out, and phase A alone is kept for whatever it missed.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NT_BOOKS, iterVerses } from './nt-books.mjs';
import { setCacheDir, runPool } from './lib.mjs';
import { discover, parseIndexContent, verseKeysByBook } from './ntvmr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'coverage');
const CACHE_DIR = path.join(ROOT, '.cache-evidence', 'ntvmr-raw');
const SKIP_NETWORK = process.env.EVIDENCE_SKIP_NETWORK === '1';
// Wall-clock budget for the NTVMR fetch phase, checked once per PRIORITY
// MANUSCRIPT (not once per book) — a much finer grain than the earlier
// per-book/chapter design, so a slow spot can never eat more than roughly one
// request's worth of overrun regardless of how large the priority list is.
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

async function loadFeatured() {
  try {
    const raw = JSON.parse(await readFile(path.join(ROOT, 'data', 'library', 'featured.json'), 'utf8'));
    return new Set(raw.manuscripts.map((m) => m.ga));
  } catch {
    return new Set();
  }
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
  const featured = await loadFeatured();
  log(`Loaded ${catalog.length} catalog rows, ${featured.size} featured GAs.`);

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

  // Priority subset for phase B: pre-900 AD (c0 <= 9) plus every featured GA.
  // Featured manuscripts sort first (regardless of date) so a tight time
  // budget still guarantees the 25 most-discussed manuscripts get done.
  const priority = catalog
    .filter((r) => (r.c0 != null && r.c0 <= 9) || featured.has(r.ga))
    .sort((a, b) => Number(featured.has(b.ga)) - Number(featured.has(a.ga)) || (a.c0 ?? 99) - (b.c0 ?? 99));
  log(`Priority (featured first, then pre-900 by century) manuscripts for page-level lookup: ${priority.length}`);

  // pageDataByBook: bookId -> Map(ga -> Map("c:v" -> {pageId, range}))
  const pageDataByBook = new Map(NT_BOOKS.map((b) => [b.id, new Map()]));
  let shape = null;
  let phaseBAttempted = false;
  let manuscriptsFetched = 0;
  let stoppedEarly = false;

  if (!SKIP_NETWORK) {
    phaseBAttempted = true;
    shape = await discover();
    if (shape) {
      log(`--- fetching per-manuscript page data for ${priority.length} priority manuscripts (concurrency 3) ---`);
      await runPool(
        priority,
        async (row) => {
          if (timeLeft() <= 0) {
            stoppedEarly = true;
            return;
          }
          const pages = await shape.fetchManuscriptPages(row.ga);
          for (const pg of pages) {
            const ranges = parseIndexContent(pg.range);
            const byBook = verseKeysByBook(ranges);
            for (const [bookId, keys] of byBook) {
              if (!keys.length) continue;
              const bookMap = pageDataByBook.get(bookId);
              if (!bookMap) continue;
              if (!bookMap.has(row.ga)) bookMap.set(row.ga, new Map());
              const m = bookMap.get(row.ga);
              for (const key of keys) m.set(key, { pageId: pg.pageId, range: pg.range });
            }
          }
          manuscriptsFetched++;
        },
        { concurrency: 3, delayMs: 150, onError: (row, err) => log(`  [ntvmr] ${row.ga} failed: ${err.message}`) },
      );
      if (stoppedEarly) log(`Coverage time budget (${COVERAGE_BUDGET_MS}ms) exhausted after ${manuscriptsFetched}/${priority.length} manuscripts.`);
      log(`Page-level data fetched for ${manuscriptsFetched}/${priority.length} priority manuscripts.`);
    } else {
      log('No confirmed NTVMR page-index shape this run; using catalogue-level (m/L) coverage only.');
    }
  } else {
    log('EVIDENCE_SKIP_NETWORK=1: skipping NTVMR phase B, catalogue-level only.');
  }

  const summary = {}; // "BOOK.c:v" -> [count, oldestGA, oldestCentury]
  let totalVerses = 0;
  let totalPageVerified = 0;
  let totalCatalogueFallback = 0;
  let booksWithPageData = 0;

  for (const book of NT_BOOKS) {
    const fallbackRoster = fallbackByCorpus[book.corpus];
    const verseKeys = [...iterVerses(book)];
    const pageData = pageDataByBook.get(book.id); // ga -> Map("c:v" -> {pageId, range})
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
