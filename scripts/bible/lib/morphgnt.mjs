import fs from "node:fs";
import path from "node:path";
import { foldGreek } from "./text.mjs";

/**
 * Parse one MorphGNT file into verses, in file order.
 * Returns a Map "chapter:verse" -> array of tokens:
 *   { text, word, norm, lemma, pos, parse, fold }
 * text = surface as printed (with punctuation), following SBLGNT.
 */
export function parseMorphgntFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const verses = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split(" ");
    if (cols.length < 7) continue;
    const ref = cols[0];
    const chapter = String(Number(ref.slice(2, 4)));
    const verse = String(Number(ref.slice(4, 6)));
    const pos = cols[1];
    const parse = cols[2];
    const text = cols[3];
    const word = cols[4];
    const norm = cols[5];
    const lemma = cols.slice(6).join(" ");
    const key = `${chapter}:${verse}`;
    let arr = verses.get(key);
    if (!arr) {
      arr = [];
      verses.set(key, arr);
    }
    arr.push({
      text,
      word,
      norm,
      lemma,
      pos,
      parse,
      fold: foldGreek(word),
      lemmaFold: foldGreek(lemma),
    });
  }
  return verses;
}

export function morphgntFilePath(morphgntDir, book) {
  return path.join(morphgntDir, `${book.morphgnt}-morphgnt.txt`);
}
