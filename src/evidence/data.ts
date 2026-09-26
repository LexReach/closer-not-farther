// Evidence data, derived from the fetched sources by scripts/evidence/derive.mjs
// (see data/evidence/README.md). All files are fetched per book or chapter and
// cached by the service worker.
//   summary/<BOOK>.json      chapters → verses → [count, oldestGA, oldestYear, pageLevel]
//   wit/<BOOK>/<c>.json      [ga, pageId|null, fromVerse, toVerse, level 'p'|'c'][]
//   tx/<BOOK>.json           { "c:v": { GA: pageId } } pages with a transcription
//   transcriptions/<GA>/<pageId>.json
//   apparatus/<BOOK>.json    { "c:v": [{ lemma, readings: [{ text, eds }] }] }
//   witness-tiers.json       NA28 consistently cited witnesses per corpus

export const EVD = `${import.meta.env.BASE_URL}evidence/`;

export type Summary = [number, string | null, number | null, number];
export type WitRow = [string, string | null, number, number, 'p' | 'c'];

export interface Token {
  t: string;
  v?: string;
  ns?: string;
  lac?: boolean;
  corr?: { hand: string; t: string };
}
export interface TxPage {
  ga: string;
  pageId: string;
  folio?: string;
  columns: { lines: { n: number; tokens: Token[] }[] }[];
}
export interface Reading {
  text: string;
  eds: string[];
}
export interface AppEntry {
  lemma: string;
  readings: Reading[];
}
export interface Tiers {
  source?: string;
  corpora: Record<string, string[]>;
}

const cache = new Map<string, Promise<unknown>>();
function get<T>(path: string, fallback: T): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(EVD + path)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : fallback))
      .catch(() => fallback);
    cache.set(path, p);
  }
  return p;
}

export const loadSummary = (book: string) => get<{ chapters: Summary[][] } | null>(`summary/${book}.json`, null);
export const loadWitnesses = (book: string, c: number) => get<{ rows: WitRow[] } | null>(`wit/${book}/${c}.json`, null);
export const loadTxIndex = (book: string) => get<Record<string, Record<string, string>>>(`tx/${book}.json`, {});
export const loadTx = (ga: string, pageId: string) => get<TxPage | null>(`transcriptions/${ga}/${pageId}.json`, null);
export const loadApparatus = (book: string) => get<Record<string, AppEntry[]>>(`apparatus/${book}.json`, {});
export const loadTiers = () => get<Tiers | null>('witness-tiers.json', null);
export const loadTimeline = () => get<Timeline | null>('timeline.json', null);

/** For the coverage map: per book, per chapter, per verse, the year of each witness (sorted). */
export interface Timeline {
  years: number[];
  books: Record<string, number[][][]>;
}

/** Corpus letter used by NA28's witness lists and the catalogue's contents field. */
export function corpusOf(book: string): 'e' | 'a' | 'p' | 'c' | 'r' {
  if (['MAT', 'MRK', 'LUK', 'JHN'].includes(book)) return 'e';
  if (book === 'ACT') return 'a';
  if (book === 'REV') return 'r';
  if (['JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD'].includes(book)) return 'c';
  return 'p';
}

/** Witnesses for one verse, from the chapter's rows. */
export function witnessesFor(rows: WitRow[], v: number): WitRow[] {
  const seen = new Map<string, WitRow>();
  for (const r of rows) {
    if (v < r[2] || v > r[3]) continue;
    const prev = seen.get(r[0]);
    // Prefer a page-level hit over a catalogue-level one.
    if (!prev || (prev[4] === 'c' && r[4] === 'p')) seen.set(r[0], r);
  }
  return [...seen.values()];
}
