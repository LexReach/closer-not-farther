#!/usr/bin/env node
// Builds data/bible/books.json. Chapter/verse counts come from the BSB text
// (data/bible/text/bsb/<BOOK>.json), so run this after build-bsb.mjs.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./lib/books.mjs";
import { DATA_DIR } from "./lib/paths.mjs";

const bsbDir = path.join(DATA_DIR, "text", "bsb");

const out = BOOKS.map((b) => {
  const bsb = JSON.parse(fs.readFileSync(path.join(bsbDir, `${b.id}.json`), "utf8"));
  const verses = bsb.chapters.map((ch) => ch.length);
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    testament: b.testament,
    chapters: bsb.chapters.length,
    verses,
  };
});

fs.writeFileSync(path.join(DATA_DIR, "books.json"), JSON.stringify(out));
console.log(`books.json: ${out.length} books`);
