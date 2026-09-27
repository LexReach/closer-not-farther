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
- `ot.ts`: placeholder for the Old Testament.

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
| `data-ot` | `data-ot.yml` | Done, not merged (Phase D). It has 39 books of WLC with glosses (306,774 words), `lex-hebrew.json`, 31 OT witnesses, `coverage-summary.json` and `SOURCES-OT.md`. |
| `data-contents` | `data-contents.yml` | Started for Wikipedia papyri and uncial verse ranges, a fallback for page-level coverage of early witnesses; it may not exist or may be unfinished. |

## How to resume

**Transcriptions (done).** To refresh them after a parser change on `data-evidence`:
1. Re-parse there: `node scripts/evidence/reparse-transcriptions.mjs`, commit with `[skip ci]`.
2. On main: `git archive origin/data-evidence data/evidence/coverage data/evidence/transcriptions | tar -x -C /tmp/ev`, then `node scripts/evidence/derive.mjs /tmp/ev/data/evidence data/evidence`, then replace `data/evidence/transcriptions` with `/tmp/ev/data/evidence/transcriptions`.
3. `node scripts/witness-check.mjs <preview url>` checks the Witness view (the deploy's smoke job runs it on the live site).

**B: better coverage.**
1. Check the `data-evidence` branch README for page-level hits.
2. Extract it: `git archive origin/data-evidence data/evidence | tar -x -C /tmp/ev`.
3. Run `node scripts/evidence/derive.mjs /tmp/ev/data/evidence data/evidence`.
4. Build, test, push.

The `data-contents` output (`ranges` per GA) can be merged into raw coverage as page-level-equivalent hits for papyri and majuscules. Mark those hits distinctly and change the coverage sentence in `panel.ts`.

**C: spotlight.** Line detection goes in a CI job that writes `data/evidence/lineboxes/<GA>/<pageId>.json` in the `LineBoxes` format of `src/evidence/spotlight.ts`. The viewer already draws `overlay` boxes only when such data exists. Hand-placed word boxes use `words[]` with `placed: "manual"`. Also still to do: CONTRIBUTING.md and an "Improve this alignment" issue link.

**D: Old Testament.**
1. Merge `git checkout origin/data-ot -- data/bible/hebrew data/bible/lex-hebrew.json data/evidence/ot data/bible/SOURCES-OT.md`.
2. The Reader already renders Hebrew RTL with a cantillation toggle.
3. Replace `src/evidence/ot.ts` with a panel from `witnesses.json`.
4. Add an OT block to `timeline.json` so the coverage map's Testament switch appears.
5. Add the Hebrew shelf to the Library and the Isaiah 53 Timeline layer.

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
- Phases C and D: skipped for budget.