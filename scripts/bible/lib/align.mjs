// Greedy, windowed alignment between two ordered token lists that represent
// "the same verse" from two different sources whose word lists mostly, but
// not always, agree 1:1 (small textual variants, punctuation differences).
//
// For each item in `a` we look ahead (and slightly behind, to recover from an
// earlier skipped/inserted `b` item) within `WINDOW` positions of the current
// cursor in `b` for a spelling match, using `fold(item)` for comparison.
// Unmatched `a` items get `null`.
const WINDOW = 4;

export function alignGreedy(a, b, matches) {
  const result = new Array(a.length).fill(null);
  let bi = 0;
  for (let ai = 0; ai < a.length; ai++) {
    let found = -1;
    for (let w = 0; w <= WINDOW && bi + w < b.length; w++) {
      if (matches(a[ai], b[bi + w])) {
        found = bi + w;
        break;
      }
    }
    if (found === -1) {
      // Maybe `b`'s cursor overshot due to an earlier extra item in `a`;
      // look a little behind too.
      for (let w = 1; w <= 2 && bi - w >= 0; w++) {
        if (matches(a[ai], b[bi - w])) {
          found = bi - w;
          break;
        }
      }
    }
    if (found !== -1) {
      result[ai] = b[found];
      bi = found + 1;
    }
  }
  return result;
}
