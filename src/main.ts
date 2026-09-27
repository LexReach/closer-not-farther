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
const groupLinks = new Map<string, HTMLAnchorElement>();

const TOP: { group: RouteDef['group']; path: string; label: string; icon: string }[] = [
  { group: 'read', path: '/read', label: 'Read', icon: '¶' },
  { group: 'library', path: '/library', label: 'Library', icon: '▤' },
  { group: 'why', path: '/why', label: 'Why', icon: '?' },
  { group: 'about', path: '/about', label: 'About', icon: '·' },
];

function buildShell(): HTMLElement {
  const whyItems = routes.filter((r) => r.group === 'why' && r.path !== '/why');
  const nav = h(
    'ul',
    { class: 'nav' },
    TOP.map((t) => {
      const a = h('a', { href: href(t.path), 'data-link': true, class: 'nav__top' }, h('span', { class: 'nav__icon', 'aria-hidden': 'true' }, t.icon), h('span', null, t.label));
      groupLinks.set(t.group, a);
      const sub =
        t.group === 'why'
          ? h(
              'ul',
              { class: 'nav__sub' },
              whyItems.map((r) => {
                const sa = h('a', { href: href(r.path), 'data-link': true }, h('span', { class: 'nav__num', 'aria-hidden': 'true' }, r.num), h('span', null, r.title));
                navLinks.set(r.path, sa);
                return h('li', null, sa);
              }),
              h('li', null, h('a', { href: href('/why#film'), 'data-link': true }, h('span', { class: 'nav__num', 'aria-hidden': 'true' }, '◼'), h('span', null, 'The film'))),
            )
          : '';
      return h('li', { class: `nav__item nav__item--${t.group}` }, a, sub);
    }),
  );
  const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
  const shell = h(
    'div',
    { class: 'shell' },
    h(
      'nav',
      { class: 'rail', 'aria-label': 'Sections' },
      h('a', { class: 'rail__brand', href: href('/'), 'data-link': true }, 'Closer, Not Farther', h('small', null, 'The Bible and the manuscripts that carry it')),
      nav,
      h('p', { class: 'rail__foot' }, 'Every figure comes from a data file with its source.'),
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
let renderedPath = '';

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
  for (const [g, a] of groupLinks) {
    if (route && route.group === g) a.setAttribute('aria-current', route.path === a.pathname.replace(BASE, '') || (g === 'read' && route.group === 'read') ? 'page' : 'true');
    else a.removeAttribute('aria-current');
  }
  document.body.dataset.group = route?.group ?? '';
  const token = ++renderToken;
  renderedPath = location.pathname + location.search;
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
  // A change of hash alone (a verse, a Library item) is the page's to handle;
  // re-rendering the route here would orphan anything the page had open.
  window.addEventListener('popstate', () => {
    if (location.pathname + location.search !== renderedPath) render(false);
  });
  render(false);
  if (new URLSearchParams(location.search).get('tour') === '1') import('./tour/tour').then((m) => m.maybeAutostart());
}

init();

// Offline cache for the Reader (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=${__COMMIT__}`, { scope: import.meta.env.BASE_URL }).catch(() => {});
  });
}
