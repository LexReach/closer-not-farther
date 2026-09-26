// Module 2: Closer, Not Farther.
import * as d3 from 'd3';
import { h, s, clear, fmtInt, reducedMotion } from '../lib/dom';
import { Disclosure, Legend, ModuleHeader, Slider, SourceList, StatTile, Tooltip } from '../components';
import { skepticsFor } from '../data';
import mss from '../../data/manuscripts.json';
import comparison from '../../data/comparison.json';

interface Witness {
  ga: string;
  name: string;
  contents: string;
  date_low: number;
  date_high: number;
  year_known: number;
  found?: string;
  note?: string;
  year_known_basis?: string;
  verify?: boolean;
  added_by_build?: boolean;
}

export const witnesses = mss.witnesses as Witness[];
const points = mss.count_over_time.points as { year: number; count: number; label: string }[];
export const presets = mss.presets as { year: number; label: string }[];
const auto = mss.autographs;
export const YEAR_MIN = 1500;
export const YEAR_MAX = Math.max(...presets.map((p) => p.year), new Date().getFullYear());
const LEFT_LABEL = new Set(['01', 'P46']);
const BIG_LABELLED = new Set(['P52', '2']);
const LABELLED = new Set(['P52', 'P66', 'P75', 'P46', '01', '03', '02', '05', '2', 'P1']);

export const mid = (w: Witness) => (w.date_low + w.date_high) / 2;
const shortName = (w: Witness) => (w.ga.startsWith('P') ? w.ga : w.name.split(' (')[0]);

export function known(year: number) {
  return witnesses.filter((w) => w.year_known <= year);
}

export function countAt(year: number) {
  let cur: (typeof points)[number] | null = null;
  for (const p of points) if (p.year <= year) cur = p;
  return cur;
}

export function earliest(year: number): Witness | null {
  const k = known(year);
  if (!k.length) return null;
  return k.reduce((a, b) => (mid(b) < mid(a) ? b : a));
}

export const dateRange = (w: Witness) => `c. ${w.date_low}–${w.date_high} AD`;

function witnessTip(w: Witness): HTMLElement {
  return h(
    'div',
    null,
    h('p', null, h('strong', null, `${w.name}`), ` (GA ${w.ga})`),
    h('p', null, `Copied ${dateRange(w)}`),
    h('p', null, `Contents: ${w.contents}`),
    h('p', null, `Known to scholarship: ${w.year_known}`),
    w.found ? h('p', { class: 'tt-muted' }, w.found) : null,
    w.note ? h('p', { class: 'tt-muted' }, w.note) : null,
    h('p', { class: 'tt-muted' }, `Source: INTF Liste; Metzger & Ehrman 2005${w.verify ? '. Year known is an estimate awaiting a check.' : ''}`),
  );
}

/* ---------- Scatter + count chart ---------- */

export interface ChartApi {
  setYear(y: number): void;
  redraw(): void;
}

export function scatter(wrap: HTMLElement, getYear: () => number, opts: { big?: boolean } = {}): ChartApi {
  const big = !!opts.big;
  const wasKnown = new Map<string, boolean>();
  let dots: { w: Witness; g: SVGGElement }[] = [];
  let cursor: SVGGElement | null = null;
  let earliestG: SVGGElement | null = null;
  let earliestLabel: SVGTextElement | null = null;
  let countCursor: SVGGElement | null = null;
  let x: d3.ScaleLinear<number, number> = d3.scaleLinear();
  let y: d3.ScaleLinear<number, number> = d3.scaleLinear();
  let countFill: SVGPathElement | null = null;
  let yc: d3.ScaleLinear<number, number> = d3.scaleLinear();
  let countH = 0;
  let narrowNow = false;

  function draw() {
    clear(wrap);
    const W = Math.max(320, wrap.clientWidth || 900);
    const narrow = W < 560;
    narrowNow = narrow;
    const m = big ? { top: 60, right: 40, bottom: 70, left: 120 } : { top: 30, right: narrow ? 14 : 28, bottom: 34, left: narrow ? 44 : 58 };
    const H = big ? Math.max(420, Math.min(760, wrap.clientHeight || 640)) : narrow ? 420 : 500;
    countH = big ? 0 : narrow ? 130 : 150;
    x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([m.left, W - m.right]);
    y = d3.scaleLinear().domain([auto.date_low - 20, 1500]).range([m.top, H - m.bottom]);

    const svg = s('svg', {
      class: `chart tl-chart ${big ? 'chart--big' : ''}`,
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
      role: 'group',
      'aria-label': 'Scatter plot. Horizontal axis: the year a manuscript became known to scholarship, 1500 to today. Vertical axis: when it was copied, older at the top.',
    });

    // Autograph band.
    svg.appendChild(s('rect', { x: m.left, y: y(auto.date_low), width: W - m.left - m.right, height: y(auto.date_high) - y(auto.date_low), class: 'tl-auto' }));
    svg.appendChild(s('text', { x: big ? m.left + 10 : W - m.right - 6, y: y(auto.date_low) + (big ? 26 : 13), 'text-anchor': big ? 'start' : 'end', class: 'tl-auto__label' }, narrow ? `NT written ${auto.date_low}–${auto.date_high}` : `${auto.label}, c. ${auto.date_low}–${auto.date_high} AD`));

    // Grid + axes.
    for (const t of y.ticks(big ? 5 : narrow ? 6 : 8)) {
      if (t < auto.date_low) continue;
      svg.append(
        s('line', { x1: m.left, x2: W - m.right, y1: y(t), y2: y(t), class: 'gridline' }),
        s('text', { x: m.left - (big ? 16 : 8), y: y(t) + (big ? 10 : 4), 'text-anchor': 'end' }, `${t}`),
      );
    }
    for (const t of x.ticks(big ? 5 : narrow ? 4 : 8)) {
      svg.append(
        s('line', { x1: x(t), x2: x(t), y1: m.top, y2: H - m.bottom, class: 'gridline gridline--v' }),
        s('text', { x: x(t), y: H - m.bottom + (big ? 40 : 16), 'text-anchor': 'middle' }, `${t}`),
      );
    }
    svg.append(
      s('text', { x: big ? 16 : m.left, y: big ? 32 : 14, class: 'axis-label' }, '↑ Copied (AD, older at top)'),
      s('text', { x: W - m.right, y: H - (big ? 6 : 4), 'text-anchor': 'end', class: 'axis-label' }, 'Year it became known to scholarship →'),
    );

    // Earliest-witness line.
    earliestG = s('g', { class: 'tl-earliest-g' });
    earliestLabel = s('text', { class: 'tl-earliest__label', x: W - m.right - 6, y: big ? -12 : -6, 'text-anchor': 'end' });
    earliestG.append(s('line', { class: 'tl-earliest', x1: m.left, x2: W - m.right, y1: 0, y2: 0 }), earliestLabel);
    svg.append(earliestG);

    // Dots (jitter identical positions).
    const seen = new Map<string, number>();
    dots = [...witnesses]
      .sort((a, b) => a.year_known - b.year_known)
      .map((w) => {
        const key = `${w.year_known}|${mid(w)}`;
        const k = seen.get(key) ?? 0;
        seen.set(key, k + 1);
        const cx = x(w.year_known) + k * 7;
        const g = s('g', {
          class: 'tl-dot',
          transform: `translate(${cx} ${y(mid(w))})`,
          tabindex: 0,
          role: 'img',
          'aria-label': `${w.name}, GA ${w.ga}: copied ${dateRange(w)}, known since ${w.year_known}. ${w.contents}.`,
        });
        g.append(
          s('line', { x1: big ? -80 : -36, x2: 0, y1: 0, y2: 0, class: 'tl-dot__trail' }),
          s('line', { x1: 0, x2: 0, y1: y(w.date_low) - y(mid(w)), y2: y(w.date_high) - y(mid(w)), class: 'tl-dot__range' }),
          s('circle', { r: big ? 12 : narrow ? 4.5 : 5.5, class: 'tl-dot__c' }),
        );
        if ((big ? BIG_LABELLED : LABELLED).has(w.ga) && !narrow) {
          const left = LEFT_LABEL.has(w.ga);
          const off = big ? 20 : 9;
          g.appendChild(s('text', { x: left ? -off : off, y: left ? -4 : big ? 10 : 4, 'text-anchor': left ? 'end' : 'start', class: 'tl-dot__label' }, shortName(w)));
        }
        const show = (e?: PointerEvent) => (e ? Tooltip.show(witnessTip(w), e.clientX, e.clientY) : Tooltip.showFor(witnessTip(w), g));
        g.addEventListener('pointermove', (e) => show(e));
        g.addEventListener('pointerleave', () => Tooltip.hide());
        g.addEventListener('focus', () => show());
        g.addEventListener('blur', () => Tooltip.hide());
        svg.appendChild(g);
        return { w, g };
      });

    // Year cursor.
    cursor = s('g', { class: 'tl-cursor' });
    cursor.append(s('line', { x1: 0, x2: 0, y1: m.top, y2: H - m.bottom }), s('text', { x: 0, y: m.top - 8, 'text-anchor': 'middle', class: 'tl-cursor__label' }));
    svg.appendChild(cursor);
    wrap.appendChild(svg);

    /* Count-over-time chart, same x scale. */
    if (big) {
      update(getYear(), false);
      return;
    }
    const cm = { top: 22, bottom: 30 };
    const csvg = s('svg', {
      class: 'chart tl-count',
      width: W,
      height: countH,
      viewBox: `0 0 ${W} ${countH}`,
      role: 'group',
      'aria-label': `Approximate number of catalogued Greek New Testament manuscripts: ${points.map((p) => `${p.year}, ${p.count}`).join('; ')}.`,
    });
    yc = d3.scaleLinear().domain([0, d3.max(points, (p) => p.count)! * 1.08]).range([countH - cm.bottom, cm.top]);
    for (const t of yc.ticks(3)) {
      csvg.append(
        s('line', { x1: m.left, x2: W - m.right, y1: yc(t), y2: yc(t), class: 'gridline' }),
        s('text', { x: m.left - 8, y: yc(t) + 4, 'text-anchor': 'end' }, fmtInt(t)),
      );
    }
    for (const t of x.ticks(narrow ? 4 : 8)) csvg.appendChild(s('text', { x: x(t), y: countH - cm.bottom + 16, 'text-anchor': 'middle' }, `${t}`));
    const stepLine = d3
      .line<{ year: number; count: number }>()
      .x((p) => x(p.year))
      .y((p) => yc(p.count))
      .curve(d3.curveStepAfter);
    const ext = [...points, { year: YEAR_MAX, count: points[points.length - 1].count }];
    const area = d3
      .area<{ year: number; count: number }>()
      .x((p) => x(p.year))
      .y0(yc(0))
      .y1((p) => yc(p.count))
      .curve(d3.curveStepAfter);
    countFill = s('path', { d: area(ext) ?? '', class: 'tl-count__fill' });
    csvg.append(countFill, s('path', { d: stepLine(ext) ?? '', class: 'tl-count__line' }));
    for (const p of points) {
      const c = s('circle', { cx: x(p.year), cy: yc(p.count), r: 3.2, class: 'tl-count__pt', tabindex: 0, role: 'img', 'aria-label': `${p.year}: about ${fmtInt(p.count)}, ${p.label}` });
      const tip = () => h('div', null, h('p', null, h('strong', null, `${p.year}: about ${fmtInt(p.count)}`)), h('p', { class: 'tt-muted' }, p.label));
      c.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
      c.addEventListener('pointerleave', () => Tooltip.hide());
      c.addEventListener('focus', () => Tooltip.showFor(tip(), c));
      c.addEventListener('blur', () => Tooltip.hide());
      csvg.appendChild(c);
    }
    csvg.appendChild(s('text', { x: m.left, y: 12, class: 'axis-label' }, 'Catalogued Greek NT manuscripts (approximate)'));
    countCursor = s('g', { class: 'tl-cursor' });
    countCursor.append(s('line', { x1: 0, x2: 0, y1: cm.top, y2: countH - cm.bottom }));
    csvg.appendChild(countCursor);
    wrap.appendChild(csvg);
    update(getYear(), false);
  }

  function update(year: number, animate = true) {
    const e = earliest(year);
    const slow = animate && !reducedMotion();
    for (const d of dots) {
      const on = d.w.year_known <= year;
      const before = wasKnown.get(d.w.ga) ?? false;
      d.g.classList.toggle('is-known', on);
      d.g.style.transitionDuration = slow ? '' : '0ms';
      // Newly discovered dots pop in with a short trail back toward the year cursor.
      if (on && !before && slow) {
        d.g.classList.remove('is-new');
        void (d.g as unknown as HTMLElement).getBoundingClientRect();
        d.g.classList.add('is-new');
        window.setTimeout(() => d.g.classList.remove('is-new'), 1100);
      }
      wasKnown.set(d.w.ga, on);
    }
    const cx = x(year);
    cursor?.setAttribute('transform', `translate(${cx} 0)`);
    const lbl = cursor?.querySelector('text');
    if (lbl) lbl.textContent = String(year);
    countCursor?.setAttribute('transform', `translate(${cx} 0)`);
    if (earliestG && earliestLabel) {
      if (e) {
        const yy = y(mid(e));
        earliestG.style.transform = `translateY(${yy}px)`;
        earliestG.style.transitionDuration = slow ? '' : '0ms';
        earliestG.style.visibility = 'visible';
        earliestLabel.textContent = narrowNow || big ? '' : `Earliest known in ${year}: ${e.name.split(' (')[0]} (${e.ga})`;
      } else {
        earliestG.style.visibility = 'hidden';
      }
    }
  }

  draw();
  return { setYear: (yv) => update(yv), redraw: draw };
}

/* ---------- Comparison panel ---------- */

interface Work {
  author: string;
  written: string;
  manuscripts: number;
  earliest_copy: string;
  gap_years: number;
  gap_note?: string;
}

function compareChart(wrap: HTMLElement) {
  clear(wrap);
  const works = [...(comparison.works as Work[])].sort((a, b) => b.manuscripts - a.manuscripts);
  const W = Math.max(300, wrap.clientWidth || 900);
  const stacked = W < 720;
  const colW = stacked ? W : (W - 32) / 2;
  const labelW = stacked ? 128 : 150;
  const rowH = 26;
  const H = 30 + works.length * rowH;

  const make = (title: string, value: (w: Work) => number, fmt: (w: Work) => string, desc: string, cls: string) => {
    const xs = d3.scaleLinear().domain([0, d3.max(works, value)!]).range([labelW, colW - 56]);
    const svg = s('svg', { class: 'chart cmp-chart', width: colW, height: H, viewBox: `0 0 ${colW} ${H}`, role: 'list', 'aria-label': desc });
    svg.appendChild(s('text', { x: 0, y: 14, class: 'axis-label cmp-title' }, title));
    works.forEach((w, i) => {
      const yy = 28 + i * rowH;
      const nt = w.author.startsWith('New Testament');
      const g = s('g', { class: `cmp-row ${nt ? 'is-nt' : ''}`, tabindex: 0, role: 'listitem', 'aria-label': `${w.author}: ${fmt(w)}` });
      g.append(
        s('rect', { x: 0, y: yy - 3, width: colW, height: rowH - 2, class: 'namebar__hit' }),
        s('text', { x: labelW - 8, y: yy + 12, 'text-anchor': 'end', class: 'cmp-label' }, w.author.replace(' (Greek)', '')),
        s('rect', { x: labelW, y: yy + 2, width: Math.max(1.5, xs(value(w)) - labelW), height: 14, rx: 1.5, class: `cmp-bar ${cls}` }),
        s('text', { x: xs(value(w)) + 5, y: yy + 13, class: 'cmp-val' }, fmt(w)),
      );
      const tip = () =>
        h(
          'div',
          null,
          h('p', null, h('strong', null, w.author)),
          h('p', null, `Written ${w.written}`),
          h('p', null, `${fmtInt(w.manuscripts)} manuscripts; earliest copy ${w.earliest_copy}`),
          h('p', null, `Gap: about ${fmtInt(w.gap_years)} years`),
          w.gap_note ? h('p', { class: 'tt-muted' }, w.gap_note) : null,
          h('p', { class: 'tt-muted' }, 'Per Clay Jones 2013'),
        );
      g.addEventListener('pointermove', (e) => Tooltip.show(tip(), e.clientX, e.clientY));
      g.addEventListener('pointerleave', () => Tooltip.hide());
      g.addEventListener('focus', () => Tooltip.showFor(tip(), g));
      g.addEventListener('blur', () => Tooltip.hide());
      svg.appendChild(g);
    });
    return svg;
  };

  wrap.append(
    h(
      'div',
      { class: 'cmp-grid' },
      make('Manuscripts known', (w) => w.manuscripts, (w) => fmtInt(w.manuscripts), 'Number of manuscripts per work', 'cmp-bar--count'),
      make('Gap from writing to earliest copy (years)', (w) => w.gap_years, (w) => fmtInt(w.gap_years), 'Years between writing and earliest surviving copy', 'cmp-bar--gap'),
    ),
  );
}

/* ---------- Page ---------- */

export function render(root: HTMLElement) {
  let year = presets[0]?.year ?? YEAR_MIN;
  const chartWrap = h('div', { class: 'chart-wrap tl-wrap' });
  const tiles = {
    count: StatTile('Manuscripts available', '', '', 'accent'),
    earliest: StatTile('Earliest witness', ''),
    gap: StatTile('Gap to the autographs', '', '', 'success'),
  };

  const presetBtns = presets.map((p) => {
    const b = h('button', { class: 'btn btn--small', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'num' }, String(p.year)), ` · ${p.label}`);
    b.addEventListener('click', () => {
      slider.set(p.year);
      setYear(p.year);
    });
    return { p, b };
  });

  const slider = Slider({
    label: 'What scholars had in the year',
    min: YEAR_MIN,
    max: YEAR_MAX,
    value: year,
    onInput: (v) => setYear(v),
  });

  let chart: ChartApi;

  // Tiles tween between values so the earliest date visibly counts down.
  let shownMid = 0;
  let shownGap = 0;
  let tweenRaf = 0;
  function setYear(v: number) {
    year = v;
    chart?.setYear(v);
    const c = countAt(v);
    const e = earliest(v);
    const k = known(v).length;
    tiles.count.set(c ? `≈ ${fmtInt(c.count)}` : '—', c ? `${c.label} (${c.year}); ${k} of ${witnesses.length} plotted` : `${k} plotted`);
    cancelAnimationFrame(tweenRaf);
    if (e) {
      const targetMid = Math.round(mid(e));
      const targetGap = Math.round(mid(e) - auto.date_high);
      const fromMid = shownMid || targetMid;
      const fromGap = shownGap || targetGap;
      const t0 = performance.now();
      const dur = reducedMotion() || fromMid === targetMid ? 0 : 600;
      const step = (now: number) => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        const k2 = 1 - Math.pow(1 - t, 3);
        shownMid = Math.round(fromMid + (targetMid - fromMid) * k2);
        shownGap = Math.round(fromGap + (targetGap - fromGap) * k2);
        tiles.earliest.set(`c. ${shownMid} AD`, `${e.ga}, ${e.name.split(' (')[0]} (${dateRange(e)})`);
        tiles.gap.set(`≈ ${fmtInt(shownGap)} years`, `Earliest copy's midpoint minus ${auto.date_high} AD`);
        if (t < 1) tweenRaf = requestAnimationFrame(step);
      };
      tweenRaf = requestAnimationFrame(step);
    } else {
      tiles.earliest.set('—', 'No witnesses known yet');
      tiles.gap.set('—', '');
    }
    for (const { p, b } of presetBtns) b.setAttribute('aria-pressed', String(p.year === v));
  }

  const cmpWrap = h('div', { class: 'chart-wrap' });
  const sk = skepticsFor('timeline');

  root.append(
    ModuleHeader(
      'Module 2',
      'Closer, Not Farther',
      'The usual worry is that each century takes us farther from the originals. For the New Testament the opposite has happened: the more time has passed, the earlier the copies scholars can read.',
    ),
    h(
      'div',
      { class: 'panel tl-panel' },
      h('div', { class: 'tl-controls' }, slider.el, h('div', { class: 'btn-row tl-presets', role: 'group', 'aria-label': 'Jump to a year' }, presetBtns.map((x) => x.b))),
      h('div', { class: 'stats tl-stats' }, tiles.count.el, tiles.earliest.el, tiles.gap.el),
      Legend(
        [
          { label: 'Known by the selected year', color: 'var(--accent)', shape: 'circle' },
          { label: 'Not yet known', color: 'var(--rule)', shape: 'circle' },
          { label: 'Range of likely copying dates', color: 'var(--muted)', shape: 'line' },
        ],
        'Chart key',
      ),
      chartWrap,
      h(
        'p',
        { class: 'chart-note' },
        `${witnesses.length} landmark witnesses from data/manuscripts.json. "Known" means discovered, published, or first used critically; the running total below is approximate. Hover or focus a dot for details.`,
      ),
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'tl-cmp' },
      h('h2', { id: 'tl-cmp' }, 'How the New Testament compares'),
      h(
        'p',
        { class: 'measure' },
        'Two numbers matter for any ancient text: how many copies survive, and how long after writing the earliest one was made. Both are shown, per Clay Jones’s 2013 tally, which is itself older scholarship that shifts as catalogues are revised.',
      ),
      h('div', { class: 'panel' }, cmpWrap),
    ),
    Disclosure(sk.points, { intro: sk.intro, framing: sk.framing }),
    SourceList([...mss.sources, ...comparison.sources]),
  );

  chart = scatter(chartWrap, () => year);
  setYear(year);
  compareChart(cmpWrap);

  let lastW = chartWrap.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(chartWrap.clientWidth - lastW) > 8) {
      lastW = chartWrap.clientWidth;
      chart.redraw();
      compareChart(cmpWrap);
    }
  });
  ro.observe(chartWrap);
  return () => ro.disconnect();
}
