# Bible data format (shared by the Reader, Evidence panel and OT)

Book ids are USFM codes: GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV.
A verse id is `BOOK.chapter.verse`, e.g. `JHN.18.31`.

## English text — `data/bible/text/<ver>/<BOOK>.json` (ver: bsb, web, kjv, asv)
{ "ver": "bsb", "book": "JHN", "chapters": [ [ v1, v2, ... ], ... ] }
- `chapters[c-1][v-1]` is verse c:v. Missing verses are `null`.
- A verse is a plain string, except BSB NT verses, which are arrays of segments
  `[text, greekIndex]` where greekIndex is the 0-based index of the word in the
  Greek verse (`data/bible/greek/<BOOK>.json`) that this English text renders, or null
  for English words with no Greek counterpart. Concatenating the segment texts gives the verse.
- No headings/footnotes in verses. Section headings, if available, go in
  `"headings": { "c:v": "Heading text" }` at book level.

## Original-language words — `data/bible/greek/<BOOK>.json` (NT) and `data/bible/hebrew/<BOOK>.json` (OT)
{ "book": "JHN", "lang": "grc" | "hbo", "chapters": [ [ [word, ...], ... ], ... ] }
- Each word is a tuple `[surface, strong, morph, gloss]`:
  surface = the word as printed (Greek with accents/punctuation; Hebrew pointed with cantillation),
  strong = Strong's id string ("G3056", "H430"), morph = the source's morph code (Robinson/TAGNT for Greek,
  OSHB for Hebrew), gloss = short contextual English gloss.
- Greek surface text follows SBLGNT.

## Lexicon — `data/bible/lex-greek.json`, `data/bible/lex-hebrew.json`
{ "G3056": { "lemma": "λόγος", "translit": "logos", "gloss": "word", "count": 330 }, ... }
`count` = occurrences in the NT (or OT) word files.

## Index — `data/bible/books.json`
[ { "id": "JHN", "name": "John", "slug": "john", "testament": "NT", "chapters": 21, "verses": [51, 25, ...] }, ... ]
