// Downloads a public-domain KJV text (chapter/verse-array form) purely to read off how
// many verses each OT chapter has in standard English versification. This is used only
// to expand witness `contents` ranges (e.g. "ISA.1.1-ISA.66.24") into per-verse keys for
// data/evidence/ot/coverage-summary.json — the KJV text itself is never written anywhere
// under data/bible/text/ (that belongs to a separate job) and the downloaded files are
// cached under scripts/ot/.cache, which is not committed.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./books.mjs";

const CACHE_DIR = path.resolve("scripts/ot/.cache/kjv");
const BASE = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master";

const KJV_NAME = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1Samuel", "2SA": "2Samuel",
  "1KI": "1Kings", "2KI": "2Kings", "1CH": "1Chronicles", "2CH": "2Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms", PRO: "Proverbs",
  ECC: "Ecclesiastes", SNG: "SongofSolomon", ISA: "Isaiah", JER: "Jeremiah", LAM: "Lamentations",
  EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah",
  JON: "Jonah", MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
  ZEC: "Zechariah", MAL: "Malachi",
};

async function fetchText(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const book of BOOKS) {
    const name = KJV_NAME[book.usfm];
    const dest = path.join(CACHE_DIR, `${book.usfm}.json`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    const url = `${BASE}/${name}.json`;
    process.stdout.write(`fetching verse counts for ${book.usfm} (${name}.json) ... `);
    const text = await fetchText(url);
    fs.writeFileSync(dest, text, "utf8");
    console.log("ok");
  }
  console.log(`English verse-count reference cached at ${CACHE_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
