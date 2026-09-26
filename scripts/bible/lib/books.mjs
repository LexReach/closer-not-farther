// Canonical 66-book list (Protestant canon), in reading order.
// id: USFM book code (matches data/bible/SCHEMA.md)
// morphgnt: the MorphGNT/SBLGNT file-number prefix + book abbreviation, NT only.
// tagntPart: which STEPBible TAGNT file ("Mat-Jhn" or "Act-Rev") the book's rows live in, NT only.
// tagntAbbr: the 3-letter abbreviation TAGNT uses in its "Reference" column (e.g. "Mat", "1Co").

export const BOOKS = [
  { id: "GEN", name: "Genesis", slug: "genesis", testament: "OT" },
  { id: "EXO", name: "Exodus", slug: "exodus", testament: "OT" },
  { id: "LEV", name: "Leviticus", slug: "leviticus", testament: "OT" },
  { id: "NUM", name: "Numbers", slug: "numbers", testament: "OT" },
  { id: "DEU", name: "Deuteronomy", slug: "deuteronomy", testament: "OT" },
  { id: "JOS", name: "Joshua", slug: "joshua", testament: "OT" },
  { id: "JDG", name: "Judges", slug: "judges", testament: "OT" },
  { id: "RUT", name: "Ruth", slug: "ruth", testament: "OT" },
  { id: "1SA", name: "1 Samuel", slug: "1-samuel", testament: "OT" },
  { id: "2SA", name: "2 Samuel", slug: "2-samuel", testament: "OT" },
  { id: "1KI", name: "1 Kings", slug: "1-kings", testament: "OT" },
  { id: "2KI", name: "2 Kings", slug: "2-kings", testament: "OT" },
  { id: "1CH", name: "1 Chronicles", slug: "1-chronicles", testament: "OT" },
  { id: "2CH", name: "2 Chronicles", slug: "2-chronicles", testament: "OT" },
  { id: "EZR", name: "Ezra", slug: "ezra", testament: "OT" },
  { id: "NEH", name: "Nehemiah", slug: "nehemiah", testament: "OT" },
  { id: "EST", name: "Esther", slug: "esther", testament: "OT" },
  { id: "JOB", name: "Job", slug: "job", testament: "OT" },
  { id: "PSA", name: "Psalms", slug: "psalms", testament: "OT" },
  { id: "PRO", name: "Proverbs", slug: "proverbs", testament: "OT" },
  { id: "ECC", name: "Ecclesiastes", slug: "ecclesiastes", testament: "OT" },
  { id: "SNG", name: "Song of Songs", slug: "song-of-songs", testament: "OT" },
  { id: "ISA", name: "Isaiah", slug: "isaiah", testament: "OT" },
  { id: "JER", name: "Jeremiah", slug: "jeremiah", testament: "OT" },
  { id: "LAM", name: "Lamentations", slug: "lamentations", testament: "OT" },
  { id: "EZK", name: "Ezekiel", slug: "ezekiel", testament: "OT" },
  { id: "DAN", name: "Daniel", slug: "daniel", testament: "OT" },
  { id: "HOS", name: "Hosea", slug: "hosea", testament: "OT" },
  { id: "JOL", name: "Joel", slug: "joel", testament: "OT" },
  { id: "AMO", name: "Amos", slug: "amos", testament: "OT" },
  { id: "OBA", name: "Obadiah", slug: "obadiah", testament: "OT" },
  { id: "JON", name: "Jonah", slug: "jonah", testament: "OT" },
  { id: "MIC", name: "Micah", slug: "micah", testament: "OT" },
  { id: "NAM", name: "Nahum", slug: "nahum", testament: "OT" },
  { id: "HAB", name: "Habakkuk", slug: "habakkuk", testament: "OT" },
  { id: "ZEP", name: "Zephaniah", slug: "zephaniah", testament: "OT" },
  { id: "HAG", name: "Haggai", slug: "haggai", testament: "OT" },
  { id: "ZEC", name: "Zechariah", slug: "zechariah", testament: "OT" },
  { id: "MAL", name: "Malachi", slug: "malachi", testament: "OT" },

  { id: "MAT", name: "Matthew", slug: "matthew", testament: "NT", morphgnt: "61-Mt", tagntPart: "Mat-Jhn", tagntAbbr: "Mat" },
  { id: "MRK", name: "Mark", slug: "mark", testament: "NT", morphgnt: "62-Mk", tagntPart: "Mat-Jhn", tagntAbbr: "Mrk" },
  { id: "LUK", name: "Luke", slug: "luke", testament: "NT", morphgnt: "63-Lk", tagntPart: "Mat-Jhn", tagntAbbr: "Luk" },
  { id: "JHN", name: "John", slug: "john", testament: "NT", morphgnt: "64-Jn", tagntPart: "Mat-Jhn", tagntAbbr: "Jhn" },
  { id: "ACT", name: "Acts", slug: "acts", testament: "NT", morphgnt: "65-Ac", tagntPart: "Act-Rev", tagntAbbr: "Act" },
  { id: "ROM", name: "Romans", slug: "romans", testament: "NT", morphgnt: "66-Ro", tagntPart: "Act-Rev", tagntAbbr: "Rom" },
  { id: "1CO", name: "1 Corinthians", slug: "1-corinthians", testament: "NT", morphgnt: "67-1Co", tagntPart: "Act-Rev", tagntAbbr: "1Co" },
  { id: "2CO", name: "2 Corinthians", slug: "2-corinthians", testament: "NT", morphgnt: "68-2Co", tagntPart: "Act-Rev", tagntAbbr: "2Co" },
  { id: "GAL", name: "Galatians", slug: "galatians", testament: "NT", morphgnt: "69-Ga", tagntPart: "Act-Rev", tagntAbbr: "Gal" },
  { id: "EPH", name: "Ephesians", slug: "ephesians", testament: "NT", morphgnt: "70-Eph", tagntPart: "Act-Rev", tagntAbbr: "Eph" },
  { id: "PHP", name: "Philippians", slug: "philippians", testament: "NT", morphgnt: "71-Php", tagntPart: "Act-Rev", tagntAbbr: "Php" },
  { id: "COL", name: "Colossians", slug: "colossians", testament: "NT", morphgnt: "72-Col", tagntPart: "Act-Rev", tagntAbbr: "Col" },
  { id: "1TH", name: "1 Thessalonians", slug: "1-thessalonians", testament: "NT", morphgnt: "73-1Th", tagntPart: "Act-Rev", tagntAbbr: "1Th" },
  { id: "2TH", name: "2 Thessalonians", slug: "2-thessalonians", testament: "NT", morphgnt: "74-2Th", tagntPart: "Act-Rev", tagntAbbr: "2Th" },
  { id: "1TI", name: "1 Timothy", slug: "1-timothy", testament: "NT", morphgnt: "75-1Ti", tagntPart: "Act-Rev", tagntAbbr: "1Ti" },
  { id: "2TI", name: "2 Timothy", slug: "2-timothy", testament: "NT", morphgnt: "76-2Ti", tagntPart: "Act-Rev", tagntAbbr: "2Ti" },
  { id: "TIT", name: "Titus", slug: "titus", testament: "NT", morphgnt: "77-Tit", tagntPart: "Act-Rev", tagntAbbr: "Tit" },
  { id: "PHM", name: "Philemon", slug: "philemon", testament: "NT", morphgnt: "78-Phm", tagntPart: "Act-Rev", tagntAbbr: "Phm" },
  { id: "HEB", name: "Hebrews", slug: "hebrews", testament: "NT", morphgnt: "79-Heb", tagntPart: "Act-Rev", tagntAbbr: "Heb" },
  { id: "JAS", name: "James", slug: "james", testament: "NT", morphgnt: "80-Jas", tagntPart: "Act-Rev", tagntAbbr: "Jas" },
  { id: "1PE", name: "1 Peter", slug: "1-peter", testament: "NT", morphgnt: "81-1Pe", tagntPart: "Act-Rev", tagntAbbr: "1Pe" },
  { id: "2PE", name: "2 Peter", slug: "2-peter", testament: "NT", morphgnt: "82-2Pe", tagntPart: "Act-Rev", tagntAbbr: "2Pe" },
  { id: "1JN", name: "1 John", slug: "1-john", testament: "NT", morphgnt: "83-1Jn", tagntPart: "Act-Rev", tagntAbbr: "1Jn" },
  { id: "2JN", name: "2 John", slug: "2-john", testament: "NT", morphgnt: "84-2Jn", tagntPart: "Act-Rev", tagntAbbr: "2Jn" },
  { id: "3JN", name: "3 John", slug: "3-john", testament: "NT", morphgnt: "85-3Jn", tagntPart: "Act-Rev", tagntAbbr: "3Jn" },
  { id: "JUD", name: "Jude", slug: "jude", testament: "NT", morphgnt: "86-Jud", tagntPart: "Act-Rev", tagntAbbr: "Jud" },
  { id: "REV", name: "Revelation", slug: "revelation", testament: "NT", morphgnt: "87-Re", tagntPart: "Act-Rev", tagntAbbr: "Rev" },
];

export const NT_BOOKS = BOOKS.filter((b) => b.testament === "NT");
export const OT_BOOKS = BOOKS.filter((b) => b.testament === "OT");

export function bookById(id) {
  const b = BOOKS.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown book id: ${id}`);
  return b;
}
