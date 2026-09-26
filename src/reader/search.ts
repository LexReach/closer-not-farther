// Search across the current English version (all words must match), or by
// Strong's number ("G3056", "H430") across the Greek or Hebrew text.
import { h, clear } from '../lib/dom';
import { ADAPTERS, BOOKS, bookById, loadOriginal, refLabel, type Book, type Pos } from './bible';
import { LocalAdapter, verseText } from './adapters';

interface Hit {
  pos: Pos;
  text: string;
  before: string;
  after: string;
}

let dialog: HTMLDialogElement | null = null;

export function openSearch(opts: { version: string; query?: string; onGo: (p: Pos) => void }) {
  dialog?.remove();
  const ver = ADAPTERS[opts.version] instanceof LocalAdapter ? opts.version : 'bsb';
  const adapter = ADAPTERS[ver] as LocalAdapter;
  const input = h('input', { type: 'search', class: 'sr__input', placeholder: 'Words, or a Strong’s number like G3056', value: opts.query ?? '', 'aria-label': 'Search' });
  const scope = h(
    'select',
    { class: 'sr__scope', 'aria-label': 'Books to search' },
    h('option', { value: 'all' }, 'Whole Bible'),
    h('option', { value: 'OT' }, 'Old Testament'),
    h('option', { value: 'NT' }, 'New Testament'),
    h('optgroup', { label: 'One book' }, BOOKS.map((b) => h('option', { value: b.id }, b.name))),
  );
  const status = h('p', { class: 'sr__status', 'aria-live': 'polite' });
  const list = h('ol', { class: 'sr__list' });
  const close = h('button', { type: 'button', class: 'mc__close', 'aria-label': 'Close search' }, '×');
  dialog = h(
    'dialog',
    { class: 'sr', 'aria-label': 'Search' },
    h('div', { class: 'sr__head' }, h('h2', null, `Search the ${adapter.short}`), close),
    h('form', { class: 'sr__form', method: 'dialog' }, input, scope, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Search')),
    status,
    list,
  ) as HTMLDialogElement;
  document.body.appendChild(dialog);
  close.addEventListener('click', () => dialog?.close());
  dialog.addEventListener('close', () => {
    run++;
    dialog?.remove();
    dialog = null;
  });
  let run = 0;
  const form = dialog.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go();
  });
  dialog.showModal();
  input.focus();
  if (opts.query) go();

  async function go() {
    const my = ++run;
    const q = input.value.trim();
    clear(list);
    if (!q) return;
    const strong = q.match(/^([GH])0*(\d+)[a-z]?$/i);
    const books = BOOKS.filter((b) => (scope.value === 'all' ? true : scope.value === 'OT' || scope.value === 'NT' ? b.testament === scope.value : b.id === scope.value)).filter((b) =>
      strong ? b.testament === (strong[1].toUpperCase() === 'G' ? 'NT' : 'OT') : true,
    );
    const terms = strong ? [] : q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits: Hit[] = [];
    let total = 0;
    let done = 0;
    const MAX = 300;
    const re = terms.length ? new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi') : null;
    const scan = async (b: Book) => {
      if (strong) {
        const words = await loadOriginal(b);
        const id = `${strong[1].toUpperCase()}${Number(strong[2])}`;
        const normStrong = (x: string) => x.replace(/^([GH])0*(\d+)[a-z]?$/i, (_, l: string, n: string) => `${l.toUpperCase()}${Number(n)}`);
        const eng = await adapter.loadBook(b.id).catch(() => null);
        words?.forEach((ch, ci) =>
          ch.forEach((verse, vi) => {
            if (verse.some((w) => normStrong(w[1]) === id)) {
              total++;
              if (hits.length < MAX) hits.push({ pos: { book: b.id, chapter: ci + 1, verse: vi + 1 }, text: eng ? verseText(eng.chapters[ci]?.[vi] ?? null) : verse.map((w) => w[0]).join(' '), before: '', after: '' });
            }
          }),
        );
      } else {
        const book = await adapter.loadBook(b.id).catch(() => null);
        book?.chapters.forEach((ch, ci) =>
          ch.forEach((v, vi) => {
            const t = verseText(v);
            const low = t.toLowerCase();
            if (!terms.every((x) => low.includes(x))) return;
            total++;
            if (hits.length < MAX)
              hits.push({
                pos: { book: b.id, chapter: ci + 1, verse: vi + 1 },
                text: t,
                before: verseText(ch[vi - 1] ?? null).split(' ').slice(-8).join(' '),
                after: verseText(ch[vi + 1] ?? null).split(' ').slice(0, 8).join(' '),
              });
          }),
        );
      }
      done++;
      if (my === run) status.textContent = `Searching… ${done} of ${books.length} books`;
    };
    // Load books a few at a time; the service worker keeps them for next time.
    const queue = [...books];
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (queue.length && my === run) await scan(queue.shift()!);
    }));
    if (my !== run) return;
    hits.sort((a, b) => BOOKS.indexOf(bookById.get(a.pos.book)!) - BOOKS.indexOf(bookById.get(b.pos.book)!) || a.pos.chapter - b.pos.chapter || (a.pos.verse ?? 0) - (b.pos.verse ?? 0));
    status.textContent = total ? `${total.toLocaleString('en-US')} verse${total === 1 ? '' : 's'}${total > MAX ? `, showing the first ${MAX}` : ''}` : 'No verses match.';
    const mark = (t: string) => {
      if (!re) return [t];
      const out: (string | Node)[] = [];
      let last = 0;
      for (const m of t.matchAll(re)) {
        out.push(t.slice(last, m.index), h('mark', null, m[0]));
        last = (m.index ?? 0) + m[0].length;
      }
      out.push(t.slice(last));
      return out;
    };
    for (const hit of hits) {
      const a = h(
        'button',
        { type: 'button', class: 'sr__hit' },
        h('span', { class: 'sr__ref' }, refLabel(hit.pos)),
        h('span', { class: 'sr__text' }, hit.before ? h('span', { class: 'sr__ctx' }, `…${hit.before} `) : '', mark(hit.text), hit.after ? h('span', { class: 'sr__ctx' }, ` ${hit.after}…`) : ''),
      );
      a.addEventListener('click', () => {
        dialog?.close();
        opts.onGo(hit.pos);
      });
      list.appendChild(h('li', null, a));
    }
  }
}
