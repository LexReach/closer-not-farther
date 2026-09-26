#!/usr/bin/env node
/**
 * fetch-catalog.mjs
 *
 * Builds data/library/catalog.json: every catalogued Greek New Testament manuscript
 * (papyri, majuscules, minuscules, lectionaries), merged from Wikidata (structured,
 * keyed by Gregory-Aland number P1577) and the English Wikipedia "List of New
 * Testament ..." articles (free-text tables, parsed with node-html-parser).
 *
 * Usage:
 *   node scripts/library/fetch-catalog.mjs
 *
 * Requires network access to query.wikidata.org and en.wikipedia.org, so in practice
 * this only runs inside the fetch-library.yml GitHub Actions workflow (this sandbox's
 * proxy blocks those hosts). Run locally only if your machine can reach them directly.
 *
 * Writes:
 *   data/library/catalog.json  - the merged, sorted catalog (see FIELDS below)
 *   data/library/fetch-log.md  - counts + failures (appended to by fetch-images.mjs)
 *
 * Sources:
 *   - Wikidata Query Service, https://query.wikidata.org/sparql
 *     (properties: P1577 GA number, P571 inception, P195 collection, P276 location,
 *      P217 inventory number, P18 image, P373 Commons category, P6108 IIIF manifest,
 *      P131 located-in, P17 country)
 *   - English Wikipedia, action=parse API:
 *     "List of New Testament papyri", "List of New Testament uncials",
 *     "List of New Testament minuscules (1-1000/1001-2000/2001-)",
 *     "List of New Testament lectionaries" (exact titles discovered via search if needed)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse as parseHTML } from 'node-html-parser';
import {
  fetchJSON,
  fetchText,
  normalizeGA,
  parseCenturyFromText,
  parseCenturyFromWikidataTime,
  parseContents,
  compareRows,
  lookupInstitutionDict,
  isGenericLabel,
  runPool,
} from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'data', 'library');

const WD_ENDPOINT = 'https://query.wikidata.org/sparql';
const WP_API = 'https://en.wikipedia.org/w/api.php';

const log = [];
function note(msg) {
  console.log(msg);
  log.push(msg);
}

// ---------------------------------------------------------------------------
// Step 1: Wikidata
// ---------------------------------------------------------------------------

const MAIN_QUERY = `
SELECT ?item ?itemLabel ?ga
  (SAMPLE(?inceptionTime) AS ?inceptionTime) (SAMPLE(?inceptionPrec) AS ?inceptionPrec)
  (SAMPLE(?collection) AS ?collection) (SAMPLE(?location) AS ?location)
  (SAMPLE(?shelfmark) AS ?shelfmark)
  (SAMPLE(?image) AS ?image) (SAMPLE(?commonscat) AS ?commonscat) (SAMPLE(?iiif) AS ?iiif)
WHERE {
  ?item wdt:P1577 ?ga .
  OPTIONAL {
    ?item p:P571 ?incStmt .
    ?incStmt psv:P571 ?incNode .
    ?incNode wikibase:timeValue ?inceptionTime ;
             wikibase:timePrecision ?inceptionPrec .
  }
  OPTIONAL { ?item wdt:P195 ?collection . }
  OPTIONAL { ?item wdt:P276 ?location . }
  OPTIONAL { ?item wdt:P217 ?shelfmark . }
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item wdt:P373 ?commonscat . }
  OPTIONAL { ?item wdt:P6108 ?iiif . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?item ?itemLabel ?ga
ORDER BY ?item
`;

async function sparql(query, label) {
  const url = `${WD_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const json = await fetchJSON(url, {
    headers: { Accept: 'application/sparql-results+json' },
    timeoutMs: 90000,
    retries: 3,
    label,
  });
  return json.results.bindings;
}

function qidOf(uri) {
  if (!uri) return null;
  const m = uri.match(/[QP]\d+$/);
  return m ? m[0] : null;
}

async function fetchWikidataRows() {
  note('Querying Wikidata for all items with P1577 (Gregory-Aland number)...');
  let bindings;
  try {
    bindings = await sparql(MAIN_QUERY, 'wikidata main query');
    note(`  Wikidata main query returned ${bindings.length} bindings.`);
  } catch (err) {
    note(`  Main query failed (${err.message}); falling back to paginated queries.`);
    bindings = [];
    const PAGE = 1500;
    for (let offset = 0; ; offset += PAGE) {
      const pageQuery = MAIN_QUERY.replace(/\n$/, '') + `\nLIMIT ${PAGE} OFFSET ${offset}\n`;
      try {
        const page = await sparql(pageQuery, `wikidata page offset=${offset}`);
        note(`  page offset=${offset}: ${page.length} rows`);
        bindings.push(...page);
        if (page.length < PAGE) break;
      } catch (err2) {
        note(`  page offset=${offset} FAILED: ${err2.message}`);
        break;
      }
    }
  }

  const rows = new Map(); // ga -> row
  const institutionQids = new Set();
  for (const b of bindings) {
    const gaRaw = b.ga?.value;
    const parsed = normalizeGA(gaRaw);
    if (!parsed) continue;
    const qid = qidOf(b.item?.value);
    const label = b.itemLabel?.value;
    const collectionQid = qidOf(b.collection?.value);
    const locationQid = qidOf(b.location?.value);
    const instQid = collectionQid ?? locationQid;
    if (instQid) institutionQids.add(instQid);
    const century = parseCenturyFromWikidataTime(b.inceptionTime?.value, b.inceptionPrec?.value);
    const iiifRaw = b.iiif?.value || null;
    const commonsCat = b.commonscat?.value || null;
    const imageUrl = b.image?.value || null;
    let imageFile = null;
    if (imageUrl) {
      try {
        imageFile = decodeURIComponent(imageUrl.split('/').pop());
      } catch {
        imageFile = imageUrl.split('/').pop();
      }
    }
    rows.set(parsed.ga, {
      ga: parsed.ga,
      cat: parsed.cat,
      name: label && !isGenericLabel(label) ? label : null,
      c0: century?.c0 ?? null,
      c1: century?.c1 ?? null,
      contents: null,
      instQid: instQid ?? null,
      shelf: b.shelfmark?.value || null,
      qid: qid ?? null,
      commons: imageFile ?? (commonsCat ? `Category:${commonsCat}` : null),
      iiif: iiifRaw,
      _wd: true,
    });
  }
  note(`  Parsed ${rows.size} distinct GA numbers from Wikidata.`);
  note(`  Distinct institution QIDs to resolve: ${institutionQids.size}`);
  return { rows, institutionQids };
}

async function fetchInstitutions(qids) {
  const list = [...qids];
  const info = new Map();
  const CHUNK = 80;
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK);
    const values = chunk.map((q) => `wd:${q}`).join(' ');
    const query = `
SELECT ?inst ?instLabel ?city ?cityLabel ?country ?countryLabel ?cityCountry ?cityCountryLabel WHERE {
  VALUES ?inst { ${values} }
  OPTIONAL { ?inst wdt:P131 ?city . }
  OPTIONAL { ?inst wdt:P17 ?country . }
  OPTIONAL { ?city wdt:P17 ?cityCountry . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
    try {
      const bindings = await sparql(query, `institutions chunk ${i}`);
      for (const b of bindings) {
        const q = qidOf(b.inst?.value);
        if (!q) continue;
        info.set(q, {
          name: b.instLabel?.value || null,
          city: b.cityLabel?.value || null,
          country: b.countryLabel?.value || b.cityCountryLabel?.value || null,
        });
      }
    } catch (err) {
      note(`  Institution chunk at ${i} failed: ${err.message}`);
    }
  }
  note(`  Resolved ${info.size}/${list.length} institutions.`);
  return info;
}

// ---------------------------------------------------------------------------
// Step 2: Wikipedia lists
// ---------------------------------------------------------------------------

const WP_CANDIDATES = {
  papyri: ['List of New Testament papyri'],
  uncials: ['List of New Testament uncials'],
  minuscules1: ['List of New Testament minuscules (1-1000)', 'List of New Testament minuscules 1-1000'],
  minuscules2: ['List of New Testament minuscules (1001-2000)', 'List of New Testament minuscules 1001-2000'],
  minuscules3: [
    'List of New Testament minuscules (2001-2900)',
    'List of New Testament minuscules (2001-)',
    'List of New Testament minuscules 2001-',
  ],
  lectionaries: ['List of New Testament lectionaries'],
};

async function wpSearch(query) {
  const url = `${WP_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5`;
  const json = await fetchJSON(url, { label: `wp search ${query}` });
  return (json.query?.search ?? []).map((s) => s.title);
}

async function wpParse(title) {
  const url = `${WP_API}?action=parse&page=${encodeURIComponent(title)}&prop=text&formatversion=2&format=json&redirects=1`;
  const json = await fetchJSON(url, { label: `wp parse ${title}` });
  if (json.error) throw new Error(json.error.info || json.error.code);
  return json.parse.text;
}

async function fetchWikipediaCategoryHTML(catKey, candidates) {
  for (const title of candidates) {
    try {
      const html = await wpParse(title);
      note(`  [${catKey}] parsed "${title}" (${(html.length / 1024).toFixed(0)} KB)`);
      return { title, html };
    } catch (err) {
      note(`  [${catKey}] "${title}" failed: ${err.message}`);
    }
  }
  // Fall back to search.
  try {
    const found = await wpSearch(candidates[0]);
    note(`  [${catKey}] search fallback found: ${found.join(' | ')}`);
    for (const title of found) {
      try {
        const html = await wpParse(title);
        note(`  [${catKey}] parsed via search "${title}" (${(html.length / 1024).toFixed(0)} KB)`);
        return { title, html };
      } catch (err) {
        note(`  [${catKey}] search candidate "${title}" failed: ${err.message}`);
      }
    }
  } catch (err) {
    note(`  [${catKey}] search itself failed: ${err.message}`);
  }
  return null;
}

function cellText(el) {
  return el.text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

function mapColumns(headerCells) {
  const map = {};
  headerCells.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (map.ga == null && /(gregory|siglum|\bsign\b|\bno\.?\b|number|papyrus|uncial|minuscule|lectionary)/.test(hl)) map.ga = i;
    if (map.name == null && /\bname\b/.test(hl)) map.name = i;
    if (map.date == null && /date|century|age/.test(hl)) map.date = i;
    if (map.contents == null && /content|text\b/.test(hl)) map.contents = i;
    if (
      map.location == null &&
      /location|library|now at|housed|present|kept|held|repository|institution|collection/.test(hl)
    )
      map.location = i;
    if (map.shelf == null && /shelf|call\s?no|inventory|catalog|number/.test(hl) && map.ga !== i) map.shelf = i;
  });
  return map;
}

const DATE_HINT_RE = /\b(century|c\.\s*\d|ca\.\s*\d|circa|\d{3,4}|[IVXLCDM]{1,6}(st|nd|rd|th)?\b)/i;
const CONTENT_HINT_RE = /gospel|acts|paul|epistle|catholic|revelation|apocalypse|evangel|apostolos/i;
const LOCATION_HINT_RE = /library|museum|monastery|university|national|bibliothèque|biblioteca|archive|collection|cathedral|patriarch/i;

function parseTable(table, catKey) {
  const trs = table.querySelectorAll('tr');
  if (!trs.length) return [];
  let headerCells = [];
  let headerIdx = -1;
  for (let i = 0; i < trs.length; i++) {
    const ths = trs[i].querySelectorAll('th');
    if (ths.length >= 2) {
      headerCells = ths.map(cellText);
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];
  const colMap = mapColumns(headerCells);
  const out = [];
  for (let i = headerIdx + 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td');
    if (!tds.length) continue;
    const cells = tds.map(cellText);
    const gaRaw = colMap.ga != null ? cells[colMap.ga] : cells[0];
    const parsed = normalizeGA(gaRaw);
    if (!parsed) continue;
    let dateRaw = colMap.date != null ? cells[colMap.date] : null;
    if (dateRaw == null) dateRaw = cells.find((c, i2) => i2 !== colMap.ga && DATE_HINT_RE.test(c));
    let contentsRaw = colMap.contents != null ? cells[colMap.contents] : null;
    if (contentsRaw == null) contentsRaw = cells.find((c) => CONTENT_HINT_RE.test(c));
    let locRaw = colMap.location != null ? cells[colMap.location] : null;
    if (locRaw == null) locRaw = cells.find((c, i2) => i2 !== colMap.ga && LOCATION_HINT_RE.test(c));
    const shelfRaw = colMap.shelf != null ? cells[colMap.shelf] : null;
    const nameRaw = colMap.name != null ? cells[colMap.name] : null;
    out.push({
      ga: parsed.ga,
      cat: parsed.cat,
      dateRaw: dateRaw || null,
      contentsRaw: contentsRaw || null,
      locRaw: locRaw || null,
      shelfRaw: shelfRaw || null,
      nameRaw: nameRaw || null,
    });
  }
  return out;
}

function splitLocation(raw) {
  if (!raw) return { inst: null, city: null, country: null, shelf: null };
  let s = raw.replace(/\s+/g, ' ').trim();
  // Pull a trailing parenthetical shelfmark, e.g. "British Library (Add. MS 43725)"
  let shelf = null;
  const parenMatch = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (
    parenMatch &&
    /\d|MS|gr\.|Add|Cod|Barb|Vat|Reg/i.test(parenMatch[2]) &&
    !/^P\.?\s*\d+$/i.test(parenMatch[2].trim()) &&
    !/^0?\d{1,4}$/.test(parenMatch[2].trim())
  ) {
    shelf = parenMatch[2].trim();
    s = parenMatch[1].trim();
  }
  const dictHit = lookupInstitutionDict(s);
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  const inst = parts[0] || s;
  let city = dictHit?.city ?? (parts.length > 1 ? parts[1] : null);
  let country = dictHit?.country ?? (parts.length > 2 ? parts[parts.length - 1] : null);
  return { inst, city, country, shelf };
}

async function fetchWikipediaRows() {
  const wpRows = new Map(); // ga -> row
  let pagesOk = 0;
  let pagesFail = 0;
  for (const [key, candidates] of Object.entries(WP_CANDIDATES)) {
    const result = await fetchWikipediaCategoryHTML(key, candidates);
    if (!result) {
      pagesFail++;
      continue;
    }
    pagesOk++;
    const root = parseHTML(result.html);
    const tables = root.querySelectorAll('table.wikitable');
    note(`  [${key}] ${tables.length} wikitable(s) found in "${result.title}"`);
    let rowCount = 0;
    for (const table of tables) {
      const parsedRows = parseTable(table, key);
      rowCount += parsedRows.length;
      for (const r of parsedRows) {
        const century = parseCenturyFromText(r.dateRaw);
        const loc = splitLocation(r.locRaw);
        wpRows.set(r.ga, {
          ga: r.ga,
          cat: r.cat,
          name: r.nameRaw || null,
          c0: century?.c0 ?? null,
          c1: century?.c1 ?? null,
          contents: parseContents(r.contentsRaw),
          inst: loc.inst,
          city: loc.city,
          country: loc.country,
          shelf: r.shelfRaw || loc.shelf || null,
        });
      }
    }
    note(`  [${key}] extracted ${rowCount} rows (${wpRows.size} cumulative distinct GA so far)`);
  }
  return { wpRows, pagesOk, pagesFail };
}

// ---------------------------------------------------------------------------
// Merge + write
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const { rows: wdRows, institutionQids } = await fetchWikidataRows();
  const institutions = await fetchInstitutions(institutionQids);
  const { wpRows, pagesOk, pagesFail } = await fetchWikipediaRows();

  const allGa = new Set([...wdRows.keys(), ...wpRows.keys()]);
  note(`Merging: ${wdRows.size} from Wikidata, ${wpRows.size} from Wikipedia, ${allGa.size} distinct total.`);

  const merged = [];
  let fromWikidataOnly = 0;
  let fromWikipediaOnly = 0;
  let fromBoth = 0;

  for (const ga of allGa) {
    const wd = wdRows.get(ga);
    const wp = wpRows.get(ga);
    if (wd && wp) fromBoth++;
    else if (wd) fromWikidataOnly++;
    else fromWikipediaOnly++;

    const cat = wd?.cat ?? wp?.cat;
    const inst = wd?.instQid ? institutions.get(wd.instQid) : null;
    const name = wd?.name ?? wp?.name ?? null;
    const c0 = wd?.c0 ?? wp?.c0 ?? null;
    const c1 = wd?.c1 ?? wp?.c1 ?? null;
    const contents = wp?.contents ?? wd?.contents ?? null;
    const instName = inst?.name ?? wp?.inst ?? null;
    const city = inst?.city ?? wp?.city ?? null;
    const country = inst?.country ?? wp?.country ?? null;
    const shelf = wd?.shelf ?? wp?.shelf ?? null;
    const qid = wd?.qid ?? null;
    const commons = wd?.commons ?? null;
    const iiif = wd?.iiif ?? null;

    merged.push({ ga, cat, name, c0, c1, contents, inst: instName, city, country, shelf, qid, commons, iiif });
  }

  merged.sort(compareRows);

  const counts = { P: 0, M: 0, m: 0, L: 0, total: merged.length };
  for (const r of merged) counts[r.cat] = (counts[r.cat] ?? 0) + 1;

  const FIELDS = ['ga', 'cat', 'name', 'c0', 'c1', 'contents', 'inst', 'city', 'country', 'shelf', 'qid', 'commons', 'iiif'];
  const outRows = merged.map((r) => FIELDS.map((f) => (r[f] === undefined ? null : r[f])));

  const catalog = {
    generated: new Date().toISOString(),
    sources: [
      'Wikidata Query Service, https://query.wikidata.org/sparql (P1577 Gregory-Aland number, P571 inception, P195 collection, P276 location, P217 inventory number, P18 image, P373 Commons category, P6108 IIIF manifest, P131/P17 institution location/country)',
      'Wikipedia, "List of New Testament papyri", https://en.wikipedia.org/wiki/List_of_New_Testament_papyri',
      'Wikipedia, "List of New Testament uncials", https://en.wikipedia.org/wiki/List_of_New_Testament_uncials',
      'Wikipedia, "List of New Testament minuscules" (1-1000 / 1001-2000 / 2001-), https://en.wikipedia.org/wiki/List_of_New_Testament_minuscules',
      'Wikipedia, "List of New Testament lectionaries", https://en.wikipedia.org/wiki/List_of_New_Testament_lectionaries',
    ],
    counts,
    fields: FIELDS,
    rows: outRows,
  };

  await writeFile(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog));
  note(`Wrote catalog.json: ${merged.length} rows, counts=${JSON.stringify(counts)}`);

  const logMd = [
    '# Library catalog fetch log',
    '',
    `Generated: ${catalog.generated}`,
    '',
    '## Counts by category',
    '',
    `- Papyri (P): ${counts.P}`,
    `- Majuscules (M): ${counts.M}`,
    `- Minuscules (m): ${counts.m}`,
    `- Lectionaries (L): ${counts.L}`,
    `- Total: ${counts.total}`,
    '',
    '## Source coverage',
    '',
    `- From Wikidata only: ${fromWikidataOnly}`,
    `- From Wikipedia only: ${fromWikipediaOnly}`,
    `- From both: ${fromBoth}`,
    `- Wikipedia list pages fetched OK: ${pagesOk}/${Object.keys(WP_CANDIDATES).length}, failed: ${pagesFail}`,
    `- Institutions resolved via Wikidata: ${institutions.size} / ${institutionQids.size} QIDs`,
    '',
    '## Run log',
    '',
    '```',
    ...log,
    '```',
    '',
  ].join('\n');

  await writeFile(path.join(OUT_DIR, 'fetch-log.md'), logMd);
  note('Wrote fetch-log.md');

  if (merged.length < 5500) {
    note(`WARNING: total rows (${merged.length}) below the 5500 target.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
