#!/usr/bin/env node
// Re-run the TEI parser over the raw pages saved by build-transcriptions.mjs,
// without fetching anything:
//   node scripts/evidence/reparse-transcriptions.mjs [teiDir=data/evidence/tei] [outDir=data/evidence/transcriptions]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseTEIPage } from './tei.mjs';

const teiDir = process.argv[2] ?? 'data/evidence/tei';
const outDir = process.argv[3] ?? 'data/evidence/transcriptions';
fs.rmSync(outDir, { recursive: true, force: true });
let pages = 0;
let mss = 0;
for (const f of fs.readdirSync(teiDir).filter((x) => x.endsWith('.json.gz'))) {
  const ga = f.replace(/\.json\.gz$/, '');
  const raws = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(teiDir, f))).toString('utf8'));
  fs.mkdirSync(path.join(outDir, ga), { recursive: true });
  mss++;
  for (const [pageId, { folio, xml }] of Object.entries(raws)) {
    const page = parseTEIPage(xml, { ga, pageId: Number(pageId), folio });
    if (!page.columns.length) continue;
    fs.writeFileSync(path.join(outDir, ga, `${pageId}.json`), JSON.stringify(page));
    pages++;
  }
}
console.log(`${mss} manuscripts, ${pages} pages`);
