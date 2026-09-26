#!/usr/bin/env node
// Orchestrates the full data/bible build. Order matters: build-bsb.mjs and
// build-lex-greek.mjs read the Greek word files build-greek.mjs writes, and
// build-books.mjs reads the BSB text build-bsb.mjs writes.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const steps = [
  "fetch-deps.mjs",
  "build-greek.mjs",
  "build-lex-greek.mjs",
  "build-bsb.mjs",
  "build-books.mjs",
  "build-english.mjs",
];

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  execFileSync("node", [path.join(__dirname, step)], { stdio: "inherit" });
}

console.log("\n=== validate ===");
for (const dir of ["greek", "text/bsb", "text/web", "text/kjv", "text/asv"]) {
  execFileSync(
    "node",
    [path.join(__dirname, "validate-json.mjs"), path.join(__dirname, "..", "..", "data", "bible", dir)],
    { stdio: "inherit" }
  );
}
