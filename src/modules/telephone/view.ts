// Module 1: Telephone vs. Tree.
import * as d3 from 'd3';
import { h, s, clear, reducedMotion, fmtPct } from '../../lib/dom';
import { Disclosure, Legend, ModuleHeader, Slider, SourceList, StatTile, Toggle, Tooltip } from '../../components';
import { skepticsFor, sourceText } from '../../data';
import {
  reconstruct,
  readingLabel,
  runChain,
  runTree,
  treeSize,
  type Copy,
  type ErrType,
  type Params,
  type Reconstruction,
  type Token,
} from './sim';

const tokens: Token[] = sourceText.tokens;
const REGIONS: string[] = sourceText.regions;
const REGION_VARS = ['--r-egypt', '--r-syria', '--r-asia', '--r-rome', '--r-africa'];
const ERR_TYPES = sourceText.error_types as { id: ErrType; label: string; weight: number; how: string }[];
const ERR_LABEL: Record<ErrType, string> = Object.fromEntries(ERR_TYPES.map((e) => [e.id, e.label])) as Record<ErrType, string>;
const ERR_SHORT: Record<ErrType, string> = {
  spelling: 'Spelling',
  omission: 'Skipped word',
  harmonization: 'Harmonization',
  gloss: 'Marginal note',
};

type Model = 'chain' | 'tree';
type ColorBy = 'corruption' | 'region';

interface State {
  p: Params;
  enabled: Record<ErrType, boolean>;
  colorBy: ColorBy;
  chain: Copy[];
  tree: Copy[];
  sel: { model: Model; id: number };
  reconstructed: boolean;
}

const DEFAULTS = {
  seed: 7,
  errorRate: 0.03,
  loss: 0.5,
  chainN: 20,
  treeK: 3,
  treeDepth: 4,
};

const FAIL_PRESET = { errorRate: 0.08, loss: 0.9, chainN: 20, treeK: 2, treeDepth: 3 };

function corruptionLevel(diffs: number): number {
  if (diffs === 0) return 0;
  if (diffs <= 2) return 1;
  if (diffs <= 5) return 2;
  return 3;
}

const CORRUPTION_LEGEND = [
  { label: 'Matches the source', color: 'var(--c-lvl0)' },
  { label: '1–2 words differ', color: 'var(--c-lvl1)' },
  { label: '3–5', color: 'var(--c-lvl2)' },
  { label: '6 or more', color: 'var(--c-lvl3)' },
];

/* ---------- Mini heatmap (one cell per word) ---------- */

function heatmap(copy: Copy, width: number, height: number): SVGSVGElement {
  const n = copy.slots.length;
  const cw = width / n;
  const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'heat', 'aria-hidden': 'true' });
  copy.slots.forEach((sl, i) => {
    const changed = sl.gk !== tokens[i].gk;
    svg.appendChild(
      s('rect', {
        x: i * cw,
        y: 0,
        width: Math.max(cw - 0.6, 0.6),
        height,
        class: changed ? `heat__cell e-${sl.err ?? 'spelling'}` : 'heat__cell',
      }),
    );
    if (sl.ins) svg.appendChild(s('rect', { x: i * cw + cw - 1.2, y: 0, width: 2.4, height, class: 'heat__cell e-gloss' }));
  });
  return svg;
}

function copyName(model: Model, c: Copy): string {
  return model === 'chain' ? `Copy ${c.id + 1} in the chain` : `Tree copy #${c.id + 1}`;
}

function copySummary(model: Model, c: Copy): string {
  const where = REGIONS[c.region];
  const gen = model === 'chain' ? `copy ${c.depth} of the chain` : `generation ${c.depth}`;
  const status = c.lost ? 'destroyed' : 'survives';
  const diffs = c.diffs === 0 ? 'matches the source' : `${c.diffs} word${c.diffs === 1 ? '' : 's'} differ from the source`;
  return `${gen}, ${where}, ${status}; ${diffs}`;
}

function tooltipFor(model: Model, c: Copy): HTMLElement {
  return h(
    'div',
    null,
    h('p', null, h('strong', null, copyName(model, c))),
    h('p', { class: 'tt-muted' }, copySummary(model, c)),
    c.fresh > 0 ? h('p', { class: 'tt-muted' }, `${c.fresh} new change${c.fresh === 1 ? '' : 's'} made in this copy`) : null,
    heatmap(c, 240, 10),
  );
}

/* ---------- Page ---------- */

export function render(root: HTMLElement) {
  const st: State = {
    p: {
      ...DEFAULTS,
      mix: Object.fromEntries(ERR_TYPES.map((e) => [e.id, e.weight])) as Record<ErrType, number>,
      regions: REGIONS.length,
    },
    enabled: { spelling: true, omission: true, harmonization: true, gloss: true },
    colorBy: 'corruption',
    chain: [],
    tree: [],
    sel: { model: 'chain', id: DEFAULTS.chainN - 1 },
    reconstructed: false,
  };

  /* ----- Controls ----- */

  const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
  const errSlider = Slider({
    label: 'Error rate per copy',
    min: 0.005,
    max: 0.08,
    step: 0.005,
    value: st.p.errorRate,
    format: (v) => `${pct(v)} of words`,
    onInput: (v) => update({ errorRate: v }),
  });
  const lossSlider = Slider({
    label: 'Lose manuscripts',
    min: 0,
    max: 0.9,
    step: 0.05,
    value: st.p.loss,
    format: (v) => `${Math.round(v * 100)}% destroyed`,
    onInput: (v) => update({ loss: v }),
  });

  const mixBoxes = ERR_TYPES.map((e) => {
    const input = h('input', { type: 'checkbox', checked: true, value: e.id });
    input.addEventListener('change', () => {
      st.enabled[e.id] = input.checked;
      update({});
    });
    return {
      input,
      el: h(
        'label',
        { class: 'mixchip', title: `${e.label}: ${e.how}` },
        input,
        h('span', { class: `mixchip__swatch e-${e.id}` }),
        h('span', null, ERR_SHORT[e.id]),
      ),
    };
  });

  const seedInput = h('input', { type: 'number', class: 'seed__input num', min: 1, max: 99999, value: st.p.seed, 'aria-label': 'Random seed' });
  seedInput.addEventListener('change', () => {
    const v = Math.max(1, Math.min(99999, Math.round(Number(seedInput.value) || 1)));
    seedInput.value = String(v);
    update({ seed: v }, true);
  });

  const runBtn = h('button', { class: 'btn btn--primary', type: 'button' }, 'Run');
  runBtn.addEventListener('click', () => {
    const v = (st.p.seed % 99999) + 1;
    seedInput.value = String(v);
    update({ seed: v }, true);
  });
  const reconBtn = h('button', { class: 'btn', type: 'button' }, 'Reconstruct');
  reconBtn.addEventListener('click', () => {
    st.reconstructed = true;
    renderResults();
    results.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  });
  const presetDefault = h('button', { class: 'btn btn--small', type: 'button' }, 'Default settings');
  presetDefault.addEventListener('click', () => applyPreset(DEFAULTS));
  const presetFail = h('button', { class: 'btn btn--small', type: 'button' }, 'Try to make the tree fail');
  presetFail.addEventListener('click', () => applyPreset({ ...FAIL_PRESET, seed: st.p.seed }));

  const controls = h(
    'section',
    { class: 'panel tel-controls', 'aria-label': 'Shared settings' },
    h('div', { class: 'tel-controls__grid' }, errSlider.el, lossSlider.el),
    h(
      'fieldset',
      { class: 'mix' },
      h('legend', { class: 'toggle__label' }, 'Kinds of error'),
      h('div', { class: 'mix__row' }, mixBoxes.map((m) => m.el)),
    ),
    h(
      'div',
      { class: 'tel-controls__actions' },
      h('div', { class: 'btn-row' }, runBtn, reconBtn, h('label', { class: 'seed' }, h('span', null, 'Seed'), seedInput)),
      h('div', { class: 'btn-row' }, presetDefault, presetFail),
    ),
    h(
      'p',
      { class: 'small muted tel-controls__note' },
      'Run copies the text again with a new seed. The same seed and settings always give the same result.',
    ),
  );

  /* ----- Chain panel ----- */

  const nSlider = Slider({
    label: 'Copies in the chain',
    min: 5,
    max: 30,
    value: st.p.chainN,
    onInput: (v) => update({ chainN: v }),
  });
  const chainSvgWrap = h('div', { class: 'tel-vis tel-vis--chain' });
  const chainPanel = h(
    'section',
    { class: 'panel tel-model', 'aria-labelledby': 'tel-chain-h' },
    h('div', { class: 'tel-model__head' }, h('h2', { id: 'tel-chain-h' }, 'Telephone'), h('p', { class: 'muted small' }, 'One line. Each copy is made from the one before it.')),
    h('div', { class: 'tel-model__controls' }, nSlider.el),
    chainSvgWrap,
  );

  /* ----- Tree panel ----- */

  const kSlider = Slider({
    label: 'Copies made from each copy',
    min: 1,
    max: 4,
    value: st.p.treeK,
    onInput: (v) => update({ treeK: v }),
  });
  const depthSlider = Slider({
    label: 'Generations',
    min: 3,
    max: 6,
    value: st.p.treeDepth,
    onInput: (v) => update({ treeDepth: v }),
  });
  const treeCount = h('span', { class: 'num' });
  const colorToggle = Toggle<ColorBy>({
    label: 'Color copies by',
    options: [
      { value: 'corruption', label: 'Changes' },
      { value: 'region', label: 'Region' },
    ],
    value: st.colorBy,
    onChange: (v) => {
      st.colorBy = v;
      drawTree(false);
      drawTreeLegend();
    },
  });
  const treeLegend = h('div', { class: 'tel-legend' });
  const treeSvgWrap = h('div', { class: 'tel-vis tel-vis--tree' });
  const treePanel = h(
    'section',
    { class: 'panel tel-model', 'aria-labelledby': 'tel-tree-h' },
    h(
      'div',
      { class: 'tel-model__head' },
      h('h2', { id: 'tel-tree-h' }, 'Tree'),
      h('p', { class: 'muted small' }, 'Many lines. Copies spread to different regions and are copied independently. ', treeCount),
    ),
    h('div', { class: 'tel-model__controls tel-model__controls--2' }, kSlider.el, depthSlider.el),
    h('div', { class: 'tel-tree-opts' }, colorToggle.el, treeLegend),
    treeSvgWrap,
  );

  /* ----- Detail, results ----- */

  const detail = h('section', { class: 'panel tel-detail', 'aria-live': 'polite', 'aria-labelledby': 'tel-detail-h' });
  const results = h('section', { class: 'tel-results', 'aria-live': 'polite', 'aria-label': 'Reconstruction results' });

  const sk = skepticsFor('telephone');

  root.append(
    ModuleHeader(
      'Module 1',
      'Telephone vs. Tree',
      'A common objection says the Bible is like a game of telephone: garbled a little more with every retelling. Copying did introduce errors. What decides whether the original can be recovered is the shape of the copying. Run both shapes on the same text and see.',
    ),
    h(
      'p',
      { class: 'measure' },
      'Both models start from ',
      h('strong', null, sourceText.reference),
      ' in Greek (',
      tokens.length,
      ' words). Every copy can make mistakes of four kinds. Some copies are then lost, as most ancient manuscripts were. Finally, ',
      h('em', null, 'Reconstruct'),
      ' takes a majority vote, word by word, across whatever survives.',
    ),
    controls,
    h('div', { class: 'tel-split' }, chainPanel, treePanel),
    results,
    detail,
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList([
      ...sourceText.sources,
      'Error types and weights: data/source-text.json (error_types). Simulator: seeded, independent errors per word per copy; majority vote per word.',
    ]),
  );

  /* ----- Chain drawing ----- */

  const TILE_H = 13;
  const TILE_GAP = 5;
  const LABEL_W = 30;
  let chainW = 0;

  function drawChain(animate: boolean) {
    clear(chainSvgWrap);
    const n = st.chain.length;
    const w = Math.max(240, chainSvgWrap.clientWidth || 480);
    chainW = w;
    const hgt = 22 + n * (TILE_H + TILE_GAP);
    const svg = s('svg', {
      class: 'tel-svg',
      width: w,
      height: hgt,
      viewBox: `0 0 ${w} ${hgt}`,
      role: 'listbox',
      tabindex: 0,
      'aria-label': `Telephone chain of ${n} copies. Use the up and down arrow keys to inspect a copy.`,
    });
    const hw = w - LABEL_W - 8;
    svg.appendChild(s('text', { x: LABEL_W + 2, y: 11, class: 'tel-cap' }, w > 420 ? 'Autograph (lost) ↓   one cell per word, colored where it changed' : 'Autograph (lost) ↓'));
    st.chain.forEach((c, i) => {
      const y = 20 + i * (TILE_H + TILE_GAP);
      const g = s('g', {
        class: `tile ${c.lost ? 'is-lost' : ''} ${st.sel.model === 'chain' && st.sel.id === c.id ? 'is-selected' : ''}`,
        transform: `translate(0 ${y})`,
        'data-id': c.id,
        role: 'option',
        'aria-label': `${copyName('chain', c)}: ${copySummary('chain', c)}`,
      });
      g.appendChild(s('text', { x: LABEL_W - 6, y: TILE_H - 2, class: 'tile__label', 'text-anchor': 'end' }, String(i + 1)));
      g.appendChild(s('rect', { x: LABEL_W - 3, y: 1, width: 3, height: TILE_H - 2, style: `fill: var(${REGION_VARS[c.region]})` }));
      const hm = heatmap(c, hw, TILE_H);
      hm.setAttribute('x', String(LABEL_W + 2));
      hm.setAttribute('class', 'heat tile__heat');
      g.appendChild(hm);
      g.appendChild(s('rect', { x: LABEL_W + 1, y: -1, width: hw + 2, height: TILE_H + 2, class: 'tile__frame' }));
      if (animate && !reducedMotion()) {
        g.style.opacity = '0';
        g.style.transition = `opacity 220ms ease ${i * 45}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => (g.style.opacity = '')));
      }
      svg.appendChild(g);
    });
    svg.addEventListener('pointermove', (e) => {
      const id = chainIdAt(svg, e);
      if (id === null) return Tooltip.hide();
      Tooltip.show(tooltipFor('chain', st.chain[id]), e.clientX, e.clientY);
    });
    svg.addEventListener('pointerleave', () => Tooltip.hide());
    svg.addEventListener('click', (e) => {
      const id = chainIdAt(svg, e);
      if (id !== null) select('chain', id);
    });
    svg.addEventListener('keydown', (e) => {
      const cur = st.sel.model === 'chain' ? st.sel.id : n - 1;
      let next: number | null = null;
      if (e.key === 'ArrowDown') next = Math.min(n - 1, cur + 1);
      else if (e.key === 'ArrowUp') next = Math.max(0, cur - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      if (next !== null) {
        e.preventDefault();
        select('chain', next);
      }
    });
    svg.addEventListener('focus', () => {
      if (st.sel.model !== 'chain') select('chain', n - 1);
    });
    chainSvgWrap.appendChild(svg);
  }

  function chainIdAt(svg: SVGSVGElement, e: PointerEvent | MouseEvent): number | null {
    const r = svg.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * Number(svg.getAttribute('height'));
    const i = Math.floor((y - 20 + TILE_GAP / 2) / (TILE_H + TILE_GAP));
    return i >= 0 && i < st.chain.length ? i : null;
  }

  /* ----- Tree drawing ----- */

  interface TNode {
    id: number; // -1 = autograph
    children: TNode[];
  }
  let treePts: { id: number; x: number; y: number }[] = [];
  let delaunay: d3.Delaunay<{ id: number; x: number; y: number }> | null = null;
  let treeSvg: SVGSVGElement | null = null;
  let treeScale = 1;

  function treeFill(c: Copy): string {
    if (st.colorBy === 'region') return `var(${REGION_VARS[c.region]})`;
    return `var(--c-lvl${corruptionLevel(c.diffs)})`;
  }

  function drawTree(animate: boolean) {
    clear(treeSvgWrap);
    const copies = st.tree;
    const size = Math.max(260, Math.min(treeSvgWrap.clientWidth || 480, 560));
    const R = size / 2 - 14;
    const nodes: TNode[] = copies.map((c) => ({ id: c.id, children: [] }));
    const rootNode: TNode = { id: -1, children: [] };
    for (const c of copies) (c.parent < 0 ? rootNode : nodes[c.parent]).children.push(nodes[c.id]);
    const hier = d3.hierarchy<TNode>(rootNode, (d) => d.children);
    const layout = d3
      .tree<TNode>()
      .size([2 * Math.PI, R])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.4) / Math.max(1, a.depth));
    const laid = layout(hier);
    const radial = (a: number, r: number): [number, number] => [r * Math.cos(a - Math.PI / 2), r * Math.sin(a - Math.PI / 2)];

    const total = copies.length;
    const nodeR = total > 1500 ? 1.3 : total > 400 ? 2.2 : total > 120 ? 3.4 : total > 40 ? 5 : 7;
    const linkW = total > 1500 ? 0.35 : total > 400 ? 0.6 : 1;

    const svg = s('svg', {
      class: 'tel-svg tel-svg--tree',
      width: size,
      height: size,
      viewBox: `${-size / 2} ${-size / 2} ${size} ${size}`,
      role: 'group',
      tabindex: 0,
      'aria-label': `Copying tree with ${total} copies. Arrow keys move between copies: up to the parent, down to the first child, left and right between siblings.`,
    });
    const gLinks = s('g', { class: 'tree-links' });
    const gNodes = s('g', { class: 'tree-nodes' });
    svg.append(gLinks, gNodes);
    const delay = (depth: number) => (animate && !reducedMotion() ? depth * 260 : 0);

    const pts: { id: number; x: number; y: number }[] = [];
    laid.links().forEach((l) => {
      const [x1, y1] = radial(l.source.x, l.source.y);
      const [x2, y2] = radial(l.target.x, l.target.y);
      const line = s('line', { x1, y1, x2, y2, class: 'tree-link', 'stroke-width': linkW });
      if (delay(1)) {
        line.style.opacity = '0';
        line.style.transition = `opacity 200ms ease ${delay(l.target.depth) - 160}ms`;
      }
      gLinks.appendChild(line);
    });
    laid.descendants().forEach((d) => {
      const [x, y] = radial(d.x, d.y);
      if (d.data.id < 0) {
        gNodes.appendChild(s('circle', { cx: 0, cy: 0, r: Math.max(nodeR, 5), class: 'tree-root' }));
        return;
      }
      const c = copies[d.data.id];
      pts.push({ id: c.id, x, y });
      const circle = s('circle', {
        cx: x,
        cy: y,
        r: nodeR,
        class: `tree-node ${c.lost ? 'is-lost' : ''}`,
        'data-id': c.id,
      });
      const fill = treeFill(c);
      if (delay(1)) {
        circle.style.fill = 'var(--c-lvl0)';
        circle.style.opacity = '0';
        circle.style.transition = `fill 260ms ease ${delay(d.depth)}ms, opacity 200ms ease ${delay(d.depth) - 120}ms`;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            circle.style.opacity = '';
            circle.style.fill = fill;
          }),
        );
      } else circle.style.fill = fill;
      gNodes.appendChild(circle);
    });
    if (delay(1)) {
      requestAnimationFrame(() => requestAnimationFrame(() => gLinks.querySelectorAll<SVGLineElement>('line').forEach((l) => (l.style.opacity = ''))));
    }
    const selRing = s('circle', { class: 'tree-sel', r: Math.max(nodeR + 3, 6), cx: 0, cy: 0, visibility: 'hidden' });
    svg.appendChild(selRing);
    svg.appendChild(s('text', { x: 0, y: -Math.max(nodeR, 5) - 6, class: 'tel-cap', 'text-anchor': 'middle' }, 'Autograph (lost)'));

    treePts = pts;
    delaunay = d3.Delaunay.from(pts, (p) => p.x, (p) => p.y);
    treeSvg = svg;
    treeScale = size;

    const idAt = (e: PointerEvent | MouseEvent): number | null => {
      if (!delaunay || !pts.length) return null;
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * size - size / 2;
      const y = ((e.clientY - r.top) / r.height) * size - size / 2;
      const i = delaunay.find(x, y);
      const p = pts[i];
      const maxD = Math.max(nodeR * 3, 10);
      return Math.hypot(p.x - x, p.y - y) <= maxD ? p.id : null;
    };
    svg.addEventListener('pointermove', (e) => {
      const id = idAt(e);
      if (id === null) return Tooltip.hide();
      Tooltip.show(tooltipFor('tree', copies[id]), e.clientX, e.clientY);
    });
    svg.addEventListener('pointerleave', () => Tooltip.hide());
    svg.addEventListener('click', (e) => {
      const id = idAt(e);
      if (id !== null) select('tree', id);
    });
    svg.addEventListener('focus', () => {
      if (st.sel.model !== 'tree') select('tree', 0);
    });
    svg.addEventListener('keydown', (e) => {
      const cur = st.sel.model === 'tree' ? st.tree[st.sel.id] : st.tree[0];
      if (!cur) return;
      const siblings = cur.parent < 0 ? st.tree.filter((c) => c.parent < 0).map((c) => c.id) : st.tree[cur.parent].children;
      const si = siblings.indexOf(cur.id);
      let next: number | null = null;
      if (e.key === 'ArrowUp' && cur.parent >= 0) next = cur.parent;
      else if (e.key === 'ArrowDown' && cur.children.length) next = cur.children[0];
      else if (e.key === 'ArrowRight') next = siblings[(si + 1) % siblings.length];
      else if (e.key === 'ArrowLeft') next = siblings[(si - 1 + siblings.length) % siblings.length];
      else if (e.key === 'Home') next = 0;
      if (next !== null) {
        e.preventDefault();
        select('tree', next);
      }
    });
    treeSvgWrap.appendChild(svg);
    positionTreeSel();
  }

  function positionTreeSel() {
    if (!treeSvg) return;
    const ring = treeSvg.querySelector<SVGCircleElement>('.tree-sel');
    if (!ring) return;
    const p = st.sel.model === 'tree' ? treePts.find((q) => q.id === st.sel.id) : undefined;
    if (!p) return ring.setAttribute('visibility', 'hidden');
    ring.setAttribute('cx', String(p.x));
    ring.setAttribute('cy', String(p.y));
    ring.setAttribute('visibility', 'visible');
    void treeScale;
  }

  function drawTreeLegend() {
    clear(treeLegend);
    treeLegend.append(
      st.colorBy === 'region'
        ? Legend(REGIONS.map((r, i) => ({ label: r, color: `var(${REGION_VARS[i]})`, shape: 'circle' as const })), 'Regions')
        : Legend(CORRUPTION_LEGEND.map((l) => ({ ...l, shape: 'circle' as const })), 'Words changed'),
      h('p', { class: 'tel-legend__lost' }, h('span', { class: 'lost-swatch', 'aria-hidden': 'true' }), 'Faded, dashed: destroyed'),
    );
  }

  /* ----- Selection + detail ----- */

  function select(model: Model, id: number) {
    st.sel = { model, id };
    chainSvgWrap.querySelectorAll('.tile').forEach((g) => {
      g.classList.toggle('is-selected', model === 'chain' && Number(g.getAttribute('data-id')) === id);
    });
    positionTreeSel();
    const svg = model === 'chain' ? chainSvgWrap.querySelector('svg') : treeSvg;
    const opt = model === 'chain' ? chainSvgWrap.querySelector(`.tile[data-id="${id}"]`) : null;
    if (svg && opt) svg.setAttribute('aria-activedescendant', '');
    renderDetail();
  }

  function renderDetail() {
    clear(detail);
    const list = st.sel.model === 'chain' ? st.chain : st.tree;
    const c = list[st.sel.id] ?? list[list.length - 1];
    if (!c) return;
    const words = c.slots.map((sl, i) => {
      const t = tokens[i];
      const cells: HTMLElement[] = [];
      if (sl.gk === null) {
        cells.push(
          h(
            'span',
            { class: 'iw is-omission', title: `Skipped: ${t.gk}` },
            h('span', { class: 'iw__gk greek' }, h('s', null, t.gk)),
            h('span', { class: 'iw__en' }, 'skipped'),
          ),
        );
      } else if (sl.gk !== t.gk) {
        const err = sl.err ?? 'spelling';
        cells.push(
          h(
            'span',
            { class: `iw is-${err}`, title: `${ERR_LABEL[err]}. Source reads ${t.gk}` },
            h('span', { class: 'iw__gk greek' }, sl.gk),
            h('span', { class: 'iw__en' }, err === 'spelling' ? `${t.en} (misspelled)` : sl.en),
          ),
        );
      } else {
        cells.push(h('span', { class: 'iw' }, h('span', { class: 'iw__gk greek' }, sl.gk), h('span', { class: 'iw__en' }, sl.en)));
      }
      if (sl.ins) {
        cells.push(
          h(
            'span',
            { class: 'iw is-gloss', title: 'Marginal note absorbed into the text' },
            h('span', { class: 'iw__gk greek' }, sl.ins.gk),
            h('span', { class: 'iw__en' }, `+ ${sl.ins.en}`),
          ),
        );
      }
      return cells;
    });
    const model = st.sel.model;
    detail.append(
      h(
        'div',
        { class: 'tel-detail__head' },
        h('h2', { id: 'tel-detail-h' }, copyName(model, c)),
        h('p', { class: 'muted small' }, capitalize(copySummary(model, c)), '. Select any copy in either model to read it here.'),
      ),
      Legend(ERR_TYPES.map((e) => ({ label: ERR_LABEL[e.id], color: `var(--e-${e.id})` })), 'Error types'),
      h('div', { class: 'interlinear', lang: 'grc' }, words),
    );
  }

  /* ----- Results ----- */

  function renderResults() {
    clear(results);
    if (!st.reconstructed) {
      results.append(
        h(
          'div',
          { class: 'tel-results__prompt' },
          h('p', null, 'Press ', h('strong', null, 'Reconstruct'), ' to vote, word by word, across the surviving copies of each model.'),
        ),
      );
      return;
    }
    const rc = reconstruct(st.chain, tokens);
    const rt = reconstruct(st.tree, tokens);
    const tile = (label: string, r: Reconstruction, tone: 'warn' | 'success' | 'accent') =>
      StatTile(
        label,
        r.survivors ? `${fmtPct(r.pct)} recovered` : 'Nothing survived',
        r.survivors ? `${r.correct} of ${r.total} words, from ${r.survivors} surviving cop${r.survivors === 1 ? 'y' : 'ies'}` : 'No copies left to vote with',
        tone,
      ).el;
    const toneFor = (r: Reconstruction) => (r.pct >= 0.995 ? 'success' : r.pct >= 0.9 ? 'accent' : 'warn');
    results.append(
      h('h2', null, 'Reconstruction'),
      h('div', { class: 'tel-results__stats' }, tile('Telephone', rc, toneFor(rc)), tile('Tree', rt, toneFor(rt))),
      h('p', { class: 'tel-results__why measure' }, explain(rc, rt)),
      h('div', { class: 'tel-results__lists' }, problemList('Telephone', rc), problemList('Tree', rt)),
    );
  }

  function explain(rc: Reconstruction, rt: Reconstruction): string {
    if (!rc.survivors && !rt.survivors) return 'No copies survived in either model, so there is nothing to vote with.';
    if (st.p.treeK === 1) return 'With one copy made from each copy, the tree is just another chain, and it behaves like one.';
    if (rt.pct >= rc.pct + 0.02 && rt.pct >= 0.9)
      return 'In the tree, independent lines of copies can be checked against each other, so a mistake in one line is outvoted by the others. In a single chain every mistake passes to every later copy, and nothing can outvote it.';
    if (rt.pct < 0.9)
      return 'With this many errors and this few survivors, the vote has too little to work with. Independent lines only help when enough of them survive, which is why the thin early record is the honest weak point.';
    return 'At these settings both models recover about the same amount. Raise the error rate or the number of copies to see them separate.';
  }

  function problemList(label: string, r: Reconstruction): HTMLElement {
    const items: HTMLElement[] = [];
    for (const w of r.wrong)
      items.push(
        h('li', null, h('span', { class: 'greek' }, tokens[w.i].gk), ' → ', h('span', { class: 'greek bad' }, w.label), h('span', { class: 'muted' }, ` (${w.count} of ${w.of} copies)`)),
      );
    for (const t of r.ties)
      items.push(
        h(
          'li',
          null,
          h('span', { class: 'greek' }, tokens[t.i].gk),
          ': tie between ',
          t.readings.map((x, j) => [j ? ' and ' : '', h('span', { class: 'greek' }, x.label)]).flat(),
        ),
      );
    return h(
      'div',
      { class: 'tel-problems' },
      h('h3', null, `${label}: words not recovered`),
      !r.survivors
        ? h('p', { class: 'muted small' }, 'All of them.')
        : items.length
          ? h('ul', null, items.slice(0, 12), items.length > 12 ? h('li', { class: 'muted' }, `and ${items.length - 12} more`) : null)
          : h('p', { class: 'muted small' }, 'None. Every word matches the source.'),
      r.survivors ? reconText(r) : null,
    );
  }

  function reconText(r: Reconstruction): HTMLElement {
    return h(
      'p',
      { class: 'recon greek', lang: 'grc' },
      r.text.map((t, i) => {
        if (t === null) return [h('mark', { class: 'recon__tie', title: 'Tie' }, '?'), ' '];
        const ok = t.gk === tokens[i].gk && t.ins === null;
        const label = readingLabel(t);
        return [ok ? label : h('mark', { class: 'recon__bad', title: `Source reads ${tokens[i].gk}` }, label), ' '];
      }),
    );
  }

  /* ----- Update loop ----- */

  function effectiveMix(): Record<ErrType, number> {
    const m = { ...st.p.mix };
    for (const e of ERR_TYPES) m[e.id] = st.enabled[e.id] ? e.weight : 0;
    return m;
  }

  function update(patch: Partial<Params>, animate = false) {
    Object.assign(st.p, patch);
    const p: Params = { ...st.p, mix: effectiveMix() };
    st.chain = runChain(tokens, p);
    st.tree = runTree(tokens, p);
    treeCount.textContent = `${treeSize(p.treeK, p.treeDepth).toLocaleString('en-US')} copies.`;
    const list = st.sel.model === 'chain' ? st.chain : st.tree;
    if (st.sel.id >= list.length) st.sel.id = list.length - 1;
    drawChain(animate);
    drawTree(animate);
    renderDetail();
    renderResults();
  }

  function applyPreset(v: typeof DEFAULTS) {
    errSlider.set(v.errorRate);
    lossSlider.set(v.loss);
    nSlider.set(v.chainN);
    kSlider.set(v.treeK);
    depthSlider.set(v.treeDepth);
    seedInput.value = String(v.seed);
    for (const m of mixBoxes) m.input.checked = true;
    for (const e of ERR_TYPES) st.enabled[e.id] = true;
    st.sel = { model: 'chain', id: v.chainN - 1 };
    update({ ...v }, true);
  }

  drawTreeLegend();
  update({}, true);

  // Redraw on width changes (layout switches between split and stacked).
  let lastW = chainSvgWrap.clientWidth;
  const ro = new ResizeObserver(() => {
    const w = chainSvgWrap.clientWidth;
    if (Math.abs(w - lastW) > 8 && Math.abs(w - chainW) > 8) {
      lastW = w;
      drawChain(false);
      drawTree(false);
    }
  });
  ro.observe(chainSvgWrap);
  return () => ro.disconnect();
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
