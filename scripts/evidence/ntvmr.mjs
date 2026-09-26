// scripts/evidence/ntvmr.mjs
//
// Shared, best-effort client for the INTF New Testament Virtual Manuscript Room
// (ntvmr.uni-muenster.de) API, used by both build-coverage.mjs (page-level verse
// index per manuscript) and build-transcriptions.mjs (TEI transcript per page).
//
// Confirmed so far (from real CI runs against ntvmr.uni-muenster.de; see the
// job log of the "Build coverage"/"Build transcriptions" steps):
//   - /community/vmr/api/ is browsable (Apache autoindex) and lists subdirs:
//     auth, biblicalcontent, bibliography, collate, documentgroup, feature,
//     forum, image, integrations, log, metadata, preferences,
//     projectmanagement, projects, regularization, secrets, statistics,
//     style, transcript, variant.
//   - GET .../api/metadata/liste/search/?docID=P52&format=json returns HTTP 200
//     with real JSON: {"status":"success","data":{"manuscripts":{"pagecount":0,"count":0}}}
//     — i.e. the route exists and is a search-with-pagination endpoint, but
//     "docID=P52" matched zero manuscripts (wrong param name, wrong value
//     shape, or both — not yet confirmed which).
//   - .../api/metadata/liste/search/?GAno=P52&format=json returns HTTP 400
//     (the route exists and validates "GAno" but rejects this value/shape).
//   - .../api/liste/*, .../api/metadata/manuscript/* all 404 (wrong paths).
//
// discover() below both logs directory listings (to find the real route names
// under metadata/ and transcript/) and probes a wide parameter-name x value
// grid against the one confirmed-live search route, logging full status+body
// for every attempt (never throwing) so a human reading the CI log — or a
// later edit here — can pin down the right shape without guessing blind.

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

function extractAutoindexEntries(html) {
  const out = [];
  const re = /<a href="([^"]+)"><tt>([^<]+)<\/tt><\/a>/g;
  let m;
  while ((m = re.exec(html))) out.push({ href: m[1], name: m[2] });
  return out;
}

async function logDir(relPath) {
  const url = `${NTVMR_BASE}${relPath}`;
  const r = await rawGet(url);
  if (!r.ok) {
    console.log(`  [dir] ${relPath} -> HTTP ${r.status ?? 'ERR'} ${r.error ?? ''}`);
    return [];
  }
  const entries = extractAutoindexEntries(r.text);
  console.log(`  [dir] ${relPath} -> ${entries.length} entries: ${entries.map((e) => e.name).join(', ')}`);
  return entries;
}

const SEARCH_URL = `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/`;

async function probeSearchGrid(sampleGA) {
  const bareNum = sampleGA.replace(/^[Pl]/i, '');
  const paramSets = [
    { docID: sampleGA },
    { docID: bareNum },
    { GAno: bareNum },
    { GAno: sampleGA },
    { ga: sampleGA },
    { ga: bareNum },
    { list: sampleGA },
    { listNr: bareNum },
    { liste: bareNum },
    { gregoryAland: sampleGA },
    { q: sampleGA },
    { search: sampleGA },
    {}, // unfiltered, to see baseline count
  ];
  const results = [];
  for (const params of paramSets) {
    const qs = new URLSearchParams({ ...params, format: 'json' }).toString();
    const url = `${SEARCH_URL}?${qs}`;
    const r = await rawGet(url);
    console.log(`  [grid] ${qs} -> HTTP ${r.status ?? 'ERR'}${r.error ? ' ' + r.error : ''}`);
    if (r.text) console.log(`    body: ${r.text.slice(0, 500)}`);
    results.push({ params, ...r });
    await sleepMs(350);
  }
  return results;
}

/** Fetch a route's own auto-generated help page: calling it with ONLY format=json and no
 * recognized filter param returns its usage/parameter-table HTML (confirmed for
 * metadata/liste/search/ in a real CI run). Logged in full (not truncated) so the real
 * parameter set can be read straight from the CI log. */
async function logHelp(url, label) {
  const r = await rawGet(`${url}?format=json`);
  console.log(`--- help for ${label} (${url}) -> HTTP ${r.status ?? 'ERR'} ---`);
  if (r.text) console.log(r.text);
  await sleepMs(350);
}

async function probeIndexContent(osisRefs) {
  for (const ref of osisRefs) {
    const url = `${SEARCH_URL}?${new URLSearchParams({ indexContent: ref, format: 'json' })}`;
    const r = await rawGet(url, { timeoutMs: 25000 });
    console.log(`  [indexContent=${ref}] -> HTTP ${r.status ?? 'ERR'}${r.error ? ' ' + r.error : ''}`);
    if (r.text) console.log(`    body (first 4000 chars): ${r.text.slice(0, 4000)}`);
    await sleepMs(400);
  }
}

/**
 * Runs discovery: logs directory listings under api/metadata/ and
 * api/transcript/, then probes a parameter grid against the one confirmed-live
 * search route. Always returns null (no auto-wired parser yet — see
 * CONFIRMED_SHAPE) unless CONFIRMED_SHAPE is set, in which case that is
 * returned directly without re-probing.
 */
export async function discover(sampleGA = 'P52') {
  if (CONFIRMED_SHAPE) {
    console.log('[ntvmr] Using CONFIRMED_SHAPE (skipping discovery probe).');
    return CONFIRMED_SHAPE;
  }
  console.log('--- NTVMR discovery: help pages (own usage/parameter docs) ---');
  await logHelp(SEARCH_URL, 'metadata/liste/search');
  await logHelp(`${NTVMR_BASE}/community/vmr/api/transcript/get/`, 'transcript/get');
  await logHelp(`${NTVMR_BASE}/community/vmr/api/transcript/show/`, 'transcript/show');
  await logHelp(`${NTVMR_BASE}/community/vmr/api/transcript/search/`, 'transcript/search');
  await logHelp(`${NTVMR_BASE}/community/vmr/api/transcript/export/`, 'transcript/export');

  console.log('--- NTVMR discovery: indexContent (per-verse) search — the real "index-content search" ---');
  // Confirmed working param names so far: indexContent (OSIS ref, e.g. "John.1.1"), format.
  // docID takes a bare internal numeric id (NOT the GA number itself — docID=52 matched 11
  // manuscripts/51 pages, so "52" is not P52's own id). GAno/ga/list/listNr/liste/q/search all
  // 400 "invalid parameter": the route validates against a strict allow-list.
  await probeIndexContent(['John.18.31', 'John.1.1']);

  console.log('[ntvmr] No verified parser wired yet (see help/indexContent output above). Falling back to catalogue-level coverage this run.');
  console.log('[ntvmr] ACTION: once the log shows indexContent\'s real response shape (does it carry docID/pageID per hit?),');
  console.log('[ntvmr] set CONFIRMED_SHAPE in scripts/evidence/ntvmr.mjs to a real implementation and re-run.');
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

export const _internal = { rawGet, extractAutoindexEntries, probeSearchGrid };
