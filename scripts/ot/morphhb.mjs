// Minimal, purpose-built parser for morphhb's OSIS XML (no general XML parser needed:
// the files are machine-generated and highly regular — every <verse>, <chapter> and <w>
// is a simple non-nested container with no attribute-value quoting surprises).
import { strongFromLemma } from "./books.mjs";

function parseAttrs(attrString) {
  const attrs = {};
  const re = /([a-zA-Z:]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

const TOKEN_RE = /<w\b([^>]*)>([^<]*)<\/w>|<seg\b([^>]*)>([^<]*)<\/seg>|<note\b[^>]*>([^<]*)<\/note>/g;
const CHAPTER_RE = /<chapter osisID="([^"]+)">([\s\S]*?)<\/chapter>/g;
const VERSE_RE = /<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
const KJV_NOTE_RE = /^KJV:([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)/;

// Returns { chapters: [ { c, verses: [ { v, words: [{surface,strong,morph,lemma}], kjvRefs: [{c,v}] } ] } ] }
export function parseMorphhbBook(xmlText) {
  const chapters = [];
  let chapterMatch;
  CHAPTER_RE.lastIndex = 0;
  while ((chapterMatch = CHAPTER_RE.exec(xmlText))) {
    const chapterOsisId = chapterMatch[1]; // "Gen.1"
    const c = parseInt(chapterOsisId.split(".").pop(), 10);
    const chapterBody = chapterMatch[2];
    const verses = [];

    let verseMatch;
    VERSE_RE.lastIndex = 0;
    while ((verseMatch = VERSE_RE.exec(chapterBody))) {
      const verseOsisId = verseMatch[1]; // "Gen.1.1"
      const v = parseInt(verseOsisId.split(".").pop(), 10);
      const body = verseMatch[2];

      const words = [];
      const kjvRefs = [];
      let tok;
      TOKEN_RE.lastIndex = 0;
      while ((tok = TOKEN_RE.exec(body))) {
        if (tok[1] !== undefined) {
          // <w ...>surface</w>
          const attrs = parseAttrs(tok[1]);
          const surface = tok[2];
          const lemma = attrs.lemma || "";
          const morph = attrs.morph || "";
          const strong = strongFromLemma(lemma);
          words.push({ surface, strong, morph, lemma });
        } else if (tok[3] !== undefined) {
          // <seg ...>text</seg> — punctuation (sof pasuq, maqqef, paseq): attach to the
          // previous word's surface so it prints exactly as in the source; if there is
          // no previous word yet (rare), prepend to the next one instead.
          const segText = tok[4];
          if (words.length) {
            words[words.length - 1].surface += segText;
          } else {
            words.__leadingSeg = (words.__leadingSeg || "") + segText;
          }
        } else if (tok[5] !== undefined) {
          const noteText = tok[5];
          const km = noteText.match(KJV_NOTE_RE);
          if (km) {
            const [, , kc, kv] = km;
            kjvRefs.push({ c: parseInt(kc, 10), v: parseInt(kv, 10) });
          }
        }
      }
      if (words.__leadingSeg && words.length) {
        words[0].surface = words.__leadingSeg + words[0].surface;
      }
      verses.push({ v, words, kjvRefs });
    }
    chapters.push({ c, verses });
  }
  return { chapters };
}
