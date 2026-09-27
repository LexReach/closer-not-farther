// Reader data: the book index (bundled), versions (adapters), original-language
// words and lexicons (fetched per book from /bible/, cached by the service worker).
import booksJson from '../../data/bible/books.json';
import config from '../../data/config.json';
import { EsvAdapter, LocalAdapter, type Adapter } from './adapters';

export interface Book {
  id: string;
  name: string;
  slug: string;
  testament: 'OT' | 'NT';
  chapters: number;
  verses?: number[];
}

export const BOOKS = booksJson as Book[];
export const bookById = new Map(BOOKS.map((b) => [b.id, b]));
export const bookBySlug = new Map(BOOKS.map((b) => [b.slug, b]));
export const DATA = `${import.meta.env.BASE_URL}bible/`;

const f = (url: string) => fetch(url);

export const ADAPTERS: Record<string, Adapter> = {
  bsb: new LocalAdapter('bsb', 'Berean Standard Bible', 'BSB', DATA, f),
  web: new LocalAdapter('web', 'World English Bible', 'WEB', DATA, f),
  kjv: new LocalAdapter('kjv', 'King James Version', 'KJV', DATA, f),
  asv: new LocalAdapter('asv', 'American Standard Version', 'ASV', DATA, f),
  esv: new EsvAdapter((config as { esvProxyUrl?: string }).esvProxyUrl ?? '', (id) => bookById.get(id)?.name ?? id, f),
};

/** Column ids: English versions plus "orig" (Greek for the NT, Hebrew for the OT). */
export const VERSION_IDS = ['bsb', 'web', 'kjv', 'asv', 'esv', 'orig'] as const;
export type VersionId = (typeof VERSION_IDS)[number];

export const origLabel = (b: Book) => (b.testament === 'NT' ? 'Greek (SBLGNT)' : 'Hebrew (WLC)');
export const origShort = (b: Book) => (b.testament === 'NT' ? 'Greek' : 'Hebrew');
export const langOf = (b: Book): 'grc' | 'hbo' => (b.testament === 'NT' ? 'grc' : 'hbo');

/** [surface, strong, morph, gloss] */
export type Word = [string, string, string, string];

const origCache = new Map<string, Promise<Word[][][] | null>>();
export function loadOriginal(book: Book): Promise<Word[][][] | null> {
  let p = origCache.get(book.id);
  if (!p) {
    const dir = book.testament === 'NT' ? 'greek' : 'hebrew';
    p = fetch(`${DATA}${dir}/${book.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? (j.map ? toEnglishVersification(book, j.chapters, j.map) : (j.chapters as Word[][][])) : null))
      .catch(() => null);
    origCache.set(book.id, p);
  }
  return p;
}

/**
 * The Hebrew files keep the Hebrew verse numbers, with a map from English
 * "c:v" to Hebrew "c:v" where they differ (Psalm titles, Joel 3, Malachi 4).
 * Re-index to the English numbers the columns share. A Hebrew verse with no
 * English number (a Psalm's title) joins the verse after it.
 */
function toEnglishVersification(book: Book, heb: Word[][][], map: Record<string, string>): Word[][][] {
  const hebKey = (c: number, v: number) => map[`${c}:${v}`] ?? `${c}:${v}`;
  const slot = new Map<string, Word[]>();
  const out = (book.verses ?? heb.map((c) => c.length)).map((n, ci) =>
    Array.from({ length: n }, (_, vi) => {
      const k = hebKey(ci + 1, vi + 1);
      const [hc, hv] = k.split(':').map(Number);
      const words = [...(heb[hc - 1]?.[hv - 1] ?? [])];
      slot.set(k, words);
      return words;
    }),
  );
  let pending: Word[] = [];
  let last: Word[] | null = null;
  heb.forEach((ch, ci) =>
    ch.forEach((ws, vi) => {
      const target = slot.get(`${ci + 1}:${vi + 1}`);
      if (!target) return void pending.push(...ws);
      if (pending.length) target.unshift(...pending);
      pending = [];
      last = target;
    }),
  );
  if (pending.length) (last as Word[] | null)?.push(...pending);
  return out;
}

/** Hebrew as shown: morpheme dividers removed; cantillation (not the vowel points) optional. */
export const hebrewSurface = (s: string, cant: boolean) => {
  const t = s.replace(/\//g, '');
  return cant ? t : t.replace(/[\u0591-\u05AF\u05BD\u05C0]/g, '');
};

export interface LexEntry {
  lemma?: string;
  translit?: string;
  gloss?: string;
  count?: number;
}
const lexCache = new Map<string, Promise<Record<string, LexEntry>>>();
export function loadLex(lang: 'grc' | 'hbo'): Promise<Record<string, LexEntry>> {
  let p = lexCache.get(lang);
  if (!p) {
    p = fetch(`${DATA}lex-${lang === 'grc' ? 'greek' : 'hebrew'}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    lexCache.set(lang, p);
  }
  return p;
}

/* ---------- References ---------- */

export interface Pos {
  book: string;
  chapter: number;
  verse: number | null;
}

export function parseHash(hash: string): Pos | null {
  const m = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase().match(/^([1-3]?-?[a-z-]+?)\.(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const b = bookBySlug.get(m[1]) ?? BOOKS.find((x) => x.id.toLowerCase() === m[1]);
  if (!b) return null;
  const chapter = Math.min(b.chapters, Math.max(1, Number(m[2])));
  return { book: b.id, chapter, verse: m[3] ? Number(m[3]) : null };
}

export const posHash = (p: Pos) => `#${bookById.get(p.book)?.slug ?? p.book}.${p.chapter}${p.verse ? `.${p.verse}` : ''}`;
export const refLabel = (p: Pos) => `${bookById.get(p.book)?.name ?? p.book} ${p.chapter}${p.verse ? `:${p.verse}` : ''}`;
export const verseId = (book: string, c: number, v: number) => `${book}.${c}.${v}`;
