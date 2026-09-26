// The meaning card: one original-language word with its lemma, gloss,
// parsing in plain English, Strong's number and how often the lemma occurs.
import { h, clear } from '../lib/dom';
import { loadLex, type Word } from './bible';
import { parseMorph, translitGreek } from './morph';

let card: HTMLElement | null = null;
let onClose: (() => void) | null = null;

export function closeMeaning() {
  card?.remove();
  card = null;
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('pointerdown', onOutside, true);
  onClose?.();
  onClose = null;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeMeaning();
  }
}
function onOutside(e: PointerEvent) {
  if (card && !card.contains(e.target as Node) && !(e.target as Element).closest?.('[data-wi], [data-gi]')) closeMeaning();
}

export interface MeaningOpts {
  word: Word;
  lang: 'grc' | 'hbo';
  anchor: Element;
  /** e.g. "John 1:1, word 5" */
  where: string;
  onSearchLemma?: (strong: string, lemma: string) => void;
  onClose?: () => void;
}

const testamentName = (lang: 'grc' | 'hbo') => (lang === 'grc' ? 'New Testament' : 'Hebrew Bible');
const stripCant = (s: string) => s.replace(/[֑-ֽ֯׀׃]/g, '');

export async function openMeaning(o: MeaningOpts) {
  closeMeaning();
  onClose = o.onClose ?? null;
  const [surface, strong, morph, gloss] = o.word;
  const body = h('div', { class: 'mc__body' }, h('p', { class: 'mc__loading' }, 'Looking up…'));
  const close = h('button', { type: 'button', class: 'mc__close', 'aria-label': 'Close' }, '×');
  close.addEventListener('click', closeMeaning);
  card = h(
    'div',
    { class: 'mc', role: 'dialog', 'aria-label': `Meaning of ${surface}` },
    h('div', { class: 'mc__head' }, h('span', { class: `mc__word ${o.lang === 'hbo' ? 'hebrew' : 'greek'}`, lang: o.lang, dir: o.lang === 'hbo' ? 'rtl' : 'ltr' }, o.lang === 'hbo' ? stripCant(surface) : surface.replace(/[,.;·:]+$/, '')), close),
    body,
  );
  document.body.appendChild(card);
  // Desktop: float near the word. Phone: bottom sheet (CSS).
  if (window.matchMedia('(min-width: 721px)').matches) {
    const r = o.anchor.getBoundingClientRect();
    const w = 340;
    const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 10 + 320 < window.innerHeight;
    card.style.left = `${left}px`;
    card.style.top = below ? `${r.bottom + 10}px` : '';
    card.style.bottom = below ? '' : `${window.innerHeight - r.top + 10}px`;
  }
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onOutside, true);

  const lex = await loadLex(o.lang);
  if (!card) return;
  const e = lex[strong] ?? {};
  const translit = e.translit || (o.lang === 'grc' ? translitGreek(e.lemma || surface) : '');
  clear(body);
  const row = (k: string, v: string | Node | null | undefined) => (v ? h('div', { class: 'mc__row' }, h('dt', null, k), h('dd', null, v)) : '');
  const count = e.count ?? 0;
  const find = h('button', { type: 'button', class: 'mc__find' }, `Find all ${count.toLocaleString('en-US')}`);
  find.addEventListener('click', () => {
    closeMeaning();
    o.onSearchLemma?.(strong, e.lemma ?? surface);
  });
  body.append(
    h('p', { class: 'mc__gloss' }, gloss || e.gloss || (strong ? '—' : 'No analysis is recorded for this word in the tagged text.')),
    h(
      'dl',
      { class: 'mc__dl' },
      row('Lemma', e.lemma ? h('span', { class: o.lang === 'hbo' ? 'hebrew' : 'greek', lang: o.lang }, e.lemma) : null),
      row('Transliteration', translit),
      row('Dictionary gloss', e.gloss && e.gloss !== gloss ? e.gloss : null),
      row('Parsing', parseMorph(morph, o.lang) || morph || null),
      row('Strong’s', strong || null),
    ),
    strong && count
      ? h('p', { class: 'mc__count' }, `This lemma appears ${count.toLocaleString('en-US')} time${count === 1 ? '' : 's'} in the ${testamentName(o.lang)}. `, o.onSearchLemma ? find : '')
      : '',
    h('p', { class: 'mc__src' }, `${o.where} · ${o.lang === 'grc' ? 'SBLGNT with MorphGNT / STEPBible TAGNT data' : 'WLC (Open Scriptures morphhb) with STEPBible TAHOT data'}`),
  );
}
