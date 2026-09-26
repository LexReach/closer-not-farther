// Parse the SBLGNT apparatus (LogosBible/SBLGNT, data/sblgntapp/text, CC BY 4.0)
// into data/evidence/apparatus/<BOOK>.json:
//   { "c:v": [ { "lemma": SBLGNT reading, "readings": [ { "text", "eds": [...] } ] } ] }
// The first reading is always the SBLGNT's own (eds include "SBLGNT").
// Usage: node scripts/evidence/sblgnt-apparatus.mjs <path to SBLGNT repo> [outDir]
import fs from 'node:fs';
import path from 'node:path';

const FILES = {
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM', '1Cor': '1CO', '2Cor': '2CO', Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL',
  '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI', '2Tim': '2TI', Titus: 'TIT', Phlm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE', '2Pet': '2PE',
  '1John': '1JN', '2John': '2JN', '3John': '3JN', Jude: 'JUD', Rev: 'REV',
};
const repo = process.argv[2];
const out = process.argv[3] ?? 'data/evidence/apparatus';
fs.mkdirSync(out, { recursive: true });
const dir = path.join(repo, 'data/sblgntapp/text');
const isSiglum = (t) => /^[A-Z][A-Za-z0-9]*$/.test(t) || t === 'WHmarg';

/** "ὃν εἶπον Treg NA28 RP" → { text, eds } */
function reading(s) {
  const toks = s.trim().split(/\s+/).filter(Boolean);
  const eds = [];
  while (toks.length && isSiglum(toks[toks.length - 1])) eds.unshift(toks.pop());
  let text = toks.join(' ');
  if (text === '–' || text === '—') text = '';
  return { text, eds };
}

let books = 0;
let verses = 0;
let units = 0;
for (const f of fs.readdirSync(dir)) {
  const id = FILES[f.replace(/\.txt$/, '')];
  if (!id) {
    console.warn('skip', f);
    continue;
  }
  const res = {};
  const blocks = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const head = lines[0]?.match(/(\d+):(\d+)$/);
    if (!head || lines.length < 2) continue;
    const key = `${Number(head[1])}:${Number(head[2])}`;
    const body = lines.slice(1).join(' ').replace(/^(\d+:)?\d+\s+/, '');
    const entries = [];
    for (const unit of body.split('•')) {
      const [lem, rest] = unit.split(']');
      if (rest === undefined) continue;
      const first = reading(lem);
      const others = rest.split(';').map(reading).filter((r) => r.text || r.eds.length);
      const lemma = first.text;
      entries.push({
        lemma,
        readings: [{ text: lemma, eds: ['SBLGNT', ...first.eds.filter((e) => e !== 'Holmes')] }, ...others.map((r) => (r.text.startsWith('+ ') ? { text: `${lemma} ${r.text.slice(2)}`.trim(), eds: r.eds, add: true } : r))],
      });
    }
    if (entries.length) {
      res[key] = (res[key] ?? []).concat(entries);
      units += entries.length;
    }
  }
  verses += Object.keys(res).length;
  books++;
  fs.writeFileSync(path.join(out, `${id}.json`), JSON.stringify(res));
}
console.log(`apparatus: ${books} books, ${verses} verses, ${units} variation units`);
