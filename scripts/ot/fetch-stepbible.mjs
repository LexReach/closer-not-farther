// Downloads STEPBible-Data's TAHOT (Translators Amalgamated Hebrew OT, for
// per-word contextual glosses) and TBESH (Translators Brief lexicon of Extended
// Strongs for Hebrew, for data/bible/lex-hebrew.json) into a local cache. Not committed.
import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.resolve("scripts/ot/.cache/stepbible");
const BASE = "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master";

const FILES = [
  {
    name: "TAHOT_Gen-Deu.txt",
    urlPath:
      "Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  },
  {
    name: "TAHOT_Jos-Est.txt",
    urlPath:
      "Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  },
  {
    name: "TAHOT_Job-Sng.txt",
    urlPath:
      "Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  },
  {
    name: "TAHOT_Isa-Mal.txt",
    urlPath:
      "Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  },
  {
    name: "TBESH.txt",
    urlPath:
      "Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt",
  },
];

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
  for (const f of FILES) {
    const dest = path.join(CACHE_DIR, f.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`cached already: ${f.name}`);
      continue;
    }
    const url = `${BASE}/${encodeURIComponent(f.urlPath).replace(/%2F/g, "/")}`;
    process.stdout.write(`fetching ${f.name} ... `);
    const text = await fetchText(url);
    fs.writeFileSync(dest, text, "utf8");
    console.log(`${text.length} bytes`);
  }
  console.log(`STEPBible-Data: cached at ${CACHE_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
