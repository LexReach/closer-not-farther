// Loads the cached KJV chapter/verse structure fetched by fetch-versecounts.mjs and
// exposes it as { USFM: [verseCountInCh1, verseCountInCh2, ...] } (English versification).
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./books.mjs";

export function loadEnglishVerseCounts(cacheDir = path.resolve("scripts/ot/.cache/kjv")) {
  const out = {};
  for (const book of BOOKS) {
    const p = path.join(cacheDir, `${book.usfm}.json`);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    out[book.usfm] = data.chapters.map((ch) => ch.verses.length);
  }
  return out;
}

function expandSingleBook(book, c1, v1, c2, v2, counts) {
  const keys = [];
  let c = c1, v = v1;
  while (c < c2 || (c === c2 && v <= v2)) {
    keys.push(`${book}.${c}.${v}`);
    const maxV = counts[c - 1];
    if (maxV === undefined) break; // out-of-range chapter, stop defensively
    if (v < maxV) {
      v++;
    } else {
      c++;
      v = 1;
    }
  }
  return keys;
}

// Expands a "BOOK.C.V-BOOK.C.V" (or single-verse "BOOK.C.V") range into an array of
// "BOOK.C.V" keys, using the English verse-count table. The range may span several
// consecutive books in canonical order (e.g. "HOS.1.1-MAL.4.6"), in which case every
// book strictly between the two endpoints is included in full.
export function expandRange(range, verseCounts) {
  // USFM book ids never contain "-", so a plain split is unambiguous.
  const [startRef, endRef] = range.includes("-") ? range.split("-") : [range, range];
  const [sBook, sC, sV] = startRef.split(".");
  const [eBook, eC, eV] = (endRef || startRef).split(".");
  const c1 = parseInt(sC, 10), v1 = parseInt(sV, 10);
  const c2 = parseInt(eC, 10), v2 = parseInt(eV, 10);

  if (sBook === eBook) {
    const counts = verseCounts[sBook];
    if (!counts) throw new Error(`expandRange: unknown book ${sBook}`);
    return expandSingleBook(sBook, c1, v1, c2, v2, counts);
  }

  const order = BOOKS.map((b) => b.usfm);
  const si = order.indexOf(sBook);
  const ei = order.indexOf(eBook);
  if (si === -1) throw new Error(`expandRange: unknown book ${sBook}`);
  if (ei === -1) throw new Error(`expandRange: unknown book ${eBook}`);
  if (ei < si) throw new Error(`expandRange: end book ${eBook} precedes start book ${sBook}`);

  const keys = [];
  for (let i = si; i <= ei; i++) {
    const book = order[i];
    const counts = verseCounts[book];
    if (i === si) {
      keys.push(...expandSingleBook(book, c1, v1, counts.length, counts[counts.length - 1], counts));
    } else if (i === ei) {
      keys.push(...expandSingleBook(book, 1, 1, c2, v2, counts));
    } else {
      keys.push(...expandSingleBook(book, 1, 1, counts.length, counts[counts.length - 1], counts));
    }
  }
  return keys;
}

// Returns a single range string covering an entire book, e.g. "GEN.1.1-GEN.50.26".
export function fullBookRange(usfm, verseCounts) {
  const counts = verseCounts[usfm];
  const lastC = counts.length;
  const lastV = counts[lastC - 1];
  return `${usfm}.1.1-${usfm}.${lastC}.${lastV}`;
}
