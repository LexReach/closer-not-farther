# Library catalog fetch log

Generated: 2026-09-26T10:11:02.587Z

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
  wikidata: latest date (P1326): 0 bindings, 0 distinct items.
  wikidata: earliest date (P1319): 0 bindings, 0 distinct items.
  inception dates: 365 bindings, 349 distinct items.
  wikidata: Commons category (P373): 273 bindings, 273 distinct items.
  wikidata: inventory number (P217): 394 bindings, 374 distinct items.
  wikidata: collection (P195): 586 bindings, 570 distinct items.
  wikidata: image (P18): 363 bindings, 363 distinct items.
  wikidata: IIIF manifest (P6108): 112 bindings, 100 distinct items.
  wikidata: location (P276): 43 bindings, 41 distinct items.
  GA numbers + labels: 1809 bindings.
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
  [uncials] table headers: ["#","Sign","Name","Date","Content","Pages","Institution","City","Country","Images"] -> colMap {"ga":1,"name":2,"date":3,"contents":4,"location":6}
  [uncials] table: 20 parsed, 8+ skipped (unparseable GA), samples: ["א",null,null,"A",null,"B",null,"C"]
  [uncials] table: GA 01-09 found in this table: []
  [uncials] table headers: ["#","Date","Content","Pages","Institution","City","Country","Images"] -> colMap {"date":1,"contents":2,"location":4}
  [uncials] table: 41 parsed, 8+ skipped (unparseable GA), samples: ["INTF","John 2:17-3:8","John 1:1, 1:3-4, 20:10-13, 20:15-17","John 4:7-14","059=","CSNTM","063=","Luke 17:29-18:14; 20:43-21:20; 23:7-30; 23:54-24:20; 24:41-53; John 1:1-3,34; 4:45-6:29"]
  [uncials] table: GA 01-09 found in this table: []
  [uncials] table headers: ["#","Date","Content","Pages","Institution","City","Country","Images"] -> colMap {"date":1,"contents":2,"location":4}
  [uncials] table: 73 parsed, 8+ skipped (unparseable GA), samples: ["0102=","Luke 4:3-29","Matthew 21:24-24:15","INTF","0106=","Matthew 13:46-55, 14:8-29, 15:4-14","Matthew 13:32-36","Matthew 12:17-25"]
  [uncials] table: GA 01-09 found in this table: []
  [uncials] table headers: ["#","Date","Content","Pages","Institution","City","Country","Images"] -> colMap {"date":1,"contents":2,"location":4}
  [uncials] table: 91 parsed, 8+ skipped (unparseable GA), samples: ["=070","=ℓ 1575","=ℓ 1575","CSNTM","CSNTM","INTF","CSNTM","INTF"]
  [uncials] table: GA 01-09 found in this table: []
  [uncials] table headers: ["#","Date","Content","Pages","Institution","City","Country","Images"] -> colMap {"date":1,"contents":2,"location":4}
  [uncials] table: 22 parsed, 8+ skipped (unparseable GA), samples: ["CSNTM","CSNTM","CSNTM, INTF","CSNTM, INTF","CSNTM, INTF","CSNTM, INTF","CSNTM, INTF","0319="]
  [uncials] table: GA 01-09 found in this table: []
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

Generated: 2026-09-26T10:30:23.743Z

- IIIF resolved: 206 (attempts: 406, failed: 200)
- Commons resolved: 348 (candidates: 351)
- Total openable: 554
- By institution:
  - Vatican Library: 129
  - Bibliothèque nationale de France: 67
  - Bodleian Library: 4
  - Cambridge University Library: 1
  - Catholic University of Louvain: 1
  - Bodleian Art, Archaeology and Ancient World Library: 1
  - University of Chicago Library: 1
  - Vatican Apostolic Library: 1
  - Thomas Fisher Rare Book Library: 1

### Run log

```
Loaded 5672 catalog rows from /home/runner/work/closer-not-farther/closer-not-farther/data/library/catalog.json
Manifest candidates to try: 405
  (of which 93 touch Gallica, throttled separately)
  [048] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.2061/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.2061/manifest.json)
  [054] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.Gr.521/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.Gr.521/manifest.json)
  [0307] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.2061/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.2061/manifest.json)
  [130] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.359/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.359/manifest.json)
  [131] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.360/manifest.json)
  [132] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.361/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.361/manifest.json)
  [135] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.365/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.365/manifest.json)
  [136] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.665/manifest.json)
  [141] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1160/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1160/manifest.json)
  [144] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1254/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1254/manifest.json)
  [145] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1548/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1548/manifest.json)
  [154] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.28/manifest.json)
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json (HTTP 404 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/manifest.json)
  [158] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.Pii.II.55/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.Pii.II.55/manifest.json)
  [161] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.352/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.352/manifest.json)
  [164] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.319/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.319/manifest.json)
  [174] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2002/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2002/manifest.json)
  [175] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2080/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2080/manifest.json)
  [176] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2113/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2113/manifest.json)
  [373] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1423/manifest.json)
  [374] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1445/manifest.json)
  [376] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1539/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1539/manifest.json)
  [377] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1618/manifest.json)
  [379] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1769/manifest.json)
  [380] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2139/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2139/manifest.json)
  [P66] manifest failed: https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/fmb-pb-ii.json (HTTP 400 for manifest https://www.e-codices.unifr.ch/metadata/iiif/fmb-pb-ii/fmb-pb-ii.json)
  [055] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721748f/manifest.json)
  [056] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110001885/manifest.json)
  [391] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.432/manifest.json)
  [382] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2070/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2070/manifest.json)
  [392] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.521/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.521/manifest.json)
  [396] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.IV.6/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.IV.6/manifest.json)
  [7] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10025551d/manifest.json)
  [8] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10077253d/manifest.json)
  [436] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.367/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.367/manifest.json)
  [432] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.366/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.366/manifest.json)
  [437] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.760/manifest.json)
  [450] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.Gr.29/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Reg.Gr.29/manifest.json)
  [24] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228646/manifest.json)
  [25] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107220556/manifest.json)
  [452] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.Pio.II.50/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.Pio.II.50/manifest.json)
  [451] manifest failed: https://digi.vatlib.it/iiif/MSS_Urb.Gr.3/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Urb.Gr.3/manifest.json)
  [453] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.582/manifest.json)
  [590] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Pal.15/manifest.json)
  [41] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10037624w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10037624w/manifest.json)
  [62] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107227156/manifest.json)
  [621] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1270/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1270/manifest.json)
  [623] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1650/manifest.json)
  [622] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1430/manifest.json)
  [624] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1714/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1714/manifest.json)
  [626] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1968/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1968/manifest.json)
  [269] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b105494556/manifest.json)
  [299] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107230884/manifest.json)
  [627] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2062/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2062/manifest.json)
  [625] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1761/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1761/manifest.json)
  [852] manifest failed: https://digi.vatlib.it/iiif/MSS_Borg.gr.9/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Borg.gr.9/manifest.json)
  [854] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.641/manifest.json)
  [855] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.643/manifest.json)
  [856] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.644/manifest.json)
  [857] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.645/manifest.json)
  [858] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.647/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.647/manifest.json)
  [859] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.759/manifest.json)
  [861] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1090/manifest.json)
  [862] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1191/manifest.json)
  [864] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1253/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1253/manifest.json)
  [865] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1472/manifest.json)
  [868] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1933/manifest.json)
  [871] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2117/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2117/manifest.json)
  [872] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2160/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2160/manifest.json)
  [873] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2165/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2165/manifest.json)
  [874] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2187/manifest.json)
  [875] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2247/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2247/manifest.json)
  [878] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.37/manifest.json)
  [879] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.100/manifest.json)
  [885] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.5/manifest.json)
  [1817] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.551/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.551/manifest.json)
  [1819] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.592/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.592/manifest.json)
  [1820] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.593/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.593/manifest.json)
  [1823] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2316/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2316/manifest.json)
  [1844] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1227/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1227/manifest.json)
  [1846] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2099/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2099/manifest.json)
  [634] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.V.29/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.V.29/manifest.json)
  [1914] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.761/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.761/manifest.json)
  [1917] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.766/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.766/manifest.json)
  [1918] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1136/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1136/manifest.json)
  [1916] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.765/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.765/manifest.json)
  [1945] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1649/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1649/manifest.json)
  [1950] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.V.32/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.V.32/manifest.json)
  [1951] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.VIII.55/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.VIII.55/manifest.json)
  [1988] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.549/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.549/manifest.json)
  [305] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721888g/manifest.json)
  [306] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10723182t/manifest.json)
  [1994] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1222/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1222/manifest.json)
  [1992] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.648/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.648/manifest.json)
  [1993] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.692/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.692/manifest.json)
  [1991] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.646/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.646/manifest.json)
  [316] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110002248/manifest.json)
  [317] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107228322/manifest.json)
  [2006] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.4/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.4/manifest.json)
  [1995] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2180/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2180/manifest.json)
  [1997] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.gr.10/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Pal.gr.10/manifest.json)
  [1998] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.204/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.204/manifest.json)
  [605] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b100762678/manifest.json)
  [607] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110003058/manifest.json)
  [2008] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.636/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.636/manifest.json)
  [2022] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.474/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.474/manifest.json)
  [2020] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.579/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.579/manifest.json)
  [2021] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.68/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.68/manifest.json)
  [731] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721812w/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10721812w/manifest.json)
  [732] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219486/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219486/manifest.json)
  [2033] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.IV.8/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.IV.8/manifest.json)
  [2031] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1743/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1743/manifest.json)
  [2036] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.656/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.656/manifest.json)
  [2032] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1904II/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1904II/manifest.json)
  [2059] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.370/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.370/manifest.json)
  [2060] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.542/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.542/manifest.json)
  [2058] manifest failed: https://digi.vatlib.it/iiif/MSS_Chig.R.V.33/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Chig.R.V.33/manifest.json)
  [2061] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.1190/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.1190/manifest.json)
  [2062] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.1426/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.1426/manifest.json)
  [2195] manifest failed: https://digi.vatlib.it/iiif/MSS_Ross.135-138/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ross.135-138/manifest.json)
  [2063] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.Gr.1976/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.Gr.1976/manifest.json)
  [2480] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2348/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2348/manifest.json)
  [2481] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2350/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2350/manifest.json)
  [2584] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2319/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2319/manifest.json)
  [2586] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2398/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2398/manifest.json)
  [2591] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2562/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2562/manifest.json)
  [2592] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2564/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2564/manifest.json)
  [741] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107243356/manifest.json)
  [740] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107218854/manifest.json)
  [2593] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2573/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2573/manifest.json)
  [2739] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1501/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1501/manifest.json)
  [2839] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1190/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1190/manifest.json)
  [2958] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.788B/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.788B/manifest.json)
  [l36] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1067/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1067/manifest.json)
  [l122] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1068/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1068/manifest.json)
  [l124] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1988/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1988/manifest.json)
  [l125] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2017/manifest.json)
  [l126] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2041/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2041/manifest.json)
  [l128] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2133/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2133/manifest.json)
  [l134] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.565/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.565/manifest.json)
  [l160] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1528/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1528/manifest.json)
  [l528] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.303/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.303/manifest.json)
  [749] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11004848j/manifest.json)
  [754] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000103m/manifest.json)
  [l536] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.471/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.471/manifest.json)
  [l539] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.350/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.350/manifest.json)
  [l537] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.579/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.579/manifest.json)
  [l540] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.352/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.352/manifest.json)
  [l10] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722994t/manifest.json)
  [l11] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b10722721t/manifest.json)
  [l541] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.353/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.353/manifest.json)
  [l542] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.355/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.355/manifest.json)
  [l544] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.362/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.362/manifest.json)
  [l543] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.357/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.357/manifest.json)
  [l144] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b110000054/manifest.json)
  [l147] manifest failed: https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json (HTTP 429 for manifest https://gallica.bnf.fr/iiif/ark:/12148/btv1b107219501/manifest.json)
  [l546] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.781/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.781/manifest.json)
  [l547] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1217/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1217/manifest.json)
  [l545] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.540/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.540/manifest.json)
  [l548] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1228/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1228/manifest.json)
  [l550] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1601/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1601/manifest.json)
  [l549] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1523/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1523/manifest.json)
  [l552] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1813/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1813/manifest.json)
  [l551] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1625/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1625/manifest.json)
  [l553] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1886/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1886/manifest.json)
  [l554] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1973/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1973/manifest.json)
  [l555] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1978/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1978/manifest.json)
  [l556] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2012/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2012/manifest.json)
  [l558] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2052/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2052/manifest.json)
  [l557] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2051/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2051/manifest.json)
  [l560] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2100/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2100/manifest.json)
  [l564] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2167/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2167/manifest.json)
  [l565] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2251/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2251/manifest.json)
  [l566] manifest failed: https://digi.vatlib.it/iiif/MSS_Ottob.gr.444/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Ottob.gr.444/manifest.json)
  [l568] manifest failed: https://digi.vatlib.it/iiif/MSS_Pal.gr.221/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Pal.gr.221/manifest.json)
  [l570] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.PiiII33/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.PiiII33/manifest.json)
  [l612] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.369/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.369/manifest.json)
  [l614] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2116/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2116/manifest.json)
  [l962] manifest failed: https://digi.vatlib.it/iiif/MSS_Borg.copt.109/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Borg.copt.109/manifest.json)
  [l1046] manifest failed: https://digi.vatlib.it/iiif/MSS_Reg.gr.PiiII34/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Reg.gr.PiiII34/manifest.json)
  [l1504] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.346/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.346/manifest.json)
  [l1931] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2007/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2007/manifest.json)
  [l1932] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2032/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2032/manifest.json)
  [l1934] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2320/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2320/manifest.json)
  [l1933] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2311/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2311/manifest.json)
  [l1935] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2502/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2502/manifest.json)
  [l1937] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2542/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2542/manifest.json)
  [l1938] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2560/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2560/manifest.json)
  [l1939] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2560/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2560/manifest.json)
  [l1941] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2574/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2574/manifest.json)
  [l2113] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.469/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.469/manifest.json)
  [l2114] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.472/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.472/manifest.json)
  [l2115] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1516/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1516/manifest.json)
  [l2123] manifest failed: https://digi.vatlib.it/iiif/MSS_Borg.gr.19/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Borg.gr.19/manifest.json)
  [l2124] manifest failed: https://digi.vatlib.it/iiif/MSS_Borg.gr.19/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Borg.gr.19/manifest.json)
  [l2149] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1839/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1839/manifest.json)
  [l2150] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.1252/manifest.json (HTTP 404 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.1252/manifest.json)
  [l2354] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.774/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.774/manifest.json)
  [l2321] manifest failed: https://digi.vatlib.it/iiif/MSS_Vat.gr.2061/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Vat.gr.2061/manifest.json)
  [l2370] manifest failed: https://digi.vatlib.it/iiif/MSS_Barb.gr.475/manifest.json (HTTP 429 for manifest https://digi.vatlib.it/iiif/MSS_Barb.gr.475/manifest.json)
Phase 1 done: 206 IIIF services resolved, 200/406 attempts failed.
Commons candidates to try: 351
  [0252] Commons error: HTTP 429 for commons imageinfo File:P. Monts. Roca inv. no 6 verte.png
  [0269] Commons error: HTTP 429 for commons imageinfo File:Uncial 0269.png
  [0283] Commons error: HTTP 429 for commons imageinfo File:Uncial 0283 page 90 Mark 3,1-3.jpg
Phase 2 done: 348 Commons images resolved.
Wrote images.json: 554 openable images (206 IIIF, 348 Commons).
```
