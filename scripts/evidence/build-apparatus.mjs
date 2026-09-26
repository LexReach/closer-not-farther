#!/usr/bin/env node
/**
 * build-apparatus.mjs
 *
 * Builds data/evidence/apparatus/<BOOK>.json from the SBLGNT critical apparatus
 * (github.com/LogosBible/SBLGNT, CC BY 4.0). Runs only in CI (needs network).
 *
 * The exact file layout of that repo is discovered at run time rather than
 * hard-coded: we ask the GitHub API for the repo's file tree, log every path,
 * and heuristically pick the apparatus file(s) (name containing "app",
 * case-insensitively) rather than assuming one exact filename. The first
 * ~2000 characters of whatever we download are logged too, so a run that
 * guesses the parsing regex wrong can be diagnosed and fixed from the CI log
 * without re-discovering the repo layout from scratch.
 *
 * Output shape per verse (see task spec):
 *   { "13:5": [ { "lemma": "...", "readings": [ { "text": "...", "eds": ["WH","Treg","NIV"] }, ... ] } ] }
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchJSON, fetchText, USER_AGENT } from './lib.mjs';
import { NT_BOOKS } from './nt-books.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'evidence', 'apparatus');

const REPO = 'LogosBible/SBLGNT';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/master`;

// Book-name variants the apparatus file might use to open each reference line,
// tried longest-first so e.g. "1 Corinthians" is matched before "Corinthians".
const BOOK_NAME_VARIANTS = {
  MAT: ['Matthew', 'Matt', 'Mt'],
  MRK: ['Mark', 'Mk'],
  LUK: ['Luke', 'Lk'],
  JHN: ['John', 'Jn', 'Jhn'],
  ACT: ['Acts'],
  ROM: ['Romans', 'Rom'],
  '1CO': ['1 Corinthians', '1Corinthians', '1 Cor'],
  '2CO': ['2 Corinthians', '2Corinthians', '2 Cor'],
  GAL: ['Galatians', 'Gal'],
  EPH: ['Ephesians', 'Eph'],
  PHP: ['Philippians', 'Phil', 'Php'],
  COL: ['Colossians', 'Col'],
  '1TH': ['1 Thessalonians', '1Thessalonians', '1 Thess'],
  '2TH': ['2 Thessalonians', '2Thessalonians', '2 Thess'],
  '1TI': ['1 Timothy', '1Timothy', '1 Tim'],
  '2TI': ['2 Timothy', '2Timothy', '2 Tim'],
  TIT: ['Titus', 'Tit'],
  PHM: ['Philemon', 'Phlm', 'Phm'],
  HEB: ['Hebrews', 'Heb'],
  JAS: ['James', 'Jas'],
  '1PE': ['1 Peter', '1Peter', '1 Pet'],
  '2PE': ['2 Peter', '2Peter', '2 Pet'],
  '1JN': ['1 John', '1John'],
  '2JN': ['2 John', '2John'],
  '3JN': ['3 John', '3John'],
  JUD: ['Jude'],
  REV: ['Revelation', 'Rev'],
};

// Repo file basenames (confirmed via CI job log, 2026-09-26: data/sblgntapp/text/<Name>.txt)
// -> our BOOK ids. Used as the per-file book hint (see parseApparatusText's bookHint).
const FILENAME_TO_BOOK = {
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM',
  '1Cor': '1CO', '2Cor': '2CO', Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL',
  '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI', '2Tim': '2TI', Titus: 'TIT',
  Phlm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE', '2Pet': '2PE',
  '1John': '1JN', '2John': '2JN', '3John': '3JN', Jude: 'JUD', Rev: 'REV',
};

function log(...a) {
  console.log(...a);
}

async function discoverTree() {
  const url = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
  const json = await fetchJSON(url, {
    headers: { Accept: 'application/vnd.github+json' },
    label: 'github-tree',
  });
  const paths = (json.tree || []).filter((e) => e.type === 'blob').map((e) => e.path);
  log(`Repo tree: ${paths.length} files`);
  for (const p of paths) log(`  ${p}`);
  return paths;
}

function pickApparatusFiles(paths) {
  // Real layout (confirmed via CI job log, 2026-09-26): data/sblgntapp/text/<Book>.txt
  // (plain text, one file per book) and data/sblgntapp/xml/<Book>.xml (structured).
  // Prefer the plain-text files: they use the same human-readable
  // "reading WH Treg NIV] reading RP" notation this parser targets. Matched by
  // directory name ("sblgntapp"), not basename, since individual filenames
  // (Matt.txt, 1Cor.txt, ...) don't themselves contain "app".
  const textFiles = paths.filter((p) => /(^|\/)sblgntapp\/text\//i.test(p) && p.endsWith('.txt'));
  if (textFiles.length) return textFiles;
  // Fall back to the XML apparatus files if the text/ folder isn't there this run.
  return paths.filter((p) => /(^|\/)sblgntapp\//i.test(p) && /\.(txt|xml)$/i.test(p));
}

// Confirmed edition sigla (from a real fetched sblgntapp/text/*.txt file, e.g. Titus.txt,
// 1John.txt): WH, Treg, NA28, RP, NIV always; NA27, Holmes, WHmarg, SBLGNT, em occasionally
// (Holmes/WHmarg/em can appear as a token before other sigla, e.g. "Holmes WHmarg ] ...").
const EDITION_TOKEN = 'WH|Treg|NIV|RP|NA27|NA28|Holmes|WHmarg|SBLGNT|em';
const EDS_TAIL_RE = new RegExp(`\\s+((?:${EDITION_TOKEN})(?:\\s+(?:${EDITION_TOKEN}))*)\\s*$`);

/**
 * Parse the real SBLGNT apparatus plain-text format (confirmed against
 * data/sblgntapp/text/Titus.txt etc. in a live CI run). Each verse is a block:
 *
 *   Titus 1:4
 *   1:4 καὶ WH Treg NA28 ] ἔλεος RP
 *   • Χριστοῦ Ἰησοῦ WH Treg NA28 ] κυρίου Ἰησοῦ χριστοῦ RP
 *   <blank line>
 *   Titus 1:5
 *   5 ἀπέλιπόν Treg NA28 ] ἀπέλειπόν WH; κατέλιπόν RP
 *   <blank line>
 *
 * - A "header" line is exactly "<Book name> <chapter>:<verse>" with nothing
 *   else — that's what marks a new verse (reliable; unlike the content line
 *   right after it, which sometimes repeats "<chapter>:<verse>" and sometimes
 *   just "<verse>" when the chapter hasn't changed).
 * - Each subsequent non-blank line up to the next header is one variation
 *   unit for that verse: optionally prefixed with "<chapter>:<verse>",
 *   "<verse>", or "• ", then "<reading> <eds...> ] <reading> <eds...>[; <reading> <eds...>]+".
 *   ";" inside a bracketed group separates 3+-way variants (not just 2-way).
 *
 * Returns Map<"BOOK", Map<"c:v", entries[]>>.
 */
export function parseApparatusText(text, sourceLabel, bookHint) {
  const byBookVerse = new Map();
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const variantList = [];
  for (const [book, variants] of Object.entries(BOOK_NAME_VARIANTS)) {
    for (const v of variants) variantList.push([v.toLowerCase(), book]);
  }
  variantList.sort((a, b) => b[0].length - a[0].length);

  const headerRe = /^([1-3]?\s?[A-Za-z][A-Za-z.]*)\s+(\d+):(\d+)$/;
  const contentPrefixRe = /^(?:(?:\d+:)?\d+\s+|•\s*)/;

  function parseUnit(unitText) {
    const groups = unitText.split(']').map((s) => s.trim()).filter(Boolean);
    if (groups.length < 2) return null; // no "]" => not a recognizable variant line
    const readings = [];
    for (const g of groups) {
      // A bracketed group can itself hold 2+ readings separated by ";" (3+-way variants).
      for (const sub of g.split(';').map((s) => s.trim()).filter(Boolean)) {
        const edsMatch = sub.match(EDS_TAIL_RE);
        if (!edsMatch) {
          readings.push({ text: sub, eds: [] });
          continue;
        }
        readings.push({ text: sub.slice(0, edsMatch.index).trim(), eds: edsMatch[1].split(/\s+/) });
      }
    }
    return readings;
  }

  let book = null;
  let chapter = null;
  let verse = null;
  let matched = 0;

  for (const line of lines) {
    if (!line) continue;
    const h = line.match(headerRe);
    if (h) {
      const namePart = h[1].trim().toLowerCase().replace(/\.$/, '');
      book = variantList.find(([v]) => namePart === v || namePart.startsWith(v))?.[1] || bookHint || book;
      chapter = h[2];
      verse = h[3];
      continue;
    }
    if (!book || chapter == null) continue; // content line before any header seen; skip
    const rest = line.replace(contentPrefixRe, '');
    const readings = parseUnit(rest);
    if (!readings) continue;
    matched++;
    if (!byBookVerse.has(book)) byBookVerse.set(book, new Map());
    const verseMap = byBookVerse.get(book);
    const vk = `${chapter}:${verse}`;
    if (!verseMap.has(vk)) verseMap.set(vk, []);
    // No separately-attested "lemma" (base-text word being varied) beyond the
    // readings themselves in this plain-text apparatus format; omit it rather
    // than guess. `readings` alone still carries the full variant.
    verseMap.get(vk).push({ readings });
  }
  log(`[${sourceLabel}] matched ${matched} apparatus units across ${byBookVerse.size} books`);
  return byBookVerse;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  log('--- discovering LogosBible/SBLGNT file tree ---');
  const paths = await discoverTree();
  const candidates = pickApparatusFiles(paths);
  log(`Apparatus file candidates: ${JSON.stringify(candidates)}`);

  if (candidates.length === 0) {
    log('No apparatus-like file found by name heuristic; dumping full tree above for manual inspection. Skipping apparatus build this run.');
    return;
  }

  const merged = new Map(); // BOOK -> Map(vk -> entries[])
  for (const rel of candidates) {
    const url = `${RAW_BASE}/${rel}`;
    log(`Fetching ${url}`);
    let text;
    try {
      text = await fetchText(url, { label: rel });
    } catch (err) {
      log(`  failed: ${err.message}`);
      continue;
    }
    log(`  ${rel}: ${text.length} bytes; first 2500 chars:\n${text.slice(0, 2500)}`);
    const base = path.basename(rel).replace(/\.(txt|xml)$/i, '');
    const bookHint = FILENAME_TO_BOOK[base];
    if (!bookHint) log(`  (no filename->book mapping for "${base}"; relying on in-line book names only)`);
    const parsed = parseApparatusText(text, rel, bookHint);
    for (const [book, verseMap] of parsed) {
      if (!merged.has(book)) merged.set(book, new Map());
      const dest = merged.get(book);
      for (const [vk, entries] of verseMap) {
        if (!dest.has(vk)) dest.set(vk, []);
        dest.get(vk).push(...entries);
      }
    }
  }

  let totalVerseEntries = 0;
  for (const book of NT_BOOKS) {
    const verseMap = merged.get(book.id);
    if (!verseMap || verseMap.size === 0) continue;
    const obj = {};
    for (const [vk, entries] of verseMap) obj[vk] = entries;
    totalVerseEntries += verseMap.size;
    await writeFile(path.join(OUT_DIR, `${book.id}.json`), JSON.stringify(obj));
    log(`Wrote apparatus/${book.id}.json (${verseMap.size} verses with apparatus entries)`);
  }
  log(`Total: ${totalVerseEntries} verses with apparatus entries across ${merged.size} books.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
