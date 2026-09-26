// Parser for STEPBible's TAHOT (Translators Amalgamated Hebrew OT) text files.
//
// Format (tab-separated, UTF-8), one "record" per group of lines:
//   # Gen.1.1<TAB>be.re.Shit (...)<TAB>ba.Ra' (...)<TAB>...      <- ref + per-word transliteration+Hebrew
//   #_Translation<TAB>in/ beginning<TAB>he created<TAB>...        <- per-word English gloss
//   #_Word+Grammar<TAB>H9003/H7225G=HR/Ncfsa<TAB>...              <- per-word extended-Strong's+morph
//   #_Significant variant<TAB>...                                 <- optional notes, skipped
//
// Long verses overflow into continuation records whose ref line starts with "#_" instead
// of "# " (e.g. "#_Gen.1.4" following "# Gen.1.4"); these must be concatenated in order
// to reconstruct the full per-word gloss list for the verse. We rely on this alignment
// being word-for-word with morphhb's own <w> tokenization (verified by hand: Gen 1:4 has
// 10 + 2 = 12 word slots across the two TAHOT records, and 12 <w> elements in morphhb).
import fs from "node:fs";
import { USFM_BY_TAHOT } from "./books.mjs";

function cleanGloss(raw) {
  if (raw == null) return "";
  return raw
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Parses one TAHOT file's text and merges its per-verse word-gloss arrays into `out`
// (a Map from "USFM.C.V" to string[] of per-word glosses, in morphhb <w> order).
export function parseTahotInto(text, out) {
  const lines = text.split(/\r?\n/);
  let currentKey = null; // "USFM.C.V"
  let currentWords = [];
  let sawTranslationForCurrentRecord = false;

  const flush = () => {
    if (currentKey && currentWords.length) {
      const prev = out.get(currentKey);
      out.set(currentKey, prev ? prev.concat(currentWords) : currentWords.slice());
    }
    currentWords = [];
  };

  for (const line of lines) {
    if (!line || line[0] !== "#") continue;
    const tab = line.indexOf("\t");
    const label = tab === -1 ? line : line.slice(0, tab);

    if (label === "#_Translation") {
      const cells = line.split("\t").slice(1);
      // Rows are padded with trailing empty tab-cells to a fixed column width (16 word
      // slots per subrecord in these files); strip that padding so the gloss count
      // matches the verse's actual word count instead of always being a multiple of 16.
      while (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
      currentWords.push(...cells.map(cleanGloss));
      sawTranslationForCurrentRecord = true;
      continue;
    }
    if (label === "#_Word+Grammar" || label === "#_Significant variant") {
      continue; // not needed for gloss extraction
    }

    // Otherwise this is a ref line: either "# Book.C.V..." (new verse) or
    // "#_Book.C.V..." (continuation of the verse currently being accumulated).
    const isContinuation = line.startsWith("#_");
    const refCell = label.replace(/^#_?/, "").trim();
    const m = refCell.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)/);
    if (!m) continue; // stray header/comment line
    const [, bookAbbr, c, v] = m;
    const usfm = USFM_BY_TAHOT[bookAbbr];
    if (!usfm) continue; // unknown abbreviation, skip defensively
    const key = `${usfm}.${c}.${v}`;

    if (isContinuation && key === currentKey) {
      // continuation of the verse we're already accumulating; keep going
      continue;
    }
    // New verse (or a continuation ref that doesn't match, which we treat as new
    // defensively): flush what we have and start fresh.
    flush();
    currentKey = key;
    sawTranslationForCurrentRecord = false;
  }
  flush();
}

export function loadTahot(cacheDir) {
  const files = [
    "TAHOT_Gen-Deu.txt",
    "TAHOT_Jos-Est.txt",
    "TAHOT_Job-Sng.txt",
    "TAHOT_Isa-Mal.txt",
  ];
  const out = new Map();
  for (const f of files) {
    const text = fs.readFileSync(`${cacheDir}/${f}`, "utf8");
    parseTahotInto(text, out);
  }
  return out;
}
