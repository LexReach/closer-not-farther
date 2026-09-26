#!/usr/bin/env node
// Builds data/bible/lex-greek.json from the STEPBible TBESG lexicon, with
// `count` computed from the just-built data/bible/greek/<BOOK>.json files.
// Run this after build-greek.mjs.
import fs from "node:fs";
import path from "node:path";
import { NT_BOOKS } from "./lib/books.mjs";
import { DATA_DIR, SRC } from "./lib/paths.mjs";
import { parseLexicon, lookupLexicon } from "./lib/lexicon.mjs";

const greekDir = path.join(DATA_DIR, "greek");
const lex = parseLexicon(SRC.stepbible);

const counts = new Map();
for (const book of NT_BOOKS) {
  const d = JSON.parse(fs.readFileSync(path.join(greekDir, `${book.id}.json`), "utf8"));
  for (const chapter of d.chapters) {
    for (const verse of chapter) {
      if (!verse) continue;
      for (const [, strong] of verse) {
        if (!strong) continue;
        counts.set(strong, (counts.get(strong) || 0) + 1);
      }
    }
  }
}

const out = {};
let misses = 0;
for (const [strong, count] of counts) {
  const entry = lookupLexicon(lex, strong);
  if (!entry) {
    misses++;
    out[strong] = { lemma: "", translit: "", gloss: "", count };
    continue;
  }
  out[strong] = { lemma: entry.lemma, translit: entry.translit, gloss: entry.gloss, count };
}

fs.writeFileSync(path.join(DATA_DIR, "lex-greek.json"), JSON.stringify(out));
console.log(`lex-greek.json: ${Object.keys(out).length} entries, ${misses} without a lexicon match`);
