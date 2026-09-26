# Library catalog fetch log

Generated: 2026-09-26T08:53:06.731Z

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
- Institutions resolved via Wikidata: 0 / 88 QIDs

## Run log

```
Querying Wikidata for all items with P1577 (Gregory-Aland number)...
  wikidata: location (P276): 43 bindings, 41 distinct items.
  wikidata: IIIF manifest (P6108): 112 bindings, 100 distinct items.
  wikidata: image (P18): 363 bindings, 363 distinct items.
  wikidata: Commons category (P373): 273 bindings, 273 distinct items.
  GA numbers + labels: 1809 bindings.
  inception dates: 365 bindings, 349 distinct items.
  wikidata: collection (P195): 586 bindings, 570 distinct items.
  wikidata: inventory number (P217): 394 bindings, 374 distinct items.
  Parsed 1802 distinct GA numbers from Wikidata.
  Distinct institution QIDs to resolve: 88
  Institution chunk at 0 failed: HTTP 429 for institutions chunk 0
  Institution chunk at 80 failed: This operation was aborted
  Resolved 0/88 institutions.
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

Generated: 2026-09-26T08:59:05.210Z

- IIIF resolved: 53 (attempts: 152, failed: 99)
- Commons resolved: 342 (candidates: 358)
- Total openable: 395
- By institution:
  - Vatican Library: 20
  - National Library: 19
  - gallica.bnf.fr: 4
  - Bodleian Library: 3
  - National Library of France: 1
  - iiif.bodleian.ox.ac.uk: 1
  - Catholic University of Louvain: 1
  - INTF: 1
  - CSNTM: 1
  - iiif-collection.lib.uchicago.edu: 1
  - University of Toronto The Thomas Fisher Rare Book Library: 1

### Run log

```
Loaded 5672 catalog rows from /home/runner/work/closer-not-farther/closer-not-farther/data/library/catalog.json
Manifest candidates to try: 152
  [05] manifest failed: https://cudl.lib.cam.ac.uk/iiif/MS-NN-00002-00041/manifest (HTTP 404 for manifest https://cudl.lib.cam.ac.uk/iiif/MS-NN-00002-00041/manifest)
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json (HTTP 400 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json)
  [055] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json)
  [099] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100919381/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100919381/manifest.json)
  [056] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json)
  [0141] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721841p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721841p/manifest.json)
  [5] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002532/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002532/manifest.json)
  [4] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230259/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230259/manifest.json)
  [6] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722052v/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722052v/manifest.json)
  [7] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json)
  [9] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077251h/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077251h/manifest.json)
  [8] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json)
  [10] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721956q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721956q/manifest.json)
  [24] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json)
  [20] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722205w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722205w/manifest.json)
  [19] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218837/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218837/manifest.json)
  [12] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722144q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722144q/manifest.json)
  [40] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762371/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762371/manifest.json)
  [36] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723175r/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723175r/manifest.json)
  [80] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10082072m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10082072m/manifest.json)
  [62] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json)
  [131] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json)
  [136] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json)
  [154] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json)
  [82] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723418r/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723418r/manifest.json)
  [91] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220628/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220628/manifest.json)
  [93] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004943p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004943p/manifest.json)
  [250] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000556/manifest.json)
  [269] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json)
  [299] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json)
  [300] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722575x/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722575x/manifest.json)
  [301] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107221811/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107221811/manifest.json)
  [303] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721884p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721884p/manifest.json)
  [304] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722123f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722123f/manifest.json)
  [302] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722827w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722827w/manifest.json)
  [313] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721800k/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721800k/manifest.json)
  [315] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230276/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230276/manifest.json)
  [316] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json)
  [317] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json)
  [373] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json)
  [374] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json)
  [377] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json)
  [379] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json)
  [391] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json)
  [392] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.521,ff.7-391/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.521,ff.7-391/manifest.json)
  [437] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json)
  [453] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json)
  [318] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000225q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000225q/manifest.json)
  [320] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000071/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000071/manifest.json)
  [329] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721489d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721489d/manifest.json)
  [590] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json)
  [468] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10884876b/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10884876b/manifest.json)
  [603] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228629/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228629/manifest.json)
  [605] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json)
  [607] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json)
  [622] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json)
  [623] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json)
  [608] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000227m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000227m/manifest.json)
  [727] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220539/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220539/manifest.json)
  [729] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721881b/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721881b/manifest.json)
  [728] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721694b/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721694b/manifest.json)
  [736] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000222c/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000222c/manifest.json)
  [740] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json)
  [737] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227173/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227173/manifest.json)
  [738] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723386c/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723386c/manifest.json)
  [743] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004844r/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004844r/manifest.json)
  [741] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json)
  [742] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721922p/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721922p/manifest.json)
  [744] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110045096/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110045096/manifest.json)
  [746] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000840/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000840/manifest.json)
  [749] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json)
  [754] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json)
  [747] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004747q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004747q/manifest.json)
  [855] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json)
  [854] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json)
  [856] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json)
  [857] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json)
  [858] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.647,ff.155-338/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.647,ff.155-338/manifest.json)
  [859] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json)
  [861] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json)
  [862] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json)
  [865] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json)
  [868] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json)
  [874] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json)
  [878] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json)
  [879] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json)
  [885] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json)
  [l1] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107234859/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107234859/manifest.json)
  [l2] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723481h/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723481h/manifest.json)
  [l7] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227245/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227245/manifest.json)
  [l8] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723578m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723578m/manifest.json)
  [l125] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json)
  [l80] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722727h/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722727h/manifest.json)
  [l13] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110049338/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110049338/manifest.json)
  [l12] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721807q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721807q/manifest.json)
  [l144] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json)
  [l158] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723844q/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723844q/manifest.json)
  [l149] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227228/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227228/manifest.json)
  [l147] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json)
Phase 1 done: 53 IIIF services resolved, 99/152 attempts failed.
Commons candidates to try: 358
  [036] Commons error: HTTP 429 for commons imageinfo File:Codex Tischendorfianus IV Mt 8,11-18.jpg
  [037] Commons error: HTTP 429 for commons imageinfo File:Codex Sangallensis 48 318.jpg
  [038] Commons error: HTTP 429 for commons imageinfo File:Codex Coridethianus Mk 6 19-21.jpg
  [039] Commons error: HTTP 429 for commons imageinfo File:Tischendorfianus III Folio 1 verso with Canon tables.jpg
  [561] Commons error: HTTP 429 for commons imageinfo File:Minuscule 561 GA 0087a.JPG
  [562] Commons error: HTTP 429 for commons imageinfo File:Minuscule 562 (GA) 0001a.jpg
  [565] Commons error: HTTP 429 for commons imageinfo File:Minuscule 565 (GA).jpg
  [568] Commons error: HTTP 429 for commons imageinfo File:Minuscule 568 (GA).jpg
  [l233] Commons error: HTTP 429 for commons imageinfo File:Greek Evangelistarium. Gospel Lectionary without evangelist portraits - Upper cover (Add Ms 39603).jpg
  [l239] Commons error: HTTP 429 for commons imageinfo File:Lectionary 239 GA 0015b.JPG
  [l240] Commons error: HTTP 429 for commons imageinfo File:Lectionary 240 GA 0001a.JPG
  [l241] Commons error: HTTP 429 for commons imageinfo File:Lectionary 241 GA 0001a.jpg
  [l243] Commons error: HTTP 429 for commons imageinfo File:Trapezunt gospel.jpg
  [l257] Commons error: HTTP 429 for commons category Lectionary 257
  [l269] Commons error: HTTP 429 for commons imageinfo File:Lectionary 269 (Jo 6,16-20).JPG
  [l296] Commons error: HTTP 429 for commons imageinfo File:Lectionary 296 f.6v.JPG
Phase 2 done: 342 Commons images resolved.
Wrote images.json: 395 openable images (53 IIIF, 342 Commons).
```
