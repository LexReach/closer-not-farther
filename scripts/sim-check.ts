// Quick checks for the Module 1 simulator: determinism, speed at max settings,
// and that the default settings show the intended contrast.
// Run with: npm test
import { readFileSync } from 'node:fs';
import { runChain, runTree, reconstruct, type Params } from '../src/modules/telephone/sim.ts';

const tokens = JSON.parse(readFileSync(new URL('../data/source-text.json', import.meta.url), 'utf8')).tokens;
const mix = { spelling: 0.6, omission: 0.2, harmonization: 0.12, gloss: 0.08 };
const base: Params = { seed: 7, errorRate: 0.03, mix, loss: 0.5, chainN: 20, treeK: 3, treeDepth: 4, regions: 5 };

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};

const a = JSON.stringify(runTree(tokens, base));
const b = JSON.stringify(runTree(tokens, base));
check(a === b, 'tree is deterministic for a seed');
check(JSON.stringify(runChain(tokens, base)) === JSON.stringify(runChain(tokens, base)), 'chain is deterministic for a seed');

const max: Params = { ...base, errorRate: 0.08, loss: 0.9, chainN: 30, treeK: 4, treeDepth: 6 };
const t0 = performance.now();
const tree = runTree(tokens, max);
const chain = runChain(tokens, max);
reconstruct(tree, tokens);
reconstruct(chain, tokens);
const ms = performance.now() - t0;
check(tree.length === 5460, `max tree has 5460 copies (got ${tree.length})`);
check(ms < 200, `max settings run + reconstruct in ${ms.toFixed(1)}ms (< 200ms)`);

let tWins = 0, tSum = 0, cSum = 0;
for (let seed = 1; seed <= 30; seed++) {
  const p = { ...base, seed };
  const t = reconstruct(runTree(tokens, p), tokens).pct;
  const c = reconstruct(runChain(tokens, p), tokens).pct;
  tSum += t; cSum += c;
  if (t >= c) tWins++;
}
check(tWins >= 28, `tree recovers at least as much as chain in ${tWins}/30 seeds at defaults`);
console.log(`     mean recovery at defaults: tree ${(tSum / 30 * 100).toFixed(1)}%, chain ${(cSum / 30 * 100).toFixed(1)}%`);

const fail: Params = { ...base, errorRate: 0.08, loss: 0.9, treeK: 2, treeDepth: 3 };
let fSum = 0;
for (let seed = 1; seed <= 30; seed++) fSum += reconstruct(runTree(tokens, { ...fail, seed }), tokens).pct;
console.log(`     mean tree recovery on the "make the tree fail" preset: ${(fSum / 30 * 100).toFixed(1)}%`);
check(fSum / 30 < 0.9, 'the fail preset makes the tree fail on average');

// Monotonic loss: a higher loss setting destroys a superset of copies.
const lo = runTree(tokens, { ...base, loss: 0.3 });
const hi = runTree(tokens, { ...base, loss: 0.6 });
check(lo.every((c, i) => !c.lost || hi[i].lost), 'loss is monotonic in the slider');

if (failures) process.exit(1);
