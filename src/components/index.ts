// Shared components (SPEC section 2): Card, Disclosure, SourceList, Slider,
// Toggle, Tooltip, Legend, StatTile. Each returns a DOM node plus, where it
// holds state, a small API for updating it in place.

import { h, s, nextId, clear } from '../lib/dom';

/* ---------- Card ---------- */

export interface CardOpts {
  href: string;
  eyebrow?: string;
  title: string;
  hook: string;
  preview?: SVGElement;
}

export function Card(o: CardOpts): HTMLAnchorElement {
  return h(
    'a',
    { class: 'card', href: o.href, 'data-link': true },
    o.preview ? h('div', { class: 'card__preview', 'aria-hidden': 'true' }, o.preview) : null,
    h(
      'div',
      { class: 'card__body' },
      o.eyebrow ? h('p', { class: 'eyebrow' }, o.eyebrow) : null,
      h('h2', { class: 'card__title' }, o.title),
      h('p', { class: 'card__hook' }, o.hook),
    ),
  );
}

/* ---------- Disclosure ("What skeptics say") ---------- */

export interface SkepticPoint {
  text: string;
  source?: string;
}

export function Disclosure(
  points: SkepticPoint[],
  opts: { title?: string; intro?: string; open?: boolean } = {},
): HTMLDetailsElement {
  const d = h(
    'details',
    { class: 'disclosure' },
    h('summary', { class: 'disclosure__summary' }, opts.title ?? 'What skeptics say'),
    h(
      'div',
      { class: 'disclosure__body' },
      opts.intro ? h('p', { class: 'muted' }, opts.intro) : null,
      h(
        'ol',
        { class: 'disclosure__list' },
        points.map((p) =>
          h('li', null, p.text, p.source ? h('span', { class: 'disclosure__src' }, ` (${p.source})`) : null),
        ),
      ),
    ),
  );
  if (opts.open) d.open = true;
  return d;
}

/* ---------- SourceList ---------- */

const URL_RE = /(https?:\/\/[^\s),;]+)/g;

/** Renders a source string, turning bare URLs into links. */
export function sourceText(src: string): (Node | string)[] {
  const out: (Node | string)[] = [];
  let last = 0;
  for (const m of src.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(src.slice(last, i));
    out.push(h('a', { href: m[0], rel: 'noopener', target: '_blank' }, m[0].replace(/^https?:\/\//, '')));
    last = i + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export function SourceList(sources: string[], title = 'Sources'): HTMLElement {
  return h(
    'aside',
    { class: 'sources' },
    h('h2', { class: 'sources__title' }, title),
    h('ul', { class: 'sources__list' }, sources.map((src) => h('li', null, sourceText(src)))),
  );
}

/* ---------- Slider ---------- */

export interface SliderOpts {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  format?: (v: number) => string;
  onInput?: (v: number) => void;
  onChange?: (v: number) => void;
  hint?: string;
}

export interface SliderApi {
  el: HTMLElement;
  input: HTMLInputElement;
  get(): number;
  set(v: number, fire?: boolean): void;
}

export function Slider(o: SliderOpts): SliderApi {
  const id = nextId('slider');
  const fmt = o.format ?? String;
  const out = h('output', { class: 'slider__value num', for: id }, fmt(o.value));
  const input = h('input', {
    id,
    type: 'range',
    class: 'slider__input',
    min: o.min,
    max: o.max,
    step: o.step ?? 1,
    value: o.value,
  });
  const update = () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    input.setAttribute('aria-valuetext', fmt(v));
    const pct = ((v - o.min) / (o.max - o.min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
    return v;
  };
  input.addEventListener('input', () => o.onInput?.(update()));
  input.addEventListener('change', () => o.onChange?.(Number(input.value)));
  update();
  const el = h(
    'div',
    { class: 'slider' },
    h('div', { class: 'slider__head' }, h('label', { for: id, class: 'slider__label' }, o.label), out),
    input,
    o.hint ? h('p', { class: 'slider__hint' }, o.hint) : null,
  );
  return {
    el,
    input,
    get: () => Number(input.value),
    set(v, fire = false) {
      input.value = String(v);
      const nv = update();
      if (fire) o.onInput?.(nv);
    },
  };
}

/* ---------- Toggle (segmented control built from radio buttons) ---------- */

export interface ToggleOpts<T extends string> {
  label: string;
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
}

export interface ToggleApi<T extends string> {
  el: HTMLElement;
  get(): T;
  set(v: T): void;
}

export function Toggle<T extends string>(o: ToggleOpts<T>): ToggleApi<T> {
  const name = nextId('toggle');
  let current = o.value;
  const inputs: HTMLInputElement[] = [];
  const legend = h('legend', { class: o.hideLabel ? 'visually-hidden' : 'toggle__label' }, o.label);
  const group = h(
    'div',
    { class: 'toggle__group' },
    o.options.map((opt) => {
      const input = h('input', {
        type: 'radio',
        name,
        value: opt.value,
        checked: opt.value === o.value,
        disabled: !!opt.disabled,
      });
      input.addEventListener('change', () => {
        if (input.checked) {
          current = opt.value;
          o.onChange(opt.value);
        }
      });
      inputs.push(input);
      return h('label', { class: 'toggle__opt', title: opt.title ?? null }, input, h('span', null, opt.label));
    }),
  );
  const el = h('fieldset', { class: 'toggle' }, legend, group);
  return {
    el,
    get: () => current,
    set(v) {
      current = v;
      for (const i of inputs) i.checked = i.value === v;
    },
  };
}

/* ---------- Tooltip (one shared floating element) ---------- */

let tipEl: HTMLDivElement | null = null;

function tip(): HTMLDivElement {
  if (!tipEl) {
    tipEl = h('div', { class: 'tooltip', role: 'tooltip', 'aria-hidden': 'true' });
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

export const Tooltip = {
  show(content: Node | string, clientX: number, clientY: number) {
    const t = tip();
    clear(t);
    t.append(content);
    t.classList.add('is-visible');
    const pad = 12;
    const { width, height } = t.getBoundingClientRect();
    let x = clientX + pad;
    let y = clientY + pad;
    if (x + width > window.innerWidth - 8) x = Math.max(8, clientX - width - pad);
    if (y + height > window.innerHeight - 8) y = Math.max(8, clientY - height - pad);
    t.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  },
  /** Position next to an element (for keyboard focus). */
  showFor(content: Node | string, target: Element) {
    const r = target.getBoundingClientRect();
    Tooltip.show(content, r.right, r.top + r.height / 2);
  },
  hide() {
    tipEl?.classList.remove('is-visible');
  },
};

/* ---------- Legend ---------- */

export interface LegendItem {
  label: string;
  color: string;
  shape?: 'square' | 'circle' | 'line';
}

export function Legend(items: LegendItem[], label = 'Legend'): HTMLElement {
  return h(
    'ul',
    { class: 'legend', 'aria-label': label },
    items.map((it) =>
      h(
        'li',
        { class: 'legend__item' },
        s(
          'svg',
          { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
          it.shape === 'circle'
            ? s('circle', { cx: 7, cy: 7, r: 5.5, fill: it.color })
            : it.shape === 'line'
              ? s('line', { x1: 1, y1: 7, x2: 13, y2: 7, stroke: it.color, 'stroke-width': 2.5 })
              : s('rect', { x: 1, y: 1, width: 12, height: 12, rx: 2, fill: it.color }),
        ),
        h('span', null, it.label),
      ),
    ),
  );
}

/* ---------- StatTile ---------- */

export interface StatTileApi {
  el: HTMLElement;
  set(value: string, sub?: string): void;
}

export function StatTile(label: string, value: string, sub = '', tone: '' | 'accent' | 'success' | 'warn' = ''): StatTileApi {
  const v = h('div', { class: 'stat__value num' }, value);
  const sb = h('div', { class: 'stat__sub' }, sub);
  const el = h('div', { class: `stat ${tone ? `stat--${tone}` : ''}` }, h('div', { class: 'stat__label' }, label), v, sb);
  return {
    el,
    set(value, sub) {
      v.textContent = value;
      if (sub !== undefined) sb.textContent = sub;
    },
  };
}

/* ---------- Section header used by every module ---------- */

export function ModuleHeader(num: string, title: string, lede: string): HTMLElement {
  return h(
    'header',
    { class: 'module-header' },
    h('p', { class: 'eyebrow' }, num),
    h('h1', null, title),
    h('p', { class: 'lede' }, lede),
  );
}
