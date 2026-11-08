# Reading-progress restore acceptance

Before this slice, Plans exported browser-local day marks but provided no way to
restore them. Users changing browsers/devices or recovering after cleared storage
could not use their backup. **Restore reading progress from JSON** closes this
one-way-backup gap with a manual, local file workflow. It is not account sync.

## Behavior and boundaries

- Preview first, with new/duplicate/conflicting-day counts; cancel changes nothing.
- Add only missing plan-day keys. Existing conflicting marks and source pins win.
- Validate the entire file and nested signature, supported plan/day identity,
  canonical command shape, source identifier, uniqueness and capacity before mutation.
- Reject oversized (16 MiB), foreign, malformed, duplicate-day or unknown-plan
  files atomically. Reject totals over 1,600 marks without truncation.
- Preserve older source/assignment signatures. A stale mark stays visibly
  uncredited on opening its current day. Marks are self-reported metadata, not
  proof of reading, comprehension or independently verified historical provenance.
- Refuse confirmation after browser data changed since preview. Refuse another
  preview from an already-stale tab until reload, instead of overwriting another
  tab's changes. This is a guard, not transactional or automatic multi-tab sync.
- Files stay on-device; no file body upload, scripture import or English fetch.
- Storage failure leaves explicit tab-only recovery/export. Late file completion
  cannot replace a newer view or mutate marks after navigation.

## Evidence

- [44 browser checks](progress-browser.json), widths 320/390/768/1280.
- [44 extracted-package checks](progress-package.json), outside the source tree.
- [16 accessibility scans](progress-a11y.json), light/night on phone and desktop,
  zero detected violations and 44 functional checks.
- Unit guards round-trip every actual day of every engine plan. Negative cases
  cover invalid nested signatures, source/identity mismatch, unsafe commands,
  extra fields, duplicate days, conflict preservation and atomic overflow.
- Existing regressions: plan reading/boundaries 49, bookmark restore 34,
  quotation checking 36. These do not infer a new source/translation approval.

The normal runner uses production CSP and actual engine plan signatures. Invalid,
oversized and hostile-name files, a changed source revision, competing browser
write, delayed File.text and storage failure are controlled fixtures, explicitly
not historical user records. Audit contexts alone permit axe injection. Tests do
not certify physical devices, native readers or human accessibility.

Run `node --test tests/web-progress-import.test.mjs` and
`python scripts/web-reader-progress-check.py`, also `--a11y` and extracted
`--server-dir`. Both browser modes run in hosted Chromium CI. Exact-head hosted
CI and Git refs are separate integration evidence; this file is not deployment.
