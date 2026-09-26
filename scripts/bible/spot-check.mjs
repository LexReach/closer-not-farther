#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./lib/paths.mjs";

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

// JHN 1:1 Greek word list has λόγος (G3056) and BSB has a segment for "Word"
// linked to it.
const jhnGreek = readJson("greek/JHN.json");
const v = jhnGreek.chapters[0][0];
check("JHN.1.1 Greek word array present", Array.isArray(v) && v.length > 0);
const logosIdx = v.findIndex((w) => w[1] === "G3056");
check("JHN.1.1 has λόγος tagged G3056", logosIdx !== -1, JSON.stringify(v));

const bsbJhn = readJson("text/bsb/JHN.json");
const bsbV = bsbJhn.chapters[0][0];
check("JHN.1.1 BSB verse is a segment array", Array.isArray(bsbV), JSON.stringify(bsbV));
if (Array.isArray(bsbV)) {
  const wordSeg = bsbV.find(
    (seg) => seg[1] === logosIdx && /word/i.test(seg[0])
  );
  check(
    "JHN.1.1 BSB segment maps 'Word' to the λόγος Greek index",
    Boolean(wordSeg),
    JSON.stringify(bsbV)
  );
}

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

// Rough NT Greek word count.
let totalWords = 0;
for (const f of fs.readdirSync(path.join(DATA_DIR, "greek"))) {
  const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "greek", f), "utf8"));
  for (const ch of d.chapters) for (const verse of ch) if (verse) totalWords += verse.length;
}
check(`NT Greek word count ~138,000 (got ${totalWords})`, totalWords > 130000 && totalWords < 145000);

console.log(`\n${failures} failing check(s).`);
if (failures > 0) process.exit(1);
