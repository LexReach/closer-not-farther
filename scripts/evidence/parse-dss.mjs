#!/usr/bin/env node
// Parse the biblical rows of Wikipedia's "List of the Dead Sea Scrolls" (raw
// wikitext saved by .github/workflows/ot-refs.yml; the table cites Fitzmyer
// 2008 and links each row to the Leon Levy Dead Sea Scrolls Digital Library)
// into witness entries with exact verse ranges.
//   node scripts/ot/parse-dss.mjs [--dump]
import fs from 'node:fs';

const src = 'data/evidence/ot/refs/wp-List_of_the_Dead_Sea_Scrolls.wiki';
const wiki = fs.readFileSync(src, 'utf8');
const books = JSON.parse(fs.readFileSync('data/bible/books.json', 'utf8')).filter((b) => b.testament === 'OT');
const NAME = new Map();
for (const b of books) NAME.set(b.name.toLowerCase(), b.id);
for (const [k, v] of Object.entries({ psalm: 'PSA', 'song of solomon': 'SNG', 'song of songs': 'SNG', canticles: 'SNG', qoheleth: 'ECC', 'i samuel': '1SA', 'ii samuel': '2SA', 'i kings': '1KI', 'ii kings': '2KI', '1 kgs': '1KI', '2 kgs': '2KI', 'i chronicles': '1CH', 'ii chronicles': '2CH', ezekiel: 'EZK', hosea: 'HOS', joel: 'JOL', obadiah: 'OBA', nahum: 'NAM', zephaniah: 'ZEP', lamentations: 'LAM' })) NAME.set(k, v);
const bookRe = new RegExp(`^(${[...NAME.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/ /g, '\\s+')).join('|')})\\b`, 'i');

const clean = (s) =>
  s
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{sup\|([^}]*)\}\}/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

// Rows of every wikitable: cells start a line with "|" (or follow "||"); "rowspan" carries a cell down.
const rows = [];
for (const table of wiki.split(/\{\|(?=class)/).slice(1)) {
  const body = table.split(/\n\|\}/)[0];
  const carry = [];
  for (const raw of body.split(/\n\|-[^\n]*/).slice(1)) {
    if (/^\s*!/.test(raw.trim())) continue;
    const cells = [];
    for (const line of raw.split('\n')) {
      if (!line.startsWith('|')) {
        if (cells.length) cells[cells.length - 1].t += '\n' + line;
        continue;
      }
      for (const part of line.slice(1).split('||')) {
        const m = /^\s*((?:rowspan|colspan|style)[^|]*)\|(.*)$/s.exec(part);
        const attrs = m ? m[1] : '';
        const span = Number((/rowspan="?(\d+)/.exec(attrs) ?? [])[1] ?? 1);
        cells.push({ t: m ? m[2] : part, span });
      }
    }
    // Fill carried rowspan cells into their columns.
    const out = [];
    let ci = 0;
    for (let col = 0; col < 8; col++) {
      if (carry[col]?.left > 0) {
        out[col] = carry[col].t;
        carry[col].left--;
      } else if (ci < cells.length) {
        const c = cells[ci++];
        out[col] = c.t;
        if (c.span > 1) carry[col] = { t: c.t, left: c.span - 1 };
      }
    }
    rows.push(out.map((x) => (x == null ? '' : x)));
  }
}

// "Genesis 1:1–27; 2:14–19; 4:2–4; 5:13", "Exodus 1–4; 5:3–17; 6:4–21,25"
function parseRefs(text, fallbackBook, log) {
  const out = [];
  let book = fallbackBook;
  const norm = text
    .replace(/\n+/g, '; ')
    .replace(/^\s*\|\s*/, '')
    .replace(/[–—]/g, '-')
    .replace(/\(\?\)|\?|\(\)|\[|\]|\.\.\.|…/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+(?:and|followed directly by)\s+/gi, '; ')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/:\s+/g, ':')
    .replace(/\s+/g, ' ');
  for (let seg of norm.split(/;/)) {
    seg = seg.trim().replace(/^and\s+/i, '');
    if (!seg) continue;
    const bm = bookRe.exec(seg);
    if (bm) {
      book = NAME.get(bm[1].toLowerCase().replace(/\s+/g, ' '));
      seg = seg.slice(bm[0].length).trim();
    }
    if (!book) return null;
    const b = books.find((x) => x.id === book);
    let ch = null;
    for (let part of seg.split(',')) {
      part = part.trim().replace(/[?]/g, '');
      if (!part) continue;
      let m;
      const last = (c) => b.verses[c - 1];
      if ((m = /^(\d+):(\d+)[a-z]?-(\d+):(\d+)[a-z]?$/.exec(part))) (ch = +m[3]), out.push([book, +m[1], +m[2], +m[3], +m[4]]);
      else if ((m = /^(\d+):(\d+)[a-z]?-(\d+)[a-z]?$/.exec(part))) (ch = +m[1]), out.push([book, ch, +m[2], ch, +m[3]]);
      else if ((m = /^(\d+)[a-z]?-(\d+):(\d+)[a-z]?$/.exec(part)) && ch) out.push([book, ch, +m[1], +m[2], +m[3]]), (ch = +m[2]);
      else if ((m = /^(\d+):(\d+)[a-z]?$/.exec(part))) (ch = +m[1]), out.push([book, ch, +m[2], ch, +m[2]]);
      else if ((m = /^(\d+)[a-z]?-(\d+)[a-z]?$/.exec(part)) && ch) out.push([book, ch, +m[1], ch, +m[2]]);
      else if ((m = /^(\d+)[a-z]?$/.exec(part)) && ch) out.push([book, ch, +m[1], ch, +m[1]]);
      else if ((m = /^(\d+)-(\d+)$/.exec(part)) && !ch) out.push([book, +m[1], 1, +m[2], last(+m[2]) ?? 1]);
      else if ((m = /^(\d+)$/.exec(part)) && !ch) out.push([book, +m[1], 1, +m[1], last(+m[1]) ?? 1]);
      else {
        log.push(`unparsed "${part}" in "${text}"`);
        continue;
      }
    }
  }
  // Drop references outside the book (a typo or another versification).
  return out.filter(([bk, c1, v1, c2, v2]) => {
    const b = books.find((x) => x.id === bk);
    const ok = c1 <= b.chapters && c2 <= b.chapters && v1 <= (b.verses[c1 - 1] ?? 0) + 1 && v2 <= (b.verses[c2 - 1] ?? 0) + 1;
    if (!ok) log.push(`out of range ${bk} ${c1}:${v1}-${c2}:${v2}`);
    return ok;
  });
}

// Script periods (Cross's typology) as year ranges.
const PERIOD = [
  [/post-herodian/i, 'Post-Herodian script, c. 70-135 AD', 100],
  [/archaic/i, 'Archaic script, c. 250-150 BC', -200],
  [/early hasmonean/i, 'Early Hasmonean script, c. 150-100 BC', -125],
  [/late hasmonean/i, 'Late Hasmonean script, c. 100-30 BC', -65],
  [/hasmonean.*herodian|transitional/i, 'Late Hasmonean or early Herodian script, c. 50 BC-AD 1', -25],
  [/hasmonean/i, 'Hasmonean script, c. 150-30 BC', -90],
  [/early herodian/i, 'Early Herodian script, c. 30 BC-AD 1', -15],
  [/late herodian/i, 'Late Herodian script, c. 20-70 AD', 45],
  [/herodian/i, 'Herodian script, c. 30 BC-AD 70', 20],
  // Periods only: counted from the latest year they allow (the Qumran caves were closed by AD 68).
  [/early hellenistic/i, 'Early Hellenistic period, before c. 150 BC', -150],
  [/hellenistic.?roman/i, 'Hellenistic-Roman period, before AD 68', 68],
  [/^roman/i, 'Roman period, before AD 68', 68],
];
function dating(s) {
  const t = clean(s);
  for (const [re, date, year] of PERIOD) if (re.test(t)) return { date, year };
  let m = /(\d{2,4})\s*(BC|BCE|AD|CE)/i.exec(t);
  if (m) return { date: t, year: (/B/i.test(m[2]) ? -1 : 1) * Number(m[1]) };
  m = /(\d)(?:st|nd|rd|th) century (BC|BCE|AD|CE)?/i.exec(t);
  if (m) {
    const c = Number(m[1]);
    const bc = /B/i.test(m[2] ?? '');
    return { date: t, year: bc ? -(c * 100 - 50) : c * 100 - 50 };
  }
  return null;
}

const log = [];
const out = [];
for (const r of rows) {
  const [sig, bookCell, num, contents, lang, date] = r.map((x) => x ?? '');
  const c = clean(contents);
  if (!/\d/.test(c)) continue;
  const lc = clean(lang);
  if (!/hebrew|greek|aramaic/i.test(lc)) continue;
  const name = clean(sig);
  if (/tg|targum/i.test(name)) continue; // translations into Aramaic, not the biblical text
  const fb = (() => {
    const m = bookRe.exec(clean(bookCell));
    return m ? NAME.get(m[1].toLowerCase().replace(/\s+/g, ' ')) : null;
  })();
  const refs = parseRefs(c, fb, log);
  if (!refs || !refs.length) {
    if (fb || bookRe.test(c)) log.push(`no ranges for ${name} (${clean(num)}): "${c}"`);
    continue;
  }
  const d = dating(date);
  if (!d) {
    log.push(`no date for ${name} (${clean(num)}): "${clean(date)}" (left out)`);
    continue;
  }
  const ll = (/href=|https:\/\/www\.deadseascrolls\.org\.il[^\s\]]*/.exec(r[7] ?? '') ?? [])[0];
  out.push({
    id: clean(num) || name,
    name,
    siglum: clean(num) && clean(num) !== name ? `${name} (${clean(num)})` : name,
    date: d.date,
    year: d.year,
    lang: /greek/i.test(lc) ? 'grc' : 'hbo',
    contents: refs.map(([b, c1, v1, c2, v2]) => `${b}.${c1}.${v1}-${b}.${c2}.${v2}`),
    links: { images: ll && ll.startsWith('https') ? ll : null, info: 'https://en.wikipedia.org/wiki/List_of_the_Dead_Sea_Scrolls' },
    embed: false,
    compiled: true,
    source: 'Wikipedia, List of the Dead Sea Scrolls (citing Fitzmyer 2008; Leon Levy DSS Digital Library)',
    note: `Contents as listed: ${c}.`,
  });
}
if (process.argv.includes('--dump')) console.log(JSON.stringify(out.slice(0, 3), null, 1));
fs.writeFileSync('data/evidence/ot/refs/dss-parsed.json', JSON.stringify({ witnesses: out, log }, null, 1));
console.log(`${rows.length} rows, ${out.length} biblical scrolls with ranges, ${log.length} log lines`);
