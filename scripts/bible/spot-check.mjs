#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./lib/paths.mjs";
import { NT_BOOKS } from "./lib/books.mjs";
import { fetchFirst } from "./lib/fetch.mjs";
import { parseRef } from "./lib/bsb-ref.mjs";
import { tokenize } from "./lib/align-text.mjs";

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    console.log(`FAIL  ${label}${detail ? " -- " + detail : ""}`);
    failures++;
  }
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), "utf8"));
}

function segText(seg) {
  return seg.map((s) => s[0]).join("");
}

// JHN 1:1 Greek word list has λόγος (G3056) and BSB has a segment for "Word"
// linked to it, and the segments reconstruct the exact known BSB text.
const jhnGreek = readJson("greek/JHN.json");
const v = jhnGreek.chapters[0][0];
check("JHN.1.1 Greek word array present", Array.isArray(v) && v.length > 0);
const logosIdx = v.findIndex((w) => w[1] === "G3056");
check("JHN.1.1 has λόγος tagged G3056", logosIdx !== -1, JSON.stringify(v));

const bsbJhn = readJson("text/bsb/JHN.json");
const bsbV = bsbJhn.chapters[0][0];
check("JHN.1.1 BSB verse is a segment array", Array.isArray(bsbV), JSON.stringify(bsbV));
if (Array.isArray(bsbV)) {
  console.log(`JHN.1.1 BSB segments: ${JSON.stringify(bsbV)}`);
  const expected = "In the beginning was the Word, and the Word was with God, and the Word was God.";
  check("JHN.1.1 BSB segments reconstruct the exact bsb.txt text", segText(bsbV) === expected, segText(bsbV));
  const wordSeg = bsbV.find((seg) => seg[1] === logosIdx && /word/i.test(seg[0]));
  check("JHN.1.1 BSB segment maps 'Word' to the λόγος Greek index", Boolean(wordSeg), JSON.stringify(bsbV));
}

// Report ROM 8:1 too (a verse with a bracketed supplied-word row in
// bsb_tables: "[there is]").
const bsbRom = readJson("text/bsb/ROM.json");
const rom81 = bsbRom.chapters[7]?.[0];
console.log(`ROM.8.1 BSB segments: ${JSON.stringify(rom81)}`);

// ROM 5:1 present with a Greek word array.
const romGreek = readJson("greek/ROM.json");
const rom51 = romGreek.chapters[4]?.[0];
check("ROM.5.1 Greek word array present", Array.isArray(rom51) && rom51.length > 0);

// MRK 16:9 present in all four English texts and in Greek.
const mrkGreek = readJson("greek/MRK.json");
check("MRK.16.9 Greek word array present", Array.isArray(mrkGreek.chapters[15]?.[8]));
for (const ver of ["bsb", "web", "kjv", "asv"]) {
  const d = readJson(`text/${ver}/MRK.json`);
  const verse = d.chapters[15]?.[8];
  check(`MRK.16.9 present in ${ver}`, verse != null, JSON.stringify(verse));
}

// KJV 1 John 5:7 contains the Comma Johanneum.
const kjv1jn = readJson("text/kjv/1JN.json");
const v57 = kjv1jn.chapters[4]?.[6];
check(
  "KJV 1JN.5.7 contains the Comma Johanneum",
  typeof v57 === "string" && /Holy Ghost/i.test(v57) && /Father/i.test(v57),
  JSON.stringify(v57)
);

// No stray "¶" paragraph marks anywhere in the ebible.org-derived texts
// (e.g. KJV John 1:6 used to start "¶ There was a man...").
for (const ver of ["web", "kjv", "asv"]) {
  let bad = [];
  const dir = path.join(DATA_DIR, "text", ver);
  for (const f of fs.readdirSync(dir)) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const ch of d.chapters) {
      for (const verse of ch) {
        if (typeof verse === "string" && verse.includes("¶")) bad.push(`${f}:${verse.slice(0, 40)}`);
      }
    }
  }
  check(`${ver}: no stray "¶" paragraph marks`, bad.length === 0, bad.slice(0, 5).join(" | "));
}

// Rough NT Greek word count.
let totalWords = 0;
for (const f of fs.readdirSync(path.join(DATA_DIR, "greek"))) {
  const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "greek", f), "utf8"));
  for (const ch of d.chapters) for (const verse of ch) if (verse) totalWords += verse.length;
}
check(`NT Greek word count ~138,000 (got ${totalWords})`, totalWords > 130000 && totalWords < 145000);

// Independently re-fetch bsb.txt and verify every NT verse's BSB segments
// concatenate to EXACTLY that text (not just internally self-consistent).
try {
  const scratch = process.env.BIBLE_SCRATCH || path.join("/tmp", "bible-src-check");
  const bsbTxtPath = path.join(scratch, "bsb-verify.txt");
  await fetchFirst(
    [
      "https://bereanbible.com/bsb.txt",
      "https://www.bereanbible.com/bsb.txt",
      "https://bereanbible.com/text/bsb.txt",
      "https://bereanbible.com/downloads/bsb.txt",
    ],
    bsbTxtPath
  );
  const lines = fs.readFileSync(bsbTxtPath, "utf8").split(/\r\n|\r|\n/);
  const canonical = new Map(); // "BOOK:c:v" -> text
  for (const line of lines) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const ref = parseRef(line.slice(0, tab));
    if (!ref) continue;
    const text = line.slice(tab + 1).trim();
    if (!text) continue;
    canonical.set(`${ref.book}:${ref.chapter}:${ref.verse}`, text);
  }

  let checkedVerses = 0;
  let mismatches = [];
  let totalCanonWords = 0;
  let linkedCanonWords = 0;
  for (const book of NT_BOOKS) {
    const bsb = readJson(`text/bsb/${book.id}.json`);
    for (let c = 0; c < bsb.chapters.length; c++) {
      for (let vi = 0; vi < bsb.chapters[c].length; vi++) {
        const key = `${book.id}:${c + 1}:${vi + 1}`;
        const want = canonical.get(key);
        if (want == null) continue;
        const got = bsb.chapters[c][vi];
        checkedVerses++;
        const gotText = Array.isArray(got) ? segText(got) : got;
        if (gotText !== want) mismatches.push(key);
        if (Array.isArray(got)) {
          totalCanonWords += tokenize(want).length;
          linkedCanonWords += got.filter((s) => s[1] != null).reduce((n, s) => n + tokenize(s[0]).length, 0);
        }
      }
    }
  }
  check(
    `All ${checkedVerses} NT verses' BSB segments reconstruct bsb.txt exactly`,
    mismatches.length === 0,
    `${mismatches.length} mismatches, e.g. ${mismatches.slice(0, 5).join(", ")}`
  );
  const pct = ((linkedCanonWords / totalCanonWords) * 100).toFixed(2);
  console.log(`NT English word alignment coverage: ${linkedCanonWords}/${totalCanonWords} (${pct}%)`);
  check("NT English word alignment coverage > 85%", linkedCanonWords / totalCanonWords > 0.85, `${pct}%`);
} catch (e) {
  check("Independently verified BSB segments against a fresh bsb.txt fetch", false, e.message);
}

console.log(`\n${failures} failing check(s).`);
if (failures > 0) process.exit(1);
