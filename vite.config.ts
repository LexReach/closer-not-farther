import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, readFileSync as readFile } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let commit = (process.env.GITHUB_SHA ?? '').slice(0, 7);
if (!commit) {
  try {
    commit = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    commit = 'dev';
  }
}

// Served from https://<owner>.github.io/closer-not-farther/ on GitHub Pages.
// Override with BASE=/ for a root deploy.
/** Serve data/bible and data/evidence as static JSON at /bible and /evidence (dev), and copy them into dist (build). */
function dataDirs(): Plugin {
  const dirs: Record<string, string> = { bible: 'data/bible', evidence: 'data/evidence' };
  return {
    name: 'data-dirs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = (req.url ?? '').match(/\/(bible|evidence)\/([^?]+\.json)/);
        if (!m) return next();
        const file = join(dirs[m[1]], decodeURIComponent(m[2]));
        if (!existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/json');
        res.end(readFile(file));
      });
    },
    closeBundle() {
      for (const [name, dir] of Object.entries(dirs)) {
        if (existsSync(dir)) cpSync(dir, join('dist', name), { recursive: true, filter: (src) => !src.endsWith('.md') });
      }
    },
  };
}

export default defineConfig({
  plugins: [dataDirs()],
  base: process.env.BASE ?? '/closer-not-farther/',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(commit),
  },
});
