# One-file local study backup (D220)

Baseline: dev `aa78dd6814f1e17b86f19fbeceea0b8e2eeb7da8`, 9 November 2026.

## Move or recover a study session

**Study backup**, linked from Saved and Plans, downloads one private JSON file containing saved references and personal notes, tab-local note drafts, reading-plan marks and an optional reading reference. The recovery panel offers the same download. Existing individual bookmark and progress files remain supported in their original screens.

Creating the backup makes no server request or browser-data write once the app is loaded. It captures this tab’s supported study data, not another tab’s unseen changes. If an unsupported local reading reference cannot be included, the app says so and leaves the original browser data unchanged. Notes can contain personal or quoted material; keep the file private. The source-text library, accounts and browser appearance/preferences are outside this file’s schema.

Restore stays local and starts with a preview. New references and marks are added; existing notes, unsaved drafts, source pins and conflicting day marks are kept. Duplicate references with different notes or metadata are counted as conflicts rather than described as identical. Retain the original file to review those differences manually. This supports migration to a new browser and safe additions to an existing one; it does not reconcile edited notes into a two-way sync service.

The incoming reading reference is a separate, unchecked choice. The app never opens it automatically or switches on Remember reading position. If remembering is off, restoration of the reference stays disabled. Explicitly opening a pinned reference uses the existing source-version check before wording is displayed. Legacy references remain unversioned and are labelled; no source pin is invented.

## Interrupted and conflicting restores

Incoming marks are checked against the reader service’s current plan names and day bounds, using only the constant `reading_plan {}` request. The personal file is never sent to that service. Export is independent of service availability; an unavailable/malformed catalogue blocks the whole restore and offers retry. This does not make the browser app itself work offline or certify that a self-reported mark matches today’s assignment.

Cancel, navigation, a newer file selection or a changed local/private storage snapshot invalidates the pending preview. Re-selecting the same file works after errors. Ordinary reading-pointer-only changes in another tab can coexist with an unchecked-reference restore; a checked reference requires renewed preview if that pointer changed. Differing private data remains a sticky conflict—no unseen notes or marks are silently adopted. Unchanged unsupported legacy pointers do not falsely count as another tab’s change.

Apply stages both components and makes one guarded profile write. Reported/uncertain failure restores the tab’s earlier references, marks, reading reference and storage baseline, retaining all draft notes and the original input file for recovery. No half-import is presented as successful. This is still the existing best-effort localStorage guard, not an atomic cross-tab transaction. A failed explicitly chosen reference cannot cause a later unrelated save to resurrect an older pointer.

## File and source boundaries

The versioned format is exactly `{format: "pali-library-study-backup-v1", saved, progress, resume}`. Unknown settings, source-body fields and unsupported nested metadata are rejected. The outer limit is 32 MiB; existing 16 MiB component limits, 500 references, 1,600 marks and 4,000-character notes still apply. No records are truncated or evicted to make a restore fit. Filenames and user text stay inert and outside page titles, URLs, remote requests and Pāli print output.

`parseProgressMetadata` is a shared **syntax** validator used for offline export; it recognizes neither current plans nor authentic completion. It can preserve syntactically valid old plan metadata. Existing `parseProgress(text,catalog)` still enforces the supplied plan catalogue, and full-backup merge requires that current catalogue for incoming marks. Existing current signatures and metadata remain unchanged; incoming signatures receive only the established structural canonicalization. Source revisions, bookmark versions and scope-consent behavior are not upgraded or bypassed.

## Validation limits

Tests use actual bundled source references across canonical texts, complete root books, commentary and later works, plus actual plan signatures/catalogue. Private strings, quota/capacity failures and delayed/failed responses are explicit synthetic fixtures. Device widths 320/390/768/1280 and the 30px reading preference exercise browser layout and keyboard behavior. Automated accessibility checks do not certify human accessibility or physical devices.

The executor has system Chromium; Playwright Firefox/WebKit binaries and system Firefox were not installed when checked. No Firefox, WebKit, physical Safari/iOS/Android or native Files-app result is claimed. Manual follow-up should download a private synthetic backup on desktop, restore it through the target device’s file picker, verify existing-note/conflict and reference choices, then exercise catalogue outage/retry and private-browsing storage failure. Keep original files until the restored data has been checked.

Final local counts and exact integrated-head CI provide the acceptance receipt. No main merge or deployment occurs in this task.

## Recorded local acceptance

Full check: 1,183 tests, 1,181 passed, zero failures and two existing optional skips; the text audit checked 8,544 records with zero failures. New backup policy tests passed 11/11; the independent helper/legacy-policy run passed 25/25. Existing progress and bookmark-import browser regressions passed 44 and 34 checks. Offline smoke passed 64 checks across 34 tools; accuracy evaluations passed 195 with six live cases skipped. Documentation/link and CI-artifact retention checks passed 20/20.

Normal and installed-package Chromium backup acceptance each passed 79 checks. The repacked archive's complete server tree matches the tested runtime; README and privacy text match the final package. The backup CI group retains normal, accessibility and installed JSON artifacts and has a 20-minute ceiling for all three sequential runs; other groups keep their existing limits.

Independent final frontend/helper review found no outstanding material issues after the raw-equality, preflight eligibility and failed-write baseline fixes described above. Local reports are recorded in the adjacent machine-readable receipt; final integrated-head CI must be verified separately.

Accessibility variant passed 155 checks and 64 automated scans with 0 violations across the four widths in both themes.
