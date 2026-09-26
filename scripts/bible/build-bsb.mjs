#!/usr/bin/env node
// Builds data/bible/text/bsb/<BOOK>.json.
//
// The *displayed text* of every verse is always bereanbible.com's bsb.txt,
// verbatim (OT and NT alike) - concatenating a verse's segments always
// reconstructs its bsb.txt string exactly, by construction.
//
// For the NT, bsb_tables (the Greek-English interlinear spreadsheet) adds
// [text, greekIndex] links on top of that text in two independent passes:
//  1. Each interlinear row is linked to a Greek word in
//     data/bible/greek/<BOOK>.json by Strong's number, walking rows and
//     Greek words in the same order (the table's own Greek Sort column).
//  2. In the table's BSB (English) reading order, each row's cleaned
//     English fragment is located inside the verbatim bsb.txt verse string
//     (case/punctuation-insensitively, sequentially from the previous
//     match), and that span gets the Greek link from step 1. Gaps between
//     matches (spacing, punctuation, words the table didn't separately
//     translate) become unlinked segments, so nothing is dropped or
//     reordered from the true BSB text.
// Requires build-greek.mjs to have already run.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { BOOKS, NT_BOOKS } from "./lib/books.mjs";
import { DATA_DIR } from "./lib/paths.mjs";
import { fetchFirst } from "./lib/fetch.mjs";
import { parseRef } from "./lib/bsb-ref.mjs";
import { parseCsv } from "./lib/csv.mjs";
import { baseStrong } from "./lib/strong.mjs";
import { alignGreedy } from "./lib/align.mjs";
import { alignRowsToText } from "./lib/align-text.mjs";

const SCRATCH = process.env.BIBLE_SCRATCH || path.join(os.tmpdir(), "bible-src");
const outDir = path.join(DATA_DIR, "text", "bsb");
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------
// 1. bsb.txt -> plain baseline text for all 66 books
// ---------------------------------------------------------------------
const bsbTxtPath = path.join(SCRATCH, "bsb.txt");
await fetchFirst(
  [
    "https://bereanbible.com/bsb.txt",
    "https://www.bereanbible.com/bsb.txt",
    "https://bereanbible.com/text/bsb.txt",
    "https://bereanbible.com/downloads/bsb.txt",
  ],
  bsbTxtPath
);
const bsbTxt = fs.readFileSync(bsbTxtPath, "utf8");
const txtLines = bsbTxt.split(/\r\n|\r|\n/).filter((l) => l.trim());
console.log(`bsb.txt: ${txtLines.length} lines. Sample:`);
for (const l of txtLines.slice(0, 5)) console.log("  " + l.slice(0, 120));

// Best-effort: capture whatever license/terms wording bereanbible.com's own
// pages use, for SOURCES.md to quote verbatim.
try {
  const licensePagePath = path.join(SCRATCH, "bereanbible-home.html");
  await fetchFirst(["https://bereanbible.com/", "https://www.bereanbible.com/"], licensePagePath);
  const html = fs.readFileSync(licensePagePath, "utf8");
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log("--- bereanbible.com homepage text (for license wording) ---");
  console.log(text.slice(0, 3000));
  console.log("--- end ---");
} catch (e) {
  console.warn(`Could not fetch bereanbible.com homepage for license text: ${e.message}`);
}

const plain = new Map(); // "BOOK" -> chapters array of (string|null)[]
function ensurePlainBook(book) {
  let c = plain.get(book);
  if (!c) {
    c = [];
    plain.set(book, c);
  }
  return c;
}
function setPlainVerse(book, chapter, verse, text) {
  const chapters = ensurePlainBook(book);
  while (chapters.length < chapter) chapters.push([]);
  const arr = chapters[chapter - 1];
  while (arr.length < verse) arr.push(null);
  arr[verse - 1] = text;
}

let parsedLines = 0;
for (const line of txtLines) {
  const tabIdx = line.indexOf("\t");
  const refPart = tabIdx === -1 ? line : line.slice(0, tabIdx);
  const textPart = tabIdx === -1 ? "" : line.slice(tabIdx + 1).trim();
  const ref = parseRef(refPart);
  if (!ref || !textPart) continue;
  setPlainVerse(ref.book, ref.chapter, ref.verse, textPart);
  parsedLines++;
}
console.log(`bsb.txt: parsed ${parsedLines}/${txtLines.length} lines into verses across ${plain.size} books`);

for (const book of BOOKS) {
  const chapters = plain.get(book.id) || [];
  fs.writeFileSync(
    path.join(outDir, `${book.id}.json`),
    JSON.stringify({ ver: "bsb", book: book.id, chapters })
  );
}

// ---------------------------------------------------------------------
// 2. bsb_tables -> segmented NT verses aligned to data/bible/greek
// ---------------------------------------------------------------------
let tableRows = null; // Map "BOOK:c:v" -> [{ english, strongBase }]
try {
  tableRows = await loadBsbTables();
} catch (e) {
  console.warn(`bsb_tables: could not fetch/parse (${e.message}); NT books stay plain-string like the OT.`);
}

if (tableRows) {
  const greekDir = path.join(DATA_DIR, "greek");
  let totalWords = 0;
  let matchedWords = 0;
  let mismatchedVerses = 0;
  const addedVerses = []; // verses beyond the old Greek-array-bound loop that this fix now includes
  for (const book of NT_BOOKS) {
    const greek = JSON.parse(fs.readFileSync(path.join(greekDir, `${book.id}.json`), "utf8"));
    const plainChapters = plain.get(book.id) || [];
    // bsb.txt sometimes has verses (or whole trailing material) our Greek
    // source doesn't - e.g. Romans 16:25-27 (a doxology SBLGNT only carries
    // in its textual apparatus) - so the loop bounds must be the max of the
    // two, not just the Greek array's own size, or those verses are simply
    // never visited and silently dropped.
    const numChapters = Math.max(greek.chapters.length, plainChapters.length);
    const chapters = [];
    for (let c = 0; c < numChapters; c++) {
      const chapterOut = [];
      const greekChapterArr = greek.chapters[c] || [];
      const plainChapterArr = plainChapters[c] || [];
      const numVerses = Math.max(greekChapterArr.length, plainChapterArr.length);
      for (let v = 0; v < numVerses; v++) {
        const gWords = greekChapterArr[v];
        const canonicalText = plainChapterArr[v] ?? null;
        if (canonicalText != null && (c >= greek.chapters.length || v >= greekChapterArr.length)) {
          addedVerses.push(`${book.id} ${c + 1}:${v + 1}`);
        }
        if (canonicalText == null) {
          // bsb.txt itself has nothing here: a genuinely missing verse.
          chapterOut.push(null);
          continue;
        }
        if (!gWords) {
          // bsb.txt has this verse but our Greek source doesn't (e.g. MorphGNT
          // predates SBLGNT v1.2 adding the Pericope Adulterae, Jn 7:53-8:11,
          // which BSB includes). Still emit the verse, just fully unlinked.
          chapterOut.push([[canonicalText, null]]);
          continue;
        }
        const key = `${book.id}:${c + 1}:${v + 1}`;
        const rows = tableRows.get(key);
        if (!rows || !rows.length) {
          // No interlinear row for this verse; the verse still has to be a
          // segment array (BSB NT schema), just with one unlinked segment.
          chapterOut.push([[canonicalText, null]]);
          continue;
        }

        // Phase 1: link each row to a Greek word by Strong's number, walking
        // rows and Greek words in the SAME (Greek) order.
        const gWithBase = gWords.map((w, i) => ({ index: i, strongBase: baseStrong(w[1]) }));
        const byGreekOrder = [...rows].sort((a, b) => a.greekSortKey - b.greekSortKey);
        const aligned = alignGreedy(
          byGreekOrder,
          gWithBase,
          (row, gw) => row.strongBase && gw.strongBase && row.strongBase === gw.strongBase
        );
        byGreekOrder.forEach((row, i) => {
          row.greekIndex = aligned[i] ? aligned[i].index : null;
        });

        // Phase 2: in BSB (English) reading order, find each row's cleaned
        // English fragment inside the verbatim bsb.txt verse text.
        const byBsbOrder = [...rows].sort((a, b) => a.bsbSortKey - b.bsbSortKey);
        const { segments, matchedWords: mw, totalWords: tw } = alignRowsToText(byBsbOrder, canonicalText);
        totalWords += tw;
        matchedWords += mw;
        const concatenated = segments.map((s) => s[0]).join("");
        if (concatenated !== canonicalText) {
          mismatchedVerses++;
          console.warn(`MISMATCH ${key}: concatenation != bsb.txt\n  got: ${concatenated}\n  want: ${canonicalText}`);
        }
        chapterOut.push(segments);
      }
      chapters.push(chapterOut);
    }
    fs.writeFileSync(
      path.join(outDir, `${book.id}.json`),
      JSON.stringify({ ver: "bsb", book: book.id, chapters })
    );
  }
  console.log(
    `bsb_tables alignment: ${matchedWords}/${totalWords} NT English words linked to a Greek index (${((matchedWords / totalWords) * 100).toFixed(2)}%)`
  );
  console.log(`bsb_tables alignment: ${mismatchedVerses} verses where segments didn't reconstruct bsb.txt exactly`);
  console.log(
    `bsb.txt verses beyond the Greek array's own bounds, now included (${addedVerses.length}): ${addedVerses.join(", ")}`
  );
}

async function loadBsbTables() {
  const csvPath = path.join(SCRATCH, "bsb_tables.csv");
  const xlsxPath = path.join(SCRATCH, "bsb_tables.xlsx");

  let rows;
  try {
    await fetchFirst(
      [
        "https://bereanbible.com/bsb_tables.csv",
        "https://www.bereanbible.com/bsb_tables.csv",
        "https://bereanbible.com/downloads/bsb_tables.csv",
      ],
      csvPath
    );
    rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  } catch (csvErr) {
    console.log(`bsb_tables.csv unavailable (${csvErr.message}); trying .xlsx`);
    await fetchFirst(
      [
        "https://bereanbible.com/bsb_tables.xlsx",
        "https://www.bereanbible.com/bsb_tables.xlsx",
        "https://bereanbible.com/downloads/bsb_tables.xlsx",
      ],
      xlsxPath
    );
    const xlsx = await import("xlsx");
    const XLSX = xlsx.default ?? xlsx;

    // One full parse (this is what's fast: ~30s for this ~55MB/750k-row
    // workbook with SheetJS's default raw values). Re-opening the file
    // per-sheet, or asking for formatted (raw:false) values, both turned
    // out much slower - see git history for scripts/bible/build-bsb.mjs.
    const wb = XLSX.readFile(xlsxPath);
    console.log(`bsb_tables.xlsx: sheets = ${JSON.stringify(wb.SheetNames)}`);

    rows = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws || !ws["!ref"]) {
        console.log(`bsb_tables.xlsx: sheet "${sheetName}" is empty, skipping`);
        continue;
      }
      const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const header = (sheetRows[0] || []).map((h) => String(h).toLowerCase().trim());
      console.log(
        `bsb_tables.xlsx: sheet "${sheetName}" range=${ws["!ref"]} rows=${sheetRows.length} header=${JSON.stringify(header)}`
      );
      const hasRef = header.some((h) => h.includes("verse") || h.includes("reference") || h.includes("ref"));
      const hasEnglish = header.some((h) => h.includes("english") || h.includes("translation") || h.includes("bsb"));
      if (!hasRef || !hasEnglish) {
        console.log(`bsb_tables.xlsx: sheet "${sheetName}" doesn't look like the interlinear table, skipping`);
        continue;
      }
      console.log(`bsb_tables.xlsx: sheet "${sheetName}" sample row 1: ${JSON.stringify(sheetRows[1])}`);
      console.log(`bsb_tables.xlsx: sheet "${sheetName}" sample row 2: ${JSON.stringify(sheetRows[2])}`);
      rows.push({ header, data: sheetRows.slice(1) });
    }
    if (!rows.length) throw new Error("No sheet looked like the interlinear table");
  }

  if (Array.isArray(rows) && rows.length && Array.isArray(rows[0])) {
    // CSV path: a single flat array of rows, first is the header.
    console.log(`bsb_tables: ${rows.length} rows. Header: ${JSON.stringify(rows[0])}`);
    console.log(`bsb_tables: sample row: ${JSON.stringify(rows[1])}`);
    rows = [{ header: rows[0].map((h) => String(h).toLowerCase().trim()), data: rows.slice(1) }];
  }

  if (!rows.length) throw new Error("No sheet/rows looked like the BSB interlinear table");

  const byVerse = new Map();
  let totalDataRows = 0;
  for (const { header, data } of rows) {
    // Prefer a specific/exact-ish keyword over a looser one, and always skip
    // a "sort order" column even if its name also contains the keyword (e.g.
    // "BSB Sort" is a row-order index, not the English text).
    const findCol = (...keywordGroups) => {
      for (const k of keywordGroups) {
        const i = header.findIndex((h) => h.includes(k) && !h.includes("sort"));
        if (i !== -1) return i;
      }
      return -1;
    };
    // "VerseId" holds the full "Genesis 1:1"-style reference (only on each
    // verse's first row - blank/carried-forward after); a bare "Verse"
    // column is just a running word-position number, not a reference, so it
    // must lose to "verseid" when both are present.
    const refIdx = findCol("verseid", "verse id", "reference", "verse", "ref");
    const strongIdx = findCol("str grk", "strong grk", "grk strong", "strongs grk", "strong");
    const englishIdx = findCol("version", "translation", "english", "bsb");
    const greekIdx = findCol("greek", "grk", "hebrew", "original");
    // "BSB Sort" gives each row's position in natural English reading order;
    // "Greek Sort" gives its position in the original Greek word order
    // (which is what data/bible/greek/<BOOK>.json follows). They can differ
    // whenever English and Greek word order diverge.
    const bsbSortIdx = header.findIndex((h) => h.includes("bsb") && h.includes("sort"));
    const greekSortIdx = header.findIndex((h) => h.includes("greek") && h.includes("sort"));
    if (refIdx === -1 || englishIdx === -1) continue;
    console.log(
      `bsb_tables: columns ref=${refIdx} strong=${strongIdx} english=${englishIdx} greek=${greekIdx} bsbSort=${bsbSortIdx} greekSort=${greekSortIdx} (of ${header.length})`
    );

    let lastRef = null;
    let seq = 0;
    for (const row of data) {
      totalDataRows++;
      seq++;
      if (!row || !row.length) continue;
      const refCell = row[refIdx];
      const ref = refCell ? parseRef(refCell) : lastRef;
      if (!ref) continue;
      lastRef = ref;
      const english = String(row[englishIdx] ?? "").trim();
      if (!english) continue;
      const strongBase = strongIdx !== -1 ? baseStrong(row[strongIdx]) : null;
      const bsbSortKey = bsbSortIdx !== -1 ? Number(row[bsbSortIdx]) || seq : seq;
      const greekSortKey = greekSortIdx !== -1 ? Number(row[greekSortIdx]) || seq : seq;
      const key = `${ref.book}:${ref.chapter}:${ref.verse}`;
      let arr = byVerse.get(key);
      if (!arr) {
        arr = [];
        byVerse.set(key, arr);
      }
      arr.push({ english, strongBase, bsbSortKey, greekSortKey, greekIndex: null });
    }
  }
  console.log(`bsb_tables: ${totalDataRows} data rows total, grouped into ${byVerse.size} verses`);
  return byVerse;
}
