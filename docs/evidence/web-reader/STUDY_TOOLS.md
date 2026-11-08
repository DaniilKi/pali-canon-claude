# Study-tool interface acceptance

Baseline: `fd10129ba6bfb8b59402f18c50f1b77336aaa008` on `feat/standalone-web-reader`; corpus baseline remains `f0906bd`. Cloud Linux, 8 November 2026. Work remains separate from the active corpus branch: no dev/main merge, PR or deployment.

## Delivered

1. **Offline glossary:** English/Pāli lookup with direction selection and native-script input. DPD meanings and curated-list glosses keep their own sources. It is a term index, not full live dictionary articles, scripture or passage translation. Unknown terms get a no-match message; an incomplete response lacking metadata is an error instead.
2. **Selected-passage word study:** existing `analyse_passage` on the exact canonical, root-book or later-work source segment. All returned parses, grammar, meanings, roots and computed splits remain labelled dictionary material. Unknown forms and truncated alternatives remain explicit. Word pagination retains the selected segment. Commentary analysis is not supported by the existing backend and is not silently replaced with analysis of root text.
3. **Related-text evidence:** existing `get_parallels`, with machine-matched shared wording distinguished from citations in commentary. Every card displays how the relation was recorded. Shared-word scores are not probabilities or doctrinal-equivalence claims. Links use the emitted segment/citation; commentary evidence opens the non-canonical reader and preserves its exact aligned reference in bookmarks. SuttaCentral remains an external link only.

## Source integrity and implementation

- Word study checks segment reference, VRI source pin and actual displayed wording before showing meanings. Native-script comparison reuses the same `localizeText` function as the backend through the browser bundle. A deliberately changed text with unchanged reference/source pin is rejected in browser tests.
- The build now compiles `web/reader.js` with the shared first-party renderer into an IIFE at `server/web/reader.js`. HTML/CSS are copied. Unbundled HTTP-module tests serve compiled assets rather than raw module source. Docker/npm include them; no new runtime dependency is introduced.
- DPD and VRI notices are displayed separately, including complete existing source terms. No new source data, generated explanation, mapping change, API, account, sync or paid feature.
- Study request generation guards reject late results after another study/navigation. Missing relationship metadata fails visibly instead of reporting absence of relationships. Personal notes remain browser-local and clearly personal.

## Final checks

- `npm run check`: production build; **923 tests, 922 passed, 1 skipped, 0 failed**; **8,544-text corpus audit, zero failures**.
- `npm run smoke`: **34 tools, 64 checks passed**, live mode off.
- `npm run evals`: **201 questions**, 100% of non-skipped; six live-network questions skipped.
- Fresh HTTP/static-asset tests: two passed. JavaScript/Python syntax and `git diff --check` passed.
- [Browser flows](browser-check.json): **173 checks**, 360/390/768/1280 widths. Includes real glossary data, native input, exact selected-source analysis, word pagination, root-book/later-work source distinctions, exact related/commentary links and bookmarks, corrupt metadata, retry, stale results and tampered native-source wording. Failure fixtures are synthetic; actual sources/data are not changed.
- [Accessibility](accessibility-check.json): **44 axe-core 4.14.0 scans**, both themes and two widths, zero automatically detected WCAG A/AA violations. Incomplete/manual-review rules remain recorded; this is not a complete contrast/accessibility certification. The separate audit context permits checker injection, without weakening production CSP.
- [Packaged browser smoke](packaged-study-check.json): **six checks** across phone/desktop, executing an extracted npm package from outside the repository, with no checkout dependency. Actual glossary, word-study and related-evidence flows pass.

Test setup corrections were made before accepting the final run: wait for new glossary results instead of stale cards, distinguish preference summaries from word-analysis summaries, and respect the preference panel’s open state across hash navigation. These were test-harness corrections, not evidence of passing earlier failed runs.

## Remaining limits

Feature-branch push filters do not start full hosted CI. Combined integration CI and independent integration review remain necessary before merge. Physical devices, Safari/Firefox, native-reader fonts/language, human screen-reader/contrast review, upstream English availability and rights-cleared offline packs remain unverified. This is not feature parity with every existing MCP tool: quotation verification, further study/calendar/reading-plan interfaces and optional account/audio/offline functionality remain future work.
