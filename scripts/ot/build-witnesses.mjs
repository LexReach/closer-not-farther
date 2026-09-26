// Builds data/evidence/ot/witnesses.json: starts from the compiled base data in
// witnesses-data.mjs (see that file's header for what "compiled: true" means) and then
// attempts a handful of targeted, parseable live fetches to confirm or fill in specific
// fields (mainly `links` and `terms`). Every fetch is best-effort: on failure the
// compiled value is left as-is and the attempt is logged so SOURCES-OT.md can say
// plainly what was and wasn't verified this run.
import fs from "node:fs";
import path from "node:path";
import { loadEnglishVerseCounts } from "./verse-counts.mjs";
import { buildWitnesses } from "./witnesses-data.mjs";

const OUT_DIR = path.resolve("data/evidence/ot");
const FETCH_LOG_PATH = path.resolve("scripts/ot/.cache/witnesses-fetch-log.json");

async function fetchText(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "closer-not-farther-ot-data-build/1.0 (research; contact via GitHub repo LexReach/closer-not-farther)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function tryFetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function extractTermsSnippet(html) {
  // Very light heuristic: pull a short window of plain text around the first mention of
  // a rights/terms-bearing keyword. We deliberately don't try to fully parse arbitrary
  // site HTML; if this doesn't find anything useful the caller just keeps the compiled
  // placeholder.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keywords = ["copyright", "all rights reserved", "terms of use", "permission", "creative commons", "licen"];
  for (const kw of keywords) {
    const i = text.toLowerCase().indexOf(kw);
    if (i !== -1) {
      const start = Math.max(0, i - 120);
      return text.slice(start, i + 240).trim();
    }
  }
  return null;
}

async function enhance(witnesses, log) {
  // 1. Leningrad Codex images: confirm an archive.org identifier via the (JSON,
  //    easy-to-parse) advancedsearch API rather than guessing a slug.
  try {
    const url =
      "https://archive.org/advancedsearch.php?q=title%3A%28Leningrad+Codex%29&fl%5B%5D=identifier&fl%5B%5D=title&rows=5&page=1&output=json";
    const data = await tryFetchJson(url);
    const docs = data?.response?.docs || [];
    log.archive_org_leningrad = { ok: true, docs };
    // Prefer a result that is clearly the manuscript's own facsimile/images item (not
    // just any item whose catalog title happens to mention "Leningrad Codex", e.g. a
    // printed edition or an unrelated book matched only by keyword overlap).
    const best =
      docs.find((d) => /color.?images|full.*national library of russia/i.test(d.title || "") || /color/i.test(d.identifier || "")) ||
      docs.find((d) => /leningrad/i.test(d.identifier || "")) ||
      docs[0];
    if (best) {
      const w = witnesses.find((x) => x.id === "leningrad-codex");
      w.links.images_archive_org = `https://archive.org/details/${best.identifier}`;
      w.verified = { ...(w.verified || {}), links_archive_org: true };
    }
  } catch (err) {
    log.archive_org_leningrad = { ok: false, error: String(err) };
  }

  // 2. Aleppo Codex: fetch aleppocodex.org and look for a terms/rights statement, and
  //    confirm the site describes the Torah gap (coverage cross-check).
  try {
    const html = await fetchText("https://www.aleppocodex.org");
    log.aleppocodex_org = { ok: true, bytes: html.length };
    const snippet = extractTermsSnippet(html);
    const w = witnesses.find((x) => x.id === "aleppo-codex");
    if (snippet) {
      w.terms = snippet;
      w.verified = { ...(w.verified || {}), terms: true };
    }
    const lower = html.toLowerCase();
    w.verified = {
      ...(w.verified || {}),
      coverage_mentions_torah_gap: lower.includes("28:17") || lower.includes("28.17") || (lower.includes("torah") && lower.includes("missing")),
    };
  } catch (err) {
    log.aleppocodex_org = { ok: false, error: String(err) };
  }

  // 3. Leon Levy Digital Library (deadseascrolls.org.il): confirm the site is reachable
  //    and look for its terms-of-use language.
  try {
    const html = await fetchText("https://www.deadseascrolls.org.il");
    log.deadseascrolls_org_il = { ok: true, bytes: html.length };
    const snippet = extractTermsSnippet(html);
    if (snippet) {
      for (const w of witnesses) {
        if (w.institution && w.institution.includes("Dead Sea Scrolls")) {
          w.terms = w.terms || snippet;
        }
      }
      log.deadseascrolls_terms_snippet = snippet;
    }
  } catch (err) {
    log.deadseascrolls_org_il = { ok: false, error: String(err) };
  }

  // 4. Great Isaiah Scroll's specific Leon Levy manuscript page: verify the guessed
  //    URL actually resolves; if not, don't publish a guessed link.
  try {
    const w = witnesses.find((x) => x.id === "1QIsaa");
    const url = w.links.images;
    const res = await fetch(url, { method: "GET" });
    log.leon_levy_isaiaha = { ok: res.ok, status: res.status, url };
    if (!res.ok) {
      // Fall back to the Leon Levy Digital Library's own home page (confirmed reachable
      // separately, see deadseascrolls_org_il below) rather than publishing a guessed,
      // 404-ing deep link, or leaving no images link at all.
      w.links.images = "https://www.deadseascrolls.org.il";
      w.verified = { ...(w.verified || {}), leon_levy_link_confirmed: false };
    } else {
      w.verified = { ...(w.verified || {}), leon_levy_link_confirmed: true };
    }
  } catch (err) {
    log.leon_levy_isaiaha = { ok: false, error: String(err) };
    const w = witnesses.find((x) => x.id === "1QIsaa");
    w.links.images = "https://www.deadseascrolls.org.il";
  }

  // 5. Vatican Library viewer link for Codex Vaticanus: confirm reachability.
  try {
    const w = witnesses.find((x) => x.id === "codex-vaticanus");
    const res = await fetch(w.links.images);
    log.vatlib_vaticanus = { ok: res.ok, status: res.status };
    w.verified = { ...(w.verified || {}), links_images: res.ok };
  } catch (err) {
    log.vatlib_vaticanus = { ok: false, error: String(err) };
  }

  // 6. Codex Sinaiticus project site: confirm reachability.
  try {
    const w = witnesses.find((x) => x.id === "codex-sinaiticus");
    const res = await fetch(w.links.images);
    log.codexsinaiticus_org = { ok: res.ok, status: res.status };
    w.verified = { ...(w.verified || {}), links_images: res.ok };
  } catch (err) {
    log.codexsinaiticus_org = { ok: false, error: String(err) };
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(FETCH_LOG_PATH), { recursive: true });

  const verseCounts = loadEnglishVerseCounts();
  const witnesses = buildWitnesses(verseCounts);

  const log = { fetchedAt: new Date().toISOString() };
  await enhance(witnesses, log);

  fs.writeFileSync(FETCH_LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "witnesses.json"), JSON.stringify({ witnesses }, null, 2), "utf8");

  console.log(`Wrote ${witnesses.length} witnesses to ${path.join(OUT_DIR, "witnesses.json")}`);
  console.log("Fetch log:");
  console.log(JSON.stringify(log, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
