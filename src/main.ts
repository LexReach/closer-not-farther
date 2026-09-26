import './styles/fonts';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/modules.css';

import { h, clear } from './lib/dom';
import { routes, type RouteDef, type Cleanup } from './routes';
import { Tooltip } from './components';
import { BASE, href } from './lib/nav';


function currentPath(): string {
  let p = location.pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

const navLinks = new Map<string, HTMLAnchorElement>();

function buildShell(): HTMLElement {
  const nav = h(
    'ul',
    { class: 'nav' },
    routes.filter((r) => !r.hidden).map((r) => {
      const a = h(
        'a',
        { href: href(r.path), 'data-link': true },
        h('span', { class: 'nav__num', 'aria-hidden': 'true' }, r.num),
        h('span', { class: 'nav__long' }, r.title),
        h('span', { class: 'nav__short' }, r.short),
      );
      navLinks.set(r.path, a);
      return h('li', null, a);
    }),
  );
  const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
  const shell = h(
    'div',
    { class: 'shell' },
    h(
      'nav',
      { class: 'rail', 'aria-label': 'Sections' },
      h('a', { class: 'rail__brand', href: href('/'), 'data-link': true }, 'Closer, Not Farther', h('small', null, 'How the New Testament text reached us')),
      nav,
      h('p', { class: 'rail__foot' }, 'All figures come from the data files cited on each page.'),
    ),
    main,
    h(
      'footer',
      { class: 'site-footer' },
      h('p', null, 'Closer, Not Farther · ', h('a', { href: href('/about'), 'data-link': true }, 'Method and sources'), ' · ', h('a', { href: 'https://github.com/LexReach/closer-not-farther' }, 'Code and data'), ' · ', h('span', { class: 'num' }, `v${__APP_VERSION__} · ${__COMMIT__}`)),
    ),
  );
  return shell;
}

let cleanup: Cleanup;
let renderToken = 0;

async function render(focus = false) {
  const path = currentPath();
  const route: RouteDef | undefined = routes.find((r) => r.path === path);
  const main = document.getElementById('main')!;
  Tooltip.hide();
  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  for (const [p, a] of navLinks) {
    if (p === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const token = ++renderToken;
  clear(main);
  const page = h('div', { class: 'page' });
  main.appendChild(page);
  if (!route) {
    document.body.classList.remove('is-bare');
    document.title = 'Not found · Closer, Not Farther';
    page.append(
      h('p', { class: 'eyebrow' }, 'Error 404'),
      h('h1', null, 'This page is not in the manuscript tradition.'),
      h('p', { class: 'lede' }, 'No surviving copy has it. The address may be mistyped, or the page may have moved. These pages do exist:'),
      h(
        'ul',
        { class: 'nf-list' },
        routes.filter((r) => !r.hidden).map((r) => h('li', null, h('a', { href: href(r.path), 'data-link': true }, r.title), r.hook ? h('span', { class: 'muted' }, ` · ${r.hook}`) : '')),
      ),
    );
    return;
  }
  document.title = route.path === '/' ? 'Closer, Not Farther' : `${route.title} · Closer, Not Farther`;
  document.body.classList.toggle('is-bare', !!route.bare);
  const mod = await route.load();
  if (token !== renderToken) return;
  cleanup = mod.render(page);
  if (focus) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

function init() {
  // Restore a deep link redirected through 404.html (?p=/route).
  const params = new URLSearchParams(location.search);
  const redirected = params.get('p');
  if (redirected) history.replaceState(null, '', href(redirected) + location.hash);

  const app = document.getElementById('app')!;
  app.appendChild(buildShell());

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a[data-link]') as HTMLAnchorElement | null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search) return;
    history.pushState(null, '', url.pathname + url.search + url.hash);
    render(true);
  });
  window.addEventListener('popstate', () => render(false));
  render(false);
  if (new URLSearchParams(location.search).get('tour') === '1') import('./tour/tour').then((m) => m.maybeAutostart());
}

init();
