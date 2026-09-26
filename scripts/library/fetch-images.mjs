#!/usr/bin/env node
/**
 * fetch-images.mjs
 *
 * Reads data/library/catalog.json (written by fetch-catalog.mjs) and builds
 * data/library/images.json: one entry per manuscript for which we found a usable
 * deep-zoom (IIIF) image service, or failing that a Commons image we can thumbnail
 * and open as a plain (non-tiled) image in OpenSeadragon.
 *
 * Usage:
 *   node scripts/library/fetch-images.mjs
 *
 * Requires network access (Wikimedia Commons API + assorted IIIF hosts), so in
 * practice this only runs inside the fetch-library.yml GitHub Actions workflow.
 *
 * Strategy, per catalog row, in priority order:
 *   1. row.iiif (a IIIF manifest URL harvested from Wikidata P6108) - fetch it,
 *      take the first canvas's image service.
 *   2. Vatican Library (DigiVatLib) shelfmark pattern guess, e.g. "Vat. gr. 1209"
 *      -> https://digi.vatlib.it/iiif/MSS_Vat.gr.1209/manifest.json
 *   3. A short hand-verified list of other institutional IIIF endpoints for a
 *      handful of especially famous manuscripts (Cambridge Digital Library,
 *      e-codices / Fondation Bodmer, ...).
 *   4. Commons (row.commons: either a bare file name from Wikidata P18, or
 *      "Category:X" from Wikidata P373) - record file name + license + size for
 *      a thumbnail/simple-image view.
 * Manifests that fail to fetch or don't yield a recognizable canvas are dropped
 * (never included with placeholder/guessed dimensions).
 *
 * Sources:
 *   - Wikidata P6108 IIIF manifests (already resolved into catalog.json)
 *   - Vatican Library DigiVatLib, https://digi.vatlib.it
 *   - Wikimedia Commons API, https://commons.wikimedia.org/w/api.php
 *   - A few named institutional IIIF endpoints, see HARDCODED_IIIF below.
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchJSON, runPool } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'library');

const log = [];
function note(msg) {
  console.log(msg);
  log.push(msg);
}

// ---------------------------------------------------------------------------
// Institution-specific manifest guessers
// ---------------------------------------------------------------------------

const VATICAN_FONDI = /^(Vat|Pal|Barb|Ottob|Urb|Reg|Chig|Ross|Borg|Capp|Sbath)\.?\s?/i;

function vaticanManifestGuess(shelf) {
  if (!shelf) return null;
  let s = shelf.trim();
  if (!VATICAN_FONDI.test(s)) return null;
  // Strip trailing folio/page-range annotations some Wikipedia shelfmarks carry,
  // e.g. "Vat. gr. 647, ff. 155-338" or "Vat. gr. 1 (fol. 1r-2v)" -> the
  // DigiVatLib manifest id is keyed on the bare shelfmark, not the range.
  s = s.replace(/[,(]?\s*(?:ff?|fol(?:io)?s?)\.?\s*\d+[a-z]?(?:[-–]\d+[a-z]?)?\)?\s*$/i, '').trim();
  s = s.replace(/,\s*$/, '').trim();
  const compact = s.replace(/\s+/g, '');
  if (!compact) return null;
  return `https://digi.vatlib.it/iiif/MSS_${compact}/manifest.json`;
}

// Hand-picked, individually verified (in CI - unreachable candidates are dropped
// automatically) IIIF manifests for a few famous manuscripts not otherwise covered.
const HARDCODED_IIIF = {
  P66: 'https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json',
  '05': 'https://cudl.lib.cam.ac.uk/iiif/MS-NN-00002-00041/manifest',
};

// ---------------------------------------------------------------------------
// IIIF manifest parsing (v2 and v3)
// ---------------------------------------------------------------------------

function langMapFirst(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length ? langMapFirst(value[0]) : null;
  if (typeof value === 'object') {
    const vals = value.en ?? value.none ?? Object.values(value)[0];
    return langMapFirst(vals);
  }
  return null;
}

function extractCanvasService(manifest) {
  // IIIF Presentation API v3
  if (Array.isArray(manifest.items)) {
    const canvas = manifest.items.find((c) => c?.type === 'Canvas') ?? manifest.items[0];
    if (canvas) {
      const w = canvas.width ?? null;
      const h = canvas.height ?? null;
      const anno = canvas.items?.[0]?.items?.[0];
      let bodies = anno?.body;
      bodies = Array.isArray(bodies) ? bodies : bodies ? [bodies] : [];
      for (const b of bodies) {
        let services = b?.service;
        services = Array.isArray(services) ? services : services ? [services] : [];
        for (const svc of services) {
          const id = svc?.id || svc?.['@id'];
          if (id) return { service: id.replace(/\/info\.json$/, ''), w, h };
        }
        const bid = b?.id;
        if (bid) {
          const m = bid.match(/^(.*)\/full\/(?:full|max)\/0\/default\.\w+$/);
          if (m) return { service: m[1], w, h };
        }
      }
    }
  }
  // IIIF Presentation API v2
  if (Array.isArray(manifest.sequences)) {
    const canvas = manifest.sequences[0]?.canvases?.[0];
    if (canvas) {
      const w = canvas.width ?? null;
      const h = canvas.height ?? null;
      const image = canvas.images?.[0];
      let service = image?.resource?.service;
      service = Array.isArray(service) ? service[0] : service;
      const id = service?.['@id'] || service?.id;
      if (id) return { service: id.replace(/\/info\.json$/, ''), w, h };
    }
  }
  return null;
}

function extractManifestMeta(manifest) {
  const label = langMapFirst(manifest.label);
  const rights = typeof manifest.rights === 'string' ? manifest.rights : typeof manifest.license === 'string' ? manifest.license : null;
  const attribution = manifest.requiredStatement?.value
    ? langMapFirst(manifest.requiredStatement.value)
    : manifest.attribution
      ? langMapFirst(manifest.attribution)
      : null;
  return { label, rights: rights ?? attribution ?? null };
}

async function tryManifest(url) {
  const json = await fetchJSON(url, { timeoutMs: 30000, retries: 4, label: `manifest ${url}` });
  const canvasInfo = extractCanvasService(json);
  if (!canvasInfo?.service) return null;
  const meta = extractManifestMeta(json);
  return {
    kind: 'iiif',
    service: canvasInfo.service,
    w: canvasInfo.w,
    h: canvasInfo.h,
    manifest: url,
    label: meta.label,
    rights: meta.rights,
  };
}

// ---------------------------------------------------------------------------
// Commons fallback
// ---------------------------------------------------------------------------

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

function stripHtml(s) {
  if (!s) return null;
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
}

async function resolveCommonsCategory(catName) {
  const url = `${COMMONS_API}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(`Category:${catName}`)}&cmtype=file&cmlimit=5&format=json`;
  const json = await fetchJSON(url, { timeoutMs: 20000, retries: 3, label: `commons category ${catName}` });
  const members = json.query?.categorymembers ?? [];
  return members[0]?.title ?? null;
}

async function fetchCommonsInfo(fileTitle) {
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
  const url = `${COMMONS_API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json`;
  const json = await fetchJSON(url, { timeoutMs: 20000, retries: 3, label: `commons imageinfo ${title}` });
  const pages = json.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    kind: 'commons',
    file: title.replace(/^File:/, ''),
    w: info.width ?? null,
    h: info.height ?? null,
    license: meta.LicenseShortName?.value ?? null,
    credit: stripHtml(meta.Artist?.value) ?? stripHtml(meta.Credit?.value) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const catalogPath = path.join(OUT_DIR, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const fields = catalog.fields;
  const idx = Object.fromEntries(fields.map((f, i) => [f, i]));
  const rows = catalog.rows.map((r) => ({
    ga: r[idx.ga],
    cat: r[idx.cat],
    inst: r[idx.inst],
    shelf: r[idx.shelf],
    commons: r[idx.commons],
    iiif: r[idx.iiif],
  }));
  note(`Loaded ${rows.length} catalog rows from ${catalogPath}`);

  const items = {};
  const byInstitution = {};
  let iiifCount = 0;
  let commonsCount = 0;
  let iiifTried = 0;
  let iiifFailed = 0;

  // --- Phase 1: manifest candidates (Wikidata P6108, Vatican guess, hardcoded) ---
  const manifestCandidates = [];
  for (const r of rows) {
    const candidates = [];
    if (r.iiif) candidates.push(r.iiif);
    const vatGuess = vaticanManifestGuess(r.shelf);
    if (vatGuess && !candidates.includes(vatGuess)) candidates.push(vatGuess);
    if (HARDCODED_IIIF[r.ga] && !candidates.includes(HARDCODED_IIIF[r.ga])) candidates.push(HARDCODED_IIIF[r.ga]);
    if (candidates.length) manifestCandidates.push({ row: r, candidates });
  }
  note(`Manifest candidates to try: ${manifestCandidates.length}`);

  await runPool(
    manifestCandidates,
    async ({ row, candidates }) => {
      for (const url of candidates) {
        iiifTried++;
        try {
          const result = await tryManifest(url);
          if (result) {
            items[row.ga] = {
              ...result,
              institution: row.inst ?? null,
              link: null,
            };
            iiifCount++;
            const instKey = row.inst || new URL(url).hostname;
            byInstitution[instKey] = (byInstitution[instKey] ?? 0) + 1;
            return;
          }
          iiifFailed++;
          note(`  [${row.ga}] manifest had no usable canvas: ${url}`);
        } catch (err) {
          iiifFailed++;
          note(`  [${row.ga}] manifest failed: ${url} (${err.message})`);
        }
      }
    },
    {
      concurrency: 4,
      delayMs: 150,
      onError: (item, err) => note(`  [${item.row.ga}] unexpected error: ${err.message}`),
    },
  );
  note(`Phase 1 done: ${iiifCount} IIIF services resolved, ${iiifFailed}/${iiifTried} attempts failed.`);

  // --- Phase 2: Commons fallback for everything still unresolved ---
  const commonsCandidates = rows.filter((r) => !items[r.ga] && r.commons);
  note(`Commons candidates to try: ${commonsCandidates.length}`);

  await runPool(
    commonsCandidates,
    async (row) => {
      let fileTitle = row.commons;
      if (fileTitle.startsWith('Category:')) {
        const catName = fileTitle.replace(/^Category:/, '');
        const resolved = await resolveCommonsCategory(catName);
        if (!resolved) {
          note(`  [${row.ga}] Commons category "${catName}" had no file members.`);
          return;
        }
        fileTitle = resolved;
      }
      const info = await fetchCommonsInfo(fileTitle);
      if (!info) {
        note(`  [${row.ga}] Commons imageinfo lookup failed for ${fileTitle}`);
        return;
      }
      items[row.ga] = { ...info, institution: row.inst ?? null };
      commonsCount++;
    },
    {
      concurrency: 3,
      delayMs: 300,
      onError: (row, err) => note(`  [${row.ga}] Commons error: ${err.message}`),
    },
  );
  note(`Phase 2 done: ${commonsCount} Commons images resolved.`);

  const images = {
    generated: new Date().toISOString(),
    sources: [
      'Wikidata P6108 IIIF manifest URLs (see catalog.json)',
      'Vatican Library DigiVatLib, https://digi.vatlib.it (shelfmark-pattern manifest guess, verified live)',
      'Cambridge Digital Library, https://cudl.lib.cam.ac.uk',
      'e-codices / Fondation Martin Bodmer, https://www.e-codices.unifr.ch',
      'Wikimedia Commons API, https://commons.wikimedia.org/w/api.php (imageinfo + extmetadata)',
    ],
    counts: {
      iiif: iiifCount,
      commons: commonsCount,
      total: iiifCount + commonsCount,
      byInstitution,
    },
    items,
  };

  await writeFile(path.join(OUT_DIR, 'images.json'), JSON.stringify(images));
  note(`Wrote images.json: ${images.counts.total} openable images (${iiifCount} IIIF, ${commonsCount} Commons).`);

  const logMd = [
    '',
    '## Image fetch log',
    '',
    `Generated: ${images.generated}`,
    '',
    `- IIIF resolved: ${iiifCount} (attempts: ${iiifTried}, failed: ${iiifFailed})`,
    `- Commons resolved: ${commonsCount} (candidates: ${commonsCandidates.length})`,
    `- Total openable: ${images.counts.total}`,
    '- By institution:',
    ...Object.entries(byInstitution)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `  - ${k}: ${v}`),
    '',
    '### Run log',
    '',
    '```',
    ...log,
    '```',
    '',
  ].join('\n');

  await appendFile(path.join(OUT_DIR, 'fetch-log.md'), logMd);
  note('Appended image fetch results to fetch-log.md');

  if (images.counts.total < 200) {
    note(`WARNING: total openable images (${images.counts.total}) below the 200 target.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
