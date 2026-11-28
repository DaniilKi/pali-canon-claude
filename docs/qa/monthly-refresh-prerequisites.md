# Deferred monthly-refresh prerequisite repair

The monthly workflow explicitly fetches canonical baseline
`104b57a6891ddae645c51e39eb3d27b89b64ffdf` before `npm test`. Existing approved
acceptance setup also requires fixed historical H
`4e9287bd5ebc78aba4b185b017e63eac6547bfd7`. Its materializer uses local Git
objects with lazy fetch disabled. That H prerequisite is not explicitly fetched
by the monthly workflow. This is a source-level missing declaration; no actual
monthly failure or actual runner object absence was established by this review.

A bounded offline check constructed a bare object fixture with only the base
and104 commits. Missing H refused with status128; adding authentic H commit/tree
objects restored exact commit identity and selected tree mode/blob metadata.
The check used129 commit/tree objects(124,463 raw bytes), no blob bodies, network,
project import, application or materializer execution. It does not demonstrate
a complete monthly rebuild or selected-blob availability.

## Why the two-line patch is deferred

Adding a fixed shallow H fetch and commit check inside the existing two-minute
step preserves the operational bounds, but the historical104 auxiliary-workflow
test also seals that exact earlier fetch block and restored whole-workflow digest.
The thin patch therefore conflicts with an existing compatibility assertion.
The monthly workflow is unchanged by this intake.

A later repair needs an exact, independently reviewed current-source counterpart
and finite inverse to the historical block, with mutation/placement controls.
Keep the original assertions and historical source witness. Do not comment out
tests, auto-reseal an old expectation, increase deadlines or dispatch a live
monthly workflow to bypass this source compatibility work.

Even after that prerequisite repair, a refresh that changes VRI, numbering, DPD
or source correspondence can correctly fail current source/runtime pins and
produce a draft PR. Independent review of the actual source changes, rights,
locators, package budget and exact candidate remains necessary. This follow-up
does not block the separately reviewed eight-source intake and does not provide
offline browser/PWA acceptance or authorize a main merge/deployment.
