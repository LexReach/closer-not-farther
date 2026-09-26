#!/usr/bin/env node
/**
 * finalize-docs.mjs
 *
 * Runs last in the workflow. Two jobs:
 *   1. Best-effort fetch of NTVMR's stated terms of use (tried against a
 *      handful of likely URLs on ntvmr.uni-muenster.de) and log the full text
 *      verbatim, so it can be copied into SOURCES.md by hand once confirmed.
 *   2. Recompute real counts from whatever data/evidence/* this run actually
 *      produced (coverage page-verified vs catalogue-level verses,
 *      transcribed manuscripts/pages, apparatus verse count) and rewrite
 *      data/evidence/README.md's counts section accordingly.
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchText } from './lib.mjs';
import { NTVMR_BASE } from './ntvmr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const EVIDENCE_DIR = path.join(ROOT, 'data', 'evidence');

function log(...a) {
  console.log(...a);
}

async function tryFetchTerms() {
  const candidates = [
    `${NTVMR_BASE}/community/vmr/api/`,
    `${NTVMR_BASE}/community/vmr/`,
    `${NTVMR_BASE}/community/`,
    `${NTVMR_BASE}/`,
    `${NTVMR_BASE}/community/vmr/impressum.php`,
    `${NTVMR_BASE}/community/vmr/imprint.php`,
  ];
  for (const url of candidates) {
    try {
      const text = await fetchText(url, { label: url, timeoutMs: 20000, retries: 1 });
      log(`--- NTVMR page fetched: ${url} (${text.length} bytes) ---`);
      log(text.slice(0, 6000));
      log('--- end of fetched page ---');
    } catch (err) {
      log(`  terms candidate FAIL ${url} :: ${err.message}`);
    }
  }
}

async function safeCount(dir, pattern) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => (pattern ? pattern.test(e.name) : true)).length;
  } catch {
    return 0;
  }
}

async function main() {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  log('=== Attempting to fetch NTVMR terms-of-use text (for SOURCES.md, quoted verbatim once confirmed) ===');
  await tryFetchTerms();

  // --- coverage stats ---
  let coveragePageVerified = 0;
  let coverageCatalogueOnly = 0;
  let booksWithCoverage = 0;
  try {
    const coverageDir = path.join(EVIDENCE_DIR, 'coverage');
    const files = (await readdir(coverageDir)).filter((f) => f.endsWith('.json') && f !== 'summary.json');
    booksWithCoverage = files.length;
    for (const f of files) {
      const data = JSON.parse(await readFile(path.join(coverageDir, f), 'utf8'));
      for (const hits of Object.values(data.verses || {})) {
        for (const h of hits) {
          if (h[2] === 'c') coverageCatalogueOnly++;
          else coveragePageVerified++;
        }
      }
    }
  } catch (err) {
    log(`coverage stats: ${err.message}`);
  }

  // --- transcription stats ---
  let transcriptManuscripts = 0;
  let transcriptPages = 0;
  try {
    const dir = path.join(EVIDENCE_DIR, 'transcriptions');
    const gas = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory());
    transcriptManuscripts = gas.length;
    for (const g of gas) {
      transcriptPages += await safeCount(path.join(dir, g.name), /\.json$/);
    }
  } catch (err) {
    log(`transcription stats: ${err.message}`);
  }

  // --- apparatus stats ---
  let apparatusVerses = 0;
  let apparatusBooks = 0;
  try {
    const dir = path.join(EVIDENCE_DIR, 'apparatus');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    apparatusBooks = files.length;
    for (const f of files) {
      const data = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
      apparatusVerses += Object.keys(data).length;
    }
  } catch (err) {
    log(`apparatus stats: ${err.message}`);
  }

  const generated = new Date().toISOString();
  const readme = `# data/evidence

Manuscript-evidence data for every New Testament verse, built by \`.github/workflows/data-evidence.yml\`
running scripts in \`scripts/evidence/\`. See SOURCES.md for provenance/licensing per dataset.

Generated: ${generated}

## Coverage (\`coverage/<BOOK>.json\`, \`coverage/summary.json\`)

- Books with a coverage file: ${booksWithCoverage} / 27
- Page-verified hits listed (real NTVMR page-level index): ${coveragePageVerified}
- Catalogue-level hits listed (fallback, marked \`"c"\`, priority manuscripts only — see the
  sizing note in \`scripts/evidence/build-coverage.mjs\`): ${coverageCatalogueOnly}
- \`summary.json\`'s per-verse \`count\` reflects the FULL catalogue roster for that verse's
  corpus (every classified manuscript in data/library/catalog.json), not just the manuscripts
  individually listed in the per-book file.

## Transcriptions (\`transcriptions/<GA>/<pageId>.json\`)

- Manuscripts with at least one transcribed page: ${transcriptManuscripts}
- Total transcribed pages: ${transcriptPages}

## Apparatus (\`apparatus/<BOOK>.json\`)

- Books with apparatus entries: ${apparatusBooks}
- Total verses with at least one apparatus entry: ${apparatusVerses}

## Witness tiers (\`witness-tiers.json\`)

Hand-compiled from general knowledge of the NA28 introduction (not fetched — the NA28
introduction is a copyrighted print volume). Conservative and partial; see the file's own
\`_note\` field.
`;

  await writeFile(path.join(EVIDENCE_DIR, 'README.md'), readme);
  log('Wrote data/evidence/README.md');
  log(
    `Final counts: coverage page-verified=${coveragePageVerified}, catalogue-only=${coverageCatalogueOnly}, ` +
      `transcripts=${transcriptManuscripts} mss / ${transcriptPages} pages, apparatus=${apparatusVerses} verses.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
