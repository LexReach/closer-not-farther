# Data sources

Every dataset the site uses, with where it came from, its licence and when it
was retrieved. Detailed notes, including the licence wording quoted from each
source, are in the files linked in the last column. Datasets were fetched in
GitHub Actions on side branches (`data-*`, `library-data`, `sources-data`),
reviewed, and then copied to `main`.

## Bible texts (the Reader)

| Dataset | Files | Source | Licence | Retrieved | Details |
|---|---|---|---|---|---|
| Berean Standard Bible | `bible/text/bsb/` | bereanbible.com: `bsb.txt` and `bsb_tables.xlsx` (Greek–English alignment) | Public domain (dedicated 2023) | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| World English Bible | `bible/text/web/` | ebible.org `eng-web_usfm.zip` | Public domain ("World English Bible" is a trademark of eBible.org) | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| King James Version (1769) | `bible/text/kjv/` | ebible.org `eng-kjv_usfm.zip` | Public domain outside the UK (Crown letters patent in the UK) | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| American Standard Version (1901) | `bible/text/asv/` | ebible.org `eng-asv_usfm.zip` | Public domain | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| SBL Greek New Testament | `bible/greek/` (surface text) | github.com/LogosBible/SBLGNT via github.com/morphgnt/sblgnt | CC BY 4.0 (SBL and Logos Bible Software) | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| MorphGNT | `bible/greek/` (lemmas, word list) | github.com/morphgnt/sblgnt | CC BY-SA 3.0 | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| STEPBible TAGNT, TBESG | `bible/greek/` (Strong's, parsing, glosses), `bible/lex-greek.json` | github.com/STEPBible/STEPBible-Data | CC BY 4.0 (STEPBible.org, Tyndale House Cambridge) | 2026-09-26 | [bible/SOURCES.md](bible/SOURCES.md) |
| ESV | not stored | api.esv.org, fetched live through the site owner's proxy (`proxy/`) | © Crossway; used with the owner's non-commercial permission; shown with Crossway's notice and a link to esv.org | live | [../proxy/README.md](../proxy/README.md) |

## Manuscripts and the argument (existing modules)

| Dataset | Files | Source | Licence | Retrieved | Details |
|---|---|---|---|---|---|
| Manuscript catalogue (5,694) | `library/catalog.json` | Wikidata (P1577) and six Wikipedia list articles | Wikidata CC0; Wikipedia CC BY-SA 4.0 | 2026-09-26 | [library/fetch-log.md](library/fetch-log.md) |
| Image sources (556) | `library/images.json` | IIIF manifests of the holding libraries; Wikimedia Commons | Rights per holder, recorded per item; images stream from the holders and are never copied | 2026-09-26 | [library/fetch-log.md](library/fetch-log.md) |
| Featured shelf, module data | `library/featured.json`, `manuscripts.json`, `variants.json`, `names.json`, `coincidences.json`, `p66.json`, `comparison.json` | Compiled from the published works each file cites | Facts with citations | 2026-09 | each file's `sources` field; [../DECISIONS.md](../DECISIONS.md) |
| Fetched checks | `fetched/` | gnosis.org, New Advent, Wikimedia Commons, INTF Liste | Counts and URLs only; no texts copied | 2026-09-26 | [../DECISIONS.md](../DECISIONS.md) |

## Manuscript evidence (the evidence panel and coverage map)

| Dataset | Files | Source | Licence | Retrieved | Details |
|---|---|---|---|---|---|
| Page index (which pages carry which verses) | `evidence/wit/`, `evidence/summary/`, `evidence/timeline.json` (derived) | INTF New Testament Virtual Manuscript Room, ntvmr.uni-muenster.de, metadata API | INTF terms: used for non-commercial study with attribution; the terms are quoted on the `data-evidence` branch in `data/evidence/SOURCES.md` | 2026-09-26 | `scripts/evidence/derive.mjs` |
| SBLGNT apparatus | `evidence/apparatus/` | github.com/LogosBible/SBLGNT `data/sblgntapp/text` | CC BY 4.0 | 2026-09-26 | `scripts/evidence/sblgnt-apparatus.mjs` |
| NA28 consistently cited witnesses | `evidence/witness-tiers.json` | Compiled from the NA28 introduction's lists (not fetchable) | Facts, compiled | 2026-09-26 | the file's `_note` |
