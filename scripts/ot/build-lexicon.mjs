// Builds data/bible/lex-hebrew.json from STEPBible's TBESH lexicon, with `count`
// computed from actual occurrences in the just-built data/bible/hebrew/<BOOK>.json files.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./books.mjs";
import { loadTbesh } from "./tbesh.mjs";

const STEPBIBLE_CACHE = path.resolve("scripts/ot/.cache/stepbible");
const HEBREW_DIR = path.resolve("data/bible/hebrew");
const OUT_PATH = path.resolve("data/bible/lex-hebrew.json");

function main() {
  const tbesh = loadTbesh(path.join(STEPBIBLE_CACHE, "TBESH.txt"));

  const counts = new Map();
  const seenNoLexicon = new Map();
  for (const book of BOOKS) {
    const p = path.join(HEBREW_DIR, `${book.usfm}.json`);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const chapter of data.chapters) {
      if (!chapter) continue;
      for (const verse of chapter) {
        if (!verse) continue;
        for (const [, strong] of verse) {
          if (!strong) continue;
          counts.set(strong, (counts.get(strong) || 0) + 1);
          if (!tbesh.has(strong)) {
            seenNoLexicon.set(strong, (seenNoLexicon.get(strong) || 0) + 1);
          }
        }
      }
    }
  }

  const lex = {};
  for (const [strong, count] of counts) {
    const entry = tbesh.get(strong);
    lex[strong] = {
      lemma: entry ? entry.lemma : "",
      translit: entry ? entry.translit : "",
      gloss: entry ? entry.gloss : "",
      count,
    };
  }

  // Order keys numerically (H1, H2, ... H9049) for a stable, readable diff.
  const ordered = Object.fromEntries(
    Object.keys(lex)
      .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
      .map((k) => [k, lex[k]])
  );

  fs.writeFileSync(OUT_PATH, JSON.stringify(ordered), "utf8");
  console.log(`Wrote ${Object.keys(ordered).length} lexicon entries to ${OUT_PATH}`);
  console.log(`Total word occurrences counted: ${[...counts.values()].reduce((a, b) => a + b, 0)}`);
  if (seenNoLexicon.size) {
    console.log(`Strong's ids with no TBESH entry (${seenNoLexicon.size}):`);
    for (const [s, c] of seenNoLexicon) console.log(`  ${s}: ${c}`);
  } else {
    console.log("Every Strong's id occurring in the text has a TBESH lexicon entry.");
  }
}

main();
