# Kickoff (full build, unattended)

You are building a static web app from a fixed spec. Read `SPEC.md` completely before doing anything else. Do not re-plan the product; the spec is final. Your job is execution quality, unattended.

Standing rules for this whole session:
1. Never stop to ask me anything. I am not watching. If something is ambiguous, pick the simpler option and log it in `DECISIONS.md`. If something fails, use the fallback the spec names (or the nearest reasonable substitute), log it, and keep going. Do not end the session until the app is deployed and every route works.
2. Build order: shell → Module 1 → Module 5 → Module 2 → Module 6 → Module 4 → Module 3 → About → README + GitHub Pages deploy. Commit and push after each step with a clear message.
3. After each module: run the build, take one Playwright screenshot at 1280px and one at 400px, fix what is visibly broken, move on. Do not loop on screenshots. Check dark mode once at the end.
4. Budget: target $150–200. Report approximate spend in one line after each module. Do not pause for approval at any spend level. At $200, finish the current module, then spend only on README, deploy and bug fixes. Hard ceiling $230.
5. You are running on Opus 5.5. Protect the budget by delegating mechanical work (builds, tests, screenshots, long reads, data lookups, dataset population) to Sonnet subagents, compacting between modules, and not re-reading files you already have in context.
6. All figures come from `data/*.json`. If a value is marked `verify: true`, do one quick check against the cited source and fix the JSON; never invent data. Cap the apocryphal-names extraction at ~$10; if it is not done by then, ship the toggle disabled with a "data pending" note.
7. Every module ships with its "What skeptics say" disclosure, written fairly.
8. Copy: plain, no exclamation points. Greek text uses a font with polytonic support.
9. Finish with: `README.md` (how to run, how to update each dataset, how deploy works), `DECISIONS.md` complete, GitHub Pages live. Your final message must contain the live URL, the repo URL, total approximate spend, and a short list of anything shipped at "minimum viable" level.

Start by scaffolding the Vite + TypeScript project, the design tokens and shared components from spec section 2, and the app shell with all routes stubbed. Then proceed to Module 1.
