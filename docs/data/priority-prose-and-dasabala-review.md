# Priority prose-source review and the Dasabala citation repair

Decision D208; baseline `073136cfb48f7a3e7fa46b98e8b19ef5c925df85`. [Evidence](priority-prose-and-dasabala-review.json) contains the individual source/notice/root pins, merged-provider checks, exact index changes and complete input/output dataset hashes. No publisher English bodies are bundled.

## Three individually reviewed English versions

The complete pinned ATI pages, their complete notices and entire indexed VRI roots were inspected independently. Merged runtime metadata includes all153 Ānandajoti links: each candidate had only its named ATI version indexed. No other version was discarded. This does not establish that no other translation exists anywhere.

- [AN6.54, Andrew Olendzki](https://www.accesstoinsight.org/tipitaka/an/an06/an06.054.olen.html): withhold the ordinary binding. It selects the land-sighting bird and royal-tree stories, omitting Dhammika's setting, connecting applications, teachers and closing material. It includes extensive editorial interpretation. Starts/ends inside source paragraphs and omissions prevent an honest contiguous whole-segment declaration. Preserve its complete ©2005 free-distribution/source-identification/full-notice grant; this is not CC.
- [AN10.27, Nyanaponika](https://www.accesstoinsight.org/tipitaka/an/an10/an10.027x.nypo.html): withhold the ordinary binding. It translates the one-nutriment teaching inside `an10.27/11`, omitting formal opening/closing frames, narrative and questions2–10. Mapping the entire paragraph would overstate coverage. The page's notice contains both ©1981 and ©1999 BPS statements, free distribution, derived-source identification, full-notice retention and the ≤50-reprint condition. Neither date or restriction is dropped.
- [MN34, Andrew Olendzki](https://www.accesstoinsight.org/tipitaka/mn/mn.034x.olen.html): retain accurate access as a reviewed partial source for exactly **`mn34/12`–`/14`**, the three concluding verses within VRI352. Exclude preceding prose, the cowherd similes and the translator's note after the poem. The existing strict single-verse-container extractor and individual complete ©2005 notice apply. This is not a complete MN34 translation.

All three lose their false whole-unit claims; MN34 remains partial-only. AN6.54/AN10.27 retain Pāli access and their source URLs here for human review. No unreviewed prose extractor, reconstructed wording, guessed alignment or silent alternate is introduced. The manifest now admits owner-matched MN verse pages alongside the reviewed Thag/Snp pages, with all existing source/root/text/notice pins and registry safeguards.

## Correct SN12.21 and SN12.22 ownership

The official `romn/s0302m.mul.xml` at VRI commit `2d134ff9ef60f70a1eb03c9370580228811a3070` has SHA256 `61bc83404230b7cf06142f642834c8ea69aa0f4f2cc45d201716cd1ac9a0b40a`. All1,427 compact blocks match the bundled source, including notes and edition page markers.

| Record | Old index | Correct index | Result |
|---|---|---|---|
| SN12.20 | `[132,143)`, Paccaya20 | Unchanged | Its wording and commentary remain its own. |
| SN12.21 | Approximate duplicate of `[132,143)`, incorrectly VRI20 | **`[143,146)`**, VRI21 | Includes the Dasabalavagga heading as paratext, first Dasabala heading and its body ending *Paṭhamaṃ*. Exact source title `Dasabalasuttaṃ`; approximate flag removed. |
| SN12.22 | `[143,150)`, swallowed both21–22 | **`[146,150)`**, VRI22 | Starts at the second Dasabala heading, ends before Upanisa; body ends *Dutiyaṃ*. |
| SN12.23 | `[150,159)`, Upanisa23 | Unchanged | Its wording and index remain untouched. |

PTS metadata is reannotated through the existing source policy:21 ii27–28,22 ii28–29. No scripture block, paragraph number, note or page marker changes. Both corrected identities receive **`sn-dasabala-v1` locator revisions** while retaining the authentic VRI commit. Old pinned references must refuse before wording; users explicitly review current sources, while their notes remain unchanged/exportable. Unrelated locators and the earlier Heraññakāni/Somamitta correction remain intact.

This correction does not expand the root's *peyyāla* abbreviations. Exact index ownership and fully expanded source wording are different questions.

## Commentary and the Walshe hold

SN12.21 incorrectly shared passage3333, which explains Paccaya20. Remove only that association, preserving passage3333 for SN12.20 and passage3334 for SN12.22. All commentary books and passages remain byte-equivalent as JSON values.

The source commentary really has a short paragraph21 stating that the first discourse abbreviates the second. It is recorded as **cited but unaligned**; no new passage alignment is invented. SN commentary coverage becomes1,799 aligned of1,954 records,1,800 cited and1,799 cited-aligned. Overall aligned-record metadata becomes6,069, with2,475 unaligned notices. A missing accepted alignment does not mean the traditional commentary is absent.

[SN12.22 Walshe](https://www.accesstoinsight.org/tipitaka/sn/sn12/sn12.022x.wlsh.html) still begins inside the final bundled paragraph after earlier sentences. Correcting the root removes the accidental extra21 but does not make the translation complete. Its hold is re-reviewed against the corrected22-only root; the previous root record is retained in the manifest's provenance. Accurate automatic restoration requires a separately designed/reviewed subparagraph scope, not relabelling the entire final segment. Original ©1985 BPS rights remain unchanged.

## Reproducible repair and stale-input safeguard

`dasabala_spans.py` runs after the existing story corrections in source indexing. The legacy wrapper validates the pinned source commit, complete parsed-book parity, exact headings/numbered bodies/terminals, known legacy or corrected states, group dependencies and commentary baseline before mutation. It is idempotent and rejects drift.

An initial temporary handoff used an older index snapshot with the same VRI commit and would have regressed the earlier Theragāthā repair. Existing partial-source root pins rejected it before any commit or publication. The repair was reapplied to freshly unpacked073 branch data. Independent full-dataset comparison confirms only the two SN unit records and the SN12.21 commentary association change; all other canonical fields and all commentary books/passages remain unchanged.

Receipts now expose **input and output hashes for both complete datasets**. Matching VRI commits alone cannot establish that a temporary input contains the latest indexing work. Check these hashes against current branch inputs before integration. Earlier old-basis temporary outputs demonstrate repair behaviour only and are not the integration evidence.

Parallels are regenerated from the actual corrected canon/commentary, preserving input hashes. The current artifact has5,322 commentary citations and1,518 shared passages; refreshed documentation also reconciles older stale totals, without attributing every historical increase to this batch.

## Historical schedules and current counts

The three removed whole-English claims reduce the daily pool1,268→1,265. In this data version,2026-11-01 selects **DN32**; the algorithm is unchanged.

Historical schedule tests now use frozen eligible-ID/book/position tuples captured from073, with a baseline hash and explicit earlier additions for SN12.22 and Iti10. They reproduce D207's1,268/AN10.92, D203-after's1,269/SN5.3 and D203-before's1,270/Snp2.7, without restoring obsolete runtime translation authority or bypassing the registry. Tuples and canonical identities are validated. Current pool, source refusal, retrieval and consent tests remain separate. Approximate-search regressions use an actually unverified source (SN35.34); repaired SN12.21 now has its own exact-span search regression.

Ordinary English links2,569→2,566; ATI1,142→1,139. Whole-English direct coverage1,445→1,442 and inherited coverage1,868→1,865; grouped runtime totals1,416/1,839. Partial sources8→9, with three partial-only units. Shared scopes stay12 pages/110 actual subjects. Canonical records stay8,544; approximate mappings266→265, comprising199 explicit shared spans and66 unverified independent locations. No new whole-English coverage is claimed.

The updated [ordinary-excerpt queue](ordinary-excerpt-review-queue.json) has25 flags: one frozen retained review and24 unreviewed bindings. These overlap the broader216 metadata leads; do not add the counts or treat flags as errors.

## Verification

```sh
python3 scripts/canon/repair_dasabala_spans.py /tmp/current/canon.json.gz /tmp/current/commentary.json.gz /tmp/pali-vri /tmp/canon-fixed.gz /tmp/commentary-fixed.gz
node --test tests/dasabala-spans.test.mjs tests/priority-prose-review.test.mjs tests/partial-page-build.test.mjs
python3 scripts/web-reader-partial-pilot-check.py --source-root /tmp/pali-ati-source --report /tmp/partial-browser.json
python3 scripts/web-reader-bookmark-pin-check.py --report /tmp/bookmark-pins.json
npm run check
```

Actual-source browser reproduction uses only pinned local HTML, and source/locator tests use the bundled real Pāli. Reports contain metadata/hashes, never publisher English bodies or private note contents. Synthetic-provider audits remain separately labelled. Exact-head CI follows safe dev integration. No main merge, deployment, new rights grant, current upstream availability or whole-canon semantic verification is implied.

### Measured local verification

- Independent source-boundary/licence review and fresh-input full-dataset comparison passed; the final audit exception was separately reviewed and is limited to the documented SN12.21 unaligned passage.
- Focused source/root checks25, metadata/search regressions27, topic checks18, MCP smoke64 and all eight installed native partial-source audit modes passed.
- Browser development / accessibility / installed-package checks: partial sources121/121/121; saved-position guards104/104/104; topics52/52/52. Accessibility automation ran108+60+20 scans with zero violations. These are automated checks, not human accessibility certification.
- Khanti's one held AN6.54 topic binding now remains a labelled external publisher page, without a canonical read command or automatic English fetch. All other471 topic records are preserved. The offline topic builder has the same guard.

The final `npm run check` passed all1,066 tests and audited all8,544 canonical records with zero failures. The audit keeps every collection floor and allows only the explicitly documented SN12.21 gap; unexpected unaligned passages still fail.

The first dev CI evidence run exposed a stale harness assumption that every external topic link was commentary. The revised assertion requires the exact withheld-page scope and label and no canonical ID or reading command, preserving essay assertions for other links. The complete installed evidence audit passed locally:11,983 reading commands,472 topics,5,322 commentary links and zero network attempts.
