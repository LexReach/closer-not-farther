// Module 3: Read P66 yourself.
import { h, s, clear } from '../lib/dom';
import { Disclosure, ModuleHeader, SourceList, Toggle } from '../components';
import { skepticsFor, sourceText } from '../data';
import { assetUrl, href } from '../lib/nav';
import p66 from '../../data/p66.json';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Line {
  n: number;
  text: string;
  box: Box;
}
interface Word {
  token: number;
  p66: string;
  line: number;
  nomen_sacrum?: boolean;
}

export const lines = p66.lines as Line[];
export const words = p66.words as Word[];
const tokens = sourceText.tokens;
const img = p66.image as { available: boolean; file: string | null; commons_url: string; license: string; credit: string };
const title = (p66 as { title?: { text: string } }).title;

// Facsimile coordinate system: percent boxes scaled to a 700 × 800 page.
export const VW = 700;
export const VH = 800;

interface Seg {
  token: number | null; // null = text after verse 5 (not linked)
  line: number; // index into lines
  start: number; // char offset within the line
  text: string;
}

/** Split the running line text into per-token segments (a word can wrap). */
function segments(): Seg[] {
  const segs: Seg[] = [];
  let li = 0;
  let off = 0;
  for (const w of words) {
    let rest = w.p66;
    while (rest.length) {
      const avail = lines[li].text.length - off;
      if (avail <= 0) {
        li++;
        off = 0;
        continue;
      }
      const take = rest.slice(0, avail);
      segs.push({ token: w.token, line: li, start: off, text: take });
      off += take.length;
      rest = rest.slice(take.length);
    }
  }
  // Remaining text (John 1:6 onward).
  while (li < lines.length) {
    const t = lines[li].text.slice(off);
    if (t) segs.push({ token: null, line: li, start: off, text: t });
    li++;
    off = 0;
  }
  return segs;
}

export const SEGS = segments();
const NS = new Set(words.filter((w) => w.nomen_sacrum).map((w) => w.token));

export function charBox(line: Line, start: number, len: number): Box {
  const cw = line.box.w / line.text.length;
  return { x: line.box.x + start * cw, y: line.box.y, w: len * cw, h: line.box.h };
}

/** Highlight rectangles (in facsimile coordinates) for every segment of a token. */
export function tokenBoxes(tok: number): SVGRectElement[] {
  const out: SVGRectElement[] = [];
  for (const seg of SEGS) {
    if (seg.token !== tok) continue;
    const b = charBox(lines[seg.line], seg.start, seg.text.length);
    out.push(s('rect', { x: (b.x / 100) * VW - 3, y: (b.y / 100) * VH - 4, width: (b.w / 100) * VW + 6, height: (b.h / 100) * VH + 8, rx: 4, class: 'p66-box' }));
  }
  return out;
}

/* ---------- Facsimile ---------- */

export function facsimile(): { svg: SVGSVGElement; overlay: SVGGElement } {
  const svg = s('svg', {
    class: 'p66-fac',
    viewBox: `0 0 ${VW} ${VH}`,
    role: 'img',
    'aria-label': 'Facsimile rendering of the first lines of P66, page 1: Greek capitals written continuously without spaces, in brown ink on papyrus.',
  });
  const defs = s(
    'defs',
    null,
    s(
      'filter',
      { id: 'p66-fibres', x: '0', y: '0', width: '100%', height: '100%' },
      s('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.004 0.18', numOctaves: 3, seed: 7, result: 'n' }),
      s('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.16  0 0 0 0.32 0' }),
      s('feComposite', { in2: 'SourceGraphic', operator: 'in' }),
    ),
  );
  // Slightly ragged page edge.
  const edge: string[] = [];
  const jag = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
  for (let i = 0; i <= 20; i++) edge.push(`${(i / 20) * (VW - 20) + 10},${10 + Math.abs(jag(i)) * 10}`);
  for (let i = 0; i <= 20; i++) edge.push(`${VW - 10 - Math.abs(jag(i + 40)) * 10},${(i / 20) * (VH - 20) + 10}`);
  for (let i = 20; i >= 0; i--) edge.push(`${(i / 20) * (VW - 20) + 10},${VH - 10 - Math.abs(jag(i + 80)) * 14}`);
  for (let i = 20; i >= 0; i--) edge.push(`${10 + Math.abs(jag(i + 120)) * 8},${(i / 20) * (VH - 20) + 10}`);
  const page = s('polygon', { points: edge.join(' '), class: 'p66-fac__page' });
  const fibres = s('polygon', { points: edge.join(' '), class: 'p66-fac__fibres', filter: 'url(#p66-fibres)' });
  svg.append(defs, page, fibres);
  if (title) {
    svg.appendChild(s('text', { x: VW / 2, y: 0.055 * VH, 'text-anchor': 'middle', class: 'p66-fac__title' }, title.text));
  }
  const ink = s('g', { class: 'p66-fac__ink' });
  lines.forEach((ln) => {
    const cw = (ln.box.w / 100) * VW / ln.text.length;
    const baseY = ((ln.box.y + ln.box.h * 0.82) / 100) * VH;
    [...ln.text].forEach((ch, i) => {
      ink.appendChild(s('text', { x: (ln.box.x / 100) * VW + cw * (i + 0.5), y: baseY, 'text-anchor': 'middle' }, ch));
    });
  });
  // Nomina sacra overlines.
  for (const seg of SEGS) {
    if (seg.token === null || !NS.has(seg.token)) continue;
    const b = charBox(lines[seg.line], seg.start, seg.text.length);
    ink.appendChild(s('line', { x1: (b.x / 100) * VW + 2, x2: ((b.x + b.w) / 100) * VW - 2, y1: (b.y / 100) * VH - 1, y2: (b.y / 100) * VH - 1, class: 'p66-fac__ns' }));
  }
  svg.appendChild(ink);
  const overlay = s('g', { class: 'p66-overlay' });
  svg.appendChild(overlay);
  return { svg, overlay };
}

function photo(): HTMLElement {
  return h(
    'div',
    { class: 'p66-photo' },
    h('img', {
      src: assetUrl(img.file!),
      width: 1920,
      height: 1643,
      loading: 'lazy',
      decoding: 'async',
      alt: 'Photograph of the P66 codex at an angle, with folio 1 recto, the opening of the Gospel of John, on top of the stack.',
    }),
  );
}

/* ---------- Page ---------- */

export function render(root: HTMLElement) {
  let breaks = false;
  let active: number | null = null;
  const fac = facsimile();
  const overlay = fac.overlay;
  const hasPhoto = img.available && !!img.file;
  let photoEl: HTMLElement | null = null;

  const rowPap = h('div', { class: 'p66-row__text p66-pap', lang: 'grc' });
  const rowGk = h('div', { class: 'p66-row__text p66-gk', lang: 'grc', role: 'toolbar', 'aria-label': 'Modern Greek text. Use the left and right arrow keys to move word by word.' });
  const rowEn = h('div', { class: 'p66-row__text p66-en', lang: 'en' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  function highlight(tok: number | null) {
    active = tok;
    root.querySelectorAll<HTMLElement>('[data-tok]').forEach((el) => el.classList.toggle('is-on', tok !== null && Number(el.dataset.tok) === tok));
    clear(overlay);
    if (tok === null) return;
    overlay.append(...tokenBoxes(tok));
    const w = words.find((x) => x.token === tok);
    live.textContent = `${tokens[tok].gk}, “${tokens[tok].en}”, written ${w?.p66 ?? ''} on the papyrus, line ${w?.line ?? ''}.`;
  }

  const bind = (el: HTMLElement, tok: number) => {
    el.dataset.tok = String(tok);
    el.addEventListener('pointerenter', () => highlight(tok));
    el.addEventListener('pointerleave', () => highlight(null));
  };

  function drawPap() {
    clear(rowPap);
    let lastLine = -1;
    for (const seg of SEGS) {
      if (breaks && seg.line !== lastLine && lastLine !== -1) rowPap.appendChild(h('br'));
      if (breaks && seg.line !== lastLine) rowPap.appendChild(h('span', { class: 'p66-ln num', 'aria-hidden': 'true' }, String(lines[seg.line].n)));
      lastLine = seg.line;
      if (seg.token === null) {
        if (breaks) rowPap.appendChild(h('span', { class: 'p66-after' }, seg.text));
        continue;
      }
      const sp = h('span', { class: `p66-w ${NS.has(seg.token) ? 'is-ns' : ''}` }, seg.text);
      bind(sp, seg.token);
      rowPap.appendChild(sp);
    }
    if (!breaks) rowPap.appendChild(h('span', { class: 'p66-after' }, ' …'));
    if (active !== null) highlight(active);
  }

  const gkSpans = tokens.map((t, i) => {
    const b = h('span', { class: 'p66-w', tabindex: i === 0 ? 0 : -1 }, t.gk);
    bind(b, i);
    b.addEventListener('focus', () => highlight(i));
    b.addEventListener('blur', () => highlight(null));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const j = Math.max(0, Math.min(tokens.length - 1, i + d));
      gkSpans[i].tabIndex = -1;
      gkSpans[j].tabIndex = 0;
      gkSpans[j].focus();
    });
    return b;
  });
  gkSpans.forEach((b, i) => rowGk.append(b, i < tokens.length - 1 ? ' ' : ''));
  tokens.forEach((t, i) => {
    const b = h('span', { class: `p66-w ${t.en === '-' ? 'is-untr' : ''}` }, t.en === '-' ? '·' : t.en);
    bind(b, i);
    rowEn.append(b, ' ');
  });

  const breakToggle = Toggle<'run' | 'lines'>({
    label: 'Papyrus row layout',
    hideLabel: true,
    options: [
      { value: 'run', label: 'Running text' },
      { value: 'lines', label: 'Show line breaks as on the page' },
    ],
    value: 'run',
    onChange: (v) => {
      breaks = v === 'lines';
      drawPap();
    },
  });

  const facCaption = h(
    'figcaption',
    null,
    'Facsimile rendering of the first lines of page 1: the text of John 1:1–7 as P66 writes it (capitals, no spaces, ',
    h('span', { class: 'p66-ns-sample' }, 'ΘΣ'),
    ' for God). Line breaks are approximate; the word boxes are drawn here.',
  );
  const photoCaption = h(
    'figcaption',
    null,
    'The codex itself, photographed at an angle, with folio 1 recto on top. ',
    `${img.credit}. ${img.license}. `,
    h('a', { href: img.commons_url, target: '_blank', rel: 'noopener' }, 'File page'),
    ' · ',
    h('a', { href: (img as { source_page?: string }).source_page ?? img.commons_url, target: '_blank', rel: 'noopener' }, 'Bodmer Lab viewer'),
    '.',
  );
  const figure = h('figure', { class: 'p66-fig' }, fac.svg, facCaption);
  const viewToggle = hasPhoto
    ? Toggle<'fac' | 'photo'>({
        label: 'Image',
        hideLabel: true,
        options: [
          { value: 'fac', label: 'Facsimile' },
          { value: 'photo', label: 'Photograph' },
        ],
        value: 'fac',
        onChange: (v) => {
          clear(figure);
          if (v === 'photo') {
            photoEl ??= photo();
            figure.append(photoEl, photoCaption);
          } else figure.append(fac.svg, facCaption);
        },
      }).el
    : '';

  const m = p66.manuscript;
  const sk = skepticsFor('p66');
  root.append(
    ModuleHeader(
      'Module 3',
      'Read P66 yourself',
      'P66 is a papyrus book of John copied around 200 AD, now in the Bodmer Library near Geneva. Its first page is readable against a modern Greek New Testament almost word for word. Hover or focus a word to find it in all three rows and on the page.',
    ),
    h(
      'div',
      { class: 'p66-grid' },
      h('div', { class: 'p66-figwrap' }, viewToggle, figure),
      h(
        'div',
        { class: 'p66-rows' },
        h(
          'dl',
          { class: 'p66-meta' },
          h('div', null, h('dt', null, 'Manuscript'), h('dd', null, `${m.ga}, ${m.name}`)),
          h('div', null, h('dt', null, 'Date'), h('dd', null, 'c. 200 AD (range 150–250; some argue later)')),
          h('div', null, h('dt', null, 'Held at'), h('dd', null, 'Fondation Martin Bodmer, Cologny · ', h('a', { href: href('/library#ms=P66'), 'data-link': true }, 'Open in the Library'))),
          h('div', null, h('dt', null, 'Passage'), h('dd', null, `${sourceText.reference} (${tokens.length} words)`)),
        ),
        h('section', { class: 'p66-row' }, h('div', { class: 'p66-row__head' }, h('h2', null, 'On the papyrus'), breakToggle.el), rowPap),
        h('section', { class: 'p66-row' }, h('div', { class: 'p66-row__head' }, h('h2', null, 'Modern edition (SBLGNT)')), rowGk),
        h('section', { class: 'p66-row' }, h('div', { class: 'p66-row__head' }, h('h2', null, 'English, word by word')), rowEn),
        h(
          'p',
          { class: 'chart-note' },
          'The papyrus row gives the modern wording in P66’s style: capitals, no spaces or accents, and the abbreviated divine names. It does not reproduce P66’s own spellings, corrections or its occasional differing readings, so treat it as a guide to reading the page, not a transcription.',
        ),
        live,
      ),
    ),
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList([...sourceText.sources, ...p66.sources.filter((x: string) => !x.startsWith('General scholarly') && !x.includes('sblgnt'))]),
  );
  drawPap();
}
