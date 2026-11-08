# Web/corpus integration candidate

Prepared on 8 November 2026 in isolated branch `integrate/web-reader-corpus-nov8` and worktree `/workspace/pali-web-integration`. Parents are web `492169fb25c2a49391a9e2fa8b3d7f597aa7b587` and corpus `7b04173` (three reviewed shared compilations). The candidate does not advance dev/main or deploy anything; integration must still be coordinated with the corpus owner.

## Merge and review outcome

One content conflict occurred, in `docs/decisions.md`: both independent branches used D195. Both histories were preserved, corpus D195–D197 retained, and the standalone-web record renumbered D198. Earlier evidence is historical; it was not rewritten to imply actual-source testing had already happened. The pre-web architecture assessment is now explicitly dated as historical. Runtime code merged without a manual conflict repair.

Installed independent lockfile dependencies in the integration worktree and rebuilt all bundles. An initial convenience symlink was removed because esbuild recorded its external directory in generated module paths; the final build uses local `node_modules` and a repeat build must leave `server/` unchanged. No runtime dependency or source mapping was added by the integration.

The focused security review found no new substantive runtime issue within its scope:

- Fixed first-party asset routes, restrictive production CSP, no third-party app scripts/fonts, no HTML insertion of retrieved strings. Existing markup/unsafe-URL regressions pass.
- Existing backend URL allowlist, bounded fetch, redirect validation, scoped-source hash/notice checks and worker admission remain intact. No arbitrary URL proxy, credential or write tool was added.
- Shared compilation consent is unchecked and ephemeral, bound to exact version/scope. Unknown/changed scopes and individual attribution are rejected. Shared page notes/quotation absence are not assigned to one canonical subject.
- Personal notes and manual progress remain browser-local, with explicit export and no upload. Tests cover unavailable storage, changed revisions, stale results and source-preserving navigation.

This is a focused implementation review and automated evidence, not a full security, scholarly or accessibility certification.

## Real compilation end-to-end results

[Live browser receipt](integration-live-browser.json), actual worker-backed HTTP bundle plus Chromium, **42 checks**, widths **320/390/768/1280**. No fixture replaces English, scope or source metadata. The browser requires explicit keyboard-operable consent, lists every subject and publisher caption, displays the exact pinned page and complete notice, and requires new consent after reload. Independent HTTP continuation uses the returned commands unchanged and reconstructs each exact pinned page.

| Publisher page | Requested indexed subject | All indexed subjects | Characters | HTTP pages at 1,000 chars |
|---|---|---|---:|---:|
| Luminous | AN 1.52 | AN 1.49–52 | 3,683 | 4 |
| A Pool of Water | AN 1.46 | AN 1.45–46 | 1,145 | 2 |
| Gratitude | AN 2.33 | AN 2.32–33 | 1,778 | 2 |

Gratitude retains its separate publisher caption **ATI AN 2.31–32; indexed AN 2.32–33**. None of these results claims individual alignment or adds whole-unit English coverage. Each has null individual `text_id`, separate requested subject, exact source version/scope and full pinned rights notice.

Sources were retrieved from the engine's existing **official BCBS repository mirror**, not the primary ATI host. VRI remains `2d134ff9ef60f70a1eb03c9370580228811a3070`; reviewed ATI archive reference is `45fedca341497120651efa20e756b04a13e61089`. The report records exact returned text/notice/mapping hashes and mirror provenance; publisher text bodies are never stored in the receipt or newly bundled.

The first live attempt failed with EAI_AGAIN because Node did not consume the cloud's inherited proxy settings. Rerunning the test process on Node 24 with `NODE_USE_ENV_PROXY=1` and unchanged CA trust used the existing approved mirror normally. No environment policy, source allowlist, TLS verification or application code was weakened. Primary ATI access remains unverified in this environment.

## Combined acceptance

- `npm run check`: **955 tests, 954 passed, one skipped, zero failed**; **8,544-text audit, zero failures**. Final run followed dependency-local rebuild.
- `npm run smoke`: **34 tools, 64 checks passed**, live mode off.
- `npm run evals`: **201 questions**, 195 passed, six live-network questions skipped, threshold satisfied.
- [173 broader browser checks](integration-browser.json), [49 plan checks](integration-plans.json), [20 synthetic scope checks](integration-scopes.json): passed on the combined engine/UI. Synthetic guards remain separate from actual-source live evidence.
- [36 actual compilation-screen accessibility scans](integration-live-a11y.json), paper/night and phone/desktop: zero detected violations. [44 broader scans](integration-a11y.json): zero detected violations. Audit contexts alone bypass CSP to inject axe-core; normal live checks use production CSP. Incomplete/manual-review rules are retained.
- [42 actual compilation checks from an extracted npm package](integration-live-package.json), with the server running outside the checkout: passed. No checkout runtime dependencies or synthetic publisher body.
- [15 installed shared-source audit modes](integration-shared-audit.json): passed, zero real network requests. Includes every real declaration, notice downgrade, changed source/mapping, native-script/widget and transport contracts using explicitly synthetic providers.

## Repeat

```sh
npm ci
npm run check
npm run smoke
npm run evals
python scripts/web-reader-browser-check.py
python scripts/web-reader-plans-check.py
python scripts/web-reader-scope-check.py
node scripts/audit-shared-translations.mjs --report /tmp/shared-audit.json
# Opt-in approved-provider reads; no live bodies saved in reports:
python scripts/web-reader-compilation-live-check.py --live --report /tmp/compilations.json
python scripts/web-reader-compilation-live-check.py --live --a11y --report /tmp/compilation-a11y.json
# Optional installed artifact:
python scripts/web-reader-compilation-live-check.py --live --server-dir /path/to/package/server --report /tmp/installed-compilations.json
```

The live runner requires explicit `--live`; it is not added as a mandatory network CI gate. In this managed Node 24 cloud environment, prefix live commands with `NODE_USE_ENV_PROXY=1` to use inherited proxy/CA configuration. Python Playwright and Chromium are required; set `PALI_BROWSER` if necessary. Do not disable TLS or widen source permissions to get a green result.

## Remaining acceptance and coordination

- Do not advance dev/main until the corpus owner coordinates its pending GitHub action and concurrent work. Refetch at integration time; this receipt is pinned to `7b04173`.
- Exact-candidate hosted CI remains separate from local checks; do not infer success from defining the workflows or pushing a branch.
- Human screen-reader/contrast/native-reader review, physical iOS/Android devices, Safari/Firefox and true browser zoom acceptance remain unverified. Width simulation, including 320px, does not certify them.
- Real partial-unit sources and other providers are not newly approved or live-tested here. Synthetic partial/condensed regression is not real-source review.
- No new individual wording alignment, complete English corpus, offline web packs, source rights, accounts, publication or deployment is established.
