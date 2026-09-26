// Orchestrates the full OT data build, in order. Used by .github/workflows/data-ot.yml.
import { execFileSync } from "node:child_process";

const steps = [
  "fetch-morphhb.mjs",
  "fetch-stepbible.mjs",
  "fetch-versecounts.mjs",
  "build-hebrew.mjs",
  "build-lexicon.mjs",
  "build-witnesses.mjs",
  "build-coverage.mjs",
  "write-sources.mjs",
];

for (const step of steps) {
  console.log(`\n=== scripts/ot/${step} ===`);
  execFileSync("node", [`scripts/ot/${step}`], { stdio: "inherit" });
}

console.log("\nOT data build complete.");
