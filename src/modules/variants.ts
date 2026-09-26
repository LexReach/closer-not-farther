// Module 4: The 110% puzzle.
import * as d3 from 'd3';
import { h, s, clear, fmtInt, fmtPct } from '../lib/dom';
import { navigate } from '../lib/nav';
import { Disclosure, Legend, ModuleHeader, SourceList, StatTile, Toggle, Tooltip } from '../components';
import { skepticsFor } from '../data';
import data from '../../data/variants.json';

interface Witness {
  id: string;
  label: string;
  century: number;
}
interface Reading {
  key: boolean;
  greek: string;
  english: string;
  label: string;
}
interface Passage {
  id: string;
  ref: string;
  title: string;
  disputed_text: string;
  context_before: string;
  context_after: string;
  contains: Record<string, boolean | null>;
  explanation: string;
  doctrine_impact: string;
  category: string;
  witness_notes?: Record<string, string>;
  verified?: string;
  contains_label?: string;
  readings?: Reading[];
  printed?: boolean;
}

const witnesses = data.witnesses as Witness[];
export const passages = data.passages as unknown as Passage[];
const cats = data.categories;

const isRef = (t: string) => /^[1-3]?\s?[A-Z][a-z]+ \d+:\d+$/.test(t.trim()) || /^\(.*\)$/.test(t.trim());
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const centuryLabel = (c: number) => `${ordinal(Math.round(c))} c.`;


/** Fill `text` with the passage, the disputed portion included or excluded. */
export function passageText(text: HTMLElement, p: Passage, include: boolean) {
  clear(text);
  const rd = p.readings;
  const ctx = (t: string) => (isRef(t) ? h('span', { class: 'var-ctx-ref' }, `[${t.replace(/[()]/g, '')}]`) : h('span', { class: 'var-ctx' }, t));
  let middle: Node;
  if (rd) {
    const r = rd.find((x) => x.key === include)!;
    middle = h('mark', { class: 'var-disputed' }, h('span', { class: 'greek', lang: 'grc' }, r.greek), ` (${r.english})`);
  } else if (include) {
    middle = h('mark', { class: 'var-disputed' }, p.disputed_text);
  } else {
    middle = h('span', { class: 'var-gap', title: 'Excluded; in most modern Bibles this sits in a footnote' }, '⌃', h('span', { class: 'visually-hidden' }, 'disputed text excluded'));
  }
  text.append(ctx(p.context_before), ' ', middle, ' ', ctx(p.context_after));
}

export function witnessChart(p: Passage, wrap: HTMLElement, opts: { big?: boolean } = {}) {
  clear(wrap);
  const big = !!opts.big;
  const W = Math.max(300, wrap.clientWidth || 700);
  const narrow = W < 520 && !big;
  const labelW = big ? 270 : narrow ? 104 : 150;
  const rowH = big ? 60 : 28;
  const top = big ? 70 : 42;
  const H = top + witnesses.length * rowH + 8;
  const x = d3.scaleLinear().domain([2, 10]).range([labelW + 10, W - (big ? 200 : narrow ? 12 : 84)]);
  const reading = p.readings;
  const yes = reading ? reading.find((r) => r.key)!.label : 'Includes it';
  const no = reading ? reading.find((r) => !r.key)!.label : 'Lacks it';
  const svg = s('svg', {
    class: `chart wit-chart ${big ? 'chart--big' : ''}`,
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    role: 'list',
    'aria-label': `Witnesses for ${p.ref}, placed by century.`,
  });
  for (let c = 2; c <= 10; c++) {
    svg.append(
      s('line', { x1: x(c), x2: x(c), y1: top - 6, y2: H - 6, class: 'gridline' }),
      c < 10 ? s('text', { x: (x(c) + x(c + 1)) / 2, y: top - 10, 'text-anchor': 'middle' }, narrow || x(3) - x(2) < (big ? 120 : 50) ? String(c) : centuryLabel(c)) : '',
    );
  }
  svg.appendChild(s('text', { x: labelW + 10, y: big ? 28 : 12, class: 'axis-label' }, narrow ? 'Century copied →' : 'Century the manuscript was copied →'));
  witnesses.forEach((w, i) => {
    const v = p.contains[w.id];
    const y = top + i * rowH + rowH / 2;
    const cx = x(Math.floor(w.century) + 0.5 + (w.century % 1 ? (w.century % 1) - 0.5 : 0));
    const state = v === true ? 'yes' : v === false ? 'no' : 'na';
    const stateText = v === true ? yes : v === false ? no : 'Not extant here';
    const note = p.witness_notes?.[w.id];
    const g = s('g', { class: `wit wit--${state}`, tabindex: 0, role: 'listitem', 'aria-label': `${w.label}, ${centuryLabel(w.century)}: ${stateText}.${note ? ` ${note}` : ''}` });
    g.append(
      s('rect', { x: 0, y: y - rowH / 2 + 1, width: W, height: rowH - 2, class: 'namebar__hit' }),
      s('text', { x: labelW, y: y + (big ? 10 : 4), 'text-anchor': 'end', class: 'wit__label' }, `${narrow ? w.label.replace(' majority', '') : w.label}${note ? ' †' : ''}`),
      s('line', { x1: labelW + 10, x2: cx, y1: y, y2: y, class: 'wit__stem' }),
      s('circle', { cx, cy: y, r: big ? 14 : 7, class: 'wit__dot' }),
      !narrow ? s('text', { x: cx + (big ? 26 : 12), y: y + (big ? 10 : 4), class: 'wit__state' }, stateText) : '',
    );
    const tip = () =>
      h(
        'div',
        null,
        h('p', null, h('strong', null, w.label), ` (${centuryLabel(w.century)})`),
        h('p', null, stateText),
        note ? h('p', { class: 'tt-muted' }, note) : null,
        h('p', { class: 'tt-muted' }, 'Source: NA28 and SBLGNT apparatus; Metzger, Textual Commentary'),
      );
    g.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
    g.addEventListener('pointerleave', () => Tooltip.hide());
    g.addEventListener('focus', () => Tooltip.showFor(tip(), g));
    g.addEventListener('blur', () => Tooltip.hide());
    if (w.id !== 'Byz' && !big) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => navigate(`/library#ms=${encodeURIComponent(w.id)}`));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate(`/library#ms=${encodeURIComponent(w.id)}`);
      });
    }
    svg.appendChild(g);
  });
  wrap.append(
    svg,
    Legend(
      [
        { label: yes, color: 'var(--accent)', shape: 'circle' },
        { label: no, color: 'var(--wit-no)', shape: 'circle' },
        { label: 'Not extant for this passage', color: 'var(--rule)', shape: 'circle' },
      ],
      'Witness key',
    ),
  );
}

/** All ~400,000 variants as one bar, split by kind; the meaningful-and-viable
 *  sliver is pulled out below and annotated, since it is the point. */
export function variantBar(wrap: HTMLElement, opts: { big?: boolean } = {}) {
  clear(wrap);
  const big = !!opts.big;
  const W = Math.max(300, wrap.clientWidth || 700);
  const narrow = W < 560 && !big;
  const items = [...cats.breakdown].sort((a, b) => b.share - a.share);
  const total = cats.total_variants_estimate;
  const barY = big ? 70 : 44;
  const barH = big ? 90 : narrow ? 46 : 56;
  const pullY = barY + barH + (big ? 90 : 64);
  const H = pullY + (big ? 150 : 96);
  const x = d3.scaleLinear().domain([0, 1]).range([0, W]);
  const cls = (b: (typeof items)[number]) => (b.meaningful ? (b.viable ? 'tm--mv' : 'tm--m') : b.viable ? 'tm--v' : 'tm--none');
  const svg = s('svg', { class: `chart vbar ${big ? 'chart--big' : ''}`, width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'list', 'aria-label': `About ${fmtInt(total)} variants, by kind` });
  svg.appendChild(s('text', { x: 0, y: big ? 34 : 18, class: 'axis-label' }, `≈ ${fmtInt(total)} variants (estimate)`));
  let acc = 0;
  let pulled: { x0: number; x1: number; b: (typeof items)[number] } | null = null;
  for (const b of items) {
    const x0 = x(acc);
    const x1 = x(acc + b.share);
    acc += b.share;
    const w = x1 - x0;
    const g = s('g', { class: `tm__cell ${cls(b)}`, tabindex: 0, role: 'listitem', 'aria-label': `${b.type}: about ${fmtPct(b.share)}, roughly ${fmtInt(b.share * total)} variants` });
    g.appendChild(s('rect', { x: x0, y: barY, width: Math.max(1, w - 2), height: barH, rx: 2 }));
    if (w > (big ? 150 : 70)) {
      g.appendChild(s('text', { x: x0 + (big ? 16 : 10), y: barY + (big ? 38 : 24), class: 'tm__pct' }, `≈ ${fmtPct(b.share)}`));
      if (w > (big ? 420 : 200)) g.appendChild(s('text', { x: x0 + (big ? 16 : 10), y: barY + (big ? 74 : 44), class: 'tm__label' }, b.type.split(' (')[0]));
    }
    if (b.meaningful && b.viable) pulled = { x0, x1, b };
    const tip = () =>
      h(
        'div',
        null,
        h('p', null, h('strong', null, b.type)),
        h('p', null, `About ${fmtPct(b.share)} of variants, roughly ${fmtInt(b.share * total)}`),
        h('p', { class: 'tt-muted' }, `${b.meaningful ? 'Affects meaning' : 'Does not affect meaning'}; ${b.viable ? 'has a real claim to be original' : 'no real claim to be original'}. Estimate (Wallace).`),
      );
    g.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
    g.addEventListener('pointerleave', () => Tooltip.hide());
    g.addEventListener('focus', () => Tooltip.showFor(tip(), g));
    g.addEventListener('blur', () => Tooltip.hide());
    svg.appendChild(g);
  }
  if (pulled) {
    // The 1% slice, pulled out below the bar and enlarged.
    const pw = Math.min(W * 0.62, big ? 900 : 420);
    const px = Math.max(0, Math.min(W - pw, pulled.x1 - pw));
    svg.append(
      s('path', { d: `M${pulled.x0},${barY + barH} L${px},${pullY} M${pulled.x1},${barY + barH} L${px + pw},${pullY}`, class: 'vbar__lead' }),
      s('rect', { x: px, y: pullY, width: pw, height: big ? 64 : 34, rx: 3, class: 'vbar__pull tm--mv' }),
      s('text', { x: px + (big ? 18 : 10), y: pullY + (big ? 44 : 23), class: 'vbar__pull-t' }, `≈ ${fmtPct(pulled.b.share)} · about ${fmtInt(pulled.b.share * total)}`),
      s('text', { x: px, y: pullY + (big ? 110 : 56), class: 'vbar__note' }, narrow ? 'Change the meaning and could be original.' : 'Change the meaning and could be original. These are the ones in your footnotes.'),
    );
  }
  wrap.append(
    svg,
    h(
      'ul',
      { class: 'tm-key' },
      items.map((b) =>
        h('li', null, h('span', { class: `tm-key__sw ${cls(b)}`, 'aria-hidden': 'true' }), h('span', null, b.type), h('span', { class: 'num muted' }, ` ≈ ${fmtPct(b.share)} · about ${fmtInt(b.share * total)}`)),
      ),
    ),
  );
}

export function render(root: HTMLElement) {
  let cur = passages[0];
  let include = true;
  const picker = h('div', { class: 'var-picker', role: 'group', 'aria-label': 'Choose a passage' });
  const btns = passages.map((p) => {
    const b = h('button', { class: 'var-pick', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'var-pick__ref' }, p.ref), h('span', { class: 'var-pick__t' }, p.title));
    b.addEventListener('click', () => {
      cur = p;
      include = true;
      renderPassage();
    });
    picker.appendChild(b);
    return { p, b };
  });

  const detail = h('div', { class: 'var-detail panel' });
  const witWrap = h('div', { class: 'chart-wrap' });
  const tmWrap = h('div', { class: 'chart-wrap' });

  function renderPassage() {
    for (const { p, b } of btns) b.setAttribute('aria-pressed', String(p === cur));
    clear(detail);
    const p = cur;
    const rd = p.readings;
    const toggle = Toggle<'in' | 'out'>({
      label: rd ? 'Reading' : 'Disputed text',
      options: rd
        ? [
            { value: 'in', label: `${rd.find((r) => r.key)!.label}${p.printed === true ? ' (printed)' : ''}` },
            { value: 'out', label: `${rd.find((r) => !r.key)!.label}${p.printed === false ? ' (printed)' : ''}` },
          ]
        : [
            { value: 'in', label: 'Include' },
            { value: 'out', label: 'Exclude' },
          ],
      value: include ? 'in' : 'out',
      onChange: (v) => {
        include = v === 'in';
        drawText();
      },
    });
    const text = h('p', { class: 'var-text', 'aria-live': 'polite' });
    const drawText = () => passageText(text, p, include);
    drawText();
    const support = Object.values(p.contains);
    const nYes = support.filter((v) => v === true).length;
    const nNo = support.filter((v) => v === false).length;
    detail.append(
      h(
        'div',
        { class: 'var-head' },
        h('div', null, h('p', { class: 'eyebrow' }, p.ref), h('h2', null, p.title)),
        h('span', { class: 'chip var-cat' }, p.category),
      ),
      toggle.el,
      text,
      h('h3', { class: 'var-sub' }, 'Who has it'),
      h('p', { class: 'chart-note' }, rd ? p.contains_label ?? '' : `${nYes} of the major witnesses shown include it, ${nNo} lack it. † = see note on hover.`),
      witWrap,
      h('div', { class: 'var-cols' }, h('div', null, h('h3', { class: 'var-sub' }, 'How it likely arose'), h('p', null, p.explanation)), h('div', null, h('h3', { class: 'var-sub' }, 'Does it change doctrine?'), h('p', { class: 'var-doctrine' }, p.doctrine_impact))),
      p.verified ? h('p', { class: 'chart-note' }, `Checked against: ${p.verified}`) : '',
    );
    witnessChart(p, witWrap);
  }

  const total = StatTile('Textual variants among Greek manuscripts', `≈ ${fmtInt(cats.total_variants_estimate)}`, 'An estimate; more than the number of words in the New Testament', 'warn');
  const sk = skepticsFor('variants');

  root.append(
    ModuleHeader(
      'Module 4',
      'The 110% puzzle',
      'With thousands of manuscripts, the problem is not missing text but extra text. The original is in there, along with additions and slips, and the task is to sort them out. The famous disputed passages are not hidden: they are in the footnotes of any modern Bible.',
    ),
    h('div', { class: 'var-layout' }, h('div', { class: 'var-side' }, h('h2', { class: 'uc-h' }, 'Choose a passage'), picker), detail),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'var-cats' },
      h('h2', { id: 'var-cats' }, 'What kind of variants are they?'),
      h(
        'p',
        { class: 'measure' },
        'The count of variants is large and real. Most of them are spelling differences a reader would never notice in translation. The shares below are rough estimates from Daniel Wallace’s widely used four-way taxonomy.',
      ),
      h('div', { class: 'var-cats' }, total.el, h('div', { class: 'panel' }, tmWrap)),
      h('p', { class: 'chart-note measure' }, cats._note),
    ),
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList(data.sources),
  );
  renderPassage();
  variantBar(tmWrap);

  let lastW = witWrap.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(witWrap.clientWidth - lastW) > 8) {
      lastW = witWrap.clientWidth;
      witnessChart(cur, witWrap);
      variantBar(tmWrap);
    }
  });
  ro.observe(witWrap);
  return () => ro.disconnect();
}
