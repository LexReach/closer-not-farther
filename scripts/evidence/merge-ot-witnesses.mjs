#!/usr/bin/env node
// Rebuild data/evidence/ot/witnesses.json from sourced data:
// - Dead Sea Scrolls: every biblical row of Wikipedia's "List of the Dead Sea
//   Scrolls" (parse-dss.mjs), replacing the earlier compiled spans;
// - Codex Alexandrinus: contents with the lacunae listed in its Wikipedia
//   article (refs/wp-Codex_Alexandrinus.wiki, citing Würthwein 1988);
// - the Masoretic codices, Samaritan Pentateuch, Genizah, Vaticanus and
//   Sinaiticus entries are kept as they were.
//   node scripts/evidence/merge-ot-witnesses.mjs
import fs from 'node:fs';

const dir = 'data/evidence/ot';
// The data-ot job's compiled list, kept as the input so this script can be re-run.
const cur = JSON.parse(fs.readFileSync(`${dir}/refs/witnesses-compiled.json`, 'utf8')).witnesses;
const { witnesses: dss } = JSON.parse(fs.readFileSync(`${dir}/refs/dss-parsed.json`, 'utf8'));
const isScroll = (w) => /^\d+Q|^Mur|^Mas|^5\/6Hev|^XHev|^8HevXII/.test(w.id);
const kept = cur.filter((w) => !isScroll(w) && w.id !== 'codex-alexandrinus');
const key = (s) => s.replace(/[\s.]/g, '').toLowerCase();
const oldScrolls = new Map(cur.filter(isScroll).map((w) => [key(w.id), w]));
// Also by cave number, which the earlier list gave in the name: "paleo-Hebrew Exodus (4Q22)".
const byNumber = new Map(cur.filter(isScroll).flatMap((w) => ((/\((\d+Q\d+[a-z]?)\)/.exec(w.name) ?? [])[1] ? [[key(/\((\d+Q\d+[a-z]?)\)/.exec(w.name)[1]), w]] : [])));
const log = [];
const scrolls = dss.map((w) => {
  const old = [oldScrolls.get(key(w.name)), oldScrolls.get(key(w.id)), byNumber.get(key(w.id))].find((x) => x && oldScrolls.has(key(x.id)));
  if (old) {
    oldScrolls.delete(key(old.id));
    log.push(`${w.name}: ${old.contents.join(',')} (${old.date}) -> ${w.contents.length} ranges (${w.date})`);
    return { ...w, id: old.id, name: old.name, siglum: w.siglum, links: { ...w.links, images: w.links.images ?? old.links?.images ?? null, info: old.links?.info ?? w.links.info }, note: [old.note, w.note].filter(Boolean).join(' ') };
  }
  return w;
});
// Earlier compiled spans the table does not confirm are left out (not guessed).
for (const w of oldScrolls.values()) log.push(`${w.id} (${w.name}): not in the Wikipedia table; left out (was ${w.contents.join(',')})`);
const alexandrinus = {
  id: 'codex-alexandrinus',
  name: 'Codex Alexandrinus',
  siglum: 'A / 02',
  date: 'c. 400-440 AD',
  year: 440,
  lang: 'grc',
  institution: 'British Library, London (Royal MS 1 D V-VIII)',
  contents: ['GEN.1.1-1SA.12.16', '1SA.14.10-PSA.50.19', 'PSA.80.12-MAL.4.6'],
  links: { images: 'https://www.bl.uk/manuscripts/FullDisplay.aspx?ref=Royal_MS_1_D_V', info: 'https://en.wikipedia.org/wiki/Codex_Alexandrinus' },
  embed: false,
  terms: null,
  compiled: true,
  source: 'Wikipedia, Codex Alexandrinus (lacunae citing Würthwein, Der Text des Alten Testaments, 1988, p. 85)',
  note: 'The whole Greek Old Testament except two lost stretches: 1 Samuel (1 Kingdoms) 12:17-14:9 and Psalms 49:20-79:11 in the Septuagint’s numbering, given here as Psalms 50:20-80:11 in English numbering (approximate). Genesis 14:14-17, 15:1-5, 15:16-19 and 16:6-9 are damaged (the lower part of a torn leaf is lost); the Septuagint’s order and verse divisions are mapped only approximately onto the Hebrew canon used here.',
};
const all = [...kept, alexandrinus, ...scrolls].sort((a, b) => a.year - b.year);
fs.writeFileSync(`${dir}/witnesses.json`, JSON.stringify({ witnesses: all }, null, 2));
fs.writeFileSync(`${dir}/refs/merge-log.txt`, log.join('\n') + '\n');
console.log(`${all.length} witnesses: ${kept.length} kept, 1 Alexandrinus, ${scrolls.length} scrolls; ${log.length} log lines`);
