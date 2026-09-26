import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/**
 * Try each URL in order, returning the first that responds 200 with a body,
 * saved to `destPath`. Throws if none succeed.
 */
export async function fetchFirst(urls, destPath) {
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) {
        errors.push(`${url}: empty body`);
        continue;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buf);
      console.log(`Fetched ${url} -> ${destPath} (${buf.length} bytes)`);
      return url;
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  throw new Error(`All candidate URLs failed:\n${errors.join("\n")}`);
}

export function unzip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", destDir], { stdio: "inherit" });
}

export function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}
