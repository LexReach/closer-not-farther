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
| `data-evidence` | `data-evidence.yml` | Coverage there is catalogue-level only; the NTVMR page index never produced page-level hits because of repeated timeouts (iteration 10 fixed body-read timeouts, result unknown). No transcriptions yet. The raw coverage is 32 MB, so never copy it to main: extract it, then run `derive.mjs`. |
| `data-ot` | `data-ot.yml` | Done, not merged (Phase D). It has 39 books of WLC with glosses (306,774 words), `lex-hebrew.json`, 31 OT witnesses, `coverage-summary.json` and `SOURCES-OT.md`. |
| `data-contents` | `data-contents.yml` | Started for Wikipedia papyri and uncial verse ranges, a fallback for page-level coverage of early witnesses; it may not exist or may be unfinished. |

## How to resume

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
  - Not done: usable transcriptions. The CI job's TEI parser tokenized raw XML: fix `scripts/evidence/build-transcriptions.mjs` on `data-evidence` to parse `<w>` and `<lb>` elements, then re-run `derive.mjs`, which builds `tx/`. Coverage of later minuscules is also still to do.
- Phases C and D: skipped this session for budget.
