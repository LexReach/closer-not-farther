# Sources for data/evidence

Provenance and licensing for every dataset under `data/evidence/`. This file is written by
hand (by the build session) and updated as the CI workflow (`.github/workflows/data-evidence.yml`)
confirms real endpoint/terms text in its job log; it is not itself machine-generated.

## 1. Manuscript coverage (`coverage/`)

- **Catalogue-level basis**: derived locally (no new fetch) from `data/library/catalog.json`,
  itself fetched from Wikidata (query.wikidata.org/sparql, CC0) and English Wikipedia
  ("List of New Testament papyri/uncials/minuscules/lectionaries" articles, CC BY-SA 4.0) by
  `scripts/library/fetch-catalog.mjs`. Retrieval date: see `data/library/catalog.json`'s own
  `generated` field.
- **Page-level basis**: INTF New Testament Virtual Manuscript Room (NTVMR),
  https://ntvmr.uni-muenster.de/ — Institut für neutestamentliche Textforschung (INTF),
  University of Münster. Fetched by `scripts/evidence/build-coverage.mjs` and
  `scripts/evidence/ntvmr.mjs` via `.github/workflows/data-evidence.yml`.
  - **Terms of use**: NTVMR's stated terms could not be reached from this sandbox (no network
    access here — see the workflow's own job log for `finalize-docs.mjs`'s
    "Attempting to fetch NTVMR terms-of-use text" step, which prints whatever page(s) it could
    reach verbatim). Until confirmed and quoted here, treat all NTVMR-derived data as used
    for non-commercial, attributed, research/educational purposes only, with full attribution
    to INTF/NTVMR, consistent with how academic tooling built on the NTVMR API is documented
    elsewhere; do not redistribute page images.
  - Retrieval date: see the `generated` timestamps this workflow stamps into its commits (check
    `git log` on the `data-evidence` branch for `data/evidence/coverage/`).

## 2. Transcriptions (`transcriptions/`)

- **Primary**: INTF NTVMR transcript API (same terms as above; same TODO to confirm and quote).
- **Alternative for John**: IGNTP (International Greek New Testament Project) John
  transcriptions, https://www.iohannes.com/ — stated licence: CC BY (Creative Commons
  Attribution). Attribution: "International Greek New Testament Project (IGNTP), John
  transcriptions, iohannes.com, CC BY."

## 3. Witness tiers (`witness-tiers.json`)

Not fetched. Compiled by the build session from general knowledge of the NA28 (Nestle-Aland,
Novum Testamentum Graece, 28th ed., Deutsche Bibelgesellschaft) introduction's lists of
"consistently cited witnesses" (ständige Zeugen) per corpus. The NA28 introduction is a
copyrighted print volume with no official free/open digital republication, so this is a
conservative, partial approximation from memory rather than a verified transcription — see the
file's own `_note` and `compiled: true` fields. Consult NA28 directly for the authoritative list.

## 4. Apparatus (`apparatus/`)

- **Source**: SBLGNT (Society of Biblical Literature Greek New Testament) apparatus,
  https://github.com/LogosBible/SBLGNT — published by Logos Bible Software / SBL.
- **Licence**: CC BY 4.0 (Creative Commons Attribution 4.0 International). Attribution:
  "SBLGNT apparatus, © Society of Biblical Literature and Logos Bible Software, CC BY 4.0,
  github.com/LogosBible/SBLGNT."
- Retrieval date: see the workflow run that produced the current `apparatus/*.json` (its commit
  timestamp on the `data-evidence` branch).
- The exact file within that repository holding the apparatus, and its line format, was
  discovered at run time (see `scripts/evidence/build-apparatus.mjs`'s `discoverTree()`/
  `pickApparatusFiles()`) rather than assumed; the CI job log lists the full repo tree and the
  chosen file's first ~1000 characters for verification.

## 5. Bible book/verse structure (`scripts/evidence/nt-books.mjs`)

Not a fetched dataset: hand-written, traditional (KJV-style) versification — 27 NT books, 260
chapters, 7,957 verses — matching the numbering `data/bible/text/{kjv,asv,web,bsb}` per
`data/bible/SCHEMA.md` are expected to use. Cross-checked against commonly published per-book
verse-count totals (e.g. Matthew 1071, John 879, Romans 433, Revelation 404, …); no network
fetch was needed or used for this file.
