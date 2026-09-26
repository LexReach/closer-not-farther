// Shared text-normalization helpers.

const COMBINING_MARKS = /[̀-ͯ]/g;

// Strip accents/breathing/iota-subscript diacritics and punctuation, lowercase,
// so two spellings of "the same" Greek word can be compared even when one
// source's accentuation (e.g. movable nu, enclitic accent) differs slightly.
export function foldGreek(s) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[.,;···!?"'()\[\]{}’‘“”]/g, "")
    .replace(/ς/g, "σ") // final sigma -> sigma
    .toLowerCase()
    .trim();
}

export function stripFinalPunct(s) {
  return s.replace(/[.,;···!?"'’‘“”]+$/g, "");
}
