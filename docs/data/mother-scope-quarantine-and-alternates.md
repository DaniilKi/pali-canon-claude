# Correct the Mother binding and add three alternate editions (D194)

This is a correctness batch, not first-English expansion. It withholds one
mis-scoped ordinary link and adds three independently reviewed alternatives.
Pāli text, boundaries and the existing first choices on the three alternate
units are unchanged. Main and deployment remain untouched.

## Exact-source finding: current dhammatalks Mother

On 2026-11-08 the [official publisher page](https://www.dhammatalks.org/suttas/SN/SN15_14.html)
was inspected through supported web access. Its heading explicitly spans
SN 15.14–19, and its complete short body covers six family relationships using
ellipses and a common introduction/conclusion. This is direct source evidence,
not an assumption that the earlier ATI page and current dhammatalks wording
are identical. The web observation is not represented as a full-HTML or exact
extracted-English hash.

The index previously attached this source only to SN 15.14 as an ordinary
whole-unit translation. English words from another member could therefore be
read or matched as individually aligned to SN 15.14. The active link is now
withheld; canonical SN 15.14 and all six root units remain available unchanged.
This removes **one** counted link/text, not six: the other five never owned it.
No replacement scoped link is activated until source-specific evidence and all
shared-page consumer safeguards are satisfied.

[Reviewed exclusion](../../scripts/canon/reviewed_exclusions.json) preserves the
publisher URL, observation, six subject IDs, root commit and complete root-block
hash. The [build guard](../../scripts/canon/reviewed_exclusions.py) runs after
**all** linking passes, with or without `--content`. It withholds the known URL
across owners and common URL spellings. Merely adding a partial/shared field
cannot bypass it. Invalid or missing exclusion configuration fails the build;
valid input is not mutated, and the operation is idempotent. Future reviewed
shared integration must deliberately retire the hold. This guard cannot grant
retrieval permission and remains conservative across later canonical refreshes.

Tests prove canonical text remains, English availability is absent, source-URL
resolution and exact-version quotation selection reject before retrieval, the
ordinary builder cannot restore the link, and a control source survives. The
six related root blocks are pinned independently. No original English or Pāli
is silently edited to make the index look more complete.

## Three source-reviewed alternatives

| Indexed unit / original first choice | New ATI choice | Scope and rights |
|---|---|---|
| SN 1.71 / dhammatalks | Ghatva: Having Killed, SN 1.71; S i 41 | Complete anger question/reply, honeyed crest and poisonous root; Sāvatthī setting formula omitted, speaker label editorial. ©1999 Ṭhānissaro, full CC BY-NC 4.0. |
| SN 17.5 / Ṭhānissaro ATI | Piḷhika: The Dung Beetle, SN 17.5; S ii 228, Maurice O’Connell Walshe | Analogy, boast, four requisites, harm and training conclusion match. VRI abbreviates framing that English supplies. Two interpretive Notes are editorial. ©1985 BPS, ATI transcription ©2007; **not CC**. |
| AN 7.54 / dhammatalks | Avyakata: Undeclared, **AN 7.51**; A iv 67 | Four positions and both view/anguish analyses match. Final VRI causal restatement repeats the opening and already supplied explanation; ATI omits it. This loses no new assertion, unlike AN 2.47’s absent foremost-assembly statement. Publisher phrase omits “exist”; preserve source wording with caution. Two Notes/editorial cross-references remain separate. ©2004 Ṭhānissaro, full CC BY-NC 4.0. |

Walshe's complete notice permits free distribution/reformatting, requires
source acknowledgment for derivatives and the **entire notice**, and limits
printed reprints to **50 copies**. It identifies transcription by arrangement
with BPS. All these terms accompany retrieval; a generic CC label would be wrong.

The [whole-version manifest](../../scripts/canon/reviewed_ati_stories.json) pins
complete HTML and complete root blocks at ATI
`45fedca341497120651efa20e756b04a13e61089` and VRI
`2d134ff9ef60f70a1eb03c9370580228811a3070`. Complete parsed books
`s0301m.mul.xml`, `s0302m.mul.xml` and `s0403m3.mul.xml` match bundled wording,
notes and page markers. No English body is bundled. Original first-choice
metadata is preserved byte-for-byte on all three units.

## Additional hold and exact totals

Walshe's **ATI SN 1.25** is not approved as an ordinary whole-unit choice: its
initial VRI question/answer are absent, and later conceit questions/replies are
condensed/reordered. Commentary/emendation Notes do not restore canonical scope.
Existing dhammatalks SN 1.25 remains. Earlier Luminous/Mother ATI compilations,
SN 36.15 and ATI AN 2.46 remain held. Neither shared-page nor single-unit
condensed capability is newly activated.

Three alternates added, one old binding withheld: **net +2 links**, **zero newly
English-covered texts**, **one falsely counted whole-unit owner removed**.
Totals are **2,596 links**, **1,450 directly linked texts**, **1,873 including
inherited links**. Grouped-member reporting: **1,424 / 1,847**. Source totals:
1,275 dhammatalks, 1,168 ATI, 153 Ānandajoti. The revised screening queue has
**60 pending pages / 13 potential direct-English gaps**. The three accepted
pages had misleading PTS-neighbor gap clues; none was actually first-English.

The eligible-pool correction changes the 2026-11-01 daily fixture to **MN 28**;
the selection algorithm is unchanged. Focused tests passed 34/34. All three live
alternate readings preserved exact ID, attribution, notice and mapping notes:
432; 2,755; 4,851 characters, with the last completing in two requests at limit
3,000 with continuation guards. Full local/CI outcomes accompany the completed
batch receipt. Reviews establish mapping/scope, not every translation decision.

The full local check passed **920 tests**, with one existing skip. Its complete
8,544-text audit reported zero failures. Smoke passed 34 tools/64 checks, and
the regenerated review packet reproduced its recorded SHA-256. Independent
implementation review found no blocking issues and separately passed all four
exclusion regressions. No surviving entry changed besides the three additions.
