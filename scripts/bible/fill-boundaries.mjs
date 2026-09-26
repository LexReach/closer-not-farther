// Fill Greek words that STEPBible TAGNT left without a Strong's number. These
// sit almost all at verse boundaries where TAGNT and the SBLGNT divide verses
// differently. Each gets the most frequent analysis (Strong's, parsing, gloss)
// of the same word form elsewhere in the New Testament. Run after the
// data-bible build: node scripts/bible/fill-boundaries.mjs
import fs from 'node:fs';

const dir = 'data/bible/greek';
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}]/gu, '');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const books = files.map((f) => [f, JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'))]);
const seen = new Map();
for (const [, b] of books)
  for (const ch of b.chapters)
    for (const v of ch ?? [])
      for (const w of v ?? []) {
        if (!w[1]) continue;
        const k = norm(w[0]);
        const m = seen.get(k) ?? new Map();
        const a = `${w[1]}\u0001${w[2]}\u0001${w[3]}`;
        m.set(a, (m.get(a) ?? 0) + 1);
        seen.set(k, m);
      }
let filled = 0;
let left = 0;
for (const [f, b] of books) {
  let changed = false;
  for (const ch of b.chapters)
    for (const v of ch ?? [])
      for (const w of v ?? []) {
        if (w[1]) continue;
        const m = seen.get(norm(w[0]));
        if (!m) {
          left++;
          continue;
        }
        const [best] = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
        [w[1], w[2], w[3]] = best.split('\u0001');
        filled++;
        changed = true;
      }
  if (changed) fs.writeFileSync(`${dir}/${f}`, JSON.stringify(b));
}
console.log(`filled ${filled} words from the same form elsewhere; ${left} left without an analysis`);
