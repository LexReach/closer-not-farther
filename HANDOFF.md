# Handoff

State of the "Bible reader with manuscript evidence" work, for a session that
picks this up cold. Live site: https://lexreach.github.io/closer-not-farther/

## Done and deployed (main)

**Phase A (the Reader) is complete.**
- `/` and `/read` show the Reader: BSB, WEB, KJV, ASV, ESV (via proxy) and SBLGNT, up to three columns, a meaning card on every Greek word, search, reading mode and a service worker.
- Navigation is Read · Library · Why · About. The old home page is `/why`.
- The Library viewer opens at the first real page, with a pager and the page in the URL.
- About has a `#texts` section, and `data/SOURCES.md` lists every dataset.
- `deploy.yml` has a `smoke` job that opens the live site after every deploy (`scripts/smoke.mjs`).
- Bible data comes from branch `data-bible` (workflow `data-bible.yml`). After re-merging it, run `node scripts/bible/fill-boundaries.mjs`.
- Details and checks are in DECISIONS.md, "Phase A".

The ESV needs the owner to deploy the Worker in `proxy/` (see `proxy/README.md`), then set `esvProxyUrl` in `data/config.json`.

## Phase B (evidence panel): see "Current status" at the bottom

The code is in `src/evidence/`:
- `panel.ts`: bottom sheet or right rail, count, oldest witness, All / Most relied on, sort, cards, variants.
- `witness.ts`: Witness view, with the photo and folio match, the page rendering and three synchronized rows.
- `render.ts`: typographic page rendering and word alignment.
- `spotlight.ts`: line and word boxes; Phase C data plugs in here.
- `data.ts`: loaders.
- `ot.ts`: the Hebrew Bible panel and Witness view (Phase D, below).

The coverage map is `src/modules/coverage.ts` at `/why/coverage`, and is also a chapter, a present slide and a tour step. The Reader loads the evidence layer by default (`evidenceLoader` in `src/reader/reader.ts`).

The derived data in `data/evidence/` comes from `scripts/evidence/derive.mjs <rawDir> data/evidence`. It reads raw coverage and transcriptions and writes:
- `wit/<BOOK>/<c>.json`
- `summary/<BOOK>.json`
- `tx/<BOOK>.json`
- `timeline.json`

The SBLGNT apparatus is `data/evidence/apparatus/`, from `scripts/evidence/sblgnt-apparatus.mjs <SBLGNT clone>` (4,468 verses). `data/evidence/witness-tiers.json` is the flattened NA28 list, compiled rather than fetched.

## Data jobs

| Branch | Workflow | State |
|---|---|---|
| `data-bible` | `data-bible.yml` | Done and merged (commit e8388b6). |
| `data-evidence` | `data-evidence.yml` | Page-level coverage for 446 manuscripts (iteration 10). Transcriptions: 15,059 pages of 285 manuscripts, parsed by `scripts/evidence/tei.mjs` (iteration 11 and two `[skip ci]` re-parses). The raw page TEI is kept in `data/evidence/tei/<GA>.json.gz` (10 MB), so the parser can be changed and re-run with `node scripts/evidence/reparse-transcriptions.mjs` without fetching again. A commit message containing `[transcripts-only]` skips the 12-minute coverage step. The raw coverage is 32 MB, so never copy it to main: extract it, then run `derive.mjs`. |
| `data-ot` | `data-ot.yml` | Done and merged (Phase D minimum, commit 6a02663). It has 39 books of WLC with glosses (306,774 words), `lex-hebrew.json`, 31 OT witnesses, `coverage-summary.json` and `SOURCES-OT.md`. |
| `data-contents` | `data-contents.yml` | Started for Wikipedia papyri and uncial verse ranges, a fallback for page-level coverage of early witnesses; it may not exist or may be unfinished. |

## How to resume

**Transcriptions (done).** To refresh them after a parser change on `data-evidence`:
1. Re-parse there: `node scripts/evidence/reparse-transcriptions.mjs`, commit with `[skip ci]`. `node scripts/evidence/ns-scan.mjs` lists the sacred names the table in `tei.mjs` still leaves contracted.
2. On main: `git archive origin/data-evidence data/evidence/coverage data/evidence/transcriptions | tar -x -C /tmp/ev`, then `node scripts/evidence/derive.mjs /tmp/ev/data/evidence data/evidence`, then replace `data/evidence/transcriptions` with `/tmp/ev/data/evidence/transcriptions`.
3. `node scripts/witness-check.mjs <preview url>` checks the Witness view (the deploy's smoke job runs it on the live site).

**B: better coverage.**
1. Check the `data-evidence` branch README for page-level hits.
2. Extract it: `git archive origin/data-evidence data/evidence | tar -x -C /tmp/ev`.
3. Run `node scripts/evidence/derive.mjs /tmp/ev/data/evidence data/evidence`.
4. Build, test, push.

The `data-contents` output (`ranges` per GA) can be merged into raw coverage as page-level-equivalent hits for papyri and majuscules. Mark those hits distinctly and change the coverage sentence in `panel.ts`.

**C: spotlight.** Line detection goes in a CI job that writes `data/evidence/lineboxes/<GA>/<pageId>.json` in the `LineBoxes` format of `src/evidence/spotlight.ts`. The viewer already draws `overlay` boxes only when such data exists. Hand-placed word boxes use `words[]` with `placed: "manual"`. Also still to do: CONTRIBUTING.md and an "Improve this alignment" issue link.

**D: Old Testament (minimum shipped; remaining).**
- Remaining, deliberately skipped: the Hebrew shelf in the Library, the Isaiah 53 hand alignment (the 1QIsaa view shows the Leningrad wording without vowels, not the scroll's own text), and the Timeline OT layer.
- Also open: OT witness ranges are compiled spans. The Aleppo Codex has gaps inside `DEU.28.17-MAL.4.6`, and a fragmentary scroll's range runs from its first to its last surviving verse. Splitting these into real extents (Leon Levy DSS library, Tov/Ulrich inventories) would sharpen the panel and the map.
- Alexandrinus (A) is not among the 31 witnesses; adding it to `data/evidence/ot/witnesses.json` needs only a `contents` list, then `node scripts/evidence/derive-ot.mjs`.
- After changing `witnesses.json`, re-run `derive-ot.mjs`; `derive.mjs` keeps the `OT` block of `timeline.json`.

## Current status
- **Phase B: shipped on main** (commit 7a9581e; deploy run 29 green, including the live smoke test, which opened the evidence panel for John 1:1).
  - Page-level coverage for 446 manuscripts, from `data-evidence` commit 2685e0a.
  - Panel, Witness view (photograph and links), inline variants, the `/why/coverage` map (also a chapter, a present slide and a tour step) and gutter dots.
- **Transcriptions: on main** (commit 000bc6c, from `data-evidence` commit 0b7c71c; deploy run 31 green, and its smoke job's new `witness-check.mjs` step passed on the live site for all three pages). The Witness view and the panel's cards show the typographic page with the verse spotlit.
  - What was wrong: the old parser tokenized the whole XML, header included, ignored `<w>`, and looked for verse milestones that NTVMR does not use.
  - The real markup (checked on P66, 01 and 03): `<lb/>` opens each line, mostly without `n`; `<lb break="no"/>` splits a word; `<cb n>` and `<pb n>`; verses are `<ab n="B04K1V1">`, and titles are `<ab>` without `n`; `<supplied reason="unspecified">` for restored letters; `<abbr type="nomSac">`; corrections are `<app><rdg type="orig" hand="firsthand">` plus one `<rdg type="corr" hand="corrector2a">` per hand. The last hand's reading is the "corrected" view.
  - Token schema (`Token` in `src/evidence/data.ts`): `t`, `v` ("JHN.1.1"), `ns` (expanded sacred name), `lac`, `gap` (length of a gap in letters), `j` (continues in the next token: a word split by a line or a lacuna edge), `corr: { hand, t }`.
  - The numbers: 2.63M tokens, of which 98.1% carry a verse; 87k lacuna tokens, 23k corrections, 78k sacred names.
  - Verified: P66 John 1:1 (26 lines, 16 words; ΠΑΝΤΑΝ corrected to ΠΑΝΤΑ in 1:9); Sinaiticus John 18:1 (page 258r, 4 columns × 48 lines; in 18:3, corrector 2a deletes ΕΚ ΤΩΝ and 2b restores it, so no net correction); Vaticanus Mark 16:8 (2 columns; the verse ends ΕΦΟΒΟΥΝΤΟ ΓΑΡ, and the subscriptio carries no verse).
  - Size: 91 MB of JSON over 15,059 files, loaded one page at a time.
  - Not done: sacred names outside the table in `tei.mjs` keep their contracted form, so they show as differences in the rows. 320 pages carry no verse (titles, lectionary apparatus). Coverage of later minuscules is still to do.
- **Sacred names: on main** (commit 594677a; deploy run 33 green). `tei.mjs` on `data-evidence` (commit e3f5e82) now expands every contraction found in the corpus. There are short case endings for every stem, stem rules for derived words (πνευματικος, ουρανιος, σωτηρια, σταυροω forms, πατριαρχης), an iota-adscript fold (θωι → θεω), and the corpus forms checked against their verses, including a stroke for a final ν. Unexpanded flagged words went from 2,073 to 218: ιη (88, either Ιησους or the numeral 18, so left alone), numerals (οβ, ρμδ), and words run together (τονθν). Sacred-name words that fail to align with the SBLGNT went from 6,514 to 5,107 across 131,929 witness-verses; the rest are real readings (an added ο ιησους, κυριος for θεος). An edition word matched only by editor-restored letters is now faded as lost, not underlined, so John 1:1 shows no differences in P66 or 01 (`witness-check.mjs` asserts it).
- **Phase D minimum: on main** (commit 6a02663; deploy run 34 green, and its smoke job ran `ot-check.mjs` on the live site). See the notes under "D" above for what remains.
  - Reader: every OT book opens with the pointed Hebrew (RTL, cantillation toggle) beside the BSB until the reader picks columns; tap a word for its TAHOT meaning. The Hebrew files keep Hebrew verse numbers, and `loadOriginal` re-indexes them to English numbers with each file's `map`. A Psalm title joins verse 1. In four places English splits one Hebrew verse (1 Kings 22:21–22, Nehemiah 7:68–69, Psalm 13:5–6, Isaiah 63:19/64:1), and the Hebrew verse shows under both numbers.
  - Evidence panel (`src/evidence/ot.ts`): the witnesses whose ranges carry the verse, oldest first, with fragmentary scrolls dashed. Witness view: the verse and its neighbours drawn from the Leningrad text, consonants only for scrolls and the Samaritan Pentateuch; a Hebrew row with meanings; BSB; link-outs for the photographs (none are embeddable).
  - Coverage map: Testament switch (`derive-ot.mjs`). By the end of the 3rd century BC, 224 of 23,145 verses are lit; 2,135 by the 2nd, 6,896 by the 1st, 8,760 by AD 100, 22,438 by AD 400 (Vaticanus, Sinaiticus), and all by AD 1100 (Leningrad).
  - `scripts/ot-check.mjs` (38 checks at 1280 and 400) runs in the smoke job; screenshots go to the `smoke-screenshots` artifact.
  - Lighthouse, `/read#gen.1.1`, mobile preset, on the built site served with gzip: Performance 82, Accessibility 100, Best Practices 100, SEO 100 (FCP 1.4 s, LCP 4.5 s, TBT 20 ms, CLS 0.075). The sandbox proxy blocks Lighthouse on the live URL. The LCP element is the evidence panel's coverage text, which a verse deep link opens after the chapter renders; `/read#john.1.1` scores 84 for the same reason, so this is not an OT regression. To improve it, open the panel before the chapter's secondary loads, or reserve its space.
- **Live-site fix session (runs 37–43)**. All nine reported items are fixed; each is checked in `smoke.mjs`, `witness-check.mjs` or `ot-check.mjs`, which run after every deploy.
  1. The first tap selected the wrong verse. The one-time hint is now a fixed toast that fades out and never moves the layout. The smoke test clicks John 1:1 on a fresh profile and asserts `.1`.
  2. Witness view: the three rows sit under the header, with the transcribed page below them.
  3. Hash navigation left dialogs open. The router re-rendered the whole Reader on the `popstate` that a hash change fires. It now leaves hash-only changes to the page, and the Reader's hash handler closes dialogs and the meaning card; the panel follows the new hash.
  4. A deep link paints the chapter first, then opens the panel collapsed to one line with a Show handle. OT chapters load from per-chapter Hebrew files written at build time (`scripts/bible/hebrew-chapters.mjs`, into `dist/bible/hebrew-ch/`). Lighthouse, mobile preset, gzip-served build (the sandbox proxy blocks it on the live URL): `/read#john.1.1` 84 → 92, `/read#gen.1.1` 82 → 93 Final numbers: gen.1.1 Performance 93 (FCP 1.2 s, LCP 3.2 s, TBT 0 ms, CLS 0.019); john.1.1 Performance 94 (FCP 1.4 s, LCP 3.0 s, TBT 80 ms, CLS 0.019); Accessibility, Best Practices and SEO 100 on both.
  5. Cards show the Library photograph, falling back to the transcribed lines, which fade into a pre-sized box. The sandbox cannot load holder images, so only the fallback was seen locally.
  6. The panel header is one sentence plus a "How this is counted" disclosure; cards say "cited in NA28" (with a tooltip) and "text available".
  7. OT witnesses are rebuilt from sources fetched in CI (`data-ot` branch, `.github/workflows/ot-refs.yml`) and kept in `data/evidence/ot/refs/`:
     - Every biblical row of Wikipedia's *List of the Dead Sea Scrolls* (after Fitzmyer 2008) with exact verse ranges: 237 scrolls (`parse-dss.mjs`). Genesis 1:1 now lists 4QGen^b (4Q2) and 4QGen^g (4Q7).
     - Codex Alexandrinus, less its lacunae.
     - Merged by `merge-ot-witnesses.mjs` from `refs/witnesses-compiled.json` (the `data-ot` list), then `derive-ot.mjs`. `main` now holds the authoritative `witnesses.json`; `data-ot`'s copy is stale.
     - The OT header reads "N of the 244 listed witnesses", then "Thousands of medieval Hebrew copies are not listed."
  8. The photograph caption wraps inside the pane: the dialog is a flex column at desktop width.
  9. The chapter header shows the version ("John 1 · BSB") in single-column mode.
- **Still open from that session:**
  - Left out because the source doesn't confirm them (logged in `refs/merge-log.txt` and `refs/dss-parsed.json`):
    - MurXII: the Murabba'at Minor Prophets scroll is not in the table.
    - 11QPs^a: the table gives no contents.
    - Masada and Nahal Hever scrolls: the table gives no dates.
    - About 50 references the parser could not read, or that use Hebrew verse numbering (e.g. Exod 7:28): logged, not guessed. Adding these needs another source, such as the Leon Levy site (JS-rendered; needs a headless fetch in CI) or Ulrich, *The Biblical Qumran Scrolls*.
  - Psalm references in the DSS table are taken as English numbering; some may be Hebrew numbering (one verse off in titled Psalms).
  - `data/evidence/ot/coverage-summary.json` is stale and unused at runtime; `timeline.json` is current.
  - Card photographs (item 5) were verified only through the fallback path here; the live smoke job's screenshots show the real path.
- Phase C: not started.