// The Library: every catalogued Greek New Testament manuscript. A century
// histogram that is also a filter, live counters, facets and search (all in the
// URL hash), a virtualized grid, and a detail view that streams page images
// from the holding institution through IIIF. Images are never copied here.
import '../styles/library.css';
import { h, s, clear, reducedMotion } from '../lib/dom';
import { href } from '../lib/nav';
import { ModuleHeader, SourceList, Tooltip } from '../components';
import mss from '../../data/manuscripts.json';
import variants from '../../data/variants.json';
import {
  CAT_LABEL,
  CAT_ONE,
  CAT_VAR,
  CONTENTS,
  centuryLabel,
  contentsLabel,
  csntmUrl,
  gaLabel,
  intfUrl,
  loadLibrary,
  thumbUrl,
  type Cat,
  type LibraryData,
  type Ms,
} from '../library/data';
import { Counters, Shelf, countByCat } from '../library/shelf';
import type { ViewerApi } from '../library/viewer';

const CATS: Cat[] = ['P', 'M', 'm', 'L'];
const CENTURIES = Array.from({ length: 16 }, (_, i) => i + 1);

interface Filters {
  q: string;
  cats: Set<Cat>;
  century: number | null;
  contents: Set<string>;
  country: string;
  img: boolean;
}

/** Each manuscript is counted once, at the midpoint century of its date range. */
const centuryOf = (m: Ms) => (m.c0 == null ? null : m.c1 != null ? Math.floor((m.c0 + m.c1) / 2) : m.c0);

// Cross-links to the rest of the site.
function crossLinks(): Map<string, { path: string; label: string }[]> {
  const out = new Map<string, { path: string; label: string }[]>();
  const add = (ga: string, path: string, label: string) => {
    const list = out.get(ga) ?? [];
    if (!list.some((x) => x.path === path)) list.push({ path, label });
    out.set(ga, list);
  };
  for (const w of mss.witnesses) add(w.ga.replace(/^f13-/, ''), '/timeline', 'On the discovery timeline (Module 2)');
  for (const w of variants.witnesses) if (w.id !== 'Byz') add(w.id, '/variants', 'Cited as a witness in the variant explorer (Module 4)');
  add('P66', '/p66', 'Read its first page in Module 3');
  return out;
}

function readHash(): { f: Filters; ms: string | null } {
  const q = new URLSearchParams(location.hash.slice(1));
  const list = (k: string) => (q.get(k) ?? '').split(',').filter(Boolean);
  const c = Number(q.get('c'));
  return {
    f: {
      q: q.get('q') ?? '',
      cats: new Set(list('cat').filter((x): x is Cat => (CATS as string[]).includes(x))),
      century: c >= 1 && c <= 16 ? c : null,
      contents: new Set(list('cont').filter((x) => CONTENTS.some((y) => y.key === x))),
      country: q.get('country') ?? '',
      img: q.get('img') === '1',
    },
    ms: q.get('ms'),
  };
}

function writeHash(f: Filters, ms: string | null) {
  const q = new URLSearchParams();
  if (f.q) q.set('q', f.q);
  if (f.cats.size) q.set('cat', [...f.cats].join(','));
  if (f.century) q.set('c', String(f.century));
  if (f.contents.size) q.set('cont', [...f.contents].join(','));
  if (f.country) q.set('country', f.country);
  if (f.img) q.set('img', '1');
  if (ms) q.set('ms', ms);
  const hs = q.toString();
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hs ? `#${hs}` : ''}`);
}

function matches(m: Ms, f: Filters, lib: LibraryData, skipCentury = false): boolean {
  if (f.cats.size && !f.cats.has(m.cat)) return false;
  if (!skipCentury && f.century && centuryOf(m) !== f.century) return false;
  if (f.contents.size) {
    if (!m.contents) return false;
    for (const k of f.contents) if (!m.contents.includes(k)) return false;
  }
  if (f.country && m.country !== f.country) return false;
  if (f.img && !lib.images[m.ga]) return false;
  if (f.q) {
    const q = f.q.toLowerCase().replace(/^ga\s*/, '').replace(/^ℓ\s*/, 'l');
    const hay = `${m.ga} ${m.name ?? ''} ${m.inst ?? ''} ${m.city ?? ''} ${m.shelf ?? ''}`.toLowerCase();
    if (m.ga.toLowerCase() !== q && !hay.includes(q)) return false;
  }
  return true;
}

export function render(root: HTMLElement) {
  const loading = h('p', { class: 'muted lib-loading' }, 'Opening the catalogue…');
  root.append(
    ModuleHeader(
      'The Library',
      'Here they are',
      'Every catalogued Greek New Testament manuscript, from second-century papyrus scraps to medieval lectionaries. Where the library that holds a manuscript publishes images openly, you can open it here, page by page.',
    ),
    loading,
  );
  let cleanup: (() => void) | null = null;
  let dead = false;
  loadLibrary().then((lib) => {
    if (dead) return;
    loading.remove();
    cleanup = build(root, lib);
  });
  return () => {
    dead = true;
    cleanup?.();
  };
}

function build(root: HTMLElement, lib: LibraryData): () => void {
  const init = readHash();
  const f = init.f;
  const cross = crossLinks();
  let results: Ms[] = [];

  /* ----- Featured shelf ----- */
  const shelf = Shelf(lib, (ga) => openDetail(ga));

  /* ----- Counters + histogram ----- */
  const counters = Counters(lib);
  const histWrap = h('div', { class: 'lib-hist' });

  function drawHist() {
    clear(histWrap);
    const W = Math.max(280, histWrap.clientWidth || 640);
    const H = 170;
    const m = { top: 12, bottom: 24, left: 4, right: 4 };
    const pool = lib.rows.filter((r) => matches(r, f, lib, true));
    const by = CENTURIES.map((c) => {
      const row: Record<Cat, number> = { P: 0, M: 0, m: 0, L: 0 };
      for (const r of pool) if (centuryOf(r) === c) row[r.cat]++;
      return row;
    });
    const max = Math.max(1, ...by.map((r) => r.P + r.M + r.m + r.L));
    const bw = (W - m.left - m.right) / CENTURIES.length;
    const y = (v: number) => ((H - m.top - m.bottom) * v) / max;
    const svg = s('svg', { class: 'chart lib-hist__svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Manuscripts by century, stacked by category. Select a century to filter.' });
    CENTURIES.forEach((c, i) => {
      const row = by[i];
      const total = row.P + row.M + row.m + row.L;
      const x = m.left + i * bw;
      const g = s('g', {
        class: `lib-hist__bar ${f.century === c ? 'is-on' : ''} ${f.century && f.century !== c ? 'is-off' : ''}`,
        tabindex: 0,
        role: 'button',
        'aria-pressed': String(f.century === c),
        'aria-label': `${c}${['st', 'nd', 'rd'][c - 1] ?? 'th'} century: ${total} manuscripts`,
      });
      g.appendChild(s('rect', { x, y: m.top, width: bw, height: H - m.top - m.bottom, class: 'lib-hist__hit' }));
      let acc = 0;
      for (const cat of CATS) {
        const v = row[cat];
        if (!v) continue;
        const hgt = y(v);
        g.appendChild(s('rect', { x: x + 2, y: H - m.bottom - acc - hgt, width: Math.max(1, bw - 4), height: hgt, style: `fill: ${CAT_VAR[cat]}` }));
        acc += hgt;
      }
      if (i % (W < 480 ? 3 : 1) === 0 || c === 16) g.appendChild(s('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle' }, String(c)));
      const toggle = () => {
        f.century = f.century === c ? null : c;
        update();
      };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
      const tip = () =>
        h('div', null, h('p', null, h('strong', null, `${c}${['st', 'nd', 'rd'][c - 1] ?? 'th'} century`), ` · ${total.toLocaleString('en-US')}`), ...CATS.filter((k) => row[k]).map((k) => h('p', { class: 'tt-muted' }, `${CAT_LABEL[k]}: ${row[k]}`)));
      g.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
      g.addEventListener('pointerleave', () => Tooltip.hide());
      svg.appendChild(g);
    });
    histWrap.append(svg, h('p', { class: 'chart-note' }, 'Century (each manuscript counted once, at the middle of its date range). Select a bar to filter; select it again to clear.'));
  }

  /* ----- Facets ----- */
  const search = h('input', { type: 'search', class: 'lib-search', placeholder: 'Search by GA number, name or library (e.g. P66, Sinaiticus, Vatican)', value: f.q, 'aria-label': 'Search manuscripts' });
  let st = 0;
  search.addEventListener('input', () => {
    window.clearTimeout(st);
    st = window.setTimeout(() => {
      f.q = search.value.trim();
      update();
    }, 160);
  });
  const chip = (label: string, on: () => boolean, flip: () => void, extra = '') => {
    const b = h('button', { type: 'button', class: `lib-chip ${extra}`, 'aria-pressed': String(on()) }, label);
    b.addEventListener('click', () => {
      flip();
      update();
    });
    return b;
  };
  const catChips = CATS.map((c) => chip(CAT_LABEL[c], () => f.cats.has(c), () => (f.cats.has(c) ? f.cats.delete(c) : f.cats.add(c)), `lib-chip--${c}`));
  const contChips = CONTENTS.map((c) => chip(c.label, () => f.contents.has(c.key), () => (f.contents.has(c.key) ? f.contents.delete(c.key) : f.contents.add(c.key))));
  const countries = [...lib.rows.reduce((acc, r) => (r.country ? acc.set(r.country, (acc.get(r.country) ?? 0) + 1) : acc), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const countrySel = h(
    'select',
    { class: 'lib-select', 'aria-label': 'Country of the holding library' },
    h('option', { value: '' }, 'Any country'),
    countries.map(([c, n]) => h('option', { value: c, selected: c === f.country }, `${c} (${n})`)),
  );
  countrySel.addEventListener('change', () => {
    f.country = countrySel.value;
    update();
  });
  const imgBox = h('input', { type: 'checkbox', checked: f.img });
  imgBox.addEventListener('change', () => {
    f.img = imgBox.checked;
    update();
  });
  const clearBtn = h('button', { type: 'button', class: 'btn btn--small' }, 'Clear filters');
  clearBtn.addEventListener('click', () => {
    f.q = '';
    search.value = '';
    f.cats.clear();
    f.century = null;
    f.contents.clear();
    f.country = '';
    countrySel.value = '';
    f.img = false;
    imgBox.checked = false;
    update();
  });
  const resultLine = h('p', { class: 'lib-result', 'aria-live': 'polite' });

  /* ----- Virtualized grid ----- */
  const grid = h('div', { class: 'lib-grid', role: 'region', 'aria-label': 'Manuscripts matching the filters' });
  const live = new Map<number, HTMLElement>();
  let cols = 4;
  let tileW = 200;
  let rowH = 280;
  const GAP = 12;
  let raf = 0;

  function measure() {
    const W = grid.clientWidth || 800;
    const min = W < 520 ? 150 : 180;
    cols = Math.max(2, Math.floor((W + GAP) / (min + GAP)));
    tileW = (W - GAP * (cols - 1)) / cols;
    rowH = Math.round(tileW * 1.2 + 64 + GAP);
    grid.style.height = `${Math.ceil(results.length / cols) * rowH}px`;
  }

  const typeCard = (m: Ms) => h('div', { class: 'lib-tile__type' }, h('span', { class: 'lib-tile__ga' }, gaLabel(m.ga)), h('span', { class: 'lib-tile__cent' }, centuryLabel(m)));

  function tile(m: Ms, i: number): HTMLElement {
    const src = lib.images[m.ga];
    const img = thumbUrl(src, 400);
    const a = h(
      'a',
      { class: `lib-tile ${img ? 'has-img' : ''} lib-tile--${m.cat}`, href: `#ms=${encodeURIComponent(m.ga)}`, 'data-ga': m.ga },
      h(
        'div',
        { class: 'lib-tile__media' },
        img
          ? h('img', {
              src: img,
              alt: '',
              loading: 'lazy',
              decoding: 'async',
              referrerpolicy: 'no-referrer',
              // If the library's server does not answer, fall back to the typographic card.
              onerror: (e: Event) => (e.target as HTMLElement).replaceWith(typeCard(m)),
            })
          : typeCard(m),
        img ? h('span', { class: 'lib-tile__badge' }, 'Images') : '',
      ),
      h(
        'div',
        { class: 'lib-tile__cap' },
        h('span', { class: 'lib-tile__title' }, h('strong', { class: 'num' }, gaLabel(m.ga)), m.name ? ` ${m.name}` : ''),
        h('span', { class: 'lib-tile__meta' }, `${centuryLabel(m)}${m.inst ? ` · ${m.inst}` : ''}`),
      ),
    );
    a.style.transform = `translate(${(i % cols) * (tileW + GAP)}px, ${Math.floor(i / cols) * rowH}px)`;
    a.style.width = `${tileW}px`;
    a.style.height = `${rowH - GAP}px`;
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      openDetail(m.ga);
    });
    return a;
  }

  function paint() {
    raf = 0;
    const r = grid.getBoundingClientRect();
    const vh = window.innerHeight;
    const first = Math.max(0, Math.floor(-r.top / rowH) - 2);
    const last = Math.min(Math.ceil(results.length / cols), Math.ceil((vh - r.top) / rowH) + 2);
    const want = new Set<number>();
    for (let row = first; row < last; row++) for (let c = 0; c < cols; c++) {
      const i = row * cols + c;
      if (i < results.length) want.add(i);
    }
    for (const [i, el] of live) if (!want.has(i)) {
      el.remove();
      live.delete(i);
    }
    const frag = document.createDocumentFragment();
    for (const i of want) if (!live.has(i)) {
      const el = tile(results[i], i);
      live.set(i, el);
      frag.appendChild(el);
    }
    grid.appendChild(frag);
  }
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  function relayout() {
    for (const el of live.values()) el.remove();
    live.clear();
    measure();
    paint();
  }

  /* ----- Detail dialog ----- */
  const dialog = h('dialog', { class: 'lib-dialog', 'aria-labelledby': 'lib-d-h' }) as HTMLDialogElement;
  let viewer: ViewerApi | null = null;
  let openGa: string | null = null;

  function closeDetail() {
    viewer?.destroy();
    viewer = null;
    openGa = null;
    if (dialog.open) dialog.close();
    writeHash(f, null);
  }
  dialog.addEventListener('close', () => {
    if (openGa) closeDetail();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDetail();
  });

  function openDetail(ga: string) {
    const m = lib.byGa.get(ga);
    if (!m) return;
    viewer?.destroy();
    viewer = null;
    openGa = ga;
    clear(dialog);
    const src = lib.images[ga];
    const feat = lib.featured.find((x) => x.ga === ga);
    const links = cross.get(ga) ?? [];
    const closeBtn = h('button', { type: 'button', class: 'lib-dialog__close', 'aria-label': 'Close' }, '×');
    closeBtn.addEventListener('click', closeDetail);
    const row = (k: string, v: unknown) => (v ? h('div', null, h('dt', null, k), h('dd', null, v as Node)) : '');
    const ext = (url: string, label: string) => h('a', { href: url, target: '_blank', rel: 'noopener' }, label);
    const body = h(
      'div',
      { class: 'lib-dialog__body' },
      h(
        'header',
        { class: 'lib-dialog__head' },
        h('p', { class: 'eyebrow' }, `${CAT_ONE[m.cat]} · Gregory–Aland ${gaLabel(m.ga)}`),
        h('h2', { id: 'lib-d-h' }, m.name ?? `${CAT_ONE[m.cat]} ${gaLabel(m.ga)}`),
        closeBtn,
      ),
      feat ? h('aside', { class: 'lib-story' }, h('p', null, feat.story), h('p', { class: 'lib-story__meta' }, `${feat.date} · ${feat.contents} · ${feat.holding}`)) : '',
      src ? '' : h('p', { class: 'lib-noimg' }, 'No openly licensed page images for this manuscript are listed. The links below go to the holding library, the INTF and the CSNTM, which may have images or descriptions.'),
      h(
        'dl',
        { class: 'lib-meta' },
        row('Date', centuryLabel(m)),
        row('Contents', contentsLabel(m.contents)),
        row('Held by', m.inst ? [m.inst, m.city || m.country ? `, ${[m.city, m.country].filter(Boolean).join(', ')}` : ''].join('') : null),
        row('Shelfmark', m.shelf),
        row('Image rights', src ? (src.rights ?? src.license ?? 'As stated by the holding institution') : null),
        row('Image served by', src ? (src.institution ?? (src.kind === 'commons' ? 'Wikimedia Commons' : null)) : null),
      ),
      h(
        'p',
        { class: 'lib-links' },
        src?.link ? [ext(src.link, 'Holding library'), ' · '] : feat?.links?.institution ? [ext(feat.links.institution, 'Holding library'), ' · '] : '',
        ext(intfUrl(m.ga), 'INTF record'),
        ' · ',
        ext(csntmUrl(m.ga), 'CSNTM'),
        m.qid ? [' · ', ext(`https://www.wikidata.org/wiki/${m.qid}`, 'Wikidata')] : '',
        src?.manifest ? [' · ', ext(src.manifest, 'IIIF manifest')] : '',
        src?.kind === 'commons' && src.file ? [' · ', ext(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(src.file.replace(/^File:/, ''))}`, 'Commons file')] : '',
      ),
      links.length ? h('p', { class: 'lib-cross' }, 'Elsewhere on this site: ', links.map((l, i) => [i ? ' · ' : '', h('a', { href: href(l.path), 'data-link': true }, l.label)])) : '',
    );
    dialog.append(body);
    if (src) {
      import('../library/viewer').then(({ Viewer }) => {
        if (openGa !== ga) return;
        viewer = Viewer(src, m.name ?? gaLabel(m.ga));
        body.insertBefore(viewer.el, body.querySelector('.lib-meta'));
      });
    }
    // During the guided tour the dialog opens non-modally so the caption card stays on top.
    if (!dialog.open) document.body.classList.contains('is-touring') ? dialog.show() : dialog.showModal();
    writeHash(f, ga);
  }

  /* ----- Update ----- */
  function update(first = false) {
    results = lib.rows.filter((r) => matches(r, f, lib));
    catChips.forEach((b, i) => b.setAttribute('aria-pressed', String(f.cats.has(CATS[i]))));
    contChips.forEach((b, i) => b.setAttribute('aria-pressed', String(f.contents.has(CONTENTS[i].key))));
    counters.set(countByCat(results), true);
    const withImg = results.filter((r) => lib.images[r.ga]).length;
    resultLine.textContent = `${results.length.toLocaleString('en-US')} of ${lib.rows.length.toLocaleString('en-US')} manuscripts · ${withImg.toLocaleString('en-US')} with page images`;
    drawHist();
    if (!first) window.scrollTo({ top: Math.min(window.scrollY, grid.offsetTop - 200), behavior: 'auto' });
    relayout();
    writeHash(f, openGa);
  }

  const imgTotal = Object.keys(lib.images).length;
  const iiifTotal = Object.values(lib.images).filter((x) => x.kind === 'iiif').length;
  const byInst = Object.entries(lib.imageCounts?.byInstitution ?? {}).sort((a, b) => b[1] - a[1]);

  root.append(
    h(
      'section',
      { class: 'section lib-featured', 'aria-labelledby': 'lib-f-h' },
      h('h2', { id: 'lib-f-h' }, 'Twenty-five that carry the argument'),
      h('p', { class: 'muted measure' }, 'The papyri and codices this site keeps returning to. Open one for its story and, where the holding library publishes them, its pages.'),
      shelf,
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'lib-all-h' },
      h('h2', { id: 'lib-all-h' }, 'The whole catalogue'),
      h('div', { class: 'lib-top panel' }, histWrap, counters.el),
      h(
        'div',
        { class: 'lib-facets' },
        search,
        h('div', { class: 'lib-facet', role: 'group', 'aria-label': 'Category' }, catChips),
        h('div', { class: 'lib-facet', role: 'group', 'aria-label': 'Contents' }, contChips),
        h('div', { class: 'lib-facet' }, countrySel, h('label', { class: 'lib-check' }, imgBox, ' Has page images'), clearBtn),
      ),
      resultLine,
      grid,
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'lib-about-h' },
      h('h2', { id: 'lib-about-h' }, 'Where this comes from'),
      h(
        'p',
        { class: 'measure' },
        `The catalogue lists ${lib.rows.length.toLocaleString('en-US')} manuscripts (${CATS.map((c) => `${(lib.counts[c] ?? countByCat(lib.rows)[c]).toLocaleString('en-US')} ${CAT_LABEL[c].toLowerCase()}`).join(', ')}), assembled from Wikidata items with a Gregory–Aland number and the Wikipedia lists of New Testament manuscripts, cross-checked against the INTF Liste. ${imgTotal ? `${imgTotal.toLocaleString('en-US')} have page images you can open here: ${iiifTotal.toLocaleString('en-US')} streamed from the holding institution through IIIF and ${(imgTotal - iiifTotal).toLocaleString('en-US')} from Wikimedia Commons.` : ''} Images are served by the libraries that hold them, under their own terms; none is copied into this site.`,
      ),
      byInst.length ? h('p', { class: 'chart-note measure' }, 'Images by institution: ', byInst.map(([k, v]) => `${k} (${v})`).join(', '), '.') : '',
      h('p', { class: 'chart-note' }, `Catalogue generated ${lib.generated}. Regenerate with the scripts in scripts/library/ (see the README).`),
      SourceList([...lib.sources, ...lib.imageSources], 'Data sources'),
    ),
    dialog,
  );

  measure();
  update(true);
  if (init.ms) openDetail(init.ms);
  const onScroll = () => schedule();
  window.addEventListener('scroll', onScroll, { passive: true });
  let lastW = grid.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(grid.clientWidth - lastW) > 4) {
      lastW = grid.clientWidth;
      relayout();
      drawHist();
    }
  });
  ro.observe(grid);
  const onHash = () => {
    const hs = readHash();
    if (hs.ms && hs.ms !== openGa) openDetail(hs.ms);
  };
  window.addEventListener('hashchange', onHash);
  void reducedMotion;
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('hashchange', onHash);
    ro.disconnect();
    viewer?.destroy();
    if (dialog.open) dialog.close();
  };
}
