# Reviewed introductions, repetitions and editorial notes (D186)

This batch adds three first-English choices: **SN 9.11, SN 1.3 and SN 12.16**.
It preserves canonical wording, citation boundaries, commentary and earlier
translation choices. No English body is bundled; main and deployment stay
untouched.

## Exact reviewed sources

The official BCBS ATI mirror is pinned to
`45fedca341497120651efa20e756b04a13e61089`. Each page identifies its extent as
complete, but its content and boundaries were reviewed separately:

| Indexed unit | Original publisher page | Identity evidence beyond numbering |
|---|---|---|
| SN 9.11, Akusalavitakkasuttaṃ, VRI 231 | [Ayoniso-manasikara: Inappropriate Attention](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn/sn09/sn09.011.than.html) | PTS S i 203; Kosalan forest monk with three unskillful thoughts; sympathetic deity's ordered advice; monk's final response |
| SN 1.3, Upanīyasuttaṃ, VRI 3 | [Upaneyyam: Doomed](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn/sn01/sn01.003.wlsh.html) | PTS S i 2; deva's recommendation of merit contrasted with Buddha's renunciation/peace reply |
| SN 12.16, Dhammakathikasuttaṃ, VRI 16 | [Dhammakathiko: The Teacher of the Dhamma](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn/sn12/sn12.016.wlsh.html) | PTS S ii 18; teacher, practitioner and liberated distinctions concerning aging-and-death, then dependent origination through ignorance |

Root sources remain VRI commit
`2d134ff9ef60f70a1eb03c9370580228811a3070`. These units belong to the two
complete source files whose blocks, notes and pages were verified against the
bundled edition in the [D185 source review](ati-sn-coverage.md). Their complete
unit scopes and the complete ATI HTML, including rights notices, are pinned in
the [review manifest](../../scripts/canon/reviewed_ati_stories.json).

## SN 1.3's longer introduction is explained, not silently harmonized

The publisher's first footnote explicitly says the longer framing repeats
SN 1.1's opening. That introduction names the setting and luminous deva; VRI
SN 1.3 instead has a brief Savatthi introduction. Its contrasting verse pair
identifies SN 1.3, not SN 1.1's different crossing-the-flood conversation.

The English remains the publisher's complete version, including its original
Notes section. Availability metadata and reading notes explicitly explain the
expanded framing and identify the numbered notes as translator commentary,
not canonical speech. Nothing is copied into the bundled Pāli or presented as
a new canonical segment. This is not line-by-line equivalence between editions.

## SN 12.16 is visibly a version with condensed repetitions

The English gives the three distinctions for aging-and-death, then summarizes
the repeated dependent-origination sequence in brackets. VRI itself abbreviates
but enumerates the intermediate links and states the final ignorance clauses.
The translation is useful as the publisher's whole-discourse version, **not a
fully expanded rendering of every repeated clause**. Its mapping note begins
with this limitation and distinguishes the bracketed summary and numbered
explanatory notes from canonical speech.

Same-named SN 22.115 concerns the aggregates rather than dependent origination.
The new English page belongs only to SN 12.16; both metadata and selection tests
reject its use through SN 22.115 before any fetch. Similarly, SN 1.1 cannot
select SN 1.3's page merely because the publisher reuses its framing.

## Rights, reading and limitations

SN 9.11 is copyright 1999 Ṭhānissaro Bhikkhu, CC BY-NC 4.0. Its editorial
cross-references are distinguished from the discourse.

Both Walshe pages are copyright 1985 Buddhist Publication Society, from
Wheel 318–321, transcribed by arrangement with BPS in 2007. Their explicit
notice permits free distribution with source/derivation acknowledgement and
the complete licence, and limits printed reprints to 50 copies. The reading
responses preserve the full original notice and citation, not merely the
short BPS metadata label. External links in notes retain their own conditions;
linked publications are not fetched as additional canonical content.

Existing live ATI/mirror retrieval and continuation checks remain unchanged.
Build hashes document the reviewed edition; they do not freeze future online
bytes. No source provider, host, numbering heuristic or scope algorithm is
added. Each accepted SN link retains a full root-block hash, so prose context
and all-prose units are protected as well as verse wording.

The [candidate ledger](ati-coverage-screen.json) records this as a separate
D186 follow-up, preserving its historical screen. Other pages, excerpts,
compilations and alternate editions still require individual review. No broad
rule for expanding introductions or repeated clauses is inferred here.

## Dataset effects and validation

Only three previously unlinked units gain one English choice each. Current
coverage is **2,556 links**, **1,414 directly linked units**, **1,837 including
inherited verse links**; grouped-member reporting is 1,388 / 1,811 of 8,445.
These counts do not imply full English or scholarly review of the canon.
The additional daily-eligible suttas change the 2026-11-01 fixture to AN 5.29;
the rotation algorithm is unchanged and deterministic for this data version.

Tests cover source/provenance guards, explicit scope notes, wrong-discourse
selection, preservation of existing choices and editorial/rights handling.
The local focused/evaluation suite passed 18 tests, including all 195
non-network evaluation questions (six live questions explicitly skipped). The
complete check passed 892 tests with one skip and audited all 8,544 canonical
texts with zero failures. The installed-package audit read every canonical
text, all 47 commentary books and all 109 post-canonical books with zero
failures and zero network attempts. Offline smoke passed 34 tools / 64 checks;
the reference validator reported zero problems. That validator does not
replace the individual content/scope review.

The packaged stdio MCP reader returned each live English page completely in
one request: SN 9.11 1,006 characters, SN 1.3 1,795, SN 12.16 1,652. Both
Walshe pages retained their numbered Notes, complete BPS notice and original
citation; scope notes were preserved for all three. Both VRI source XML books
were rechecked against their complete bundled blocks. Exact-commit CI results
are reported in the completed batch receipt.
