# Local study-backup note conflict review (D224)

Baseline dev `d32876720709e34c9b04d64b57ce98f178991c93`, 9 November 2026.

Combined backup preview now shows differing duplicate personal notes side by side in pages of ten. Current text includes unsaved tab drafts, including an empty draft. All incoming choices start off; users can clear choices or download the current backup before replacing anything. Empty incoming text has an explicit clearing warning. The preview does not render note markup as HTML. The readonly textareas are a visual comparison only: the raw validated model strings, including CRLF and Unicode, are the bytes selected for storage.

Replacement requires unique valid saved identities with the same work, paragraph reference, saved source revision and exact offset. Legacy/unversioned, ambiguous, malformed and mismatched identities have no replacement control. Only note text changes: titles, references, source pins, offsets, other notes and conflicting plan marks remain. Matching metadata is not a fresh source-library verification. Opening a bookmark retains existing source checking.

The three-argument merge contract remains unchanged. Optional choices validate completely before any candidate mutation, and the browser recomputes them after its existing personal-data, raw-storage and optional-resume checks. One guarded write stages the complete restore. Selected draft keys are cleared only after confirmed success. Failed writes restore previous saved/progress/locator/storage baseline while preserving all drafts and choices. New files, cancellation and route changes invalidate old callbacks. No atomic cross-tab guarantee or persistent undo history is claimed. Download the current backup first to keep old note versions.

The file format and existing 32 MiB outer, 16 MiB component, 500-reference, 1,600-mark and 4,000-character note limits remain unchanged. Old individual bookmark imports remain additive. No personal file/name/note is uploaded, inserted in URLs/titles, or added to source text/print. Progress-only verification uses the public constant plan-catalogue request. Source data, rights, translation scopes and English consent remain unchanged. No main merge or deployment is authorized.

Acceptance results are recorded after the final build and integrated-head CI. Automated browsers and accessibility scans do not certify physical devices, font shaping or human screen-reader use.

## Recorded local acceptance

The final production-CSP Chromium conflict journey passed 39 checks; the installed package outside the repository passed the same 39. The separate accessibility run passed 75 checks and 57 scans across four widths and both themes with zero violations. Actual engine: Chromium 155.0.8059.79. The expanded compatibility journey passed 56 checks. Unchanged backup and compact-reader regressions passed 79 and 45 checks respectively; the first Pāli line remains visible at 320×700.

New policy plus old backup tests passed 21/21, and documentation/link/CI-artifact checks passed 21/21. The full local check passed 1,208 tests: 1,206 passed, no failures, two existing optional skips. The 8,544-text audit had zero failures. Offline MCP smoke passed 64 checks across 34 tools; evaluations passed 195 with six live-only questions skipped. The extracted package matched all 33 runtime/readme/privacy files exactly.

Independent helper, transaction and harness reviews accepted the result. Review caught and fixed a test-only timing gap: the delayed-catalogue assertion now waits for an explicit completed response-body marker before checking that the newer preview still wins. A cancelled empty section uses its exact DOM selector because an empty region is absent from the computed accessibility tree; the original empty-state assertion remains. Neither adjustment weakens product guards or production CSP. The conflict CI group has normal, accessibility and installed lanes with retained reports and a measured-runtime 20-minute allowance. No missing local Firefox/WebKit binary was substituted; ordinary official CI setup supplies those engines for exact integrated-head verification.
