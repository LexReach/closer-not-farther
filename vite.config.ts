import { defineConfig } from 'vite';
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
export default defineConfig({
  base: process.env.BASE ?? '/closer-not-farther/',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(commit),
  },
});
