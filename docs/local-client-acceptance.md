# Local client acceptance evidence — 6 November 2026

This review starts from `efe9f24e59178ad1b49eb6805b8b81479d72cfdf` on the development branch. It supplements the combined corpus checks in [completion criteria](completion.md); it does not certify every supported client.

## Independent verifier review

The source review found no additional defect in the two P1 fixes. English candidate scoring resets at fetched-page boundaries, and refinement stays inside the same page. Empty pages cannot merge adjacent sources. Both languages reject more than 120 comparison words rather than issuing a verdict for a truncated prefix. Actual fallback IDs and requested IDs are retained, and Pāli matches reuse the citation index's uncertainty labels.

The full project check on this follow-up passed 553 tests with one live test skipped (554 total), and the audit checked all 8,544 texts with zero failures. Offline smoke passed 60 checks and offline evaluations passed 195 questions with six live questions skipped. The focused verifier, provenance and widget-rendering suites passed 21 tests. The HTTP client, hosted-reader and English-continuation suites passed another 17. The exact starting commit's package, installation and full-corpus CI workflows were independently confirmed successful. This is implementation review, not scholarly verification of translations or alignments.

## Chromium reader check

The actual self-contained widget HTML passed in Chromium 154.0.8037.57 on Linux at 390 and 1,280 pixel viewport widths. The check uses real browser DOM and messaging, with simulated host bridges and a source-derived MN 10 Pāli response. It covers initialization, theme, source text, responsive columns, horizontal overflow, source-link messages, plain-text errors, clearing stale text/attribution and recovery. The Apps SDK globals path also renders, clears an error and recovers. External browser requests are blocked and fail the check.

Repeat it with Python, Playwright and Chromium installed:

```sh
python -m pip install playwright==1.62.0
python -m playwright install chromium
python scripts/widget-browser-check.py --report widget-browser.report.json
```

For an existing Chromium installation, add `--browser /path/to/chromium`. The runner works from another working directory and replaces a previous report with a running or failed status if a new check cannot complete. It loads the source widget; normal package CI separately checks the generated bundles.

This is a browser acceptance check with simulated hosts. It does not establish signed-in ChatGPT behavior, mobile-app behavior, host CSP compatibility, screen-reader usability or native-reader approval. No screenshots are required or saved.

## Continuous browser gate — 7 November 2026

`check.yml` now has a dedicated `Chromium reader` job, using Python 3.12 and Playwright 1.62.0. It uploads `widget-browser.report.json` on success or failure. The runner overwrites a previous report before loading dependencies. It exercises the actual HTML through both simulated host bridges at both viewport widths. The offline fixture builder calls the registered widget tool over in-memory MCP: Pāli is retrieved from the bundled VRI edition, while English HTTP responses are explicitly synthetic test data.

The expanded check covers Pāli page replacement, exact-ID English continuation after primary recovery, refusal of unpinned offsets and a different-version fallback, cleared English attribution on failure, and error-envelope recovery. It also checks named landmarks/headings, real Tab/Enter source-link activation, 200% zoom without horizontal overflow, and the new polite live status for page/error changes. These are automated accessibility semantics and keyboard checks; a person still needs to assess screen-reader usability. The widget resource revision is v3.

## mcpo bridge check

mcpo 0.0.20, MCP Python 1.30.0, FastAPI 0.119.1 and Python 3.12.14 started the committed stdio server from an unrelated working directory and exposed all 33 tool routes through OpenAPI. Twenty-seven HTTP checks passed, covering canonical/source-book readings and continuation, metadata, search, citation scanning, calendar data, study features, commentary, post-canonical readings/search, analysis, parallels and glossary. Calendar calls check API transport only; they add no independent date evidence. The name lookup's licence gate is not a content-licensing approval.

Use the pinned bridge setup in [local clients](install/local-clients.md). This check does not establish a model-driven Open WebUI conversation, LM Studio, Gemini or Claude Desktop acceptance.

## Blockers and installation correction

- Codex CLI 0.159.2 parsed the plain stdio configuration with `codex mcp get`. Its app-server exited before initialization because `/home/agent/.codex` is read-only in this executor. Supported temporary SQLite/log directory options did not resolve startup. No model turn was requested, and no successful Codex MCP handshake or tool call is claimed. A supported writable client environment is needed.
- The public npm registry returned HTTP 404 for `pali-canon-mcp`. The Codex plugin's startup advice previously recommended that unavailable package. Its fallback now uses a downloaded checkout's committed Node server, matching the installation guide. Duplicate four-skill summaries in the guide were replaced with the actual five skills.
- This executor's enforced network policy allows package/source-hosting domains but excludes the publishers' domains. Live-source failures here cannot establish a global publisher outage. Validate the live providers from an authorised environment whose policy permits the project's allowlisted sources.
- Source/translation licences, missing English coverage, native-language guides and Lao/Lanna reader approval remain separate gates. Calendar observance and convention review remains open as described in [completion criteria](completion.md). No reviewers were contacted.
