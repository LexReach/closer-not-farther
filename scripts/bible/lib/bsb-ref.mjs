import { bookIdFromName } from "./book-names.mjs";

const OSIS_ABBR = {
  Gen: "GEN", Exod: "EXO", Exo: "EXO", Lev: "LEV", Num: "NUM", Deut: "DEU", Deu: "DEU",
  Josh: "JOS", Jos: "JOS", Judg: "JDG", Jdg: "JDG", Ruth: "RUT", Rut: "RUT",
  "1Sam": "1SA", "1Sa": "1SA", "2Sam": "2SA", "2Sa": "2SA", "1Kgs": "1KI", "1Ki": "1KI",
  "2Kgs": "2KI", "2Ki": "2KI", "1Chr": "1CH", "1Ch": "1CH", "2Chr": "2CH", "2Ch": "2CH",
  Ezra: "EZR", Ezr: "EZR", Neh: "NEH", Esth: "EST", Est: "EST", Job: "JOB",
  Ps: "PSA", Psa: "PSA", Pss: "PSA", Prov: "PRO", Pro: "PRO", Eccl: "ECC", Ecc: "ECC",
  Song: "SNG", Sng: "SNG", Cant: "SNG", Isa: "ISA", Jer: "JER", Lam: "LAM",
  Ezek: "EZK", Ezk: "EZK", Dan: "DAN", Hos: "HOS", Joel: "JOL", Jol: "JOL", Amos: "AMO", Amo: "AMO",
  Obad: "OBA", Oba: "OBA", Jonah: "JON", Jon: "JON", Mic: "MIC", Nah: "NAM", Nam: "NAM",
  Hab: "HAB", Zeph: "ZEP", Zep: "ZEP", Hag: "HAG", Zech: "ZEC", Zec: "ZEC", Mal: "MAL",
  Matt: "MAT", Mat: "MAT", Mark: "MRK", Mrk: "MRK", Luke: "LUK", Luk: "LUK", John: "JHN", Jhn: "JHN",
  Acts: "ACT", Act: "ACT", Rom: "ROM", "1Cor": "1CO", "1Co": "1CO", "2Cor": "2CO", "2Co": "2CO",
  Gal: "GAL", Eph: "EPH", Phil: "PHP", Php: "PHP", Col: "COL",
  "1Thess": "1TH", "1Th": "1TH", "2Thess": "2TH", "2Th": "2TH",
  "1Tim": "1TI", "1Ti": "1TI", "2Tim": "2TI", "2Ti": "2TI", Titus: "TIT", Tit: "TIT",
  Phlm: "PHM", Phm: "PHM", Heb: "HEB", Jas: "JAS", "1Pet": "1PE", "1Pe": "1PE",
  "2Pet": "2PE", "2Pe": "2PE", "1John": "1JN", "1Jn": "1JN", "2John": "2JN", "2Jn": "2JN",
  "3John": "3JN", "3Jn": "3JN", Jude: "JUD", Jud: "JUD", Rev: "REV",
};

/**
 * Parse a verse reference cell in one of several common shapes:
 *  - "Genesis 1:1", "1 Corinthians 13:4", "Song of Solomon 2:1"
 *  - "Gen.1.1", "1Co.13.4" (OSIS-style dotted)
 *  - "GEN 1:1" (already a USFM id)
 * Returns { book, chapter, verse } (book = our USFM id) or null.
 */
export function parseRef(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  let m = /^([1-3]?\s?[A-Za-z][A-Za-z .]*?)\s+(\d+)[:.](\d+)/.exec(s);
  if (m) {
    const book = bookIdFromName(m[1]) || OSIS_ABBR[m[1].replace(/\s+/g, "")] || null;
    if (book) return { book, chapter: Number(m[2]), verse: Number(m[3]) };
  }

  m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)/.exec(s);
  if (m) {
    const book = OSIS_ABBR[m[1]] || bookIdFromName(m[1]);
    if (book) return { book, chapter: Number(m[2]), verse: Number(m[3]) };
  }

  return null;
}
