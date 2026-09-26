#!/usr/bin/env node
// Task A: fetch public-domain English translations of four apocryphal texts,
// strip HTML, count occurrences of a candidate list of personal names, and
// list other capitalized (non-sentence-initial) words for human review.
//
// Runs in CI only (this repo's local sandbox blocks these hosts). Writes
// data/fetched/apocrypha-names.json. Does NOT commit the raw fetched texts.
//
// Usable both as `node scripts/extract-apocrypha-names.mjs` (writes the file
// itself) and as a module (`import { run } from './extract-apocrypha-names.mjs'`)
// for scripts/fetch-sources.mjs to call and log around.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'data', 'fetched', 'apocrypha-names.json');

export const USER_AGENT = 'closer-not-farther/1.0 (https://github.com/LexReach/closer-not-farther)';

// Every text is tried in order; the first URL that responds 200 with a
// plausible amount of body text is used, and the rest are skipped.
export const TEXTS = [
  {
    key: 'Gospel of Thomas',
    candidates: [
      { url: 'http://gnosis.org/naghamm/gthlamb.html', translation: 'Thomas O. Lambdin (Nag Hammadi Library, Coptic NHC II,2), hosted by the Gnostic Society Library' },
      { url: 'https://www.earlychristianwritings.com/text/thomas-lambdin.html', translation: 'Thomas O. Lambdin (Nag Hammadi Library, Coptic NHC II,2), as reproduced on Early Christian Writings' },
    ],
  },
  {
    key: 'Gospel of Philip',
    candidates: [
      { url: 'http://gnosis.org/naghamm/gop.html', translation: 'Wesley W. Isenberg (Nag Hammadi Library, Coptic NHC II,3), hosted by the Gnostic Society Library' },
      { url: 'https://www.earlychristianwritings.com/text/gospelphilip.html', translation: 'Wesley W. Isenberg (Nag Hammadi Library, Coptic NHC II,3), as reproduced on Early Christian Writings' },
    ],
  },
  {
    key: 'Gospel of Mary',
    candidates: [
      { url: 'http://gnosis.org/library/marygosp.htm', translation: 'Nag Hammadi Library / Berlin Codex (BG 8502) translation, hosted by the Gnostic Society Library' },
      { url: 'https://www.earlychristianwritings.com/text/gospelmary.html', translation: 'Berlin Codex (BG 8502) translation, as reproduced on Early Christian Writings' },
    ],
  },
  {
    key: 'Protevangelium of James',
    candidates: [
      { url: 'https://www.newadvent.org/fathers/0847.htm', translation: 'Alexander Walker, Ante-Nicene Fathers vol. 8, hosted by New Advent' },
      { url: 'https://en.wikisource.org/wiki/Ante-Nicene_Fathers/Volume_VIII/Apocrypha_of_the_New_Testament/The_Protevangelium_of_James', translation: 'Alexander Walker, Ante-Nicene Fathers vol. 8, as reproduced on Wikisource' },
      { url: 'https://www.earlychristianwritings.com/text/infancyjames-roberts.html', translation: 'Alexander Roberts et al. (ANF), as reproduced on Early Christian Writings' },
    ],
  },
];

// Existing entries' names (split on " / ") plus the broad biblical/early-
// Christian personal-name list from the task brief. Titles (Christ, Lord,
// Savior, Father, God) are deliberately excluded.
export const CANDIDATE_NAMES = [
  'Jesus', 'Thomas', 'Didymos', 'Didymus', 'Judas', 'Simon', 'Peter', 'Matthew', 'Mary',
  'Mariam', 'Mariamme', 'Magdalene', 'Salome', 'James', 'Andrew', 'Levi', 'Philip',
  'Joseph', 'John', 'Adam', 'Eve', 'Abraham', 'Isaac', 'Jacob', 'Moses', 'Elijah',
  'Zacharias', 'Elizabeth', 'Herod', 'Joachim', 'Anna', 'Reuben', 'Reubel', 'Simeon',
  'Annas', 'Samuel', 'David', 'Sophia', 'Echamoth', 'Echmoth', 'Seth', 'Cain', 'Abel',
  'Noah', 'Satan', 'Pilate', 'Caesar', 'Augustus', 'Euthine', 'Rufus', 'Solomon',
];

// Sentence-initial position is where ordinary capitalization is uninformative,
// so words there are excluded from the "other capitalized words" review list.
const STOPWORDS_NOT_NAMES = new Set([
  'I', 'A', 'The', 'This', 'That', 'These', 'Those', 'It', 'He', 'She', 'They',
  'God', 'Lord', 'Christ', 'Father', 'Son', 'Savior', 'Saviour', 'Amen', 'O',
]);

function decodeEntities(str) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
  return str
    .replace(/&(amp|lt|gt|quot|apos|nbsp|mdash|ndash|rsquo|lsquo|rdquo|ldquo|hellip);/g, (_, n) => named[n])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

export function htmlToText(html) {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|head|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|br|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  out = decodeEntities(out);
  out = out.replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function splitSentences(text) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function countNames(text, candidates) {
  const counts = {};
  for (const name of candidates) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const m = text.match(re);
    if (m && m.length) counts[name] = m.length;
  }
  return counts;
}

export function reviewCapitalizedWords(text, candidates) {
  const candidateSet = new Set(candidates);
  const sentences = splitSentences(text);
  const freq = {};
  for (const sentence of sentences) {
    const words = sentence.match(/[A-Za-z’']+/g) || [];
    words.forEach((word, i) => {
      if (i === 0) return; // sentence-initial: uninformative
      if (!/^[A-Z][a-z]+$/.test(word)) return; // shape: Capital + lowercase letters
      if (candidateSet.has(word)) return; // already tallied as a candidate name
      if (STOPWORDS_NOT_NAMES.has(word)) return;
      freq[word] = (freq[word] || 0) + 1;
    });
  }
  return freq;
}

async function fetchWithTimeout(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

export async function run({ log = console.log } = {}) {
  const out = { fetched_at: new Date().toISOString(), texts: {}, failed: {} };

  for (const t of TEXTS) {
    log(`[apocrypha] ${t.key}: trying ${t.candidates.length} URL(s)...`);
    let used = null;
    const errors = [];
    for (const cand of t.candidates) {
      try {
        log(`[apocrypha]   GET ${cand.url}`);
        const { ok, status, body } = await fetchWithTimeout(cand.url);
        if (!ok || !body || body.length < 500) {
          errors.push(`${cand.url} -> HTTP ${status}, body length ${body?.length ?? 0}`);
          log(`[apocrypha]     failed: HTTP ${status}, length ${body?.length ?? 0}`);
          continue;
        }
        used = { ...cand, body, status };
        log(`[apocrypha]     OK: HTTP ${status}, length ${body.length}`);
        break;
      } catch (err) {
        errors.push(`${cand.url} -> ${err.message}`);
        log(`[apocrypha]     error: ${err.message}`);
      }
    }
    if (!used) {
      out.failed[t.key] = errors;
      log(`[apocrypha] ${t.key}: ALL URLS FAILED`);
      continue;
    }
    const text = htmlToText(used.body);
    const counts = countNames(text, CANDIDATE_NAMES);
    const review = reviewCapitalizedWords(text, CANDIDATE_NAMES);
    // Diagnostic only: prints the stripped text to the JOB LOG (never written
    // to a committed file) so a human reviewer can tell real body-text
    // occurrences apart from site-chrome contamination (nav bars, translator
    // bylines, footers) before trusting the counts above.
    if (process.env.DUMP_FULL_TEXT === 'true') {
      log(`[apocrypha] ${t.key} FULL STRIPPED TEXT (diagnostic, not committed) >>>\n${text}\n<<< END ${t.key}`);
    }
    out.texts[t.key] = {
      source_url: used.url,
      translation: used.translation,
      fetch_date: out.fetched_at,
      text_length_chars: text.length,
      name_counts: counts,
      review_capitalized_words: review,
    };
    log(`[apocrypha] ${t.key}: used ${used.url}; ${Object.keys(counts).length} candidate names attested; ${Object.keys(review).length} other capitalized words for review.`);
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  log(`[apocrypha] wrote ${OUT_PATH}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error('[apocrypha] FATAL', err);
    process.exitCode = 1;
  });
}
