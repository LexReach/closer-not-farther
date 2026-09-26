// scripts/library/lib.mjs
// Shared helpers for the Library data-fetch scripts (fetch-catalog.mjs, fetch-images.mjs).
// Plain Node ESM, no dependencies beyond node-html-parser (used only by fetch-catalog.mjs).

import { setTimeout as sleep } from 'node:timers/promises';

export const USER_AGENT =
  'closer-not-farther-library/1.0 (https://github.com/LexReach/closer-not-farther)';

// ---------------------------------------------------------------------------
// Networking helpers
// ---------------------------------------------------------------------------

/**
 * fetch() with a timeout, retries with exponential backoff, and a UA header.
 * Returns the raw Response on success (caller decides how to read the body).
 */
export async function fetchWithRetry(url, { headers = {}, timeoutMs = 60000, retries = 3, label = url } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...headers },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} for ${label}`);
        const wait = 2000 * Math.pow(2, attempt);
        console.warn(`  [retry] ${label} -> ${res.status}, waiting ${wait}ms (attempt ${attempt + 1}/${retries + 1})`);
        await sleep(wait);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const wait = 2000 * Math.pow(2, attempt);
      console.warn(`  [retry] ${label} -> ${err.message}, waiting ${wait}ms (attempt ${attempt + 1}/${retries + 1})`);
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error(`Failed to fetch ${label}`);
}

export async function fetchJSON(url, opts = {}) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${opts.label ?? url}`);
  return res.json();
}

export async function fetchText(url, opts = {}) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${opts.label ?? url}`);
  return res.text();
}

/** Run async tasks with a concurrency cap. Never throws; each task's error is caught and reported via onError. */
export async function runPool(items, worker, { concurrency = 4, onError = null, delayMs = 0 } = {}) {
  const results = new Array(items.length);
  let idx = 0;
  async function runOne() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        if (onError) onError(items[i], err);
        results[i] = undefined;
      }
      if (delayMs) await sleep(delayMs);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runOne);
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// GA number normalization
// ---------------------------------------------------------------------------

const CONTENT_ORDER = 'eapcr';

/**
 * Normalize a raw Gregory-Aland token (from Wikidata's P1577 or a Wikipedia table cell)
 * into { cat, ga } where cat is one of 'P','M','m','L'.
 * Returns null if the token cannot be parsed.
 */
export function normalizeGA(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Strip footnote markers, wiki refs, asterisks.
  s = s.replace(/\[[^\]]*\]/g, '').replace(/\*/g, '').trim();
  // Normalize special siglum characters to ASCII before anything else.
  s = s.replace(/𝔓/gu, 'P').replace(/ℓ/gu, 'l').replace(/ℵ/gu, '0');
  s = s.replace(/^[("]+|[)":]+$/g, '').trim();
  if (!s) return null;

  // Papyrus: P52, P.52, "P 52"
  let m = s.match(/^P\.?\s*0*(\d+)/i);
  if (m) return { cat: 'P', ga: `P${parseInt(m[1], 10)}` };

  // Lectionary: l150, l.150, "Lect 150", "L150"
  m = s.match(/^(?:l|lect\.?(?:ionary)?)\.?\s*0*(\d+)/i);
  if (m) return { cat: 'L', ga: `l${parseInt(m[1], 10)}` };

  // Majuscule: has an explicit leading zero, e.g. 01, 0212, 0323
  m = s.match(/^0(\d+)$/);
  if (m) return { cat: 'M', ga: `0${parseInt(m[1], 10)}` };

  // Plain integer -> minuscule
  m = s.match(/^(\d+)$/);
  if (m) return { cat: 'm', ga: `${parseInt(m[1], 10)}` };

  return null;
}

/** Numeric part of a canonical GA string, for sorting. */
export function gaNumericPart(ga) {
  const m = String(ga).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

const CAT_ORDER = { P: 0, M: 1, m: 2, L: 3 };
export function compareRows(a, b) {
  const ca = CAT_ORDER[a.cat] ?? 9;
  const cb = CAT_ORDER[b.cat] ?? 9;
  if (ca !== cb) return ca - cb;
  return gaNumericPart(a.ga) - gaNumericPart(b.ga);
}

// ---------------------------------------------------------------------------
// Century parsing
// ---------------------------------------------------------------------------

/** floor((year-1)/100)+1, the standard "which century is year Y in" formula. Only defined for Y > 0 (AD). */
export function yearToCentury(year) {
  if (!Number.isFinite(year) || year <= 0) return null;
  return Math.floor((year - 1) / 100) + 1;
}

const ROMAN_MAP = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanToInt(str) {
  let result = 0;
  const s = str.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN_MAP[s[i]];
    const next = ROMAN_MAP[s[i + 1]];
    if (cur == null) return NaN;
    if (next && cur < next) result -= cur;
    else result += cur;
  }
  return result;
}

const ROMAN_TOKEN = '(?=[MDCLXVI])M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})';
const ROMAN_RANGE_RE = new RegExp(
  `^(${ROMAN_TOKEN})\\s*(?:[/-]\\s*(${ROMAN_TOKEN}))?\\s*(?:century|cent\\.?|c\\.?)?$`,
  'i',
);

/**
 * Parse a free-text date/century string into { c0, c1 } (inclusive century range), or null.
 * Handles: roman numerals ("XI", "IV/V"), ordinals ("3rd", "4th/5th century", "12th century"),
 * plain years ("1044"), year ranges ("175-225"), and approximate years ("c. 200", "ca. 200")
 * which get a +/-25 year fuzz window before conversion to centuries.
 */
export function parseCenturyFromText(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/\[[^\]]*\]/g, '').trim();
  s = s.replace(/[–—]/g, '-');
  if (!s || /^\?+$/.test(s) || /unknown/i.test(s)) return null;

  // Roman numeral century, optionally a range: "XI", "IV/V", "XI-XII century"
  const romMatch = s.match(ROMAN_RANGE_RE);
  if (romMatch) {
    const c0 = romanToInt(romMatch[1]);
    const c1 = romMatch[2] ? romanToInt(romMatch[2]) : c0;
    if (c0 > 0 && c0 < 25 && c1 > 0 && c1 < 25) {
      return { c0: Math.min(c0, c1), c1: Math.max(c0, c1) };
    }
  }

  // Ordinal range, "century" optional: "4th/5th", "4th-5th century", "4th to 5th century"
  let m = s.match(/(\d{1,2})(?:st|nd|rd|th)\s*(?:[/-]|to)\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:century)?/i);
  if (m) {
    const c0 = parseInt(m[1], 10);
    const c1 = parseInt(m[2], 10);
    return { c0: Math.min(c0, c1), c1: Math.max(c0, c1) };
  }

  // Single ordinal: "3rd century", "12th", "3rd"
  m = s.match(/(\d{1,2})\s*(?:st|nd|rd|th)\s*(?:century)?\b/i);
  if (m) {
    const c = parseInt(m[1], 10);
    if (c > 0 && c < 25) return { c0: c, c1: c };
  }

  // Year(s), optionally with an approximation qualifier.
  const isApprox = /\b(c\.?|ca\.?|circa|around|approx\.?)\s*\d/i.test(s) || /\bc\.\s*\d/i.test(s);
  m = s.match(/(\d{3,4})\s*(?:[/-]\s*(\d{3,4}))?/);
  if (m) {
    const y0 = parseInt(m[1], 10);
    let lo, hi;
    if (m[2]) {
      const y1 = parseInt(m[2], 10);
      lo = Math.min(y0, y1);
      hi = Math.max(y0, y1);
    } else if (isApprox) {
      lo = y0 - 25;
      hi = y0 + 25;
    } else {
      lo = hi = y0;
    }
    const c0 = yearToCentury(lo);
    const c1 = yearToCentury(hi);
    if (c0 != null && c1 != null) return { c0, c1 };
  }

  return null;
}

/**
 * Parse a Wikidata time value (ISO-ish string e.g. "+0201-00-00T00:00:00Z") plus its
 * wikibase precision code (11=day..6=millennium) into { c0, c1 }, or null if too coarse.
 */
export function parseCenturyFromWikidataTime(timeValue, precision) {
  if (timeValue == null) return null;
  const m = String(timeValue).match(/^([+-]\d+)-/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const cent = yearToCentury(year);
  if (cent == null) return null;
  const prec = Number(precision);
  if (prec >= 7) return { c0: cent, c1: cent };
  return null; // millennium (6) or coarser: too vague to use
}

// ---------------------------------------------------------------------------
// Contents (INTF-style letters: e/a/p/c/r)
// ---------------------------------------------------------------------------

export function parseContents(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  const parts = new Set();
  const hasGospelWord = /gospel|evangel|\bmatt(hew)?\b|\bmark\b|\bluke\b/.test(s);
  const hasJohn = /\bjohn\b/.test(s);
  const johnIsEpistle = /(epistle|epistles)\s+of\s+john|johannine epistle/.test(s);
  if (hasGospelWord || (hasJohn && !johnIsEpistle)) parts.add('e');
  if (/\bacts\b|apostolos|praxapostolos/.test(s)) parts.add('a');
  if (/\bpaul|pauline|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|\btimothy\b|\btitus\b|philemon|hebrews/.test(s)) parts.add('p');
  if (/cathol|general epistle|\bjames\b|\bpeter\b|\bjude\b|epistle of john|epistles of john/.test(s)) parts.add('c');
  if (/revelation|apocalypse/.test(s)) parts.add('r');
  if (parts.size === 0) return null;
  return [...parts].sort((a, b) => CONTENT_ORDER.indexOf(a) - CONTENT_ORDER.indexOf(b)).join(',');
}

// ---------------------------------------------------------------------------
// Institution name -> (city, country) fallback dictionary
// ---------------------------------------------------------------------------

// Keys are matched as case-insensitive substrings against free-text institution names.
// Used only to fill gaps when Wikidata doesn't give us a structured city/country.
export const INSTITUTION_DICT = [
  [/vatican/i, { city: 'Vatican City', country: 'Vatican City' }],
  [/british library/i, { city: 'London', country: 'United Kingdom' }],
  [/bodleian/i, { city: 'Oxford', country: 'United Kingdom' }],
  [/cambridge university library/i, { city: 'Cambridge', country: 'United Kingdom' }],
  [/biblioth[eè]que nationale de france|\bBnF\b/i, { city: 'Paris', country: 'France' }],
  [/national library of greece/i, { city: 'Athens', country: 'Greece' }],
  [/austrian national library|[oö]sterreichische nationalbibliothek/i, { city: 'Vienna', country: 'Austria' }],
  [/university of michigan/i, { city: 'Ann Arbor', country: 'United States' }],
  [/chester beatty/i, { city: 'Dublin', country: 'Ireland' }],
  [/duke university/i, { city: 'Durham', country: 'United States' }],
  [/princeton/i, { city: 'Princeton', country: 'United States' }],
  [/morgan library/i, { city: 'New York', country: 'United States' }],
  [/walters art museum/i, { city: 'Baltimore', country: 'United States' }],
  [/state historical museum/i, { city: 'Moscow', country: 'Russia' }],
  [/national library of russia|russian national library/i, { city: 'Saint Petersburg', country: 'Russia' }],
  [/russian state library/i, { city: 'Moscow', country: 'Russia' }],
  [/escorial/i, { city: 'San Lorenzo de El Escorial', country: 'Spain' }],
  [/meteora/i, { city: 'Meteora', country: 'Greece' }],
  [/mount athos|\bathos\b/i, { city: 'Mount Athos', country: 'Greece' }],
  [/patmos/i, { city: 'Patmos', country: 'Greece' }],
  [/st\.?\s*catherine|sinai/i, { city: 'Mount Sinai', country: 'Egypt' }],
  [/jerusalem/i, { city: 'Jerusalem', country: 'Israel' }],
  [/leiden university/i, { city: 'Leiden', country: 'Netherlands' }],
  [/berlin state library|staatsbibliothek zu berlin/i, { city: 'Berlin', country: 'Germany' }],
  [/bavarian state library|bayerische staatsbibliothek/i, { city: 'Munich', country: 'Germany' }],
  [/biblioteca ambrosiana/i, { city: 'Milan', country: 'Italy' }],
  [/biblioteca medicea laurenziana|laurentian library/i, { city: 'Florence', country: 'Italy' }],
  [/biblioteca (nazionale )?marciana/i, { city: 'Venice', country: 'Italy' }],
  [/biblioth[eè]que de gen[eè]ve|geneva library/i, { city: 'Geneva', country: 'Switzerland' }],
  [/national library of sweden|kungliga biblioteket/i, { city: 'Stockholm', country: 'Sweden' }],
  [/uppsala university/i, { city: 'Uppsala', country: 'Sweden' }],
  [/royal (danish )?library|det kongelige bibliotek/i, { city: 'Copenhagen', country: 'Denmark' }],
  [/biblioth[eè]que nationale et universitaire de strasbourg/i, { city: 'Strasbourg', country: 'France' }],
  [/bibl(iothèque)?\.? municipale/i, { city: null, country: 'France' }],
  [/houghton library|harvard/i, { city: 'Cambridge', country: 'United States' }],
  [/beinecke|yale/i, { city: 'New Haven', country: 'United States' }],
  [/dumbarton oaks/i, { city: 'Washington, D.C.', country: 'United States' }],
  [/library of congress/i, { city: 'Washington, D.C.', country: 'United States' }],
  [/national archaeological museum.*athens/i, { city: 'Athens', country: 'Greece' }],
  [/e-?codices|fribourg/i, { city: 'Fribourg', country: 'Switzerland' }],
  [/bodmer/i, { city: 'Cologny', country: 'Switzerland' }],
  [/university of m[uü]nster|institut f[uü]r neutestamentliche textforschung|intf/i, { city: 'Münster', country: 'Germany' }],
  [/newton gresham|sam houston/i, { city: 'Huntsville', country: 'United States' }],
  [/john rylands/i, { city: 'Manchester', country: 'United Kingdom' }],
  [/bibliotheca alexandrina/i, { city: 'Alexandria', country: 'Egypt' }],
  [/coptic museum/i, { city: 'Cairo', country: 'Egypt' }],
  [/patriarchal library/i, { city: 'Jerusalem', country: 'Israel' }],
];

export function lookupInstitutionDict(name) {
  if (!name) return null;
  for (const [re, val] of INSTITUTION_DICT) {
    if (re.test(name)) return val;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

const GENERIC_LABEL_RE = /^(papyrus|uncial|majuscule|minuscule|lectionary|codex)\s*0*\d+$/i;

/** True if a Wikidata label is just the generic auto-generated "Minuscule 33" style label. */
export function isGenericLabel(label) {
  if (!label) return true;
  return GENERIC_LABEL_RE.test(label.trim());
}

export function stripFalsy(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== '' && v !== null) out[k] = v;
  }
  return out;
}
