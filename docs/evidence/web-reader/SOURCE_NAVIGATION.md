# Revision-pinned page navigation and source-position jumps (D223)

Baseline: dev `7e2f18da64ebe0a5aae89d56b46f9b4d0fec4dbd`, 9 November 2026.

## Reader behavior

On phones, open **Study & sources** (canonical texts) or **Reading tools** (other works); desktop keeps those controls expanded. **Go to source position** jumps to an indexed segment in the currently selected work. Its displayed range comes from actual source metadata and, for a reading plan, the current assignment's window. These are source positions, not traditional citation or verse numbers. Named references still use Open a citation. Input is strict positive decimal digits: invalid, out-of-range, exponent, signed or decimal input leaves the current reading and drafts in place without a source request.

Next, Previous and explicit jumps retain the current source or locator-mapping revision. A baseline browser fixture opened a genuine revision-pinned MN 10 paragraph, observed Next emit `#read?uid=mn10&offset=31` without a source guard, and supplied the actual next page with **only** synthetic changed revision metadata. The old reader displayed it without review. No actual upstream edition change or altered Pāli wording was asserted. This batch closes that continuation gap.

## Separate page and paragraph grammars

A page link uses `page_source`, selected source context and a zero-based offset. Its next paragraph reference is unknown until retrieval, so no reference is invented. This is a transient page/version guard, not an exact saved-paragraph locator. Existing paragraph links retain `source` plus `ref` and `offset`, with the original strict validation. The shared source-context validator preserves the earlier selector/plan grammar.

Before requesting even plan metadata, a guarded page URL rejects unknown, duplicate or mixed keys, malformed revision/offset/context/day, and consent or personal-note fields. The router splits the fragment at its first `?` and preserves the entire remaining query for validation; a second literal `?` inside a pin can no longer hide a malformed suffix. After retrieval, it verifies the exact revision, requested offset, nonempty segment count and actual continuation metadata before displaying wording. Changed versions stop with no replacement passage; reviewing the current source is an explicit action that removes the page guard. Existing exact-bookmark review behavior remains separate.

Page links are deliberately **not** accepted by `isReadingLocator` or personal backup/import resume grammar. After a page loads, its actual returned references produce normal exact source-pinned reading positions for bookmarks, copy links and remembered reading. No personal schema, format version, history list or preference is added.

## Bounds and source scope

Navigation requires valid actual `offset`, `returned`, `segments.length`, `total_segments` and `next_offset`. The supplied continuation must equal the next actual contiguous offset, or null at the source end. The UI consumes that validated continuation and suppresses it at a plan boundary; it never invents a continuation from a missing field. Plan jumps remain within the validated current assignment. Current source/locator limits remain 100,001 indexed positions with offsets 0–100,000; unsupported metadata produces a navigation notice rather than guessed links.

An unguarded source page with unusable navigation metadata can remain readable with its original source terms and a navigation-unavailable notice. A guarded response with invalid position metadata fails before wording, preventing an empty or mismatched page from being remembered as a bogus exact locator. Invalid form input changes neither the URL nor private data; valid navigation uses the existing router, retaining tab-local note drafts. The compact form uses native labelled controls, an inline alert, numeric keyboard hint and responsive layout. It is outside source `.passage` nodes and printed scripture.

## Evidence boundaries

Tests use actual bundled multi-page selections from canonical texts, complete root books, commentary and later works, with real source revisions and a sourced plan assignment. Changed revision headers, malformed page metadata, private drafts and delayed requests are labelled controlled fixtures. No publisher English, new source text, reconstructed scripture or rights approval is introduced.

Automated browser engines, keyboard/layout tests and accessibility scans do not certify physical devices, native font shaping or human screen-reader use. Saved references, highlights, progress and backup formats, exact paragraph pins, source status/licences and source-only printing retain their existing boundaries. Paṭṭhāna remains assessment-only. Main and deployment are outside this task; final local and exact integrated-head acceptance are recorded separately below and in the receipt.

## Recorded local acceptance

The final parser-hardened production-CSP Chromium navigation journey passed 33 checks, and the expanded compatibility journey passed 52. Tests include the raw second-question-mark rejection before any request and a fresh response for each corruption case. Eight new policy tests plus old locator/bookmark tests passed 15/15; documentation/link and CI-artifact/gating checks passed 21/21. Offline smoke passed 64 checks across 34 tools; offline evaluations passed 195 with six live cases skipped.

A full local check before the final router-only hardening passed 1,198 tests: 1,196 passed, zero failures, two existing optional skips; the 8,544-text audit was clean. Earlier accessibility (65 checks, 56 scans, zero violations) and installed (33 checks) runs are diagnostic evidence from before that final build and are not claimed as exact-tree acceptance. The final parser repair is covered by the latest normal browser journeys; exact integrated-head CI reruns the full suite and all current normal/accessibility/installed and Firefox/WebKit paths.

Independent policy, UI and acceptance reviews found no remaining material issues. Review strengthened the fixture harness to force each malformed response to make its own verified request, preventing old DOM from satisfying later cases. No source wording or source dataset was changed.

The first integrated CI attempt passed navigation (33/65/33) and WebKit (52/52), but Firefox's normal run encountered CSP-blocked `eval` inside Playwright's `wait_for_function` fixture poll after 38 checks. This did not establish a product navigation defect. The harness now observes fresh root-element attributes for held-request count and completed response-body consumption, using bounded locator retries. It retains normal production CSP, exact request counts, full body timing and stale-screen/privacy assertions. Independent review accepted this test-only repair; the repaired Chromium journey passed 52/52. A fresh exact integrated-head run is required rather than relabelling the failed attempt.

The next CI attempt passed the repaired Firefox/WebKit jobs and dedicated navigation suite, but the existing compact-reader test caught a real layout regression: the added form moved the first Pāli paragraph below the 320×700 viewport. Source-position controls now share the existing mobile tools disclosure, with copy/print/navigation consistently grouped for supplementary sources; desktop remains expanded. No extra always-visible phone row or nested disclosure is introduced. The original full-first-line visibility assertion was retained. Final local compact acceptance passed 45/45 (first paragraph Y=661.95 on 320×700), navigation 33/33 and compatibility 52/52, including native keyboard use, resize focus and unchanged private draft/source data. No source guards or CSP were changed for this layout repair.
