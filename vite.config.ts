import { defineConfig } from 'vite';

// Served from https://<owner>.github.io/closer-not-farther/ on GitHub Pages.
// Override with BASE=/ for a root deploy.
export default defineConfig({
  base: process.env.BASE ?? '/closer-not-farther/',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
});
