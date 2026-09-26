# data/evidence

Manuscript-evidence data for every New Testament verse, built by `.github/workflows/data-evidence.yml`
running scripts in `scripts/evidence/`. See SOURCES.md for provenance/licensing per dataset.

Generated: 2026-09-26T23:02:01.817Z

## Coverage (`coverage/<BOOK>.json`, `coverage/summary.json`)

- Books with a coverage file: 27 / 27
- Page-verified hits listed (real NTVMR page-level index): 232562
- Catalogue-level hits listed (fallback, marked `"c"`, priority manuscripts only — see the
  sizing note in `scripts/evidence/build-coverage.mjs`): 0
- `summary.json`'s per-verse `count` reflects the FULL catalogue roster for that verse's
  corpus (every classified manuscript in data/library/catalog.json), not just the manuscripts
  individually listed in the per-book file.

## Transcriptions (`transcriptions/<GA>/<pageId>.json`)

- Manuscripts with at least one transcribed page: 218
- Total transcribed pages: 6649

## Apparatus (`apparatus/<BOOK>.json`)

- Books with apparatus entries: 27
- Total verses with at least one apparatus entry: 4468

## Witness tiers (`witness-tiers.json`)

Hand-compiled from general knowledge of the NA28 introduction (not fetched — the NA28
introduction is a copyrighted print volume). Conservative and partial; see the file's own
`_note` field.
