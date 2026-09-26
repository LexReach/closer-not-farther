// scripts/evidence/ntvmr.mjs
//
// Shared, best-effort client for the INTF New Testament Virtual Manuscript Room
// (ntvmr.uni-muenster.de) API, used by both build-coverage.mjs (page-level verse
// index per manuscript) and build-transcriptions.mjs (TEI transcript per page).
//
// Confirmed so far (from real CI runs; see the job log history of the
// "Build coverage"/"Build transcriptions" workflow steps for the full record):
//   - /community/vmr/api/ subdirs include metadata/{liste,manuscript,institute,...}
//     and transcript/{get,show,search,export,...}.
//   - metadata/liste/search/ is a real, documented search route (calling it with
//     no recognized param returns its own HTML parameter-table help). Confirmed
//     parameters: indexContent (OSIS ref, e.g. "John.1.1", "John.1", "John",
//     "Matt-John" — results must contain part of the given verse(s)), gaNum
//     (the real GA siglum, e.g. "P46" — NOT docID, which is an unrelated
//     internal numeric id space), detail ((count)|document|shelfInstance|page),
//     format ((xml)|json|csv|...), limit (approx. max PAGES to return; 0 or
//     empty = unlimited, a started document always completes even past it).
//     Any unrecognized param name is a strict HTTP 400 "{name} invalid parameter".
//   - transcript/get/ takes docID OR gaNum, indexContent, fullPage, and
//     format=tei|teiraw|htmlfragment|html|plaintext|... — a real per-manuscript
//     transcript fetch, scoped to a book/chapter/verse via indexContent.
//
// discover() probes the one still-unconfirmed detail: detail=page's actual
// JSON field names (for the page id / verse range / gaNum in each result row),
// at small scale, logging full status+body so a later edit here can pin down
// CONFIRMED_SHAPE without guessing blind.

import { cachedFetchText, sleepMs, USER_AGENT } from './lib.mjs';

export const NTVMR_BASE = 'https://ntvmr.uni-muenster.de';

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

/** GET without throwing on non-2xx; returns {ok,status,text} or {ok:false,error}. Single attempt (discovery is cheap/disposable). */
async function rawGet(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

const SEARCH_URL = `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/`;

/**
 * Probes detail=page's JSON field names at small scale. Always returns null
 * (no auto-wired parser yet — see CONFIRMED_SHAPE) unless CONFIRMED_SHAPE is
 * set, in which case that is returned directly without re-probing.
 */
export async function discover(sampleGA = 'P52') {
  if (CONFIRMED_SHAPE) {
    console.log('[ntvmr] Using CONFIRMED_SHAPE (skipping discovery probe).');
    return CONFIRMED_SHAPE;
  }
  // Confirmed via metadata/liste/search's own help page (already fully logged in an earlier
  // CI run, see git history of this file): indexContent (OSIS ref, e.g. "John.1.1", "John.1",
  // "John", "Matt-John"), gaNum (real GA siglum, e.g. "P46" — NOT docID, an unrelated internal
  // numeric id), detail ((count)|document|shelfInstance|page), format ((xml)|json|...), limit
  // (0/empty = unlimited). Only the exact field NAMES inside a detail=page JSON body remain
  // unconfirmed — probe that now, at small scale, before wiring a real parser.
  console.log('--- NTVMR discovery: detail=page JSON shape (small-scale probes) ---');
  for (const url of [
    `${SEARCH_URL}?${new URLSearchParams({ indexContent: 'John.18.31', detail: 'page', format: 'json' })}`,
    `${SEARCH_URL}?${new URLSearchParams({ gaNum: 'P52', detail: 'page', format: 'json' })}`,
    `${SEARCH_URL}?${new URLSearchParams({ gaNum: '01', detail: 'page', format: 'json', limit: '5' })}`,
  ]) {
    const r = await rawGet(url, { timeoutMs: 25000 });
    console.log(`  [shape-probe] ${url} -> HTTP ${r.status ?? 'ERR'}${r.error ? ' ' + r.error : ''}`);
    if (r.text) console.log(`    body: ${r.text}`);
    await sleepMs(500);
  }

  console.log('[ntvmr] No verified parser wired yet (see shape-probe output above). Falling back to catalogue-level coverage this run.');
  console.log('[ntvmr] ACTION: once the log shows detail=page\'s real field names, set CONFIRMED_SHAPE in');
  console.log('[ntvmr] scripts/evidence/ntvmr.mjs to a real implementation and re-run.');
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

export const _internal = { rawGet, SEARCH_URL };
