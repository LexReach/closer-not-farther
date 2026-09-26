// GitHub Pages has no SPA fallback. Copy the built index.html into a folder per
// route so deep links (e.g. /closer-not-farther/telephone) return 200, and use
// it as 404.html so unknown paths still load the app and show "not found".
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const routes = ['telephone', 'timeline', 'p66', 'variants', 'names', 'coincidences', 'about'];
const html = readFileSync('dist/index.html', 'utf8');
for (const r of routes) {
  mkdirSync(`dist/${r}`, { recursive: true });
  writeFileSync(`dist/${r}/index.html`, html);
}
writeFileSync('dist/404.html', html);
writeFileSync('dist/.nojekyll', '');
console.log(`postbuild: wrote ${routes.length} route pages + 404.html`);
