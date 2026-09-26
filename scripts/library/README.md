# Library data pipeline

Scripts that build the data behind the `/library` route: a catalog of every
catalogued Greek New Testament manuscript (papyri, majuscules, minuscules,
lectionaries) plus IIIF/Commons image sources where holding institutions serve
them. This directory produces **data only** — no UI code.

## Why this runs in CI, not locally

The hosts these scripts need (`query.wikidata.org`, `en.wikipedia.org`,
`commons.wikimedia.org`, assorted IIIF endpoints) are unreachable from the
sandbox this was built in. GitHub Actions runners have normal internet access,
so the fetch runs there instead, on push to the `library-data` branch (see
`.github/workflows/fetch-library.yml`). It installs `node-html-parser` on the
fly (`npm i --no-save node-html-parser`; nothing added to the app's own
`package.json`/`package-lock.json`), runs both scripts, and commits only
`data/library/` back to `library-data` as `github-actions[bot]`.

To regenerate: push a commit to `library-data` (or re-run the workflow via
`workflow_dispatch` in the Actions tab), wait for the run to finish, then
`git pull`.

To run locally instead (only works if your machine can actually reach the
hosts above):

```sh
npm i --no-save node-html-parser
node scripts/library/fetch-catalog.mjs
node scripts/library/fetch-images.mjs
```

## Scripts

- **`lib.mjs`** - shared, dependency-free helpers: retrying/rate-limited
  fetch, a concurrency-limited task pool, Gregory-Aland number normalization
  and sorting, free-text century parsing (roman numerals, ordinals, plain and
  approximate years), a small INTF-style contents-letter classifier
  (`e`/`a`/`p`/`c`/`r`), and a small institution-name -> city/country fallback
  dictionary. Pure functions, unit-tested ad hoc during development (no test
  runner wired up — this is a one-shot data build, not an app module).

- **`fetch-catalog.mjs`** - writes `data/library/catalog.json`. Queries the
  Wikidata Query Service for every item with a Gregory-Aland number (P1577),
  looks up each referenced institution's city/country in a second small
  query, then separately fetches and parses the English Wikipedia
  "List of New Testament ..." articles (papyri, uncials, minuscules in three
  page ranges, lectionaries) with `node-html-parser`, using a
  header-keyword column mapper plus content-based fallbacks so it tolerates
  Wikipedia's tables not matching assumed column names exactly. Merges both
  by normalized GA number and writes the result sorted P, then M, then m,
  then L, each by ascending GA number. Also writes `data/library/fetch-log.md`
  with counts and a full run log.

- **`fetch-images.mjs`** - reads `catalog.json`, writes
  `data/library/images.json`. For each row it tries, in order: (1) the IIIF
  manifest URL already on the row (from Wikidata P6108), (2) a guessed Vatican
  DigiVatLib manifest URL when the shelfmark matches a known Vatican fondo
  (`Vat.`, `Pal.`, `Barb.`, `Ottob.`, `Urb.`, `Reg.`, `Chig.`, ...), (3) a
  short hardcoded list of individually-verified manifests for a few famous
  manuscripts not otherwise covered (see `HARDCODED_IIIF` in the file). Any
  candidate that fails to fetch or doesn't parse into a usable IIIF
  Presentation v2/v3 canvas is dropped, never included with guessed
  dimensions. Rows still unresolved fall back to a Wikimedia Commons file (the
  P18 image directly, or the first file in the P373 category) for a plain
  thumbnail + full-image view. All network calls run through a concurrency
  cap (4) with small delays, are retried with backoff on 429/5xx, and never
  abort the whole run on a single failure.

- **`../postbuild.mjs`** and the rest of the app are untouched by this
  directory; nothing here imports from or writes to `src/`.

## Field notes on the `catalog.json` schema

`rows` is an array of arrays (not objects) matching `fields`, to keep the file
small at ~5,800 rows:

```
["ga","cat","name","c0","c1","contents","inst","city","country","shelf","qid","commons","iiif"]
```

- `cat`: `P` (papyrus), `M` (majuscule/uncial), `m` (minuscule), `L`
  (lectionary).
- `c0`/`c1`: inclusive century range (e.g. `175-225` -> `{2,3}`); `null` when
  the date couldn't be parsed at all.
- `contents`: comma-joined INTF-style letters in `e,a,p,c,r` order, or `null`.
  This is a keyword heuristic over free text, not a controlled vocabulary
  lookup, so treat it as approximate (notably: `"1, 2, 3 John"` without the
  word "epistle" nearby is read as Gospel-of-John content, not the Johannine
  epistles - a known false positive of the heuristic).
- `commons`: **overloaded** to fit the fixed field list. If Wikidata's P18
  (image) was present, this is the bare Commons file name (usable directly
  with `Special:FilePath`). If only P373 (Commons category) was present, this
  is `"Category:<name>"` instead — `fetch-images.mjs` treats a leading
  `"Category:"` as a signal to resolve a representative file from that
  category via the Commons API, rather than a direct file name.
- `iiif`: the raw Wikidata P6108 manifest URL, if any (consumed by
  `fetch-images.mjs`; not itself a tile source).

## Sources

- Wikidata Query Service, <https://query.wikidata.org/sparql>
- Wikipedia, "List of New Testament papyri" / "uncials" / "minuscules" (three
  page ranges) / "lectionaries", <https://en.wikipedia.org>
- Wikimedia Commons API, <https://commons.wikimedia.org/w/api.php>
- Vatican Library DigiVatLib, <https://digi.vatlib.it>
- Cambridge Digital Library, <https://cudl.lib.cam.ac.uk>
- e-codices / Fondation Martin Bodmer, <https://www.e-codices.unifr.ch>

`data/library/featured.json` (25 hand-picked manuscripts with short
descriptions) is written directly from general textual-criticism knowledge,
not fetched, and isn't part of this pipeline; see its own `_note` field.
