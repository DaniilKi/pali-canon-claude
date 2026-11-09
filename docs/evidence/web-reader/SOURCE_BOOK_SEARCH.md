# Search complete source books in the reader (D225)

Baseline dev `ed57d3344b4424c6ec66f70436da4d20c6e43b9d`, 9 November 2026.

## The actual reading gap

The backend already searches complete bundled VRI source files, including headings and front matter outside the indexed citation spans. The browser exposed those files for sequential reading but did not expose their search tool. Browser Find can inspect only the current loaded page. A printed Vinaya introduction — “Ime kho panāyasmanto dvenavuti pācittiyā” — has no canonical global-search hit but has one exact source-book hit at `vri-book:vin02m1/7`. That difference is source scope, not missing or generated scripture.

`vin01m` has 2,407 source segments (81 ordinary 30-segment reader pages). Its repeated phrase “Namo tassa” has 40 matching source positions. Searching the whole source file can now reach those actual positions rather than requiring a reader to inspect each page or infer a standard rule citation. No new source, translation, reconstructed passage or citation mapping is introduced.

## Scope and navigation

Complete source-book catalogue entries offer a separate search action. An opened source book has a search form inside the existing responsive Reading tools disclosure, so it adds no permanently visible phone toolbar. The query searches this one complete file using the existing `search_source_book` tool. Native-script input/output, English-keyboard Pāli normalization, whole-stanza phrases, source terms and source-file caveats remain the backend's responsibility. This is Pāli source-file search, not full English-translation search or an asserted individual discourse/rule alignment.

Search-result pagination counts matching source segments. Reading offsets identify positions in the source file; these are different coordinates. Every matching segment remains a separate result even when several belong to the same book. Exact reading links bind the returned book, segment reference, actual source offset and revision. Context links use the existing transient page guard, never a fabricated paragraph reference. Pagination retains the chosen book, query and actual source revision. Changed source versions require explicit review rather than silently mixing old excerpts with new wording.

Strict request and response validation rejects unsupported routes, wrong books, unrelated queries, inconsistent counts/continuations, malformed references or commands, duplicate matches and changed pins before showing result excerpts. Native conversion is checked against the shared browser-safe converter; corpus-dependent keyboard inference must bind its reported original input and interpreted query. Its labels remain visible rather than claiming the browser re-proved that inference. An empty query opens only the catalogue-backed form. The browser never searches another book, automatically retrieves English, changes a source pin or creates a replacement citation.

## Privacy and evidence boundaries

This adds no account, search-history database, personal storage schema, source-body cache or offline pack. Search queries use the normal explicit URL/API workflow, while private note/draft contents are never copied into queries, document titles or requests. Notes and source-reading position behavior retain existing safeguards. Interrupted searches use the same bounded request pool and route-generation guards as other reader flows.

Automated browser, keyboard and accessibility checks do not establish physical-device, native font-shaping or human screen-reader acceptance. Coverage counts and Paṭṭhāna source-access limits remain unchanged. Main merge and deployment are outside this task. Final local and exact integrated-head CI results are recorded separately.

## Remaining reading opportunities

This batch intentionally leaves the older global title/body search presentation and later-work chapter menus unchanged. Existing later-work responses already contain chapter metadata that the reader does not yet expose. Long complete-book introductions also remain tall on phones: the tested `vin02m1` first passage began around Y=894 at 320×900 with the new search form closed, so this is not a claim that every source mode fits above the fold. The unchanged compact canonical-reader regression has its own separate measured budget. These are useful next reader tasks, rather than reasons to expand personal-backup scope again.

## Recorded local acceptance

The final production-CSP Chromium journey passed 31 checks; the same journey passed 31 checks from the extracted npm package outside the repository. Separate accessibility acceptance passed 55 checks and 42 scans across four widths and both themes with zero violations. Actual engine: Chromium 155.0.8059.79. Expanded study compatibility passed 60 checks. The unchanged compact canonical-reader journey passed 45/45.

Eleven focused policy tests passed, including all 61 actual catalogue IDs and real registered Roman/native/keyboard-normalized queries. Full local acceptance passed 1,219 tests: 1,217 passed, zero failures, two existing optional skips. The 8,544-text audit was clean. Documentation/link/CI-artifact tests passed 21/21, offline MCP smoke passed 64 checks across 34 tools, and evaluations passed 195 with six live-only cases skipped. All 33 packaged runtime/readme/privacy files matched the frozen build.

Independent policy, UI and harness review accepted the result. Review strengthened query binding before the first build, while preserving explicitly labelled backend inference. A bounded, count-only DOM observer additionally proves that corrupt responses do not briefly append source excerpts before the final error screen; it records no text or private notes. Each corrupt fixture makes a fresh verified request. The held-response fixture waits for actual response-body completion, then checks that the newer route still wins. An earlier normal run predating that observer remains diagnostic only; the recorded normal/accessibility/installed results above use the strengthened harness. Normal CSP remains enabled, with bypass limited to separate axe runs.

Exact integrated-head CI reruns all existing source and personal-data flows, installed packages and actual Firefox/WebKit engines. No missing local engine is silently substituted and no live publisher access or source-rights approval is inferred from these offline tests.
