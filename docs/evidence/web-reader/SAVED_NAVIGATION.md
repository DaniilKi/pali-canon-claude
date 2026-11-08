# Saved-library search and navigation

## Gap and implementation

At source baseline `5c1a9a86789ecc1b42cf23344faac3882816faca`, Saved rendered every
bookmark and note editor (up to 500) in a single list, with no filter or paging.
The new pure `web/saved-passages.mjs` helper filters only local metadata and note
drafts. The UI displays at most 25 entries, labels source types, reports matching
and total counts, and restores visible keyboard focus after paging/removal.
It preserves original saved order. This is a usability improvement; no measured
speed, memory reduction, teaching benefit or full-text-search claim is made.

## Data and privacy boundaries

- Query/scope/page are tab-memory only; they are not part of the URL, page title,
  persistent profile or server requests. Reload resets them.
- Search is accent/case-insensitive substring matching over saved titles,
  selectors, refs and current notes, not scripture/English/provider search.
- Drafts remain independently keyed by saved selector/ref, so filtering or paging
  cannot discard invisible edits. Export still includes all saved entries and
  draft notes, even those on a different page or excluded by filters.
- Saving remains explicit and guarded by the existing storage-snapshot logic;
  no new synchronization, atomic transaction or conflict merge is introduced.
- Reading links retain existing corpus-selection behavior; saved metadata is not
  scripture or proof of source validity. Actual refs are checked when opened.
- Restore validation, scope warnings, sources, licences and corpus are unchanged.

## Completed acceptance

- Five focused helper tests in `tests/web-saved-passages.test.mjs`.
- [44 browser checks](saved-browser.json): 500 synthetic bookmarks, 25 editors,
  pagination/focus, local search, accent folding, noncanonical filters, inert
  markup, unsaved drafts, full exports and real Dhp 183 reopening.
- [44 installed-package checks](saved-installed.json), outside the source tree.
- [44 checks with 16 accessibility scans](saved-a11y.json), both themes and
  phone/desktop widths; zero automated violations detected.
- [34 import regressions](saved-import.json).
- [38 storage recovery regressions](saved-storage.json).
- [32 two-tab reading-pointer regressions](saved-pointer.json).
- `npm run check`: 999 passed, one explicit skip; 8,544-text audit, zero failures.
- `npm run smoke`: 64 checks; `npm run evals`: 195 passed, six live-network skips.

Independent AI review found no blocking defect and independently reran the five
unit cases and 44 browser cases. Its requested off-page export test was added:
edit a second-page note, filter to a different entry, export all 500 and verify
both drafts. Final read-only review confirmed this and the pager epoch guards.

Run `python scripts/web-reader-saved-check.py` with optional `--a11y` or
`--server-dir /path/to/installed/server` to repeat. Tests contain synthetic
personal data. No live source availability, real-account clients, physical
phones or human screen-reader certification is implied. Main and deployment
are outside this slice; hosted exact-head CI remains a separate integration gate.
