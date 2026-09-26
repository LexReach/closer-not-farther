#!/usr/bin/env node
// Builds data/bible/greek/<BOOK>.json for all 27 NT books.
//
// Word list & surface text: MorphGNT (github.com/morphgnt/sblgnt), which is
// the SBLGNT text merged with morphological tagging (CC BY-SA 3.0 tagging;
// SBLGNT text itself is CC BY 4.0).
// Strong's numbers, Robinson-style morph codes and short contextual glosses:
// STEPBible TAGNT, matched onto the MorphGNT word list per verse by spelling
// (falling back to a small look-ahead/behind window to absorb minor textual
// variants between SBLGNT and the NA-based text TAGNT anchors to).
import fs from "node:fs";
import path from "node:path";
import { NT_BOOKS } from "./lib/books.mjs";
import { DATA_DIR, SRC } from "./lib/paths.mjs";
import { parseMorphgntFile, morphgntFilePath } from "./lib/morphgnt.mjs";
import { loadTagnt } from "./lib/tagnt.mjs";
import { alignGreedy } from "./lib/align.mjs";

const outDir = path.join(DATA_DIR, "greek");
fs.mkdirSync(outDir, { recursive: true });

const tagnt = loadTagnt(SRC.stepbible);

let totalWords = 0;
let matchedWords = 0;

for (const book of NT_BOOKS) {
  const mgFile = morphgntFilePath(SRC.morphgnt, book);
  const verses = parseMorphgntFile(mgFile);

  // Determine chapter/verse extents from MorphGNT itself.
  let maxChapter = 0;
  const versesByChapter = new Map();
  for (const key of verses.keys()) {
    const [c, v] = key.split(":").map(Number);
    maxChapter = Math.max(maxChapter, c);
    if (!versesByChapter.has(c)) versesByChapter.set(c, new Set());
    versesByChapter.get(c).add(v);
  }

  const chapters = [];
  for (let c = 1; c <= maxChapter; c++) {
    const vSet = versesByChapter.get(c);
    const maxVerse = vSet ? Math.max(...vSet) : 0;
    const chapterArr = [];
    for (let v = 1; v <= maxVerse; v++) {
      const gTokens = verses.get(`${c}:${v}`);
      if (!gTokens) {
        chapterArr.push(null);
        continue;
      }
      const tKey = `${book.tagntAbbr}.${c}.${v}`;
      const tTokens = tagnt.get(tKey) || [];
      const aligned = alignGreedy(
        gTokens,
        tTokens,
        (g, t) => g.fold === t.fold || (g.lemmaFold && g.lemmaFold === t.lemmaFold)
      );
      const words = gTokens.map((g, i) => {
        const t = aligned[i];
        totalWords++;
        if (t) matchedWords++;
        const strong = t ? t.dStrong : "";
        const morph = t ? t.morph : "";
        const gloss = t ? t.gloss : "";
        return [g.text, strong, morph, gloss];
      });
      chapterArr.push(words);
    }
    chapters.push(chapterArr);
  }

  const out = { book: book.id, lang: "grc", chapters };
  fs.writeFileSync(path.join(outDir, `${book.id}.json`), JSON.stringify(out));
}

console.log(`Greek words: ${totalWords}, matched to TAGNT: ${matchedWords} (${((matchedWords / totalWords) * 100).toFixed(2)}%)`);
