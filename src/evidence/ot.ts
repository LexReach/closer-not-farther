// Hebrew Bible evidence (placeholder until the OT witness data is merged).
import { h } from '../lib/dom';
import { refLabel, type Book, type Pos } from '../reader/bible';

export async function shadeOt(_b: Book, _c: number, verses: number): Promise<(string | null)[]> {
  return Array.from({ length: verses }, () => null);
}

export async function openOt(_b: Book, pos: Pos, close: () => void): Promise<HTMLElement> {
  const x = h('button', { type: 'button', class: 'ev-close', 'aria-label': 'Close the evidence panel' }, '×');
  x.addEventListener('click', close);
  return h(
    'aside',
    { class: 'ev', 'aria-labelledby': 'ev-title' },
    x,
    h('header', { class: 'ev-head' }, h('p', { class: 'ev-ref' }, refLabel(pos)), h('h2', { class: 'ev-title', id: 'ev-title' }, 'Hebrew Bible witnesses'), h('p', { class: 'ev-cov' }, 'The manuscript index for the Hebrew Bible is not in place yet.')),
  );
}
