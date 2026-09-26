// scripts/evidence/ntvmr.mjs
//
// Client for the INTF New Testament Virtual Manuscript Room (ntvmr.uni-muenster.de)
// API, used by both build-coverage.mjs (page-level verse index) and
// build-transcriptions.mjs (TEI transcript per page).
//
// Confirmed against real CI runs (see this file's git history for the discovery
// trail — directory listings, the route's own auto-generated help page, and
// small-scale shape probes):
//
//   GET .../api/metadata/liste/search/?indexContent=<osisRef>&detail=page&format=json&limit=0
//     "Results must contain some part of specified verses". osisRef uses the
//     same book abbreviations as SBLGNT's apparatus files (Matt, Mark, Luke,
//     John, Acts, Rom, 1Cor, ..., Rev — see NT_BOOKS[].osis), joined to a
//     chapter with "." (e.g. "John.18"). Also accepts gaNum (real GA siglum,
//     loosely normalized — "01" and "1" both matched Sinaiticus in testing).
//     detail=page's JSON body shape (real, observed):
//       { status: "success", data: { manuscripts: {
//           pagecount, count, partial,
//           manuscript: <one object, OR an array when >1 match> [{
//             docID,              // internal id; docID - 10000/20000/30000/40000
//                                 // = the plain GA number for papyrus/majuscule/
//                                 // minuscule/lectionary respectively (confirmed
//                                 // for papyrus: 10052 -> P52; majuscule: 20001 -> 01;
//                                 // minuscule/lectionary offsets inferred by the same
//                                 // pattern, not yet independently confirmed)
//             gaNum, primaryName, // both the GA number as NTVMR spells it (e.g. "1" for
//                                 // majuscule 01 — NOT reliable on its own to tell a
//                                 // majuscule from a minuscule; docID's range is)
//             pages: { count, page: <one object, OR an array when >1> [{
//               pageID, folio,
//               indexContent, biblicalContent, // identical; e.g. "Matt 1:1-25; Matt 2:1-5"
//               transcriptions: { transcription: { uri } }, // present only if transcribed
//             }] },
//           }],
//       } } }
//     Cut short past its (implicit ~500-page) default limit unless limit=0/empty
//     is passed (partial:true when truncated) — always pass limit=0 here.
//
//   GET .../api/transcript/get/?gaNum=<ga>&pageID=<id>&format=teiraw
//     (also takes docID instead of gaNum). Real TEI transcript for one page.

import { cachedFetchText, sleepMs, USER_AGENT, runPool } from './lib.mjs';
import { NT_BOOKS } from './nt-books.mjs';

export const NTVMR_BASE = 'https://ntvmr.uni-muenster.de';
const SEARCH_URL = `${NTVMR_BASE}/community/vmr/api/metadata/liste/search/`;
const TRANSCRIPT_URL = `${NTVMR_BASE}/community/vmr/api/transcript/get/`;

export function gaToNtvmrQuery(ga) {
  if (ga.startsWith('P')) return ga; // "P52"
  if (ga.startsWith('l')) return `L${ga.slice(1)}`; // "l150" -> "L150" (untested; best guess)
  return ga; // majuscule "01"/"032", minuscule "33" — NTVMR matched "01" fine in testing
}

/** GET without throwing on non-2xx; returns {ok,status,text} or {ok:false,error}. */
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

// ---------------------------------------------------------------------------
// docID -> our catalog-style GA string
// ---------------------------------------------------------------------------

const DOC_ID_CATEGORY_OFFSET = [
  [10000, 19999, (n) => `P${n}`], // confirmed: 10052 -> P52
  [20000, 29999, (n) => `0${n}`], // confirmed: 20001 -> 01 (matches catalog.json's "0"+n majuscule form)
  [30000, 39999, (n) => `${n}`], // inferred by pattern (not independently confirmed)
  [40000, 49999, (n) => `l${n}`], // inferred by pattern (not independently confirmed)
];

export function docIdToGA(docID) {
  const id = Number(docID);
  for (const [lo, hi, fmt] of DOC_ID_CATEGORY_OFFSET) {
    if (id >= lo && id <= hi) return fmt(id - lo);
  }
  return null;
}

// ---------------------------------------------------------------------------
// indexContent text parsing: "Matt 1:1-25; Matt 2:1-5" -> ranges, then -> "c:v" keys
// ---------------------------------------------------------------------------

const OSIS_TO_BOOK = new Map(NT_BOOKS.map((b) => [b.osis.toLowerCase(), b]));
const BOOK_BY_ID = new Map(NT_BOOKS.map((b) => [b.id, b]));

/** Parse "<Osis> <chapter>:<v0>[-<v1>]" segments joined by ";" (confirmed format) or
 * "." (seen in an older, non-page field; tolerated defensively). Segments without their
 * own book/chapter reuse the previous segment's (defensive; not observed in practice
 * since real data always repeats the book name per segment). */
function parseIndexContent(text) {
  if (!text) return [];
  const out = [];
  let curBook = null;
  let curChapter = null;
  for (const raw of text.split(/[;.]/)) {
    const seg = raw.trim();
    if (!seg) continue;
    let m = seg.match(/^([1-3]?[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (m) {
      curBook = OSIS_TO_BOOK.get(m[1].toLowerCase()) || null;
      curChapter = parseInt(m[2], 10);
      out.push({ book: curBook, chapter: curChapter, v0: parseInt(m[3], 10), v1: m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10) });
      continue;
    }
    m = seg.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (m && curBook) {
      curChapter = parseInt(m[1], 10);
      out.push({ book: curBook, chapter: curChapter, v0: parseInt(m[2], 10), v1: m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10) });
      continue;
    }
    m = seg.match(/^(\d+)(?:-(\d+))?$/);
    if (m && curBook && curChapter != null) {
      out.push({ book: curBook, chapter: curChapter, v0: parseInt(m[1], 10), v1: m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10) });
      continue;
    }
    // Whole-chapter/whole-book mentions ("Matt", "Matt 1-2") are too coarse to expand
    // safely without risking overstatement; skipped (not counted as a hit for any verse).
  }
  return out;
}

/** ranges (from parseIndexContent) -> ["c:v", ...] restricted to `book`, clamped to its real verse counts. */
function verseKeysForBook(ranges, book) {
  const keys = [];
  for (const r of ranges) {
    if (!r.book || r.book.id !== book.id) continue;
    const maxV = book.verses[r.chapter - 1];
    if (!maxV) continue;
    const v0 = Math.max(1, r.v0);
    const v1 = Math.min(maxV, r.v1);
    for (let v = v0; v <= v1; v++) keys.push(`${r.chapter}:${v}`);
  }
  return keys;
}

function asArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

/** One metadata/liste/search detail=page JSON body -> page rows for `book`. */
function extractPageRows(json, book, unknownGA) {
  const rows = [];
  const mss = json?.data?.manuscripts;
  if (!mss) return rows;
  for (const ms of asArray(mss.manuscript)) {
    const ga = docIdToGA(ms.docID);
    if (!ga) {
      unknownGA.docIDs.add(ms.docID);
      continue;
    }
    for (const pg of asArray(ms.pages?.page)) {
      const text = pg.indexContent || pg.biblicalContent;
      const ranges = parseIndexContent(text);
      const verseKeys = verseKeysForBook(ranges, book);
      if (!verseKeys.length) continue;
      rows.push({
        ga,
        pageId: pg.pageID,
        folio: pg.folio,
        verseKeys,
        range: text,
        transcribed: Boolean(pg.transcriptions?.transcription),
      });
    }
  }
  return rows;
}

/**
 * Confirmed NTVMR shape. Exposes:
 *   fetchBookPages(book) -> Promise<[{ga, pageId, folio, verseKeys, range}]>
 *     Queries indexContent=<osis>.<chapter> for every chapter in `book` (concurrency 3,
 *     small delay — polite to NTVMR), merges and dedupes page rows.
 *   fetchTranscript(ga, pageId) -> Promise<string|null>
 *     Raw TEI ("teiraw") for one page.
 */
export const CONFIRMED_SHAPE = {
  unknownGA: { docIDs: new Set() },

  /** deadline: a Date.now()-style timestamp (default: no deadline). Checked before every
   * chapter fetch — not just between books — so one book's own chapter loop can't run past
   * the caller's overall time budget no matter how many chapters it has or how slow any
   * individual request is. */
  async fetchBookPages(book, deadline = Infinity) {
    const chapters = Array.from({ length: book.verses.length }, (_, i) => i + 1);
    const seenPageIds = new Set();
    const rows = [];
    let deadlineHit = false;
    await runPool(
      chapters,
      async (chapter) => {
        if (Date.now() > deadline) {
          if (!deadlineHit) console.log(`  [ntvmr] ${book.id}: deadline reached mid-book; skipping remaining chapters.`);
          deadlineHit = true;
          return;
        }
        const url = `${SEARCH_URL}?${new URLSearchParams({
          indexContent: `${book.osis}.${chapter}`,
          detail: 'page',
          format: 'json',
          // Bounded, not unlimited (limit=0): an unbounded chapter-wide query made the
          // server enumerate every matching document to completion, which for a popular
          // chapter (hundreds/thousands of manuscripts) took long enough per-request to
          // blow the whole workflow's time budget in testing. 1500 pages already captures
          // far more real manuscripts per chapter than the catalogue fallback ever would;
          // this bound is about request latency, not the output-size limit (none set).
          limit: '1500',
        })}`;
        const text = await cachedFetchText(url, { label: `${book.id}.${chapter}`, timeoutMs: 20000, retries: 1 });
        let json;
        try {
          json = JSON.parse(text);
        } catch (err) {
          console.log(`  [ntvmr] ${book.id}.${chapter}: JSON parse failed: ${err.message}`);
          return;
        }
        for (const row of extractPageRows(json, book, CONFIRMED_SHAPE.unknownGA)) {
          const dedupeKey = `${row.ga}#${row.pageId}`;
          if (seenPageIds.has(dedupeKey)) continue;
          seenPageIds.add(dedupeKey);
          rows.push(row);
        }
      },
      { concurrency: 3, delayMs: 200, onError: (chapter, err) => console.log(`  [ntvmr] ${book.id}.${chapter} failed: ${err.message}`) },
    );
    return rows;
  },

  /** All of one manuscript's pages (any book), for transcription fetching:
   * [{pageId, folio, range, transcribed}]. One request, keyed by gaNum. */
  async fetchManuscriptPages(ga) {
    const url = `${SEARCH_URL}?${new URLSearchParams({
      gaNum: gaToNtvmrQuery(ga),
      detail: 'page',
      format: 'json',
      limit: '0',
    })}`;
    const text = await cachedFetchText(url, { label: `mspages:${ga}`, timeoutMs: 45000, retries: 2 });
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.log(`  [ntvmr] ${ga}: JSON parse failed: ${err.message}`);
      return [];
    }
    const msObj = asArray(json?.data?.manuscripts?.manuscript).find((m) => docIdToGA(m.docID) === ga) ?? asArray(json?.data?.manuscripts?.manuscript)[0];
    if (!msObj) return [];
    return asArray(msObj.pages?.page).map((pg) => ({
      pageId: pg.pageID,
      folio: pg.folio,
      range: pg.indexContent || pg.biblicalContent,
      transcribed: Boolean(pg.transcriptions?.transcription),
    }));
  },

  async fetchTranscript(ga, pageId) {
    const url = `${TRANSCRIPT_URL}?${new URLSearchParams({ gaNum: gaToNtvmrQuery(ga), pageID: String(pageId), format: 'teiraw' })}`;
    try {
      return await cachedFetchText(url, { label: `transcript:${ga}:${pageId}`, timeoutMs: 30000, retries: 1 });
    } catch (err) {
      console.log(`  [ntvmr] transcript ${ga}/${pageId} failed: ${err.message}`);
      return null;
    }
  },
};

/** Returns CONFIRMED_SHAPE (always non-null now that the shape is verified). Kept as an
 * async function — and still logging one line — so callers/history stay consistent with
 * earlier iterations that used discover() to decide whether NTVMR was reachable at all. */
export async function discover() {
  console.log('[ntvmr] Using confirmed metadata/liste/search + transcript/get shape.');
  return CONFIRMED_SHAPE;
}

export const _internal = { rawGet, SEARCH_URL, parseIndexContent, verseKeysForBook, docIdToGA, OSIS_TO_BOOK, BOOK_BY_ID };
