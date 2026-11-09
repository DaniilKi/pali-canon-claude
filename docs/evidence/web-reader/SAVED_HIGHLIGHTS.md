# Optional source-aware saved-passage highlighting (D222)

Baseline: dev `9c289995ff39115b1f609a7200b98f6633ba3727`, 9 November 2026.

## What changed

Reading preferences now includes **Highlight saved passages**. It starts on, preserving the earlier appearance for current, correctly pinned bookmarks. Turn it off for an unmarked reading surface; the existing Saved button still identifies saved references without relying on color. The description identifies highlighting as a personal bookmark aid, not emphasis in the source edition.

Previously `.segment.marked` was shaded whenever a matching saved ID/reference existed, even if its source revision was stale and the note panel correctly refused to associate it. A controlled browser baseline on actual Dhp 183 reproduced one shaded stale bookmark (`rgb(238, 238, 228)`) while its note was refused. This batch removes the unconditional background from `.marked`. The new `.personal-highlight` style requires one valid saved reference with the same selector, paragraph reference, source revision and exact offset as the loaded passage. Legacy unpinned, changed-source, duplicate, wrong-position and malformed records remain available in Saved/export; they are not silently rebound, edited, deleted or colored as current-source markers.

## Source and personal-data boundaries

This is whole saved-passage styling, not arbitrary word-range annotations or an added source-text layer. The original `.passage` strings and markup, canonical/commentary/later-work status, paragraph locators, edition notes, consent flows and licences remain unchanged. It applies only to loaded source-reading pages, including plan and native-script readings. It does not decorate English pages, source comparisons, daily previews, search snippets or other study material.

The single `highlight_saved` boolean uses the existing browser profile and optimistic write guards. Bookmark rows, draft notes and backup/import formats are unchanged. The display preference is not added to exported bookmarks, progress files or combined study backups. Source text is not copied into personal storage. An unavailable or conflicting write leaves the user's choice in this tab with the existing recovery warning; it does not claim durable or cross-tab synchronization.

Preference changes update current, connected source blocks in place. They do not rerender, fetch a source, cancel active study requests, change the reading locator, close editors or discard drafts. Registrations are cleared on route changes and filtered by the current epoch. Bookmark/note operations refresh styling only after their resulting local state is known, including rollback on failed saves/removal. A new reference retained only in-tab for recovery can still carry its personal marker; the existing storage warning explains its durability.

The light/dark wash and inset accent do not change layout dimensions. Forced-color styling uses an inset outline. Source-only printing rebuilds plain source paragraphs without bookmark classes or notes, so personal styling does not enter printed scripture.

## Evidence and limits

Tests use actual bundled source references/revisions across canonical text, complete root books, direct commentary and later works. Stale pins, wrong offsets, malformed metadata, private notes and storage/transport failure cases are explicit synthetic fixtures. Policy tests prove local metadata decisions, not the authenticity or doctrinal status of a text. Automated layout/accessibility and browser-engine acceptance remain separate from physical-device, native font shaping and human screen-reader review.

The existing extensible browser profile gains one optional display preference; saved-reference and transfer formats are unchanged. No source dataset, rights approval, server tool, account sync, offline source library, main merge or deployment is added. Paṭṭhāna remains assessment-only because the raw source evidence required for activation is still unavailable. Final local results and exact integrated-head CI are recorded separately below and in the machine-readable receipt.

## Recorded local acceptance

New policy tests passed 6/6; combined policy and existing passage-note tests passed 17/17. Full check: 1,190 tests, 1,188 passed, zero failures, two existing optional skips; audit: 8,544 texts, zero failures. Offline smoke passed 64 checks across 34 tools; offline evaluations passed 195 with six live cases skipped. Documentation/link and CI-artifact/gate tests passed 21/21.

Dedicated highlighting acceptance passed 45 normal checks, 45 installed-package checks and 89 accessibility-workflow checks, with 40 automated scans and zero violations. These include literal print-string equality and a bounded forced-color outline/geometry check. The expanded production-CSP Chromium compatibility journey passed 48 checks. The complete installed server tree plus README and privacy text match the tested package. Intermediate runs preceding the literal-print and forced-color additions are not used as final acceptance.

Independent helper, frontend and harness reviews found no remaining concrete issues. Actual Firefox/WebKit acceptance and all other platform, source, note, backup and print regressions must still pass on the exact integrated commit; local Chromium counts are not substituted for those results.
