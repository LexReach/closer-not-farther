// GitHub Pages has no SPA fallback. Copy the built index.html into a folder per
// route so deep links (e.g. /closer-not-farther/telephone) return 200, and use
// it as 404.html so unknown paths still load the app and show "not found".
// Each copy gets its own <title>, description and OpenGraph tags from
// public/og/meta.json (written by scripts/render-og.mjs).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = process.env.SITE_URL ?? 'https://lexreach.github.io/closer-not-farther/';
const routes = ['telephone', 'timeline', 'p66', 'variants', 'names', 'coincidences', 'library', 'present', 'about'];
const html = readFileSync('dist/index.html', 'utf8');
const meta = existsSync('dist/og/meta.json') ? JSON.parse(readFileSync('dist/og/meta.json', 'utf8')) : {};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function page(path) {
  const m = meta[path];
  if (!m) return html;
  const url = SITE + (path === '/' ? '' : `${path.slice(1)}`);
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Closer, Not Farther" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}${m.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${url}" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('<!--og-->', tags);
}

writeFileSync('dist/index.html', page('/'));
for (const r of routes) {
  mkdirSync(`dist/${r}`, { recursive: true });
  writeFileSync(`dist/${r}/index.html`, page(`/${r}`));
}
writeFileSync('dist/404.html', html.replace('<!--og-->', '').replace(/<title>[^<]*<\/title>/, '<title>Not found · Closer, Not Farther</title>'));
writeFileSync('dist/.nojekyll', '');
console.log(`postbuild: wrote ${routes.length} route pages + 404.html${Object.keys(meta).length ? ' with OpenGraph tags' : ''}`);
