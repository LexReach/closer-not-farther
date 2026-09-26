# Closer, Not Farther — Build Spec (full build)

An interactive web app that makes Wesley Huff's "why trust the Bible" case visually and evidentially, instead of in prose. Source talk: https://www.youtube.com/watch?v=qYsBvzmdxQY

This file is the contract. Build against it; do not re-plan it.

## 0. Ground rules for the build session

- Stack: Vite + vanilla TypeScript (no framework). Charts: D3 v7 (only where a chart needs it). Styling: hand-written CSS with custom properties, light + dark via `prefers-color-scheme`. No backend, no auth, no analytics.
- Deploy target: GitHub Pages from `main` via a GitHub Actions workflow. `npm run build` must produce a working `dist/`.
- All data lives in `/data/*.json` (provided). Never hardcode figures in components. Every dataset has a `sources` array that the UI can surface.
- Build one module at a time, verify in the browser (one Playwright screenshot per module at 1280px and 400px), then move on. Commit after each module.
- Model: the main session runs on Opus 5.5 as selected by the owner. To keep spend inside budget, delegate verbose or mechanical work (running builds and tests, reading long docs, screenshot checks, data lookups, populating datasets) to subagents on Sonnet, and keep the main context lean: `/clear` or compact between modules, do not re-read files you have already read, and keep plans under 15 lines.
- **Budget:** target $150–200 total. Report approximate spend in one line after each module. Do not stop to ask for permission at any spend level. At $200, finish the current module, then spend only on README, deploy and bug fixes. Hard ceiling $230.
- **Autonomy:** this session runs unattended. Never wait for the owner. When something is ambiguous, pick the simpler option, log it in `DECISIONS.md`, and keep going. When something fails (a package, a font, a data check, an image license, a deploy), use the fallback named in the spec or the nearest reasonable substitute, log it, and keep going. The only acceptable end state is a deployed app with all routes working.
- Copy tone: plain, confident, unhyped. No exclamation points. Every claim on screen must trace to a data file or a cited source.
- Every module gets a "What skeptics say" disclosure (collapsed by default) with 2–4 fair counterpoints. This is a feature, not a concession; it makes the evidential parts read as evidence.

## 1. Product shape

Single-page app with a left rail (desktop) / bottom tabs (mobile). Sections:

| # | Route | Module | Tier |
|---|---|---|---|
| 0 | `/` | Home: the thesis in one screen + module cards | polished |
| 1 | `/telephone` | Telephone vs. Tree (transmission simulator) | polished |
| 2 | `/timeline` | Closer, Not Farther (manuscript discovery timeline) | polished |
| 3 | `/p66` | Read P66 yourself | polished |
| 4 | `/variants` | The 110% puzzle (variant explorer) | polished |
| 5 | `/names` | Names as fingerprints | polished |
| 6 | `/coincidences` | Undesigned coincidences | polished |
| — | `/about` | Method, sources, limits, credits | simple |

Build order: shell → 1 → 5 → 2 → 6 → 4 → 3 → about → README + deploy. Modules 1 and 5 must be excellent. If spend passes $200 before 3 and 4 are done, ship them at their "minimum viable" level (defined per module) rather than skipping them; all routes must exist and work.

## 2. Design system

- Palette (light): background `#F7F5F0` (warm paper, not cream-orange), ink `#1E1B16`, muted ink `#6B665C`, rule `#DDD8CD`, accent `#1F4E79` (indigo-blue, "ink"), accent-2 `#A0522D` (sienna, used only for "error/corruption" states in the simulator), success `#2E6B4F`.
- Palette (dark): background `#15140F`, ink `#ECE7DC`, muted `#A39C8E`, rule `#2E2B24`, accent `#7FA7D1`, accent-2 `#D08A5E`, success `#7FBF9D`.
- Type: display "Fraunces" (Google Fonts, opsz axis, weight 500–600) for headings; body "Source Serif 4" 17px/1.6; UI + numbers "IBM Plex Sans" with `tabular-nums`. Greek text uses "Noto Serif" (has full polytonic Greek) at body size. If Google Fonts is unreachable in the build environment, ship system fallbacks and log it.
- Layout: max content width 1120px; 24px gutters; running text max 68ch. Charts get the full content width.
- Motion: respect `prefers-reduced-motion`. One deliberate animation per module (the simulator's copy propagation; the timeline slider's reveal). Nothing else moves.
- Components to build once and reuse: `Card`, `Disclosure` ("What skeptics say"), `SourceList`, `Slider`, `Toggle`, `Tooltip`, `Legend`, `StatTile`.

## 3. Modules

### Module 1 — Telephone vs. Tree (the centerpiece)

Goal: let the user break the telephone-game analogy themselves.

UI: split screen. Left: "Telephone" — a single chain of N copies (N slider, 5–30). Right: "Tree" — each copy spawns k children (k slider, 1–4), copies tagged with a region (Egypt, Syria, Asia Minor, Rome, N. Africa; color + label), depth slider 3–6. Both start from the same source text: John 1:1–5 in Greek (`data/source-text.json`, includes word-level English gloss).

Controls (shared): error rate per copy (0.5%–8% of words), error mix (spelling / skipped word / harmonization / marginal note absorbed), "Lose manuscripts" slider (0–90% of copies destroyed at random, to model survival), and a Run button. A "Reconstruct" button runs majority-vote reconstruction per word across surviving copies in each model and shows: % of words recovered correctly, list of unresolved words.

Visuals: chain as a vertical column of small manuscript tiles; tree as a tidy tree (D3 hierarchy). Each tile shows a mini heatmap of which words changed. Corruptions propagate visibly down descendants (short stagger animation on Run). Selecting a tile shows its full text with diffs against the original, highlighted by error type.

Result panel: two large numbers side by side ("Telephone: 71% recovered" vs "Tree: 100% recovered") plus a one-sentence explanation of why (independent lines let errors be caught against each other; a single line cannot). Include a "Try to make the tree fail" preset (very high error rate + heavy loss) so users see the model's limits honestly.

Skeptics disclosure: (a) the simulation assumes errors are independent; real scribes copied from exemplars in text-families, which reduces independence; (b) the earliest generations (before ~150 AD) have almost no surviving witnesses, so the tree is thin exactly where it matters most; (c) majority vote is not how textual criticism actually works (genealogical/CBGM methods weigh witnesses).

Minimum viable: no animation, tidy tree only, no region tags.

Acceptance: deterministic with a seed; runs in <200ms for max settings; keyboard accessible; works at 400px width (stack vertically).

### Module 2 — Closer, Not Farther

Goal: show that time has brought us closer to the originals, not farther.

UI: a scatter plot. X = year the manuscript became known to scholarship. Y = estimated date of the manuscript (50 AD → 1500 AD, inverted so "older" is higher). A "What scholars had in year …" slider from 1500 to today; dragging it fills in dots up to that year and updates three stat tiles: manuscripts available, earliest witness, gap to the autographs. Presets: 1516 (Erasmus), 1611 (KJV), 1881 (Westcott-Hort), 1935 (P52), 1961 (P75), today.

Data: `data/manuscripts.json` — curated landmark witnesses. Add ~15 more medieval minuscules from the INTF Liste / Wikipedia lists to fill the lower-right of the plot (GA number, century, year catalogued is enough). A second series in the same file is the running total count of catalogued Greek NT manuscripts at benchmark years, for a small line chart beneath the scatter.

Panel 2: "How the NT compares" — horizontal bars for manuscript counts and earliest-copy gap for Homer, Plato, Caesar, Tacitus, Pliny, Herodotus, Thucydides, Livy vs NT (`data/comparison.json`). Show both count and gap; do not show only count.

Skeptics disclosure: (a) count is not the same as reliability; most of the 5,800 are medieval; (b) the first ~100 years still have very few witnesses; (c) other-author counts are older scholarship and fluctuate; (d) "5,800" includes fragments of a few verses.

Minimum viable: scatter + slider + stat tiles; skip panel 2.

Acceptance: slider is smooth; every dot has a tooltip with name, date, contents, source; presets work; chart readable in dark mode.

### Module 3 — Read P66 yourself

Goal: recreate the talk's "read along" moment with the real artifact.

UI: image of P66 page 1 (John 1:1–) on the left; on the right, the Greek text of John 1:1–5 in three synchronized rows: (1) transcription in scriptio continua as on the papyrus, (2) modern edited Greek (SBLGNT), (3) English. Hover a word in any row → highlights it in all three and draws a box over the approximate region on the image. Toggle "Show line breaks as on the page."

Image: must be rights-cleared. Try in order: (1) Wikimedia Commons `Papyrus66.jpg` or another Commons image of Bodmer II page 1 marked public domain; download into `/public/` and record the license and URL in `data/p66.json`. (2) If none is usable or downloadable, generate a placeholder SVG facsimile from the transcription (uncial letters, brown ink on tan) and caption it "Facsimile rendering; photograph pending license." Do not block on this.

Data: `data/p66.json` — create it: line-by-line transcription of the first ~14 lines with approximate bounding boxes (percent coordinates). Coarse boxes are fine; correct lines matter more than pixel accuracy.

Minimum viable: static image or facsimile + synchronized text rows, no boxes.

Skeptics disclosure: P66 is c. 200 AD (some argue 3rd–4th c.); it has many corrections and singular readings, which cuts both ways.

### Module 4 — The 110% puzzle

Goal: show that variants are not hidden; they are in your footnotes, and almost all are trivial.

UI: pick a passage from the list in `data/variants.json`. For each: the English text with the disputed portion highlighted; a toggle "Include / Exclude" that rewrites the text live; a support bar showing which major witnesses contain it, laid out on a century axis; a one-paragraph explanation of how the variant likely arose; a "Does it change doctrine?" line.

Second panel: a treemap of variant types by rough share (spelling/nonsense ~70%+, word order/synonyms, meaningful but not viable, meaningful and viable <1%), from `categories` in the JSON.

Minimum viable: passage picker + include/exclude toggle + witness chips ordered by century. Skip the treemap.

Skeptics disclosure: (a) "400,000 variants" is a real number and the app should say it; (b) a few variants are theologically interesting (1 John 5:7, Mark 16); (c) the category percentages are estimates.

### Module 5 — Names as fingerprints

Goal: show the Gospels' names match 1st-century Palestine, and the later apocryphal gospels don't.

Panel A: bar chart of the top 12 male and top 6 female names among Palestinian Jews 330 BC–200 AD (Tal Ilan's lexicon, via Bauckham's tally), overlaid with a second series: occurrences of the same names in the Gospels + Acts. Both series as percentages of their own totals so the shape is comparable. Toggle male / female.

Panel B: "The Twelve" — the Matthew 10 list. Each name is a chip showing its rank in Palestine and whether the Gospel adds a disambiguator. Pattern is immediately visible: common names get qualifiers, rare Greek names don't. Data in `data/names.json` → `twelve`.

Panel C: "The control group" — the same chart with a toggle to the Gospel of Thomas / Philip / Mary / Protevangelium name sets. `data/names.json` → `apocryphal` is a stub. Populate it by extracting proper names of persons from public-domain English translations (e.g., earlychristianwritings.com, gnosis.org, or Wikisource) and tagging each as canonical-overlap / Palestinian-typical / atypical. Spend at most ~$10 on this. If it cannot be done in that budget, ship the toggle disabled with a "data pending" note and log it.

Skeptics disclosure: (a) sample sizes in the Gospels are small (dozens, not thousands); (b) Bauckham's own arithmetic has been questioned (see Cambridge NTS article, 2022); (c) the argument shows Palestinian provenance of the tradition, not eyewitness authorship directly.

Acceptance: percentages computed from the JSON, not hand-typed; hovering a bar shows raw counts and source.

### Module 6 — Undesigned coincidences

Goal: show how independent accounts interlock.

UI: a small node-link graph (fixed layout is fine). Nodes are Gospel passages; an edge is a coincidence. Click an edge or a question in a side list → a stepped walkthrough (3–4 steps) with the verses quoted and the question answered. Start with the Bethsaida/Philip example expanded. A simple SVG map inset of Galilee (Bethsaida, Capernaum, Tiberias, the lake outline) appears when an item has a `map` field.

Data: `data/coincidences.json` (8 examples). Quote verses from the World English Bible (public domain); keep each quote under 30 words.

Minimum viable: question list + stepped walkthrough, no graph, no map.

Skeptics disclosure: (a) some coincidences can be explained by literary dependence (Luke knew Mark); (b) selection effect: we notice the ones that fit; (c) still, the interlock pattern is uncommon in the apocryphal gospels, which is the actual claim.

### Home + About

Home: one screen. Headline: "As time goes on, we're not getting farther from the text. We're getting closer." Under it, six module cards with a one-line hook and a small static SVG preview each. About: method, all sources, what the app does not claim, and the full skeptic list in one place.

## 4. Sources to cite in the UI

- Tal Ilan, *Lexicon of Jewish Names in Late Antiquity, Part I: Palestine 330 BCE–200 CE* (2002).
- Richard Bauckham, *Jesus and the Eyewitnesses*, 2nd ed. (2017), ch. 4 tables.
- INTF Kurzgefasste Liste (ntvmr.uni-muenster.de) for manuscript data.
- Clay Jones, "The Bibliographical Test Updated," *Christian Research Journal* 35:3 (2012).
- Daniel Wallace on variant categories (CSNTM).
- Lydia McGrew, *Hidden in Plain View* (2017) for coincidences.
- Bodmer Library / Wikimedia Commons for P66 imagery and license.
- Counterpoints: Bart Ehrman, *Misquoting Jesus*; the 2022 *New Testament Studies* article "Name Recall in the Synoptic Gospels."

## 5. Definition of done

- All routes render with no console errors, light and dark, at 400px and 1280px.
- Lighthouse accessibility ≥ 95 (best effort; log the score).
- Every figure on screen is traceable to a `data/*.json` entry with a source.
- `DECISIONS.md` lists every judgment call and fallback taken.
- README explains how to update each dataset and how deploy works.
- GitHub Pages deploy is live from `main`; the final message includes the live URL and the repo URL.
