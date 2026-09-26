// scripts/evidence/nt-books.mjs
//
// Static New Testament structure data used by the evidence-building scripts:
// per-book chapter/verse counts (traditional/KJV-style versification, matching
// the numbering used by data/bible/text/{kjv,asv,web,bsb} per SCHEMA.md) and
// the NA28 "corpus" letter each book belongs to (matches the e/a/p/c/r letters
// used in data/library/catalog.json's `contents` field).
//
// No network access needed; verse-per-chapter counts are well-established
// public data (checked against commonly published per-book verse totals).

// `osis` is the OSIS book abbreviation (also the SBLGNT/data/sblgntapp/text/<name>.txt
// filename stem, and the token NTVMR's indexContent search both accepts as a query value
// and prints in its own indexContent/biblicalContent response text, e.g. "Matt 1:1-25").
export const NT_BOOKS = [
  { id: 'MAT', name: 'Matthew', osis: 'Matt', corpus: 'e', verses: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20] },
  { id: 'MRK', name: 'Mark', osis: 'Mark', corpus: 'e', verses: [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20] },
  { id: 'LUK', name: 'Luke', osis: 'Luke', corpus: 'e', verses: [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53] },
  { id: 'JHN', name: 'John', osis: 'John', corpus: 'e', verses: [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25] },
  { id: 'ACT', name: 'Acts', osis: 'Acts', corpus: 'a', verses: [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31] },
  { id: 'ROM', name: 'Romans', osis: 'Rom', corpus: 'p', verses: [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27] },
  { id: '1CO', name: '1 Corinthians', osis: '1Cor', corpus: 'p', verses: [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24] },
  { id: '2CO', name: '2 Corinthians', osis: '2Cor', corpus: 'p', verses: [24,17,18,18,21,18,16,24,15,18,33,21,14] },
  { id: 'GAL', name: 'Galatians', osis: 'Gal', corpus: 'p', verses: [24,21,29,31,26,18] },
  { id: 'EPH', name: 'Ephesians', osis: 'Eph', corpus: 'p', verses: [23,22,21,32,33,24] },
  { id: 'PHP', name: 'Philippians', osis: 'Phil', corpus: 'p', verses: [30,30,21,23] },
  { id: 'COL', name: 'Colossians', osis: 'Col', corpus: 'p', verses: [29,23,25,18] },
  { id: '1TH', name: '1 Thessalonians', osis: '1Thess', corpus: 'p', verses: [10,20,13,18,28] },
  { id: '2TH', name: '2 Thessalonians', osis: '2Thess', corpus: 'p', verses: [12,17,18] },
  { id: '1TI', name: '1 Timothy', osis: '1Tim', corpus: 'p', verses: [20,15,16,16,25,21] },
  { id: '2TI', name: '2 Timothy', osis: '2Tim', corpus: 'p', verses: [18,26,17,22] },
  { id: 'TIT', name: 'Titus', osis: 'Titus', corpus: 'p', verses: [16,15,15] },
  { id: 'PHM', name: 'Philemon', osis: 'Phlm', corpus: 'p', verses: [25] },
  { id: 'HEB', name: 'Hebrews', osis: 'Heb', corpus: 'p', verses: [14,18,19,16,14,20,28,13,28,39,40,29,25] },
  { id: 'JAS', name: 'James', osis: 'Jas', corpus: 'c', verses: [27,26,18,17,20] },
  { id: '1PE', name: '1 Peter', osis: '1Pet', corpus: 'c', verses: [25,25,22,19,14] },
  { id: '2PE', name: '2 Peter', osis: '2Pet', corpus: 'c', verses: [21,22,18] },
  { id: '1JN', name: '1 John', osis: '1John', corpus: 'c', verses: [10,29,24,21,21] },
  { id: '2JN', name: '2 John', osis: '2John', corpus: 'c', verses: [13] },
  { id: '3JN', name: '3 John', osis: '3John', corpus: 'c', verses: [14] },
  { id: 'JUD', name: 'Jude', osis: 'Jude', corpus: 'c', verses: [25] },
  { id: 'REV', name: 'Revelation', osis: 'Rev', corpus: 'r', verses: [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21] },
];

export const NT_BOOK_IDS = NT_BOOKS.map((b) => b.id);

export function bookVerseCount(book) {
  return book.verses.reduce((a, b) => a + b, 0);
}

/** Iterate every "c:v" verse key for a book, in order. */
export function* iterVerses(book) {
  for (let c = 1; c <= book.verses.length; c++) {
    const n = book.verses[c - 1];
    for (let v = 1; v <= n; v++) yield `${c}:${v}`;
  }
}

export function totalNTVerses() {
  return NT_BOOKS.reduce((a, b) => a + bookVerseCount(b), 0);
}
