# Compact reading acceptance

Independent branch `feat/web-compact-reading`, based on the unchanged, hosted-CI-green consolidated candidate `75419a0`. Prepared 8 November 2026. Corpus remains `7b04173`; no dev/main update or deployment.

## Measured issue and result

In default-font Chromium, the first Dhammapada 183 passage started below the phone viewport. Search/collection controls and five exposed reading actions consumed space before the text.

| Viewport (CSS pixels) | First passage before | After | Change |
|---|---:|---:|---:|
| 320 × 700 | 1,213px | 662px | 551px earlier |
| 390 × 844 | 985px | 488px | 497px earlier |
| 1280 × 900 | 440px | 440px | unchanged |

The [baseline](compact-reading-before.json) was measured at exact candidate `75419a0`; [current measurements](compact-reading-browser.json) use the same source, default 21px reading size and simulated viewports. A full first line fits in both measured phone heights. This is not a guarantee for all titles, fonts, user text sizes, devices or zoom levels.

[390px rendered preview](compact-reading-phone.png), inspected for spacing and hierarchy. Text is from the existing VRI Chaṭṭha Saṅgāyana edition, non-commercial with attribution, as shown in the interface; the image adds no source rights or independent textual review.

## Changes

- Native **Find a passage** disclosure on phones for citation/search and collection links. Reading preferences stay directly available. Desktop controls remain exposed.
- Native **Study & sources** disclosure for the same canonical-reader English, commentary, related and copy controls. Picking a study action on a phone collapses the control group and focuses its resulting pane. No source API is replaced.
- Responsive collapse restores focus to a visible summary when it would hide the active control. Resizing does not rebuild source review or discard per-view consent. A legacy MediaQueryList listener path is covered without claiming an actual older browser certification.
- Exact-reference scroll positioning remains authoritative. Current-page Continue reading is hidden; it reappears away from that reading and reopens the same source. Empty status space is reduced on phones; live status announcements remain available when populated.
- Source/view tab titles now distinguish reading tabs. Search uses a generic title; search query text, personal notes and imported labels are not inserted into tab titles.

The disclosures are ephemeral presentation state, not new stored preferences. No corpus, provider, rights, backend schema, runtime dependency, account, tracking or deployment changed.

## Validation

- Full `npm run check`: **966 tests, 965 passed, one skipped, zero failed**; **8,544-text audit, zero failures**.
- MCP smoke **34 tools / 64 checks**; evaluations **195 passed of 201**, six live-network questions skipped.
- [33 compact-reading browser checks](compact-reading-browser.json), 320/390/768/1280 widths: fold metrics, keyboard finder/study controls, actual source navigation, large reading text, resume, tab-title privacy, exact deep references, responsive focus, shared consent retained across resize, no automatic translation retrieval and legacy listener compatibility.
- [16 dedicated accessibility scans](compact-reading-a11y.json), both themes and phone/desktop: zero detected violations; 32 functional assertions repeated in audit contexts.
- [33 extracted-package checks](compact-reading-package.json), with the server running outside the checkout and no checkout runtime dependencies.
- Broader **173 reader**, **49 plan**, **34 import**, **36 daily** and **20 synthetic source-scope** browser checks passed. Existing assertion scopes remain intact: a small first-party test helper opens the actual native disclosures instead of force-clicking hidden controls.
- Repeated **44 general** and **44 source-scope** accessibility scans: zero detected violations. Audit contexts alone bypass CSP for axe-core; normal flow tests keep production CSP. Incomplete/manual-review rules remain recorded.
- Repeated **42 real compilation checks** using approved publisher data: exact source/notice hashes, explicit consent and source-preserving continuation passed. The existing opt-in live runner and source allowlist are unchanged.

Test setup was adapted to the intentional disclosure flow; no source assertion, consent check or failure guard was removed. Early fit checks also informed final phone spacing before the completed acceptance runs. Dedicated manual screen-reader/device certification is not claimed.

## Repeat

```sh
npm run check
npm run smoke
npm run evals
python scripts/web-reader-compact-check.py --report /tmp/compact.json
python scripts/web-reader-compact-check.py --a11y --report /tmp/compact-a11y.json
python scripts/web-reader-browser-check.py
python scripts/web-reader-scope-check.py
# Optional extracted npm package:
python scripts/web-reader-compact-check.py --server-dir /path/to/package/server --report /tmp/installed-compact.json
```

Python Playwright/Chromium are required; set `PALI_BROWSER` if needed. `scripts/web_reader_test_helpers.py` is test-driver support only, not a runtime dependency. New compact checks and reports are wired into CI. A feature-branch push does not match the full hosted-CI filters; do not treat the earlier 75419a0 green result as certification of this later feature.

Coordinate integration with the active corpus writer and refetch dev before merging. Physical iOS/Android, Safari/Firefox, human screen-reader/contrast/native-reader and true browser-zoom acceptance remain outstanding. Source/source-version and per-view consent boundaries remain the same as the combined reader.
