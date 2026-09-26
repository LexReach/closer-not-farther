// Aligns bsb_tables' per-word "BSB version" English fragments onto the
// verbatim bsb.txt verse string, so the displayed BSB text is always exactly
// what bsb.txt says (in its own word order/punctuation), while individual
// spans still carry a link to their Greek word when we can place them.

const WORD_RE = /[A-Za-z0-9']+/g;

/** Tokenize into {start, end, word (lowercased)} in source order. */
export function tokenize(text) {
  const tokens = [];
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, word: m[0].toLowerCase() });
  }
  return tokens;
}

/**
 * Strip bsb_tables' interlinear-only markup from a row's English fragment:
 * [brackets] around supplied words, stray footnote marks, and "-"/"vvv"
 * placeholders for a word with no separate English rendering.
 * Returns "" when nothing real is left.
 */
export function cleanRowEnglish(raw) {
  let s = String(raw ?? "")
    .replace(/[[\]]/g, "")
    .replace(/[†‡*]/g, "")
    .trim();
  if (!s || /^-+$/.test(s) || /^vvv$/i.test(s)) return "";
  return s;
}

/**
 * @param rows bsb_tables rows for one verse, already in BSB (English) reading
 *   order, each { english, greekIndex }.
 * @param canonicalText the exact bsb.txt string for this verse.
 * @returns { segments: [text, greekIndex|null][], matchedWords, totalWords }
 *   Concatenating segments' text always reconstructs canonicalText exactly.
 */
export function alignRowsToText(rows, canonicalText) {
  const canonTokens = tokenize(canonicalText);
  const segments = [];
  let prevPos = 0;
  let tokenCursor = 0;
  let matchedWords = 0;
  let totalWords = 0;

  for (const row of rows) {
    const cleaned = cleanRowEnglish(row.english);
    if (!cleaned) continue;
    const rowWords = tokenize(cleaned).map((t) => t.word);
    if (!rowWords.length) continue;
    totalWords++;

    let foundAt = -1;
    for (let i = tokenCursor; i + rowWords.length <= canonTokens.length; i++) {
      let ok = true;
      for (let j = 0; j < rowWords.length; j++) {
        if (canonTokens[i + j].word !== rowWords[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        foundAt = i;
        break;
      }
    }
    if (foundAt === -1) continue; // not found ahead; leave this row unlinked

    matchedWords += rowWords.length;
    const matchStart = canonTokens[foundAt].start;
    const matchEnd = canonTokens[foundAt + rowWords.length - 1].end;
    if (matchStart > prevPos) segments.push([canonicalText.slice(prevPos, matchStart), null]);
    segments.push([canonicalText.slice(matchStart, matchEnd), row.greekIndex ?? null]);
    prevPos = matchEnd;
    tokenCursor = foundAt + rowWords.length;
  }

  if (prevPos < canonicalText.length) segments.push([canonicalText.slice(prevPos), null]);
  if (!segments.length) segments.push([canonicalText, null]);

  return { segments, matchedWords, totalWords: canonTokens.length };
}
