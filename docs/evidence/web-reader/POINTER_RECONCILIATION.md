# Reading-only cross-tab reconciliation

## Reproduced problem

[Baseline reproduction](pointer-before.json), built
`c3ec1bc8368216e98b15a1d926720f410b3b98f8`: tab A edited a
synthetic bookmark note. Tab B opened the actual MN 10 text. The only stored
field B changed was `last`, but A's Save note refused with “Another tab changed
browser data.” The note stayed unsaved. This was a user-facing limitation of the
previous conservative whole-profile guard, not a scripture/source-data error.

## Narrow repair

- Personal saves can reconcile only a validated `last` locator difference. If
  the caller did not change its locator, preserve the currently stored locator
  and adopt that locator in the tab. No private fields are automatically merged.
- Reading-only writes update the current profile's locator without replacing
  newer notes, marks, preferences or unknown fields. They keep the tab's OLD
  private-data baseline, updating only known locator state. Reading therefore
  cannot falsely acknowledge unseen private edits and permit a stale note save.
- An observed `remember_position:false` stops recording in the older tab without
  resurrecting its cursor. It does not provide instantaneous cross-tab UI sync.
- Progress-file preview and confirmation tolerate only locator-only changes;
  notes/marks/preferences/unknown-field changes still invalidate the preview.
- A final raw read immediately before writing detects intervening changes, but
  this remains best-effort optimistic coordination, not atomic CAS, a lock,
  general conflict merge, account sync or simultaneous-write certification.

The locator grammar accepts understood legacy and source-pinned reader links,
including source-book, plan, commentary and later-work context. It excludes
arbitrary URLs, duplicate/unknown fields and persisted English consent. Source
revision/ref validation still occurs before source wording is displayed.

## Acceptance

The repeatable browser suite is `scripts/web-reader-pointer-check.py`, with
`--a11y` and `--server-dir` modes. It uses two real Chromium tabs, real Pāli and
plan APIs, explicitly synthetic personal notes, keyboard saving/import, and
phone/tablet/desktop widths. It checks note saves after reading, preservation of
newer notes during scrolling, refusal of later stale private edits, cross-tab
opt-out, and locator changes before/during progress-file preview. Normal contexts
retain CSP; only accessibility audit contexts allow axe injection. Source scope,
private-data recovery, position and progress regressions remain required.

Completed regressions:

- [32 two-tab browser checks](pointer-browser.json), widths 320/390/768/1280.
- [32 extracted-package checks](pointer-installed.json), outside the source tree.
- [16 new accessibility scans with 32 functional checks](pointer-a11y.json), phone/desktop and both themes, zero detected violations.
- [48 exact-position checks](pointer-position.json) and [16 accessibility scans](pointer-position-a11y.json), zero detected violations.
- [38 storage checks](pointer-storage.json) and [12 accessibility scans](pointer-storage-a11y.json), zero detected violations.
- [44 progress-restore checks](pointer-progress.json) and [16 accessibility scans](pointer-progress-a11y.json), zero detected violations.
- [20 synthetic source-scope checks](pointer-scope.json); these do not claim new real-source approval.

The new low-level tests cover locator grammar, invalid/unknown-field refusal,
newer-note preservation, old-baseline retention, opt-out and an intervening-write
refusal before the write callback. [Local gates](pointer-validation.json) passed: 994 tests plus one explicit skip, 8,544-text audit with zero failures, 64 smoke checks and 195 offline evaluations plus six explicit live-network skips. Exact-head hosted CI is separate integration evidence.

 No source text, source licences, source API or
consent semantics changed. No new dependencies, accounts, cloud personal-data
storage, deployment or main-branch change are part of this repair. Physical
phones, Safari/Firefox, human screen-reader/native-reader acceptance and truly
simultaneous writes remain unverified.
