# OT data sources

Retrieved: 2026-09-26 (GitHub Actions workflow `.github/workflows/data-ot.yml`, branch `data-ot`, runs 1-2).

## Hebrew text + morphology — data/bible/hebrew/*.json

- **Source:** [openscriptures/morphhb](https://github.com/openscriptures/morphhb) — the Westminster Leningrad Codex (WLC), OSIS XML with Strong's-based lemma + OSHB morphology codes, per book (`wlc/<Book>.xml`).
- **License:** Creative Commons Attribution 4.0 (CC BY 4.0), per the file's own `<rights type="x-BY">` header.
- **Retrieved:** 2026-09-26, via `raw.githubusercontent.com/openscriptures/morphhb/master/wlc/<Book>.xml` (39 files, one per OT book).
- **English (KJV) versification** is taken directly from morphhb's own `<note>KJV:Book.C.V</note>` markers embedded in the WLC text at every verse where Hebrew and English numbering diverge (Psalms superscriptions, Joel 2:28-3:21 Eng = Joel 3:1-4:21 Heb, Malachi 4 Eng = Malachi 3:19-24 Heb, the Genesis 31:55-32:32 Heb = Genesis 32:1-32 Eng shift, and others) — not guessed or reconstructed from a separate table.

## Per-word contextual gloss — data/bible/hebrew/*.json word tuples

- **Source:** [STEPBible/STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) — TAHOT (Translators Amalgamated Hebrew OT), 4 files under `Translators Amalgamated OT+NT/` (Gen-Deu, Jos-Est, Job-Sng, Isa-Mal).
- **License:** CC BY 4.0, per the repository's README ("Data created initially by Tyndale House Cambridge... CC BY 4.0").
- **Retrieved:** 2026-09-26, via `raw.githubusercontent.com/STEPBible/STEPBible-Data/master/...`.
- **Method:** glosses are matched to morphhb words by verse + word position. Where TAHOT's per-verse word count doesn't line up exactly with morphhb's `<w>` tokenization for that verse (about 12% of verses; concentrated in Psalms superscriptions and a handful of long/variant verses elsewhere), the word instead falls back to its lexicon gloss (below) rather than risking a misaligned contextual gloss. Result: 268,768 of 306,774 words (87.6%) got a TAHOT contextual gloss; the rest got a lexicon gloss; 0 words were left without any gloss and 0 words failed to resolve a Strong's id.

## Lexicon — data/bible/lex-hebrew.json

- **Source:** STEPBible-Data's TBESH (Translators Brief lexicon of Extended Strongs for Hebrew), `Lexicons/TBESH...txt`.
- **License:** CC BY 4.0 (per STEPBible-Data's README); the brief lexicon itself is based on the Abridged BDB by Online Bible (© Larry Pierce / onlinebible.net), "provided for guidance only" per that file's own header — quoted directly from TBESH.txt: "This is provided for guidance only. Permission should be gained from Online Bible before these definitions are applied in any project."
- **Retrieved:** 2026-09-26.
- Where a bare Strong's number has several disambiguated senses in TBESH (e.g. H0001 "father" vs. its several proper-name uses), the first (general) sense is used as the headword.
- The inseparable Hebrew prefixes that occasionally stand as an entire word (preposition + pronominal suffix, no separate content root, e.g. בּוֹ "in it") are given TBESH's own extended-Strong's numbers (H9002-H9009) rather than left without an id.
- 8,643 lexicon entries, covering every Strong's id that actually occurs in data/bible/hebrew (306,774 word occurrences total).

## English verse-count reference (build-time only, not published)

- **Source:** [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) (public-domain KJV text, chapter/verse JSON per book).
- **Used only** to know how many verses each OT chapter has in standard English versification, so that witness `contents` ranges (e.g. `"ISA.1.1-ISA.66.24"`) and the Hebrew/English `map` cross-check could be expanded into per-verse keys for coverage-summary.json. This text is cached under `scripts/ot/.cache/` at build time and is never written to `data/bible/text/` (that directory belongs to a separate job) or committed.

## Evidence panel — data/evidence/ot/witnesses.json, coverage-summary.json

Compiled from standard, widely published reference works (paleography/codicology handbooks, the Leningrad/Aleppo Codex facsimile literature, Emanuel Tov's and Eugene Ulrich's published inventories of the Qumran biblical scrolls, and the Vaticanus/Sinaiticus codicological literature) — every entry in witnesses.json is marked `"compiled": true` for that reason (dates for the Dead Sea Scrolls in particular are the usual paleographic/radiocarbon estimate ranges found in that literature, not independently re-dated here). Fields the build additionally attempted to confirm live are recorded per-entry under `"verified"`.

Live-fetch attempts (workflow run 2, `eb416da`/`3df0b06`, 2026-09-26T22:18:53Z) — all six reachable:

| Check | Outcome |
|---|---|
| archive.org search for a Leningrad Codex facsimile identifier | **Confirmed** — found `Leningrad_Codex_Color_Images`; recorded as `links.images_archive_org` on the Leningrad Codex entry, alongside the compiled Wikimedia Commons category link. |
| aleppocodex.org (terms + Torah-gap coverage cross-check) | Reachable (HTTP 200, 2,469 bytes), but it is a JavaScript single-page app — a plain fetch of `/` returns only the app shell, not rendered terms-of-use text, so no terms string could be extracted automatically. |
| deadseascrolls.org.il / Leon Levy Digital Library (site + terms) | Reachable (HTTP 200, 36,624 bytes for the home page); same JS-SPA limitation, no terms string extracted automatically. |
| Leon Levy manuscript page for the Great Isaiah Scroll (1QIsaa) | **Confirmed** — `https://www.deadseascrolls.org.il/explore-the-archive/manuscript/Isaiaha-1` resolves (HTTP 200); recorded as `links.images` on the `1QIsaa` entry. (Run 1 hit a transient 404 on the same URL; run 2 confirmed it resolves, so it is kept.) |
| digi.vatlib.it viewer for Codex Vaticanus | Confirmed reachable (HTTP 200). |
| codexsinaiticus.org | Confirmed reachable (HTTP 200). |

### Embedding — what's actually confirmed

**None of the image sources are marked embeddable (`"embed": true`) in this dataset; every witness's `embed` field is `false`.** Concretely, for the two sources the task asks about by name:

- **aleppocodex.org** — reachable, but its terms of use could not be read by a plain HTTP fetch (see above; it's a JS SPA). Its own site should be checked by a human, in a browser, before treating any of its imagery as embeddable.
- **Leon Levy Digital Library (deadseascrolls.org.il)** — reachable, and a specific manuscript page (the Great Isaiah Scroll) is now confirmed to resolve, but its terms of use likewise could not be read by a plain HTTP fetch. Linking to its own viewer (which this dataset now does, for 1QIsaa) is a reasonable use; embedding its images directly is not confirmed as permitted.

Both sites are typical of national-library/IAA digital collections, which usually require a permission request for reuse beyond on-site viewing; that is *not* independently confirmed here, so it is not asserted as fact — only that no evidence of a permissive, embeddable license was found, which is why `embed` stays `false` throughout. Reading the actual rendered terms text from either site would need a JS-rendering fetch (e.g. Playwright, already used elsewhere in this repo for `scripts/render-film.mjs`), which this build does not attempt.

The **Leningrad Codex** is the one source with a solid, independently confirmed image link: the archive.org advancedsearch API (JSON, no JS rendering needed) returned `Leningrad_Codex_Color_Images` as a specific matching item, in addition to the compiled Wikimedia Commons category link — see `links.images_archive_org` on that witness. archive.org content is generally public domain or openly licensed per-item; this was not re-verified per-item here, so `embed` is still left `false` pending that check.

## Coverage-summary.json

Computed by `scripts/ot/build-coverage.mjs` directly from witnesses.json's `contents` ranges and the English verse-count reference above — not a separate fetch. 23,145 OT verses (the full English-versification universe for all 39 books) each get a `[count, oldestId, oldestYear]` entry; every verse has at least one witness (the Leningrad Codex alone covers all of them). `"Cairo Genizah fragments"` and any other witness with an empty `contents` array is intentionally excluded from these counts (too heterogeneous — thousands of disparate fragments — to characterize as verse ranges).
