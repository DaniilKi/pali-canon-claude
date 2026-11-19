# Unsaved note recovery and user-owned focus

Baseline: `66a32753d305196d683b367613e5dbff2b551bc0` on dev.
Prepared 19 November 2026. No source, backend API, licence or coverage changes.
Main and deployment remain separate release decisions.

## What failed

A real phone-width reading of Dhp183 retained its draft during in-app navigation
and export, but following the same-tab source/licence link unloaded the reader.
Fresh navigation to Saved lost the draft while its saved bookmark remained.
Browser Back/BFCache was not established by that reproduction.

At phone and desktop widths, a delayed Pāli response took focus from a finder
input the reader had focused while waiting. The next character missed that
input. The native Chromium accessibility state confirmed focus moved to main.

## Draft behavior

HTTP source links now use separate tabs, without an opener or referrer, with a
visible/described new-tab hint. The reader document stays open.

A separate, bounded `sessionStorage` journal keeps only raw personal-note drafts
and their original saved-record metadata. It is not a saved-note write, source
assertion, account sync or generic form serializer. Search input, private file
names, source text and English consent do not enter it. The saved localStorage
profile and existing guarded save protocol remain separate.

Fresh same-tab reopening/reload resumes only an exact unchanged base. Changed,
missing or ambiguous records remain readable/exportable in recovery, without
recreating bookmarks or overwriting another tab’s saved note. Original optional
fields, source pins, CRLF and empty-string drafts are retained. Multiple bases
for the same passage may coexist; no variant is silently selected or truncated.
Pending cards show25/page, while downloads retain every variant. Individual
recovered-draft downloads use the bookmark format; the aggregate journal is a
separate recovery format.

Save remains explicit. Discard confirms cleanup of its active original-base
slot, including older text if the latest edit exceeded the journal bounds.
Pending-card discard uses its exact entry snapshot, preserving unrelated bases.
Failed cleanup cannot report successful discard. Bookmark removal and selected
backup note replacements first confirm journal cleanup; failed saved writes
restore recovery best-effort. Exact completed saves settle stale journal entries
without reviving them. Every confirmed write retains a warning when any latest
active edit still lacks its own confirmed recovery copy.

The journal validates at most500 original-base entries and16MiB of UTF-8 JSON.
Unreadable raw recovery remains untouched and downloadable until explicit
confirmed discard. Blocked/quota/racing writes preserve current memory/exports
and show a warning. No automatic eviction, retry, rebasing or private upload.
BFCache restoration does not rehydrate older session state over live drafts.

## Focus behavior

Normal navigation focuses reading synchronously before waiting. Successful or
failed completion does not reassert focus. A user-reopened phone finder stays
open. Exact-reference scrolling requires an unexpired focus lease; keyboard,
pointer, focus, background/visibility changes invalidate it, including leaving
and returning to the same element. Intentional navigation, script preference,
Stop/retry and stale-response protections remain distinct.

## Browser semantics and limits

Session storage is partitioned by origin and tab, survives reload, and can be
copied into opener/duplicated/restored sessions. It may end with tab close or
browser clearing; it is not a backup. [Mozilla session-storage reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

The native unload warning is a fallback. It requires browser support and user
activation and can be absent during mobile/OS termination. Save/export before
closing remains necessary. [Mozilla unload-event reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

Automated viewport, keyboard, AX and accessibility checks do not establish
physical-phone, human screen-reader, crash-recovery or universal BFCache behavior.
Synthetic memory-backed storage fixtures test journal limits and failed writes;
they do not certify a browser’s real storage quota.

## Regression commands

```sh
node --test tests/note-draft-recovery.test.mjs tests/web-focus-ownership.test.mjs tests/passage-notes-policy.test.mjs
PALI_BROWSER=/usr/bin/chromium python scripts/web-reader-draft-focus-check.py --report /tmp/draft-focus.json
PALI_BROWSER=/usr/bin/chromium python scripts/web-reader-draft-focus-check.py --a11y --report /tmp/draft-focus-a11y.json
# Repeat with --server-dir /path/to/isolated/package/server.
```

The existing storage, note, backup-conflict, core, compact and script-refresh
checks remain controls. Full canonical checks, independent implementation review
and successful CI on the exact candidate are required before dev advances.
Final validation and release status are established by the actual Git ref and
its exact-commit workflow results, not this prepared receipt alone.

## Optional next text scope

Six documents were examined independently while these fixes were built.
No coherent batch of new whole translations is ready. The best next whole-unit
review is SN27.5; nine other subjects on its anthology page already have English.
Olendzki’s Milinda verses would add a partial source, not a full question. The
Vinaya leads omit content and must not count as whole chapters. ABT Ds1.2 still
lacks verified raw/notice evidence in this environment. No source was activated.
[Metadata-only continuation record](../../data/next-text-scope-2026-11-19.json).

## Local validation

The full check passed **1,327 tests:1,323 passed,zero failed,four skipped**, plus
the **8,544-record canonical audit with zero failures**. The existing skips are
optional old source/historical checkouts and an unavailable live quotation;
actual Milinda source checks were enabled. Smoke passed34tools/64checks; all195
offline evaluation questions passed (six live-network questions skipped).

Final browser runs passed **19 normal,27 accessibility,19 isolated-package
checks**, including **31 accessibility scans with zero violations**. They retain
six native AX focus receipts and one synthetic capacity receipt per run. The
capacity fixture seeds500 near-limit entries, refuses a larger edit, checks the
warning after an unrelated write, then discards/reloads without reviving older
text. It preserves498 other variants after two explicit discards, bounds cards
to25 and exports every retained variant. This is controlled memory-backed session
storage, not a claim about real browser quota. No note values enter reports.

Existing regressions passed: core173,compact45,script-refresh24,storage38 and
note-editing64. Documentation/export checks passed19. Independent code review
found and resolved both capacity/base-clearing and stale-warning defects. Dev
advances only after successful CI on the exact reviewed integration commit.
