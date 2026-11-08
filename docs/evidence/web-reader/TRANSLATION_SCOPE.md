# Shared and partial English-source acceptance

Cloud Linux, 8 November 2026; feature branch `feat/standalone-web-reader`, corpus baseline `f0906bd`. Reviewed the separate corpus branch through `a09d7ba`, including `bded1c1`'s compilation/notice-pin contract. No dev/main merge, deployment or source approval is represented here.

## What changed

The previous generic English chooser had no per-source scope consent or browser response-scope guard. The backend already required consent for scoped sources, so simply exposing the old button was insufficient. The UI now provides:

- **English sources**, with an exact publisher/version choice. Ordinary unscoped sources retain their existing reading flow.
- **Shared-page review** listing every canonical member and the publisher's page reference, explicitly stating that individual wording alignment is unverified. Condensed and compilation presentations are distinguished. Shared result pages retain null individual identity; they are never displayed as the selected discourse's full translation.
- **Partial-unit review** showing the declared first/last segment and explaining that the canonical Pāli reader remains a separate full-unit reader.
- An unchecked, keyboard-operable consent box before retrieval. Consent is ephemeral, bound to the selected version and full disclosed scope; navigation/reload requires fresh consent.
- Validation before displaying English text: exact identity, attribution/license, returned version, complete reviewed scope and requested selection. Continuation must retain the same version, selection, prefix pin, scope pin and appropriate consent flag. Unknown scopes, changed declarations and unsafe continuations fail visibly.
- Compiler-bundled display policy; no raw policy module is needed in the installed npm package. No corpus, provider, tool schema, network allowlist or production CSP changes.

The browser does not replace backend validation, scholarly alignment review or rights approval. These are presentation/consent safeguards.

## Evidence

- `npm run check`: production build; **934 tests, 933 passed, one skipped, zero failed**; **8,544-text audit, zero failures**.
- `npm run smoke`: **34 tools, 64 checks passed**, live mode off.
- `npm run evals`: **201 questions**, 100% of non-skipped; six live-network questions skipped.

- **11 policy tests** cover ordinary and scoped metadata, malformed/unknown declarations, scope changes, null shared-page identity, partial bounds, missing attribution, listed fallback and source-preserving continuation.
- [20 normal browser checks](translation-scope-browser.json), widths 390/1280, using the app's production CSP. Includes no source retrieval before consent, keyboard consent/activation, fresh consent for another member, partial/shared continuation, corrupted individual attribution and changed continuation targets. No unexpected publisher request is allowed.
- [44 scoped-screen axe-core scans](translation-scope-a11y.json), both widths and paper/night themes: zero detected violations. The audit also repeats 40 functional assertions. Only the audit contexts bypass CSP to inject axe-core. Manual/incomplete rules remain recorded; human contrast/screen-reader assessment remains necessary.
- Repeated [173 broader browser checks](browser-check.json), [44 broader accessibility scans](accessibility-check.json), and [six extracted-package browser checks](packaged-study-check.json) passed.

Condensed/partial fixtures use the existing real MCP handler and backend validation with **synthetic in-memory bindings**, synthetic HTML and a non-network fetch ledger. No committed source records are changed. Compilation uses an explicitly labelled **forward UI fixture** matching the inspected newer contract; it does not establish that this baseline backend supports real compilation data. No live publisher body, translation right or actual-source availability is approved by these tests.

## Repeat

```sh
npm ci
npm run check
npm run smoke
npm run evals
python scripts/web-reader-browser-check.py
python scripts/web-reader-scope-check.py --report /tmp/scope.json
python scripts/web-reader-scope-check.py --a11y --report /tmp/scope-a11y.json
python scripts/web-reader-a11y-check.py --report /tmp/a11y.json
```

Python Playwright and Chromium are required; set `PALI_BROWSER` to the executable when necessary. CI includes both scope runs and preserves their JSON reports. A feature-branch push alone does not trigger the repository's branch-filtered full CI; no hosted CI success is claimed.

## Integration still required

Wait for the separate corpus session to complete its pending GitHub action. Then integrate under its owner, rebuild bundles, and check actual reviewed condensed/compilation/partial records (including compilation notice pins and unchanged terms). Test catalog metadata, exact consent, all member identities, real source response/rights and continuation together. Do not claim real-source release support from a UI fixture. Physical devices, Safari/Firefox, native-reader fonts and human accessibility review remain outside this receipt.
