# ESV proxy (Cloudflare Worker)

The Reader can show the ESV, but the ESV API key must not be published, and ESV text must not be bundled. This Worker holds the key and forwards chapter requests from the site. It takes about five minutes to set up.

1. **Get an ESV API key**: sign in at https://api.esv.org, create an application for non-commercial use, and copy its token.
2. **Create the Worker**: in the Cloudflare dashboard go to Workers & Pages → Create → Worker, name it `esv-proxy`, choose "Edit code", paste in `proxy/esv-worker.js` and deploy. (With the CLI instead: `npm i -g wrangler`, `wrangler login`, then `wrangler deploy proxy/esv-worker.js --name esv-proxy --compatibility-date 2024-09-01`.)
3. **Add settings** (Worker → Settings → Variables):
   - Secret `ESV_API_KEY` = your token (with the CLI: `wrangler secret put ESV_API_KEY --name esv-proxy`).
   - Variable `ALLOWED_ORIGINS` = `https://lexreach.github.io`. Add `http://localhost:5173` for local development.
   - Optional: `RATE_PER_MINUTE` = `60`.
4. **Point the site at it**: put the Worker URL in `data/config.json`, e.g. `{ "esvProxyUrl": "https://esv-proxy.<your-subdomain>.workers.dev" }`, then commit and push. The deploy workflow publishes the change.
5. **Check it**: open the Reader, pick "ESV" in the version picker, and confirm the text loads with the ESV copyright line under it.

The Worker forwards only `/v3/passage/text/` and `/v3/passage/html/`, answers CORS for the allowed origins, and rate-limits each IP. The Reader fetches one chapter at a time and keeps at most 500 ESV verses in memory. Nothing is written to storage, per the ESV API terms (https://api.esv.org/#conditions).
