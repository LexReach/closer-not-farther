// Builds data/bible/hebrew/<BOOK>.json for all 39 OT books from morphhb (Westminster
// Leningrad Codex, CC BY 4.0) + STEPBible TAHOT (per-word contextual glosses, CC BY 4.0),
// per data/bible/SCHEMA.md.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./books.mjs";
import { parseMorphhbBook } from "./morphhb.mjs";
import { loadTahot } from "./tahot.mjs";
import { loadTbesh } from "./tbesh.mjs";

const MORPHHB_CACHE = path.resolve("scripts/ot/.cache/morphhb");
const STEPBIBLE_CACHE = path.resolve("scripts/ot/.cache/stepbible");
const OUT_DIR = path.resolve("data/bible/hebrew");

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Loading TAHOT (per-word glosses)...");
  const tahot = loadTahot(STEPBIBLE_CACHE);
  console.log(`  ${tahot.size} verse gloss-rows loaded`);
  console.log("Loading TBESH (fallback gloss by Strong's id)...");
  const tbesh = loadTbesh(path.join(STEPBIBLE_CACHE, "TBESH.txt"));
  console.log(`  ${tbesh.size} lexicon entries loaded`);

  let totalWords = 0;
  let totalTahotMatched = 0;
  let totalFallbackGloss = 0;
  let totalNoGloss = 0;
  let totalNullStrong = 0;
  const mismatches = [];
  const nullStrongLemmas = new Map();

  for (const book of BOOKS) {
    const xmlPath = path.join(MORPHHB_CACHE, `${book.morphhb}.xml`);
    const xml = fs.readFileSync(xmlPath, "utf8");
    const parsed = parseMorphhbBook(xml);

    const maxChapter = Math.max(...parsed.chapters.map((ch) => ch.c));
    const chapters = new Array(maxChapter).fill(null).map(() => []);
    const map = {};
    let bookWords = 0;

    for (const ch of parsed.chapters) {
      const maxVerse = Math.max(...ch.verses.map((vs) => vs.v));
      const versesArr = new Array(maxVerse).fill(null);
      for (const verse of ch.verses) {
        const key = `${book.usfm}.${ch.c}.${verse.v}`;
        const tahotGlosses = tahot.get(key);
        const useTahot = tahotGlosses && tahotGlosses.length === verse.words.length;
        if (tahotGlosses && !useTahot) {
          mismatches.push(`${key}: morphhb=${verse.words.length} tahot=${tahotGlosses.length}`);
        }

        const wordTuples = verse.words.map((w, i) => {
          bookWords++;
          totalWords++;
          if (!w.strong) {
            totalNullStrong++;
            nullStrongLemmas.set(w.lemma, (nullStrongLemmas.get(w.lemma) || 0) + 1);
          }
          let gloss;
          if (useTahot && tahotGlosses[i]) {
            gloss = tahotGlosses[i];
            totalTahotMatched++;
          } else {
            const lex = w.strong ? tbesh.get(w.strong) : null;
            gloss = lex ? lex.gloss : "";
            if (gloss) totalFallbackGloss++;
            else totalNoGloss++;
          }
          return [w.surface, w.strong || "", w.morph, gloss];
        });
        versesArr[verse.v - 1] = wordTuples;

        for (const kref of verse.kjvRefs) {
          map[`${kref.c}:${kref.v}`] = `${ch.c}:${verse.v}`;
        }
      }
      chapters[ch.c - 1] = versesArr;
    }

    const bookObj = {
      book: book.usfm,
      lang: "hbo",
      versification: "hebrew",
      chapters,
    };
    if (Object.keys(map).length) {
      bookObj.map = map;
    }

    const outPath = path.join(OUT_DIR, `${book.usfm}.json`);
    fs.writeFileSync(outPath, JSON.stringify(bookObj), "utf8");
    console.log(
      `${book.usfm}: ${bookWords} words, ${maxChapter} chapters` +
        (bookObj.map ? `, ${Object.keys(bookObj.map).length} versification map entries` : "")
    );
  }

  console.log("\n=== Hebrew OT build summary ===");
  console.log(`Total words: ${totalWords}`);
  console.log(`  gloss from TAHOT:    ${totalTahotMatched}`);
  console.log(`  gloss from lexicon:  ${totalFallbackGloss}`);
  console.log(`  no gloss available:  ${totalNoGloss}`);
  console.log(`  null strong:         ${totalNullStrong}`);
  if (nullStrongLemmas.size) {
    console.log("  null-strong lemmas (lemma: count):");
    for (const [lemma, count] of [...nullStrongLemmas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`    ${JSON.stringify(lemma)}: ${count}`);
    }
  }
  console.log(`Verse word-count mismatches vs TAHOT (fell back to lexicon): ${mismatches.length}`);
  if (mismatches.length) {
    fs.writeFileSync(
      path.resolve("scripts/ot/.cache/tahot-mismatches.txt"),
      mismatches.join("\n"),
      "utf8"
    );
    console.log("  (full list written to scripts/ot/.cache/tahot-mismatches.txt)");
  }
}

main();
