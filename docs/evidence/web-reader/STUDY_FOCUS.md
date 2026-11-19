# Intentional quotation and commentary focus

Baseline: `5d2958f309b768e65a14fa4228e255f29a4cfa72`. The original actual-source probe reproduced two defects at390 and1280 CSS pixels: a delayed quotation result took focus from a resumed textarea, so the next typed key was not entered; aligned MN10 commentary pagination removed the focused Next button and left focus on BODY.

Quotation submission now focuses the stable labelled result section synchronously, before disabling Submit. The existing focus-ownership lease permits completion scrolling only if no later focus, input gesture, wheel/touch, blur or background event revoked it. Success and error replace result children without asynchronous focus movement. The submitted quotation and actual source evidence are retained; resumed input, caret and a different task keep control. Existing route/generation guards reject old responses. Nothing adds quotation history or stores unfinished inputs.

Commentary opening and pagination use the existing labelled study target synchronously. Its section survives loading, result and error replacement, so keyboard users retain a meaningful target. Later user movement revokes completion scrolling. An explicit Retry commentary page action repeats the failed canonical selection and offset. Stop remains browser waiting cancellation, not a claim that the server job stopped. Route/study generations reject old and superseded bodies. The source wording, terms and canonical Pāli underneath are unchanged.

## Repeatable acceptance

Run `python scripts/web-reader-study-focus-check.py --report <metadata.json>` against the committed HTTP bundle, then `--a11y` and `--server-dir <extracted-package/server>`. The harness obtains actual bundled Pāli, aligned commentary and verify_quote responses. Only delay/error/abort timing and private fixture state are synthetic. It checks deliberate loading/result focus, resumed textarea value/selection/next key, finder/preferences and scroll preservation, wheel revocation, Stop/retry, exact commentary offsets and study/navigation supersession. It asserts actual source wording/terms and private saved-state preservation, and rejects outside requests. Reports contain metadata, not source bodies or private input.

Normal mode enforces production CSP. Only axe audit contexts bypass CSP. Chromium viewport/keyboard automation does not certify physical devices, native input methods, OS text scaling or human assistive reading. The existing Firefox/WebKit acceptance remains required but is not a claim that this new controlled timing journey ran in those engines.

An attempted second-tab background check could not establish its precondition: headless Chromium kept the original document focused after the second tab was brought forward. Real window/background focus acceptance therefore remains unverified. The unchanged focus-owner unit tests cover logical blur invalidation; the actual native-wheel check separately verifies lease revocation while the result element retains focus.

The normal, accessibility and isolated-package journeys run inside the existing draft-safety CI group. Report retention and the reader aggregate remain required. Verify the complete matrix on the final exact commit before advancing dev. Main and hosting are separate decisions.

The [local validation receipt](STUDY_FOCUS_VALIDATION.json) records30 normal and30 isolated-package workflow checks, plus60 accessibility workflows/scans with zero axe violations. Legacy quote36, draft/focus19 and request-recovery36 checks also passed. These local receipts do not replace final exact-commit CI.
