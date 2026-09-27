#!/usr/bin/env node
// List the words flagged as sacred names whose contraction the table in
// tei.mjs does not expand (the expansion equals the letters as written):
//   node scripts/evidence/ns-scan.mjs [transcriptionsDir=data/evidence/transcriptions]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'data/evidence/transcriptions';
const key = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}]/gu, '');
const open = new Map();
let words = 0;
for (const ga of fs.readdirSync(dir)) {
  for (const f of fs.readdirSync(path.join(dir, ga))) {
    const page = JSON.parse(fs.readFileSync(path.join(dir, ga, f), 'utf8'));
    let run = [];
    for (const c of page.columns)
      for (const l of c.lines)
        for (const t of l.tokens) {
          run.push(t);
          if (t.j) continue;
          const ns = run.find((x) => x.ns)?.ns;
          if (ns) {
            words++;
            const k = key(ns);
            if (k === key(run.map((x) => x.t).join(''))) open.set(k, (open.get(k) ?? 0) + 1);
          }
          run = [];
        }
  }
}
const list = [...open].sort((a, b) => b[1] - a[1]);
const n = list.reduce((s, [, c]) => s + c, 0);
console.log(`${words} sacred-name words, ${n} not expanded (${list.length} forms)`);
console.log(list.map(([k, c]) => `${k} ${c}`).join('\n'));
