# Chapter navigation and compact source context (D226)

Baseline dev `7f37bbc262a4dcb006d3fe7d6061a16f995cdb99`, 9 November 2026.

## Existing chapter authority

Later-work responses already supplied chapter citations on complete-work selections, but the browser did not expose them. A selected chapter had no parent-menu command. Using its physical file as the logical parent would change scope: the Visuddhimagga has 23 chapters across two files with 11 and 12 headings; the Saṅgaha's nine chapters share a file with nine more Vibhāvinī headings. Mahāvaṃsa has 63 supplied headings. Nidānakathā and Mahāṭīkā remain distinct works.

A small additive `chapter_index` metadata field now supplies the authoritative existing parent command from the backend's actual selection: `scope` is `work` or `source_file`, and `read_with` is `get_post_canonical` with the exact parent citation, offset zero and limit one. Logical work selection uses the established Vism or Abhidh-s selector; an explicit physical file keeps its own source-file heading list. The metadata does not carry every chapter list on every response, add a tool, infer text, or change source-selection bounds.

Inside Reading tools, a complete-work menu uses its existing chapter rows immediately. After opening or reloading a chapter, **Choose chapter** explicitly retrieves only the authoritative parent; there is no automatic extra reading request. The menu verifies exact parent identity, full source attribution/terms, edition revision, scope and all literal rows before displaying choices. Source-file lists are labelled separately. An empty choice does not navigate. Opening uses the returned citation with offset zero and the existing `page_source` guard, never a guessed paragraph ref or generated chapter citation. Actual returned paragraphs still create normal exact bookmarks and reading positions.

The current Pāli stays visible through menu failure, Stop, retry or stale responses. Per-control generation and route/connection guards discard obsolete replies. Keyboard loading keeps a focusable status; completion focuses the selector or retry only while that status still owns focus. Moving elsewhere wins. Malformed optional metadata disables the menu while retaining the validated reading. A genuinely empty chapter list is handled quietly. Source changes require explicit current-source review.

## Shorter phone introductions, complete source context

Only two exact known root-book background notes and four exact known later-work background labels move, unchanged, into **Source context** inside the existing Reading tools disclosure. A short visible caution retains source-file versus standard-citation and unexpanded-abbreviation meaning. Post-canonical status remains visible.

One additional finite profile handles the exact Visuddhimagga opening note, only for the verified logical Vism selection, its first file, authoritative parent and complete 23-chapter menu. Its visible summary explicitly states **not the canon; volume 1, chapters 1–11 of 23**. The complete original explanation remains in source context. A reworded note, different selection or invalid authority stays visible and never receives an invented scope summary.

All other selection notes, unknown notes/labels, approximate status, alignment/method cautions, inferred-input notices and plan bounds retain their existing visible treatment. Classification never uses length or keywords. Canonical individual-text and commentary views retain their existing behavior. No printed Pāli heading, invocation, stanza or paragraph is collapsed, skipped, rearranged or rewritten.

Printing collects only the original, approved source-context notices through a narrow path inside the reading tools, plus the existing top-level scope and provenance. It does not collect chapter choices, study panels, note editors or private data. Full source terms remain accessible and printable. The existing responsive tools disclosure handles keyboard use and resizing; there is no new permanently visible phone navigation row.

## Measurement boundaries

The old 320×700 baseline placed the first printed source segment around Y=951 for vin02m1 and Y=1,010 for Vism with the measured profile. These are UI/header measurements, not claims about source text length. The first nonheading prose occurs much later because legitimate source headings and front matter precede it; those remain intact. The target is a full first line of the first **printed source segment**, including a heading, at the tested default font. Large fonts, long titles, other works and physical devices do not have a universal above-fold guarantee.

No source data, translation coverage, licence, private schema or paragraph locator grammar changes. Paṭṭhāna's raw-source access remains unresolved. Main merge and deployment are outside this task. Final local and exact integrated-head CI acceptance are recorded separately.

## Recorded local acceptance

The final production-CSP Chromium chapter journey passed 38 checks; the extracted npm package outside the repository passed the same 38. Separate accessibility acceptance passed 70 checks and 43 scans across four widths and both themes with zero violations. Actual engine: Chromium 155.0.8059.79. Expanded study compatibility passed 64 checks. The unchanged compact canonical-reader journey passed 45/45.

The baseline reader and CSS were independently verified byte-for-byte against the old commit, then measured with the identical final probe at scroll position zero, font 21 and tools closed. These are first **printed source** positions, including source headings:

| Source / viewport | Baseline first-source Y | Final first-source Y | Final full-line end Y | Fits viewport |
|---|---:|---:|---:|---|
| root vin02m1 / 320×700 | 951.42 | 640.95 | 675.51 | Yes |
| logical Vism / 320×700 | 1009.81 | 657.45 | 692.01 | Yes |
| root vin02m1 / 390×844 | 807.86 | 586.95 | 621.51 | Yes |
| logical Vism / 390×844 | 866.25 | 603.45 | 638.01 | Yes |

The source-heading line height is 34.56 px. The older exploratory baseline's 37.8 px field concerned nonheading body text and is not used in these comparisons. Early layouts failed the smallest viewport; the final repair shortened only authored metadata summaries and reduced an actual collapsed gap between metadata paragraphs. No rounding tolerance, font reduction, source omission or viewport-budget weakening was used. Source sequence and later first-nonheading positions remain separately checked.

Ten new policy tests passed, including all 95 logical/generic chapter entries and their reload authority, raw source-file boundary controls and native Sinhala/Thai rows. Five existing post-work/title regressions also passed during focused review. Full local acceptance passed 1,229 tests: 1,227 passed, zero failures, two existing optional skips. The 8,544-text audit was clean. Documentation/link/CI-artifact checks passed 21/21; offline MCP smoke passed 64 checks across 34 tools; evaluations passed 195 with six live-only cases skipped. All 36 packaged runtime/legal/documentation files matched the frozen build.

The existing print/PDF regression passed 12 checks before the final reading-only spacing repair; print policy and print CSS remained unchanged afterward. The final chapter journeys additionally verify complete original context, actual Pāli and terms while a real synthetic private draft is open, with private text and chapter controls excluded. Exact-head CI reruns the existing PDF regression too.

Independent policy, UI and harness reviews accepted the result. Tests use native role-based combobox selection while retaining exact names and all literal options. Changed-source and malformed-menu cases observe transient option insertion as well as the final screen; held old responses require actual body completion. Reload tests explicitly distinguish durable saved notes/pins from tab-local unsaved drafts. Normal CSP remains enabled; only separate axe runs bypass it.

Exact integrated-head CI must pass all existing source and personal-data flows, installed packages and actual Firefox/WebKit engines. Missing local engines are not substituted, and these automated checks do not certify physical devices or human accessibility.
