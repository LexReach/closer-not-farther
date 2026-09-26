// Checks for the Reader's pure modules: the ESV adapter (against a mocked
// proxy), the local adapter, and plain-English parsing.
import { EsvAdapter, LocalAdapter, verseText } from '../src/reader/adapters.ts';
import { parseGreek, parseHebrew, translitGreek } from '../src/reader/morph.ts';
import { findFolio, firstPage, folioKey, manifestCanvases } from '../src/library/iiif.ts';

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};

// ---- ESV adapter with a mocked proxy ----
const calls: string[] = [];
const mockFetch = async (url: string) => {
  calls.push(url);
  const ch = Number(decodeURIComponent(url).match(/John (\d+)/)?.[1] ?? 1);
  const n = 30; // 30 verses per mocked chapter
  const text = Array.from({ length: n }, (_, i) => `[${i + 1}] Verse ${ch}:${i + 1} text.`).join(' ') + ' (ESV)';
  return { ok: true, status: 200, json: async () => ({ passages: [text] }) };
};
const off = new EsvAdapter('', () => 'John', mockFetch);
check(!off.available() && off.label === 'ESV (connect)', 'ESV without a proxy is unavailable and labelled "ESV (connect)"');
let threw = false;
try {
  await off.getChapter('JHN', 1);
} catch {
  threw = true;
}
check(threw && calls.length === 0, 'ESV without a proxy never calls the network');

const esv = new EsvAdapter('https://proxy.example/', () => 'John', mockFetch, 500);
const c3 = await esv.getChapter('JHN', 3);
check(esv.available() && esv.label === 'ESV', 'ESV with a proxy is available');
check(c3.verses.length === 30 && c3.verses[15] === 'Verse 3:16 text.', 'ESV verse numbers parse into the right slots');
check(calls[0].startsWith('https://proxy.example/v3/passage/text/?q=John%203&'), 'ESV requests go to the proxy passage/text endpoint');
await esv.getChapter('JHN', 3);
check(calls.length === 1, 'a cached chapter is not fetched again');
for (let c = 4; c <= 25; c++) await esv.getChapter('JHN', c);
check(esv.size <= 500, `ESV cache holds at most 500 verses (holds ${esv.size})`);
await esv.getChapter('JHN', 3);
check(calls.length === 24, 'the least recently used chapter was evicted and refetched');
check(EsvAdapter.parse('[1] In the beginning [2] He was').join('|') === 'In the beginning|He was', 'ESV parse handles adjacent verses');

// ---- Local adapter ----
const localFetch = async (url: string) => ({
  ok: url.endsWith('/text/bsb/JHN.json'),
  status: url.endsWith('/text/bsb/JHN.json') ? 200 : 404,
  json: async () => ({ chapters: [[[['In ', 0], ['the beginning', 1]], 'Plain verse']] }),
});
const bsb = new LocalAdapter('bsb', 'Berean Standard Bible', 'BSB', '/b/', localFetch);
const ch = await bsb.getChapter('JHN', 1);
check(verseText(ch.verses[0]) === 'In the beginning' && verseText(ch.verses[1]) === 'Plain verse', 'local adapter reads segments and strings');

// ---- Parsing in plain English ----
check(parseGreek('V-AAI-3S') === 'verb, aorist, active, indicative, 3rd person, singular', 'V-AAI-3S');
check(parseGreek('N-NSM') === 'noun, nominative, singular, masculine', 'N-NSM');
check(parseGreek('V-PAP-NSM') === 'verb, present, active, participle, nominative, singular, masculine', 'V-PAP-NSM');
check(parseGreek('CONJ') === 'conjunction', 'CONJ');
check(parseHebrew('HVqp3ms') === 'verb, qal, perfect, 3rd person, masculine, singular', 'HVqp3ms');
check(parseHebrew('HC/Ncmsa').startsWith('conjunction + noun, masculine, singular, absolute'), 'HC/Ncmsa');
check(translitGreek('λόγος') === 'logos' && translitGreek('ἀρχῇ') === 'archē', 'Greek transliteration');

// ---- Library viewer: first real page ----
const cv = (...labels: string[]) => labels.map((label) => ({ label, service: null, image: null }));
check(firstPage(cv('Plat supérieur', 'Garde', 'f. 1r', 'f. 1v')) === 2, 'first page: folio 1 wins');
check(firstPage(cv('Front cover', 'Flyleaf', 'Inside', 'p. 2', 'p. 3', 'p. 4')) === 2, 'first page: after the last cover/flyleaf');
check(firstPage(cv('a', 'b', 'c', 'd')) === 2, 'first page: else the third canvas');
check(firstPage(cv('only')) === 0, 'first page: short manifests open at 0');
const v2 = manifestCanvases({ sequences: [{ canvases: [{ label: 'f. 1r', images: [{ resource: { '@id': 'img.jpg', service: { '@id': 'https://x/iiif/1' } } }] }] }] });
check(v2[0].service === 'https://x/iiif/1' && v2[0].label === 'f. 1r', 'IIIF v2 manifest canvases');
const v3 = manifestCanvases({ items: [{ label: { en: ['fol. 1'] }, items: [{ items: [{ body: { id: 'a.jpg', service: [{ id: 'https://y/1' }] } }] }] }] });
check(v3[0].service === 'https://y/1' && v3[0].label === 'fol. 1', 'IIIF v3 manifest canvases');

check(folioKey('Vat.gr.1209, f. 12r') === '12r' && folioKey('fol. 3 verso') === '3v' && folioKey('12r') === '12r' && folioKey('p. 7') === '7' && folioKey('Plat supérieur') === null, 'folio labels normalize');
check(findFolio(cv('Cover', 'f. 1r', 'f. 1v', 'f. 2r'), '1v') === 2 && findFolio(cv('a'), '9r') === -1, 'folio lookup in a manifest');

if (failures) process.exit(1);
