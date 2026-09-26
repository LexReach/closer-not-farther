// Shared book table and helpers for the OT (Hebrew Bible) data build.
//
// Three parallel identifiers per book:
//  - usfm:    the id used throughout this repo's data/bible files (see data/bible/SCHEMA.md)
//  - morphhb: the OSIS file stem under openscriptures/morphhb's wlc/ directory
//  - tahot:   the book abbreviation used by STEPBible-Data's TAHOT files (case-sensitive;
//             .toUpperCase() of this always equals `usfm` for the Hebrew Bible books)
export const BOOKS = [
  { usfm: "GEN", morphhb: "Gen", tahot: "Gen" },
  { usfm: "EXO", morphhb: "Exod", tahot: "Exo" },
  { usfm: "LEV", morphhb: "Lev", tahot: "Lev" },
  { usfm: "NUM", morphhb: "Num", tahot: "Num" },
  { usfm: "DEU", morphhb: "Deut", tahot: "Deu" },
  { usfm: "JOS", morphhb: "Josh", tahot: "Jos" },
  { usfm: "JDG", morphhb: "Judg", tahot: "Jdg" },
  { usfm: "RUT", morphhb: "Ruth", tahot: "Rut" },
  { usfm: "1SA", morphhb: "1Sam", tahot: "1Sa" },
  { usfm: "2SA", morphhb: "2Sam", tahot: "2Sa" },
  { usfm: "1KI", morphhb: "1Kgs", tahot: "1Ki" },
  { usfm: "2KI", morphhb: "2Kgs", tahot: "2Ki" },
  { usfm: "1CH", morphhb: "1Chr", tahot: "1Ch" },
  { usfm: "2CH", morphhb: "2Chr", tahot: "2Ch" },
  { usfm: "EZR", morphhb: "Ezra", tahot: "Ezr" },
  { usfm: "NEH", morphhb: "Neh", tahot: "Neh" },
  { usfm: "EST", morphhb: "Esth", tahot: "Est" },
  { usfm: "JOB", morphhb: "Job", tahot: "Job" },
  { usfm: "PSA", morphhb: "Ps", tahot: "Psa" },
  { usfm: "PRO", morphhb: "Prov", tahot: "Pro" },
  { usfm: "ECC", morphhb: "Eccl", tahot: "Ecc" },
  { usfm: "SNG", morphhb: "Song", tahot: "Sng" },
  { usfm: "ISA", morphhb: "Isa", tahot: "Isa" },
  { usfm: "JER", morphhb: "Jer", tahot: "Jer" },
  { usfm: "LAM", morphhb: "Lam", tahot: "Lam" },
  { usfm: "EZK", morphhb: "Ezek", tahot: "Ezk" },
  { usfm: "DAN", morphhb: "Dan", tahot: "Dan" },
  { usfm: "HOS", morphhb: "Hos", tahot: "Hos" },
  { usfm: "JOL", morphhb: "Joel", tahot: "Jol" },
  { usfm: "AMO", morphhb: "Amos", tahot: "Amo" },
  { usfm: "OBA", morphhb: "Obad", tahot: "Oba" },
  { usfm: "JON", morphhb: "Jonah", tahot: "Jon" },
  { usfm: "MIC", morphhb: "Mic", tahot: "Mic" },
  { usfm: "NAM", morphhb: "Nah", tahot: "Nam" },
  { usfm: "HAB", morphhb: "Hab", tahot: "Hab" },
  { usfm: "ZEP", morphhb: "Zeph", tahot: "Zep" },
  { usfm: "HAG", morphhb: "Hag", tahot: "Hag" },
  { usfm: "ZEC", morphhb: "Zech", tahot: "Zec" },
  { usfm: "MAL", morphhb: "Mal", tahot: "Mal" },
];

export const USFM_BY_MORPHHB = Object.fromEntries(BOOKS.map((b) => [b.morphhb, b.usfm]));
export const USFM_BY_TAHOT = Object.fromEntries(BOOKS.map((b) => [b.tahot, b.usfm]));

// morphhb encodes the inseparable prefixes (conjunction waw, article he, and the
// prepositions beth/kaph/lamed/min, plus the interrogative he and relative she) as a
// bare, non-numeric lemma segment (e.g. lemma="b", lemma="l") whenever the entire word
// consists of the prefix plus a pronominal suffix with no further content root (e.g.
// בּוֹ "in him/it", לָהֶם "to them", מֵהֶם "from them"). These have no plain Strong's
// number of their own; STEPBible's TBESH lexicon (extended Strongs) gives them numbers
// in the 9000s, which is what we fall back to so every word still carries a `strong`.
// Verified against TBESH.txt rows H9001-H9009 and against morphhb's own usage (b, l, m
// were the only ones directly observed standalone in Genesis/Psalms).
export const PREFIX_ONLY_STRONG = {
  a: "H9008", // interrogative he (rare standalone)
  b: "H9003", // preposition beth: in/on/with
  c: "H9002", // conjunction waw (conjunctive)
  d: "H9009", // definite article he
  i: "H9008", // interrogative he
  k: "H9004", // preposition kaph: like/as
  l: "H9005", // preposition lamed: to/for
  m: "H9006", // preposition min: from
  r: "H9007", // relative (fallback)
  s: "H9007", // relative she: which/that
};

export function normalizeStrongId(prefix, digits) {
  // Strip leading zeros so "H0430" and "H430" collapse to the same key, matching the
  // un-padded style used in SCHEMA.md's example ("H430").
  return prefix + String(parseInt(digits, 10));
}

// Turn a morphhb `lemma` attribute into the word's main-content Strong's id.
// Examples: "b/7225" -> "H7225"; "1254 a" -> "H1254"; "d/8064" -> "H8064";
// "1008+" -> "H1008"; "c/d/776" -> "H776"; "b" (no digits at all) -> PREFIX_ONLY_STRONG.b
export function strongFromLemma(lemma) {
  if (!lemma) return null;
  const segments = lemma.split("/");
  const last = segments[segments.length - 1].trim();
  const m = last.match(/^(\d+)/);
  if (m) {
    return normalizeStrongId("H", m[1]);
  }
  // Biblical Aramaic words (Ezra 4:8-6:18, 7:12-26; Dan 2:4-7:28) use the same numeric
  // Strong's space as Hebrew (only the morph attribute's language letter differs, "A" vs
  // "H"), so the digit match above already covers them.
  const letter = last.toLowerCase();
  if (PREFIX_ONLY_STRONG[letter]) return PREFIX_ONLY_STRONG[letter];
  return null;
}
