# Sourced reading-plan acceptance

Cloud Linux, 8 November 2026; `feat/standalone-web-reader`, building on `157970f`. Corpus baseline remains `f0906bd`; the separate corpus session has not been merged. No main/dev integration or deployment.

## Delivered

- Header **Plans** opens all four existing `reading_plan` schedules: 26 Dhammapada chapters; the 365-day Majjhima Nikāya plan; and the two ATI study-guide citation orders. No new reading order or guide prose is generated.
- Day picker, previous/next day links and exact assigned Pāli reading links. Long split assignments open at the declared source offset and stop at their end, including across multiple reader pages. Read-time plan metadata, text identity, source revision, returned count and offsets are validated before display. Invalid selections fail without substitution.
- Link-only guide attribution, original-source links, copyright/terms, and unplaced-link reasons are visible. The engine’s original omissions are retained. English source bodies are never fetched automatically and are not presented as aligned to an assigned Pāli part.
- Manual, reversible browser-local day marks; JSON progress export. Marks include the assignment's text IDs, bounds and VRI revision. A changed assignment/source does not silently inherit a completion mark. Catalogue counts are explicitly historical saved marks, not verified current completion.
- No progress is sent to the server. Failed browser storage gives an honest warning while allowing export of tab-local marks. There is no account, sync, progress import, deadline, streak, automatic comprehension/completion claim or new persistent server data.

## Evidence

- `npm run check`: production build; **941 tests, 940 passed, one skipped, zero failed**; **8,544-text audit, zero failures**.
- `npm run smoke`: **34 tools, 64 checks passed**, live mode off.
- `npm run evals`: **201 questions**, 100% of non-skipped; six live-network questions skipped.

- **Seven policy/adapter tests** validate every day of every actual existing plan, bad identities/provenance, out-of-span positions, exact multi-page boundaries, source response mismatch, changed signatures and malformed local progress.
- [49 browser checks](reading-plans-browser.json) across **360/390/768/1280px**: real catalogues and assignments, keyboard mark/reload/undo, day picker, exact MN 10 part (day 26: zero-based offsets 103–133, displayed as segments 104–134) across two pages, no earlier/outside day, link-only guide and omissions, export, missing provenance, changed-source marks, unavailable storage and no progress upload/English body request.
- [16 axe-core scans](reading-plans-a11y.json), phone/desktop and paper/night: zero detected violations; 48 functional assertions also repeated in those audit contexts. CSP is bypassed only in the separate audit contexts to inject the checker. Incomplete/manual-review rules are retained. These are not human accessibility certification.
- [49 extracted-package checks](reading-plans-package.json): the same plan journeys pass while the installed HTTP bundle runs from outside the repository, without source modules or checkout runtime dependencies.
- Broader [173 reader browser checks](browser-check.json), 20 translation-scope checks and [44 general accessibility scans](accessibility-check.json) passed again.

Inputs are the actual bundled canonical corpus and existing engine schedules. Missing-provenance and changed-source responses are explicitly synthetic failure fixtures. Storage denial is synthetic. No live publisher body, source-rights approval or physical-device coverage is inferred from these tests.

## Repeat and integrate

```sh
npm run check
npm run smoke
npm run evals
python scripts/web-reader-plans-check.py --report /tmp/plans.json
python scripts/web-reader-plans-check.py --a11y --report /tmp/plans-a11y.json
# Optional: after npm pack and extracting its tarball:
python scripts/web-reader-plans-check.py --server-dir /path/to/package/server --report /tmp/installed-plans.json
```

Python Playwright and Chromium are required; use `PALI_BROWSER` when necessary. CI defines both plan checks and uploads reports, but the feature-branch push itself does not match the full-CI branch filters. No hosted CI pass is claimed.

Keep integration held until the corpus session's pending action completes and its owner coordinates. Rebuild and rerun the combined engine/UI checks after integration, especially study-guide links affected by new scope mappings. Existing shared-compilation support still has the [forward-fixture limit](TRANSLATION_SCOPE.md); this slice does not resolve it. Safari/Firefox, physical devices, human screen-reader/contrast and native-reader review remain outstanding. Bookmarks opened outside the plan are normal source readings, not bounded plan assignments.
