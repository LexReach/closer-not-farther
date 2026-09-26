// Offline support for the Reader. The app shell and hashed assets are cached
// on first use; Bible and evidence data are served from the cache first (so
// text appears instantly on repeat visits) and refreshed in the background.
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const SHELL = `shell-${VERSION}`;
const DATA = 'data-v1';
const scope = new URL(self.registration.scope).pathname; // e.g. /closer-not-farther/

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([scope, `${scope}read/`]).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || net;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirstPage(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match(`${scope}read/`)) || (await cache.match(scope)) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scope)) return;
  const path = url.pathname.slice(scope.length);
  if (req.mode === 'navigate') e.respondWith(networkFirstPage(req));
  else if (path.startsWith('assets/')) e.respondWith(cacheFirst(req, SHELL));
  else if (path.startsWith('bible/') || path.startsWith('evidence/')) e.respondWith(staleWhileRevalidate(req, DATA));
});
