// Minimal USFM -> plain text converter.
// Strips footnotes, cross-references, figures, alternate verse/chapter
// numbers and word-level attributes (Strong's/morphology tags); removes all
// other markers (paragraph/poetry/character styles, incl. words-of-Jesus
// \wj) while keeping their text content; captures \s/\s1/\s2 section
// headings keyed to the verse that follows them; and resolves verse bridges
// (\v 3-4) by putting the full text on the first verse and null on the rest.

const SPAN_SKIP_TAGS = new Set(["f", "x", "fig", "va", "ca"]);

function cleanupText(s) {
  return s
    .replace(/¶\s*/g, "") // "¶" paragraph mark (e.g. KJV \p rendered inline) + any following whitespace
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)’”])/g, "$1")
    .trim();
}

function stripAttributes(text) {
  // USFM character-style attributes: 'word|strong="G3056"' -> "word"
  const i = text.indexOf("|");
  return i === -1 ? text : text.slice(0, i);
}

/**
 * @param {string} content raw USFM file text
 * @returns {{ id: string|null, chapters: (string|null)[][], headings: Record<string,string> }}
 */
export function parseUsfm(content) {
  // Drop \rem remark lines outright (no matching close tag; they run to EOL).
  const lines = content.split(/\r\n|\r|\n/).filter((l) => !/^\s*\\rem\b/.test(l));
  const text = lines.join("\n");

  const tokenRe = /\\([A-Za-z0-9+]+\*?)|([^\\]+)/g;

  let id = null;
  let chapter = 0;
  let pendingVerseStart = null;
  let pendingVerseEnd = null;
  let started = false; // seen first \v yet
  let buffer = "";
  let skipDepth = 0;
  let skipTag = null;
  let headingBuffer = null; // string while capturing a heading, else null
  let pendingHeading = null; // captured heading text awaiting a verse number
  let expect = null; // "id" | "c" | "v" | null

  const chapters = []; // chapters[c-1] = array of verse text (string|null)
  const headings = {};

  function ensureChapter(c) {
    while (chapters.length < c) chapters.push([]);
    return chapters[c - 1];
  }

  function flushPendingVerse() {
    if (pendingVerseStart == null) return;
    const arr = ensureChapter(chapter);
    const finalText = cleanupText(buffer);
    while (arr.length < pendingVerseEnd) arr.push(null);
    arr[pendingVerseStart - 1] = finalText || null;
    for (let v = pendingVerseStart + 1; v <= pendingVerseEnd; v++) arr[v - 1] = null;
    buffer = "";
    pendingVerseStart = null;
    pendingVerseEnd = null;
  }

  function appendText(clean) {
    if (headingBuffer !== null) headingBuffer += clean;
    else if (started) buffer += clean;
  }

  let m;
  while ((m = tokenRe.exec(text)) !== null) {
    const marker = m[1];
    const chunk = m[2];

    if (chunk !== undefined) {
      if (expect === "id") {
        const mm = /^\s*([A-Za-z0-9]{2,4})/.exec(chunk);
        if (mm) id = mm[1].toUpperCase();
        expect = null;
        continue;
      }
      if (expect === "c") {
        const mm = /^\s*(\d+)([\s\S]*)$/.exec(chunk);
        expect = null;
        if (mm) {
          chapter = Number(mm[1]);
          if (skipDepth === 0) appendText(mm[2]);
        }
        continue;
      }
      if (expect === "v") {
        const mm = /^\s*(\d+)(?:-(\d+))?\s?([\s\S]*)$/.exec(chunk);
        expect = null;
        if (mm) {
          started = true;
          pendingVerseStart = Number(mm[1]);
          pendingVerseEnd = mm[2] ? Number(mm[2]) : pendingVerseStart;
          if (pendingHeading) {
            headings[`${chapter}:${pendingVerseStart}`] = pendingHeading;
            pendingHeading = null;
          }
          if (skipDepth === 0) appendText(mm[3]);
        }
        continue;
      }
      if (skipDepth > 0) continue;
      appendText(stripAttributes(chunk));
      continue;
    }

    // marker token
    if (marker === "id") {
      expect = "id";
      continue;
    }
    if (skipDepth > 0) {
      if (marker === `${skipTag}*`) {
        skipDepth = 0;
        skipTag = null;
      }
      continue;
    }
    if (SPAN_SKIP_TAGS.has(marker)) {
      skipDepth = 1;
      skipTag = marker;
      continue;
    }
    if (marker === "c") {
      flushPendingVerse();
      headingBuffer = null;
      pendingHeading = null;
      expect = "c";
      continue;
    }
    if (marker === "v") {
      flushPendingVerse();
      if (headingBuffer !== null) {
        const h = cleanupText(headingBuffer);
        if (h) pendingHeading = h;
        headingBuffer = null;
      }
      expect = "v";
      continue;
    }
    if (marker === "s" || /^s\d$/.test(marker)) {
      headingBuffer = "";
      continue;
    }
    // Any other marker (paragraph/poetry/character style, incl. wj/add/nd/
    // em/bd/it/sc/qs/tl/pn/+w, and their closing "*" forms): drop the marker
    // itself but treat it as a word boundary in running text.
    if (headingBuffer !== null) {
      headingBuffer += " ";
    } else if (started) {
      buffer += " ";
    }
  }
  flushPendingVerse();

  return { id, chapters, headings };
}
