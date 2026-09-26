// The argument in chapters. Each chapter mounts a live excerpt of its module's
// real components (not screenshots) with play/pause, so the home page, present
// mode and the guided tour tell the same story. Module code (and D3) is loaded
// only when a chapter is mounted.
import { h, clear, reducedMotion } from './lib/dom';
import { StatTile } from './components';
import { sourceText } from './data';

export interface ExcerptApi {
  play(): void;
  pause(): void;
  destroy(): void;
}

export interface MountOpts {
  big?: boolean;
}

export interface Chapter {
  id: string;
  num: string;
  title: string;
  path: string;
  /** One or two sentences that open the chapter on the home page. */
  lead: string;
  /** The one sentence that matters (chapter close; present-mode caption). */
  sentence: string;
  mount(el: HTMLElement, opts?: MountOpts): Promise<ExcerptApi>;
}

/** Runs `tick` every `ms` while playing. */
function ticker(ms: number, tick: () => void) {
  let id = 0;
  return {
    start() {
      window.clearInterval(id);
      id = window.setInterval(tick, ms);
    },
    stop() {
      window.clearInterval(id);
    },
  };
}

/* ---------- 1. Telephone vs. Tree: compare a single word ---------- */

async function mountTelephone(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const [{ runChain, runTree, reconstruct }, { WordStrip, readingsAt }, { HERO_PARAMS }] = await Promise.all([
    import('./modules/telephone/sim'),
    import('./modules/telephone/wordstrip'),
    import('./home/hero'),
  ]);
  const tokens = sourceText.tokens;
  const chain = runChain(tokens, HERO_PARAMS);
  const tree = runTree(tokens, HERO_PARAMS);
  const rc = reconstruct(chain, tokens);
  const rt = reconstruct(tree, tokens);
  const bad = [...rc.wrong.map((w) => w.i), ...rc.ties.map((t) => t.i)].sort((a, b) => a - b);
  const seq = [...bad.slice(0, 5), 3, ...bad.slice(5, 8)];
  let k = 0;
  const box = h('div', { class: `ex-tel ${opts.big ? 'ex-tel--big' : ''}` });
  const stats = h(
    'div',
    { class: 'ex-tel__stats' },
    StatTile('Telephone recovers', `${Math.round(rc.pct * 100)}%`, `${rc.survivors} surviving copies vote`, 'warn').el,
    StatTile('Tree recovers', `${Math.round(rt.pct * 100)}%`, `${rt.survivors} surviving copies vote`, 'success').el,
  );
  const strips = h('div', { class: 'ex-tel__strips', 'aria-live': 'polite' });
  const draw = () => {
    const i = seq[k % seq.length];
    const t = tokens[i];
    clear(strips);
    strips.append(
      h('p', { class: 'ex-tel__word' }, 'The word ', h('strong', { class: 'greek', lang: 'grc' }, t.gk), ` (“${t.en === '-' ? 'the' : t.en}”), as every surviving copy reads it`),
      WordStrip('Telephone', readingsAt(chain, i, tokens), opts),
      WordStrip('Tree', readingsAt(tree, i, tokens), opts),
    );
  };
  box.append(stats, strips);
  el.appendChild(box);
  draw();
  const tk = ticker(2800, () => {
    k++;
    draw();
  });
  return { play: () => !reducedMotion() && tk.start(), pause: () => tk.stop(), destroy: () => tk.stop() };
}

/* ---------- 2. Closer, Not Farther: the timeline sweeps from 1516 ---------- */

async function mountTimeline(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const tl = await import('./modules/timeline');
  const count = StatTile('Manuscripts known', '', '', 'accent');
  const early = StatTile('Earliest witness', '');
  const gap = StatTile('Gap to the originals', '', '', 'success');
  const yearEl = h('div', { class: 'ex-tl__year num', 'aria-hidden': 'true' });
  const chartWrap = h('div', { class: 'chart-wrap ex-tl__chart' });
  const box = h(
    'div',
    { class: `ex-tl ${opts.big ? 'ex-tl--big' : ''}` },
    h('div', { class: 'ex-tl__top' }, yearEl, h('div', { class: 'stats ex-tl__stats' }, count.el, early.el, gap.el)),
    chartWrap,
  );
  el.appendChild(box);
  const Y0 = tl.presets[0]?.year ?? 1516;
  const Y1 = tl.YEAR_MAX;
  let year = reducedMotion() ? Y1 : Y0;
  const chart = tl.scatter(chartWrap, () => year, { big: opts.big });
  const set = (y: number) => {
    year = y;
    chart.setYear(y);
    yearEl.textContent = String(y);
    const c = tl.countAt(y);
    const e = tl.earliest(y);
    count.set(c ? `≈ ${c.count.toLocaleString('en-US')}` : '—', c ? c.label : '');
    early.set(e ? `c. ${Math.round(tl.mid(e))} AD` : '—', e ? `${e.ga}, ${e.name.split(' (')[0]}` : '');
    gap.set(e ? `≈ ${Math.round(tl.mid(e) - 100)} years` : '—', 'after the New Testament was written');
  };
  set(year);
  let raf = 0;
  let t0 = 0;
  let playing = false;
  const SWEEP = 9000;
  const HOLD = 3500;
  const frame = (now: number) => {
    if (!playing) return;
    const t = (now - t0) % (SWEEP + HOLD);
    const y = Math.round(Y0 + Math.min(1, t / SWEEP) * (Y1 - Y0));
    if (y !== year) set(y);
    raf = requestAnimationFrame(frame);
  };
  const ro = new ResizeObserver(() => chart.redraw());
  ro.observe(chartWrap);
  return {
    play() {
      if (reducedMotion()) return set(Y1);
      if (playing) return;
      playing = true;
      t0 = performance.now() - Math.max(0, ((year - Y0) / (Y1 - Y0)) * SWEEP);
      raf = requestAnimationFrame(frame);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      playing = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

/* ---------- 3. P66: rows highlight word by word ---------- */

async function mountP66(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const p = await import('./modules/p66');
  const tokens = sourceText.tokens;
  const { svg, overlay } = p.facsimile();
  const gk = h('p', { class: 'ex-p66__gk greek', lang: 'grc' });
  const en = h('p', { class: 'ex-p66__en' });
  const gkSpans = tokens.map((t) => h('span', { class: 'p66-w' }, t.gk));
  const enSpans = tokens.map((t) => h('span', { class: `p66-w ${t.en === '-' ? 'is-untr' : ''}` }, t.en === '-' ? '·' : t.en));
  gkSpans.forEach((s) => gk.append(s, ' '));
  enSpans.forEach((s) => en.append(s, ' '));
  const box = h(
    'div',
    { class: `ex-p66 ${opts.big ? 'ex-p66--big' : ''}` },
    h('figure', { class: 'ex-p66__fig' }, svg),
    h('div', { class: 'ex-p66__rows' }, h('p', { class: 'eyebrow' }, 'Modern edition'), gk, h('p', { class: 'eyebrow' }, 'English'), en),
  );
  el.appendChild(box);
  let i = 0;
  const show = () => {
    gkSpans.forEach((s, j) => s.classList.toggle('is-on', j === i));
    enSpans.forEach((s, j) => s.classList.toggle('is-on', j === i));
    clear(overlay);
    overlay.append(...p.tokenBoxes(i));
  };
  show();
  const tk = ticker(750, () => {
    i = (i + 1) % tokens.length;
    show();
  });
  return { play: () => !reducedMotion() && tk.start(), pause: () => tk.stop(), destroy: () => tk.stop() };
}

/* ---------- 4. Variants: a disputed passage toggles in and out ---------- */

async function mountVariants(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const v = await import('./modules/variants');
  const p = v.passages.find((x) => x.id === 'john-5-4') ?? v.passages[0];
  let include = true;
  const state = h('p', { class: 'ex-var__state' });
  const text = h('p', { class: 'var-text ex-var__text' });
  const wit = h('div', { class: 'chart-wrap' });
  const box = h(
    'div',
    { class: `ex-var ${opts.big ? 'ex-var--big' : ''}` },
    h('p', { class: 'eyebrow' }, `${p.ref} · ${p.title}`),
    state,
    text,
    wit,
  );
  el.appendChild(box);
  const draw = () => {
    v.passageText(text, p, include);
    state.textContent = include ? 'With the disputed words, as in later manuscripts' : 'Without them, as in the earliest manuscripts and your footnote';
    text.classList.toggle('is-out', !include);
  };
  draw();
  v.witnessChart(p, wit, opts);
  const ro = new ResizeObserver(() => v.witnessChart(p, wit, opts));
  ro.observe(wit);
  const tk = ticker(3200, () => {
    include = !include;
    draw();
  });
  return {
    play: () => !reducedMotion() && tk.start(),
    pause: () => tk.stop(),
    destroy() {
      tk.stop();
      ro.disconnect();
    },
  };
}

/* ---------- 5. Names: bars draw in, then the Twelve light up ---------- */

async function mountNames(el: HTMLElement, opts: MountOpts & { part?: 'chart' | 'twelve' | 'both' } = {}): Promise<ExcerptApi> {
  const n = await import('./modules/names');
  const part = opts.part ?? 'both';
  const chartWrap = h('div', { class: 'chart-wrap' });
  const grid = n.TwelveGrid({ big: opts.big });
  const box = h('div', { class: `ex-names ${opts.big ? 'ex-names--big' : ''}` });
  if (part !== 'twelve') box.append(chartWrap);
  if (part !== 'chart') box.append(h('p', { class: 'eyebrow ex-names__twelve-h' }, 'The Twelve, Matthew 10:2–4: common names get a qualifier'), grid.el);
  el.appendChild(box);
  const draw = (animate: boolean) => n.drawNameChart(chartWrap, 'male', { animate, big: opts.big, limit: opts.big ? 8 : undefined });
  if (part !== 'twelve') draw(false);
  let timer = 0;
  let lastW = chartWrap.clientWidth;
  const ro = new ResizeObserver(() => {
    if (part !== 'twelve' && Math.abs(chartWrap.clientWidth - lastW) > 8) {
      lastW = chartWrap.clientWidth;
      draw(false);
    }
  });
  ro.observe(chartWrap);
  return {
    play() {
      if (part !== 'twelve') draw(true);
      window.clearTimeout(timer);
      if (part !== 'chart') timer = window.setTimeout(() => grid.play(), part === 'both' ? 2600 : 200);
    },
    pause() {
      window.clearTimeout(timer);
    },
    destroy() {
      window.clearTimeout(timer);
      ro.disconnect();
    },
  };
}

/* ---------- 6. Coincidences: Bethsaida unfolds in steps ---------- */

async function mountCoincidences(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const c = await import('./modules/coincidences');
  const it = c.coincidenceItems.find((i) => i.featured) ?? c.coincidenceItems[0];
  let shown = 1;
  const steps = h('div', { class: 'ex-uc__steps', 'aria-live': 'polite' });
  const box = h(
    'div',
    { class: `ex-uc ${opts.big ? 'ex-uc--big' : ''}` },
    h('div', null, h('h3', { class: 'ex-uc__q' }, it.question), steps),
    it.map ? h('figure', { class: 'uc-map ex-uc__map' }, c.mapInset(it)) : '',
  );
  el.appendChild(box);
  // All steps are laid out up front so the page does not jump; unrevealed ones are hidden.
  steps.append(c.stepsList(it, it.steps.length));
  const lis = [...steps.querySelectorAll<HTMLElement>('.uc-step')];
  const draw = () =>
    lis.forEach((li, i) => {
      li.classList.toggle('is-pending', i >= shown);
      // On stage, earlier steps shrink to their reference so the current one has room.
      li.classList.toggle('is-past', !!opts.big && i < shown - 1);
    });
  if (reducedMotion()) shown = it.steps.length;
  draw();
  const tk = ticker(2600, () => {
    shown = shown >= it.steps.length ? 1 : shown + 1;
    draw();
  });
  return { play: () => !reducedMotion() && tk.start(), pause: () => tk.stop(), destroy: () => tk.stop() };
}

/* ---------- 7. The Library: here they are ---------- */

async function mountLibrary(el: HTMLElement, opts: MountOpts = {}): Promise<ExcerptApi> {
  const lib = await import('./library/shelf');
  return lib.mountShelfExcerpt(el, opts);
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'telephone',
    num: '1',
    title: 'Telephone vs. Tree',
    path: '/telephone',
    lead: 'The objection: copying is a game of telephone, garbled a little more with every retelling. But the New Testament was not copied down one line. It spread through many lines at once, and independent lines can be checked against each other.',
    sentence: 'A single chain passes every mistake on; a branching tree lets the copies outvote each other.',
    mount: mountTelephone,
  },
  {
    id: 'timeline',
    num: '2',
    title: 'Closer, not farther',
    path: '/timeline',
    lead: 'In 1516 Erasmus worked from a handful of medieval copies. Every century since has turned up older ones.',
    sentence: 'The earliest copy scholars can read has moved back more than a thousand years since 1516.',
    mount: mountTimeline,
  },
  {
    id: 'p66',
    num: '3',
    title: 'Read P66 yourself',
    path: '/p66',
    lead: 'P66 is a papyrus book of John copied around 200 AD. Its first page lines up with a modern Greek New Testament word for word.',
    sentence: 'A reader today can follow a copy made about 200 AD against the text in their own Bible.',
    mount: mountP66,
  },
  {
    id: 'variants',
    num: '4',
    title: 'The 110% puzzle',
    path: '/variants',
    lead: 'With so many copies the problem is not missing text but extra text. The famous disputed passages are not hidden; they are in the footnotes.',
    sentence: 'The disputes are real, they are few, and they are printed at the bottom of the page.',
    mount: mountVariants,
  },
  {
    id: 'names',
    num: '5',
    title: 'Names as fingerprints',
    path: '/names',
    lead: 'Invented stories set far away tend to get the names wrong. The Gospels use first-century Palestinian names at about the rates the population did.',
    sentence: 'The Gospels’ names have the shape of the population they describe, down to who needs a second name.',
    mount: mountNames,
  },
  {
    id: 'coincidences',
    num: '6',
    title: 'Undesigned coincidences',
    path: '/coincidences',
    lead: 'One Gospel leaves a detail unexplained; another, telling a different part of the story, explains it without seeming to notice.',
    sentence: 'Details that interlock without anyone arranging them are what independent reports of real events look like.',
    mount: mountCoincidences,
  },
  {
    id: 'coverage',
    num: '7',
    title: 'Every verse, century by century',
    path: '/why/coverage',
    lead: 'Put every verse of the New Testament on one map, and light each one when a manuscript that survives today, copied by that century, is known to carry it.',
    sentence: 'Century by century, the surviving copies cover more of the text, until almost every verse has many witnesses.',
    mount: (el, opts) => import('./modules/coverage').then((m) => m.mountCoverage(el, opts)),
  },
  {
    id: 'library',
    num: '8',
    title: 'Here they are',
    path: '/library',
    lead: 'The manuscripts are not a rumor. Thousands are catalogued, and hundreds can be opened page by page from the libraries that hold them.',
    sentence: 'Every claim on this site can be checked against the manuscripts themselves.',
    mount: mountLibrary,
  },
];

export { mountNames };
