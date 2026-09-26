#!/usr/bin/env node
// Builds data/bible/text/bsb/<BOOK>.json.
//
// Baseline (all 66 books, plain-string verses): bereanbible.com's bsb.txt.
// NT enhancement (segmented [text, greekIndex] arrays aligned to
// data/bible/greek/<BOOK>.json): bereanbible.com's bsb_tables interlinear
// spreadsheet, matched onto the Greek word list per verse by Strong's number
// (in the table's reading order), falling back to leaving a segment's
// greekIndex null when no Strong's match is found nearby. Requires
// build-greek.mjs to have already run.
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
  let totalSegments = 0;
  let linkedSegments = 0;
  for (const book of NT_BOOKS) {
    const greek = JSON.parse(fs.readFileSync(path.join(greekDir, `${book.id}.json`), "utf8"));
    const chapters = [];
    for (let c = 0; c < greek.chapters.length; c++) {
      const chapterOut = [];
      for (let v = 0; v < greek.chapters[c].length; v++) {
        const gWords = greek.chapters[c][v];
        if (!gWords) {
          chapterOut.push(null);
          continue;
        }
        const key = `${book.id}:${c + 1}:${v + 1}`;
        const rows = tableRows.get(key);
        if (!rows || !rows.length) {
          // No interlinear row for this verse; fall back to the plain bsb.txt
          // string for it, if we have one.
          const plainText = plain.get(book.id)?.[c]?.[v] ?? null;
          chapterOut.push(plainText);
          continue;
        }
        const gWithBase = gWords.map((w, i) => ({ index: i, strongBase: baseStrong(w[1]) }));
        const aligned = alignGreedy(
          rows,
          gWithBase,
          (row, gw) => row.strongBase && gw.strongBase && row.strongBase === gw.strongBase
        );
        const segments = [];
        rows.forEach((row, i) => {
          if (i > 0) segments.push([" ", null]);
          const gw = aligned[i];
          totalSegments++;
          if (gw) linkedSegments++;
          segments.push([row.english, gw ? gw.index : null]);
        });
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
    `bsb_tables alignment: ${linkedSegments}/${totalSegments} English segments linked to a Greek index (${((linkedSegments / totalSegments) * 100).toFixed(2)}%)`
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
    const wb = XLSX.readFile(xlsxPath, { cellFormula: false, cellHTML: false });
    console.log(`bsb_tables.xlsx: sheets = ${JSON.stringify(wb.SheetNames)}`);
    rows = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws || !ws["!ref"]) {
        console.log(`bsb_tables.xlsx: sheet "${sheetName}" is empty, skipping`);
        continue;
      }
      const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      console.log(
        `bsb_tables.xlsx: sheet "${sheetName}" range=${ws["!ref"]} rows=${sheetRows.length} header=${JSON.stringify(sheetRows[0])}`
      );
      if (sheetRows.length < 2) continue;
      const header = sheetRows[0].map((h) => String(h).toLowerCase().trim());
      const hasRef = header.some((h) => h.includes("verse") || h.includes("reference") || h.includes("ref"));
      const hasEnglish = header.some((h) => h.includes("english") || h.includes("translation") || h.includes("bsb"));
      if (!hasRef || !hasEnglish) {
        console.log(`bsb_tables.xlsx: sheet "${sheetName}" doesn't look like the interlinear table, skipping`);
        continue;
      }
      // Data rows only; header handled per-sheet since column order could
      // vary slightly between sheets (e.g. an OT sheet vs an NT sheet).
      rows.push({ header, data: sheetRows.slice(1) });
    }
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
    const idx = (...keywords) => header.findIndex((h) => keywords.some((k) => h.includes(k)));
    const refIdx = idx("verse", "reference", "ref");
    const strongIdx = idx("strong");
    const englishIdx = idx("english", "translation", "bsb");
    const greekIdx = idx("greek", "hebrew", "original");
    if (refIdx === -1 || englishIdx === -1) continue;
    console.log(
      `bsb_tables: columns ref=${refIdx} strong=${strongIdx} english=${englishIdx} greek=${greekIdx} (of ${header.length})`
    );

    let lastRef = null;
    for (const row of data) {
      totalDataRows++;
      if (!row || !row.length) continue;
      const refCell = row[refIdx];
      const ref = refCell ? parseRef(refCell) : lastRef;
      if (!ref) continue;
      lastRef = ref;
      const english = String(row[englishIdx] ?? "").trim();
      if (!english) continue;
      const strongBase = strongIdx !== -1 ? baseStrong(row[strongIdx]) : null;
      const key = `${ref.book}:${ref.chapter}:${ref.verse}`;
      let arr = byVerse.get(key);
      if (!arr) {
        arr = [];
        byVerse.set(key, arr);
      }
      arr.push({ english, strongBase });
    }
  }
  console.log(`bsb_tables: ${totalDataRows} data rows total, grouped into ${byVerse.size} verses`);
  return byVerse;
}
