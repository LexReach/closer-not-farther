// Maps the many spellings a plain-text or USFM Bible dump uses for a book
// name/abbreviation onto our USFM ids. Keys are lowercased, with punctuation
// and extra whitespace removed, and leading numbers normalized to a digit
// (so "I Corinthians", "1 Corinthians", "1st Corinthians", "1Co" all match).
import { BOOKS } from "./books.mjs";

const RAW_ALIASES = {
  GEN: ["genesis", "gen", "ge", "gn"],
  EXO: ["exodus", "exo", "ex", "exod"],
  LEV: ["leviticus", "lev", "le", "lv"],
  NUM: ["numbers", "num", "nu", "nm", "nb"],
  DEU: ["deuteronomy", "deut", "deu", "de", "dt"],
  JOS: ["joshua", "josh", "jos", "jsh"],
  JDG: ["judges", "judg", "jdg", "jg", "jdgs"],
  RUT: ["ruth", "rut", "ru"],
  "1SA": ["1samuel", "1sam", "1sa", "1s", "isamuel"],
  "2SA": ["2samuel", "2sam", "2sa", "2s", "iisamuel"],
  "1KI": ["1kings", "1kgs", "1ki", "1k", "ikings"],
  "2KI": ["2kings", "2kgs", "2ki", "2k", "iikings"],
  "1CH": ["1chronicles", "1chron", "1chr", "1ch", "ichronicles"],
  "2CH": ["2chronicles", "2chron", "2chr", "2ch", "iichronicles"],
  EZR: ["ezra", "ezr", "ez"],
  NEH: ["nehemiah", "neh", "ne"],
  EST: ["esther", "esth", "est", "es"],
  JOB: ["job", "jb"],
  PSA: ["psalms", "psalm", "psa", "ps", "pslm", "psl"],
  PRO: ["proverbs", "prov", "pro", "pr", "prv"],
  ECC: ["ecclesiastes", "eccles", "eccl", "ecc", "ec", "qoh"],
  SNG: ["songofsongs", "songofsolomon", "song", "sng", "so", "sos", "canticles", "cant"],
  ISA: ["isaiah", "isa", "is"],
  JER: ["jeremiah", "jer", "je", "jr"],
  LAM: ["lamentations", "lam", "la"],
  EZK: ["ezekiel", "ezek", "ezk", "eze"],
  DAN: ["daniel", "dan", "da", "dn"],
  HOS: ["hosea", "hos", "ho"],
  JOL: ["joel", "jol", "jl"],
  AMO: ["amos", "amo", "am"],
  OBA: ["obadiah", "obad", "oba", "ob"],
  JON: ["jonah", "jnh", "jon"],
  MIC: ["micah", "mic", "mc"],
  NAM: ["nahum", "nah", "nam", "na"],
  HAB: ["habakkuk", "hab", "hb"],
  ZEP: ["zephaniah", "zeph", "zep", "zp"],
  HAG: ["haggai", "hag", "hg"],
  ZEC: ["zechariah", "zech", "zec", "zc"],
  MAL: ["malachi", "mal", "ml"],
  MAT: ["matthew", "matt", "mat", "mt"],
  MRK: ["mark", "mrk", "mr", "mk"],
  LUK: ["luke", "luk", "lk"],
  JHN: ["john", "jhn", "jn", "joh"],
  ACT: ["acts", "act", "ac"],
  ROM: ["romans", "rom", "ro", "rm"],
  "1CO": ["1corinthians", "1cor", "1co", "icorinthians"],
  "2CO": ["2corinthians", "2cor", "2co", "iicorinthians"],
  GAL: ["galatians", "gal", "ga"],
  EPH: ["ephesians", "eph", "ephes"],
  PHP: ["philippians", "phil", "php", "phl", "philip"],
  COL: ["colossians", "col", "colos"],
  "1TH": ["1thessalonians", "1thess", "1thes", "1th", "ithessalonians"],
  "2TH": ["2thessalonians", "2thess", "2thes", "2th", "iithessalonians"],
  "1TI": ["1timothy", "1tim", "1ti", "itimothy"],
  "2TI": ["2timothy", "2tim", "2ti", "iitimothy"],
  TIT: ["titus", "tit", "ti"],
  PHM: ["philemon", "philem", "phm", "phlm"],
  HEB: ["hebrews", "heb"],
  JAS: ["james", "jas", "jm"],
  "1PE": ["1peter", "1pet", "1pe", "1pt", "ipeter"],
  "2PE": ["2peter", "2pet", "2pe", "2pt", "iipeter"],
  "1JN": ["1john", "1jhn", "1jn", "ijohn"],
  "2JN": ["2john", "2jhn", "2jn", "iijohn"],
  "3JN": ["3john", "3jhn", "3jn", "iiijohn"],
  JUD: ["jude", "jud", "jd"],
  REV: ["revelation", "revelations", "rev", "re", "apocalypse"],
};

function normalizeKey(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/^i{1,3}(?=[a-z])/, (m) => String(m.length)) // "iii john" -> "3 john"
    .replace(/^(\d)(st|nd|rd|th)\b/, "$1")
    .replace(/[^a-z0-9]/g, "");
}

const LOOKUP = new Map();
for (const [id, aliases] of Object.entries(RAW_ALIASES)) {
  for (const a of aliases) LOOKUP.set(a, id);
}
// Also register each book's own full name from books.mjs, normalized.
for (const b of BOOKS) LOOKUP.set(normalizeKey(b.name), b.id);

export function bookIdFromName(raw) {
  return LOOKUP.get(normalizeKey(raw)) || null;
}
