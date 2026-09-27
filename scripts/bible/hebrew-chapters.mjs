#!/usr/bin/env node
// Split the Hebrew books into one file per chapter, already in English verse
// numbers, so the Reader fetches ~20 KB for Genesis 1 instead of the 1 MB book:
//   node scripts/bible/hebrew-chapters.mjs [outDir=dist/bible/hebrew-ch]
// The re-indexing is the same as toEnglishVersification in src/reader/bible.ts
// (which remains the fallback when these files are absent, as in dev).
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'dist/bible/hebrew-ch';
const books = JSON.parse(fs.readFileSync('data/bible/books.json', 'utf8')).filter((b) => b.testament === 'OT');
let files = 0;
for (const b of books) {
  const src = `data/bible/hebrew/${b.id}.json`;
  if (!fs.existsSync(src)) continue;
  const { chapters: heb, map = {} } = JSON.parse(fs.readFileSync(src, 'utf8'));
  const slot = new Map();
  const eng = b.verses.map((n, ci) =>
    Array.from({ length: n }, (_, vi) => {
      const k = map[`${ci + 1}:${vi + 1}`] ?? `${ci + 1}:${vi + 1}`;
      const [hc, hv] = k.split(':').map(Number);
      const words = [...(heb[hc - 1]?.[hv - 1] ?? [])];
      slot.set(k, words);
      return words;
    }),
  );
  // A Hebrew verse with no English number (a Psalm's title) joins the verse after it.
  let pending = [];
  let last = null;
  heb.forEach((ch, ci) =>
    ch.forEach((ws, vi) => {
      const target = slot.get(`${ci + 1}:${vi + 1}`);
      if (!target) return void pending.push(...ws);
      target.unshift(...pending);
      pending = [];
      last = target;
    }),
  );
  if (pending.length) last?.push(...pending);
  fs.mkdirSync(path.join(out, b.id), { recursive: true });
  eng.forEach((ch, ci) => {
    fs.writeFileSync(path.join(out, b.id, `${ci + 1}.json`), JSON.stringify(ch));
    files++;
  });
}
console.log(`hebrew-chapters: ${files} chapter files in ${out}`);
