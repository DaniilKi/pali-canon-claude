# Local bookmark restore and integration CI

Independent branch `feat/web-bookmark-import`, based on integration candidate `b15fc1385aa0979ef4d15548d5e6cad376d47f6c`, 8 November 2026. No dev/main update or deployment.

## Hosted CI outcome for b15fc13

All four workflows completed successfully on that exact commit; see [machine-readable receipt](integration-ci.json):

- [Check package](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42441183302): **success**.
- [Read the full bundled corpus](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42441183315): **success**.
- [Evidence reading commands](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42441183243): **success**.
- [npx install](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42441183272): **success**.

These results cover b15fc13, not the later bookmark feature commit. The original integration receipt's pending-CI statement remains historical. This feature-branch push does not match the full CI branch filters.

## Delivered

Saved now accepts the existing bookmark/notes JSON export through a browser-local file picker. A bounded schema validates at most 500 records and a 16 MiB file, supported selectors/references, personal-note lengths, positions and revision fields. Preview shows additions and existing keys; confirmation adds new keys only, retaining every existing note/revision. Cancel does nothing. Invalid/foreign files, duplicate references inside the file and capacity overflow fail atomically without silently selecting, truncating or overwriting notes.

A navigation defect was demonstrated: a saved reference absent from the retrieved page could previously leave the surrounding source displayed. The reader now checks an explicit `ref` before displaying source text and fails rather than substituting nearby text. This applies equally to imported and pre-existing exact-reference links. Actual source content remains retrieved through the engine; file metadata is not authenticated scripture.

Canonical, root-book, commentary/aligned-commentary and later-work selectors are preserved. Notes and filenames are rendered as inert text. No file or personal note is uploaded or validated by a remote service. Late file reads cannot overwrite a newer route. If browser storage fails, the restored tab-local state remains exportable and the status does not claim durable storage. Reading-plan progress import remains future work.

## Validation

- `npm run check`: **961 tests, 960 passed, one skipped, zero failed**; **8,544-text audit, zero failures**.
- Smoke: **34 tools, 64 checks**; offline evaluations: **195 passed of 201**, six live-network questions skipped.
- **Six import policy tests:** supported modes, minimal legacy records, invalid fields, conflicting duplicate references, preserving existing notes/revisions and atomic capacity refusal.
- [34 browser checks](bookmark-import-browser.json), **360/390/768/1280px**: local preview/cancel, keyboard confirmation, existing-note preservation, inert markup, reload/export/duplicate round-trip, malformed/foreign/duplicate files, actual non-canonical modes, missing exact refs, late completion after navigation, storage denial and oversized file refusal.
- [16 axe-core scans](bookmark-import-a11y.json), both themes and phone/desktop: zero detected violations. 32 functional assertions repeated in audit contexts. CSP is bypassed only in those contexts for checker injection. Incomplete/manual-review rules remain recorded; no human certification is claimed.
- [34 extracted-package checks](bookmark-import-package.json): same restore journeys pass with the installed server running outside the checkout and no checkout runtime dependencies.
- Broader **173 reader**, **49 plan** and **20 scoped-source** browser checks passed again. No translation-source consent or provider implementation changed.

The delayed-file test fixture initially stalled because its evaluation returned the replacement function; using an explicit no-return closure repaired the harness. Stalled diagnostic runs were stopped, and only the completed corrected runs above are acceptance evidence. No application rule or test assertion was removed to obtain passing results.

## Repeat

```sh
npm run check
npm run smoke
npm run evals
python scripts/web-reader-import-check.py --report /tmp/import.json
python scripts/web-reader-import-check.py --a11y --report /tmp/import-a11y.json
# Optional extracted npm artifact:
python scripts/web-reader-import-check.py --server-dir /path/to/package/server --report /tmp/installed-import.json
```

Python Playwright and Chromium are required; set `PALI_BROWSER` when necessary. The CI workflow includes both import checks, ready for coordinated integration. Synthetic personal files/failures are distinguished from actual source-reading behavior. Physical devices, Safari/Firefox, human screen-reader/contrast/native-reader and true zoom acceptance remain outstanding. This feature does not publish a host or certify all future bookmark formats/source versions.
