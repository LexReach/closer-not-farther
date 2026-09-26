// scripts/evidence/ntvmr.mjs
//
// Shared, best-effort client for the INTF New Testament Virtual Manuscript Room
// (ntvmr.uni-muenster.de) API, used by both build-coverage.mjs (page-level verse
// index per manuscript) and build-transcriptions.mjs (TEI transcript per page).
//
// This sandbox has no network access to ntvmr.uni-muenster.de, so the exact
// endpoint shapes below are *candidates*, not verified contracts. discover()
// is meant to be run once per CI job: it probes every candidate against a
// known real manuscript (P52, GA 52... i.e. papyrus 52) and logs the full
// response of anything that doesn't error, so a human (or a later edit here)
// can read the CI log and wire up a real parser. Once a shape is confirmed
// working, set CONFIRMED_SHAPE below instead of relying on live discovery.

import { cachedFetchText, sleepMs } from './lib.mjs';

export const NTVMR_BASE = 'https://ntvmr.uni-muenster.de';
export const NTVMR_TERMS_CANDIDATES = [
  `${NTVMR_BASE}/community/vmr/api/`,
  `${NTVMR_BASE}/community/vmr/`,
  `${NTVMR_BASE}/`,
];

/**
 * If a previous CI run (see its job log) confirmed a working endpoint shape,
 * fill this in and discover()/fetchPageIndex()/fetchTranscript() below will
 * use it directly instead of re-probing candidates every run. Left null until
 * verified against a real response.
 */
export const CONFIRMED_SHAPE = null;

export function gaToNtvmrQuery(ga) {
  if (ga.startsWith('P')) return ga; // "P52"
  if (ga.startsWith('l')) return `L${ga.slice(1)}`; // "l150" -> "L150"
  return ga; // majuscule "01"/"032", minuscule "33"
}

const DOC_ID_CANDIDATES = (q) => [
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/?docID=${encodeURIComponent(q)}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/liste/search/?docID=${encodeURIComponent(q)}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/liste/liste.php?docID=${encodeURIComponent(q)}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/?GAno=${encodeURIComponent(q)}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/manuscript/search/?GAno=${encodeURIComponent(q)}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/liste/liste.php?ga=${encodeURIComponent(q)}`, kind: 'xml-or-html' },
];

const PAGE_INDEX_CANDIDATES = (docId) => [
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/?docID=${docId}&detail=page&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/?docID=${docId}&indexContent=true&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/transcript/list/?docID=${docId}&format=json`, kind: 'json' },
  { url: `${NTVMR_BASE}/community/vmr/api/pagelist/get/?docID=${docId}&format=json`, kind: 'json' },
];

const TRANSCRIPT_CANDIDATES = (pageId) => [
  { url: `${NTVMR_BASE}/community/vmr/api/transcript/get/?pageID=${pageId}&format=teiraw`, kind: 'xml' },
  { url: `${NTVMR_BASE}/community/vmr/api/transcript/get_transcript.php?pageID=${pageId}&format=teiraw`, kind: 'xml' },
  { url: `${NTVMR_BASE}/community/vmr/api/transcript/transcript.php?pageID=${pageId}&type=tei`, kind: 'xml' },
];

async function probeAll(candidates, label) {
  const out = [];
  for (const c of candidates) {
    try {
      const text = await cachedFetchText(c.url, { label: c.url, timeoutMs: 20000, retries: 1 });
      const looksEmpty = !text || text.length < 5 || /^\s*(\[\]|\{\}|null)\s*$/i.test(text.trim());
      console.log(`  [ntvmr-discover:${label}] OK${looksEmpty ? ' (empty-looking)' : ''} ${c.url}`);
      console.log(`    -> ${text.slice(0, 500).replace(/\s+/g, ' ')}`);
      out.push({ ...c, ok: true, empty: looksEmpty, text });
    } catch (err) {
      console.log(`  [ntvmr-discover:${label}] FAIL ${c.url} :: ${err.message}`);
      out.push({ ...c, ok: false, error: err.message });
    }
    await sleepMs(400);
  }
  return out;
}

/**
 * Runs discovery probes for a sample GA number and logs everything. Returns
 * null (no working shape identified) unless CONFIRMED_SHAPE is set, in which
 * case that is validated live against the sample and returned as-is on success.
 */
export async function discover(sampleGA = 'P52') {
  if (CONFIRMED_SHAPE) {
    console.log('[ntvmr] Using CONFIRMED_SHAPE (skipping full discovery probe).');
    return CONFIRMED_SHAPE;
  }
  console.log(`--- NTVMR discovery: docID lookup candidates for ${sampleGA} ---`);
  const q = gaToNtvmrQuery(sampleGA);
  const docIdResults = await probeAll(DOC_ID_CANDIDATES(q), 'docId');
  const workingDocId = docIdResults.find((r) => r.ok && !r.empty);
  if (!workingDocId) {
    console.log('[ntvmr] No docID-lookup candidate returned a non-empty response. Not attempting page-index/transcript probes.');
    return null;
  }
  console.log(`[ntvmr] Candidate docID endpoint responded: ${workingDocId.url}`);
  console.log('[ntvmr] No verified parser exists yet for this response shape (never observed before this run).');
  console.log('[ntvmr] ACTION: read the CI log line above, update scripts/evidence/ntvmr.mjs\'s CONFIRMED_SHAPE with a real');
  console.log('[ntvmr] parseDocId/pagesUrl/parsePageIndex implementation matching the actual JSON/XML shape, then re-run.');
  return null;
}

/** Best-effort: Map<"c:v","pageId"> for one manuscript, or null. Requires a confirmed shape. */
export async function fetchPageIndex(ga, shape) {
  if (!shape) return null;
  const q = gaToNtvmrQuery(ga);
  const searchText = await cachedFetchText(shape.docIdUrl(q), { label: `docid:${ga}`, timeoutMs: 20000, retries: 1 });
  const docId = shape.parseDocId(searchText);
  if (!docId) return null;
  const pagesText = await cachedFetchText(shape.pagesUrl(docId), { label: `pages:${ga}`, timeoutMs: 20000, retries: 1 });
  return shape.parsePageIndex(pagesText);
}

/** Best-effort: raw TEI text for one page, or null. Requires a confirmed shape. */
export async function fetchTranscriptRaw(pageId, shape) {
  if (!shape) return null;
  return cachedFetchText(shape.transcriptUrl(pageId), { label: `transcript:${pageId}`, timeoutMs: 20000, retries: 1 });
}

export const _internal = { DOC_ID_CANDIDATES, PAGE_INDEX_CANDIDATES, TRANSCRIPT_CANDIDATES, probeAll };
