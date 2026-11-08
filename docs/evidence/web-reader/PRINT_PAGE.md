# Current-page Pāli printing

This independent reader slice adds browser print / Save as PDF for the loaded
Pāli page, not a whole-book exporter. The source engine, text and rights policy
are unchanged. It does not modify local storage, notes or reading pointers.

## Design and safety

A dedicated module observes successful reader rendering and adds a keyboard
accessible Print loaded Pāli page control. Both that control and native browser
print create a fresh text-only snapshot. Only top-level reading metadata, the
Pāli passage section and its attribution are used. DOM text is copied unchanged;
no scripture is generated, HTML executed or remote resource retrieved. Study
panes, personal notes/bookmarks and interface controls are excluded.

Print records include title, canonical/commentary/later-work label, loaded
segment range, source warnings, source attribution and revisions supplied by the
reader, licence URLs and the reading URL without hosting query parameters.
Non-reading/error/loading screens produce an explanatory message. Snapshots are
cleared on navigation and afterprint; they are always rebuilt before printing.

The print stylesheet uses black-on-white pages independently of reading theme.
It keeps segment references and allows long segments to flow across sheets;
this is not an alignment-preserving scholarly edition or typesetting engine.

## Repeatable acceptance

`python scripts/web-reader-print-check.py` exercises the built server using real
bundled canonical, MN 10 continuation, complete source-book, commentary and
later-work pages at phone/desktop widths. The test compares each printed Pāli
segment against displayed wording, checks scope and attribution, produces ten
PDFs, checks screen/print separation, removes synthetic private study content,
strips hosting query parameters, tests keyboard activation, dark theme and
Devanagari, and checks saved/library/error screen refusal and snapshot cleanup.

The evidence JSON records exact exercised scope. PDFs are ephemeral test outputs
rather than new published scripture files. PDF signature/size is checked; no
physical-printer, Safari, tagged-PDF accessibility or exhaustive glyph review is
claimed. Existing reader/accessibility tests remain required.

## Completed cloud checks

- [12 print/PDF browser checks](print-browser.json), phone and desktop.
- [12 installed-package checks](print-installed.json), run outside the checkout.
- [44 automated accessibility scans](print-a11y.json), zero detected violations.
- [41 compact reading regressions](print-compact.json).
- `npm run check`: 994 passed, one explicit skip; 8,544-text audit, zero failures.
- `npm run smoke`: 64 checks; live providers not requested.
- `npm run evals`: offline gate passed; live-provider checks remain explicit skips.

Review corrected a phone-layout regression by placing the new action inside the
existing Study & sources disclosure. An adversarial navigation test also ensures
that old wording cannot be printed under a newly selected reading URL.
No live source, private note, account, main merge or deployment changed.
