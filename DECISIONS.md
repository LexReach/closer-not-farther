# Decisions and fallbacks

Every judgment call made during the unattended build, in the order it was made.

## Setup
- **Branch.** The session's harness designated `claude/bootstrap-prompt-execution-ag3d5w` as the working branch; the bootstrap says to push to `main`, and Pages deploys from `main`. Both branches are pushed with identical history after each step.
- **Network.** The sandbox proxy blocks Wikipedia, Wikimedia Commons, ebible.org, gnosis.org, earlychristianwritings.com and similar sites (403 on CONNECT, also for WebFetch). npm and Google Fonts CSS were reachable. Data checks therefore relied on web search snippets, raw GitHub text files, and the model's own knowledge; every such case is flagged below and in the JSON (`verify`, `verify_note`, `method`).
- **Fonts.** Loaded from Google Fonts at runtime (Fraunces, Source Serif 4, IBM Plex Sans, Noto Serif), with system serif and sans fallbacks in the stacks. The headless screenshot browser could not always fetch the font files through the proxy, so some screenshots show fallback fonts.
- **Routing.** History-API routes under the Pages base path `/closer-not-farther/`. `scripts/postbuild.mjs` copies `index.html` into one folder per route so deep links return 200, and to `404.html` for unknown paths.
- **Skeptic copy.** All "What skeptics say" points live in `data/skeptics.json` so that the About page can list them all in one place and every counterpoint has a source.
- **Dark mode** follows `prefers-color-scheme` only (no manual switch), as the spec describes.

## Module 1: Telephone vs. Tree
- **Alignment.** Copies are stored as slots aligned to the source words (omissions leave an empty slot; absorbed notes attach to the slot they follow). Real critics must collate first; the simulator skips that so the vote is the point.
- **Stable randomness.** Every draw is a hash of (seed, model, copy, word, purpose). Raising the error rate adds errors to the same copies instead of reshuffling, and a higher loss setting destroys a superset of the copies lost at a lower one.
- **What counts as recovered.** A word is recovered when the majority reading equals the source word with no absorbed note. A tie counts as unresolved.
- **The autograph is always lost** in both models; all copies (every generation) can survive.
- **Regions.** First-generation copies get a random region; each child stays in its parent's region with probability 0.8, otherwise moves.
- **Tree drawing.** A radial tidy tree (d3.hierarchy + d3.tree), because the maximum setting has 5,460 copies. Tree nodes are dots colored by number of changes or by region; the per-copy mini heatmap appears in the hover tooltip and the selected-copy panel. Chain tiles show the heatmap directly.
- **Harmonization** swaps from a small synonym list; where a word has no listed synonym, the error falls back to a spelling slip.
- **"Try to make the tree fail" preset:** 8% error rate, 90% loss, 2 copies per copy, 3 generations. Across 30 seeds the tree then recovers about 61% on average; at defaults it recovers about 99.7% vs about 73% for the chain (`npm test`).
- **Run** advances the seed and replays the copy animation; slider changes recompute instantly without animation. Once Reconstruct has been pressed, results stay live as settings change.

## Module 5: Names as fingerprints
- **Percentages** are computed at runtime from `data/names.json` counts divided by the stated totals. Bauckham's printed headline shares (`headline_stats`) differ from the recomputed ones (top 2 male names in Palestine: 17.6% recomputed vs 15.6% printed; top 9: 46.7% vs 41.5%). Both are shown side by side rather than silently choosing one.
- **`verify: true` values** (Gospels + Acts totals 79 / 18; Jonathan's Gospels count) could not be checked against the printed Table 6 from the sandbox. They are unchanged, marked with an asterisk in the chart, and explained in `verify_note`.
- **"Common name"** for the Twelve panel means in the top 12 male names shown in panel A (rank ≤ 12). Ranks come from `twelve.entries`.
- **Apocryphal names (panel C).** Populated for all four texts (37 entries) inside the ~$10 cap. The source sites were unreachable from the sandbox, so the lists were compiled from knowledge of the standard public-domain translations (Lambdin, Isenberg, the Gnostic Society text of Mary, Walker's ANF Protevangelium), with web search snippets as a check. Mention counts are approximate and flagged `approx`. The build details are kept in `apocryphal.build_note`; the UI shows `method`.
- **How panel C reads.** Instead of forcing apocryphal names onto the Palestinian frequency chart (their casts are mostly borrowed from the canonical Gospels), the panel shows, per text, how many names are borrowed and how the added ones are tagged. That is the fair version of the test, and it shows the complicating case too: the Protevangelium's additions (Joachim, Anna, Reuben) are ordinary Jewish names.
