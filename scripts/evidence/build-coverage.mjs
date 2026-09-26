#!/usr/bin/env node
/**
 * build-coverage.mjs
 *
 * Builds data/evidence/coverage/<BOOK>.json + coverage/summary.json: for every
 * verse in the New Testament, the list of manuscripts whose pages contain it.
 *
 * Two-phase, so the run always produces a complete, valid baseline even if the
 * network phase fails or is only partly successful:
 *
 *  Phase A (no network): catalogue-level coverage. For every verse, every
 *    catalogued manuscript (data/library/catalog.json) whose `contents` field
 *    includes that verse's corpus letter (e/a/p/c/r) is listed as a hit,
 *    marked catalogue-level: ["<GA>", null, "c"].
 *
 *  Phase B (network, best-effort, INTF NTVMR): for a priority subset of
 *    manuscripts (every one dated wholly before 900 AD, plus the 25 featured
 *    manuscripts), look up real page-level "index content" (which verses each
 *    page carries) from the NTVMR API and upgrade matching entries to
 *    page-verified hits ["<GA>", "<pageId>"] (no "c" flag). Manuscripts we
 *    could not page-verify (API miss, no transcription/index, or simply not
 *    in the priority subset) keep their catalogue-level entry.
 *
 * Network access only works from GitHub Actions (see .github/workflows/data-evidence.yml);
 * phase B is skipped (with a log line) if fetches fail, and phase A output is kept.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NT_BOOKS } from './nt-books.mjs';
import { setCacheDir, runPool } from './lib.mjs';
import { discover, fetchPageIndex } from './ntvmr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'coverage');
const CACHE_DIR = path.join(ROOT, '.cache-evidence', 'ntvmr-raw');
const SKIP_NETWORK = process.env.EVIDENCE_SKIP_NETWORK === '1';

setCacheDir(CACHE_DIR);

function log(...args) {
  console.log(...args);
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const catalog = await loadCatalog();
  const featured = await loadFeatured();
  log(`Loaded ${catalog.length} catalog rows, ${featured.size} featured GAs.`);

  const byCorpus = buildCatalogueBaseline(catalog);
  for (const l of Object.keys(byCorpus)) {
    log(`  corpus ${l}: ${byCorpus[l].length} catalogued manuscripts`);
  }

  // Priority subset for phase B: pre-900 AD (c0 <= 9) plus every featured GA.
  const priority = catalog.filter((r) => (r.c0 != null && r.c0 <= 9) || featured.has(r.ga));
  log(`Priority (pre-900 or featured) manuscripts for page-level lookup: ${priority.length}`);

  const pageIndex = new Map(); // ga -> Map("c:v" -> pageId)
  let workingShape = null;
  let phaseBAttempted = false;
  let phaseBHits = 0;

  if (!SKIP_NETWORK) {
    phaseBAttempted = true;
    const sample = priority.find((r) => r.ga === 'P52') || priority[0];
    workingShape = sample ? await discover(sample.ga) : null;

    if (workingShape) {
      log(`--- fetching page indexes for ${priority.length} priority manuscripts (concurrency 3) ---`);
      await runPool(
        priority,
        async (row) => {
          const idx = await fetchPageIndex(row.ga, workingShape);
          if (idx && idx.size) {
            pageIndex.set(row.ga, idx);
            phaseBHits++;
          }
        },
        { concurrency: 3, delayMs: 350, onError: (row, err) => log(`  [ntvmr] ${row.ga} failed: ${err.message}`) },
      );
      log(`Page-level index obtained for ${pageIndex.size}/${priority.length} priority manuscripts.`);
    } else {
      log('No working NTVMR page-index endpoint discovered this run; using catalogue-level coverage only.');
    }
  } else {
    log('EVIDENCE_SKIP_NETWORK=1: skipping NTVMR phase B, catalogue-level only.');
  }

  // ---------------------------------------------------------------------------
  // Assemble per-book coverage files
  //
  // Sizing note: a literal "every verse lists every catalogue member of its
  // corpus" enumeration is not compact — corpus 'e' (Gospels) alone has 4365
  // catalogued manuscripts x 3779 Gospel verses = ~16.5M entries. Since a
  // catalogue-level ("c") hit is, by construction, the *same* claim (this
  // manuscript's corpus classification includes this verse's book) repeated
  // near-identically for almost every verse in the corpus, the per-verse
  // "verses" listing below is bounded to: (a) real NTVMR page-verified hits
  // (any manuscript), plus (b) catalogue-level hits for the priority subset
  // (pre-900 AD + the 25 featured manuscripts) — the manuscripts a reader
  // actually cares about seeing named at a given verse. The FULL catalogue
  // count for the verse's whole corpus (every classified manuscript, not just
  // the priority subset) is preserved losslessly in summary.json's `count`,
  // so "how many manuscripts total" stays accurate even though the per-verse
  // listing itself only names the priority ones.
  // ---------------------------------------------------------------------------
  const priorityGA = new Set(priority.map((r) => r.ga));
  const catalogByGA = new Map(catalog.map((r) => [r.ga, r]));
  const summary = {}; // "BOOK.c:v" -> [count, oldestGA, oldestCentury]
  let totalVerses = 0;
  let totalPageVerified = 0;

  for (const book of NT_BOOKS) {
    const roster = byCorpus[book.corpus]; // full catalogue roster for this book's corpus, oldest first
    const fullCount = roster.length;
    const oldestRosterGA = roster.length ? roster[0].ga : null;
    const oldestRosterC0 = roster.length && roster[0].c0 != null ? roster[0].c0 : null;

    const verses = {};
    for (let c = 1; c <= book.verses.length; c++) {
      const n = book.verses[c - 1];
      for (let v = 1; v <= n; v++) {
        const key = `${c}:${v}`;
        const hits = [];
        const seen = new Set();
        // Page-verified hits first (any manuscript found via NTVMR).
        let oldestHitC0 = Infinity;
        let oldestHitGA = null;
        for (const [ga, idx] of pageIndex) {
          const pageId = idx.get(key);
          if (pageId !== undefined) {
            hits.push([ga, pageId]);
            seen.add(ga);
            totalPageVerified++;
            const row = catalogByGA.get(ga);
            const c0 = row && row.c0 != null ? row.c0 : Infinity;
            if (c0 < oldestHitC0) {
              oldestHitC0 = c0;
              oldestHitGA = ga;
            }
          }
        }
        // Catalogue-level fallback, priority subset only (see sizing note above).
        for (const row of roster) {
          if (seen.has(row.ga) || !priorityGA.has(row.ga)) continue;
          hits.push([row.ga, null, 'c']);
        }
        verses[key] = hits;
        totalVerses++;

        // Oldest witness for this verse: prefer an actual page-verified hit;
        // otherwise fall back to the oldest manuscript in the whole catalogue
        // roster for this corpus (accurate even though not individually listed).
        const oldestGA = Number.isFinite(oldestHitC0) ? oldestHitGA : oldestRosterGA;
        const oldestC0 = Number.isFinite(oldestHitC0) ? oldestHitC0 : oldestRosterC0;
        summary[`${book.id}.${key}`] = [fullCount, oldestGA, oldestC0];
      }
    }
    const basis = pageIndex.size > 0 ? 'ntvmr-index' : 'catalog-contents';
    const payload = { book: book.id, basis, verses };
    await writeFile(path.join(OUT_DIR, `${book.id}.json`), JSON.stringify(payload));
    log(`Wrote coverage/${book.id}.json (${Object.keys(verses).length} verses, basis=${basis}, corpus roster=${fullCount})`);
  }

  await writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary));
  log(`Wrote coverage/summary.json (${Object.keys(summary).length} verse entries)`);
  log(
    `Totals: ${totalVerses} verse-slots, ${totalPageVerified} page-verified hits, phaseBAttempted=${phaseBAttempted}, phaseBHits(manuscripts)=${phaseBHits}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
