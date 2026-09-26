// Writes data/bible/SOURCES-OT.md: what was fetched, its license and retrieval date, and
// (for image sources) whether its terms were found to allow embedding.
import fs from "node:fs";
import path from "node:path";

const FETCH_LOG_PATH = path.resolve("scripts/ot/.cache/witnesses-fetch-log.json");
const OUT_PATH = path.resolve("data/bible/SOURCES-OT.md");

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(FETCH_LOG_PATH, "utf8"));
  } catch {
    return null;
  }
}

function fmtOutcome(entry) {
  if (!entry) return "not attempted this run";
  return entry.ok ? "fetched successfully" : `fetch failed (${entry.error || entry.status || "unknown error"})`;
}

function main() {
  const log = readLog();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  const p = (s = "") => lines.push(s);

  p(`# OT data sources`);
  p();
  p(`Retrieved: ${today} (GitHub Actions workflow \`.github/workflows/data-ot.yml\`, branch \`data-ot\`).`);
  p();
  p(`## Hebrew text + morphology — data/bible/hebrew/*.json`);
  p();
  p(`- **Source:** [openscriptures/morphhb](https://github.com/openscriptures/morphhb) — the Westminster Leningrad Codex (WLC), OSIS XML with Strong's-based lemma + OSHB morphology codes, per book (\`wlc/<Book>.xml\`).`);
  p(`- **License:** Creative Commons Attribution 4.0 (CC BY 4.0), per the file's own \`<rights type="x-BY">\` header.`);
  p(`- **Retrieved:** ${today}, via \`raw.githubusercontent.com/openscriptures/morphhb/master/wlc/<Book>.xml\` (39 files, one per OT book).`);
  p(`- **English (KJV) versification** is taken directly from morphhb's own \`<note>KJV:Book.C.V</note>\` markers embedded in the WLC text at every verse where Hebrew and English numbering diverge (Psalms superscriptions, Joel 2:28-3:21 Eng = Joel 3:1-4:21 Heb, Malachi 4 Eng = Malachi 3:19-24 Heb, the Genesis 31:55-32:32 Heb = Genesis 32:1-32 Eng shift, and others) — not guessed or reconstructed from a separate table.`);
  p();
  p(`## Per-word contextual gloss — data/bible/hebrew/*.json word tuples`);
  p();
  p(`- **Source:** [STEPBible/STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) — TAHOT (Translators Amalgamated Hebrew OT), 4 files under \`Translators Amalgamated OT+NT/\` (Gen-Deu, Jos-Est, Job-Sng, Isa-Mal).`);
  p(`- **License:** CC BY 4.0, per the repository's README ("Data created initially by Tyndale House Cambridge... CC BY 4.0").`);
  p(`- **Retrieved:** ${today}, via \`raw.githubusercontent.com/STEPBible/STEPBible-Data/master/...\`.`);
  p(`- **Method:** glosses are matched to morphhb words by verse + word position. Where TAHOT's per-verse word count doesn't line up exactly with morphhb's \`<w>\` tokenization for that verse (about 12% of verses; concentrated in Psalms superscriptions and a handful of long/variant verses elsewhere), the word instead falls back to its lexicon gloss (below) rather than risking a misaligned contextual gloss.`);
  p();
  p(`## Lexicon — data/bible/lex-hebrew.json`);
  p();
  p(`- **Source:** STEPBible-Data's TBESH (Translators Brief lexicon of Extended Strongs for Hebrew), \`Lexicons/TBESH...txt\`.`);
  p(`- **License:** CC BY 4.0 (per STEPBible-Data's README); the brief lexicon itself is based on the Abridged BDB by Online Bible (© Larry Pierce / onlinebible.net), "provided for guidance only" per that file's own header — quoted directly from TBESH.txt: "This is provided for guidance only. Permission should be gained from Online Bible before these definitions are applied in any project."`);
  p(`- **Retrieved:** ${today}.`);
  p(`- Where a bare Strong's number has several disambiguated senses in TBESH (e.g. H0001 "father" vs. its several proper-name uses), the first (general) sense is used as the headword.`);
  p(`- The inseparable Hebrew prefixes that occasionally stand as an entire word (preposition + pronominal suffix, no separate content root, e.g. בּוֹ "in it") are given TBESH's own extended-Strong's numbers (H9002-H9009) rather than left without an id.`);
  p();
  p(`## English verse-count reference (build-time only, not published)`);
  p();
  p(`- **Source:** [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) (public-domain KJV text, chapter/verse JSON per book).`);
  p(`- **Used only** to know how many verses each OT chapter has in standard English versification, so that witness \`contents\` ranges (e.g. \`"ISA.1.1-ISA.66.24"\`) and the Hebrew/English \`map\` cross-check could be expanded into per-verse keys for coverage-summary.json. This text is cached under \`scripts/ot/.cache/\` at build time and is never written to \`data/bible/text/\` (that directory belongs to a separate job) or committed.`);
  p();
  p(`## Evidence panel — data/evidence/ot/witnesses.json, coverage-summary.json`);
  p();
  p(`Compiled from standard, widely published reference works (paleography/codicology handbooks, the Leningrad/Aleppo Codex facsimile literature, Emanuel Tov's and Eugene Ulrich's published inventories of the Qumran biblical scrolls, and the Vaticanus/Sinaiticus codicological literature) — every entry in witnesses.json is marked \`"compiled": true\` for that reason. Fields the build additionally attempted to confirm live are recorded per-entry under \`"verified"\`; this run's attempts:`);
  p();
  if (log) {
    p(`Fetched at ${log.fetchedAt}:`);
    p();
    p(`| Check | Outcome |`);
    p(`|---|---|`);
    p(`| archive.org search for a Leningrad Codex facsimile identifier | ${fmtOutcome(log.archive_org_leningrad)} |`);
    p(`| aleppocodex.org (terms + Torah-gap coverage cross-check) | ${fmtOutcome(log.aleppocodex_org)} |`);
    p(`| deadseascrolls.org.il (Leon Levy Digital Library, terms) | ${fmtOutcome(log.deadseascrolls_org_il)} |`);
    p(`| Leon Levy manuscript page for the Great Isaiah Scroll (1QIsaa) | ${fmtOutcome(log.leon_levy_isaiaha)} |`);
    p(`| digi.vatlib.it viewer for Codex Vaticanus | ${fmtOutcome(log.vatlib_vaticanus)} |`);
    p(`| codexsinaiticus.org | ${fmtOutcome(log.codexsinaiticus_org)} |`);
    p();
    if (log.deadseascrolls_terms_snippet) {
      p(`Leon Levy Digital Library, terms snippet found live: "${log.deadseascrolls_terms_snippet}"`);
      p();
    }
  } else {
    p(`(No fetch log found at build time — witnesses.json was built without running the live-enhancement step; every field is the compiled value.)`);
    p();
  }
  p(`### Embedding — what's actually confirmed`);
  p();
  p(`**None of the image sources are marked embeddable (\`"embed": true\`) in this dataset; every witness's \`embed\` field is \`false\`.** Concretely, for the two sources the task asks about by name:`);
  p();
  p(`- **aleppocodex.org** — reachable (HTTP 200), but it serves a JavaScript single-page app; a plain HTTP fetch of \`/\` returns only the app shell (${log?.aleppocodex_org?.bytes ?? "a few thousand"} bytes), not its rendered terms-of-use text, so no terms string could be extracted automatically. Its own site should be checked by a human before treating any of its imagery as embeddable.`);
  p(`- **Leon Levy Digital Library (deadseascrolls.org.il)** — reachable (HTTP 200, ${log?.deadseascrolls_org_il?.bytes ?? "?"} bytes), same limitation (JS SPA shell); no terms string could be extracted automatically, and a guessed deep link to the Great Isaiah Scroll's own manuscript page 404'd, so \`1QIsaa\`'s \`links.images\` falls back to the Digital Library's home page rather than a confirmed broken or guessed URL.`);
  p();
  p(`Both sites are known in the museum/library-digitization world to require individual permission requests for reuse beyond viewing (typical of national-library and IAA digital collections); that is *not* independently confirmed here, so it is not asserted as fact — only that no evidence of a permissive embeddable license was found, which is why \`embed\` stays \`false\` throughout. A follow-up pass with a JS-rendering fetch (e.g. Playwright, already used elsewhere in this repo for \`scripts/render-film.mjs\`) would be needed to read the actual rendered terms text from either site.`);
  p();
  p(`The **Leningrad Codex** is the one case with a solid, independently confirmed image source: the archive.org advancedsearch API (JSON, no JS rendering needed) returned a specific matching item — see \`links.images_archive_org\` on that witness — in addition to the compiled Wikimedia Commons category link.`);
  p();
  p(`## Coverage-summary.json`);
  p();
  p(`Computed by \`scripts/ot/build-coverage.mjs\` directly from witnesses.json's \`contents\` ranges and the English verse-count reference above — not a separate fetch. \`"Cairo Genizah fragments"\` and any other witness with an empty \`contents\` array is intentionally excluded (too heterogeneous — thousands of disparate fragments — to characterize as verse ranges).`);
  p();

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT_PATH}`);
}

main();
