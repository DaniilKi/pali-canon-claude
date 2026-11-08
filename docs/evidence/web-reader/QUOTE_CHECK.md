# Pāli quotation checker acceptance

The standalone reader previously exposed no quotation checker, although the
existing MCP engine already supplied `verify_quote`. This slice adds **Check quote**
to the shared navigation. It reuses that engine with explicit Pāli language and
five results; there is no new matching algorithm or new source dataset.

Results preserve the engine's scope, source terms, normalized/literal comparison,
repeated-source caution and source excerpts. Similarity is not truth probability,
authorship, unique attribution or a verbatim certificate. Negative candidates are
labelled lower scoring, and negative conclusions stay within the searched corpus.
Exact source links use the engine's ID, offset and first segment, and the ordinary
reader checks that reference before display. The source context may be longer
than the match. Native input retains the conversion note and Roman source wording.

The quote is sent to this server but not written to route hashes, tab titles,
browser storage or notes. Host logging remains an infrastructure consideration.
English comparison is not offered in this bounded form; source-selection/consent
for ordinary English reading is unchanged and no translation body is fetched.

## Evidence

- [36 browser checks](quote-browser.json), widths 320/390/768/1280.
- [36 extracted-package browser checks](quote-package.json), run outside the source tree.
- [16 accessibility scans](quote-a11y.json), light/night on phone and desktop,
  zero detected violations and 36 functional checks.
- Unit guards cover real repeated wording, wrong request/language/verdict,
  missing scope/comparison/tie metadata and unsafe or mismatched source commands.
- Existing reader 173, compact navigation 41 and scope consent 20 checks passed.
- Documentation/static-reader tests passed 21/21.

The browser runner uses actual bundled Pāli and the real matching engine for
Roman/native matches, repeated wording, negative results and word-limit errors.
Missing scope, hostile markup and delayed responses are explicitly controlled
fixtures, not source findings. Audit-only contexts permit axe injection;
ordinary contexts retain production CSP. No physical-device, human accessibility,
native-reader, authorship or English-source certification is claimed.

Run `node --test tests/web-quote-check.test.mjs`, then
`python scripts/web-reader-quote-check.py` (normal, `--a11y`, extracted
`--server-dir`). The hosted Chromium workflow includes both normal and audit modes.
Exact-head hosted CI must be inspected separately; this receipt does not by itself
establish that a branch was integrated or deployed.
