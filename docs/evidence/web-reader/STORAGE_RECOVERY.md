# Stale-tab preservation and recovery acceptance

[Baseline reproduction](storage-before.json), built `5022e3a`: two real same-origin
tabs edited a synthetic personal note. Tab B saved a newer note; stale tab A then
replaced it and reported “Personal note saved in this browser.” The newer stored
note was lost with no conflict warning. This was an actual user-data correctness
failure, separate from scripture/source retrieval.

## Repair

All primary profile writes use `guardedStorageWrite` to compare current raw data
with this tab's last observed snapshot before writing. A mismatch refuses the
write and keeps this tab blocked until reload. Notes, marks, preferences and
bookmark deletion cannot subsequently overwrite the newer profile. Initially
unreadable data is also preserved, rather than replaced by empty defaults.

This is a synchronous optimistic guard, not atomic compare-and-swap, distributed
locking, transactional multi-tab storage, automatic conflict merge or account
sync. Genuinely simultaneous/noncooperating writers remain outside its guarantee.
The tested defect is sequential stale-tab overwrite; do not call this a complete
concurrency solution.

A persistent **Keep this tab’s changes** region provides local bookmark/note and
plan-mark recovery downloads. Reload has explicit review/cancel controls. Files
preserve this tab's pending state; newer stored data stays untouched. Duplicate
note imports still keep the existing note, so conflicting recovered notes need
manual comparison/copying. Recovery is not automatic merge or repaired corruption.

Unsaved note drafts survive in-tab navigation in memory, not browser storage.
Normal/recovery exports include the latest drafts without implicitly saving them.
Save note is durable only after a successful current-snapshot write. Closing or
reloading discards unsaved/unexported drafts; removing a bookmark removes its
draft. A denied write keeps recovery available, and a later successful retry can
clear that warning. Scripture, source revision/scope rules and APIs are unchanged.

## Evidence

- [38 browser checks](storage-browser.json), widths 320/390/768/1280.
- [38 extracted-package checks](storage-package.json), outside the source tree.
- [12 accessibility scans](storage-a11y.json), phone/desktop and light/night,
  zero detected violations, with 36 functional checks.
- Unit tests verify current/empty snapshots, stale/unknown refusal without a
  write callback, and read/write-denial propagation.
- Existing regressions passed: bookmark import 34, progress restore 44,
  exact positions 48 and standalone reader 173.

The primary test uses two actual browser tabs and actual library/plan APIs, with
explicitly synthetic personal-note fixtures. Quota denial and malformed profile
cases are controlled fixtures. Downloads are local; no personal-note upload,
translation retrieval, messages or external client changes occur. Normal contexts
retain CSP; audit contexts alone permit axe injection. No physical-device,
human-accessibility or simultaneous-write certification is implied.

Run `node --test tests/web-local-storage-write.test.mjs` and
`python scripts/web-reader-storage-check.py`, also `--a11y` and extracted
`--server-dir`. Hosted Chromium includes both modes. Exact-head CI and remote refs
are the separate integration evidence; no deployment is made by this receipt.

The snapshot guard compares the whole profile. An unrelated preference or reading-position change can therefore block a stale tab too. For now, use one writing tab or export/reload to reconcile. Separating independent records and adding atomic coordination is future work, not part of this repair.

## Hosted CI budget repair

Initial exact-head [package run 42466702350](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42466702350)
was cancelled at the Chromium job's 10-minute deadline during the last storage
accessibility step. All earlier browser steps and platform jobs passed; the
receipt remains in history. The workflow now runs independent core/study/personal
browser groups in parallel, retaining every original command and artifact, with
the same 10-minute per-group limit and no disabled assertions. See
[partition validation](storage-ci-partition.json). New exact-head CI is required;
the old timeout is not reinterpreted as success.

The original `reader-browser` job ID and `Chromium reader` status name are
preserved as an always-run aggregate requiring every matrix group to succeed.
Branch-protection inspection returned GitHub 403 (integration lacks that read);
no rule was changed, and the existing status interface was retained defensively.

## Theme-transition accessibility repair

The first partitioned [package run 42467641862](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42467641862)
exposed a real `color-contrast` failure during the existing dark-theme bookmark
audit. Foreground changed immediately while the shared button background animated,
briefly producing light-on-light text. A [computed-colour reproduction](storage-theme-before.json)
measured 1.05:1 minimum. The nonessential background-colour transition is removed;
border animation remains. The [same probe after repair](storage-theme-after.json)
measured 9.57:1 minimum. Storage browser tests now sample both live theme changes
over animation frames on every viewport/theme case, requiring at least 4.5:1.
They bring the active test tab to the foreground and bound frame waiting; no
contrast rule, assertion or audit is disabled. The formerly failing bookmark
audit passed locally (16 scans, zero violations). New exact-head hosted CI is
required for this candidate; historical cancelled/failed runs remain unchanged.
