// Home: the thesis in one screen, plus module cards.
import { h, s } from '../lib/dom';
import { Card } from '../components';
import { routes } from '../routes';
import { href } from '../lib/nav';

const W = 320;
const H = 140;

function frame(...children: SVGElement[]): SVGSVGElement {
  return s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', class: 'pv' }, ...children);
}

function previewTelephone(): SVGSVGElement {
  const els: SVGElement[] = [];
  // Chain on the left.
  for (let i = 0; i < 7; i++) {
    els.push(s('rect', { x: 34, y: 14 + i * 17, width: 70, height: 10, rx: 2, class: i > 3 ? 'pv-bad' : i > 1 ? 'pv-mid' : 'pv-ok' }));
    if (i) els.push(s('line', { x1: 69, x2: 69, y1: 4 + i * 17 + 7, y2: 14 + i * 17, class: 'pv-link' }));
  }
  // Tree on the right.
  const root = { x: 230, y: 18 };
  els.push(s('circle', { cx: root.x, cy: root.y, r: 5, class: 'pv-ink' }));
  const g1 = [175, 230, 285];
  g1.forEach((x, i) => {
    els.push(s('line', { x1: root.x, y1: root.y, x2: x, y2: 62, class: 'pv-link' }));
    [-18, 0, 18].forEach((dx, j) => {
      els.push(s('line', { x1: x, y1: 62, x2: x + dx, y2: 112, class: 'pv-link' }));
      els.push(s('circle', { cx: x + dx, cy: 112, r: 5, class: i === 1 && j === 2 ? 'pv-bad' : 'pv-ok' }));
    });
    els.push(s('circle', { cx: x, cy: 62, r: 5.5, class: 'pv-ok' }));
  });
  return frame(...els);
}

function previewTimeline(): SVGSVGElement {
  const pts = [
    [30, 120], [34, 118], [70, 58], [95, 60], [130, 92], [160, 104], [185, 80], [200, 112], [210, 50], [215, 96], [225, 40], [240, 30], [250, 22], [262, 20], [270, 26], [284, 18],
  ];
  const els: SVGElement[] = [s('rect', { x: 20, y: 8, width: 280, height: 8, class: 'pv-band' })];
  els.push(s('line', { x1: 20, x2: 300, y1: 130, y2: 130, class: 'pv-axis' }));
  for (const [x, y] of pts) els.push(s('circle', { cx: x, cy: y, r: 4.5, class: 'pv-accent' }));
  els.push(s('path', { d: 'M24,122 C120,110 200,60 296,18', class: 'pv-trend' }));
  return frame(...els);
}

function previewP66(): SVGSVGElement {
  const els: SVGElement[] = [s('rect', { x: 100, y: 8, width: 120, height: 124, rx: 3, class: 'pv-papyrus' })];
  for (let i = 0; i < 9; i++) {
    els.push(s('line', { x1: 112, x2: 208 - (i === 8 ? 40 : 0), y1: 22 + i * 12.5, y2: 22 + i * 12.5, class: 'pv-letters' }));
  }
  els.push(s('rect', { x: 136, y: 28, width: 22, height: 12, rx: 2, class: 'pv-box' }));
  return frame(...els);
}

function previewVariants(): SVGSVGElement {
  const els: SVGElement[] = [];
  const rows = [[30, 260], [30, 120, 150, 280], [30, 200], [30, 90]];
  rows.forEach((r, i) => {
    const y = 28 + i * 24;
    if (r.length === 2) els.push(s('line', { x1: r[0], x2: r[1], y1: y, y2: y, class: 'pv-text' }));
    else {
      els.push(s('line', { x1: r[0], x2: r[1], y1: y, y2: y, class: 'pv-text' }));
      els.push(s('rect', { x: r[1] + 6, y: y - 6, width: r[2] - r[1] + 60, height: 12, rx: 2, class: 'pv-hl' }));
    }
  });
  els.push(s('rect', { x: 30, y: 116, width: 196, height: 14, class: 'pv-tm1' }), s('rect', { x: 228, y: 116, width: 60, height: 14, class: 'pv-tm2' }), s('rect', { x: 290, y: 116, width: 10, height: 14, class: 'pv-tm3' }));
  return frame(...els);
}

function previewNames(): SVGSVGElement {
  const pal = [92, 84, 64, 62, 46, 38];
  const gos = [100, 74, 14, 62, 62, 25];
  const els: SVGElement[] = [];
  pal.forEach((v, i) => {
    const y = 14 + i * 20;
    els.push(s('rect', { x: 60, y, width: v * 2.2, height: 7, rx: 1, class: 'pv-muted' }));
    els.push(s('rect', { x: 60, y: y + 8, width: gos[i] * 2.2, height: 7, rx: 1, class: 'pv-accent' }));
    els.push(s('rect', { x: 20, y: y + 3, width: 30, height: 6, rx: 1, class: 'pv-text' }));
  });
  return frame(...els);
}

function previewCoincidences(): SVGSVGElement {
  const cols = [50, 125, 200, 275];
  const els: SVGElement[] = [];
  for (const x of cols) els.push(s('line', { x1: x, x2: x, y1: 14, y2: 128, class: 'pv-col' }));
  const links = [
    [275, 40, 200, 60],
    [125, 50, 275, 100],
    [50, 90, 200, 110],
    [125, 118, 275, 70],
  ];
  links.forEach(([x1, y1, x2, y2], i) => {
    els.push(s('path', { d: `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`, class: i === 0 ? 'pv-edge-on' : 'pv-edge' }));
    els.push(s('circle', { cx: x1, cy: y1, r: 4.5, class: 'pv-ink' }), s('circle', { cx: x2, cy: y2, r: 4.5, class: 'pv-ink' }));
  });
  return frame(...els);
}

const PREVIEWS: Record<string, () => SVGSVGElement> = {
  '/telephone': previewTelephone,
  '/timeline': previewTimeline,
  '/p66': previewP66,
  '/variants': previewVariants,
  '/names': previewNames,
  '/coincidences': previewCoincidences,
};

export function render(root: HTMLElement) {
  const mods = routes.filter((r) => PREVIEWS[r.path]);
  root.append(
    h(
      'section',
      { class: 'home-hero' },
      h('p', { class: 'eyebrow' }, 'Why trust the New Testament text?'),
      h('h1', { class: 'home-title' }, 'As time goes on, we’re not getting farther from the text. We’re getting closer.'),
      h(
        'p',
        { class: 'lede' },
        'Six interactive pieces that test that claim against the evidence: how copying works, what has been found, what the papyri say, where the real disputes are, and what the names and details reveal. Each one ends with what skeptics say.',
      ),
      h(
        'p',
        { class: 'home-src' },
        'Based on the case made by Wesley Huff in ',
        h('a', { href: 'https://www.youtube.com/watch?v=qYsBvzmdxQY', target: '_blank', rel: 'noopener' }, 'this talk'),
        '. ',
        h('a', { href: href('/about'), 'data-link': true }, 'Method, sources and limits'),
        '.',
      ),
    ),
    h(
      'div',
      { class: 'cards' },
      mods.map((r) => Card({ href: href(r.path), eyebrow: `Module ${r.num}`, title: r.title, hook: r.hook, preview: PREVIEWS[r.path]() })),
    ),
  );
}
