# Slow-request recovery acceptance

[Baseline reproduction](request-before.json) used compiled assets from `85249ea`
with a controlled stalled MCP response. It showed "Opening the library…", a
180,000 ms deadline and no stop control. The previous browser wrapper also lacked
request cancellation when changing routes; generation guards prevented stale
rendering but did not stop the old browser wait.

The standalone reader now exposes a labelled, keyboard-operable **Stop waiting**
control for each pending request. A small sticky region keeps it reachable while
scrolling and names the kind of reading/study request, never its query or notes.
Finishing or cancelling removes only its own row and deadline; removing the
focused control returns focus to the reading area or current study panel.

## Semantics

- Stop aborts this browser's fetch and settles waiting through a promise race,
  even if the transport ignores abort. It does not promise server-job cancellation.
- New routes supersede obsolete browser requests; new study panels supersede
  older study waits without replacing the Pāli source.
- User stop, deadline and service failure remain distinct. The existing finite
  three-minute browser deadline is retained. No automatic retry or replacement
  passage is introduced; an explicit retry remains available.
- A cancelled reviewed English request retains its exact version and scope pins
  for an explicit current-view retry. No alternate translation is fetched or
  consent upgraded; navigation still invalidates the view and ephemeral consent.
- Late success/rejection cannot resurrect a stopped result or alter a newer view.
  Backend/provider/source APIs, rights and source data are unchanged.

## Evidence

- Five lifecycle unit tests: success/failure cleanup, stop/late-result isolation,
  finite deadline, independent requests/scopes and immediate/superseding stop.
- [36 browser checks](request-browser.json), widths 320/390/768/1280.
- [36 extracted-package checks](request-package.json), outside the source tree.
- [16 accessibility scans](request-a11y.json), phone/desktop and light/night,
  zero detected violations and 36 functional assertions.
- Existing reader 173 and scoped-English consent 20 checks passed.

The recovery runner uses actual bundled Pāli, commentary, quote results and real
shared-source scope metadata. Held requests, an abort-ignoring fetch and direct
invocation of the unchanged deadline callback are controlled fixtures. They do
not establish backend-job cancellation, live English-provider availability or
user-network performance. No English body is fetched. Valid late commentary is
released and its response awaited before checking the stopped UI. Fixture routes
are explicitly cleaned up. Normal contexts retain production CSP; axe contexts
alone permit audit injection. Physical-device and human accessibility acceptance
remain unverified.

Run `node --test tests/web-request-lifecycle.test.mjs` and
`python scripts/web-reader-recovery-check.py`, also `--a11y` and extracted
`--server-dir`. Both browser modes run in hosted Chromium. Exact-head hosted CI
and Git refs establish integration separately; this receipt is not deployment.
