# Browse printed source headings (D229)

## Demonstrated reading gap

At dev `0dce95d`, complete source-file readers provided numeric source-position jumps and known-word searches, but no way to browse their actual printed headings. An empty source-book search opened only a search form and the backend rejected an empty query. Readers had to know either a term or an offset before exploring a large file.

The existing renderer exposes 20,329 heading segments across all 61 complete root files. Examples: `vin02m1` has 480 headings in 3,671 segments; `abh01m` has 155 in 2,436; `abh03m10` has 2,503 in 8,046. The longest literal Roman heading is 68 UTF-16 characters. These counts describe rendered source-file headings, including invocations and colophons, **not** independently verified canonical chapters or standard citation identities.

## Reused architecture

The existing `search_source_book` adds an explicit `headings_only:true` option. Omitted/false mode retains its existing responses and search behavior. Empty queries are accepted only in the enabled mode and bypass spelling normalization/retries; the returned excerpt is the complete original heading text. Nonempty Pāli/native filters reuse the current query pipeline. Source order and repeated labels survive; rows retain their original refs, offsets, page/paragraph metadata and exact/context `get_text` commands. Enabled responses add only the mode echo, total printed-heading count and explicit scope qualification.

The existing book-search screen, forms, result renderer, paginator, source validator and exact/context links now support `mode=headings`. **Source headings** appears beside source books in the catalogue; **Browse source headings** is available inside a complete source book's Reading tools. Browse without a query, filter optionally, reset to all headings, or switch back to full-source search. The UI renders 15 rows per page instead of creating a 2,503-option native picker. Unknown modes, duplicate/unsupported fields and malformed encoding/control characters fail before a request.

The source validator requires the enabled mode to be echoed, every row to be `heading`, valid counts/continuations and the existing exact book/source/ref/offset/command relationships. In an unfiltered listing, matching and total-heading counts must be equal; independent review caught and closed this consistency gap. Ordinary responses may not acquire heading-mode fields. Native/keyboard labels, complete source terms and the source-file-not-canonical-citation qualification remain visible.

Pagination and reading reuse existing revision pins. Changed list or reading revisions refuse wording before explicit current-source review. A title/heading is never converted into an invented sutta/rule identity or hierarchy. There is no source-text mutation, new corpus, translation retrieval, rights expansion, private-data schema, query-history database or offline source cache.

## Verification scope

Backend tests enumerate every heading in every complete root file and compare literal text/order/refs to the unchanged renderer. Actual MCP tests check default/false compatibility, native output, blank/filtered pages and reading/context parity, including `vri-book:vin02m1/1006` (source offset 1,005). New frontend tests cover strict modes, empty pagination, source drift and malformed responses; the previous source-book search tests remain mandatory.

One manually typed native test fixture used an unsupported Sinhala long-vowel form; it was replaced with the existing shared transliterator's actual Pāli output, preserving the backend's rejection of unsupported input. An initial browser request-count assertion included an unfinished catalogue request; it now waits for the catalogue entry before measuring the separate heading request. All request and source assertions remain.

Browser acceptance covers representative files and first/second/last/filter pages, not an exhaustive browser traversal of 20,329 headings. Backend enumeration supplies the separate all-file evidence. Installed Firefox/WebKit and accessibility automation do not establish physical-device, OS font shaping or human screen-reader acceptance. Final local and exact-head CI results are recorded after the runtime build.


### Local acceptance, November 18

- Full check: 1,260 tests, 1,258 pass, zero failures, two existing optional-baseline skips; all 8,544 canonical records audited with zero failures. Final backend/frontend/default-compatibility target set: 22/22 pass.
- Heading browser: 28 normal checks, 56 across both themes in axe mode (80 scans, zero violations), and 28 against the isolated npm package. Final normal/package runs include beyond-end blank-list recovery and malformed encoding/control-character checks.
- Existing source-book search: 31 checks; existing reader: 173; compact reader: 45; installed Chromium compatibility journey: 76. Source-specific defaults and private drafts remain intact.
- MCP smoke: 34 tools, 64 checks. Offline evaluations: 195 pass; six network questions skipped. Documentation tests: 19 pass.

A final one-line clarification emits literal heading labels also for nonempty filters. Independent review confirmed current payload equivalence (all headings<=68 characters, below existing excerpt thresholds), unchanged ordinary behavior, and the absence of future heading truncation in the new mode. The 22 targeted tests passed again and runtime bundles were rebuilt. The extracted final package matches all 36 shipped runtime/documentation files byte for byte. Exact-head CI validates the entire final tree, including official Firefox/WebKit and packaged heading acceptance; local tests are not relabelled as a future CI result.
