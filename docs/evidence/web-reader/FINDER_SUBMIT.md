# Finder submission repair during dev integration

The first exact-head package CI for `22ac074` failed in the compact-reader
finder assertion ([run](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42456722659),
Chromium job 128657215801). It observed the old heading before hash navigation
and the new response had completed; that heading was unchanged by an equivalent
citation. The original failing run remains in history.

An independent [local reproduction](finder-submit-before.json) also confirmed a
real same-route defect: opening `#read?uid=dhp183` and submitting `dhp183` made
zero additional requests and left the phone finder open. No hashchange fired.

## Repair and acceptance

Both citation and search form submissions now close the phone finder and focus
the main region synchronously. If the target hash is unchanged, they explicitly
render/refetch; otherwise normal hash navigation handles the request once.
Desktop finder visibility is retained. There are no source/provider/rights,
API-schema, storage, permission, main or deployment changes.

The regression retains its original drawer/focus checks, waits for the actual
MCP response instead of the old same-text heading, and adds same-route citation
and search cases across all four widths. No assertion was removed or skipped.

- [41 normal browser checks](finder-submit-browser.json): 320/390/768/1280,
  including four new reference-refresh and four new search-refresh cases beyond
  the earlier compact suite, plus its legacy listener compatibility case.
- [16 accessibility scans](finder-submit-a11y.json), both themes: zero detected
  violations; 40 functional assertions repeated. Only audit contexts bypass CSP
  for axe-core, and human/device/zoom limits remain unchanged.
- [41 installed-package checks](finder-submit-package.json) passed outside the source
  tree. Broader browser regressions passed: reader 173, scope consent 20, plans 49,
  bookmark import 34, and daily reading 36.
- Combined checks: 965 passed, one explicitly skipped; corpus audit 8,544 texts,
  zero failures; MCP smoke 64 passed; evaluations 195 passed with six live-network
  questions explicitly skipped. The documentation/static-reader checks passed 21/21.
- Exact-head hosted CI remains the final authority; local results alone do not
  establish a successful hosted release.

Integration uses a normal fast-forward with expected-head protection. Refetch
immediately before the update and stop if another writer moved dev. Do not use
force-pushes, disable gates or rewrite the earlier failing receipt.
