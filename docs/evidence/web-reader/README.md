# Standalone web-reader acceptance evidence

Source base: `f0906bd` on `dev/pali-reliability`. Feature branch: `feat/standalone-web-reader`. Cloud Linux execution, 8 November 2026. This is a feature-branch acceptance record, not a deployment or human review receipt.

- `npm run check`: production bundles built; 923 tests, 922 passed, 1 skipped, 0 failed. Corpus audit: 8,544 texts, zero failures.
- `npm run smoke`: 34 tools, 64 checks passed; live-source mode off.
- `npm run evals`: 201 questions, 100% of non-skipped; six live-network questions skipped.
- `node --test tests/web-reader.test.mjs`: 2 passed. Fixed route serving, CSP/headers, GET/HEAD, path rejection, unchanged real MCP response and no fetched markup execution.
- `python scripts/web-reader-browser-check.py`: 101 assertions/journeys at 360, 390, 768 and 1280 pixels. See [machine-readable checks](browser-check.json).
- `npm pack` plus extracted-package smoke: all three assets present, root serves the app, and packaged MCP retrieves actual Dhp 183 without checkout dependencies.
- `git diff --check`: passed.

The full suite and browser runner were run locally in this cloud environment. CI status must be read from the feature branch after upload; it is not asserted here. No source-data rebuild, main/dev merge, hosting deployment, real-client test or upstream translation availability test was performed.

Browser tests include real bundled canonical and commentary text; controlled fixtures cover upstream outages, translation continuation and late translation results. They do not validate live translation access. Physical iOS/Android, Safari/Firefox, human screen-reader accessibility, native-script font/readability review, full MCP-tool feature parity, offline web packs and accounts/sync remain open. No generated scripture is used.

The [follow-up review](FOLLOWUP_REVIEW.md) records supplementary-corpus support, the repaired skip link, source-preserving bookmarks and 28 automated accessibility scans. The original acceptance counts above remain separately scoped; the current browser report supersedes the initial 65-check report.
