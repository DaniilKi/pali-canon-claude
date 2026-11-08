# Standalone reader dev integration checkpoint

Prepared 8 November 2026. This checkpoint combines the published corpus head
`7b041738d8e1e5d43224f00ea21d38cfb4c671c5` with complete reader implementation
`5d16478cd70b0c8d6756cd20f5d74e9bf5e24bbe` and this documentation update.
The target is `dev/pali-reliability`; main and deployment are separate.

## Contents and boundaries

The reader, source-aware glossary/word/related tools, supplementary readers,
reading plans, bookmark/notes restore, daily reading and compact phone controls
are included. Source consent, source/notice pins, non-canonical labels, exact
references, browser-local personal data and rights boundaries remain intact.
The corpus head is an ancestor of the reader: integration requires a normal
fast-forward, with no source/data conflict resolution or dropped corpus commits.

Initial checkpoint `22ac074` changed documentation only beyond the tested reader.
Its first exact-head CI found a finder-navigation assertion race. A reproducible
same-route finder submission defect was also confirmed and repaired: both forms
close/focus synchronously and refresh when the URL is unchanged. The corrected
regression waits for the actual MCP response; see [finder submission acceptance](FINDER_SUBMIT.md).
No source mapping, database, credential, permission or hosting configuration
change is introduced by this repair.

## Verification and publication

A fresh combined local run passed 966 tests (965 passed, one existing skip),
the 8,544-text audit with zero failures, 34-tool/64-check smoke, and all 195
offline evaluation questions (six live-network questions skipped). Broader
reader 173, plans 49, restore 34, daily 36, compact-reading 33 and synthetic
source-consent 20 browser checks passed. The 42 real compilation checks and
15 installed shared-source audit modes passed as well. Documentation and static
reader tests are repeated after this checkpoint update.

These are local results, not a claim about a future hosted run. Verify the actual
`dev/pali-reliability` SHA and all workflows on that exact SHA in GitHub Actions:
Check package, full corpus, evidence commands and npx installation. Do not infer
success from earlier candidate CI or from this file's existence.

Before the ref update, fetch dev again and require its unchanged expected head.
Use a non-forced fast-forward with expected-head protection. If remote dev moves,
stop and inspect rather than overwriting or blindly retrying. Concurrent corpus
writers must refetch/merge the integrated dev history before their next update.

The Fly deployment workflow requires a release tag/manual dispatch; Pages uses
main; the Render blueprint has auto-deploy disabled. No such release/deploy action
is part of this integration. Public-host availability is not established here.
Human accessibility, physical devices, Safari/Firefox, native-reader and true
browser-zoom acceptance retain the limits in the feature receipts.

## Run the reader

Check out the verified dev head, then use `npm ci`, `npm run build` and
`npm run serve`; open `http://localhost:8080/`. This is an app-server launch,
not an offline-browser package or automatic public deployment.
