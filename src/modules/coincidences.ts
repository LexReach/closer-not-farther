// Module 6: Undesigned coincidences.
import { h, s, clear, reducedMotion } from '../lib/dom';
import { Disclosure, Legend, ModuleHeader, SourceList } from '../components';
import { skepticsFor } from '../data';
import data from '../../data/coincidences.json';

interface Step {
  ref: string | null;
  point: string;
  quote?: string;
  ref_context?: string;
}
interface Item {
  id: string;
  question: string;
  featured?: boolean;
  steps: Step[];
  map?: { places: string[]; highlight: string };
}

const items = data.items as Item[];
const BOOKS = ['Matthew', 'Mark', 'Luke', 'John'] as const;
type Book = (typeof BOOKS)[number];
const BOOK_VAR: Record<Book, string> = {
  Matthew: 'var(--r-rome)',
  Mark: 'var(--r-egypt)',
  Luke: 'var(--r-asia)',
  John: 'var(--r-syria)',
};

/** Book column for a reference; Acts sits with Luke (Luke-Acts). */
function bookOf(ref: string): Book {
  if (ref.startsWith('Acts')) return 'Luke';
  return (BOOKS.find((b) => ref.startsWith(b)) ?? 'John') as Book;
}
function chapterOf(ref: string): number {
  const m = ref.match(/(\d+)(?::|$)/);
  const base = ref.startsWith('Acts') ? 100 : 0; // Acts after Luke
  return base + (m ? Number(m[1]) : 0);
}

interface GNode {
  ref: string;
  book: Book;
  ch: number;
  items: string[];
  x: number;
  y: number;
}
interface GEdge {
  item: string;
  a: GNode;
  b: GNode;
}

function buildGraph() {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  for (const it of items) {
    const refs = it.steps.map((st) => st.ref).filter((r): r is string => !!r);
    const ns = refs.map((r) => {
      let n = nodes.get(r);
      if (!n) {
        n = { ref: r, book: bookOf(r), ch: chapterOf(r), items: [], x: 0, y: 0 };
        nodes.set(r, n);
      }
      n.items.push(it.id);
      return n;
    });
    for (let i = 1; i < ns.length; i++) edges.push({ item: it.id, a: ns[0], b: ns[i] });
  }
  return { nodes: [...nodes.values()], edges };
}


/** The stepped walkthrough list for one item, first `shown` steps. Shared with the home page and present mode. */
export function stepsList(it: Item, shown: number): HTMLOListElement {
  return h(
    'ol',
    { class: 'uc-steps' },
    it.steps.slice(0, shown).map((st, i) => {
      const book = st.ref ? bookOf(st.ref) : null;
      return h(
        'li',
        { class: `uc-step ${st.ref ? '' : 'uc-step--conclusion'} ${i === shown - 1 ? 'is-new' : ''}` },
        h(
          'div',
          { class: 'uc-step__head' },
          h('span', { class: 'uc-step__n num' }, `${i + 1}`),
          st.ref
            ? h('span', { class: 'uc-ref', style: { borderColor: BOOK_VAR[book!] } }, st.ref, st.ref_context ? h('span', { class: 'muted' }, ` (${st.ref_context})`) : null)
            : h('span', { class: 'uc-ref uc-ref--plain' }, 'The answer'),
        ),
        st.quote ? h('blockquote', { class: 'uc-quote' }, st.quote) : null,
        h('p', { class: 'uc-point' }, st.point),
      );
    }),
  );
}

export { items as coincidenceItems };

/* ---------- Map inset ---------- */

export function mapInset(it: Item): SVGSVGElement {
  const geo = data.map_geo;
  const Hh = 300;
  const lat0 = 32.64;
  const lat1 = 32.97;
  const lon0 = 35.4;
  const lon1 = 35.8;
  const kx = Math.cos((32.8 * Math.PI) / 180);
  const sc = Hh / (lat1 - lat0);
  const W = Math.round((lon1 - lon0) * kx * sc);
  const px = (lon: number) => (lon - lon0) * kx * sc;
  const py = (lat: number) => (lat1 - lat) * sc;
  const path = (pts: number[][], close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[1]).toFixed(1)},${py(p[0]).toFixed(1)}`).join('') + (close ? 'Z' : '');
  const svg = s('svg', {
    class: 'map',
    viewBox: `0 0 ${W} ${Hh}`,
    role: 'img',
    'aria-label': `Schematic map of the Sea of Galilee showing ${it.map!.places.join(', ')}. ${it.map!.highlight} is highlighted.`,
  });
  svg.append(
    s('path', { d: path(geo.jordan_in), class: 'map__river' }),
    s('path', { d: path(geo.jordan_out), class: 'map__river' }),
    s('path', { d: path(geo.lake, true), class: 'map__lake' }),
    s('text', { x: px(35.595), y: py(32.79), class: 'map__lake-label', 'text-anchor': 'middle' }, 'Sea of Galilee'),
    s('text', { x: px(35.636) + 4, y: py(32.95), class: 'map__river-label' }, 'Jordan'),
  );
  const places = geo.places as Record<string, { lat: number; lon: number; note?: string }>;
  for (const name of it.map!.places) {
    const p = places[name];
    if (!p) continue;
    const hl = name === it.map!.highlight;
    const right = p.lon > 35.6;
    svg.append(
      hl ? s('circle', { cx: px(p.lon), cy: py(p.lat), r: 12, class: 'map__ring' }) : '',
      s('circle', { cx: px(p.lon), cy: py(p.lat), r: hl ? 5.5 : 4, class: `map__place ${hl ? 'is-hl' : ''}` }),
      s('text', { x: px(p.lon) + (right ? 8 : -8), y: py(p.lat) + 4, 'text-anchor': right ? 'start' : 'end', class: `map__label ${hl ? 'is-hl' : ''}` }, name),
    );
  }
  return svg;
}

/* ---------- Page ---------- */

export function render(root: HTMLElement) {
  const { nodes, edges } = buildGraph();
  let current = (items.find((i) => i.featured) ?? items[0]).id;
  let shown = 0; // number of steps revealed

  const list = h('ol', { class: 'uc-list' });
  const listBtns = new Map<string, HTMLButtonElement>();
  items.forEach((it, i) => {
    const b = h('button', { type: 'button', class: 'uc-q', 'aria-pressed': 'false' }, h('span', { class: 'uc-q__n num' }, String(i + 1)), h('span', null, it.question));
    b.addEventListener('click', () => choose(it.id, true));
    listBtns.set(it.id, b);
    list.appendChild(h('li', null, b));
  });

  const graphWrap = h('div', { class: 'uc-graph' });
  const walk = h('section', { class: 'uc-walk panel', 'aria-live': 'polite', 'aria-labelledby': 'uc-walk-h' });

  /* Graph (fixed layout: one column per Gospel, ordered by chapter). */
  const GW = 520;
  const colX = (b: Book) => 80 + BOOKS.indexOf(b) * ((GW - 200) / 3);
  const byBook = new Map<Book, GNode[]>();
  for (const n of nodes) byBook.set(n.book, [...(byBook.get(n.book) ?? []), n]);
  let maxRows = 0;
  for (const [, ns] of byBook) {
    ns.sort((a, b) => a.ch - b.ch || a.ref.localeCompare(b.ref));
    maxRows = Math.max(maxRows, ns.length);
  }
  const GH = 60 + maxRows * 46;
  for (const [b, ns] of byBook) {
    const gap = (GH - 70) / Math.max(1, ns.length);
    ns.forEach((n, i) => {
      n.x = colX(b);
      n.y = 52 + gap * (i + 0.5);
    });
  }
  const gsvg = s('svg', { class: 'uc-svg', viewBox: `0 0 ${GW} ${GH}`, role: 'group', 'aria-label': 'Passages in the four Gospels, linked where one explains the other. Each link is one of the questions listed.' });
  for (const b of BOOKS) {
    gsvg.appendChild(s('text', { x: colX(b), y: 20, 'text-anchor': 'middle', class: 'uc-col' }, b === 'Luke' ? 'Luke · Acts' : b));
    gsvg.appendChild(s('line', { x1: colX(b), x2: colX(b), y1: 30, y2: GH - 8, class: 'uc-colline' }));
  }
  const edgeEls: { e: GEdge; el: SVGGElement }[] = [];
  for (const e of edges) {
    const [p, q] = e.a.x <= e.b.x ? [e.a, e.b] : [e.b, e.a];
    const same = p.x === q.x;
    const d = same
      ? `M${p.x},${p.y} C${p.x + 60},${p.y} ${q.x + 60},${q.y} ${q.x},${q.y}`
      : `M${p.x},${p.y} C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`;
    const it = items.find((i) => i.id === e.item)!;
    const g = s('g', { class: 'uc-edge', tabindex: 0, role: 'button', 'aria-label': `${it.question} (${e.a.ref} and ${e.b.ref})` });
    g.append(s('path', { d, class: 'uc-edge__hit' }), s('path', { d, class: 'uc-edge__line' }));
    g.addEventListener('click', () => choose(e.item, true));
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        choose(e.item, true);
      }
    });
    edgeEls.push({ e, el: g });
    gsvg.appendChild(g);
  }
  const nodeEls: { n: GNode; el: SVGGElement }[] = [];
  for (const n of nodes) {
    const left = n.book === 'Matthew';
    const g = s('g', { class: 'uc-node', transform: `translate(${n.x} ${n.y})` });
    g.append(
      s('circle', { r: 6, style: `fill: ${BOOK_VAR[n.book]}` }),
      s('text', { x: left ? -10 : 10, y: 4, 'text-anchor': left ? 'end' : 'start', class: 'uc-node__label' }, n.ref.startsWith('Acts') ? n.ref : n.ref.replace(/^\S+ /, '')),
    );
    nodeEls.push({ n, el: g });
    gsvg.appendChild(g);
  }
  graphWrap.appendChild(gsvg);

  function choose(id: string, focusWalk = false) {
    current = id;
    shown = 1;
    for (const [k, b] of listBtns) b.setAttribute('aria-pressed', String(k === id));
    for (const { e, el } of edgeEls) el.classList.toggle('is-active', e.item === id);
    for (const { n, el } of nodeEls) el.classList.toggle('is-active', n.items.includes(id));
    renderWalk();
    if (focusWalk && window.matchMedia('(max-width: 900px)').matches) walk.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function renderWalk() {
    clear(walk);
    const it = items.find((i) => i.id === current)!;
    const total = it.steps.length;
    const stepsEl = stepsList(it, shown);
    const next = h('button', { class: 'btn btn--primary', type: 'button' }, shown < total - 1 ? 'Next step' : 'Show the answer');
    next.addEventListener('click', () => {
      shown = Math.min(total, shown + 1);
      renderWalk();
      walk.querySelector<HTMLElement>('.uc-step.is-new')?.focus();
    });
    const all = h('button', { class: 'btn', type: 'button' }, 'Show all steps');
    all.addEventListener('click', () => {
      shown = total;
      renderWalk();
    });
    const again = h('button', { class: 'btn', type: 'button' }, 'Start over');
    again.addEventListener('click', () => {
      shown = 1;
      renderWalk();
    });
    walk.append(
      h('p', { class: 'eyebrow' }, `Question ${items.indexOf(it) + 1} of ${items.length} · step ${shown} of ${total}`),
      h('h2', { id: 'uc-walk-h' }, it.question),
      h('div', { class: `uc-walk__body ${it.map ? 'has-map' : ''}` }, stepsEl, it.map ? h('figure', { class: 'uc-map' }, mapInset(it), h('figcaption', null, 'Schematic; locations approximate. Bethsaida shown at et-Tell, one of two proposed sites.')) : null),
      h('div', { class: 'btn-row uc-walk__nav' }, shown < total ? [next, all] : again),
    );
    walk.querySelectorAll<HTMLElement>('.uc-step').forEach((el) => el.setAttribute('tabindex', '-1'));
  }

  const sk = skepticsFor('coincidences');
  root.append(
    ModuleHeader(
      'Module 6',
      'Undesigned coincidences',
      'Sometimes one Gospel leaves a detail unexplained, and another Gospel, telling a different part of the story, explains it without seeming to notice. Forgers aim for consistency they can see. These fits are the kind nobody arranged.',
    ),
    h(
      'div',
      { class: 'uc-top' },
      h(
        'div',
        { class: 'uc-left' },
        h('h2', { class: 'uc-h' }, 'Pick a question'),
        list,
      ),
      h(
        'div',
        { class: 'uc-right' },
        h('div', { class: 'panel uc-graph-panel' }, graphWrap, Legend(BOOKS.map((b) => ({ label: b === 'Luke' ? 'Luke and Acts' : b, color: BOOK_VAR[b], shape: 'circle' as const })), 'Gospels'), h('p', { class: 'chart-note' }, 'Each line joins a passage that raises a question to the passage that answers it. Select a line or a question.')),
      ),
    ),
    walk,
    h('p', { class: 'chart-note' }, `Quotations: ${data.translation}, trimmed to 30 words or fewer.`),
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList([...data.sources, `${data.translation}`, ...data.map_geo.sources]),
  );
  choose(current);
  // The featured example starts fully expanded.
  shown = items.find((i) => i.id === current)!.steps.length;
  renderWalk();
}
