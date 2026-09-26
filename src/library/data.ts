// Library data: the catalogue of Greek NT manuscripts (data/library/catalog.json,
// compact rows), image sources (images.json) and the featured shelf
// (featured.json). Loaded lazily so the rest of the site never pays for them.

export type Cat = 'P' | 'M' | 'm' | 'L';

export interface Ms {
  ga: string;
  cat: Cat;
  name: string | null;
  c0: number | null;
  c1: number | null;
  contents: string | null; // letters e a p c r
  inst: string | null;
  city: string | null;
  country: string | null;
  shelf: string | null;
  qid: string | null;
  commons: string | null;
  iiif: string | null;
  /** Index for stable ordering. */
  i: number;
}

export interface ImageSource {
  kind: 'iiif' | 'commons';
  service?: string;
  manifest?: string;
  w?: number;
  h?: number;
  label?: string;
  rights?: string;
  institution?: string;
  link?: string;
  file?: string;
  license?: string;
  credit?: string;
}

export interface Featured {
  ga: string;
  name: string;
  date: string;
  holding: string;
  contents: string;
  story: string;
  links?: { institution?: string };
}

export interface LibraryData {
  rows: Ms[];
  byGa: Map<string, Ms>;
  images: Record<string, ImageSource>;
  featured: Featured[];
  counts: Record<string, number>;
  sources: string[];
  imageSources: string[];
  generated: string;
  imageCounts: { iiif: number; commons: number; total: number; byInstitution?: Record<string, number> };
}

export const CAT_LABEL: Record<Cat, string> = { P: 'Papyri', M: 'Majuscules', m: 'Minuscules', L: 'Lectionaries' };
export const CAT_ONE: Record<Cat, string> = { P: 'Papyrus', M: 'Majuscule', m: 'Minuscule', L: 'Lectionary' };
export const CAT_VAR: Record<Cat, string> = { P: 'var(--lib-p)', M: 'var(--lib-M)', m: 'var(--lib-m)', L: 'var(--lib-L)' };
export const CONTENTS: { key: string; label: string }[] = [
  { key: 'e', label: 'Gospels' },
  { key: 'a', label: 'Acts' },
  { key: 'p', label: 'Paul' },
  { key: 'c', label: 'Catholic letters' },
  { key: 'r', label: 'Revelation' },
];

let cache: Promise<LibraryData> | null = null;

export function loadLibrary(): Promise<LibraryData> {
  cache ??= (async () => {
    const [cat, img, feat] = await Promise.all([
      import('../../data/library/catalog.json'),
      import('../../data/library/images.json'),
      import('../../data/library/featured.json'),
    ]);
    const c = cat.default as unknown as { fields: string[]; rows: unknown[][]; counts: Record<string, number>; sources: string[]; generated: string };
    const idx = (f: string) => c.fields.indexOf(f);
    const F = ['ga', 'cat', 'name', 'c0', 'c1', 'contents', 'inst', 'city', 'country', 'shelf', 'qid', 'commons', 'iiif'].map((f) => [f, idx(f)] as const);
    const rows: Ms[] = c.rows.map((r, i) => {
      const o: Record<string, unknown> = { i };
      for (const [f, j] of F) o[f] = j >= 0 ? (r[j] ?? null) : null;
      return o as unknown as Ms;
    });
    const byGa = new Map(rows.map((r) => [r.ga, r]));
    const im = img.default as unknown as { items: Record<string, ImageSource>; counts: LibraryData['imageCounts']; sources: string[] };
    const fe = feat.default as unknown as { manuscripts: Featured[] };
    return {
      rows,
      byGa,
      images: im.items,
      featured: fe.manuscripts,
      counts: c.counts,
      sources: c.sources,
      imageSources: im.sources ?? [],
      generated: c.generated,
      imageCounts: im.counts,
    };
  })();
  return cache;
}

/* ---------- Helpers ---------- */

const ORD = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
export const centuryLabel = (m: Ms): string =>
  m.c0 == null ? 'Date unknown' : m.c1 != null && m.c1 !== m.c0 ? `${ORD(m.c0)}–${ORD(m.c1)} c.` : `${ORD(m.c0)} c.`;

/** Display form of a GA number: 𝔓-style papyri stay "P66"; lectionaries "ℓ 1". */
export const gaLabel = (ga: string) => (ga.startsWith('l') ? `ℓ ${ga.slice(1)}` : ga);

export function intfUrl(ga: string): string {
  const n = parseInt(ga.replace(/\D/g, ''), 10);
  const doc = ga.startsWith('P') ? 10000 + n : ga.startsWith('l') ? 40000 + n : ga.startsWith('0') ? 20000 + n : 30000 + n;
  return `https://ntvmr.uni-muenster.de/manuscript-workspace?docID=${doc}`;
}

export function csntmUrl(ga: string): string {
  const id = ga.startsWith('l') ? `Lect_${ga.slice(1)}` : ga;
  return `https://manuscripts.csntm.org/manuscript/View/GA_${id}`;
}

export const commonsFileUrl = (file: string, width?: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/^File:/, ''))}${width ? `?width=${width}` : ''}`;

export function thumbUrl(src: ImageSource | undefined, width = 400): string | null {
  if (!src) return null;
  if (src.kind === 'iiif' && src.service) return `${src.service.replace(/\/$/, '')}/full/${width},/0/default.jpg`;
  if (src.kind === 'commons' && src.file) return commonsFileUrl(src.file, width);
  return null;
}

export function contentsLabel(c: string | null): string {
  if (!c) return 'Contents not recorded';
  return CONTENTS.filter((x) => c.includes(x.key))
    .map((x) => x.label)
    .join(', ');
}

/** Where a manuscript also appears elsewhere in the app. */
export const CROSS_LINKS: Record<string, { path: string; label: string }[]> = {};
export function registerCrossLinks(entries: { ga: string; path: string; label: string }[]) {
  for (const e of entries) (CROSS_LINKS[e.ga] ??= []).push({ path: e.path, label: e.label });
}
