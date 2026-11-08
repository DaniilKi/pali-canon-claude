# Nālaka, Aññāsi-Koṇḍañña and two prose-excerpt bindings

Decision D207; baseline `64de73ea2d3921c2ab97567a4c68ab5cda2dd1ae`. [Evidence](nalaka-kondanna-scope-review.json) records complete-root, source HTML, extracted-text, full-notice and mapping pins. No publisher English bodies are bundled.

## Two accurate partial sources

Complete official ATI bodies and their own notices were inspected against complete indexed VRI roots, with independent review. The source snapshots remain ATI `45fedca341497120651efa20e756b04a13e61089` and VRI `2d134ff9ef60f70a1eb03c9370580228811a3070`.

- [Aññāsi-Koṇḍañña, Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.15.01.olen.html): only VRI **675**, exact `thag15.1/5`–`/5`. The poem contains 673–688, so 673–674 and 676–688 are not translated by this page. This is its only indexed English version. It remains accessible as a precisely scoped partial source, without a whole-text claim.
- [Nālaka, Olendzki](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.3.11.olen.html): the water-streams verse is VRI **725**, exact `snp3.11/44`–`/44`. Publisher **Sn720** is preserved separately as publisher numbering. VRI720 concerns attachment/fever and is not this verse. All other verses 684–724 and 726–728 are excluded. Existing Nālaka dhammatalks and ATI Ṭhānissaro versions remain unchanged.

Both pages' ellipses are preserved. Each uses the existing single-verse-container extractor, mandatory exact-version consent, complete notice/text/Pāli pins, separate cache and authoritative downgrade registry. The build manifest now supports only the two reviewed verse collections, Thag and Snp, and rejects a collection prefix that disagrees with its owner. This does not approve arbitrary Snp pages, authors or prose extraction.

Each complete ©2005 Andrew Olendzki notice independently permits free distribution/reformatting with source identification and full licence retention. They are **not CC**, and are not subject to a BPS 50-reprint clause. Every returned fragment retains its own full notice/citation and identifies the derived extraction. No missing verse is generated or reconstructed.

## A correct alternative retained

The complete [Nālaka ATI Ṭhānissaro page](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.3.11.than.html) covers Asita's vision/prediction, Nālaka's approach, the sage instructions and the final water/pot/speech sequence. Its45 publisher verses 679–723 correspond to the 45 VRI verses 684–728. The numbering offset does **not** indicate omission. Its ordinary binding and complete ©1998 CC BY-NC4.0 notice remain unchanged. Notes and cross-references remain editorial; retention at the pinned snapshot is not a live freshness guarantee.

## Two incomplete prose pages withheld

- [DN21 ATI Ṭhānissaro](https://www.accesstoinsight.org/tipitaka/dn/dn.21.2x.than.html) begins at 357, omitting 344–356's setting, Pañcasikha song/arrival and Gopaka narrative. Later ellipses omit 369's six benefits,370's verses and 371's initial reward before resuming the closing homage. A single contiguous declaration cannot cover those omissions. The separate `dt:DN/DN21` remains indexed; its completeness was not reassessed in this batch. The original ©1999 CC BY-NC4.0 notice is unchanged.
- [SN12.22 Walshe](https://www.accesstoinsight.org/tipitaka/sn/sn12/sn12.022x.wlsh.html) contains only a late exhortation from the second section of an indexed primary record containing VRI 21–22. It omits 21 and 22's earlier ten powers/fearlessness, aggregates/dependent origination, resolve and lazy-versus-energetic discussion. It begins inside a bundled paragraph, so even mapping that entire segment as translated would overstate the scope. No exact partial mapping is approved. It has no other indexed English version; Pāli remains available. Its ©1985 BPS free-distribution, attribution, complete-notice and ≤50-reprint conditions are unchanged.

The exclusions apply globally after every linker and cannot be bypassed by changing owner, URL query or a scope field. The source pages remain identified here for human review; runtime exact-source requests fail rather than substitute wording. No root blocks, IDs, boundaries, locator revisions, saved notes or positions changed. SN12.22's combined 21–22 primary-record boundary deserves a separate source/index review; it was not split to recover a coverage count.

## Wider review without automatic changes

The existing metadata screen now has 221 entries: five frozen retained reviews and 216 unreviewed leads. Its two priority single-verse leads are resolved by this batch.

A new read-only [ordinary-excerpt packet](ordinary-excerpt-review-queue.json) checks all 1,142 remaining ordinary ATI bindings in the pinned local checkout. It flags 28 bindings: one exact frozen retained snapshot and 27 unreviewed candidates. These counts overlap the existing screen; do not add them. Publisher excerpt tags can describe a selection from a collection that still completely translates one indexed poem. `EXTENT=complete` can also be misleading. **Flags are not confirmed errors or approvals.** Complete bodies and source-specific notices must be reviewed individually.

The packet fails on missing sources, invalid paths and escapes, emits no scripture body, preserves inputs, and expires retained annotations when source/root/link pins drift. Source hashes describe frozen local bytes, not current upstream availability.

## Coverage and dated reading consequences

Ordinary links 2,573→2,569; ATI 1,146→1,142. Direct whole-English coverage 1,447→1,445; including inheritance 1,870→1,868. Runtime grouped counts become 1,419/1,842. Active content-matched ordinary links 64→63. Partial sources 6→8; Ānanda and Aññāsi-Koṇḍañña are the two partial-only units. Shared scopes remain 12 pages/110 actual subjects.

Removing SN12.22 from whole-English eligibility changes the daily sutta pool 1,269→1,268. For this new data version, 2026-11-01 selects **AN10.92**, previously SN5.3. The algorithm is unchanged; its schedule explicitly depends on the dataset. Tests preserve the prior schedule in an isolated fixture containing the actual old mapping and registry, and keep D203's earlier historical before/after test intact. This is a correction of eligibility, not an unchanged-rotation claim.

Reproduction commands:

```sh
node scripts/canon/verify_partial_html.mjs scripts/canon/reviewed_partial_pages.json /tmp/pali-ati-source
python3 scripts/canon/ordinary_excerpt_packet.py /tmp/pali-inputs/canon.json.gz server/data/translations.json /tmp/pali-ati-source
node --test tests/nalaka-kondanna-review.test.mjs tests/ordinary-excerpt-packet.test.mjs tests/partial-page-build.test.mjs
python3 scripts/web-reader-partial-pilot-check.py --source-root /tmp/pali-ati-source --report /tmp/partial-browser.json
python3 scripts/web-reader-partial-pilot-check.py --source-root /tmp/pali-ati-source --a11y --report /tmp/partial-a11y.json
npm run check
```

Actual-source runs use pinned local publisher HTML with all upstream requests intercepted. Tests and reports contain metadata/hashes, not source bodies. Installed synthetic-provider audits exercise refusal and continuation contracts without author-server requests. Exact-head CI and integration receipts are separate from local reproduction; no live availability, new rights grant, whole-canon semantic review, main release or deployment is claimed here.

Actual-source browser checks passed 106 cases in each normal, accessibility and extracted-npm-package mode; accessibility ran 96 scans with zero violations. These include explicit consent, exact single-verse scope, preserved ellipses, publisher/VRI numbering distinctions, complete notices and both held-source MCP/URL refusals before any fetch. The installed partial audit passed all eight modes. Eight local publisher fetches reconstructed the eight excerpts with full notices and exact bounded continuation; five editorial-preface probes were excluded, and the other three pages have no preface. No upstream HTTP request occurred. Independent review caught the SUBTITLE2 marker gap; that fix and regression are included. The daily evaluation now asserts both the corrected date selection and 1,268-item pool, while historical fixtures preserve prior schedules.

Final local validation passed 1,056 tests with one skipped and zero failures, plus all 8,544 canonical records audited with zero failures. Smoke passed 64 checks. The first full run found only the outdated daily evaluation; its expected source and pool size were corrected to the verified new data version, and the entire check passed on rerun. No check was disabled. Source, implementation and documentation review found no remaining blocker. The coverage table also reconciles older stale Thag/Iti row figures to current measured totals; no Itivuttaka data changed in this batch.
