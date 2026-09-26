// The coverage map: every verse as a cell, lit once a surviving manuscript
// copied by the chosen century carries it. Drag the slider through the
// centuries; tap a cell to read that verse with its witnesses.
import '../styles/evidence.css';
import { h, clear, reducedMotion } from '../lib/dom';
import { navigate } from '../lib/nav';
import { ModuleHeader, Slider } from '../components';
import { bookById, posHash } from '../reader/bible';
import { EVD } from '../evidence/data';
import type { ExcerptApi, MountOpts } from '../chapters';

export interface CovBook {
  id: string;
  /** Verses per chapter. */
  ch: number[];
  /** Per verse (in order), cumulative witness counts by century. */
  v: number[][];
}
export interface CovTestament {
  centuries: number[];
  books: CovBook[];
  basis: string;
}
export type CovData = Partial<Record<'NT' | 'OT', CovTestament>>;

let dataP: Promise<CovData | null> | null = null;
export const loadCoverage = () => (dataP ??= fetch(`${EVD}timeline.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));

const ORD = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
export const centuryName = (c: number) => (c < 0 ? `${ORD(-c)} century BC` : `${ORD(c)} century`);
const endYear = (c: number) => (c < 0 ? `${(-c - 1) * 100} BC` : `AD ${c * 100}`);
const n = (x: number) => x.toLocaleString('en-US');

interface Layout {
  cell: number;
  gap: number;
  label: number;
  cols: number;
  rows: { b: CovBook; y: number; h: number }[];
  height: number;
}

function layout(t: CovTestament, width: number, big: boolean): Layout {
  const cell = width < 520 ? 5 : big ? 8 : 6;
  const gap = 1;
  const label = width < 520 ? 44 : 84;
  const cols = Math.max(20, Math.floor((width - label) / (cell + gap)));
  let y = 0;
  const rows = t.books.map((b) => {
    const r = Math.ceil(b.v.length / cols);
    const hgt = Math.max(r * (cell + gap), 14);
    const out = { b, y, h: hgt };
    y += hgt + (cell + gap) * 1.5;
    return out;
  });
  return { cell, gap, label, cols, rows, height: y };
}

function css(name: string, el: Element) {
  return getComputedStyle(el).getPropertyValue(name).trim() || '#888';
}

/** Draws the map; returns hit-testing and redraw. */
function CoverageCanvas(t: CovTestament, opts: { big?: boolean; onPick?: (book: string, c: number, v: number) => void; short?: boolean }) {
  const canvas = h('canvas', { class: 'cov__canvas', role: 'img' }) as HTMLCanvasElement;
  const wrap = h('div', { class: 'cov__wrap' }, canvas);
  const tip = h('div', { class: 'cov__tip', hidden: true });
  wrap.appendChild(tip);
  let lay: Layout | null = null;
  let ci = 0;
  const ctx = canvas.getContext('2d')!;

  function draw() {
    const w = wrap.clientWidth || 600;
    lay = layout(t, w, !!opts.big);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(lay.height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${lay.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, lay.height);
    const empty = css('--surface-2', wrap);
    const ink = css('--muted', wrap);
    const fill = css('--cov-fill', wrap);
    ctx.font = `${w < 520 ? 10 : 12}px ${css('--font-ui', wrap)}`;
    ctx.textBaseline = 'top';
    for (const r of lay.rows) {
      ctx.fillStyle = ink;
      const name = bookById.get(r.b.id)?.name ?? r.b.id;
      ctx.fillText(w < 520 ? r.b.id : name, 0, r.y);
      r.b.v.forEach((counts, i) => {
        const x = lay!.label + (i % lay!.cols) * (lay!.cell + lay!.gap);
        const y = r.y + Math.floor(i / lay!.cols) * (lay!.cell + lay!.gap);
        const k = counts[ci] ?? 0;
        if (!k) {
          ctx.fillStyle = empty;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = fill;
          ctx.globalAlpha = Math.min(1, 0.35 + Math.log10(k + 1) / 3);
        }
        ctx.fillRect(x, y, lay!.cell, lay!.cell);
      });
      ctx.globalAlpha = 1;
    }
  }
  function hit(e: PointerEvent | MouseEvent): { b: CovBook; i: number } | null {
    if (!lay) return null;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - lay.label;
    const y = e.clientY - r.top;
    if (x < 0) return null;
    const row = lay.rows.find((q) => y >= q.y && y < q.y + q.h);
    if (!row) return null;
    const col = Math.floor(x / (lay.cell + lay.gap));
    if (col >= lay.cols) return null;
    const i = Math.floor((y - row.y) / (lay.cell + lay.gap)) * lay.cols + col;
    return i < row.b.v.length ? { b: row.b, i } : null;
  }
  const refOf = (b: CovBook, i: number) => {
    let c = 0;
    let k = i;
    while (c < b.ch.length && k >= b.ch[c]) k -= b.ch[c++];
    return { c: c + 1, v: k + 1 };
  };
  canvas.addEventListener('pointermove', (e) => {
    const x = hit(e);
    if (!x) return void (tip.hidden = true);
    const { c, v } = refOf(x.b, x.i);
    const k = x.b.v[x.i][ci] ?? 0;
    tip.textContent = `${bookById.get(x.b.id)?.name ?? x.b.id} ${c}:${v} · ${k ? `${n(k)} manuscript${k === 1 ? '' : 's'}` : 'none yet'}`;
    tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    tip.style.left = `${Math.min(r.width - 200, Math.max(0, e.clientX - r.left + 10))}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
  });
  canvas.addEventListener('pointerleave', () => (tip.hidden = true));
  canvas.addEventListener('click', (e) => {
    const x = hit(e);
    if (!x || !opts.onPick) return;
    const { c, v } = refOf(x.b, x.i);
    opts.onPick(x.b.id, c, v);
  });
  const ro = new ResizeObserver(() => draw());
  ro.observe(wrap);
  return {
    el: wrap,
    set(i: number) {
      ci = i;
      draw();
    },
    destroy: () => ro.disconnect(),
  };
}

function stats(t: CovTestament, i: number) {
  let total = 0;
  let lit = 0;
  for (const b of t.books)
    for (const v of b.v) {
      total++;
      if ((v[i] ?? 0) > 0) lit++;
    }
  return { total, lit };
}

function view(root: HTMLElement, data: CovData, opts: MountOpts & { excerpt?: boolean; testament?: 'NT' | 'OT' } = {}) {
  let test: 'NT' | 'OT' = opts.testament ?? 'NT';
  const readout = h('p', { class: 'cov__readout', 'aria-live': 'polite' });
  const mapBox = h('div', { class: 'cov__map' });
  const switchEl = h('div', { class: 'ev-segs cov__switch', role: 'group', 'aria-label': 'Testament' });
  let canvasApi: ReturnType<typeof CoverageCanvas> | null = null;
  let slider: ReturnType<typeof Slider> | null = null;
  const sliderBox = h('div', { class: 'cov__slider' });

  function build() {
    const t = data[test]!;
    canvasApi?.destroy();
    clear(mapBox);
    clear(sliderBox);
    canvasApi = CoverageCanvas(t, {
      big: opts.big,
      onPick: opts.excerpt ? undefined : (book, c, v) => navigate(`/read${posHash({ book, chapter: c, verse: v })}`),
    });
    mapBox.appendChild(canvasApi.el);
    const cs = t.centuries;
    slider = Slider({
      label: 'Manuscripts copied by the end of the',
      min: 0,
      max: cs.length - 1,
      value: opts.excerpt ? 0 : cs.length - 1,
      format: (i) => centuryName(cs[i]),
      onInput: (i) => set(i),
    });
    sliderBox.appendChild(slider.el);
    set(slider.get());
  }
  function set(i: number) {
    const t = data[test]!;
    canvasApi?.set(i);
    const s = stats(t, i);
    readout.textContent = `By ${endYear(t.centuries[i])}, ${n(s.lit)} of ${n(s.total)} verses (${Math.round((s.lit / s.total) * 100)}%) are in at least one surviving manuscript.`;
  }
  (['NT', 'OT'] as const).forEach((k) => {
    if (!data[k]) return;
    const b = h('button', { type: 'button', class: 'ev-seg', 'aria-pressed': String(k === test) }, k === 'NT' ? 'New Testament' : 'Hebrew Bible');
    b.addEventListener('click', () => {
      test = k;
      switchEl.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      build();
    });
    switchEl.appendChild(b);
  });
  root.append(switchEl.children.length > 1 && !opts.excerpt ? switchEl : '', sliderBox, readout, mapBox);
  build();
  return {
    step(): boolean {
      if (!slider) return false;
      const t = data[test]!;
      const i = slider.get();
      const next = i >= t.centuries.length - 1 ? 0 : i + 1;
      slider.set(next, true);
      return next !== 0;
    },
    destroy: () => canvasApi?.destroy(),
  };
}

export function render(root: HTMLElement) {
  root.append(
    ModuleHeader('The evidence', 'Every verse, century by century', 'Each cell is one verse. It lights up once a manuscript that survives today, copied by the chosen century, is known to carry it. Tap a cell to read the verse and see its manuscripts.'),
  );
  const body = h('div', { class: 'cov' }, h('p', { class: 'muted' }, 'Loading the index…'));
  root.append(body);
  let api: { destroy(): void } | null = null;
  loadCoverage().then((d) => {
    clear(body);
    if (!d?.NT) {
      body.append(h('p', null, 'The coverage index could not be loaded.'));
      return;
    }
    api = view(body, d);
    body.append(
      h(
        'p',
        { class: 'ev-note' },
        d.NT.basis,
        ' A manuscript counts from the end of the latest century its catalogue date allows, so P66 (2nd–3rd century) counts from AD 300. Page index: INTF New Testament Virtual Manuscript Room, used for non-commercial study with attribution.',
      ),
    );
  });
  return () => api?.destroy();
}

/** Excerpt for the Why page, present mode and the tour: plays through the centuries. */
export async function mountCoverage(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const d = await loadCoverage();
  clear(el);
  if (!d?.NT) {
    el.append(h('p', { class: 'muted' }, 'The coverage index could not be loaded.'));
    return { play() {}, pause() {}, destroy() {} };
  }
  const box = h('div', { class: `cov cov--excerpt${opts.big ? ' cov--big' : ''}` });
  el.append(box);
  const v = view(box, d, { ...opts, excerpt: true });
  let id = 0;
  return {
    play() {
      window.clearInterval(id);
      if (reducedMotion()) return;
      id = window.setInterval(() => v.step(), opts.big ? 1100 : 900);
    },
    pause: () => window.clearInterval(id),
    destroy() {
      window.clearInterval(id);
      v.destroy();
    },
  };
}
