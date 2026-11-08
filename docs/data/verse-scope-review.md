# Verse scope review and the Heraññakāni/Somamitta boundary

Decision D204; baseline `b50909f5c2f5ae9b976e74ec76307d780b01d622`. This bounded review inspected fifteen complete publisher bodies, their full notices and complete indexed VRI roots, with independent review. [Metadata evidence](verse-scope-review.json) records raw HTML, extracted text, notice and complete-root hashes, plus production-provider reproductions using the official checked-out sources. No English source bodies are bundled, and no live or deployed retrieval is claimed.

## Five retained mappings

The three initial priority leads are valid. [Sumangala's Mother](https://www.accesstoinsight.org/tipitaka/kn/thig/thig.02.03.than.html) contains only verses23–24; both Dantika renderings ([Thanissaro](https://www.accesstoinsight.org/tipitaka/kn/thig/thig.03.04.than.html), [Rhys Davids](https://www.accesstoinsight.org/tipitaka/kn/thig/thig.03.04.rhyc.html)) contain only48–50. Their broader publisher header references19–38/39–62 do not describe the scripture body. [Sujātā](https://www.accesstoinsight.org/tipitaka/kn/thig/thig.06.04.hekh.html) likewise covers the complete145–150 poem despite header133–138. Preserve publisher references as provenance; do not turn those headers into new canonical assignments.

[Heraññakāni](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.02.13.than.html) correctly translates145–146. Its apparent shortfall exposed a **root-index error**: our `thag2.13` also included Somamitta's heading and first verse147, while `thag2.14` began at148. In source book34, block814 closes Heraññakāni,815 starts Somamitta,816–819 contain147, and820 begins148. Correct the adjacent spans to `[807,815)` / `[815,824)` and VRI145–146 /147–148. This moves source ownership, not source wording. The complete source books and commentary JSON remain unchanged. All other canonical fields/records are unchanged. Rebuilding derived parallels yields1,517 shared passages rather than1,516.

The build-time repair requires exact titles/headings, adjacency and verse sequences and validates all planned changes before mutating any units. `repair_story_spans.py` verifies all three complete pinned VRI XML books against compact source blocks before repairing legacy data. Unexpected identity or source drift fails rather than guessing. This extends the existing reviewed Vassika/Yasoja mechanism; it is not a general number-based boundary rewrite.

## Ten excerpt bindings withheld

| Publisher version | Actual body and independently confirmed omission |
|---|---|
| [Snp3.12 Ireland](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.3.12.irel.html) | Late761–771 only; lacks opening narrative, earlier prose and729–760. |
| [Snp3.12 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.3.12.olen.html) | 764–767 and first part of768, with editorial preface/ellipses; lacks remaining768 and769–771 as well as earlier material. |
| [Snp2.14 Ireland](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.2.14.irel.html) | Jumps380→385, omitting Erāvaṇa, Vessavaṇa, competing ascetics and Brahmins381–384. |
| [Thag6.13 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.06.13.olen.html) | 448–452 only; lacks447's rain imagery. |
| [Thig10.1 Hecker/Khema](https://www.accesstoinsight.org/tipitaka/kn/thig/thig.10.01.hekh.html) | Discontinuous213–217,220,222–223; omits218–219 and221. |
| [Snp2.11 Ireland](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.2.11.irel.html) | Actual339–344, not header337–342; opening question/answer337–338 absent. |
| [Snp4.15 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/snp/snp.4.15.olen.html) | 941–945 and954–957; omits946–953 and958–960. |
| [Thag10.1 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.10.01.olen.html) | 527–529 only; omits530–536. |
| [Thag15.2 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.15.02.olen.html) | Lotus700–701 only; omits689–699 and702–704. |
| [Thag16.8 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.16.08.olen.html) | Moon871–873 only; omits866–870 and874–891. |

These are legitimate excerpts of the named works, not fabricated passages or necessarily wrong positive quotation attributions. The defect was presenting and counting them as complete units without partial scope. Every page identifies excerpt status in metadata or subtitle; two Olendzki pages misleadingly say `EXTENT=complete` elsewhere. Complete bodies and roots, not one metadata flag, determine the decision.

The new `withheld-partial-unit` manifest status is restricted to one ATI owner/root with source/text/notice/root hashes. Global URL holds cannot be bypassed by an alternate owner, query string or attached scope field. They authorize no retrieval. Exact requests fail before fetching; no silent version substitution is added. All nine affected units retain independent DT links, and existing ATI alternatives stay unchanged. Future partial integration needs exact source-specific span/notice review; discontinuous excerpts and a half-verse must not be forced into an overbroad contiguous declaration.

Rights remain source-specific. Thanissaro notices stay CC BY-NC. Ireland and Hecker/Khema retain their BPS attribution, free-distribution, complete-notice and ≤50-reprint conditions. Olendzki's ©2005 free-distribution/source-identification/full-notice grant is not CC. Withholding grants no new copying or distribution permission.

## Counts, triage and continuation

Ordinary links decrease2,587→2,577, ATI1,160→1,150. Direct coverage remains1,448 indexed texts /1,871 including inherited sources; grouped runtime totals remain1,422/1,845. Shared pages remain12, with110 actual subject records and52 shared-only. No new translation or partial retrieval is activated. Daily eligibility remains1,269 and the 2026-11-01 choice remains SN5.3.

`node scripts/source-scope-screen.mjs` now also prioritizes narrower/discontinuous references. Bibliographic `537–41` is interpreted as537–541 for triage only, never canonical alignment. The default local review ledger marks the five retained cases as **reviewed at a frozen source snapshot**, requiring the same link fingerprint, complete-root hash and VRI commit. Source freshness and rights are never inferred. Metadata/root drift returns the case to unreviewed triage. `--review PATH` supports an explicit ledger.

The screen now reports224 remaining metadata leads: five retained snapshots and219 unreviewed leads. Three priority leads remain unverified: Thag10.2 Olendzki and two Thag17.3 versions (Hecker/Khema and Olendzki). They are next review candidates, not confirmed defects or approved additions. All219 unreviewed leads, including these three, remain unapproved.

Regression tests cover exact-version zero-fetch refusal, retained independent sources and notices, complete-root pins, proper ownership of Somamitta147, boundary-repair idempotence/atomic rejection, metadata-only triage and stale-review expiry. A controlled ordinary linker rebuild recreates all ten bindings when only the final exclusion pass is disabled inside the isolated test process, and recreates none with the guard active. No configuration or production guard is disabled. Installed-package and full-suite evidence are separate from live/deployed testing.

Local validation: `npm run check` passed1,038 tests with one skipped and audited all8,544 canonical records with zero failures. The installed shared-package audit passed34 modes with zero real network attempts; smoke passed64 checks; offline evaluations passed195 questions with six live questions intentionally skipped. Independent source, implementation and documentation reviews found no blocking issue. Exact-head CI remains separate release evidence.

### Saved-position follow-up

Independent review reproduced another consequence of the repaired index: old `thag2.14/1` and `/2` refs still existed but now selected different segments under the same authentic VRI commit. These two records now carry a build-preserved `index_revision: thag-pair-v1`. Reading responses keep `source.commit` as the actual VRI edition and add a separate `source.locator_revision`. Bookmark creation, reading/resume links and their pre-wording guard use that locator revision. Old known pins for these two units require explicit current-source review; stored notes, refs and old pins are not rewritten. Other texts and complete-book locators retain their existing edition pins. Word-study provenance stays on the actual edition commit. This is a mapping-revision safeguard, not a historical text archive. Actual browser tests cover both pre-repair locators, unchanged notes/exports and fresh repaired-unit locators. A new exact-head CI run is required for this follow-up.

The follow-up's actual browser checks passed80 cases in each normal, accessibility and extracted-npm-package mode; accessibility performed44 scans with zero violations. Focused mapping/position/bookmark/story checks passed20 tests; the hardened malformed-revision checks passed a separate10-test run. Adding mapping metadata changes the canon data hash even without changing wording: regenerate the derived parallels artifact after that metadata change as well. Its14-test suite passed after regeneration. Full-suite and final exact-head CI results are separate release evidence.
