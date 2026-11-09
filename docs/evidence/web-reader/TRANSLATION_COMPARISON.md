# Explicit English-source comparison (D218)

Baseline: dev `fd1b50b70efd9d43c249cfdb7d6b0b386164c556`, 9 November 2026.

## The user need

The web reader previously displayed one English source at a time, although the MCP engine already offered comparison. The bundled metadata has 1,204 confirmed-location primary records with at least two ordinary source choices (`!approximate && kind !== "range"`, then at least two `english.available(unit)` choices without `translation_scope`). These can include different editions by the same translator and inherited chapter links. The count is not 1,204 independent translations or proof of complete individual correspondence.

From **English sources**, readers can now select 2–4 exact ordinary source versions and press **Compare selected sources**. Nothing is checked by default, and selecting boxes does not fetch English. Each column keeps its own translator, publisher reference, exact version, notes, full source terms and next-page control. Phone layouts stack columns; desktop layouts use two columns. The Pāli reader stays available on the same page.

These are separate source pages, not aligned paragraphs, word-level correspondences or translations confined to the currently displayed Pāli/reading-plan assignment. Each column paginates independently. Comparing equal character offsets does not establish matching passages, agreement, correctness, authorship or textual variants. No translation or scripture is generated.

## Scope and retrieval boundaries

This UI deliberately uses individually selected `get_translation` calls rather than broad default comparison. Shared pages and partial-unit sources retain their existing single-source scope review and unchecked consent. They cannot enter comparison through a forged selection, malformed metadata or a scoped response. This is a bounded ordinary-source comparison slice; it does not add scoped comparison or change the MCP `compare_translations` API.

Each comparison column accepts only its selected exact version. If the backend returns a listed fallback version, the column refuses its wording and explains that it cannot display the selected edition; other columns remain available. Ordinary single-source fallback behavior is unchanged. Continuations retain the exact source, unit, offset, limit and source-prefix hash. A malformed or changed continuation is refused before another request. One column’s outage, stopped wait or failed continuation neither erases nor advances other columns. If a previously loaded page remains after failure, its range and an explicit message identify it as the previous page. Retry repeats only that failed request.

The browser uses the existing finite request pool, with source-specific stop labels. Study/navigation generations and per-column serial guards reject late results. Source bodies and comparison choices are not saved in URLs, browser storage, bookmarks or notes. Existing ordinary reading-position behavior remains. There are no new accounts, source providers, licence approvals, datasets or backend tools. Paṭṭhāna remains assessment-only.

## Verification scope

Policy tests use actual bundled source choices plus explicit synthetic malformed results. Browser acceptance uses actual bundled Pāli, metadata and exact source IDs; English bodies and remote failures are controlled synthetic provider fixtures. This tests orchestration, attribution, selection, source identity, independent continuation, cancellation and refusal—not upstream freshness or translation accuracy.

The acceptance matrix covers 320/390/768/1280 pixels, keyboard interaction, paper/night themes, no overflow, 2–4 selection, no preselection/fetch, full notices, separate successful/failed columns, exact continuation and retry, rejected fallback/scoped/malformed responses, stop/retry, stale results, inert strings, and retained individual source/scope flows. Installed-package checks run outside the checkout using the committed bundled assets. Automated axe results do not certify screen readers, physical devices, Safari/Firefox or human accessibility.

Independent cross-review found no remaining concrete source-policy or UI issue after the targeted fixes. The comparison browser checks have their own CI matrix group, allowing early failure feedback while keeping the existing study group within its bounded runtime.

Controlled browser tests found and fixed two usability defects before integration: long source tokens overflowed the existing single-source view at 30px on 320px screens, and delayed per-column replies could move focus away from another source. Wrapping now preserves the original wording while fitting the viewport. Focus changes require both the latest explicit action and current focus ownership, on success and failure. Tests retain their original content, scope and privacy assertions.

Local policy checks passed 9 new tests alongside 11 existing source-policy tests. A complete metadata sweep accepted all 8,180 confirmed-location primary records and identified 1,204 with two or more ordinary choices, with 0 selection-format errors. The full local package gate passed 1,161 tests: 1,159 passed, 0 failed and 2 existing optional skips (live publisher unavailable and a historical baseline checkout unavailable/advanced, with frozen descriptor hashes still enforced). The 8,544-text audit found 0 failures. The source engine smoke passed 64 checks across 34 tools; offline evaluations passed 195 questions, with 6 live questions intentionally skipped. Existing reader regression passed 173 checks; actual pinned-source partial regression passed 260 checks across 18 reviewed sources. Final targeted browser runs and exact-head CI additionally cover the final focus/wrapping changes.

Final targeted browser runs passed 60 normal checks, 60 installed-package checks and 120 light/dark checks; 40 automated accessibility scans found zero violations. All cases use the 30px reading preference. The final integrated commit must pass all CI jobs; its GitHub checks are the external exact-head receipt. [Machine-readable local evidence](TRANSLATION_COMPARISON.json).
