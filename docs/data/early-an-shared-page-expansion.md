# Early Aṅguttara shared-page expansion (D199)

Two additions reuse the explicit shared-source protocol. They give readers access
to complete publisher pages, **not 22 individually aligned translations**.
Canonical text and the 8,544-unit audit population are unchanged. Removing one
unsafe ordinary link changes the data-version daily-sutta pool from1,271 to1,270;
its date-dependent permutation changes accordingly. The 2026-11-01 evaluation
now expects Sn2.7 instead of MN28. No daily-rotation algorithm was altered.

## Source and scope

The official BCBS ATI checkout is pinned at
`45fedca341497120651efa20e756b04a13e61089`; the VRI edition is pinned at
`2d134ff9ef60f70a1eb03c9370580228811a3070`.

| Publisher page | Explicit indexed subjects | Scope evidence |
|---|---|---|
| [A Single Thing](https://www.accesstoinsight.org/tipitaka/an/an01/an01.021-040.than.html) | AN1.21–40 | Twenty numbered passages about mind development, cultivation, taming, guarding, protection and restraint, including paired/combined contrasts. Twenty independent contiguous VRI records; 24 blocks including source paratext. |
| [Voice](https://www.accesstoinsight.org/tipitaka/an/an02/an02.125-126.than.html) | AN2.125–126, VRI126–127 | Another's voice plus inappropriate/appropriate attention conditions wrong/right view, PTS A i87. Source historical alternate numbering does not map to indexed AN2.123–124 (passion/aversion). |

Voice's substantial translator note cites other texts and interpretations. It is
preserved as part of the publisher page, never promoted to extra members or
individually aligned root speech. Source “see also” links are not mappings.
Independent source review agreed with both scopes and reproduced all hashes.

Both complete notices identify ©2006 Ṭhānissaro Bhikkhu, translator-supplied
files, ATI BCBS revision30 November2013 and CC BY-NC4.0. Linked documents have
separate terms. The current-version dhammatalks banners outside the copyrighted
chunks are not silently selected. Full notices and citations accompany live
content. No English source bodies are committed in the package or test fixtures.

## Pinned evidence

Full root title/VRI reference/block digests and normalized member-segment pins
are in `scripts/canon/reviewed_shared_pages.json`. Production extraction and
complete notice hashing are checked by the Node/Python builder, not guessed
from headings or licence labels.

| Page | SHA-256 |
|---|---|
| A Single Thing HTML | `df8afc7457b8720a55f487f52fb47bff94371e52455cf3596daecc5fbbfa65a4` |
| Extracted text (3,256 characters) | `4ea2069bc8a4bdaf2021f5f9729af8c06362053595841c77cf59b75e395d8145` |
| Full notice/citation | `4153685976f9d98f9a61ca223a5f71d2ce2c9281fd0b0c043859d133c45a1238` |
| Voice HTML | `df8584c8489b6cb76b34d8578ff06261a6092f4860216cea6bd6efbde2cccfdb` |
| Extracted text (3,520 characters) | `a5d4d3d63f2166947cbcb1ccaa12883f6fbd90ef4445c73ff1c4441064eff8ec` |
| Full notice/citation | `d96963652b5b6f051df62ac6a54047af61d5f715b1dd3bcfdab4e62bc0b04de7` |

## Accuracy repair discovered during review

The old ordinary `an1.31` link to
`/tipitaka/an/an01/an01.031-040x.wood.html` attributed the whole Woodward
*Untamed* excerpt to one discourse. The publisher labels it an excerpt and
includes six historically numbered passages31,32,33,34,39,40. The first
tractable/intractable passage is not current indexed AN1.31's great-harm/untamed
wording. ALT_ID and an historical editorial numbering warning add ambiguity.

The independent reviewer recommended HOLD. We removed the one ordinary link and
extended the existing global post-linker exclusion to narrowly validated ATI
source URLs. Changing the proposed owner or attaching scope fields cannot restore
it. The exclusion records the withdrawn owner only; publisher labels are not an
approved subject range. Separate content, extent and rights review is required
before remapping. This page's ©1983 BPS free-distribution/reprint terms are not
CC BY-NC and have not been changed. Exact source/extracted-text/notice hashes are
preserved in `scripts/canon/reviewed_exclusions.json` without source bodies.

## Coverage and remaining queue

| Measure | Before | After |
|---|---:|---:|
| Ordinary links | 2,596 | 2,595 |
| Direct whole-unit link records | 1,450 | 1,449 |
| Including inherited verse links | 1,873 | 1,872 |
| Shared pages | 3 | 5 |
| Explicit shared subjects / shared-only subjects | 8 / 8 | 30 / 30 |

The decrease corrects scope; the additions themselves add zero whole-unit links.
Runtime grouped-member totals are1,423 direct and1,846 including inherited of
8,445. Ordinary providers: DT1,275, ATI1,167, Ānandajoti153. Twenty-one of the
22 added subjects previously had no ordinary link; AN1.31 had the withdrawn bad
binding. Every added subject is now shared-only. Citation audit is not a full
translation coverage claim. The114-page historical queue now has55 pending
pages (38 labelled complete,17 excerpts),8 with possible first-English gaps.
These are screening clues, not approvals. Mother, condensed singletons and other
unresolved scope/rights holds remain.

## Reproducible validation

- `node scripts/canon/verify_shared_html.mjs scripts/canon/reviewed_shared_pages.json /path/to/pinned/ati` verifies all five source pages offline.
- `node --test tests/early-an-shared.test.mjs tests/reviewed-exclusions.test.mjs tests/reviewed-shared-page.test.mjs` covers exact root members, neighboring numbering, null-ID/page-only quotation results, explicit consent, pinned continuation, notice drift and durable withholding/rebuild.
- `node scripts/audit-shared-translations.mjs --report /tmp/shared-report.json` exercises installed stdio/HTTP and every real declaration through synthetic providers; it does not contact source authors.
- `npm run check`, `npm run smoke`, `npm run evals`; exact-head cloud checks after integration. CI receipts distinguish synthetic contract tests from live network availability.

Metadata is available for all22 subjects. Retrieval still requires the exact
translation ID and `allow_shared:true`; quotation checks require explicit text
IDs and `include_shared:true`. Positive and negative results apply only to the
complete publisher page. No archived English, offline translation licence,
individual alignment, account sync, deployment or main merge is supplied here.

Live production extraction was also checked through the configured cloud proxy:
both new pages were retrieved via the approved official BCBS GitHub mirror,
with exact text/notice pins, complete3,256/3,520-character bodies, null individual
IDs and `whole_unit_coverage:false`. Direct Node networking without the required
proxy reported DNS errors; those are environment setup failures, not source
outage evidence.

The worker-backed live browser acceptance passed70 checks for all five actual
compilations at390/1280px in light/dark themes, including consent, full pinned
page/notice rendering, no horizontal overflow and fresh consent on reload.
The metadata-only [browser receipt](../evidence/shared-early-an.browser.json)
contains exact source pins and automated accessibility findings/limitations.
Installed synthetic contracts passed19 scenarios with no author-host requests;
smoke64 and offline evaluations195/195 passed (6live questions skipped).
Independent source and implementation reviews passed, including reproduction
of the daily-pool evaluation change by restoring only the old binding in memory.
