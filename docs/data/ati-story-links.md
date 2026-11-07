# Three reviewed ATI story translations

These are links to existing translations, not new translations or English text
bundled with the software. They use the existing Access to Insight provider and
its official mirrors. The source is the BCBS ATI repository at
[`45fedca341497120651efa20e756b04a13e61089`](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089).

| Canonical citation | ATI story reference | ATI verse reference | VRI verses | Translator |
|---|---|---|---|---|
| Pv 5, Tirokuṭṭapetavatthu | Pv 1.5, Tirokudda Kanda | 14–25 | 14–25 | Ṭhānissaro Bhikkhu |
| Vv 16, Sirimāvimānavatthu | Vv 1.16, Sirima | 136–148 | 137–149 | John D. Ireland |
| Vv 35, Pesavatīvimānavatthu | Vv 3.7, Sesavati | 647–658 | 646–657 | John D. Ireland |

These are **whole-story correspondences, not line-by-line alignment**. The
chapter/story position, distinctive identity, ordered content and stanza count
support each mapping. Pv concerns departed relatives and offerings. Sirimā's
opening identifies horses/chariots and later recounts the woman's practice;
Pesavatī concerns a mansion, Magadha/Nālaka and honoring Upatissa. These features
occur within the corresponding root story, not merely adjacent passages. The
source contains 12, 13 and 12 stanzas respectively. Sesavati/Pesavatī is an
explicit edition-name difference, not an inferred correction. Neither offset
may be generalized to another story.

## Rights and attribution

The [Pv page](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn/pv/pv.1.05.than.html)
records CC-BY-NC. Both
[Ireland](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn/vv/vv.1.16.irel.html)
[pages](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn/vv/vv.3.07.irel.html)
contain the actual copyright and free-distribution terms in their F_provenance
section. They permit free electronic redistribution, require source/derivation
acknowledgement and the complete licence, and restrict reprinting to at most 50
copies. Reading results retain that full notice and source citation. This is
not a public-domain or unrestricted-commercial licence. No additional
provider, unapproved mirror or English body was bundled.

## Reproducibility and safety

The [review manifest](../../scripts/canon/reviewed_ati_stories.json) records
source HTML hashes, root-text hashes, both source commits and mapping notes.
The [builder](../../scripts/canon/reviewed_ati_stories.py) verifies complete HTML,
root scope and story identity before modifying the index. Changed source pages
or conflicting links require review. A normal metadata-only initial linker pass
does not apply these reviewed links; the documented final `--content` pass does.

`tests/ati-stories.test.mjs` checks the shipped mappings and root hashes,
edition-note propagation, copyright/citation preservation using synthetic
responses, mirror fallback and fail-closed builder behavior. The positive build
was also run against the actual pinned pages outside the repository.

Runtime ATI pages are live, so a review hash does not promise future bytes are
unchanged or that translations are available offline. Existing continuation
prefix guards remain. These links add three whole-story English choices, not
complete English coverage of either collection: Vv 2/85 and Pv 1/51. All Pāli
text and commentary remain unchanged.

## Validation

The update passed 881 tests (one skipped), 64 offline MCP smoke checks, and all
195 non-network evaluation questions (six live questions skipped). The installed
package returned every page of all 8,544 canonical texts, all 47 commentary
source books and all 109 post-canonical books with zero audit failures and zero
network attempts. The positive builder check used the actual pinned ATI pages;
source-drift, root-scope drift, conflicting-link and idempotence cases use
synthetic offline fixtures.

A separate live reading check retrieved all three pages through the existing
BCBS GitHub mirror with translator, citation, full rights notice and mapping
notes intact. Primary-site access was unavailable from this cloud environment;
that is not evidence the primary site is globally down. Live files can change.
Only the three intended translation-index entries changed. English coverage is
now 2,543 links to 1,403 direct units / 1,826 including inherited chapter links;
the grouped-member reporting view reports 1,377 / 1,800 of 8,445.
