# Seven reviewed choices, signless scope and a held source (D188)

This batch adds **seven first-English links** after reviewing the packet's
possible direct-English gaps. Screening indicators were not treated as
approvals. Canonical wording, boundaries, commentary and earlier choices stay
unchanged. Main and deployment remain untouched.

## Reviewed correspondence and editorial scope

Sources are pinned to the [official BCBS ATI mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka),
commit `45fedca341497120651efa20e756b04a13e61089`.

| Indexed unit / VRI paragraph | ATI reference and PTS | Reviewed identity and limits |
|---|---|---|
| SN 40.9 / 340 | SN 40.9, S iv 268 | Moggallana's signless concentration, disturbance, Buddha intervention and final attainment statement. The bracketed preface summarizes earlier eight discourses; they are not translated here or counted as covered. Eight numbered Notes are translator interpretation. |
| SN 22.7 / 7 | SN 22.7, S iii 15 | Both mirrored grasping/worry and non-grasping/non-worry sections treat five aggregates and changing self-identification. Publisher repetition summaries, setup and three Notes are editorial; this is a condensed whole-discourse version. |
| SN 35.238 / 238 | **SN 35.197**, S iv 172 | Ordered vipers, executioners, village, bandits, flood and raft simile, followed by its complete decoding. The source adds a setting preface; VRI starts directly with the simile. Some repeated formulas differ in abbreviation. No general +41 rule is inferred. |
| SN 55.24 / 1020 | SN 55.24, S v 375 | Sarakani/Saranani, Mahanama, six person-types, sal trees and death-time training. Reporting/formulas are condensed. The source PTS page lies inside VRI S v 374–377. Eight interpretive Notes are not extra canonical statements. |
| AN 4.77 / 77 | AN 4.77, A ii 80 | Four ordered unconjecturables, warning and conclusion. Repetition abbreviations, bracketed glosses and two explanatory Notes remain distinguished. |
| AN 3.136 / 137 | **AN 3.134**, A i 286 | Three regularities with or without a Tathagata, each followed by awakening/declaration wording. The final Unbinding Note is translator interpretation. Title and numbering differ; neither supplies a general offset. |
| AN 5.130 / 130 | AN 5.130, A iii 147 | Five losses and five successes, distinguishing the first three from conduct/views regarding rebirth. The differing titles emphasize opposite halves of the same discourse. The VRI chapter recap is paratext, not a separately translated work. |

These are named publisher versions with disclosed conventions, not literal
line alignment or reconstruction of abbreviated Pāli. Explicit regression
checks prevent the older-numbered URLs from selecting the numerically named
but different indexed units. SN 40.9's contextual preface does not give its
page to SN 40.1 or SN 40.8.

## Why SN 36.15 is still held

Nyanaponika's page identifies itself as complete and its feeling inquiry
matches SN 36.15. Its English, however, supplies one gradual-cessation treatment,
where VRI separately treats cessation, stilling and subsiding. A whole-VRI
coverage claim needs a precise scoped or condensed-edition assessment of this
difference. No such claim or link is added here. The decision concerns scope,
not an accusation of inaccurate translation or invalid BPS permission.

This is a concrete example of why a publisher extent label and plausible PTS
match cannot approve a whole-unit link. The source remains in the review queue
with the specific gap recorded, rather than being silently marked resolved.

## Provenance and rights

VRI commit: `2d134ff9ef60f70a1eb03c9370580228811a3070`. Complete XML books
match the bundled blocks, notes and page metadata:

| File | SHA-256 |
|---|---|
| `s0303m.mul.xml` | `ab96b1c89578c607a73f3bc931dff1315b1427815ce94b2ea1929583152f5a2a` |
| `s0304m.mul.xml` | `82cb012c7f462a46f1d159577d13a5cabf3a8259c7886660d4fd83beee4f4dbb` |
| `s0305m.mul.xml` | `95300f79a48558b66d54e5e0913b526aeda2be88cc3f3f3fd44542419fbebb78` |
| `s0402m2.mul.xml` | `41ea7d2199fa1616691e3d358db4d84c69d049b9a7c26ba94688b0d9cae7197a` |
| `s0402m3.mul.xml` | `17841b20862c2c6e52d58fd34d75747fa606cb9d6fc5610eb4e3bba41dede667` |
| `s0403m1.mul.xml` | `92476afb6d3a4a776e60040dfb17c1df73e06be5926a3380d9909b44e68e521d` |

Walshe's three accepted pages are copyright 1985 BPS, Wheel 318–321, with
explicit free-distribution, source/derivation acknowledgement, complete-notice
and 50-copy print conditions. The four accepted Thanissaro pages are CC BY-NC
4.0: SN Vipers 2004, AN Unconjecturable 1997, AN Dhamma-niyama 1996 and AN
Sampada 2004. Original full notices and citations accompany live reading;
English bodies are not bundled. Notes quoting or citing other publications do
not cause those publications to be fetched or added to canonical coverage.

The [manifest](../../scripts/canon/reviewed_ati_stories.json) pins complete
HTML and root blocks. Reviewed AN pages now use the same mandatory full-block
hash as SN; empty verse hashes cannot protect prose. The path guard permits
KN/SN/AN only. General linking heuristics, providers and network allowlists
remain unchanged. Build review does not freeze future live network bytes.

## Queue improvements and remaining work

The [review-packet command](../../scripts/canon/README.md) now surfaces prior
scope-hold notes without excluding the page or approving it. That lets the
next reviewer address the known gap rather than repeat discovery. Historical
holds remain evidence to reassess independently. Empty-ledger input is also
handled without an unnecessary source-path query. Tests cover both cases.

The [ledger](ati-coverage-screen.json) retains historical records and adds a
D188 follow-up. The [reproducible queue snapshot](ati-d188-review-summary.json) records 88 pending pages and 41 pages with potential direct-English gaps. These are not validated additions.
Pending metadata possibilities still include PTS collisions,
excerpts, condensed editions, introductions and compilations. New providers and
complete English coverage are not established by this batch.

## Coverage and validation

Exactly seven formerly unlinked units gain one English choice each. Totals:
**2,569 links**, **1,427 direct units**, **1,850 including inherited links**;
grouped-member reporting is 1,401 / 1,824 of 8,445. Counts are access metadata,
not a claim of complete bilingual or specialist review. The expanded daily
pool changes the 2026-11-01 fixture to SN 12.65; its algorithm is unchanged.

Tests cover exact edition ownership, editorial preface boundaries, the held
source, mandatory AN prose scope, invalid paths and review-history safety.
Local and exact-commit CI results are recorded in the completed batch receipt.

The final focused/evaluation suite passed 25 tests, including all 195
non-network evaluation questions (six live questions explicitly skipped).
The complete local check passed 899 tests with one skip and audited all 8,544
canonical texts with zero failures. The installed-package audit read every
canonical text, 47 commentary books and 109 post-canonical books with zero
failures and zero network attempts. Smoke passed 34 tools / 64 checks; the
reference validator reported zero problems. The metadata packet reproduced its
recorded SHA-256 exactly.

Packaged stdio MCP live reading completed with original notice, citation and
scope notes preserved on every continuation page: SN 40.9 3,495 characters
(two pages), SN 22.7 2,690 (one), SN 35.238 5,159 (two), SN 55.24 5,634
(two), AN 4.77 930 (one), AN 3.136 2,029 (one), AN 5.130 1,413 (one).
The full source text was read; no translations were generated or bundled.
Exact-commit CI is recorded in the completed batch receipt.
