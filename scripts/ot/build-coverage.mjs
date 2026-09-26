// Builds data/evidence/ot/coverage-summary.json: for every OT verse, [count, oldestId,
// oldestYear] computed from data/evidence/ot/witnesses.json's `contents` ranges.
import fs from "node:fs";
import path from "node:path";
import { loadEnglishVerseCounts, expandRange } from "./verse-counts.mjs";

const WITNESSES_PATH = path.resolve("data/evidence/ot/witnesses.json");
const OUT_PATH = path.resolve("data/evidence/ot/coverage-summary.json");

function main() {
  const verseCounts = loadEnglishVerseCounts();
  const { witnesses } = JSON.parse(fs.readFileSync(WITNESSES_PATH, "utf8"));

  // verseKey -> { count, oldestId, oldestYear }
  const summary = new Map();

  for (const w of witnesses) {
    if (!w.contents || !w.contents.length) continue;
    const seenForThisWitness = new Set(); // avoid double-counting if ranges overlap within one witness
    for (const range of w.contents) {
      let keys;
      try {
        keys = expandRange(range, verseCounts);
      } catch (err) {
        console.warn(`skip range ${range} for ${w.id}: ${err.message}`);
        continue;
      }
      for (const key of keys) {
        if (seenForThisWitness.has(key)) continue;
        seenForThisWitness.add(key);
        const entry = summary.get(key);
        if (!entry) {
          summary.set(key, { count: 1, oldestId: w.id, oldestYear: w.year });
        } else {
          entry.count++;
          if (typeof w.year === "number" && (typeof entry.oldestYear !== "number" || w.year < entry.oldestYear)) {
            entry.oldestId = w.id;
            entry.oldestYear = w.year;
          }
        }
      }
    }
  }

  const out = {};
  for (const [key, { count, oldestId, oldestYear }] of summary) {
    out[key] = [count, oldestId, oldestYear];
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out), "utf8");
  console.log(`Wrote coverage-summary.json: ${Object.keys(out).length} verses`);

  // Sanity: total verse universe across the 39 books, for context in the log.
  const totalVerses = Object.values(verseCounts).reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0);
  console.log(`Total OT verses (English versification universe): ${totalVerses}`);
  console.log(`Verses with at least one witness: ${Object.keys(out).length}`);
  console.log(`Sample: ISA.53.5 = ${JSON.stringify(out["ISA.53.5"])}`);
}

main();
