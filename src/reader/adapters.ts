// Translation adapters. Pure TypeScript (no DOM, no JSON imports) so they can
// be tested in Node with a mocked fetch. Local versions read the committed
// per-book JSON; ESV is fetched live through a proxy that holds the API key.

export type Segment = [string, number | null];
export type VerseValue = string | Segment[] | null;

export interface ChapterText {
  /** verses[v-1] is verse v; null when the version lacks it. */
  verses: VerseValue[];
}

export interface Adapter {
  id: string;
  label: string;
  /** Short label for column headers. */
  short: string;
  /** False when the version cannot be used yet (e.g. ESV without a proxy). */
  available(): boolean;
  getChapter(book: string, chapter: number): Promise<ChapterText>;
  /** Attribution to show wherever this version's text appears, if required. */
  notice?: { text: string; href: string };
}

type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Versions stored as data/bible/text/<ver>/<BOOK>.json (whole book per file). */
export class LocalAdapter implements Adapter {
  private books = new Map<string, Promise<{ chapters: VerseValue[][] }>>();
  id: string;
  label: string;
  short: string;
  private baseUrl: string;
  private fetchImpl: Fetch;
  constructor(id: string, label: string, short: string, baseUrl: string, fetchImpl: Fetch) {
    this.id = id;
    this.label = label;
    this.short = short;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
  }
  available() {
    return true;
  }
  loadBook(book: string) {
    let p = this.books.get(book);
    if (!p) {
      p = this.fetchImpl(`${this.baseUrl}text/${this.id}/${book}.json`).then((r) => {
        if (!r.ok) throw new Error(`${this.id} ${book}: HTTP ${r.status}`);
        return r.json() as Promise<{ chapters: VerseValue[][] }>;
      });
      p.catch(() => this.books.delete(book));
      this.books.set(book, p);
    }
    return p;
  }
  async getChapter(book: string, chapter: number): Promise<ChapterText> {
    const b = await this.loadBook(book);
    return { verses: b.chapters[chapter - 1] ?? [] };
  }
}

export const ESV_NOTICE = {
  text: 'Scripture quotations marked ESV are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
  href: 'https://www.esv.org',
};

/**
 * ESV through a proxy (see proxy/esv-worker.js). Fetches one chapter at a time
 * from `${proxyUrl}/v3/passage/text/`, keeps at most `maxVerses` verses in memory
 * (least recently used chapters are dropped first), and never stores text on disk.
 */
export class EsvAdapter implements Adapter {
  id = 'esv';
  short = 'ESV';
  notice = ESV_NOTICE;
  private cache = new Map<string, string[]>(); // key BOOK.c -> verses; Map keeps insertion order for LRU
  private cachedVerses = 0;
  private proxyUrl: string;
  private bookName: (book: string) => string;
  private fetchImpl: Fetch;
  private maxVerses: number;
  constructor(proxyUrl: string, bookName: (book: string) => string, fetchImpl: Fetch, maxVerses = 500) {
    this.proxyUrl = proxyUrl;
    this.bookName = bookName;
    this.fetchImpl = fetchImpl;
    this.maxVerses = maxVerses;
  }
  get label() {
    return this.available() ? 'ESV' : 'ESV (connect)';
  }
  available() {
    return !!this.proxyUrl;
  }
  /** Parse ESV text output with inline "[n]" verse numbers into a verse array. */
  static parse(text: string): string[] {
    const out: string[] = [];
    const re = /\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const v = Number(m[1]);
      out[v - 1] = m[2].replace(/\s+/g, ' ').replace(/\s*\(ESV\)\s*$/, '').trim();
    }
    for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
    return out;
  }
  get size() {
    return this.cachedVerses;
  }
  async getChapter(book: string, chapter: number): Promise<ChapterText> {
    if (!this.available()) throw new Error('ESV is not connected: set esvProxyUrl in data/config.json.');
    const key = `${book}.${chapter}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return { verses: hit };
    }
    const q = encodeURIComponent(`${this.bookName(book)} ${chapter}`);
    const params =
      'include-passage-references=false&include-verse-numbers=true&include-first-verse-numbers=true&include-footnotes=false&include-footnote-body=false&include-headings=false&include-short-copyright=false&include-copyright=false&include-selahs=true&indent-paragraphs=0&indent-poetry=false';
    const r = await this.fetchImpl(`${this.proxyUrl.replace(/\/$/, '')}/v3/passage/text/?q=${q}&${params}`);
    if (!r.ok) throw new Error(`ESV proxy: HTTP ${r.status}`);
    const data = (await r.json()) as { passages?: string[] };
    const verses = EsvAdapter.parse((data.passages ?? []).join(' '));
    this.cache.set(key, verses);
    this.cachedVerses += verses.length;
    while (this.cachedVerses > this.maxVerses && this.cache.size > 1) {
      const [oldKey, old] = this.cache.entries().next().value as [string, string[]];
      this.cache.delete(oldKey);
      this.cachedVerses -= old.length;
    }
    return { verses };
  }
}

/** Plain text of a verse value (segments joined). */
export const verseText = (v: VerseValue): string => (v == null ? '' : typeof v === 'string' ? v : v.map((s) => s[0]).join(''));
