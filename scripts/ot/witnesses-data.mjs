// Compiled base data for data/evidence/ot/witnesses.json. Every entry starts with
// `compiled: true` (dates, sigla, institutions and contents are drawn from standard,
// widely published reference works — see data/bible/SOURCES-OT.md for the source list —
// not from a live fetch); build-witnesses.mjs attempts to confirm/refine specific fields
// (chiefly `links` and `terms`) with a live CI fetch and, where it succeeds, updates that
// field and records it under `verified` instead of leaving it to `compiled` alone.
//
// `contents` entries are "BOOK.C.V-BOOK.C.V" ranges in standard English/USFM versification
// (matching data/bible/SCHEMA.md's verse ids), expanded later by verse-counts.mjs.
import { fullBookRange } from "./verse-counts.mjs";

const OT_BOOK_ORDER = [
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH",
  "EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS",
  "JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
];

export function buildWitnesses(verseCounts) {
  const fullTanakh = () => OT_BOOK_ORDER.map((b) => fullBookRange(b, verseCounts));

  return [
    // ---------------------------------------------------------------- Medieval codices
    {
      id: "leningrad-codex",
      name: "Leningrad Codex",
      siglum: "L (MS B19a)",
      date: "1008/9 AD",
      year: 1009,
      lang: "hbo",
      institution: "National Library of Russia, St. Petersburg (Firkovich Collection B 19 A)",
      contents: fullTanakh(),
      links: {
        images: "https://commons.wikimedia.org/wiki/Category:Leningrad_Codex",
        info: "https://en.wikipedia.org/wiki/Leningrad_Codex",
      },
      embed: false,
      terms: "Public-domain manuscript (dated 1008/9 AD); reproduction terms depend on the specific facsimile host and were not independently confirmed as embeddable.",
      compiled: true,
      note: "The base text of the Westminster Leningrad Codex (WLC) transcription used for data/bible/hebrew.",
    },
    {
      id: "aleppo-codex",
      name: "Aleppo Codex",
      siglum: "A (Keter Aram Tsova)",
      date: "c. 930 AD",
      year: 930,
      lang: "hbo",
      institution: "Israel Museum, Jerusalem (Shrine of the Book)",
      contents: [
        // Most of the Torah (Gen.1.1-Deu.28.16) was lost in 1947-48; the extant leaves
        // begin at Deu.28.17 and run to the end, with a few further gaps elsewhere
        // (e.g. the opening of Song of Songs). Given as a single approximate range.
        "DEU.28.17-MAL.4.6",
      ],
      links: {
        images: "https://www.aleppocodex.org",
        info: "https://en.wikipedia.org/wiki/Aleppo_Codex",
      },
      embed: false,
      terms: null,
      compiled: true,
      note: "Approximately 40% of the codex (essentially the whole Torah, Gen.1.1-Deu.28.16) has been missing since 1947-48; a few other leaves (part of the opening of Song of Songs, etc.) are also lost.",
    },
    {
      id: "cairo-genizah",
      name: "Cairo Genizah fragments",
      siglum: "Genizah (various)",
      date: "c. 870 AD - 19th c. AD (deposits span many centuries)",
      year: 870,
      lang: "hbo",
      institution: "Ben Ezra Synagogue, Fustat (Old Cairo); fragments now chiefly at Cambridge University Library (Taylor-Schechter Collection) and other libraries",
      contents: [],
      links: {
        images: "https://cudl.lib.cam.ac.uk/collections/genizah/1",
        info: "https://en.wikipedia.org/wiki/Cairo_Geniza",
      },
      embed: false,
      terms: null,
      compiled: true,
      note: "Not a single manuscript: a store of c. 300,000+ fragments (biblical, liturgical, documentary) accumulated from the 9th to 19th centuries; includes some of the oldest dated biblical codex fragments (Cairo Codex of the Prophets tradition) and early Masoretic witnesses. `contents` is left empty (too heterogeneous to give as verse ranges) and it is excluded from coverage-summary.json accordingly.",
    },
    {
      id: "samaritan-pentateuch",
      name: "Samaritan Pentateuch (representative MSS; Abisha Scroll)",
      siglum: "SP",
      date: "oldest extant MSS c. 12th-14th c. AD (the Abisha Scroll's core is traditionally claimed far earlier by the Samaritan community; independent codicological dating is much later); the SP as a textual tradition is ancient (attested distinctively by the 2nd century BC, e.g. in proto-Samaritan Qumran texts)",
      year: 1200,
      lang: "hbo",
      institution: "Samaritan community, Mount Gerizim/Nablus (Abisha Scroll kept by the Samaritan high priest); other SP MSS in the British Library, Cambridge UL, John Rylands Library",
      contents: [fullBookRange("GEN", verseCounts), fullBookRange("EXO", verseCounts), fullBookRange("LEV", verseCounts), fullBookRange("NUM", verseCounts), fullBookRange("DEU", verseCounts)],
      links: {
        images: null,
        info: "https://en.wikipedia.org/wiki/Samaritan_Pentateuch",
      },
      embed: false,
      terms: null,
      compiled: true,
      note: "Covers only the five books of the Torah (the sole canon of the Samaritans). The Abisha Scroll's own great age is a traditional Samaritan claim, not an independently verified codicological date; other Samaritan Pentateuch MSS are more securely dated to the medieval period. Textual affinities with 'proto-Samaritan' Qumran manuscripts (e.g. 4QpaleoExodm) show the tradition itself long predates any surviving copy.",
    },

    // ---------------------------------------------------------- Dead Sea Scrolls (a representative selection)
    dss({
      id: "1QIsaa", name: "Great Isaiah Scroll", date: "c. 125 BC", year: -125,
      contents: [fullBookRange("ISA", verseCounts)],
      leonLevy: "https://www.deadseascrolls.org.il/explore-the-archive/manuscript/Isaiaha-1",
      note: "The only complete biblical scroll from Qumran; virtually the entire Book of Isaiah is preserved intact on 17 sheets.",
    }),
    dss({
      id: "1QIsab", name: "Isaiah Scroll b", date: "1st c. BC - 1st c. AD (c. 50 BC-50 AD)", year: -50,
      contents: ["ISA.7.22-ISA.66.24"],
      note: "Substantial but incomplete; closer to the Masoretic consonantal text than 1QIsaa. Several columns are lost or fragmentary.",
    }),
    dss({
      id: "4QIsab", name: "Isaiah Scroll (4Q56)", date: "1st half of 1st c. BC", year: -75,
      contents: ["ISA.7.17-ISA.66.24"], note: "Fragmentary; one of ~21 Isaiah manuscripts found at Qumran.",
    }),
    dss({
      id: "4QpaleoExodm", name: "paleo-Hebrew Exodus (4Q22)", date: "c. 100 BC", year: -100,
      contents: ["EXO.6.25-EXO.37.16"],
      note: "Written in the archaic paleo-Hebrew script; closely related to the Samaritan Pentateuch's textual tradition (minus its sectarian expansions).",
    }),
    dss({
      id: "4QpaleoDeutr", name: "paleo-Hebrew Deuteronomy (4Q45)", date: "c. 125 BC", year: -125,
      contents: ["DEU.4.24-DEU.11.9"], note: "Written in the paleo-Hebrew script.",
    }),
    dss({
      id: "4QNumb", name: "Numbers b (4Q27)", date: "c. 30 BC - 20 AD", year: -30,
      contents: ["NUM.11.4-NUM.36.13"], note: "Extensive Numbers manuscript with a text-form closer to the Samaritan tradition and LXX than to the Masoretic Text in places.",
    }),
    dss({
      id: "4QDeutq", name: "Deuteronomy q (4Q44)", date: "c. 50-25 BC", year: -50,
      contents: ["DEU.32.1-DEU.32.43"],
      note: "Preserves the Song of Moses (Deut 32) in a text-form close to that presupposed by the Septuagint.",
    }),
    dss({
      id: "4QSamb", name: "Samuel b (4Q52)", date: "c. 250 BC", year: -250,
      contents: ["1SA.16.1-1SA.23.9"],
      note: "One of the very oldest Qumran biblical manuscripts (3rd century BC).",
    }),
    dss({
      id: "4QSama", name: "Samuel a (4Q51)", date: "c. 50-25 BC", year: -50,
      contents: ["1SA.1.1-2SA.24.20"],
      note: "The most extensive Samuel manuscript from Qumran; often agrees with the Septuagint's Vorlage against the (shorter) Masoretic Text, e.g. at 1 Samuel 11.",
    }),
    dss({
      id: "4QKgs", name: "Kings (4Q54)", date: "c. 150 BC", year: -150,
      contents: ["1KI.7.20-1KI.7.51"], note: "Small fragment of 1 Kings.",
    }),
    dss({
      id: "4QJera", name: "Jeremiah a (4Q70)", date: "c. 200 BC", year: -200,
      contents: ["JER.7.30-JER.22.16"],
      note: "Close to the Masoretic Text's (longer) edition of Jeremiah.",
    }),
    dss({
      id: "4QJerb", name: "Jeremiah b (4Q71)", date: "c. 200-150 BC", year: -200,
      contents: ["JER.9.22-JER.10.21"],
      note: "Reflects the shorter Hebrew edition of Jeremiah that underlies the Septuagint, roughly 1/8 shorter than the Masoretic Text.",
    }),
    dss({
      id: "4QEzeka", name: "Ezekiel a (4Q73)", date: "c. 20-50 AD", year: 20,
      contents: ["EZK.10.6-EZK.11.11"], note: "Fragmentary.",
    }),
    dss({
      id: "1QDana", name: "Daniel a (1Q71)", date: "c. 100-50 BC", year: -100,
      contents: ["DAN.1.10-DAN.2.6"], note: "Fragmentary; one of the earliest Daniel manuscripts, close in time to the book's composition.",
    }),
    dss({
      id: "4QDanc", name: "Daniel c (4Q114)", date: "late 2nd c. BC (c. 125 BC)", year: -125,
      contents: ["DAN.10.5-DAN.11.29"],
      note: "Paleographically among the very oldest copies of Daniel, within decades of the book's composition.",
    }),
    dss({
      id: "MurXII", name: "Minor Prophets scroll (Wadi Murabba'at)", date: "c. 115-135 AD", year: 115,
      contents: ["HOS.1.1-MAL.4.6"],
      note: "From Wadi Murabba'at (Bar Kokhba period), not Qumran proper; a nearly complete Book of the Twelve very close to the Masoretic consonantal text, showing the MT tradition's stability by the early 2nd century AD.",
    }),
    dss({
      id: "4QXIIc", name: "Minor Prophets c (4Q78)", date: "c. 75-50 BC", year: -75,
      contents: ["HOS.1.1-ZEC.14.18"], note: "Fragmentary Book of the Twelve manuscript.",
    }),
    dss({
      id: "11QPsa", name: "Great Psalms Scroll (11Q5)", date: "c. 30-50 AD", year: 30,
      contents: ["PSA.101.1-PSA.150.6"],
      note: "Covers roughly the last third of the Psalter but in a different order from the Masoretic Text and with additional compositions (e.g. Psalm 151, Sirach 51, 'Apostrophe to Zion'); its status (an alternate edition vs. a liturgical collection) is debated.",
    }),
    dss({
      id: "4QQoha", name: "Ecclesiastes a (4Q109)", date: "c. 175-150 BC", year: -175,
      contents: ["ECC.5.13-ECC.7.9"],
      note: "One of the earliest surviving copies of any Hebrew Bible book by absolute date, and important evidence for how early Ecclesiastes' final form existed.",
    }),
    dss({
      id: "4QCantb", name: "Song of Songs b (4Q107)", date: "c. 30 BC-30 AD", year: -30,
      contents: ["SNG.2.9-SNG.5.1"],
      note: "Preserves a shorter text-form of Song of Songs, missing verses found in the Masoretic Text.",
    }),
    dss({
      id: "2QRutha", name: "Ruth a (2Q16)", date: "1st half of 1st c. AD", year: 25,
      contents: ["RUT.2.13-RUT.3.18"], note: "Fragmentary.",
    }),
    dss({
      id: "5QLama", name: "Lamentations a (5Q6)", date: "c. 50 BC-50 AD", year: -25,
      contents: ["LAM.4.5-LAM.4.22"], note: "Fragmentary.",
    }),
    dss({
      id: "4QGenb", name: "Genesis b (4Q1)", date: "c. 125-100 BC", year: -125,
      contents: ["GEN.1.18-GEN.26.32"], note: "Fragmentary, non-contiguous.",
    }),
    dss({
      id: "4QLevb", name: "Leviticus b (4Q24)", date: "c. 100 BC", year: -100,
      contents: ["LEV.1.11-LEV.26.2"], note: "Fragmentary.",
    }),
    dss({
      id: "4QJudga", name: "Judges a (4Q49)", date: "c. 50 BC", year: -50,
      contents: ["JDG.6.2-JDG.6.13"],
      note: "Small fragment; may lack the section of Judges 6 found in later texts, of interest for the book's growth.",
    }),

    // -------------------------------------------------------------------- Septuagint codices
    {
      id: "codex-vaticanus",
      name: "Codex Vaticanus",
      siglum: "B / 03",
      date: "c. 300-325 AD",
      year: 325,
      lang: "grc",
      institution: "Vatican Apostolic Library (Vat. gr. 1209)",
      contents: [
        // Original 4th-century hand is missing Gen.1.1-Gen.46.28 (a later, 15th-century
        // hand supplied the loss) and Psalm 106-138 (English/MT numbering; a quire is
        // lost); Maccabees was never included (not applicable to the 39-book OT here).
        `GEN.46.29-GEN.${verseCounts.GEN.length}.${verseCounts.GEN[verseCounts.GEN.length - 1]}`,
        `EXO.1.1-PSA.105.${verseCounts.PSA[104]}`,
        `PSA.139.1-MAL.4.6`,
      ],
      links: {
        images: "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
        info: "https://en.wikipedia.org/wiki/Codex_Vaticanus",
      },
      embed: false,
      terms: null,
      compiled: true,
      note: "Original 4th-century hand lacks Gen.1.1-46.28 (supplied by a 15th-century restorer) and Psalm 106-138 (English numbering; a quire is missing); order and chapter/verse boundaries follow the Septuagint, only approximately mapped here onto the 39-book Hebrew-canon versification used elsewhere in this dataset.",
    },
    {
      id: "codex-sinaiticus",
      name: "Codex Sinaiticus",
      siglum: "א (Aleph) / 01",
      date: "c. 330-360 AD",
      year: 345,
      lang: "grc",
      institution: "Split between the British Library (London), Leipzig University Library, National Library of Russia, and Saint Catherine's Monastery (Sinai)",
      contents: ["1CH.9.27-2CH.36.23", "EZR.1.1-MAL.4.6"],
      links: {
        images: "https://codexsinaiticus.org",
        info: "https://en.wikipedia.org/wiki/Codex_Sinaiticus",
      },
      embed: false,
      terms: null,
      compiled: true,
      note: "Almost the entire Torah and Former Prophets (Genesis-2 Kings, and most of 1 Chronicles) are lost from the surviving OT portion; extant text effectively begins mid-1-Chronicles. Coverage given here is approximate at the whole-book level for the remaining books (Ezra onward), which themselves have further internal gaps not tracked individually.",
    },
  ];
}

function dss({ id, name, date, year, contents, leonLevy, note }) {
  return {
    id,
    name,
    siglum: id,
    date,
    year,
    lang: "hbo",
    institution: "Dead Sea Scrolls; Israel Antiquities Authority (Shrine of the Book, Israel Museum, Jerusalem, unless otherwise excavated/housed)",
    contents,
    links: {
      images: leonLevy || null,
      info: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`,
    },
    embed: false,
    terms: null,
    compiled: true,
    note,
  };
}
