// Derive the compact files the evidence panel loads from the raw per-book
// coverage fetched in CI (branch data-evidence). The raw files stay on that
// branch; only these derived files are committed to main.
//   node scripts/evidence/derive.mjs <rawDir> [outDir=data/evidence]
// rawDir holds coverage/<BOOK>.json ({ verses: { "c:v": [[ga, pageId|null, "c"?]] } })
// and optionally transcriptions/<GA>/<pageId>.json.
// Writes:
//   wit/<BOOK>/<c>.json   { rows: [[ga, pageId|null, fromV, toV, "p"|"c"]] }
//   summary/<BOOK>.json   { chapters: [[ [count, oldestGA, oldestYear, pageLevel] ]] }
//   tx/<BOOK>.json        { "c:v": { GA: pageId } }
//   timeline.json         { NT: { centuries, basis, books: [{ id, ch, v: [[cumulative counts]] }] } }
import fs from 'node:fs';
import path from 'node:path';

const raw = process.argv[2];
const out = process.argv[3] ?? 'data/evidence';
const cat = JSON.parse(fs.readFileSync('data/library/catalog.json', 'utf8'));
const books = JSON.parse(fs.readFileSync('data/bible/books.json', 'utf8')).filter((b) => b.testament === 'NT');
const fi = (f) => cat.fields.indexOf(f);
const c0 = new Map(cat.rows.map((r) => [r[fi('ga')], r[fi('c0')]]));
// The coverage map counts a manuscript only from the latest century its date range allows.
const c1 = new Map(cat.rows.map((r) => [r[fi('ga')], r[fi('c1')] ?? r[fi('c0')]]));
const placeable = (ga) => !ga.startsWith('P') && !ga.startsWith('l') && !(ga.startsWith('0') && parseInt(ga, 10) >= 46);
const CENT = Array.from({ length: 15 }, (_, i) => i + 2);

const gaKey = (ga) => [ga.startsWith('P') ? 0 : ga.startsWith('l') ? 3 : ga.startsWith('0') ? 1 : 2, parseInt(ga.replace(/\D/g, ''), 10) || 0];
const byGa = (a, b) => {
  const x = gaKey(a);
  const y = gaKey(b);
  return x[0] - y[0] || x[1] - y[1];
};
const write = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
};

// Transcription index: which pages carry which verses.
const txIndex = {};
const txDir = path.join(raw, 'transcriptions');
let txPages = 0;
if (fs.existsSync(txDir)) {
  for (const ga of fs.readdirSync(txDir)) {
    for (const f of fs.readdirSync(path.join(txDir, ga))) {
      const page = JSON.parse(fs.readFileSync(path.join(txDir, ga, f), 'utf8'));
      txPages++;
      for (const col of page.columns ?? [])
        for (const l of col.lines ?? [])
          for (const t of l.tokens ?? []) {
            if (!t.v) continue;
            const [b, c, v] = t.v.split('.');
            ((txIndex[b] ??= {})[`${c}:${v}`] ??= {})[ga] ??= page.pageId;
          }
    }
  }
}

const tl = { NT: { centuries: CENT, basis: '', books: [] } };
let pageHits = 0;
let catHits = 0;
let versesWith = 0;
let totalVerses = 0;
for (const b of books) {
  const f = path.join(raw, 'coverage', `${b.id}.json`);
  const cov = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { verses: {} };
  const nCh = b.chapters;
  const vc = b.verses ?? [];
  const summary = [];
  const tlb = { id: b.id, ch: [], v: [] };
  for (let c = 1; c <= nCh; c++) {
    const nv = vc[c - 1] ?? Math.max(0, ...Object.keys(cov.verses).filter((k) => k.startsWith(`${c}:`)).map((k) => Number(k.split(':')[1])));
    tlb.ch.push(nv);
    // Build ranges per manuscript and page.
    const open = new Map(); // key ga|pid|level → row
    const rows = [];
    const sumCh = [];
    for (let v = 1; v <= nv; v++) {
      totalVerses++;
      const hits = cov.verses[`${c}:${v}`] ?? [];
      const seen = new Map();
      for (const [ga, pid, lvl] of hits) {
        const level = lvl === 'c' ? 'c' : 'p';
        // A catalogue's "contains the Gospels" cannot place a fragment on a
        // verse: leave papyri, lectionaries and the later (mostly fragmentary)
        // majuscules out of catalogue-level coverage.
        if (level === 'c' && !placeable(ga)) continue;
        const prev = seen.get(ga);
        if (!prev || (prev.level === 'c' && level === 'p')) seen.set(ga, { pid: pid ?? null, level });
      }
      for (const [ga, { pid, level }] of seen) {
        const k = `${ga}|${pid}|${level}`;
        const r = open.get(k);
        if (r && r[3] === v - 1) r[3] = v;
        else {
          const nr = [ga, pid, v, v, level];
          rows.push(nr);
          open.set(k, nr);
        }
        if (level === 'p') pageHits++;
        else catHits++;
      }
      const gas = [...seen.keys()];
      const dated = gas.filter((g) => c0.get(g) != null).sort((x, y) => c0.get(x) - c0.get(y) || byGa(x, y));
      const oldest = dated[0] ?? null;
      const pl = [...seen.values()].filter((x) => x.level === 'p').length;
      if (gas.length) versesWith++;
      sumCh.push([gas.length, oldest, oldest ? c0.get(oldest) * 100 - 50 : null, pl]);
      tlb.v.push(CENT.map((cc) => gas.filter((g) => c1.get(g) != null && c1.get(g) <= cc).length));
    }
    rows.sort((x, y) => byGa(x[0], y[0]) || x[2] - y[2]);
    write(path.join(out, 'wit', b.id, `${c}.json`), { rows });
    summary.push(sumCh);
  }
  write(path.join(out, 'summary', `${b.id}.json`), { chapters: summary });
  write(path.join(out, 'tx', `${b.id}.json`), txIndex[b.id] ?? {});
  tl.NT.books.push(tlb);
}
tl.NT.basis = catHits
  ? 'Coverage comes from the INTF’s page index where it exists, and otherwise from the catalogue’s record of each manuscript’s contents.'
  : 'Coverage comes from the INTF’s page-by-page index for the 446 manuscripts fetched so far: nearly all papyri and majuscules, but few later minuscules, so the later centuries undercount.';
write(path.join(out, 'timeline.json'), tl);
console.log(JSON.stringify({ totalVerses, versesWith, pageHits, catHits, txPages, txVerses: Object.values(txIndex).reduce((a, x) => a + Object.keys(x).length, 0) }));
