// Normalize a Strong's number cell (however it's spelled) down to its base
// "G####" form (>=4 digits, zero-padded, no letter suffix), for matching
// across sources that disambiguate homonyms differently (or not at all).
export function baseStrong(raw) {
  if (!raw) return null;
  const m = /(\d{1,5})/.exec(String(raw));
  if (!m) return null;
  return "G" + m[1].padStart(4, "0");
}
