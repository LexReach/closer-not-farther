// The Reader: a phone-first Bible reader with one to three verse-aligned
// columns (English versions and the Greek or Hebrew text), book and chapter
// navigation, search, a meaning card for every original-language word, and a
// verse selection that opens the manuscript evidence for that verse.
import '../styles/reader.css';
import { h, clear, append } from '../lib/dom';
import { href } from '../lib/nav';
import {
  ADAPTERS,
  BOOKS,
  bookById,
  langOf,
  hebrewSurface,
  loadOriginal,
  origLabel,
  origShort,
  parseHash,
  posHash,
  type Book,
  type Pos,
  type VersionId,
  type Word,
} from './bible';
import type { Segment, VerseValue } from './adapters';
import { closeMeaning, openMeaning } from './meaning';

const STORE = 'cnf-reader';
interface Saved {
  versions: VersionId[];
  pos?: string;
  reading?: boolean;
  hinted?: boolean;
  cant?: boolean;
  /** The reader has chosen columns; until then an OT book opens with the Hebrew beside the BSB. */
  picked?: boolean;
}
function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Saved;
    return { versions: Array.isArray(s.versions) && s.versions.length ? s.versions.slice(0, 3) : ['bsb'], pos: s.pos, reading: !!s.reading, hinted: !!s.hinted, cant: s.cant ?? true, picked: !!s.picked || (Array.isArray(s.versions) && s.versions.join() !== 'bsb') };
  } catch {
    return { versions: ['bsb'] };
  }
}
function save(s: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* private mode: choices are not remembered */
  }
}

/** Hook for the evidence layer (Phase B): gutter shading and the panel. */
export interface EvidenceLayer {
  shade(book: Book, chapter: number, verses: number): Promise<(string | null)[]>;
  open(pos: Pos, ctx: { version: VersionId }): void;
  close(): void;
  hint?: string;
  /** Set by the Reader: called when the panel is closed from inside. */
  onClose?: (() => void) | null;
}
let evidenceLoader: (() => Promise<EvidenceLayer | null>) | null = () => import('../evidence/panel').then((m) => m.createEvidence());
export function registerEvidence(loader: () => Promise<EvidenceLayer | null>) {
  evidenceLoader = loader;
}

const LONG_PRESS = 450;

export function render(root: HTMLElement) {
  const saved = load();
  const st = {
    pos: parseHash(location.hash) ?? (saved.pos ? parseHash(saved.pos) : null) ?? { book: 'JHN', chapter: 1, verse: null },
    versions: saved.versions.filter((v) => v in ADAPTERS || v === 'orig') as VersionId[],
    reading: !!saved.reading,
    cant: saved.cant !== false,
    picked: !!saved.picked,
  };
  if (!st.versions.length) st.versions = ['bsb'];
  let evidence: EvidenceLayer | null = null;
  let renderToken = 0;
  let origWords: Word[][] | null = null;

  root.classList.add('page--reader');
  const bookBtn = h('button', { type: 'button', class: 'rd-bookbtn', 'aria-haspopup': 'dialog' });
  const verBtn = h('button', { type: 'button', class: 'rd-tool', 'aria-haspopup': 'true', title: 'Versions (v)', 'aria-label': 'Versions' }, h('span', { class: 'rd-long' }, 'Versions'), h('span', { class: 'rd-short', 'aria-hidden': 'true' }, 'Ver'));
  const searchBtn = h('button', { type: 'button', class: 'rd-tool', title: 'Search (/)', 'aria-label': 'Search' }, h('span', { class: 'rd-long' }, 'Search'), h('span', { class: 'rd-short', 'aria-hidden': 'true' }, '⌕'));
  const modeBtn = h('button', { type: 'button', class: 'rd-tool', 'aria-pressed': String(st.reading), title: 'Reading mode (m)', 'aria-label': 'Reading mode' }, h('span', { class: 'rd-long' }, 'Reading mode'), h('span', { class: 'rd-short', 'aria-hidden': 'true' }, 'Aa'));
  const prevBtn = h('button', { type: 'button', class: 'rd-tool rd-arrow', 'aria-label': 'Previous chapter', title: 'Previous chapter (←)' }, '‹');
  const nextBtn = h('button', { type: 'button', class: 'rd-tool rd-arrow', 'aria-label': 'Next chapter', title: 'Next chapter (→)' }, '›');
  const strip = h('nav', { class: 'rd-strip', 'aria-label': 'Chapters' });
  const heads = h('div', { class: 'rd-heads', 'aria-hidden': 'true' });
  const body = h('div', { class: 'rd-body' });
  const notices = h('div', { class: 'rd-notices' });
  const hint = h('p', { class: 'rd-hint', hidden: true });
  const footNav = h('div', { class: 'rd-footnav' });
  const toolbar = h('div', { class: 'rd-bar' }, h('div', { class: 'rd-bar__main' }, prevBtn, bookBtn, nextBtn, h('div', { class: 'rd-bar__tools' }, verBtn, searchBtn, modeBtn)), strip);
  const exitReading = h('button', { type: 'button', class: 'rd-exit', 'aria-label': 'Leave reading mode' }, 'Aa');
  root.append(h('h1', { class: 'visually-hidden', id: 'rd-h' }, 'Read'), toolbar, hint, h('div', { class: 'rd-page', 'aria-labelledby': 'rd-h' }, heads, body, notices, footNav), exitReading);

  const book = () => bookById.get(st.pos.book)!;
  const persist = () => save({ versions: st.versions, pos: posHash(st.pos), reading: st.reading, hinted: saved.hinted, cant: st.cant, picked: st.picked });

  function setReading(on: boolean) {
    st.reading = on;
    document.body.classList.toggle('is-reading', on);
    modeBtn.setAttribute('aria-pressed', String(on));
    persist();
  }
  setReading(st.reading);
  modeBtn.addEventListener('click', () => setReading(!st.reading));
  exitReading.addEventListener('click', () => setReading(false));

  /* ----- Navigation ----- */

  function go(p: Pos, opts: { replace?: boolean; scroll?: boolean } = {}) {
    const changed = p.book !== st.pos.book || p.chapter !== st.pos.chapter;
    st.pos = p;
    const hash = posHash(p);
    if (location.hash !== hash) history[opts.replace ? 'replaceState' : 'pushState'](history.state, '', `${location.pathname}${hash}`);
    persist();
    if (changed) renderChapter(opts.scroll !== false);
    else selectVerse(p.verse, true);
  }
  function step(d: number) {
    const i = BOOKS.findIndex((b) => b.id === st.pos.book);
    let c = st.pos.chapter + d;
    let b = BOOKS[i];
    if (c < 1) {
      b = BOOKS[(i - 1 + BOOKS.length) % BOOKS.length];
      c = b.chapters;
    } else if (c > b.chapters) {
      b = BOOKS[(i + 1) % BOOKS.length];
      c = 1;
    }
    go({ book: b.id, chapter: c, verse: null });
  }
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  /* ----- Book and chapter picker ----- */

  function openBooks() {
    const dlg = h('dialog', { class: 'rd-books', 'aria-label': 'Choose a book' }) as HTMLDialogElement;
    const close = h('button', { type: 'button', class: 'mc__close', 'aria-label': 'Close' }, '×');
    close.addEventListener('click', () => dlg.close());
    const chapters = h('div', { class: 'rd-books__chapters' });
    const section = (t: 'OT' | 'NT', title: string) =>
      h(
        'section',
        null,
        h('h3', null, title),
        h(
          'div',
          { class: 'rd-books__grid' },
          BOOKS.filter((b) => b.testament === t).map((b) => {
            const btn = h('button', { type: 'button', class: `rd-books__b ${b.id === st.pos.book ? 'is-on' : ''}` }, b.name);
            btn.addEventListener('click', () => showChapters(b));
            return btn;
          }),
        ),
      );
    function showChapters(b: Book) {
      clear(chapters);
      chapters.append(
        h('h3', null, b.name),
        h(
          'div',
          { class: 'rd-books__cgrid' },
          Array.from({ length: b.chapters }, (_, i) => {
            const btn = h('button', { type: 'button', class: `rd-books__c ${b.id === st.pos.book && i + 1 === st.pos.chapter ? 'is-on' : ''}` }, String(i + 1));
            btn.addEventListener('click', () => {
              dlg.close();
              go({ book: b.id, chapter: i + 1, verse: null });
            });
            return btn;
          }),
        ),
      );
      chapters.scrollIntoView({ block: 'nearest' });
      (chapters.querySelector<HTMLElement>('.is-on') ?? chapters.querySelector<HTMLElement>('button'))?.focus();
    }
    dlg.append(h('div', { class: 'rd-books__head' }, h('h2', null, 'Books'), close), h('div', { class: 'rd-books__cols' }, h('div', null, section('OT', 'Old Testament'), section('NT', 'New Testament')), chapters));
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
    showChapters(book());
  }
  bookBtn.addEventListener('click', openBooks);

  /* ----- Version picker ----- */

  const verLabel = (id: VersionId) => (id === 'orig' ? origLabel(book()) : ADAPTERS[id].label);
  const verShort = (id: VersionId) => (id === 'orig' ? origShort(book()) : ADAPTERS[id].short);
  function openVersions() {
    const pop = h('div', { class: 'rd-verpop', role: 'dialog', 'aria-label': 'Versions' });
    const all: VersionId[] = ['bsb', 'web', 'kjv', 'asv', 'esv', 'orig'];
    const note = h('p', { class: 'rd-verpop__note' }, 'Choose up to three. They appear side by side, verse by verse.');
    append(pop, [
      h('p', { class: 'rd-verpop__h' }, 'Versions'),
      all.map((id) => {
        const avail = id === 'orig' || ADAPTERS[id].available();
        const input = h('input', { type: 'checkbox', checked: st.versions.includes(id), disabled: !avail });
        input.addEventListener('change', () => {
          if (input.checked) {
            if (st.versions.length >= 3) {
              input.checked = false;
              note.textContent = 'Three columns at most. Remove one first.';
              return;
            }
            st.versions.push(id);
          } else {
            if (st.versions.length === 1) {
              input.checked = true;
              return;
            }
            st.versions = st.versions.filter((v) => v !== id);
          }
          st.picked = true;
          persist();
          renderChapter(false);
        });
        return h(
          'label',
          { class: `rd-verpop__opt ${avail ? '' : 'is-off'}` },
          input,
          h('span', null, id === 'orig' ? `${origLabel(book())}` : ADAPTERS[id].label),
          id === 'esv' && !avail ? h('a', { href: 'https://github.com/LexReach/closer-not-farther/blob/main/proxy/README.md', target: '_blank', rel: 'noopener', class: 'rd-verpop__link' }, 'How to connect') : '',
        );
      }),
      note,
    ]);
    document.body.appendChild(pop);
    const r = verBtn.getBoundingClientRect();
    pop.style.top = `${r.bottom + 6}px`;
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 300, r.right - 280))}px`;
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !pop.contains(e.target as Node) && e.target !== verBtn) {
        pop.remove();
        document.removeEventListener('pointerdown', off, true);
        document.removeEventListener('keydown', off, true);
      }
    };
    document.addEventListener('pointerdown', off, true);
    document.addEventListener('keydown', off, true);
    (pop.querySelector('input:not([disabled])') as HTMLElement | null)?.focus();
  }
  verBtn.addEventListener('click', openVersions);

  /* ----- Search ----- */

  const firstEnglish = () => st.versions.find((v) => v !== 'orig' && v !== 'esv') ?? 'bsb';
  async function openSearchDlg(query?: string) {
    const { openSearch } = await import('./search');
    openSearch({ version: firstEnglish(), query, onGo: (p) => go(p) });
  }
  searchBtn.addEventListener('click', () => openSearchDlg());

  /* ----- Rendering ----- */

  function drawStrip() {
    clear(strip);
    const b = book();
    for (let c = 1; c <= b.chapters; c++) {
      const a = h('a', { href: `${location.pathname}#${b.slug}.${c}`, class: c === st.pos.chapter ? 'is-on' : '', 'aria-current': c === st.pos.chapter ? 'page' : null }, String(c));
      a.addEventListener('click', (e) => {
        e.preventDefault();
        go({ book: b.id, chapter: c, verse: null });
      });
      strip.appendChild(a);
    }
    strip.querySelector<HTMLElement>('.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function wordsCell(words: Word[] | undefined, lang: 'grc' | 'hbo'): Node {
    const cell = h('div', { class: `rd-cell rd-cell--orig ${lang === 'hbo' ? 'hebrew' : 'greek'}`, lang, dir: lang === 'hbo' ? 'rtl' : 'ltr' });
    if (!words?.length) {
      cell.append(h('span', { class: 'rd-absent' }, '—'));
      return cell;
    }
    words.forEach((w, i) => {
      const surface = lang === 'hbo' ? hebrewSurface(w[0], st.cant) : w[0];
      cell.append(h('span', { class: 'rd-g', 'data-wi': i, tabindex: 0, role: 'button' }, surface), ' ');
    });
    return cell;
  }

  function englishCell(v: VerseValue, id: VersionId): Node {
    const cell = h('div', { class: 'rd-cell', 'data-ver': id });
    if (v == null || v === '') {
      cell.append(h('span', { class: 'rd-absent', title: `Not in the ${ADAPTERS[id]?.short ?? id} at this number` }, '—'));
      return cell;
    }
    if (typeof v === 'string') {
      cell.append(v);
      return cell;
    }
    for (const [t, gi] of v as Segment[]) cell.append(gi == null ? t : h('span', { class: 'rd-w', 'data-gi': gi }, t));
    return cell;
  }

  async function renderChapter(scroll: boolean) {
    const my = ++renderToken;
    closeMeaning();
    const b = book();
    const lang = langOf(b);
    bookBtn.textContent = `${b.name} ${st.pos.chapter}`;
    bookBtn.setAttribute('aria-label', `${bookBtn.textContent}, choose book and chapter`);
    document.title = `${b.name} ${st.pos.chapter} · Read · Closer, Not Farther`;
    drawStrip();
    if (!st.picked) st.versions = b.testament === 'OT' ? ['bsb', 'orig'] : ['bsb'];
    const cols = st.versions;
    // The original text is awaited only when it is shown; for the BSB's
    // long-press alignment it loads after the English has rendered.
    const needOrig = cols.includes('orig');
    const [texts, orig] = await Promise.all([
      Promise.all(
        cols.map((id) =>
          id === 'orig'
            ? Promise.resolve(null)
            : ADAPTERS[id].available()
              ? ADAPTERS[id].getChapter(b.id, st.pos.chapter).catch((e: Error) => ({ verses: [] as VerseValue[], error: e.message }))
              : Promise.resolve({ verses: [] as VerseValue[], error: 'Not connected' }),
        ),
      ),
      needOrig ? loadOriginal(b) : Promise.resolve(null),
    ]);
    if (my !== renderToken) return;
    origWords = orig?.[st.pos.chapter - 1] ?? null;
    if (!needOrig && cols.includes('bsb')) {
      const ch = st.pos.chapter;
      loadOriginal(b).then((o) => {
        if (my === renderToken) origWords = o?.[ch - 1] ?? null;
      });
    }
    const n = Math.max(...texts.map((t) => t?.verses.length ?? 0), origWords?.length ?? 0, b.verses?.[st.pos.chapter - 1] ?? 0);
    root.style.setProperty('--rd-cols', String(cols.length));
    root.classList.toggle('rd--multi', cols.length > 1);
    clear(heads);
    heads.append(h('span', { class: 'rd-heads__v' }), ...cols.map((id) => h('span', { class: 'rd-heads__c' }, verLabel(id))));
    clear(body);
    const frag = document.createDocumentFragment();
    for (let v = 1; v <= n; v++) {
      const row = h('div', { class: 'rd-row', 'data-v': v, id: `v${v}` }, h('span', { class: 'rd-gutter', 'aria-hidden': 'true' }), h('a', { class: 'rd-vnum', href: `${location.pathname}#${b.slug}.${st.pos.chapter}.${v}`, 'aria-label': `Verse ${v}` }, String(v)));
      cols.forEach((id, ci) => {
        const cell = id === 'orig' ? wordsCell(origWords?.[v - 1], lang) : englishCell(texts[ci]?.verses[v - 1] ?? null, id);
        if (cols.length > 1) (cell as HTMLElement).setAttribute('data-label', verShort(id));
        row.appendChild(cell);
      });
      frag.appendChild(row);
    }
    body.appendChild(frag);
    if (cols.includes('orig') && !orig) {
      body.prepend(h('p', { class: 'rd-note' }, `${origLabel(b)} text is not available for this book yet.`));
    }
    const errs = texts.map((t, i) => (t && 'error' in t ? `${verLabel(cols[i])}: ${t.error}` : '')).filter(Boolean);
    clear(notices);
    if (errs.length) notices.append(h('p', { class: 'rd-note' }, errs.join(' · ')));
    for (const id of cols) {
      const nt = id !== 'orig' ? ADAPTERS[id].notice : undefined;
      if (nt && ADAPTERS[id].available()) notices.append(h('p', { class: 'rd-copyright' }, nt.text, ' ', h('a', { href: nt.href, target: '_blank', rel: 'noopener' }, 'esv.org')));
    }
    notices.append(
      h(
        'p',
        { class: 'rd-credit' },
        cols.map((id) => verLabel(id)).join(' · '),
        '. ',
        h('a', { href: href('/about#texts'), 'data-link': true }, 'Text sources and licences'),
      ),
    );
    // Previous / next.
    clear(footNav);
    const i = BOOKS.findIndex((x) => x.id === b.id);
    const prev = st.pos.chapter > 1 ? { b, c: st.pos.chapter - 1 } : i > 0 ? { b: BOOKS[i - 1], c: BOOKS[i - 1].chapters } : null;
    const next = st.pos.chapter < b.chapters ? { b, c: st.pos.chapter + 1 } : i < BOOKS.length - 1 ? { b: BOOKS[i + 1], c: 1 } : null;
    const link = (x: { b: Book; c: number } | null, label: string) => {
      if (!x) return h('span');
      const a = h('a', { href: `${location.pathname}#${x.b.slug}.${x.c}`, class: 'rd-footnav__a' }, label, h('strong', null, `${x.b.name} ${x.c}`));
      a.addEventListener('click', (e) => {
        e.preventDefault();
        go({ book: x.b.id, chapter: x.c, verse: null });
      });
      return a;
    };
    footNav.append(link(prev, '‹ '), link(next, ''));
    if (next) footNav.lastElementChild?.append(' ›');

    if (scroll) window.scrollTo({ top: 0 });
    selectVerse(st.pos.verse, true);
    shadeGutter(b, st.pos.chapter, n, my);
  }

  async function shadeGutter(b: Book, c: number, n: number, my: number) {
    if (!evidence && evidenceLoader) {
      evidence = await evidenceLoader().catch(() => null);
      if (evidence)
        evidence.onClose = () => {
          body.querySelectorAll('.rd-row.is-sel').forEach((r) => r.classList.remove('is-sel'));
          st.pos = { ...st.pos, verse: null };
          history.replaceState(history.state, '', `${location.pathname}${posHash(st.pos)}`);
          persist();
        };
      // A verse selected before the layer arrived (a deep link) opens now.
      if (evidence && st.pos.verse && my === renderToken) evidence.open(st.pos, { version: firstEnglish() });
    }
    if (!evidence || my !== renderToken) return;
    if (evidence.hint && !saved.hinted) {
      hint.textContent = evidence.hint;
      hint.hidden = false;
      saved.hinted = true;
      persist();
      // A toast over the page, not a bar in it: showing or dismissing it never
      // moves the verses under the reader's finger.
      const dismiss = () => {
        hint.classList.add('is-gone');
        window.setTimeout(() => (hint.hidden = true), 400);
        document.removeEventListener('click', onFirst, true);
      };
      const onFirst = () => window.setTimeout(dismiss, 0);
      document.addEventListener('click', onFirst, true);
      window.setTimeout(dismiss, 9000);
    }
    const shades = await evidence.shade(b, c, n).catch(() => []);
    if (my !== renderToken) return;
    body.querySelectorAll<HTMLElement>('.rd-row').forEach((row, i) => {
      const s = shades[i];
      const g = row.querySelector<HTMLElement>('.rd-gutter')!;
      if (s) {
        g.style.setProperty('--dot', s);
        g.classList.add('is-on');
      }
    });
  }

  function selectVerse(v: number | null, scrollTo: boolean) {
    body.querySelectorAll('.rd-row.is-sel').forEach((r) => r.classList.remove('is-sel'));
    if (!v) {
      evidence?.close();
      return;
    }
    const row = body.querySelector<HTMLElement>(`.rd-row[data-v="${v}"]`);
    if (!row) return;
    row.classList.add('is-sel');
    if (scrollTo) row.scrollIntoView({ block: 'center', behavior: 'auto' });
    if (evidence) evidence.open(st.pos, { version: firstEnglish() });
  }

  /* ----- Word and verse interaction ----- */

  function showWord(el: HTMLElement, wi: number, v: number) {
    const w = origWords?.[v - 1]?.[wi];
    if (!w) return;
    const b = book();
    body.querySelectorAll('.is-word').forEach((x) => x.classList.remove('is-word'));
    // Light up the Greek word and every English segment rendering it.
    body.querySelectorAll<HTMLElement>(`.rd-row[data-v="${v}"] [data-wi="${wi}"], .rd-row[data-v="${v}"] [data-gi="${wi}"]`).forEach((x) => x.classList.add('is-word'));
    openMeaning({
      word: w,
      lang: langOf(b),
      anchor: el,
      where: `${b.name} ${st.pos.chapter}:${v}, word ${wi + 1}`,
      onSearchLemma: (strong) => openSearchDlg(strong),
      onClose: () => body.querySelectorAll('.is-word').forEach((x) => x.classList.remove('is-word')),
    });
  }

  let pressTimer = 0;
  let pressed = false;
  body.addEventListener('pointerdown', (e) => {
    const w = (e.target as Element).closest<HTMLElement>('.rd-w');
    if (!w) return;
    pressed = false;
    const row = w.closest<HTMLElement>('.rd-row')!;
    pressTimer = window.setTimeout(() => {
      pressed = true;
      showWord(w, Number(w.dataset.gi), Number(row.dataset.v));
    }, LONG_PRESS);
  });
  const cancelPress = () => window.clearTimeout(pressTimer);
  body.addEventListener('pointerup', cancelPress);
  body.addEventListener('pointercancel', cancelPress);
  body.addEventListener('pointerleave', cancelPress);
  body.addEventListener('contextmenu', (e) => {
    if ((e.target as Element).closest('.rd-w')) e.preventDefault();
  });
  body.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (pressed) {
      pressed = false;
      e.preventDefault();
      return;
    }
    const row = t.closest<HTMLElement>('.rd-row');
    if (!row) return;
    const v = Number(row.dataset.v);
    const g = t.closest<HTMLElement>('.rd-g');
    if (g) {
      showWord(g, Number(g.dataset.wi), v);
      return;
    }
    e.preventDefault();
    go({ ...st.pos, verse: st.pos.verse === v && !t.closest('.rd-vnum') ? null : v }, { replace: true });
  });
  body.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('.rd-g');
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      showWord(g, Number(g.dataset.wi), Number(g.closest<HTMLElement>('.rd-row')!.dataset.v));
    }
  });

  /* ----- Keyboard ----- */

  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest('input, select, textarea, dialog, [role="dialog"]')) return;
    const n = body.querySelectorAll('.rd-row').length;
    const k = e.key;
    if (k === 'ArrowLeft') step(-1);
    else if (k === 'ArrowRight') step(1);
    else if (k === 'j' || k === 'k') go({ ...st.pos, verse: Math.max(1, Math.min(n, (st.pos.verse ?? 0) + (k === 'j' ? 1 : -1))) }, { replace: true });
    else if (k === '/') openSearchDlg();
    else if (k === 'b') openBooks();
    else if (k === 'v') openVersions();
    else if (k === 'm') setReading(!st.reading);
    else if (k === 'Escape') {
      if (st.reading) setReading(false);
      else if (st.pos.verse) go({ ...st.pos, verse: null }, { replace: true });
      else return;
    } else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);
  const onHash = () => {
    const p = parseHash(location.hash);
    if (p && (p.book !== st.pos.book || p.chapter !== st.pos.chapter || p.verse !== st.pos.verse)) go(p, { replace: true });
  };
  window.addEventListener('hashchange', onHash);

  if (!parseHash(location.hash)) history.replaceState(history.state, '', `${location.pathname}${posHash(st.pos)}`);
  renderChapter(!st.pos.verse);

  return () => {
    renderToken++;
    closeMeaning();
    evidence?.close();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    document.body.classList.remove('is-reading');
    root.classList.remove('page--reader', 'rd--multi');
  };
}
