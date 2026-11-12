# NASK Turbo — projectinstructies

Oefenapp voor NASK Hoofdstuk 5 "Bewegen" (havo onderbouw). Doel: leerling haalt met minimale inspanning maximaal resultaat op de toets.

## Architectuur
- `docs/js/` — bronbestanden (ES modules, vanilla JS, geen framework, geen build-stap)
  - `content.js` — regels, voorbeelden, valkuilen per vaardigheid, begrippen, feitvragen (eigen formuleringen, géén boektekst)
  - `generators.js` — pure vraaggeneratoren per vaardigheid + `check()` (NL-komma's toegestaan)
  - `graph.js` — pure SVG-generator voor (x,t)/(v,t)-diagrammen en stroboscoopfoto's
  - `app.js` — UI (home, spoedcursus, drill, turbo-mix, begrippen, proeftoets, spiekbriefje), voortgang in localStorage
- `docs/` — **gepubliceerde site** (GitHub Pages: branch `main`, map `/docs`). Wat in `docs/` staat is live.
- `tests/generators.test.mjs` — unit tests (600 vragen per vaardigheid)
- `tests/smoke.mjs` — Playwright smoke test over http (desktop + mobiel). Lokaal openen kan niet via file:// (ES modules): gebruik `npm run serve`.

## Werkwijze
- Na elke wijziging: `npm run check` (= unit + smoke). Alles moet groen zijn vóór commit.
- **Geen GitHub Actions / CI.** Alles draait lokaal. Deploy = `git push` naar `main` (Pages serveert `/docs`).
- Geen scans, foto's of letterlijke teksten uit het lesboek in de repo (auteursrecht). `_scans_jpg/` en `*.HEIC` blijven buiten de repo.
- Geen netwerkcalls, geen tracking, geen externe scripts (CSP in `docs/index.html`).

## Standaard codeergedrag

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
