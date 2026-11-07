# Yasoja boundary repair and two complete ATI poem links (D183)

## Source-verified Pāli repair

At baseline `43e32f936a9d611ce18b1d89a6c72cd7b3c72b48`, the index placed the
first Yasoja stanza at the end of Vassika. The complete
[`s0508m.mul.xml`](https://github.com/VipassanaTech/tipitaka-xml/blob/2d134ff9ef60f70a1eb03c9370580228811a3070/romn/s0508m.mul.xml)
was compared with every bundled block, note and page marker. They matched.

The unique Yasoja heading is block 1227. Verse 243 starts at 1228; the old
citation started at 1231, at verse 244. The corrected common boundary is 1227:

| Indexed citation | Before | After |
|---|---|---|
| Thag 3.8, Vassika | 240–243, including Yasoja's first stanza | 240–242 |
| Thag 3.9, Yasoja | 244–245 | 243–245 |

No wording, citation identity or other unit changed. Commentary remains
unchanged: there is no already-accepted alignment for verse 243, so it was not
invented. Source-preservation facts and the XML hash are in the
[repair receipt](yasoja-boundary-repair.json). The builder prevents recurrence
with exact-title, adjacency, following-heading and three-verse-scope checks.
The repair CLI checks complete pinned source files, respects the existing root
numbering segments, and reannotates changed units only.

## Newly accessible English choices

| Indexed unit | ATI reference | Translator | Source verse labels | VRI verses |
|---|---|---|---|---|
| Thag 3.9, Yasoja | Thag 3.8 | Ṭhānissaro Bhikkhu | 243–245 | 243–245 |
| Thag 21.1, Vaṅgīsa | Thag 21 | John D. Ireland | 1209–1279 | 1218–1288 |

Both units previously had no indexed whole-poem English choice. These are **two
new user-accessible links**, not translations we created. They cover 3 and 71
numbered poem stanzas respectively; title/colophon/recap paratext is not claimed
as a separately translated work. Both links carry explicit edition notes and
are independently selected by exact translation ID. The Yasoja page must not be
attached to indexed Thag 3.8 merely because ATI uses that number.

Yasoja's three-stanza sequence is distinctive: moderation, endurance in the
forest and solitude. The corrected root now includes the complete sequence.
The original ATI numbering is retained in provenance alongside the index ID.

## Why the Vaṅgīsa page is complete rather than inferred complete

The pinned page contains 70 numeric anchors. Its 1235–36 label explicitly covers
two verses. Expanding that one range gives **every number 1209 through 1279,
exactly once and in order**. The builder now checks that sequence and rejects
gaps, repeated markers and reordering. It does not invent verse 1236 from a
missing anchor.

The VRI unit contains all 71 numbered stanzas, 1218–1288. The named complete
work, opening/closing sequence and internal episodes support whole-work
correspondence. For example, the departure, giving up discontent, invitation
ceremony and final homage appear in the same order. This is not a claim of
line-by-line translation alignment based on a +9 rule.

The publisher's section headings jump from XII to XIV. That heading-number
issue does not remove a numbered verse; it is preserved rather than repaired.
Poem headings and external note links remain the publisher's material, not
newly authored commentary. The reader does not fetch the linked publication's
footnotes as additional text.

## Rights, provenance and limits

Both pages are from the
[official BCBS ATI mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn/thag),
commit `45fedca341497120651efa20e756b04a13e61089`. Yasoja records CC-BY-NC 4.0.
Vaṅgīsa is copyright 1997 John D. Ireland, from BPS Wheel 417/418. Its explicit
notice permits free electronic redistribution with source/derivation
acknowledgement and the complete licence, and limits reprints to 50 copies.
Those notices and citations remain in reading results. No English bodies,
external notes or new providers were bundled.

The [review manifest](../../scripts/canon/reviewed_ati_stories.json) pins complete
source HTML and root hashes. The builder rejects changed HTML, root scope,
identity or conflicting ownership. This is a build review, not an immutable
runtime edition: the existing ATI reader still fetches live supported sources
and checks continuation prefixes. Existing versions and other providers are
preserved. Native-client/scholarly review and unavailable translations elsewhere
remain outside this batch. Main and deployment were not changed.

## Continuation ledger

The [114-page baseline screen](ati-coverage-screen.json) is retained with a D183
follow-up, rather than relabelling its original unreviewed pages as accepted.
The prior Yasoja and Vaṅgīsa blockers are resolved only for these precise links.
Remaining excerpts require reviewed partial scopes; intros are not individual
canonical texts. Other candidate pages remain individually unreviewed.

Saved segment offsets for the two repaired citations should be restarted. This
changes the citation index, not the publisher's source commit; an old offset is
not a stable promise across a boundary correction.

## Validation

- Full suite: 886 passed, one skipped; final narrow boundary/ownership checks
  also passed their fresh 13-test suite. Exact-commit remote CI is checked
  separately from retained local evidence.
- Ordinary build, audit of 8,544 texts (zero failures), 64 offline smoke checks
  and 195 non-network evaluation questions passed; six live questions skipped.
- Installed-package corpus audit: every page of 8,544 canonical units, 47
  commentary source books and 109 post-canonical books; zero failures and zero
  network attempts.
- Actual bundled stdio MCP reading: Yasoja completed in one page (392
  characters); Vaṅgīsa completed in five pages (12,483 characters). Both used
  supported live source/mirror retrieval and retained attribution, licence and
  mapping notes. This is not a signed-in graphical-client or scholarly review.
- Full official ATI reference-index validator: zero problems. That validator
  does not itself establish the new poem correspondences; their individual
  source evidence and dedicated regression tests do.
- Source preservation: only `thag3.8` and `thag3.9` changed in the canon units;
  every source block and the complete commentary data stayed unchanged.
  Reapplying the source repair made no changes. Derived parallels were rebuilt.
- Translation-index delta: exactly two new entries; the prior seven reviewed
  source versions are unchanged. English bodies are not bundled.

Current link counts: 2,549 versions across 1,407 directly linked units, 1,830
including inherited chapter links; the grouped-member view reports 1,381 /
1,804 of 8,445. These are link counts, not complete English or bilingual review.
