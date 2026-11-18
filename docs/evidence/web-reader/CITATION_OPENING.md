# Source-aware citation opening (D227)

## Reproduced defect

At dev `7044fe52ac1b2e30e16dc9255be482afd66f764d`, the sidebar's **Open a citation** sent every input directly to canonical `get_text`. Supported later-work references (`Vism I.1`, `Abhidh-s 1`) and resolver-supported names (`Satipatthana Sutta`, `A Gallon Measure`) failed through this entry point even though `resolve_reference` already returned usable reading identities. Existing direct reading links and search were separate working entry points.

## Change and boundaries

The finder uses a dedicated resolution screen backed by the existing `resolve_reference` tool. It retains source attribution, original resolver cautions, native-input labels, approximate/range notices and named/page alternatives. The primary **Read Pāli** link and explicit alternatives open existing canonical or later-work routes. No scripture is generated, transformed or newly licensed. No new external source, MCP API, personal-data schema, source cache or automatic English retrieval is introduced.

The route accepts exactly one bounded `reference` value. Canonical results are distinguished from later-work results by the actual backend contract; later-work commands must agree with their selected citation and use the existing allowlisted tool. Unknown/duplicate fields, invalid URL character encoding, mismatched canonical IDs/citations and malformed commands fail before text is shown. Canonical identity comparison reuses the shared parser; independent offline sweeps checked all 8,544 bundled canonical records without mismatch or rejection. A resolver result is identity metadata, not an authenticated exact paragraph/source pin. Actual reading responses continue to establish the source/revision/ref/offset used for saved passages. Resolution URLs are not reading/resume/import locators.

Explicit review rather than automatic redirection keeps title alternatives, PTS-page alternatives, first-only ranges and approximate whole-chapter notices visible before a user chooses what to read. Unsupported or ambiguous references still fail; this does not invent new citation grammar (for example `Abhidh-s1` remains unsupported).

## Source-health investigation

[Issue 107](https://github.com/DaniilKi/pali-canon-claude/issues/107) and [nightly run 43423800637](https://github.com/DaniilKi/pali-canon-claude/actions/runs/43423800637) ran main `451a857dfb60b727af3e25bedec35d80b3fe7856` on November 13. Their ATI-plus-GitHub-raw outage scenario retrieved a translation through jsDelivr but failed ATI search. Old main truncated the actual mirror error, so its historical CDN failure cause cannot be established.

Current dev already contains bounded per-index retry and complete bounded mirror diagnostics. On November 18 its six deterministic ATI search tests passed. A fresh real search with ATI and GitHub raw deliberately unavailable loaded **both** indexes from `https://cdn.jsdelivr.net/gh/bcbsit/ati@main/`, returning three `metta` results from 75 index matches in 1.934 seconds. Thus this investigation did not justify another mirror-code change. It does not prove perpetual upstream availability or close main's nightly issue. No main merge or deployment occurred.

## Validation

The seven focused route/actual-MCP/metadata tests passed. Independent read-only review found no remaining concrete defect after the shared-parser identity repair. Existing reader and compact-layout regression journeys passed 173 and 45 checks respectively; final-build citation, accessibility, package and cross-engine acceptance results are recorded below after completion. Cross-browser automation is distinct from physical-device, native-reader or human accessibility acceptance. Source coverage and existing withheld/licence decisions remain unchanged.

### Local acceptance, November 18

- Full check: 1,236 tests, 1,234 pass, zero failures, two existing optional-baseline skips; all 8,544 canonical records audited with zero failures. The final shared-parser helper was also rerun directly: seven tests, all pass. The final server/browser bundle was rebuilt after the identity/encoding guards.
- Existing reader journey: 173 checks. Compact reading journey: 45 checks. These exercised the new explicit resolver-to-reader action.
- Final citation journey: 28 normal checks, 56 across both themes in axe mode (96 scans, zero violations), and 28 checks against the isolated npm package outside the checkout. Includes 320/390/768/1280px viewports, actual resolver and Pāli output, all returned name/page alternatives, invalid encoding and semantic-ID fixtures, native scripts, Stop/retry, stale replies and private note retention.
- Installed Chromium compatibility journey: 68 checks. Firefox/WebKit binaries are absent on this cloud machine; their mandatory official CI jobs run the expanded installed journey and accessibility mode on the exact integration commit. This local result is not substituted for those engines.
- MCP smoke: 34 tools, 64 checks. Offline evaluations: 195 pass, six network questions skipped. No new live publisher content was fetched by browser acceptance.

The first isolated-package attempt did not start because npm's default cache directory was unwritable and no archive had been created. Repacking with a writable temporary cache succeeded; the final installed-package result above uses that actual extracted archive. This was a harness setup failure, not a product or source-coverage result. Exact-head CI is checked externally after pushing the integration candidate; this receipt does not claim a future run's success.

### First-candidate CI timing repair

The first integration commit `1389e90` passed the new citation job and WebKit compatibility job but reproduced a pre-existing chapter-harness race at source review: old and current pages have identical headings and wording, so a readiness assertion could pass on the old DOM immediately before hash navigation cleared it. This reproduced locally at the same assertion. Independent review confirmed the missing fresh-response barrier.

The harness now awaits the exact current-source `get_post_canonical` response and the exact unpinned review URL (including `offset=0`) before checking every Pāli codepoint and unchanged private state. All original assertions remain. The corrected local chapter journey passed 38 checks. No product/source behavior changed in this repair; final exact-head CI must validate the corrected tree rather than treating first-candidate success in other jobs as final acceptance.
