// Parser for STEPBible's TAGNT ("Translators Amalgamated Greek NT") files.
// Files are TSV with a long prose preamble; the data rows we want look like:
//   Mat.1.1#01=NKO<TAB>Βίβλος (Biblos)<TAB>[The] book<TAB>G0976=N-NSF<TAB>βίβλος=book<TAB>...
// See scripts/bible/README.md for the column layout we rely on.
import fs from "node:fs";
import path from "node:path";
import { foldGreek } from "./text.mjs";

const REF_RE = /^([A-Za-z0-9]{3})\.(\d+)\.(\d+)#(\d+)=(\S*)$/;

function parseGreekCell(cell) {
  // "Βίβλος (Biblos)" -> "Βίβλος"; occasionally there is no transliteration.
  const i = cell.indexOf(" (");
  return i === -1 ? cell.trim() : cell.slice(0, i).trim();
}

// STEPBible's own N/K/O "significance" flag tracks the Nestle-Aland stream,
// not SBLGNT specifically, and is occasionally stale (e.g. it marks the
// Mark 16:9-20 long ending as "KO" even though its own "editions" column
// lists NA28+NA27 for those very words, and MorphGNT/SBLGNT does print the
// passage). Since our word list *is* SBLGNT (via MorphGNT), match on the
// "editions" column instead: include a TAGNT word if SBL, NA28 or NA27 is
// one of the editions it lists as reading that way.
const EDITIONS_RE = /\b(SBL|NA28|NA27)\b/;

function isCriticalTextEdition(editions) {
  return EDITIONS_RE.test(editions);
}

/**
 * Parse one TAGNT file into a Map keyed by "Abbr.chapter.verse" (e.g. "Mat.1.1")
 * -> array of word entries in ascending #NN order, restricted to words present
 * in the critical/NA text stream.
 * Each entry: { idx, greek, dStrong, morph, csg, sStrong }
 */
export function parseTagntFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n");
  const verses = new Map();
  for (const line of lines) {
    if (!line || line.charCodeAt(0) === 0xfeff) continue;
    const cols = line.split("\t");
    const m = REF_RE.exec(cols[0]);
    if (!m) continue;
    const [, abbr, chapter, verse, idxStr] = m;
    const editions = cols[5] || "";
    if (!isCriticalTextEdition(editions)) continue;
    const dCell = cols[3] || "";
    const eq = dCell.indexOf("=");
    if (eq === -1) continue;
    const dStrong = dCell.slice(0, eq).trim();
    const morph = dCell.slice(eq + 1).trim();
    const glossCell = cols[4] || "";
    const glossEq = glossCell.indexOf("=");
    const lemma = glossEq === -1 ? "" : glossCell.slice(0, glossEq).trim();
    const dictGloss = glossEq === -1 ? "" : glossCell.slice(glossEq + 1).trim();
    const csgRaw = (cols[9] || "").trim();
    // Sub-meanings look like "Jesus»Jesus|Jesus@Mat.1.1" (proper nouns) or
    // ": faith»faith|1_faith" (a word with more than one sense, prefixed with
    // ":" and suffixed with its sense group). Take the first segment before
    // », | or @, and drop a leading ":".
    const csg = csgRaw ? csgRaw.split(/[»|@]/)[0].replace(/^:\s*/, "").trim() : "";
    const sStrongRaw = (cols[11] || "").trim();
    const sStrong = sStrongRaw.replace(/_[A-Za-z]$/, "");
    const greek = parseGreekCell(cols[1] || "");
    const key = `${abbr}.${chapter}.${verse}`;
    let arr = verses.get(key);
    if (!arr) {
      arr = [];
      verses.set(key, arr);
    }
    arr.push({
      idx: Number(idxStr),
      greek,
      fold: foldGreek(greek),
      lemmaFold: foldGreek(lemma),
      dStrong,
      morph,
      gloss: csg || dictGloss,
      sStrong,
    });
  }
  for (const arr of verses.values()) arr.sort((a, b) => a.idx - b.idx);
  return verses;
}

/**
 * Load both TAGNT files and return a single lookup: verseKey -> word entries.
 * verseKey uses our tagntAbbr convention, e.g. "Mat.1.1".
 */
export function loadTagnt(stepbibleDir) {
  const dir = path.join(stepbibleDir, "Translators Amalgamated OT+NT");
  const files = [
    "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
    "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
  ];
  const merged = new Map();
  for (const f of files) {
    const parsed = parseTagntFile(path.join(dir, f));
    for (const [k, v] of parsed) merged.set(k, v);
  }
  return merged;
}
