#!/usr/bin/env node
// Runs in CI (GitHub Actions), where these hosts are reachable. Fetches:
//   A. the four apocryphal texts + name counts (delegates to extract-apocrypha-names.mjs)
//   B. a public-domain photo of P66 showing the opening of John, via the Commons API
//   C. Wikipedia sentences about when the "verify: true" minuscules were catalogued,
//      plus a check of the Bauckham "Jesus and the Eyewitnesses" page for the 79/18/Jonathan figures
//
// Only writes: data/fetched/*.json and public/p66/p66-page1.jpg. Prints diagnostics
// throughout so a failed run can be diagnosed from the job log alone.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { run as runApocrypha, USER_AGENT } from './extract-apocrypha-names.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const FETCHED_DIR = path.join(REPO_ROOT, 'data', 'fetched');
const P66_OUT = path.join(REPO_ROOT, 'public', 'p66', 'p66-page1.jpg');

const log = (...args) => console.log(...args);
const hr = () => log('-'.repeat(72));

async function fetchJSON(url, { ms = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: ctrl.signal });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* leave json null */
    }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

function stripTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Minimal JPEG dimension reader (scans SOF0-SOF15 markers, skipping DHT/DAC/etc).
// Used to verify the ACTUAL pixel size of a downloaded thumbnail: Wikimedia's
// thumbnail service buckets very large source images to a fixed set of widths
// (e.g. 1920/2560/3840) and can silently return a wider image than the
// iiurlwidth requested, so we can't trust the request parameter alone.
function jpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) break; // start of scan: no more headers
    const len = buf.readUInt16BE(offset + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    offset += 2 + len;
  }
  return null;
}

/* ---------------- Task B: P66 photograph via Commons API ---------------- */

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

async function commonsCategoryMembers(category) {
  const url = `${COMMONS_API}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmtype=file&cmlimit=500&format=json`;
  log(`[p66] GET categorymembers ${category}`);
  const { ok, status, json } = await fetchJSON(url);
  const members = json?.query?.categorymembers ?? [];
  log(`[p66]   -> HTTP ${status}, ${members.length} member(s)`);
  return ok ? members.map((m) => m.title) : [];
}

async function commonsSearch(term) {
  const url = `${COMMONS_API}?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&srlimit=30&format=json`;
  log(`[p66] GET search "${term}"`);
  const { ok, status, json } = await fetchJSON(url);
  const results = json?.query?.search ?? [];
  log(`[p66]   -> HTTP ${status}, ${results.length} result(s)`);
  return ok ? results.map((r) => r.title) : [];
}

async function commonsImageInfo(titles) {
  // No iiurlwidth here: this is for scoring/logging every candidate, where the
  // ORIGINAL width/height (not a thumbnail bucket) is what we want to record.
  const out = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = `${COMMONS_API}?action=query&titles=${encodeURIComponent(batch.join('|'))}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;
    const { ok, status, json } = await fetchJSON(url);
    log(`[p66] GET imageinfo for ${batch.length} title(s) -> HTTP ${status}`);
    if (!ok || !json?.query?.pages) continue;
    for (const page of Object.values(json.query.pages)) {
      if (page.missing !== undefined || !page.imageinfo?.[0]) continue;
      out.push({ title: page.title, info: page.imageinfo[0] });
    }
  }
  return out;
}

// Wikimedia's thumbnail service serves a fixed set of bucket widths for very
// large source images (observed: requesting iiurlwidth=2400 for a 6796px-wide
// original came back as a 3840px-wide file, silently over budget). So: ask
// for a thumb at each candidate width in turn, download it, and verify the
// ACTUAL decoded JPEG dimensions are within the 2400px long-side budget;
// fall back to the next smaller width if not.
const THUMB_WIDTH_CANDIDATES = [2400, 1920, 1600, 1280, 1024, 800];

async function fetchThumbInfo(title, iiurlwidth) {
  const url = `${COMMONS_API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=${iiurlwidth}&format=json`;
  const { ok, json } = await fetchJSON(url);
  if (!ok || !json?.query?.pages) return null;
  const page = Object.values(json.query.pages)[0];
  return page?.imageinfo?.[0] ?? null;
}

async function downloadWithinBudget(title, longSideBudget = 2400) {
  for (const w of THUMB_WIDTH_CANDIDATES) {
    const info = await fetchThumbInfo(title, w);
    const thumburl = info?.thumburl;
    if (!thumburl) {
      log(`[p66]   iiurlwidth=${w}: no thumburl returned, trying smaller`);
      continue;
    }
    log(`[p66]   iiurlwidth=${w}: requesting ${thumburl}`);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    let buf;
    try {
      const res = await fetch(thumburl, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: ctrl.signal });
      if (!res.ok) {
        log(`[p66]     HTTP ${res.status}, trying smaller`);
        continue;
      }
      buf = Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(t);
    }
    const dims = jpegDimensions(buf);
    const longSide = dims ? Math.max(dims.width, dims.height) : null;
    log(`[p66]     downloaded ${buf.length} bytes, actual JPEG dimensions ${dims ? `${dims.width}x${dims.height}` : 'unparseable'}`);
    if (dims && longSide <= longSideBudget) {
      return { buf, thumburl, requestedWidth: w, actualWidth: dims.width, actualHeight: dims.height };
    }
    log(`[p66]     long side ${longSide ?? '?'} exceeds ${longSideBudget}px budget, trying smaller width`);
  }
  return null;
}

function scoreCandidate(title, info) {
  const meta = info.extmetadata || {};
  const lic = (meta.LicenseShortName?.value || '').toLowerCase();
  const usage = (meta.UsageTerms?.value || '').toLowerCase();
  const restrictions = (meta.Restrictions?.value || '').toLowerCase();
  const isPD = (/public domain|pd-old|pd-scan|cc0/.test(lic) || /public domain/.test(usage)) && !/restricted/.test(restrictions);
  const desc = `${stripTags(meta.ImageDescription?.value)} ${stripTags(meta.ObjectName?.value)} ${title}`.toLowerCase();
  let score = 0;
  if (/john/.test(desc)) score += 3;
  if (/\bfol(io)?\.?\s*1\b|\bpage\s*1\b|\bp\.?\s*1\b|first page|recto|incipit|\bbeginning\b|\bopening\b/.test(desc)) score += 3;
  if (/1[:.,]\s?1\b/.test(desc)) score += 2;
  if (/bodmer|papyrus\s*66|p\.?\s*66\b/.test(desc)) score += 1;
  if (info.mime === 'image/jpeg' || info.mime === 'image/tiff') score += 1;
  return { score: isPD ? score : -1, isPD, desc, license: meta.LicenseShortName?.value || meta.UsageTerms?.value || null };
}

async function fetchP66Image() {
  hr();
  log('[p66] Task B: locating a public-domain photo of P66 page 1 (opening of John) via Commons API');
  const titleSet = new Set();
  for (const t of await commonsCategoryMembers('Category:Papyrus 66')) titleSet.add(t);
  for (const term of ['Papyrus 66', 'Papyrus Bodmer II', 'P66 John 1']) {
    for (const t of await commonsSearch(term)) titleSet.add(t);
  }
  const titles = [...titleSet];
  log(`[p66] ${titles.length} unique candidate file title(s): ${titles.join(', ') || '(none)'}`);

  const out = {
    fetched_at: new Date().toISOString(),
    api: COMMONS_API,
    candidates_considered: [],
    chosen: null,
    downloaded: false,
  };

  if (titles.length === 0) {
    log('[p66] No candidate files found at all.');
    await writeJSON(path.join(FETCHED_DIR, 'p66-image.json'), out);
    return out;
  }

  const infos = await commonsImageInfo(titles);
  const scored = infos.map(({ title, info }) => ({ title, info, ...scoreCandidate(title, info) }));
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  for (const c of scored) {
    out.candidates_considered.push({
      title: c.title,
      description_url: c.info.descriptionurl,
      license: c.license,
      is_public_domain: c.isPD,
      score: c.score,
      width: c.info.width,
      height: c.info.height,
      mime: c.info.mime,
    });
    log(`[p66]   ${c.title}: PD=${c.isPD} score=${c.score} license=${c.license} ${c.info.width}x${c.info.height}`);
  }

  const best = scored.find((c) => c.isPD && c.score > 0);
  if (!best) {
    log('[p66] No candidate is both public-domain and plausibly showing the opening of John. Not downloading.');
    await writeJSON(path.join(FETCHED_DIR, 'p66-image.json'), out);
    return out;
  }

  const meta = best.info.extmetadata || {};
  const longSide = Math.max(best.info.width, best.info.height);
  log(`[p66] Chosen: ${best.title} (score ${best.score}). Original ${best.info.width}x${best.info.height}.`);
  let result = null;
  if (longSide <= 2400 && /^image\/jpeg$/i.test(best.info.mime)) {
    // Already within budget: use the original file directly, no thumbnailing needed.
    log(`[p66] Original is already <=2400px on the long side; downloading original.`);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(best.info.url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const dims = jpegDimensions(buf);
        result = { buf, thumburl: best.info.url, requestedWidth: null, actualWidth: dims?.width ?? best.info.width, actualHeight: dims?.height ?? best.info.height };
      }
    } catch (err) {
      log(`[p66] Original download failed: ${err.message}`);
    }
  } else {
    try {
      result = await downloadWithinBudget(best.title, 2400);
    } catch (err) {
      log(`[p66] Thumbnail download loop failed: ${err.message}`);
    }
  }

  let bytes = 0;
  if (result) {
    await mkdir(path.dirname(P66_OUT), { recursive: true });
    await writeFile(P66_OUT, result.buf);
    bytes = result.buf.length;
    log(`[p66] Saved ${bytes} bytes, ${result.actualWidth}x${result.actualHeight} (long side ${Math.max(result.actualWidth, result.actualHeight)}px) -> ${P66_OUT}`);
    out.downloaded = true;
  } else {
    log(`[p66] Could not obtain a JPEG within the 2400px long-side budget for ${best.title}. Not downloading.`);
  }

  out.chosen = {
    title: best.title,
    description_page_url: best.info.descriptionurl,
    direct_url: result?.thumburl ?? null,
    original_url: best.info.url,
    license: best.license,
    artist: stripTags(meta.Artist?.value),
    credit: stripTags(meta.Credit?.value),
    image_description: stripTags(meta.ImageDescription?.value),
    width: result?.actualWidth ?? null,
    height: result?.actualHeight ?? null,
    original_width: best.info.width,
    original_height: best.info.height,
    mime: best.info.mime,
    bytes_downloaded: bytes,
    saved_to: out.downloaded ? 'public/p66/p66-page1.jpg' : null,
  };
  await writeJSON(path.join(FETCHED_DIR, 'p66-image.json'), out);
  return out;
}

/* ---------------- Task C: verify-flagged manuscripts + Bauckham totals ---------------- */

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const VERIFY_GA = ['69', '104', '157', '205', '209', '330', '424', '614', '700', '892', '1582', '2053', '2344'];

function splitSentences(text) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const YEAR_RE = /\b(1[4-9]\d{2}|20[0-2]\d)\b/;
const CATALOG_KEYWORD_RE = /\b(Wettstein|Scholz|Gregory|Scrivener|Tischendorf|Hoskier|von Soden|Aland|Dean Burgon|Burgon|catalog(?:ued|ed|ue)?|examin(?:ed|ation)|collat(?:ed|ion)|describ(?:ed|es)|discover(?:ed|y)|publish(?:ed)?|acquir(?:ed)?|purchas(?:ed)?|bought|list(?:ed)?)\b/i;

async function wikiExtract(title) {
  const url = `${WIKI_API}?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
  log(`[verify] GET extract "${title}"`);
  const { ok, status, json } = await fetchJSON(url);
  const source_url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  if (!ok) {
    log(`[verify]   -> HTTP ${status}, request failed`);
    return { found: false, source_url };
  }
  const pages = json?.query?.pages;
  const page = pages ? Object.values(pages)[0] : null;
  if (!page || page.missing !== undefined || !page.extract) {
    log(`[verify]   -> HTTP ${status}, page missing or empty`);
    return { found: false, source_url };
  }
  log(`[verify]   -> HTTP ${status}, extract length ${page.extract.length}, resolved title "${page.title}"`);
  return { found: true, source_url, extract: page.extract, resolved_title: page.title };
}

async function fetchVerifyManuscripts() {
  hr();
  log('[verify] Task C: fetching Wikipedia pages for the verify:true minuscules');
  const out = { fetched_at: new Date().toISOString(), manuscripts: {}, bauckham: null };

  for (const n of VERIFY_GA) {
    const title = `Minuscule ${n}`;
    const { found, source_url, extract, resolved_title } = await wikiExtract(title);
    const sentences = found ? splitSentences(extract).filter((s) => CATALOG_KEYWORD_RE.test(s) && YEAR_RE.test(s)) : [];
    out.manuscripts[n] = {
      ga: n,
      wikipedia_title: title,
      resolved_title: resolved_title || null,
      source_url,
      found,
      extract_length: found ? extract.length : 0,
      candidate_sentences: sentences,
      intf_liste_url: `https://ntvmr.uni-muenster.de/liste?docID=${30000 + Number(n)}`,
    };
    log(`[verify] Minuscule ${n}: found=${found}, ${sentences.length} candidate sentence(s)`);
  }

  hr();
  log('[verify] Checking Wikipedia "Jesus and the Eyewitnesses" for the Table 6 79/18/Jonathan figures');
  const bTitle = 'Jesus and the Eyewitnesses';
  const { found, source_url, extract, resolved_title } = await wikiExtract(bTitle);
  const sentences = found ? splitSentences(extract).filter((s) => /\b(79|18|Table\s*6|onomastic|Ilan|name recall|Palestin)/i.test(s)) : [];
  out.bauckham = {
    wikipedia_title: bTitle,
    resolved_title: resolved_title || null,
    source_url,
    found,
    extract_length: found ? extract.length : 0,
    candidate_sentences: sentences,
    mentions_table6_79_18: sentences.some((s) => /\b79\b/.test(s) && /\b18\b/.test(s)),
  };
  log(`[verify] Bauckham page: found=${found}, ${sentences.length} candidate sentence(s), mentions 79/18 together=${out.bauckham.mentions_table6_79_18}`);

  await writeJSON(path.join(FETCHED_DIR, 'verify-manuscripts.json'), out);
  return out;
}

/* ---------------- shared ---------------- */

async function writeJSON(destPath, data) {
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log(`[write] ${path.relative(REPO_ROOT, destPath)}`);
}

async function main() {
  log(`fetch-sources.mjs starting at ${new Date().toISOString()}`);
  log(`User-Agent: ${USER_AGENT}`);

  hr();
  log('Task A: apocryphal texts');
  const apo = await runApocrypha({ log });
  const apoOk = Object.keys(apo.texts).length;
  const apoFailed = Object.keys(apo.failed).length;
  log(`[apocrypha] ${apoOk} text(s) fetched, ${apoFailed} failed.`);

  const p66 = await fetchP66Image();

  const verify = await fetchVerifyManuscripts();

  hr();
  log('SUMMARY');
  log(`  Apocrypha: ${apoOk}/${apoOk + apoFailed} texts fetched (${Object.keys(apo.texts).join(', ') || 'none'})`);
  if (apoFailed) log(`  Apocrypha FAILED: ${Object.keys(apo.failed).join(', ')}`);
  log(`  P66 image: ${p66.chosen ? `${p66.chosen.title} (${p66.downloaded ? 'downloaded' : 'NOT downloaded'})` : 'no suitable candidate found'}`);
  log(`  Verify manuscripts: ${Object.values(verify.manuscripts).filter((m) => m.found).length}/${VERIFY_GA.length} Wikipedia pages found`);
  log(`  Bauckham page found: ${verify.bauckham.found}`);
  log('fetch-sources.mjs done.');
}

main().catch((err) => {
  console.error('[fetch-sources] FATAL', err);
  process.exitCode = 1;
});
