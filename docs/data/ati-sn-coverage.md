# Three individually reviewed SN translation links (D185)

This batch adds **three first-English choices**: SN 4.8, SN 17.5 and SN 3.7.
It does not create translations, expand Pāli abbreviations, change canonical
boundaries or introduce a new provider. Main and deployment remain untouched.

## Sources and identity

VRI sources are pinned to
`2d134ff9ef60f70a1eb03c9370580228811a3070`. Both complete XML books match the
bundled compact source blocks, including notes and page metadata:

| File | SHA-256 |
|---|---|
| `s0301m.mul.xml` | `2a4a21596a0eda19c74fc2dedaaaccf262bf1776c09b3043d654a9f1c676411b` |
| `s0302m.mul.xml` | `61bc83404230b7cf06142f642834c8ea69aa0f4f2cc45d201716cd1ac9a0b40a` |

ATI pages come from the [official BCBS mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn),
commit `45fedca341497120651efa20e756b04a13e61089`. Each page identifies its
extent as complete. That metadata alone does not establish a correspondence;
its complete content and boundaries were compared with the root unit.

| Canonical unit | ATI page | Evidence beyond the sutta number |
|---|---|---|
| SN 4.8, Nandatisuttaṃ, VRI 144 | `sn04.008.than`, Nandana: Delight | PTS S i 107; Māra at Jeta Grove; delight/grief verses; Māra disappears dejected |
| SN 17.5, Mīḷhakasuttaṃ, VRI 161 | `sn17.005.than`, Pilahaka: The Dung Beetle | PTS S ii 228; dung-beetle pride; monk boasting of food, next-day invitation and four requisites; contempt for virtuous monks; harm and training conclusion |
| SN 3.7, Aḍḍakaraṇasuttaṃ, VRI 118 | `sn03.007.than`, Atthakarana: In Judgment | PTS S i 74; Pasenadi's complaint about wealthy litigants lying for sensual pleasure; Buddha's agreement; fish-in-a-trap verse |

SN 1.12 has similar delight/grief verses and the same VRI title as SN 4.8.
It has a deva speaker and lacks Māra's departure. The prose context and PTS
reference distinguish the reviewed page; shared verses or title alone would
be insufficient. Regression tests prevent the new page being selected through
SN 1.12, including refusal before any network request.

## Abbreviations and editorial material

SN 17.5 retains explicit `…pe…` framing in VRI. ATI spells out the warning
about gains, offerings and fame and the final training instruction. VRI
SN 17.1 explicitly states that training formula in the same collection. The
unique extended analogy and its ordered details establish discourse identity.
This is a whole-discourse translation choice with edition differences, **not**
a literal expansion or line-by-line alignment of the bundled abbreviated Pāli.
No missing Pāli is generated.

SN 3.7 abbreviates the speech-to-verse transition in VRI; ATI spells out that
transition and itself abbreviates the repeated wealth description. Both
versions' abbreviations are preserved, not silently harmonized.

SN 4.8's prefatory translator explanation and SN 17.5's “See also” links are
editorial, not speech attributed to the canonical characters. Mapping notes
explicitly distinguish these materials. They do not turn editorial commentary
into an additional canonical text.

## Rights and fail-closed review

All three pages: copyright 1998 Ṭhānissaro Bhikkhu, **CC BY-NC 4.0**. The full
page-specific licence, attribution and original source citation accompany live
reading. No English bodies are bundled. Ordinary runtime ATI/mirror retrieval
and existing continuation checks remain unchanged; source hashes record this
build review rather than an immutable runtime edition.

The [review manifest](../../scripts/canon/reviewed_ati_stories.json) pins each
complete HTML page, root title/paragraph and root verse wording, plus the
**complete root block slice**. Every reviewed SN page must now supply that
full-block hash. A verse-only hash cannot distinguish altered prose context,
and is empty for all-prose SN 17.5. Tests reject both a missing full-scope hash
and changed prose with an unchanged verse hash. No general numbering heuristic
or network host allowlist was widened.

The [baseline candidate ledger](ati-coverage-screen.json) retains its original
statuses and adds a separate D185 review. This resolves the prior SN 17.5 scope
hold for this exact source version and documented relationship, not for every
similarly named edition or other translator.

## Dataset effects and remaining gaps

Only the three specified translation entries change. Canonical source data,
commentary, existing translation choices and identifiers are preserved.
Current totals: **2,553 links**, **1,411 directly linked units**, **1,834 with
inherited verse links**; grouped-member reporting is 1,385 / 1,808 of 8,445.
These are access-link counts, not a claim of full English or scholarly review.

Adding three eligible suttas changes the daily-reading pool: the 2026-11-01
fixture becomes Iti 51. The rotation algorithm is unchanged and remains
deterministic for this dataset version.

Other candidates, alternate translators, excerpts and compilations still need
individual scope and rights review. No wider SN offset, naming rule or
abbreviation-expansion rule is inferred from these three correspondences.
Untranslated parts of the canon and manual app/specialist review remain open.

## Validation

The packaged stdio MCP reader returned complete live ATI translations, with
licence, attribution and mapping notes: SN 4.8 **1,019 characters**, SN 17.5
**1,718**, SN 3.7 **1,247**, each in one page. The focused source-review and
evaluation suite passed 17 tests, including all 195 non-network evaluation
questions (six live questions explicitly skipped). The final complete local check passed 891 tests with one skip, then audited
all 8,544 canonical texts with zero failures. The installed-package audit read
all canonical texts, 47 commentary books and 109 post-canonical books with zero
failures and zero network attempts. Offline smoke passed 34 tools / 64 checks;
the official ATI reference validator reported zero problems. The validator
does not replace the individual content and scope review. Exact-commit CI
outcomes are recorded in the completed batch receipt.
