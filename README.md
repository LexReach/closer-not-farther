# Closer, Not Farther

A Bible reader that shows the manuscript evidence behind the text, alongside an interactive case for why the New Testament text can be trusted, following Wesley Huff's talk ([YouTube](https://www.youtube.com/watch?v=qYsBvzmdxQY)), with evidence and visuals instead of prose. Every module ends with a fair "What skeptics say" section.

Live site: https://lexreach.github.io/closer-not-farther/

| Route | Module |
|---|---|
| `/` | The Reader, opening at John 1 (same as `/read`) |
| `/read` | The Reader: BSB, WEB, KJV, ASV, ESV (when connected) and the Greek or Hebrew, up to three columns, with search and a meaning card for every original-language word. URLs like `/read#john.1.1` |
| `/why` | The argument as a scroll narrative (live Module 1 hero, chapters with live excerpts, the film, skeptics and sources) |
| `/telephone` | 1. Telephone vs. Tree: a seeded transmission simulator with majority-vote reconstruction |
| `/timeline` | 2. Closer, Not Farther: manuscript discovery timeline, plus the comparison with classical authors |
| `/p66` | 3. Read P66 yourself: papyrus facsimile synchronized with modern Greek and English |
| `/variants` | 4. The 110% puzzle: disputed passages, witnesses by century, variant types |
| `/names` | 5. Names as fingerprints: Palestinian name frequencies, the Twelve, apocryphal control group |
| `/coincidences` | 6. Undesigned coincidences: passage graph, stepped walkthroughs, Galilee map |
| `/library` | The Library: every catalogued Greek NT manuscript, with deep-zoom page images streamed from holding institutions (IIIF) |
| `/present` | Present mode: full-screen, dark, keyboard-driven deck of the live charts (`/present#names` deep-links a slide) |
| `/about` | Method, sources, limits, every skeptic point with its reply, and the bibliography |

Stack: Vite + vanilla TypeScript, D3 v7 for charts (loaded per route), OpenSeadragon for deep zoom (loaded only when a manuscript is opened), self-hosted fonts (fontsource), hand-written CSS with custom properties (light and dark via `prefers-color-scheme`). No backend, no analytics.

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173/closer-not-farther/
npm test           # simulator checks, plus Reader checks (ESV adapter against a mocked proxy, parsing, IIIF page choice)
npm run build      # type-check, build to dist/, then write per-route pages
npm run preview    # serve dist/ at http://localhost:4173/closer-not-farther/
```

To build for a root path instead of `/closer-not-farther/`, set `BASE=/` (for example `BASE=/ npm run build`).

## The Reader

- Navigation is Read · Library · Why · About. "Why" holds the six modules, present mode and the film.
- Keys: ← / → chapter, j / k verse, `/` search, `b` books, `v` versions, `m` reading mode, Esc close.
- Texts live in `data/bible/` (format in `data/bible/SCHEMA.md`, sources in `data/bible/SOURCES.md` and `data/SOURCES.md`). They are built by `.github/workflows/data-bible.yml` on the `data-bible` branch from bereanbible.com, ebible.org, MorphGNT/SBLGNT and STEPBible. After merging, run `node scripts/bible/fill-boundaries.mjs`.
- Files are fetched per book and cached by the service worker (`public/sw.js`), so repeat visits render in well under 200 ms.

### Connecting the ESV

The ESV text is never stored in the repository. The site owner deploys the small Cloudflare Worker in `proxy/` (steps in `proxy/README.md`), which holds the API key, and puts its URL in `data/config.json` as `esvProxyUrl`. Until then the picker shows "ESV (connect)".

## Where the data lives

All figures come from `data/*.json`. Pages import these files at build time and compute every percentage, share and gap from them. Each file has a `sources` array, which the page shows at the bottom. Values that could not be checked against their printed source carry `verify: true`, usually with a `verify_note`.

### Updating each dataset

- **`data/source-text.json`** (Module 1). `tokens` is the Greek source text with a word-level English gloss; the simulator copies this array. `error_types[].weight` sets the default mix of error kinds, and `regions` names the regions in the tree. The synonym and marginal-note lists the simulator draws on are in `src/modules/telephone/sim.ts` (`SYNONYMS`, `GLOSSES`). Run `npm test` after changes: it checks that the tree still beats the chain at default settings and that the "make the tree fail" preset still fails.
- **`data/manuscripts.json`** (Module 2). Add a witness to `witnesses` with `ga`, `name`, `contents`, `date_low`/`date_high` (AD, estimated copying date), `year_known` (the year it entered scholarship), and optionally `found`, `note`, `year_known_basis` and `verify`. `count_over_time.points` drives the running-total chart and the "Manuscripts available" tile (a step function). `presets` are the year buttons. `autographs` sets the composition window used for "gap to the autographs".
- **`data/comparison.json`** (Module 2, lower panel). One entry per work, with `manuscripts` and `gap_years`. Both are always shown together.
- **`data/p66.json`** (Module 3). `lines` hold the papyrus text line by line with a box as percentages of the page; `words` map each token of `source-text.json` to its papyrus form (`nomen_sacrum: true` draws an overline). Word boxes are computed from line boxes and letter offsets. To use the photograph instead of the facsimile, save a rights-cleared image as `public/p66-page1.jpg`, then set `image.available: true`, `image.file: "p66-page1.jpg"`, and fill in `license` and `credit`.
- **`data/variants.json`** (Module 4). Each passage has `contains` (per witness id: `true`, `false`, or `null` when the witness is not extant there), `explanation`, `doctrine_impact`, optional `witness_notes` (shown with †) and `verified`. For two-reading variants, give `readings` (with `key` matching `contains`) and `printed`. `categories.breakdown` drives the treemap.
- **`data/names.json`** (Module 5). `male`/`female` hold raw counts; totals come from `palestine_totals` and `gospels_acts_totals`. Never enter percentages, because the page computes them. `headline_stats` holds Bauckham's printed shares, which are shown next to the recomputed ones. `twelve.entries` drives the apostle grid. `apocryphal.entries` (text, name, mentions, tag) drives the control group; its toggle turns itself off and shows "data pending" if the array is empty.
- **`data/coincidences.json`** (Module 6). `items[].steps` are the walkthrough steps (`ref`, `quote` of 30 words or fewer from the WEB, `point`; `ref: null` marks the conclusion). An item with a `map` field shows the Galilee inset; place coordinates are in `map_geo`.
- **`data/skeptics.json`** (all modules and `/about`). The counterpoints for each module's "What skeptics say" section.


## Present mode, the tour and the film

- **Present mode** (`/present`): → / PageDown next, ← / PageUp back, Space play/pause the live chart, F full screen, `?` key list, Esc exit. Slides deep-link by id: `#title`, `#telephone`, `#timeline`, `#p66`, `#variants`, `#names`, `#twelve`, `#coincidences`, `#library`, `#read`, `#end`.
- **Guided tour**: the "Play the argument live" button on the home page (or `?tour=1` on any URL) runs the whole argument in about three minutes. It navigates and moves the real controls. Captions and actions are in `data/tour.json`: edit a `caption` or its `ms` duration, or add actions (`scroll`, `slider`, `click`, `toggle`, `hoverSeq`, `key`, `wait`). There are pause, skip and voice controls; voice uses the browser's Web Speech API and is off by default.
- **The film**: `public/film/closer-not-farther.mp4` (1920×1080 H.264, captions burned in), `teaser.mp4` (20 s) and `poster.jpg` are recordings of the tour. To regenerate after changing the site or `tour.json`:

  ```sh
  npm run build
  node scripts/render-film.mjs        # needs Playwright + Chromium and ffmpeg with libx264
  # FFMPEG=/path/to/ffmpeg if it is not on PATH; `pip install imageio-ffmpeg` provides one
  ```

- The committed film was recorded in GitHub Actions so the Library chapter shows real manuscript images: push `main` to the `film-render` branch (`git push origin main:film-render`) and `.github/workflows/render-film.yml` commits a fresh `public/film/` back to that branch.
- **OpenGraph cards**: `node scripts/render-og.mjs` renders `public/og/*.png` and `public/og/meta.json`; `postbuild` writes per-route titles, descriptions and og:/twitter: tags into each route's HTML.

## Data that is fetched rather than typed

The sandbox this site was built in could not reach Wikidata, Wikipedia, Commons or library IIIF servers, so fetching runs in GitHub Actions. Each fetch workflow triggers on pushes to its own branch and commits its outputs back to that branch; the results are then reviewed and copied to `main`.

- **Library catalogue** (`scripts/library/`, `.github/workflows/fetch-library.yml`, branch `library-data`): `fetch-catalog.mjs` merges Wikidata items with a Gregory–Aland number (P1577) with the Wikipedia lists of NT papyri, uncials, minuscules and lectionaries into `data/library/catalog.json` (compact rows plus a `fields` header). `fetch-images.mjs` resolves IIIF manifests (Wikidata P6108 and institution patterns such as DigiVatLib) and Commons images into `data/library/images.json`. `data/library/featured.json` (the featured shelf, with its story cards) is written by hand. To regenerate, push to `library-data` (or run the scripts locally with network access), then copy `data/library/` to `main`. See `scripts/library/README.md`.
- **Apocryphal names, the P66 photograph, and manuscript verification** (`scripts/fetch-sources.mjs`, `scripts/extract-apocrypha-names.mjs`, `.github/workflows/fetch-sources.yml`, branch `sources-data`): these write `data/fetched/*.json` and `public/p66/`. Raw texts are never committed, only counts and URLs.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci`, `npm test`, `npm run build` (with `BASE=/<repo name>/`), then publishes `dist/` with `actions/deploy-pages`.

Pages is configured with **Settings → Pages → Source: GitHub Actions** (already set for this repository).

GitHub Pages has no fallback for single-page apps, so `scripts/postbuild.mjs` copies `index.html` into a folder for each route (so `/closer-not-farther/telephone` returns 200) and to `404.html`.

## Project layout

```
data/                 datasets (the only place figures live)
src/main.ts           router + app shell (left rail on desktop, bottom tabs on mobile)
src/routes.ts         route table and card hooks
src/components/       Card, Disclosure, SourceList, Slider, Toggle, Tooltip, Legend, StatTile
src/modules/          one file (or folder) per page
src/chapters.ts       the seven chapters and their live excerpts (home, present, tour)
src/home/hero.ts      the opening-frame canvas miniature of Module 1
src/tour/             guided tour engine
src/library/          Library data loading, featured shelf, deep-zoom viewer
src/styles/           tokens.css (palette + type), base.css, components.css, modules.css
scripts/              postbuild route pages, simulator checks
DECISIONS.md          every judgment call and fallback taken during the build
```
