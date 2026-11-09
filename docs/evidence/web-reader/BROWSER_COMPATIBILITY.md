# Cross-engine study acceptance (D221)

Baseline: dev `91246037171f9d1f060d2a2e55e72c01515a169d`, 9 November 2026.

## Why this work

The earlier reader acceptance runs used Chromium. Viewport coverage alone did not establish that notes, source-pinned navigation, local-file transfer or interrupted requests worked in Firefox or WebKit. This batch adds a bounded installed-package journey across those engines, rather than inventing an engine-specific repair before reproducing a failure. Review also reproduced a general legacy-progress restore defect: unchanged raw browser data with an unsupported old reading pointer failed the pointer-only-change predicate. The corrected preview and apply guards first permit exact raw equality, while differing data must still satisfy the existing pointer-only rule. The progress file input is cleared after capturing its File so the same file can be chosen again following an error; delayed-read generation guards remain in place. Source text, licences, datasets and personal-data schemas remain unchanged.

The harness uses real bundled Pāli references and source revisions. Personal notes, altered revisions, and deliberately delayed responses are labelled test fixtures. No live publisher English or SuttaCentral content is requested. Reading and private-file data must keep their existing separation: synthetic notes must not enter MCP requests, the URL or document title.

## Repeatable setup

Use the repository's pinned Python Playwright version. Install the requested engine and its normal system dependencies, build and pack the project, then pass the extracted `package/server` directory to `scripts/web-reader-compat-check.py --engine firefox` or `--engine webkit`, together with `--server-dir` and `--report`. Chromium can use `PALI_BROWSER` to select the installed executable; do not point a Firefox/WebKit run at Chromium and call it a different engine.

Each CI matrix member installs its own engine through the official Playwright command and runs the installed package outside the source tree. Its JSON receipt records the actual engine, browser version, Playwright version, source references and completed checks. Missing browser binaries or launch failures fail the run; there is no engine substitution or silent skip. Per-engine artifacts and the aggregate reader gate preserve the result for future changes.

[Playwright's browser guidance](https://playwright.dev/python/docs/browsers) explains that its browser binaries are tied to its release. [Its CI guidance](https://playwright.dev/python/docs/ci) documents normal dependency installation on runners. These establish the test setup, not a compatibility guarantee for every browser version.

## Limits and follow-up

WebKit automation on Linux is an engine-level result, not certification of a released Safari version, physical iPhone/iPad, native Files app, on-screen keyboard or screen reader. [Playwright emulation](https://playwright.dev/python/docs/emulation) configures browser properties and viewport/device parameters; it does not turn a desktop runner into a physical device. The full historic Chromium suite remains complementary and is not reclassified as a multi-engine suite.

Unicode/source equality can establish that the requested text survived script selection; it cannot certify visual glyph shaping or native-reader comprehension with every operating system's fallback fonts. The ES2020 build target does not promise runtime polyfills for older browser APIs. Version claims must be limited to recorded engines, and the supported service must still be reachable: no offline web library or account sync is added.

The managed local executor has system Chromium but no Firefox/WebKit binaries. A HEAD request to the official `cdn.playwright.dev` Firefox archive was denied with CONNECT HTTP 403 under the enforced local network policy. That local download was not retried through another host or proxy. CI runs on its own supported runner, using its normal official installation. Physical-device and assistive-technology review remain separate, even if all automated runs pass.

Final local and exact-integrated-head CI results are recorded below and in the machine-readable receipt. Main and deployment are outside this task.

## Recorded local acceptance

The production-CSP Chromium journey passed 44 checks across 390/1280 widths, light/dark themes and 30px text, with Playwright 1.62.0 and system Chromium 155.0.8059.79. It exercises all four source modes, exact source/codepoint checks, Sinhala-to-Roman selection, keyboard preferences/notes/removal focus, denied-clipboard fallback, changed-pin refusal, actual UTF-8 JSON download and local backup restore, legacy progress/same-file retry, private-data request boundaries and a fully completed delayed abort-ignoring response.

The repaired individual progress importer passed 52 checks from the source checkout and 52 from the installed archive. These include malformed-to-valid same-filename retry with unchanged legacy `last`, unavailable storage reads and recoverable tab-only export, plus existing changed-private-data, delayed-file, source-signature and size guards. An earlier 48-check accessibility run preceded the final conditional-read repair; it is retained only as historical diagnostic evidence and is not claimed as final acceptance. Final CI reruns the current progress accessibility lane.

Independent runtime and harness reviews accepted the narrow repair and final test body-completion signal with no remaining concrete findings. Documentation/link and browser-artifact/gate checks passed 21/21. Offline smoke passed 64 checks across 34 tools; offline evaluations scored 195 passed and six explicitly live cases skipped. The complete repacked server tree matches current compiled assets, including the updated README/privacy files.

The first compatibility attempt used an exact wrapping-label selector that did not identify the rendered script select. The harness now uses the actual labelled combobox role, retaining visibility and exact-text assertions; this was a test selector correction, not evidence of a browser product defect. Firefox/WebKit results must come from their actual CI runs, not this Chromium baseline.

Full local check passed 1,184 tests: 1,182 passed, zero failures and two existing optional skips. The 8,544-text source audit reported zero failures. Exact integrated-head platform, packaged-corpus, cross-tool, Chromium and Firefox/WebKit checks remain a separate final acceptance gate.
