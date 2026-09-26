// The featured shelf: 25 manuscripts that carry the argument. Used at the top
// of the Library, as the home page's closing chapter and in present mode.
import { h, reducedMotion } from '../lib/dom';
import { href, navigate } from '../lib/nav';
import type { ExcerptApi, MountOpts } from '../chapters';
import { CAT_LABEL, gaLabel, loadLibrary, thumbUrl, type Cat, type Featured, type LibraryData } from './data';

export function ShelfCard(f: Featured, lib: LibraryData, onOpen?: (ga: string) => void): HTMLElement {
  const img = thumbUrl(lib.images[f.ga], 360);
  const card = h(
    'a',
    { class: `shelf-card ${img ? 'has-img' : ''}`, href: href(`/library#ms=${encodeURIComponent(f.ga)}`), 'data-ga': f.ga },
    h(
      'div',
      { class: 'shelf-card__media' },
      img
        ? h('img', { src: img, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', onerror: (e: Event) => (e.target as HTMLElement).replaceWith(h('span', { class: 'shelf-card__ga' }, gaLabel(f.ga))) })
        : h('span', { class: 'shelf-card__ga' }, gaLabel(f.ga)),
    ),
    h('div', { class: 'shelf-card__body' }, h('span', { class: 'shelf-card__ga-sm num' }, gaLabel(f.ga)), h('span', { class: 'shelf-card__name' }, f.name), h('span', { class: 'shelf-card__date' }, f.date.split(' (')[0])),
  );
  card.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (onOpen) onOpen(f.ga);
    else navigate(`/library#ms=${encodeURIComponent(f.ga)}`);
  });
  return card;
}

export function Shelf(lib: LibraryData, onOpen?: (ga: string) => void): HTMLElement {
  return h('div', { class: 'shelf', role: 'list', 'aria-label': 'Featured manuscripts' }, lib.featured.map((f) => h('div', { role: 'listitem' }, ShelfCard(f, lib, onOpen))));
}

export function Counters(lib: LibraryData, big = false): { el: HTMLElement; set(counts: Record<Cat, number>, animate?: boolean): void } {
  const cats: Cat[] = ['P', 'M', 'm', 'L'];
  const vals = new Map<Cat, HTMLElement>();
  const shown: Record<string, number> = { P: 0, M: 0, m: 0, L: 0 };
  const el = h(
    'div',
    { class: `lib-counters ${big ? 'lib-counters--big' : ''}`, 'aria-live': 'polite' },
    cats.map((c) => {
      const v = h('span', { class: 'lib-counter__n num' }, '0');
      vals.set(c, v);
      return h('div', { class: `lib-counter lib-counter--${c}` }, v, h('span', { class: 'visually-hidden' }, ' '), h('span', { class: 'lib-counter__l' }, CAT_LABEL[c]));
    }),
  );
  let raf = 0;
  void lib;
  return {
    el,
    set(counts, animate = true) {
      cancelAnimationFrame(raf);
      const from = { ...shown };
      const t0 = performance.now();
      const dur = animate && !reducedMotion() ? 900 : 0;
      const step = (now: number) => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        const e = 1 - Math.pow(1 - k, 3);
        for (const c of cats) {
          shown[c] = Math.round(from[c] + ((counts[c] ?? 0) - from[c]) * e);
          vals.get(c)!.textContent = shown[c].toLocaleString('en-US');
        }
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}

export function countByCat(rows: { cat: Cat }[]): Record<Cat, number> {
  const out: Record<Cat, number> = { P: 0, M: 0, m: 0, L: 0 };
  for (const r of rows) out[r.cat]++;
  return out;
}

/** Home / present excerpt: counters count up, then the shelf drifts past. */
export async function mountShelfExcerpt(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const lib = await loadLibrary();
  const counters = Counters(lib, opts.big);
  const shelf = Shelf(lib);
  const imgCount = Object.keys(lib.images).length;
  const box = h(
    'div',
    { class: `ex-lib ${opts.big ? 'ex-lib--big' : ''}` },
    counters.el,
    h('p', { class: 'ex-lib__note' }, `${lib.rows.length.toLocaleString('en-US')} catalogued manuscripts${imgCount ? `; ${imgCount.toLocaleString('en-US')} with page images served by the libraries that hold them` : ''}.`),
    shelf,
  );
  el.appendChild(box);
  const total = countByCat(lib.rows);
  // Real numbers from the start; the first play counts up to them once.
  counters.set(total, false);
  let counted = false;
  let raf = 0;
  let playing = false;
  let last = 0;
  const drift = (now: number) => {
    if (!playing) return;
    const dt = last ? now - last : 16;
    last = now;
    shelf.scrollLeft += dt * 0.03;
    if (shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 1) shelf.scrollLeft = 0;
    raf = requestAnimationFrame(drift);
  };
  // Pause the drift while the reader is interacting with the shelf.
  shelf.addEventListener('pointerenter', () => (playing = false));
  return {
    play() {
      if (!counted && !reducedMotion()) {
        counted = true;
        counters.set({ P: 0, M: 0, m: 0, L: 0 }, false);
        counters.set(total, true);
      }
      if (reducedMotion()) return;
      playing = true;
      last = 0;
      raf = requestAnimationFrame(drift);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      playing = false;
      cancelAnimationFrame(raf);
    },
  };
}
