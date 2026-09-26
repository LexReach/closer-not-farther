# Decisions and fallbacks

Every judgment call made during the unattended build, in the order it was made.

## Setup
- **Branch.** The session's harness designated `claude/bootstrap-prompt-execution-ag3d5w` as the working branch; the bootstrap says to push to `main`, and Pages deploys from `main`. Both branches are pushed with identical history after each step.
- **Network.** The sandbox proxy blocks Wikipedia, Wikimedia Commons, ebible.org, gnosis.org, earlychristianwritings.com and similar sites (403 on CONNECT, also for WebFetch). npm and Google Fonts CSS were reachable. Data checks therefore relied on web search snippets, raw GitHub text files, and the model's own knowledge; every such case is flagged below and in the JSON (`verify`, `verify_note`, `method`).
- **Fonts.** Loaded from Google Fonts at runtime (Fraunces, Source Serif 4, IBM Plex Sans, Noto Serif), with system serif and sans fallbacks in the stacks. The headless screenshot browser could not always fetch the font files through the proxy, so some screenshots show fallback fonts.
- **Routing.** History-API routes under the Pages base path `/closer-not-farther/`. `scripts/postbuild.mjs` copies `index.html` into one folder per route so deep links return 200, and to `404.html` for unknown paths.
- **Skeptic copy.** All "What skeptics say" points live in `data/skeptics.json` so that the About page can list them all in one place and every counterpoint has a source.
- **Dark mode** follows `prefers-color-scheme` only (no manual switch), as the spec describes.

## Module 1: Telephone vs. Tree
- **Alignment.** Copies are stored as slots aligned to the source words (omissions leave an empty slot; absorbed notes attach to the slot they follow). Real critics must collate first; the simulator skips that so the vote is the point.
- **Stable randomness.** Every draw is a hash of (seed, model, copy, word, purpose). Raising the error rate adds errors to the same copies instead of reshuffling, and a higher loss setting destroys a superset of the copies lost at a lower one.
- **What counts as recovered.** A word is recovered when the majority reading equals the source word with no absorbed note. A tie counts as unresolved.
- **The autograph is always lost** in both models; all copies (every generation) can survive.
- **Regions.** First-generation copies get a random region; each child stays in its parent's region with probability 0.8, otherwise moves.
- **Tree drawing.** A radial tidy tree (d3.hierarchy + d3.tree), because the maximum setting has 5,460 copies. Tree nodes are dots colored by number of changes or by region; the per-copy mini heatmap appears in the hover tooltip and the selected-copy panel. Chain tiles show the heatmap directly.
- **Harmonization** swaps from a small synonym list; where a word has no listed synonym, the error falls back to a spelling slip.
- **"Try to make the tree fail" preset:** 8% error rate, 90% loss, 2 copies per copy, 3 generations. Across 30 seeds the tree then recovers about 61% on average; at defaults it recovers about 99.7% vs about 73% for the chain (`npm test`).
- **Run** advances the seed and replays the copy animation; slider changes recompute instantly without animation. Once Reconstruct has been pressed, results stay live as settings change.

## Module 5: Names as fingerprints
- **Percentages** are computed at runtime from `data/names.json` counts divided by the stated totals. Bauckham's printed headline shares (`headline_stats`) differ from the recomputed ones (top 2 male names in Palestine: 17.6% recomputed vs 15.6% printed; top 9: 46.7% vs 41.5%). Both are shown side by side rather than silently choosing one.
- **`verify: true` values** (Gospels + Acts totals 79 / 18; Jonathan's Gospels count) could not be checked against the printed Table 6 from the sandbox. They are unchanged, marked with an asterisk in the chart, and explained in `verify_note`.
- **"Common name"** for the Twelve panel means in the top 12 male names shown in panel A (rank ≤ 12). Ranks come from `twelve.entries`.
- **Apocryphal names (panel C).** Populated for all four texts (37 entries) inside the ~$10 cap. The source sites were unreachable from the sandbox, so the lists were compiled from knowledge of the standard public-domain translations (Lambdin, Isenberg, the Gnostic Society text of Mary, Walker's ANF Protevangelium), with web search snippets as a check. Mention counts are approximate and flagged `approx`. The build details are kept in `apocryphal.build_note`; the UI shows `method`.
- **How panel C reads.** Instead of forcing apocryphal names onto the Palestinian frequency chart (their casts are mostly borrowed from the canonical Gospels), the panel shows, per text, how many names are borrowed and how the added ones are tagged. That is the fair version of the test, and it shows the complicating case too: the Protevangelium's additions (Joachim, Anna, Reuben) are ordinary Jewish names.

## Module 2: Closer, Not Farther
- **Minuscules added.** 17 medieval minuscules were added (`added_by_build: true`) to fill the lower right of the plot. Wikipedia and the INTF Liste were blocked, so dates and "year known" come from web search snippets and standard references; 13 of them carry `verify: true` with a `year_known_basis`.
- **Corrections to the supplied data:** P1 `year_known` 1897 to 1898 (publication year, matching the convention used for other papyri); minuscule 1739 1879 to 1899 (von der Goltz's publication).
- **Gap to the autographs** = midpoint of the earliest known witness minus 100 AD (end of the conventional composition window, stored in `manuscripts.json` → `autographs`). This reproduces the 50-year NT gap in `comparison.json`.
- **"Manuscripts available"** is a step function over `count_over_time`: the most recent catalogue figure at or before the selected year, labelled approximate, together with how many of the plotted landmark witnesses are known.
- **Starting year** is 1516 (the first preset), so the dots fill in as the reader drags forward.
- **Comparison panel** sorts works by manuscript count and draws count and gap as two separate bar charts with the same row order, so count is never shown alone.

## Module 6: Undesigned coincidences
- **Verse quotations** come from the World English Bible. ebible.org and bible-api.com were blocked, so the text was taken from a plain-text WEB copy on GitHub (raw.githubusercontent.com/nehemiaharchives/bbl) and trimmed to 30 words or fewer.
- **Reference fix:** the Pilate item's "Mark 15" (a whole chapter, used to make a point about an absence) now quotes Mark 15:2, 5, with the original kept in `ref_context`.
- **Graph layout:** fixed, one column per Gospel (Acts sits with Luke), nodes ordered by chapter. Each item links its first reference (the question) to each later reference. Shared passages (John 6:4) become shared nodes, which shows the interlock.
- **Map inset** is schematic, with approximate coordinates stored in `coincidences.json` → `map_geo`. Bethsaida is placed at et-Tell and labelled as one of two proposed sites.
- The featured Bethsaida example opens fully expanded; other questions open at step 1 and reveal one step at a time.

## Module 4: The 110% puzzle
- **Witness data corrections** (checked against Metzger's commentary and apparatus knowledge; the apparatus sites were blocked): Mark 16:9-20, Bezae changed from true to null (its Greek leaf for the end of Mark is lost); John 7:53-8:11, Alexandrinus changed from false to null (lacuna John 6:50-8:52). Every passage now has a `verified` basis and `witness_notes` for split or corrected witnesses (marked † in the chart).
- **Two readings instead of include/exclude.** Romans 5:1 and John 1:18 are choices between two readings, not insertions, so they carry an explicit `readings` array and `printed` (the reading in NA28/SBLGNT), and the toggle switches between the two readings.
- **Bezae in John 5:3b-4** has 3b but not v. 4; it counts as including the disputed span, with a note.
- **Witness chart** places each witness in its century band (P66 at "2.9", late 2nd/about 200). The treemap shares come from `categories.breakdown`, and the 400,000 figure is shown as a headline number, as the skeptics note requires.

## Module 3: Read P66 yourself
- **Image fallback taken.** Wikimedia Commons was unreachable from the sandbox, so no photograph could be downloaded or its license confirmed. Following the spec's fallback, the page draws an SVG facsimile (uncial letters in brown ink on a papyrus-colored page with a fibre texture) captioned "Facsimile rendering; photograph pending license." To switch to the photograph, save the Commons file as `public/p66-page1.jpg` and set `image.available: true` and `image.file` in `data/p66.json`; the page then overlays the word boxes on the photo.
- **Line breaks are approximate.** Published line-by-line transcriptions (IGNTP, NTVMR) were unreachable. `p66.json` gives 14 plausible lines of 23–24 letters carrying the standard wording of John 1:1–7, with nomina sacra ΘΝ/ΘΣ/ΘΥ, and says so in `line_breaks_source`. The page says the papyrus row is a reading guide, not a transcription, and makes no claim about P66's specific readings.
- **Word boxes** are computed at runtime from the line boxes and letter offsets, so a word that wraps across two lines gets a box on each line.
- **Title line** ("ΕΥΑΓΓΕΛΙΟΝ ΚΑΤΑ ΙΩΑΝΝΗΝ") is drawn above the text because P66 preserves the book title.
