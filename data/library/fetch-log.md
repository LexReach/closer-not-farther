# Library catalog fetch log

Generated: 2026-09-26T09:03:50.410Z

## Counts by category

- Papyri (P): 139
- Majuscules (M): 293
- Minuscules (m): 2855
- Lectionaries (L): 2385
- Total: 5672

## Source coverage

- From Wikidata only: 108
- From Wikipedia only: 3870
- From both: 1694
- Wikipedia list pages fetched OK: 6/6, failed: 0
- Institutions resolved via Wikidata: 88 / 88 QIDs

## Run log

```
Querying Wikidata for all items with P1577 (Gregory-Aland number)...
  wikidata: location (P276): 43 bindings, 41 distinct items.
  inception dates: 365 bindings, 349 distinct items.
  wikidata: inventory number (P217): 394 bindings, 374 distinct items.
  wikidata: Commons category (P373): 273 bindings, 273 distinct items.
  wikidata: IIIF manifest (P6108): 112 bindings, 100 distinct items.
  GA numbers + labels: 1809 bindings.
  wikidata: collection (P195): 586 bindings, 570 distinct items.
  wikidata: image (P18): 363 bindings, 363 distinct items.
  Parsed 1802 distinct GA numbers from Wikidata.
  Distinct institution QIDs to resolve: 88
  Resolved 88/88 institution QID lookups.
  Resolved 169/169 institution/city/country labels.
  Built 88/88 full institution records.
  [papyri] parsed "List of New Testament papyri" (308 KB)
  [papyri] 4 wikitable(s) found in "List of New Testament papyri"
  [papyri] extracted 140 rows (140 cumulative distinct GA so far)
  [uncials] parsed "List of New Testament uncials" (362 KB)
  [uncials] 5 wikitable(s) found in "List of New Testament uncials"
  [uncials] extracted 247 rows (375 cumulative distinct GA so far)
  [minuscules1] parsed "List of New Testament minuscules (1-1000)" (1080 KB)
  [minuscules1] 10 wikitable(s) found in "List of New Testament minuscules (1-1000)"
  [minuscules1] extracted 981 rows (1330 cumulative distinct GA so far)
  [minuscules2] parsed "List of New Testament minuscules (1001-2000)" (759 KB)
  [minuscules2] 10 wikitable(s) found in "List of New Testament minuscules (1001-2000)"
  [minuscules2] extracted 994 rows (2292 cumulative distinct GA so far)
  [minuscules3] parsed "List of New Testament minuscules (2001-2900)" (741 KB)
  [minuscules3] 10 wikitable(s) found in "List of New Testament minuscules (2001-2900)"
  [minuscules3] extracted 918 rows (3181 cumulative distinct GA so far)
  [lectionaries] parsed "List of New Testament lectionaries" (1196 KB)
  [lectionaries] 25 wikitable(s) found in "List of New Testament lectionaries"
  [lectionaries] extracted 2460 rows (5564 cumulative distinct GA so far)
Merging: 1802 from Wikidata, 5564 from Wikipedia, 5672 distinct total.
Wrote catalog.json: 5672 rows, counts={"P":139,"M":293,"m":2855,"L":2385,"total":5672}
```

## Image fetch log

Generated: 2026-09-26T09:18:24.630Z

- IIIF resolved: 80 (attempts: 152, failed: 72)
- Commons resolved: 357 (candidates: 357)
- Total openable: 437
- By institution:
  - Bibliothèque nationale de France: 55
  - Vatican Library: 22
  - Catholic University of Louvain: 1
  - University of Chicago Library: 1
  - Thomas Fisher Rare Book Library: 1

### Run log

```
Loaded 5672 catalog rows from /home/runner/work/closer-not-farther/closer-not-farther/data/library/catalog.json
Manifest candidates to try: 152
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json (HTTP 400 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json)
  [05] manifest failed: https://cudl.lib.cam.ac.uk/iiif/MS-NN-00002-00041/manifest (HTTP 404 for manifest https://cudl.lib.cam.ac.uk/iiif/MS-NN-00002-00041/manifest)
  [055] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json)
  [056] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json)
  [099] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100919381/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100919381/manifest.json)
  [08] manifest failed: https://iiif.bodleian.ox.ac.uk/iiif/manifest/55b2e494-4845-403e-9ba6-d812bda79329.json (fetch failed)
  [8] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json)
  [9] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077251h/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077251h/manifest.json)
  [10] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721956q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721956q/manifest.json)
  [28] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723103z/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723103z/manifest.json)
  [34] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10547049c/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10547049c/manifest.json)
  [39] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721620n/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721620n/manifest.json)
  [36] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723175r/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723175r/manifest.json)
  [131] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json)
  [136] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json)
  [154] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json)
  [91] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220628/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220628/manifest.json)
  [93] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004943p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004943p/manifest.json)
  [250] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000556/manifest.json)
  [45] manifest failed: https://iiif.bodleian.ox.ac.uk/iiif/manifest/1c966b83-7c59-45cb-8e18-22c9f09b4895.json (fetch failed)
  [304] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722123f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722123f/manifest.json)
  [303] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721884p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721884p/manifest.json)
  [305] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json)
  [306] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json)
  [316] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json)
  [317] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json)
  [373] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json)
  [377] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json)
  [374] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json)
  [391] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json)
  [379] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json)
  [437] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json)
  [453] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json)
  [590] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json)
  [622] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json)
  [623] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json)
  [318] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000225q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000225q/manifest.json)
  [607] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json)
  [608] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000227m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000227m/manifest.json)
  [727] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220539/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220539/manifest.json)
  [728] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721694b/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721694b/manifest.json)
  [735] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107229384/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107229384/manifest.json)
  [737] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227173/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227173/manifest.json)
  [738] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723386c/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723386c/manifest.json)
  [736] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000222c/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000222c/manifest.json)
  [747] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004747q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004747q/manifest.json)
  [746] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000840/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000840/manifest.json)
  [754] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json)
  [749] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json)
  [854] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json)
  [855] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json)
  [856] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json)
  [857] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json)
  [858] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.647/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.647/manifest.json)
  [859] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json)
  [861] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json)
  [862] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json)
  [865] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json)
  [868] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json)
  [874] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json)
  [878] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json)
  [879] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json)
  [885] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json)
  [l10] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json)
  [l11] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json)
  [l12] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721807q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721807q/manifest.json)
  [l125] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json)
  [l5] manifest failed: https://iiif.bodleian.ox.ac.uk/iiif/manifest/c3a7b529-c0a8-4b2f-b12a-056f29eca463.json (fetch failed)
  [l147] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json)
  [l149] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227228/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227228/manifest.json)
  [l158] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723844q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723844q/manifest.json)
  [l205] manifest failed: https://iiif.bodleian.ox.ac.uk/iiif/manifest/3a910d94-9e88-4207-9020-8ee0634b01ec.json (fetch failed)
Phase 1 done: 80 IIIF services resolved, 72/152 attempts failed.
Commons candidates to try: 357
Phase 2 done: 357 Commons images resolved.
Wrote images.json: 437 openable images (80 IIIF, 357 Commons).
```
