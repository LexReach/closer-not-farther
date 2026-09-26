// scripts/evidence/lib.mjs
// Shared helpers for the data/evidence fetch scripts. Plain Node ESM, no dependencies.
// Mirrors the style of scripts/library/lib.mjs but adds an on-disk raw-response cache
// (per CI run) so a single run never fetches the same NTVMR URL twice.

import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const USER_AGENT =
  'closer-not-farther-evidence/1.0 (+https://github.com/LexReach/closer-not-farther; manuscript-evidence data build; contact: repo issues)';

// IMPORTANT: the AbortController must stay live (not cleared) until the response BODY has
// also been fully read, not just until the response headers arrive. `fetch(url, {signal})`
// only covers connecting + receiving headers; a server that sends headers promptly but then
// streams (or stalls on) a slow/large body is otherwise completely unbounded by `timeoutMs`,
// which is exactly what made earlier versions of this pipeline hang far past their intended
// time budgets. `readBody` (default: `(res) => res.text()`) runs BEFORE the timer clears.
export async function fetchWithRetry(url, { headers = {}, timeoutMs = 60000, retries = 3, label = url, readBody = (res) => res.text() } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) {
        clearTimeout(timer);
        lastErr = new Error(`HTTP ${res.status} for ${label}`);
        const wait = 1500 * Math.pow(2, attempt);
        console.warn(`  [retry] ${label} -> ${res.status}, waiting ${wait}ms (attempt ${attempt + 1}/${retries + 1})`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        clearTimeout(timer);
        throw new Error(`HTTP ${res.status} for ${label}`);
      }
      const body = await readBody(res); // still under the same abort timer
      clearTimeout(timer);
      return body;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const wait = 1500 * Math.pow(2, attempt);
      console.warn(`  [retry] ${label} -> ${err.message}, waiting ${wait}ms (attempt ${attempt + 1}/${retries + 1})`);
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error(`Failed to fetch ${label}`);
}

export async function fetchJSON(url, opts = {}) {
  const text = await fetchWithRetry(url, opts);
  return JSON.parse(text);
}

export async function fetchText(url, opts = {}) {
  return fetchWithRetry(url, opts);
}

/** Run async tasks with a concurrency cap and an optional per-task delay. Never throws. */
export async function runPool(items, worker, { concurrency = 3, onError = null, delayMs = 300 } = {}) {
  const results = new Array(items.length);
  let idx = 0;
  async function runOne() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        if (onError) onError(items[i], err);
        results[i] = undefined;
      }
      if (delayMs) await sleep(delayMs);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runOne);
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Tiny disk cache for raw HTTP responses, scoped to CACHE_DIR (default a temp
// dir under the repo root's data/.cache-evidence, gitignored-by-not-being-added:
// the workflow never `git add`s this path). Keyed by URL. Being polite to
// NTVMR: avoids re-fetching the same page/manuscript URL twice in one run.
// ---------------------------------------------------------------------------

let CACHE_DIR = null;
export function setCacheDir(dir) {
  CACHE_DIR = dir;
}

function cacheKey(url) {
  return crypto.createHash('sha1').update(url).digest('hex');
}

export async function cachedFetchText(url, opts = {}) {
  if (!CACHE_DIR) return fetchText(url, opts);
  const file = path.join(CACHE_DIR, `${cacheKey(url)}.txt`);
  try {
    return await readFile(file, 'utf8');
  } catch {
    /* not cached */
  }
  const text = await fetchText(url, opts);
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, text, 'utf8');
  } catch {
    /* cache is best-effort */
  }
  return text;
}

export function sleepMs(ms) {
  return sleep(ms);
}

export async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}
