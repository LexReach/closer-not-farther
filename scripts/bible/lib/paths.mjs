import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
export const DATA_DIR = path.join(REPO_ROOT, "data", "bible");

export const SCRATCH = process.env.BIBLE_SCRATCH || path.join(os.tmpdir(), "bible-src");

// Local checkouts of external source repos, cloned by scripts/bible/fetch-deps.mjs
// (in CI) or by hand while developing (see scripts/bible/README.md), and
// overridable via env vars either way.
export const SRC = {
  morphgnt: process.env.MORPHGNT_DIR || path.join(SCRATCH, "morphgnt-sblgnt"),
  stepbible: process.env.STEPBIBLE_DIR || path.join(SCRATCH, "stepbible-data"),
};
