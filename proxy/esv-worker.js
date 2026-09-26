// Cloudflare Worker: a small proxy for the ESV API (https://api.esv.org).
// It keeps the API key server-side (secret ESV_API_KEY), forwards only
// passage/text and passage/html requests, allows CORS for the site's origin,
// and rate-limits each client IP. No text is stored.
//
// Environment:
//   ESV_API_KEY      (secret)  your ESV API token
//   ALLOWED_ORIGINS  (var)     comma-separated, e.g. "https://lexreach.github.io,http://localhost:5173"
//   RATE_PER_MINUTE  (var)     optional, default 60 requests per IP per minute

const ALLOWED_PATHS = ['/v3/passage/text/', '/v3/passage/html/'];
const hits = new Map(); // ip -> { n, reset } (per isolate; enough to blunt abuse)

function cors(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const headers = cors(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers });
    if (allowed.length && origin && !allowed.includes(origin)) return new Response('Origin not allowed', { status: 403, headers });
    if (!ALLOWED_PATHS.includes(url.pathname)) return new Response('Not found', { status: 404, headers });
    if (!env.ESV_API_KEY) return new Response('Proxy not configured', { status: 500, headers });

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limit = Number(env.RATE_PER_MINUTE || 60);
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now > h.reset) hits.set(ip, { n: 1, reset: now + 60_000 });
    else if (++h.n > limit) return new Response('Too many requests', { status: 429, headers: { ...headers, 'Retry-After': '60' } });

    const upstream = await fetch(`https://api.esv.org${url.pathname}${url.search}`, {
      headers: { Authorization: `Token ${env.ESV_API_KEY}` },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...headers, 'Content-Type': upstream.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  },
};
