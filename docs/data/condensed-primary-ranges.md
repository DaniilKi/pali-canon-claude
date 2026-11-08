# Condensed publisher pages and primary source ranges (D200)

This addition exposes two complete ATI publisher pages as **condensed shared
sources**. It does not supply thirty individual translations or expand the
Pāli's abbreviations. Ordinary English coverage remains unchanged.

## Exact subject records

| Official publisher page | Explicit primary VRI records | Source evidence |
|---|---|---|
| [Macchariya: Stinginess](https://www.accesstoinsight.org/tipitaka/an/an05/an05.254.than.html), publisher AN5.254–271 | `an5.254`, `an5.255`, `an5.256`, `an5.257-263`, `an5.264`, `an5.265-271` | 17 complete root blocks: five stinginess forms; their abandoning; first jhāna and grouped higher attainments; second series substituting ingratitude for Dhamma-stinginess. |
| [Pansu: Dust](https://www.accesstoinsight.org/tipitaka/sn/sn56/sn56.102-113.than.html), publisher SN56.102–113 | `sn56.102`, `sn56.103`, `sn56.104`, `sn56.105-107`, `sn56.108-110`, `sn56.111-113` | 13 complete root blocks: human/human, human/deva, deva/deva and deva/human contrasts against hell, animal and ghost destinations. VRI1172–1183. The following hell-origin group114–116 is excluded. |

The five range IDs here are genuine primary source records with their own stored
VRI blocks. They have no generated `members`, `kind:range` or `approximate`
flags. This differs from virtual containing ranges or uncertain individual
alignments, which the shared-scope validator still refuses. The two six-record
sets are contiguous and nonoverlapping, and pass the existing validator without
loosening it. A citation such as AN5.257 resolves to the source record
AN5.257–263; SN56.105 resolves to SN56.105–107. No independent wording or
translated member is created for those children.

Both publishers condense repeated formulas with ellipses. Macchariya's group
naming and opening note are the translator's; Dust's repeated framing and
four-truths contemplation conclusion remain English publisher wording. The
latter must not be aligned literally to individual VRI records retaining
`…pe…`. Returned scopes say `presentation:condensed`, `condensed:true`,
`individual_alignment_verified:false`, `whole_unit_coverage:false`.

## Rights and evidence

Official BCBS ATI archive commit:
`45fedca341497120651efa20e756b04a13e61089`.
VRI root commit: `2d134ff9ef60f70a1eb03c9370580228811a3070`.
Complete root title/reference/block and normalized member-segment pins are in
`scripts/canon/reviewed_shared_pages.json`.

| Pin | Macchariya | Pansu |
|---|---|---|
| HTML SHA-256 | `ce2e49bdd55fe07f46a7df3e0a7547c16773fcbf5f93cfd0e0cba715a0114c53` | `322fc8b357567cff07a7782686add5ec6a0fe401a911509a993ee9d9354cdc2a` |
| Extracted text | `aeb2a28cad2073c8f951b5616c4f7616f07e424b2bf6061604173452fd05a63b` | `9cc6b0c063ab2d3220aaaf560bdd46fbb3e9d6ac3f4f54f59657cb92a0a2baf1` |
| Complete notice/citation | `d7bbdbfccd9919fb99adf4124f93144f67d4331d239aa8706b72251b60621abe` | `d2699fd2c0227a0bd2dd96514d26ae1f3b3978eb2d734ae46a1619cee5d1e8b5` |
| Normalized Pāli scope | `60a7de904ef489aa923941ea5da67e5add65a338b60713e34b211c40ff0f4243` | `94406ba6700743612e2235e829407c469efde2065e6f270a97484b5f64df1209` |

Independent read-only review reproduced all pins, accepted the exact six-record
sets and required condensed presentation. Extracted lengths are5,052 and2,875
characters. Complete notices explicitly grant CC BY-NC4.0: Ṭhānissaro ©2004,
ATI revision30 November2013; ©2011, revision10 December2011 respectively.
Linked documents have their own terms. Full notices/citations accompany live
reads. Current-version dhammatalks banners outside the copyrighted chunks do
not authorize substitution. No English bodies are bundled in data or fixtures.

## Contracts and counts

- Exact shared-source ID and `allow_shared:true` are required to read; quotation
  checking additionally requires explicit texts and `include_shared:true`.
- Scope/text/complete-notice hashes fail closed on drift. Continuations retain
  independent source offsets, scope hashes and prefix hashes.
- Positive and negative quotation results concern the full page only, with null
  individual IDs. Primary range IDs stay grouped throughout.
- Whole-unit counts remain2,595 links,1,449 direct records and1,872 including
  inherited verses. Seven shared pages concern42 actual indexed records, all
  shared-only; five are primary source ranges. The new pages add12 source
  records, not18+12 separately aligned translations.
- The114-page historical queue now contains53 pending pages,6 with possible
  first-English gaps. These are screening clues, not approvals. Mother,
  Woodward, singleton condensed and other unresolved scope/rights holds remain.

## Validation

`tests/condensed-source-ranges.test.mjs` checks complete roots, exact grouped
members, child resolution, adjacent exclusions, separate counts/export, consent,
pinned continuations, null-ID quotation results and notice drift using synthetic
English fixtures. Existing paired/mixed-source tests remain, with an explicit
existing10-match request for seven source ties; no public limit was increased.

The installed-package and live browser acceptance scripts now compare each
reviewed declaration's exact presentation instead of assuming every page is a
compilation. They retain mandatory ATI notices and page-level scope. Run:

```
node scripts/canon/verify_shared_html.mjs scripts/canon/reviewed_shared_pages.json /path/to/pinned/ati
node --test tests/condensed-source-ranges.test.mjs tests/reviewed-paired-compilations.test.mjs
node scripts/audit-shared-translations.mjs --report /tmp/shared-report.json
NODE_USE_ENV_PROXY=1 python scripts/web-reader-compilation-live-check.py --live --a11y --report /tmp/shared-browser.json
npm run check
npm run smoke
npm run evals
```

The proxy flag is required only in this managed cloud environment. Automated
accessibility checks do not replace native-reader, assistive-technology or
physical-device acceptance. No accounts, sync, deployment or main merge is added.

Acceptance evidence: all23 installed scenarios passed; live worker/browser
acceptance passed98 checks across all seven actual pages at390/1280px in both
themes, with84 automated accessibility scans and zero violations. The
[metadata-only receipt](../evidence/shared-primary-ranges.browser.json) retains
source/notice pins, grouped IDs and limits, never publisher bodies. Smoke64 and
offline evaluations195/195 passed,6live questions skipped. Independent source
and implementation reviews passed. Full-suite/corpus and exact-head CI remain
separate final integration gates.
