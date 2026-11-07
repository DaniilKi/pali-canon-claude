# Six reviewed SN links and a reusable review queue (D187)

This batch gives **six previously unlinked canonical units** their first
English choices. It also reduces repeated discovery with an offline review
packet. No source wording, canonical boundaries, commentary or earlier
translation choices change. Main and deployment remain untouched.

## Individually accepted links

All ATI pages are from the [official BCBS mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn),
commit `45fedca341497120651efa20e756b04a13e61089`. Each identifies its extent
as complete; content and scope were reviewed separately.

| Unit / VRI paragraph | Page | Independent identity and scope evidence |
|---|---|---|
| SN 7.21 / 207 | `sn07.021.wlsh` | PTS S i 182; Ananda's invitation, brahman's twice-daily water purification, lake/ford verse, lay refuge ending. Travel/greeting details are condensed; bracketed stage directions, SN 7.1 cross-reference and numbered Note are editorial. |
| SN 22.109 / 109 | `sn22.109.wlsh` | PTS S iii 160; five aspects of clinging aggregates and stream-entry assurance. English lists aggregates VRI abbreviates; bracketed setup and Note remain editorial. |
| SN 22.110 / 110 | `sn22.110.wlsh` | PTS S iii 161; release without clinging and completed-arahant formula. Opening explicitly refers to SN 22.109. It is an abbreviated publisher version, not a silently expanded standalone opening. |
| SN 22.121 / 121 | `sn22.121.than` | PTS S iii 167; five clingable aggregates paired with desire-passion. English spells out repetitions abbreviated in VRI. |
| SN 25.5 / 306 | `sn25.005.than` | PTS S iii 226; feelings born of six contacts. English states attainment formulas abbreviated in VRI; the complete stock sequence was checked in VRI SN 25.1. Editorial links remain separate. |
| SN 47.35 / 401 | `sn47.035.than` | PTS S v 180; four mindfulness domains followed by feelings, thoughts and perceptions known as arising, persisting and ending. Repeated instruction bounds the discourse. |

The paired aggregate discourses must not exchange translation pages. The
stream-enterer conclusion differs from the completed-arahant conclusion,
despite shared analysis and overlapping PTS pages. Tests reject cross-selection
and refuse the new arahant page through SN 1.25 before fetching. The reader
never splices SN 22.109 into SN 22.110 automatically.

VRI's abbreviation marks stay untouched. Whole-discourse correspondence here
means the named publisher's version, with its disclosed conventions; it does
not assert literal line equivalence or reconstruct abbreviated Pāli.

## Root source preservation and rights

Pinned VRI commit: `2d134ff9ef60f70a1eb03c9370580228811a3070`.
Complete XML books were compared against every bundled block, note and page:

| File | SHA-256 |
|---|---|
| `s0301m.mul.xml` | `2a4a21596a0eda19c74fc2dedaaaccf262bf1776c09b3043d654a9f1c676411b` |
| `s0303m.mul.xml` | `ab96b1c89578c607a73f3bc931dff1315b1427815ce94b2ea1929583152f5a2a` |
| `s0305m.mul.xml` | `95300f79a48558b66d54e5e0913b526aeda2be88cc3f3f3fd44542419fbebb78` |

The three Walshe pages are copyright 1985 BPS, Wheel 318–321. Their explicit
licence requires free distribution, source/derivation acknowledgement and the
complete notice, with a 50-copy print limit. The three Thanissaro pages are
CC BY-NC 4.0, copyright 1997, 2004 and 2012 respectively. Full original notices
and citations accompany live reading; no English bodies are bundled. Complete
HTML and root-block hashes pin each reviewed source scope in the
[manifest](../../scripts/canon/reviewed_ati_stories.json).

## A faster workflow with the same approval standard

The [read-only packet tool](../../scripts/canon/ati_review_packet.py) reads the
existing source checkout and ledger. It requires a clean checkout at the
reviewed commit and revalidates accepted manifest records. It emits metadata,
source hashes, publisher extent/licence labels, notice-container indicators,
all PTS-overlapping possible units and their current English availability.
It never copies English bodies, contacts a source, changes the index or approves
a candidate. Missing sources, invalid provenance and escaping/duplicate paths
fail rather than producing a complete-looking partial report.

[Commands](../../scripts/canon/README.md) regenerate the packet. After this
batch the original 114-page screen has **95 pending pages**: 78 label themselves
complete and 17 excerpt. **48 pages** overlap at least one unit without direct
English. These are screening possibilities, not 48 verified translations:
PTS overlap may be ambiguous; even a complete page can be an introduction or
compilation. Notice presence does not establish permission. Review identity,
full boundaries, edition/editorial scope and actual rights individually.

This is the strongest immediate scaling improvement: reuse the official cached
source and remove repetitive discovery. A new provider could eventually expand
coverage further, but would still require access, scope, rights and integration
review. No new provider or forbidden source is used here, and no heuristic is
weakened to inflate coverage. The human/scholarly judgement remains the scarce
step. Source hashes describe build review, not immutable future network bytes.

The [packet summary and input hashes](ati-review-packet-summary.json) record
this reproducible screening result without copying the source text.
The [ledger](ati-coverage-screen.json) preserves its historical screen and adds
a D187 follow-up. SN 40.9 was inspected but not accepted: its summary of earlier
concentration discourses and extensive explanatory Notes need a dedicated scope
review. Excerpts, compilations and alternate editions remain individual work.

## Counts and validation

Exactly six units gain one English link each; every earlier translation record
is retained. Totals are **2,562 links**, **1,420 direct units**, **1,843 including
inherited verse links**; grouped-member reporting is 1,394 / 1,817 of 8,445.
No claim of complete English or specialist review is made. Adding eligible
suttas changes the 2026-11-01 daily fixture to AN 3.66; its algorithm is unchanged.

Regression tests cover paired identity, edition cautions, no silent page
splicing and packet safety: ambiguous PTS candidates stay unapproved, rights
indicators stay provisional, bodies are excluded, and stale/missing/escaping
inputs fail. Full local and exact-commit CI results accompany the batch receipt.

Live packaged stdio MCP readings completed each source in one request: SN 7.21
1,624 characters; SN 22.109 725; SN 22.110 592; SN 22.121 830; SN 25.5 1,456;
SN 47.35 884. Original notices, citations and mapping notes were preserved.
The final focused/evaluation suite passed 22 tests, including all 195
non-network evaluation questions (six live questions explicitly skipped).

Final complete local check: 896 tests passed, one skipped; audit of all 8,544
canonical texts reported zero failures. The installed-package audit read all
canonical texts, 47 commentary source books and 109 post-canonical books with
zero failures and zero network attempts. Offline smoke passed 34 tools / 64
checks; the reference validator reported zero problems. Regenerating the
metadata-only packet reproduced its SHA-256 exactly. These checks complement,
rather than replace, individual source/rights review. Exact-commit CI is
reported in the completed batch receipt.
