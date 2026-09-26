#!/usr/bin/env node
// Clones the external source repos build-greek.mjs and build-lex-greek.mjs
// need. Run once, before those scripts, in a fresh CI checkout.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { SRC } from "./lib/paths.mjs";

function shallowClone(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`${dest} already exists, skipping clone of ${url}`);
    return;
  }
  console.log(`Cloning ${url} -> ${dest}`);
  execFileSync(
    "git",
    ["clone", "--depth", "1", url, dest],
    { stdio: "inherit", env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" } }
  );
}

shallowClone("https://github.com/morphgnt/sblgnt", SRC.morphgnt);
shallowClone("https://github.com/STEPBible/STEPBible-Data", SRC.stepbible);
