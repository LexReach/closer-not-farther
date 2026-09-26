#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
let bad = 0;
for (const f of files) {
  try {
    JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  } catch (e) {
    bad++;
    console.error("BAD", f, e.message);
  }
}
console.log(`${files.length - bad}/${files.length} valid JSON in ${dir}`);
if (bad) process.exit(1);
