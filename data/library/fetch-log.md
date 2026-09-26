# Library catalog fetch log

Generated: 2026-09-26T09:23:40.309Z

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
  wikidata: inventory number (P217): 394 bindings, 374 distinct items.
  wikidata: image (P18): 363 bindings, 363 distinct items.
  inception dates: 365 bindings, 349 distinct items.
  wikidata: Commons category (P373): 273 bindings, 273 distinct items.
  GA numbers + labels: 1809 bindings.
  wikidata: collection (P195): 586 bindings, 570 distinct items.
  wikidata: IIIF manifest (P6108): 112 bindings, 100 distinct items.
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

Generated: 2026-09-26T09:39:25.718Z

- IIIF resolved: 97 (attempts: 153, failed: 56)
- Commons resolved: 350 (candidates: 353)
- Total openable: 447
- By institution:
  - Bibliothèque nationale de France: 67
  - Vatican Library: 22
  - Bodleian Library: 4
  - Cambridge University Library: 1
  - Catholic University of Louvain: 1
  - University of Chicago Library: 1
  - Thomas Fisher Rare Book Library: 1

### Run log

```
Loaded 5672 catalog rows from /home/runner/work/closer-not-farther/closer-not-farther/data/library/catalog.json
Manifest candidates to try: 152
  (of which 93 touch Gallica, throttled separately)
  [131] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json)
  [136] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json)
  [154] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json)
  [373] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json)
  [374] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json)
  [377] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json)
  [379] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json)
  [391] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json)
  [437] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json)
  [453] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json)
  [590] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json)
  [622] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json)
  [623] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json)
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
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json (HTTP 404 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json)
  [l125] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json)
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/fmb-pb-ii.json (HTTP 400 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/fmb-pb-ii.json)
  [055] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json)
  [056] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json)
  [7] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json)
  [8] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json)
  [24] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json)
  [25] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220556/manifest.json)
  [41] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10037624w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10037624w/manifest.json)
  [62] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json)
  [269] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json)
  [299] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json)
  [305] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json)
  [306] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json)
  [316] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json)
  [317] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json)
  [605] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json)
  [607] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json)
  [731] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721812w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721812w/manifest.json)
  [732] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219486/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219486/manifest.json)
  [740] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json)
  [741] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json)
  [749] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json)
  [754] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json)
  [l10] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json)
  [l11] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json)
  [l144] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json)
  [l147] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json)
Phase 1 done: 97 IIIF services resolved, 56/153 attempts failed.
Commons candidates to try: 353
  [0244] Commons error: HTTP 429 for commons imageinfo File:Uncial 0244 (GA) verso.jpg
  [0249] Commons error: HTTP 429 for commons imageinfo File:Uncial 0249 Matt 25,8-9; Auct.T. 4.21, ff. 327.png
  [0250] Commons error: HTTP 429 for commons imageinfo File:Codex Climaci Rescriptus.jpg
Phase 2 done: 350 Commons images resolved.
Wrote images.json: 447 openable images (97 IIIF, 350 Commons).
```
