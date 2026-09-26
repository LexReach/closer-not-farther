#!/usr/bin/env node
// Builds data/bible/text/{web,kjv,asv}/<BOOK>.json from ebible.org USFM zips.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { BOOKS } from "./lib/books.mjs";
import { DATA_DIR } from "./lib/paths.mjs";
import { fetchFirst, unzip, listFilesRecursive } from "./lib/fetch.mjs";
import { parseUsfm } from "./lib/usfm.mjs";

const SCRATCH = process.env.BIBLE_SCRATCH || path.join(os.tmpdir(), "bible-src");

const TRANSLATIONS = [
  {
    ver: "web",
    name: "World English Bible",
    urls: [
      "https://ebible.org/Scriptures/eng-web_usfm.zip",
      "https://ebible.org/Scriptures/engwebp_usfm.zip",
      "https://ebible.org/Scriptures/eng-webp_usfm.zip",
    ],
  },
  {
    ver: "kjv",
    name: "King James Version",
    urls: [
      "https://ebible.org/Scriptures/eng-kjv_usfm.zip",
      "https://ebible.org/Scriptures/eng-kjv2006_usfm.zip",
      "https://ebible.org/Scriptures/engkjv_usfm.zip",
    ],
  },
  {
    ver: "asv",
    name: "American Standard Version",
    urls: [
      "https://ebible.org/Scriptures/eng-asv_usfm.zip",
      "https://ebible.org/Scriptures/eng-asv1901_usfm.zip",
      "https://ebible.org/Scriptures/engasv_usfm.zip",
    ],
  },
];

const bookById = new Map(BOOKS.map((b) => [b.id, b]));

async function buildTranslation(t) {
  const zipPath = path.join(SCRATCH, `${t.ver}.zip`);
  const extractDir = path.join(SCRATCH, t.ver);
  await fetchFirst(t.urls, zipPath);
  unzip(zipPath, extractDir);

  const allFiles = listFilesRecursive(extractDir);
  const files = allFiles.filter((f) => /\.(usfm|sfm|SFM|USFM)$/.test(f));
  console.log(`${t.ver}: found ${files.length} USFM files`);

  for (const f of allFiles) {
    if (/copr\.htm|license|readme/i.test(f)) {
      console.log(`--- ${t.ver} license/about file: ${f} ---`);
      console.log(
        fs
          .readFileSync(f, "utf8")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2000)
      );
      console.log("--- end ---");
    }
  }

  const outDir = path.join(DATA_DIR, "text", t.ver);
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  let verseCount = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const parsed = parseUsfm(content);
    if (!parsed.id || !bookById.has(parsed.id)) continue;
    const out = {
      ver: t.ver,
      book: parsed.id,
      chapters: parsed.chapters,
    };
    if (Object.keys(parsed.headings).length) out.headings = parsed.headings;
    fs.writeFileSync(path.join(outDir, `${parsed.id}.json`), JSON.stringify(out));
    written++;
    for (const ch of parsed.chapters) for (const v of ch) if (v) verseCount++;
  }
  console.log(`${t.ver}: wrote ${written}/66 books, ${verseCount} non-null verses`);
  if (written < 66) {
    const missing = BOOKS.map((b) => b.id).filter(
      (id) => !fs.existsSync(path.join(outDir, `${id}.json`))
    );
    console.warn(`${t.ver}: MISSING books: ${missing.join(", ")}`);
  }
}

for (const t of TRANSLATIONS) {
  await buildTranslation(t);
}
