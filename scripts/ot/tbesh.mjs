// Parser for STEPBible's TBESH (Translators Brief lexicon of Extended Strongs for
// Hebrew). Tab-separated columns (verified against the file's own header rows):
//   1 eStrong (e.g. "H0001")   2 dStrong (disambiguated, e.g. "H0001G =")
//   3 uStrong                  4 Hebrew form (lemma)
//   5 Transliteration          6 Morph (Tyndale's own brief code, not OSHB)
//   7 Gloss (short)            8 Meaning (long, HTML-ish, not used here)
//
// A single bare eStrong (e.g. H0001) typically has several disambiguated rows (senses,
// proper-name uses, etc.); we keep the first row seen per bare eStrong as the
// lexicon's headword sense, which is consistently the general/primary sense in this
// file's ordering (checked by hand for H0001, H0430).
import fs from "node:fs";
import { normalizeStrongId } from "./books.mjs";

export function loadTbesh(path) {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const byStrong = new Map(); // "H430" -> { lemma, translit, gloss }
  for (const line of lines) {
    if (!line || !/^H\d/.test(line)) continue;
    const cols = line.split("\t");
    if (cols.length < 7) continue;
    const rawStrong = cols[0].trim(); // "H0001"
    const m = rawStrong.match(/^H(\d+)/);
    if (!m) continue;
    const key = normalizeStrongId("H", m[1]);
    if (byStrong.has(key)) continue; // keep first (primary) sense only
    const lemma = (cols[3] || "").trim();
    const translit = (cols[4] || "").trim();
    const gloss = (cols[6] || "").trim();
    if (!lemma && !gloss) continue;
    byStrong.set(key, { lemma, translit, gloss });
  }
  return byStrong;
}
