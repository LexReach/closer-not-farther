#!/usr/bin/env node
// Add the Hebrew Bible to the coverage map: per verse (English numbering),
// cumulative counts of the witnesses in data/evidence/ot/witnesses.json whose
// `contents` ranges carry it, by century.
//   node scripts/evidence/derive-ot.mjs [evidenceDir=data/evidence]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'data/evidence';
const books = JSON.parse(fs.readFileSync('data/bible/books.json', 'utf8')).filter((b) => b.testament === 'OT');
const { witnesses } = JSON.parse(fs.readFileSync(path.join(dir, 'ot/witnesses.json'), 'utf8'));
const order = new Map(books.map((b, i) => [b.id, i]));
const ord = (b, c, v) => order.get(b) * 1e6 + c * 1e3 + v;
const ref = (s) => {
  const [b, c, v] = s.split('.');
  return ord(b, +c, +v);
};

// As on the NT side, a witness counts from the latest century its date allows:
// "c. 125-100 BC" counts from the 1st century BC, "c. 30 BC - 20 AD" from the 1st AD.
function latestYear(w) {
  const m = /(\d{1,4})\s*(BC|AD)?\s*[-–]\s*(\d{1,4})\s*(BC|AD)/.exec(w.date);
  const end = m ? (m[4] === 'BC' ? -1 : 1) * Number(m[3]) : w.year;
  return Math.max(end, w.year);
}
const century = (y) => (y < 0 ? -(Math.floor((-y - 1) / 100) + 1) : Math.ceil(y / 100));

const wit = witnesses
  .filter((w) => w.contents.length)
  .map((w) => ({ id: w.id, c: century(latestYear(w)), spans: w.contents.map((r) => r.split('-').map(ref)) }));
const first = Math.min(...wit.map((w) => w.c));
const last = Math.max(...wit.map((w) => w.c));
const centuries = [];
for (let c = first; c <= last; c++) if (c !== 0) centuries.push(c);

const out = { centuries, basis: '', books: [] };
let verses = 0;
for (const b of books) {
  const tb = { id: b.id, ch: b.verses, v: [] };
  b.verses.forEach((n, ci) => {
    for (let v = 1; v <= n; v++) {
      const k = ord(b.id, ci + 1, v);
      const cs = wit.filter((w) => w.spans.some(([a, z]) => k >= a && k <= z)).map((w) => w.c);
      tb.v.push(centuries.map((cc) => cs.filter((c) => c <= cc).length));
      verses++;
    }
  });
  out.books.push(tb);
}
out.basis = `From a compiled list of ${wit.length} key witnesses (the Masoretic codices, the Samaritan Pentateuch, Dead Sea Scrolls and the Septuagint codices), each matched by the verse range it contains. A fragmentary scroll’s range runs from its first to its last surviving verse, so the early centuries overcount inside those spans; thousands of later Hebrew manuscripts are not listed, so the later centuries undercount.`;

const tlPath = path.join(dir, 'timeline.json');
const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
tl.OT = out;
fs.writeFileSync(tlPath, JSON.stringify(tl));
const lit = (i) => out.books.reduce((s, b) => s + b.v.filter((x) => x[i] > 0).length, 0);
console.log(JSON.stringify({ verses, witnesses: wit.length, centuries, byCentury: Object.fromEntries(centuries.map((c, i) => [c, lit(i)])) }));
