// Downloads all 39 OT OSIS XML files from openscriptures/morphhb (Westminster
// Leningrad Codex with lemma + morph tagging) into a local cache. Not committed.
import fs from "node:fs";
import path from "node:path";
import { BOOKS } from "./books.mjs";

const CACHE_DIR = path.resolve("scripts/ot/.cache/morphhb");
const BASE = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc";

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
  let ok = 0;
  for (const book of BOOKS) {
    const dest = path.join(CACHE_DIR, `${book.morphhb}.xml`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      ok++;
      continue;
    }
    const url = `${BASE}/${book.morphhb}.xml`;
    process.stdout.write(`fetching ${book.usfm} (${book.morphhb}.xml) ... `);
    const text = await fetchText(url);
    fs.writeFileSync(dest, text, "utf8");
    console.log(`${text.length} bytes`);
    ok++;
  }
  console.log(`morphhb: ${ok}/${BOOKS.length} books cached at ${CACHE_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
