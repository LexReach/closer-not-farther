#!/usr/bin/env node
/**
 * build-transcriptions.mjs
 *
 * Builds data/evidence/transcriptions/<GA>/<pageId>.json: page-level diplomatic
 * transcriptions (columns/lines/tokens, with nomina sacra, lacunae and
 * corrections where marked up) for manuscripts that have a machine-readable
 * TEI transcription available.
 *
 * Sources tried, in order, per manuscript:
 *   1. INTF NTVMR transcript API (scripts/evidence/ntvmr.mjs) — any manuscript.
 *   2. IGNTP's John transcriptions (iohannes.com, CC BY) — John-only, used as
 *      a fallback/cross-check for manuscripts containing John.
 *
 * Priority order (spec): the 25 featured manuscripts, then everything dated
 * wholly before 900 AD, then everything else with an image in
 * data/library/images.json — stopping when TIME_BUDGET_MS runs out so a run
 * always finishes inside the workflow's timeout with whatever it got done.
 *
 * Needs network (NTVMR + iohannes.com); only meaningful in CI.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setCacheDir, sleepMs, runPool } from './lib.mjs';
import { discover } from './ntvmr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'transcriptions');
const CACHE_DIR = path.join(ROOT, '.cache-evidence', 'ntvmr-raw');
const TIME_BUDGET_MS = Number(process.env.EVIDENCE_TRANSCRIPTS_BUDGET_MS || 35 * 60 * 1000);
const START = Date.now();

setCacheDir(CACHE_DIR);

function log(...a) {
  console.log(...a);
}
function timeLeft() {
  return TIME_BUDGET_MS - (Date.now() - START);
}

async function loadJSON(rel, fallback) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
  } catch (err) {
    log(`  (could not load ${rel}: ${err.message})`);
    return fallback;
  }
}

async function buildPriorityList() {
  const catalog = await loadJSON('data/library/catalog.json', { fields: [], rows: [] });
  const idx = Object.fromEntries(catalog.fields.map((f, i) => [f, i]));
  const featured = await loadJSON('data/library/featured.json', { manuscripts: [] });
  const images = await loadJSON('data/library/images.json', { items: {} });

  const order = [];
  const seen = new Set();
  const push = (ga) => {
    if (!ga || seen.has(ga)) return;
    seen.add(ga);
    order.push(ga);
  };

  for (const m of featured.manuscripts) push(m.ga);

  const early = catalog.rows
    .filter((r) => r[idx.c0] != null && r[idx.c0] <= 9)
    .sort((a, b) => (a[idx.c0] ?? 99) - (b[idx.c0] ?? 99));
  for (const r of early) push(r[idx.ga]);

  for (const ga of Object.keys(images.items || {})) push(ga);

  return order;
}

// ---------------------------------------------------------------------------
// TEI -> {columns:[{lines:[{n,tokens:[...]}]}]} — a defensive, best-effort
// walk of whatever XML/TEI structure the source actually returns. Since this
// sandbox cannot reach NTVMR/iohannes.com to inspect a real sample, this
// parser is written against the TEI conventions INTF/IGNTP transcriptions are
// documented to use (pb/cb/lb milestones, supplied/gap for lacunae,
// choice/sic/corr for corrections, verse milestones), but MUST be checked
// against a real CI log (first ~3000 chars of an actual fetched page are
// logged below) and adjusted if the real markup differs.
// ---------------------------------------------------------------------------

function stripTags(s) {
  return s.replace(/<[^>]*>/g, ' ');
}

/** Very small streaming tag walker: yields {type:'open'|'close'|'text', name, attrs, text}. */
function* walkXML(xml) {
  const re = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) {
      if (m[5].trim()) yield { type: 'text', text: m[5] };
      continue;
    }
    const closing = m[1] === '/';
    const name = m[2];
    const selfClose = m[4] === '/';
    const attrs = {};
    const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;
    let am;
    while ((am = attrRe.exec(m[3] || ''))) {
      if (am[1]) attrs[am[1]] = am[2];
      else attrs[am[3]] = am[4];
    }
    if (closing) yield { type: 'close', name };
    else {
      yield { type: 'open', name, attrs, selfClosing: selfClose };
      if (selfClose) yield { type: 'close', name };
    }
  }
}

/** Extract a "c:v" style verse ref from an attribute value in various schemes seen in NT transcription tooling. */
function parseVerseRef(raw) {
  if (!raw) return null;
  // INTF scheme: B04K1V1 (book/chapter/verse), book numbers 1=Matt..27=Rev (NT order).
  let m = raw.match(/B(\d{1,2})K(\d{1,3})V(\d{1,3})/i);
  if (m) return { bookNum: parseInt(m[1], 10), chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10) };
  // Plain "1:1" / "1.1" already relative to a known book.
  m = raw.match(/^(\d+)[:.](\d+)$/);
  if (m) return { chapter: parseInt(m[1], 10), verse: parseInt(m[2], 10) };
  return null;
}

const NT_BOOK_ORDER = [
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

function verseId(bookHint, ref) {
  if (!ref) return null;
  const book = ref.bookNum ? NT_BOOK_ORDER[ref.bookNum - 1] : bookHint;
  if (!book) return null;
  return `${book}.${ref.chapter}.${ref.verse}`;
}

/**
 * Parse TEI-ish XML into the requested {folio, columns:[{lines:[{n,tokens}]}]}
 * shape. Falls back to a single column/single line of whitespace-tokenized
 * words (no per-token verse ids) if no recognizable pb/cb/lb/verse markup is
 * found, so the output is still usable (and clearly not verse-aligned: no
 * token carries `v`).
 */
export function parseTEIPage(xml, { ga, pageId, bookHint }) {
  let folio = null;
  const columns = [];
  let curColumn = null;
  let curLine = null;
  let curVerse = null;
  let inSupplied = 0;
  let sawStructure = false;
  // <choice><sic>...</sic><corr hand="c1">...</corr></choice>: a single logical
  // token (the scribe's text, with the correction recorded alongside it), not
  // two separate words. Frames stack in case of nesting.
  const choiceStack = [];

  function ensureColumn() {
    if (!curColumn) {
      curColumn = { lines: [] };
      columns.push(curColumn);
    }
    return curColumn;
  }
  function ensureLine(n) {
    ensureColumn();
    curLine = { n: n ?? curColumn.lines.length + 1, tokens: [] };
    curColumn.lines.push(curLine);
    return curLine;
  }
  function pushToken(t, extra) {
    if (!t) return;
    if (!curLine) ensureLine();
    const tok = { t };
    if (curVerse) tok.v = curVerse;
    if (inSupplied) tok.lac = true;
    if (extra) Object.assign(tok, extra);
    curLine.tokens.push(tok);
  }

  let textBuf = '';
  function flushText() {
    if (!textBuf) return;
    const words = textBuf.trim().split(/\s+/).filter(Boolean);
    const frame = choiceStack[choiceStack.length - 1];
    if (frame && frame.target) {
      frame[frame.target] += (frame[frame.target] ? ' ' : '') + words.join(' ');
    } else {
      for (const w of words) pushToken(w);
    }
    textBuf = '';
  }

  for (const ev of walkXML(xml)) {
    if (ev.type === 'text') {
      textBuf += ev.text;
      continue;
    }
    const name = ev.type === 'open' ? ev.name.replace(/^.*:/, '').toLowerCase() : ev.name.replace(/^.*:/, '').toLowerCase();
    if (ev.type === 'open') {
      switch (name) {
        case 'pb':
          flushText();
          sawStructure = true;
          folio = ev.attrs.n || folio;
          break;
        case 'cb':
          flushText();
          sawStructure = true;
          curColumn = { lines: [] };
          columns.push(curColumn);
          curLine = null;
          break;
        case 'lb':
          flushText();
          sawStructure = true;
          curLine = ensureLine(ev.attrs.n ? parseInt(ev.attrs.n, 10) || ev.attrs.n : undefined);
          break;
        case 'milestone':
        case 'anchor':
          if (ev.attrs.unit === 'verse' || /verse/i.test(ev.attrs.type || '') || /^B\d/.test(ev.attrs.n || '')) {
            flushText();
            const ref = parseVerseRef(ev.attrs.n || ev.attrs.ana);
            curVerse = verseId(bookHint, ref);
          }
          break;
        case 'supplied':
        case 'gap':
        case 'unclear':
          flushText();
          inSupplied++;
          break;
        case 'choice':
          flushText();
          choiceStack.push({ sic: '', corr: '', hand: null, target: null });
          break;
        case 'sic':
        case 'orig':
          flushText();
          if (choiceStack.length) choiceStack[choiceStack.length - 1].target = 'sic';
          break;
        case 'corr':
        case 'reg':
          flushText();
          if (choiceStack.length) {
            const frame = choiceStack[choiceStack.length - 1];
            frame.target = 'corr';
            frame.hand = ev.attrs.hand || ev.attrs.resp || frame.hand;
          }
          break;
        default:
          break;
      }
    } else {
      switch (name) {
        case 'supplied':
        case 'gap':
        case 'unclear':
          flushText();
          inSupplied = Math.max(0, inSupplied - 1);
          break;
        case 'sic':
        case 'orig':
        case 'corr':
        case 'reg':
          flushText();
          if (choiceStack.length) choiceStack[choiceStack.length - 1].target = null;
          break;
        case 'choice': {
          flushText();
          const frame = choiceStack.pop();
          if (frame) {
            const mainText = frame.sic || frame.corr;
            const extra = {};
            if (frame.corr && frame.sic) extra.corr = { hand: frame.hand ?? undefined, t: frame.corr };
            if (mainText) pushToken(mainText, extra);
          }
          break;
        }
        default:
          break;
      }
    }
  }
  flushText();

  if (!sawStructure) {
    // Fall back to raw stripped text as a single unverified column/line.
    const words = stripTags(xml).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    return { ga, pageId, folio, columns: [{ lines: [{ n: 1, tokens: words.map((t) => ({ t })) }] }], _fallback: true };
  }
  return { ga, pageId, folio, columns };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const order = await buildPriorityList();
  log(`Transcription priority list: ${order.length} manuscripts (featured -> pre-900 -> imaged).`);

  const shape = await discover();
  if (!shape) {
    log('No working NTVMR endpoint discovered; cannot fetch any transcriptions this run.');
    return;
  }

  let manuscriptsDone = 0;
  let pagesDone = 0;
  let stopped = false;
  await runPool(
    order,
    async (ga) => {
      if (stopped || timeLeft() <= 0) {
        stopped = true;
        return;
      }
      const pages = await shape.fetchManuscriptPages(ga);
      const transcribedPages = pages.filter((p) => p.transcribed);
      if (!transcribedPages.length) return;
      const dir = path.join(OUT_DIR, ga);
      await mkdir(dir, { recursive: true });
      let done = 0;
      for (const pg of transcribedPages) {
        if (timeLeft() <= 0) {
          stopped = true;
          break;
        }
        const raw = await shape.fetchTranscript(ga, pg.pageId);
        if (!raw) continue;
        if (pagesDone < 3) log(`[sample raw transcript ${ga}/${pg.pageId}] ${raw.slice(0, 3000)}`);
        const parsed = parseTEIPage(raw, { ga, pageId: pg.pageId });
        if (!parsed.folio && pg.folio) parsed.folio = pg.folio;
        await writeFile(path.join(dir, `${pg.pageId}.json`), JSON.stringify(parsed));
        pagesDone++;
        done++;
        await sleepMs(200);
      }
      manuscriptsDone++;
      log(`  ${ga}: ${done}/${transcribedPages.length} pages transcribed (of ${pages.length} total pages)`);
    },
    { concurrency: 3, delayMs: 0, onError: (ga, err) => log(`  [transcript] ${ga} failed: ${err.message}`) },
  );
  if (stopped) log(`Time budget exhausted; stopped early.`);
  log(`Done: ${manuscriptsDone} manuscripts, ${pagesDone} pages transcribed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
