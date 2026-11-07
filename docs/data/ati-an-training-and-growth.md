# Ten reviewed AN choices and a refined scope hold (D189)

This batch adds ten first-English choices from the review queue. Shared titles,
PTS pages and adjacent numbers were checked against actual discourse content,
not treated as approval. Canonical source wording, citation boundaries,
commentary and earlier translation choices are unchanged.

## Accepted correspondence

ATI source: [official BCBS mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/an),
commit `45fedca341497120651efa20e756b04a13e61089`.

| Indexed unit / VRI paragraph | ATI reference; PTS | Identity and edition scope |
|---|---|---|
| AN 3.52 / 53 | AN 3.52; A i 156 | Two 120-year-old brahmans, burning-world reply and salvaged-vessel/giving verses. Distinct from the first old-brahman discourse. Setting/greeting framing differs from VRI. |
| AN 3.89 / 90 | **AN 3.88**; A i 235 | Three trainings; discernment defined through four noble truths. No second version's final verse sequence. English expands virtue/jhana formulas abbreviated in VRI. |
| AN 3.90 / 91 | **AN 3.89**; A i 235 | Three trainings; discernment defined through direct release, followed by five training stanzas and flame image. Note and cross-references remain editorial. |
| AN 4.262 / 262 | **AN 4.259**; A ii 252 | Unsuitable/suitable wilderness dwelling contrasted by thoughts and discernment. Bracketed glosses/cross-references are editorial. |
| AN 5.64 / 64 | AN 5.64; A iii 80 | Female disciple's five growth qualities and female lay-disciple verse, unlike neighboring male-disciple AN 5.63. |
| AN 6.102 / 102 | AN 6.102; A iii 443 | Impermanence in formations; six ordered rewards. Distinct from similarly titled not-self version. Fetter Note is editorial. |
| AN 6.104 / 104 | AN 6.104; A iii 444 | Not-self, non-identification, I/my-making, uncommon knowledge and cause/effects. English combines the final two items in one sentence; both are present. Commentary Note is not canonical speech. |
| AN 7.23 / 23 | **AN 7.21**; A iv 21 | Setting and seven ordered monastic no-decline conditions, with repeated conclusion. Bracketed list numbers are editorial labels. |
| AN 7.33 / 33 | **AN 7.32**; A iv 28 | Deity's seven respects ending shame/compunction and two stanzas. ATI specifies three circuits at departure; VRI states circumambulation without counting it. |
| AN 7.51 / 51 | **AN 7.48**; A iv 57 | Four mirrored woman/man bondage and non-bondage sections. English condenses repeated negative lists; VRI abbreviates introduction. |

These are complete named publisher versions with explicit edition differences,
not literal line alignment or generated expansion of Pāli. Publisher “See also”
numbers are preserved as source references, not silently converted into extra
indexed alignments. No single offset is generalized across these cases.

The paired training pages cannot be exchanged merely because both cite A i 235.
Likewise, the female growth text and two Anodhi versions have separately verified
ownership. Regression checks reject wrong-unit selection before fetching.

## Source preservation and rights

VRI commit: `2d134ff9ef60f70a1eb03c9370580228811a3070`. Every block, note and
page marker in these complete source files matches the bundled edition:

| File | SHA-256 |
|---|---|
| `s0402m2.mul.xml` | `41ea7d2199fa1616691e3d358db4d84c69d049b9a7c26ba94688b0d9cae7197a` |
| `s0402m3.mul.xml` | `17841b20862c2c6e52d58fd34d75747fa606cb9d6fc5610eb4e3bba41dede667` |
| `s0403m1.mul.xml` | `92476afb6d3a4a776e60040dfb17c1df73e06be5926a3380d9909b44e68e521d` |
| `s0403m2.mul.xml` | `897920bfe0cebc71ec18a2faab329425b19ba4424d7569ab0c4e10653afb975b` |
| `s0403m3.mul.xml` | `da7f3ae6c21c3414f9f7e9b8c76695d18e1a67feeaa0f60b357badee8ce7beec` |

All ten translations are by Ṭhānissaro Bhikkhu, each with an explicit full
**CC BY-NC 4.0** notice. Copyright years in table order: 1997, 1998, 1998,
2002, 2003, 2004, 2004, 1997, 2012, 1997. Complete HTML, including notices,
and complete root-block hashes are pinned in the
[manifest](../../scripts/canon/reviewed_ati_stories.json). Original notices,
citations and edition notes accompany live reading. No English body is bundled;
existing provider, allowlist and linking rules stay unchanged.

## SN 36.15 remains held for a concrete representation reason

The shorter Nyanaponika edition is still not approved as whole-VRI coverage.
The three VRI treatments all reside inside **one prose segment**, `sn36.15/2`,
preceded only by a heading. The existing partial-scope contract needs a proper
contiguous selection with some other prose outside it. It cannot isolate the
retained inquiry/treatment from absent or condensed repetitions inside one
segment. Relabelling the entire prose segment partial would be misleading and
is rejected by a dedicated test using the actual unit.

This does not condemn the translator's edition or rights. It identifies the
work still needed: precise scope representation or a justified condensed-edition
comparison. Canonical segmentation is not changed just to inflate coverage.
The [ledger](ati-coverage-screen.json) and review packet retain this reason so
the next reviewer need not rediscover the same limitation.

## Counts and verification

Exactly ten previously unlinked units gain one English choice each. Totals:
**2,579 links**, **1,437 direct units**, **1,860 including inherited links**;
grouped-member reporting is 1,411 / 1,834 of 8,445. These are access metadata,
not complete English or specialist review. The daily fixture for 2026-11-01
becomes Iti 39 because the eligible pool grows; its algorithm is unchanged.

Tests cover edition ownership, paired definitions, similar subjects, accurate
scope notes and the actual partial-span limitation. Local/live and exact-commit
CI results are recorded in the completed batch receipt. Main and deployment
remain untouched.

The [queue snapshot](ati-d189-review-summary.json) records 78 pending pages,
including 31 pages with potential direct-English gaps. These remain screening
possibilities, not verified additions. Historical holds remain visible.

Final focused/evaluation checks passed 29 tests, including all 195 non-network
evaluation questions (six live questions explicitly skipped). Full local check:
903 passed, one skipped; corpus audit zero failures across 8,544 texts. The
installed-package audit read all canonical texts, 47 commentary books and
109 post-canonical books with zero failures and zero network attempts.
Smoke passed 34 tools / 64 checks; reference validator zero problems. The
review packet regenerated with its recorded SHA-256 exactly.

Live packaged stdio reading completed all ten sources with original licence,
citation and scope notes: character counts in table order were 1,556; 1,862;
2,698; 813; 649; 640; 694; 1,904; 996; 2,834. Each fit a 3,000-character
request. Focused 1,000-character continuation checks for AN 3.90 and AN 7.51
completed in three pages each, preserving exact identity and prefix guards.
These checks complement source review; they do not establish independent
philological correctness of the translations. Exact-commit CI is recorded
in the completed batch receipt.
