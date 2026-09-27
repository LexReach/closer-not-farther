// Hebrew Bible evidence: the 31 witnesses compiled on the data-ot branch
// (Masoretic codices, Dead Sea Scrolls, the Samaritan Pentateuch and the
// Septuagint codices), matched to a verse by the ranges in their `contents`.
// The Witness view renders the verse typographically from the Leningrad text
// (WLC) and links out for the photographs, which cannot be embedded.
import { h, clear } from '../lib/dom';
import { ADAPTERS, BOOKS, hebrewSurface, loadOriginal, refLabel, type Book, type Pos, type Word } from '../reader/bible';
import type { Segment } from '../reader/adapters';
import { openMeaning } from '../reader/meaning';
import { EVD } from './data';

export interface OtWitness {
  id: string;
  name: string;
  siglum: string;
  date: string;
  year: number;
  lang: 'hbo' | 'grc';
  institution?: string;
  contents: string[];
  links: Record<string, string | null>;
  embed?: boolean;
  terms?: string | null;
  note?: string;
}

const ORDER = new Map(BOOKS.map((b, i) => [b.id, i]));
/** A verse as one sortable number, so ranges can cross books ("EXO.1.1-PSA.105.45"). */
const ord = (book: string, c: number, v: number) => (ORDER.get(book) ?? 0) * 1e6 + c * 1e3 + v;
function parseRef(s: string): number {
  const [b, c, v] = s.split('.');
  return ord(b, +c, +v);
}

let dataP: Promise<{ w: OtWitness; spans: [number, number][] }[]> | null = null;
export function loadOt() {
  return (dataP ??= fetch(`${EVD}ot/witnesses.json`)
    .then((r) => (r.ok ? r.json() : { witnesses: [] }))
    .then((j: { witnesses: OtWitness[] }) =>
      j.witnesses.map((w) => ({
        w,
        spans: w.contents.map((r) => r.split('-').map(parseRef) as [number, number]),
      })),
    )
    .catch(() => []));
}

export async function otWitnessesFor(book: string, c: number, v: number): Promise<OtWitness[]> {
  const k = ord(book, c, v);
  return (await loadOt())
    .filter((x) => x.spans.some(([a, b]) => k >= a && k <= b))
    .map((x) => x.w)
    .sort((a, b) => a.year - b.year);
}

export type OtKind = 'masoretic' | 'scroll' | 'samaritan' | 'lxx';
export const otKind = (w: OtWitness): OtKind => (w.lang === 'grc' ? 'lxx' : w.id.startsWith('samaritan') ? 'samaritan' : /^\d+Q|^Mur/.test(w.id) ? 'scroll' : 'masoretic');
const KIND_LABEL: Record<OtKind, string> = {
  masoretic: 'Masoretic codex',
  scroll: 'Dead Sea Scroll',
  samaritan: 'Samaritan tradition',
  lxx: 'Septuagint (Greek)',
};
export const yearLabel = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);
/** "c. 330-360 AD" as written, without the long qualifications some entries carry. */
const shortDate = (w: OtWitness) => w.date.split(/[;(]/)[0].trim();
const n = (x: number) => x.toLocaleString('en-US');

function shadeFor(year: number | null): string | null {
  if (year == null) return null;
  if (year <= 400) return 'var(--ev-early)';
  if (year <= 900) return 'var(--ev-mid)';
  return 'var(--ev-late)';
}

export async function shadeOt(b: Book, c: number, verses: number): Promise<(string | null)[]> {
  const all = await loadOt();
  return Array.from({ length: verses }, (_, i) => {
    const k = ord(b.id, c, i + 1);
    let oldest: number | null = null;
    for (const x of all) if (x.spans.some(([a, z]) => k >= a && k <= z)) oldest = oldest == null ? x.w.year : Math.min(oldest, x.w.year);
    return shadeFor(oldest);
  });
}

export async function openOt(b: Book, pos: Pos, close: () => void): Promise<HTMLElement> {
  const v = pos.verse!;
  const list = await otWitnessesFor(b.id, pos.chapter, v);
  const x = h('button', { type: 'button', class: 'ev-close', 'aria-label': 'Close the evidence panel' }, '×');
  x.addEventListener('click', close);
  const oldest = list[0];
  const scrolls = list.filter((w) => otKind(w) === 'scroll').length;
  const cards = list.map((w) => {
    const kind = otKind(w);
    const btn = h(
      'button',
      { type: 'button', class: 'ev-card__btn', 'aria-label': `${w.name}, ${shortDate(w)}, ${KIND_LABEL[kind]}` },
      h('div', { class: `ev-card__art ${kind === 'scroll' ? 'is-papyrus' : 'is-vellum'}` }, h('span', { class: 'ev-card__ga-big' }, w.siglum.split(/[ (/]/)[0])),
      h(
        'span',
        { class: 'ev-card__meta' },
        h('strong', { class: 'ev-card__ga' }, w.name),
        h('span', { class: 'ev-card__date' }, shortDate(w)),
        h('span', { class: 'ev-card__tags' }, KIND_LABEL[kind], kind === 'scroll' && !/ISA\.1\.1-ISA\.66\.24/.test(w.contents.join()) ? ' · fragments' : ''),
      ),
    );
    btn.addEventListener('click', () => openOtWitness(w, b, { ...pos, verse: v }));
    return h('li', { class: `ev-card${kind === 'scroll' && w.id !== '1QIsaa' ? ' is-catalogue' : ''}`, 'data-ot': w.id }, btn);
  });
  return h(
    'aside',
    { class: 'ev', 'aria-labelledby': 'ev-title', tabindex: '-1' },
    h('div', { class: 'ev-grab', 'aria-hidden': 'true' }),
    x,
    h(
      'header',
      { class: 'ev-head' },
      h('p', { class: 'ev-ref' }, refLabel({ ...pos, verse: v })),
      h('h2', { class: 'ev-title', id: 'ev-title' }, `Carried by ${n(list.length)} of the ${list.length ? 'listed ' : ''}witnesses`),
      oldest ? h('p', { class: 'ev-oldest' }, 'Oldest: ', h('strong', null, oldest.name), ` (${shortDate(oldest)})`) : '',
      h(
        'p',
        { class: 'ev-cov' },
        'From a compiled list of 31 key witnesses: the Leningrad and Aleppo codices, the Samaritan Pentateuch, Dead Sea Scrolls and the Septuagint codices, each matched by the verse range it contains. ',
        scrolls ? 'A scroll’s range runs from its first to its last surviving verse, so a fragmentary scroll (dashed) may have lost this verse. ' : '',
        'Thousands of later Hebrew manuscripts are not listed.',
      ),
    ),
    h('ol', { class: 'ev-strip', 'aria-label': 'Witnesses' }, cards),
    h('p', { class: 'ev-notice' }, 'Hebrew text: Westminster Leningrad Codex (OSHB morphhb, CC BY 4.0); word meanings: STEPBible TAHOT (CC BY 4.0). Witness list compiled from published inventories; see data/bible/SOURCES-OT.md.'),
  );
}

let dlg: HTMLDialogElement | null = null;

/** The verse and its neighbours as a page: the verse lit, consonants only for a scroll-age witness. */
function otPage(ch: Word[][], v: number, o: { consonants: boolean; onWord: (w: Word, el: HTMLElement) => void }): HTMLElement {
  const show = (s: string) => {
    const t = hebrewSurface(s, !o.consonants);
    // A scroll has neither vowel signs nor verse dividers.
    return o.consonants ? t.replace(/[ְ-ׇ]/g, (c) => (c === '־' ? ' ' : '')) : t;
  };
  const lines = [v - 1, v, v + 1]
    .filter((i) => i >= 1 && ch[i - 1]?.length)
    .map((i) =>
      h(
        'div',
        { class: 'tx__line' },
        h('span', { class: 'tx__n', 'aria-hidden': 'true' }, String(i)),
        h(
          'span',
          { class: 'tx__text' },
          ch[i - 1].map((w) => {
            const el = h('span', { class: `tx__w${i === v ? ' is-spot' : ''}` }, show(w[0]));
            if (i === v) el.addEventListener('click', () => o.onWord(w, el));
            return [el, ' '];
          }),
        ),
      ),
    );
  return h('div', { class: `tx tx--${o.consonants ? 'papyrus' : 'vellum'} tx--hebrew`, lang: 'hbo', dir: 'rtl' }, h('div', { class: 'tx__col' }, lines));
}

const LINK_LABEL: Record<string, string> = {
  images: 'Photographs',
  images_archive_org: 'Colour images on archive.org',
  info: 'About this manuscript',
};

export async function openOtWitness(w: OtWitness, b: Book, pos: Pos) {
  dlg?.close();
  const v = pos.verse!;
  const kind = otKind(w);
  const [words, bsb] = await Promise.all([loadOriginal(b), ADAPTERS.bsb.getChapter(b.id, pos.chapter).catch(() => null)]);
  const ch = words?.[pos.chapter - 1] ?? [];
  const verse = ch[v - 1] ?? [];
  const eng = (bsb?.verses[v - 1] ?? null) as Segment[] | string | null;
  const closeBtn = h('button', { type: 'button', class: 'ev-close', 'aria-label': 'Close the witness view' }, '×');
  const onWord = (word: Word, anchor: Element) => openMeaning({ word, lang: 'hbo', anchor, where: `${refLabel(pos)}` });

  const links = Object.entries(w.links).filter(([, u]) => u) as [string, string][];
  const imgBox = h(
    'div',
    { class: 'wv__img is-empty' },
    h('p', { class: 'wv__noimg' }, links.some(([k]) => k.startsWith('images')) ? 'The photographs cannot be shown inside this page: the holder’s terms do not allow embedding, or were not confirmed. Open them at the source:' : 'No public photographs of this manuscript are linked yet.'),
    h(
      'ul',
      { class: 'wv__outlinks' },
      links.map(([k, u]) => h('li', null, h('a', { href: u, target: '_blank', rel: 'noopener' }, LINK_LABEL[k] ?? k, ' ↗'), h('span', { class: 'muted' }, ` ${new URL(u).hostname.replace(/^www\./, '')}`))),
    ),
    w.note ? h('p', { class: 'wv__cap' }, w.note) : '',
  );

  const label =
    kind === 'masoretic'
      ? w.id === 'leningrad-codex'
        ? 'The Leningrad Codex, as transcribed in the Westminster Leningrad Codex'
        : 'The Leningrad text (WLC). The Aleppo Codex belongs to the same Masoretic tradition; this is not a transcription of it'
      : kind === 'lxx'
        ? 'The Greek of this codex is not transcribed here. For comparison, the Hebrew of the Leningrad Codex'
        : 'The Leningrad wording without vowel signs, as a scroll of this age was written. This is not a transcription of the scroll, whose own wording can differ';
  const rows = h(
    'div',
    { class: 'wv__rows' },
    h(
      'div',
      { class: 'wv__row wv__row--ed' },
      h('span', { class: 'wv__rowlabel' }, 'Hebrew (WLC)'),
      h(
        'p',
        { class: 'wv__rowtext hebrew', lang: 'hbo', dir: 'rtl' },
        verse.map((word) => {
          const btn = h('button', { type: 'button', class: 'wv__w hebrew', title: word[3] }, hebrewSurface(word[0], false));
          btn.addEventListener('click', () => onWord(word, btn));
          return btn;
        }),
      ),
    ),
    h('div', { class: 'wv__row wv__row--en' }, h('span', { class: 'wv__rowlabel' }, 'BSB'), h('p', { class: 'wv__rowtext', lang: 'en' }, Array.isArray(eng) ? eng.map((s) => s[0]).join('') : (eng ?? ''))),
    h('p', { class: 'ev-note' }, 'Tap a Hebrew word for its meaning.'),
  );

  const d = h(
    'dialog',
    { class: 'wv', 'aria-labelledby': 'wv-h' },
    h(
      'header',
      { class: 'wv__head' },
      h('p', { class: 'ev-ref' }, refLabel(pos)),
      h('h2', { id: 'wv-h' }, w.name, h('span', { class: 'wv__name' }, ` · ${w.siglum}`)),
      h('p', { class: 'wv__meta' }, [shortDate(w), KIND_LABEL[kind], w.institution].filter(Boolean).join(' · ')),
      closeBtn,
    ),
    h(
      'div',
      { class: 'wv__body' },
      imgBox,
      h('div', { class: 'wv__text' }, rows, h('div', { class: 'wv__page' }, h('p', { class: 'wv__label' }, label), verse.length ? otPage(ch, v, { consonants: kind === 'scroll' || kind === 'samaritan', onWord }) : h('p', { class: 'muted' }, 'This verse is not in the Hebrew data.'))),
    ),
  ) as HTMLDialogElement;
  dlg = d;
  closeBtn.addEventListener('click', () => d.close());
  d.addEventListener('close', () => {
    clear(d);
    d.remove();
    if (dlg === d) dlg = null;
  });
  document.body.appendChild(d);
  d.showModal();
}
