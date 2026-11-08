# Provider scope audit: a wrong whole-unit link and a valid range

Decision D203; baseline `e3b65815daae077b96f1eac0b6d2a7deb17dcd15`, reviewed 8 November 2026. [Machine-readable evidence](provider-scope-audit.json) records complete-root hashes, source URLs, the two decisions and current counts. No publisher English bodies are stored here.

## Two superficially similar references require different decisions

The [DT Itivuttaka 10–13 page](https://www.dhammatalks.org/suttas/KN/Iti/iti10.html) combines aversion, delusion, anger and contempt, with its verses referred to sections 2–5. Those are four separately indexed complete VRI roots, Iti10–13. The old ordinary Iti10 binding made the whole combined page available as if it belonged to one discourse, including for quotation verification. Remove that binding and persist a URL-level post-linker hold, including alternate owners and query strings. Do not silently replace an exact DT request. The independently reviewed ATI Ones condensed page still covers these subjects with explicit shared-source consent; it does not establish individual English alignment.

The [DT AN 3:47–48 page](https://www.dhammatalks.org/suttas/AN/AN3_47.html) is a useful negative control. Our indexed **an3.47 itself contains both complete VRI sections 47–48**, fabricated and unfabricated characteristics. The next indexed an3.48 is VRI49, Mountain. Keep the existing AN binding unchanged. A range in a publisher title, or a publisher number different from our indexed ID, does not prove a scope error. Splitting this link or adding it to an3.48 would introduce one.

Both primary rendered pages and all six complete root records were read and independently checked. Raw DT requests were unavailable in this environment. The supported web reader established the source boundaries, but supplies no raw HTTP/extractor/notice hash suitable for runtime pinning. No such hashes or live-runtime reproduction are claimed. Future DT shared integration remains pending an actual source-specific extraction and rights review. The site's [CC BY-NC notice](https://www.dhammatalks.org/) remains applicable; this audit grants no new redistribution rights.

## Counts and daily selection

Ordinary links decrease 2,588→2,587 (DT 1,275→1,274). Direct indexed coverage becomes 1,448, or 1,871 including inherited verse sources; grouped runtime figures are 1,422/1,845 of 8,445. The same twelve ATI shared pages still name 110 distinct indexed subject records. Shared-only records rise 51→52 because Iti10 now has scoped access only. This is a correction of coverage claims, not a new translation. Canon records remain 8,544.

The eligible daily-sutta pool decreases 1,270→1,269. Its deterministic 2026-11-01 result becomes SN5.3; restoring the old ordinary link in an isolated test restores the old Snp2.7 result. The algorithm is unchanged; the dated evaluation follows the corrected data version.

## Repeatable metadata triage

Run `node scripts/source-scope-screen.mjs > /tmp/pali-scope-leads.json`. This read-only, offline command inspects ordinary mapping metadata, preserves root boundaries and emits candidate ranges and collection-level matches. It never fetches, approves, removes or changes a source. Declared partial/shared pages and reviewed story mappings are excluded from this ordinary-link screen.

The current 234 leads mostly involve legitimate chapter or verse references. **They are not 234 errors.** A heuristic brings three wider Therīgāthā verse-reference leads to the front (ATI Thig19–38 for thig2.3; two versions of Thig39–62 for thig3.4). Differences in verse numbering and editions still need complete source/root review. They are not findings, approvals or new coverage. Keep valid AN3.47 as a negative control when refining the screen.

## Validation

`tests/provider-scope-audit.test.mjs` checks all six complete-root pins, retained AN boundaries, zero-fetch refusal of the held DT version for all four Iti subjects, continued explicit ATI scoped access, rebuild/idempotence and alternate-owner/query-string holds, metadata-only screening, and the old/new daily pool distinction. The installed shared audit computes its synthetic baseline from the sources it actually removes, retaining strict mixed-version and coverage assertions after the data correction. It also exercises every real hold and shared declaration. These synthetic-provider checks do not certify live DT retrieval or deployment; exact-head CI results are separate release evidence.

Local release checks: `npm run check` completed with 1,032 tests passed, one skipped and zero failures across all 8,544 audited canonical records. Smoke passed 64 checks; offline evaluations passed 195 questions with six live questions intentionally skipped. The extracted installed shared-package audit passed all 34 modes with zero real network attempts. Independent source and implementation review found no blocking issue; two current documentation wording corrections were incorporated. No new live DT retrieval, main merge or deployment is claimed.
