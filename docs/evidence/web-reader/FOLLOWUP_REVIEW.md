# Follow-up reader review and supplementary-corpus slice

Reviewed baseline: `d3e3467496ef4ba7c68013d3f2eead567faf86ce` on `feat/standalone-web-reader`; underlying corpus base remains `f0906bd`. Cloud Linux, 8 November 2026. No merge into the development branch, main or deployment.

## Findings and changes

1. **Confirmed accessibility defect, repaired:** the skip link changed the hash to `#content`, which the app interpreted as library navigation. It now preserves the selection and focuses the current main region. Regression uses keyboard Enter and checks unchanged hash and actual passage.
2. **Source-preserving bookmarks:** the supplementary reader stores the corpus discriminator and selection-relative offset. An exact commentary search hit, whose reference ends in `/cN`, reopens that exact selection at offset zero instead of treating N as an offset within a single segment. Browser checks compare both reference and full text after reopening.
3. **Mobile hardening:** long compound Pāli titles and technical references wrap within cards and segment labels. Source-reading checks verify no document-wide horizontal overflow at phone widths.
4. **Source scope:** commentary and later works now have separate catalogue/search/read paths through the existing tools. All 47 commentary books and 109 later works are reachable through pagination. These views are visibly non-canonical; direct commentary does not claim root alignment. They do not offer canonical English/commentary buttons or route through `get_text` accidentally. No source/data/schema/provider changes.
5. **Security review:** fixed-route serving and production CSP remain unchanged. Untrusted strings use DOM text nodes. Browser fixtures confirm malicious-looking text does not produce image/script nodes or execute, and `javascript:` source URLs do not become links. No new network endpoint, account system or server-side personal-data store was added.

## Evidence

- Full `npm run check`: 923 tests, 922 passed, one skipped, zero failed; corpus audit 8,544 texts, zero failures.
- `npm run smoke`: 34 tools / 64 checks passed; no live-source claim.
- `npm run evals`: 201 questions, 100% of non-skipped; six network questions skipped.
- Fresh focused HTTP/asset tests: two passed after the review.
- [Browser checks](browser-check.json): **101 checks**, 360/390/768/1280 widths. Real bundled text for corpus paths; explicitly synthetic translation-continuation, outage, stale-response and hostile-markup tests.
- [Accessibility checks](accessibility-check.json): **28 axe-core 4.14.0 scans**, seven screens × two widths × two themes, zero detected violations for the requested WCAG A/AA tags. All 28 scans retained `color-contrast` as an incomplete/manual-review rule; zero violations is not a claim that every contrast check or accessibility question was resolved.
- Extracted npm package, launched outside the source checkout: standalone HTML plus real canonical, exact commentary and post-canonical MCP reads passed; supplementary results retain `canonical: false`.
- `git diff --check` and JavaScript/Python syntax checks passed.

The axe engine is pinned as a development-only dependency and is not served by the app or included in its runtime bundle. Only the separate audit browser context bypasses CSP to inject the checker; normal browser tests and production responses retain the restrictive policy. The added CI step will rerun the audit in the existing reader job once a PR/integration workflow is triggered.

## Integration readiness and limits

The feature is ready for the parent integrator’s review and combined-branch CI, not a deployment certificate. Feature pushes do not trigger this repository’s main/dev/integrate-only CI filters; no green hosted CI is claimed for this feature branch. This is a focused second-pass source/behavior review plus an independently maintained automated checker, not separate human accessibility, linguistic or scholarly approval.

Physical devices, Safari/Firefox, native-reader/font testing, full screen-reader review, live upstream English availability and rights-cleared offline packs remain open. Dictionary, parallels, quotation verification and other MCP tools still need dedicated web interfaces. No account sync, audio, social features or generated scripture is introduced.
