#!/usr/bin/env node
// Builds data/bible/books.json. Chapter/verse counts are the max across all
// four English texts (bsb, web, kjv, asv), since translations occasionally
// differ on which trailing verses/chapters they carry; run this after
// build-bsb.mjs and build-english.mjs.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./lib/books.mjs";
import { DATA_DIR } from "./lib/paths.mjs";

const VERSIONS = ["bsb", "web", "kjv", "asv"];

const out = BOOKS.map((b) => {
  const texts = VERSIONS.map((ver) =>
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, "text", ver, `${b.id}.json`), "utf8"))
  );
  const chapters = Math.max(...texts.map((t) => t.chapters.length));
  const verses = [];
  for (let c = 0; c < chapters; c++) {
    verses.push(Math.max(...texts.map((t) => t.chapters[c]?.length ?? 0)));
  }
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    testament: b.testament,
    chapters,
    verses,
  };
});

fs.writeFileSync(path.join(DATA_DIR, "books.json"), JSON.stringify(out));
console.log(`books.json: ${out.length} books`);
