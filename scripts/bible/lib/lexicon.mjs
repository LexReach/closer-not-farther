// Parser for STEPBible's TBESG ("Translators Brief lexicon of Extended
// Strongs for Greek"). Columns (tab-separated): baseStrong, disambigLabel,
// disambigStrong, lemma, transliteration, pos, gloss, fullDefinition.
import fs from "node:fs";
import path from "node:path";

const ROW_RE = /^G\d{4,5}[A-Za-z]?\t/;

export function parseLexicon(stepbibleDir) {
  const file = path.join(
    stepbibleDir,
    "Lexicons",
    "TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt"
  );
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split("\n");
  // key: disambiguated Strong's id (e.g. "G2424G"), also the base id when
  // unambiguous (e.g. "G3056"). value: { lemma, translit, gloss }
  const byDStrong = new Map();
  // key: base Strong's id (e.g. "G2424") -> first entry seen, used as a
  // fallback when a word's dStrong has no exact row (rare).
  const byBase = new Map();
  for (const line of lines) {
    if (!ROW_RE.test(line)) continue;
    const cols = line.split("\t");
    const base = cols[0].trim();
    const dStrong = (cols[2] || "").trim() || base;
    const lemma = (cols[3] || "").trim();
    const translit = (cols[4] || "").trim();
    const gloss = (cols[6] || "").trim();
    const entry = { lemma, translit, gloss };
    byDStrong.set(dStrong, entry);
    if (!byBase.has(base)) byBase.set(base, entry);
  }
  return { byDStrong, byBase };
}

export function lookupLexicon(lex, dStrong) {
  if (!dStrong) return null;
  const hit = lex.byDStrong.get(dStrong);
  if (hit) return hit;
  const base = dStrong.replace(/[A-Za-z]$/, "");
  return lex.byBase.get(base) || null;
}
