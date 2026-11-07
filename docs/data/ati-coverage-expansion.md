# Reviewed ATI coverage expansion (D182)

This batch builds on the [first three reviewed links](ati-story-links.md). It
adds **four genuinely new selectable links**, covering three canonical units.
Two units previously had no whole-text English choice in the bundled index.
This is additional access to existing translations, not new translated content.

| Canonical unit | Existing English before batch | New translator/version | Source's verse reference | VRI verses |
|---|---|---|---|---|
| Thig 5.11, thirty nuns | None | Ṭhānissaro Bhikkhu | Thig 117–121 | 117–121 |
| Thig 5.11, thirty nuns | None | Hellmuth Hecker & Sister Khema | Thig 117–121 | 117–121 |
| Thag 19.1, Tālapuṭa | None | Bhikkhu Khantipalo | Thag 1091–1145 | 1094–1148 |
| Snp 2.6, Dhammacariya/Kapila | Ṭhānissaro, dhammatalks.org | John D. Ireland | Sn 274–283 | 276–285 |

## Why these mappings are supported

- **Thirty nuns:** both pages identify Thig 5.11 and verses 117–121. The VRI
  heading names the thirty nuns and its closing attribution identifies Paṭācārā.
  The sequence runs from threshing grain and supporting a family through washing
  feet, practice during the night and the nuns' reply. Both translations cover
  that sequence. The source's author/derivation information is preserved.
- **Tālapuṭa:** the source identifies Thag 19 and presents numbered English
  stanzas 1–55. The VRI chapter has one named 55-stanza poem, beginning with
  dwelling alone in mountain caves and ending in a reflection on the mind's
  desires. The two number ranges differ by three; no offset was generalized to
  other poems. Chapter headings/recap are paratext, not additional translated poems.
- **Dhammacariya:** the source names Sn 2.6 and Dhammacariya. The VRI heading is
  Dhammacariyasuttaṃ; the index also records Kapila. The ten-verse discourse runs
  from conduct/the holy life through quarrelsome monks, impurity, exclusion of
  corrupt conduct and united practice ending suffering. Ireland renders this
  in prose with notes. It is not word-for-word or line-by-line alignment.

These are whole-poem/discourse correspondences. Their explicit mapping notes are
shown in metadata, translation choices and reading results. Neither translation
availability nor these links certify a bilingual scholarly edition.

## Rights, source and provenance

All pages are from the [official BCBS ATI mirror](https://github.com/bcbsit/ati)
at `45fedca341497120651efa20e756b04a13e61089`, using the existing supported
provider. Exact HTML/root hashes are in the
[review manifest](../../scripts/canon/reviewed_ati_stories.json).

Ṭhānissaro's page records CC-BY-NC 4.0. The other three page-specific BPS notices
allow free electronic redistribution, require acknowledgement and the complete
licence, and limit reprints to 50 copies. Their publications are *Buddhist Women
at the Time of the Buddha* (Hecker, English from German by Sister Khema; copyright
1982 BPS), *Forest Meditations* (Khantipalo; copyright 1983 BPS), and *The Discourse
Collection* (Ireland; copyright 1983 BPS). The reader preserves the original
notice/citation; no English body was bundled and no commercial rights inferred.

The builder verifies the complete source HTML, title, verse scope and root
wording before acceptance. It now supports multiple accepted ATI translators
for the same unit, idempotently. Different unreviewed ATI pages remain a hard
conflict, not an invitation to overwrite an existing choice.

## Remaining candidates and blockers

The [114-page metadata screen](ati-coverage-screen.json) is pinned to the baseline
and distinguishes the four accepted pages from intros, excerpts, scope concerns
and not-yet-reviewed pages. It is a candidate list, not verified coverage.

- ATI Yasoja (`thag.03.08.than`) must not be attached by number. Its three stanzas
  correspond by title to indexed `thag3.9`, which currently starts after the
  opening stanza; the preceding `thag3.8` contains it. A complete comparison of
  `s0508m.mul.xml` at the pinned VRI commit matched the bundled source. Its Yasoja
  heading is block 1227, verse 243 begins at 1228, but the indexed unit starts at
  1231. XML SHA-256: `30a3a7daaf5724e1b3eee155c37427354560c3bfb92e5ae16ac5b7b6ce1255b7`. This needs a separately
  source-verified boundary repair before a whole-unit English link is safe.
- The Vaṅgīsa page includes contextual introductions and several poems; complete
  scope and noncanonical material need a separate review.
- Excerpts/abridgments need the existing partial/shared-source contracts, not
  blanket whole-unit links. Intros are not individual canonical texts.
- Other providers were not bypassed when the environment or source conditions
  prevented assessment. The established ABT and other-language reviews retain
  their recorded scope, rights and human-review gates.

Only the three intended unit entries changed in the translation index. The Pāli,
commentary, canonical IDs, source-book coverage and prior three ATI story links
are preserved. Main and hosted deployments are outside this branch update.

## Validation of the coherent batch

- The full local suite passed 882 tests, with one skipped; the final ownership
  guard also passed its fresh five-case focused suite. Exact-commit remote CI
  results are checked separately, not inferred from retained local results.
- The ordinary build, 64 offline MCP smoke checks and all 195 non-network
  evaluation questions passed (six live evaluation questions skipped).
- The installed package audit read all 8,544 canonical units, all 47 commentary
  source books and all 109 post-canonical books: zero failures/network attempts.
- All four new versions were read through the actual bundled stdio MCP server
  using the supported official mirror. Thag 19.1 continued through four pages;
  the other three completed in one. Each retained its licence, attribution and
  edition note. The test outputs 852, 879, 10,416 and 1,447 characters respectively,
  not reconstructed text. Primary-site availability is not established here.
- The pinned Tālapuṭa HTML explicitly lists every English stanza 1–55 in order.
  Reapplying the reviewed builder is byte-idempotent. Index-delta checks found
  exactly four added links in the three intended entries, with the D181 entries
  unchanged. No Pāli/commentary data changed.

Totals after this batch: 2,547 whole-unit links; 1,405 directly covered units and
1,828 including inherited chapter links. Grouped-member reporting gives 1,379 /
1,802 of 8,445. These are indexed link counts, not offline English availability,
full corpus translation or independent bilingual certification. Main and
production remain untouched.
