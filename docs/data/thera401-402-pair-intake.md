# Publisher401/402: two finite English choices

This candidate adds publisher401, Tissametteyya, as `tha-ap403`, and publisher402,
Puṇṇaka, as `tha-ap404`. The metadata builder reports **382 choices**:40 Therī
and342 Therā. All380 preceding profile/link objects remain exact and in their
original order. The measured local index has2,965 whole-unit English links,
with1,861 texts directly covered and2,284 including inherited links. These CLI
counts are not a new public MCP coverage measurement.

The published [source-preparation kit](../../source-preparation/thera401-402/README.md)
is source evidence, not an activation or release receipt. Its producer was
rerun against both original raw files, six rights/routing files and the original
VRI XML before this implementation. Source revision remains
`fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`; VRI revision remains
`2d134ff9ef60f70a1eb03c9370580228811a3070`.

## Exact ownership and edition differences

- Publisher401 has28 physical stanzas and19 notes. Its ten original speaker
  prefixes stay in their five-line body paragraphs, with their original newline.
  The unnoted chapter41 heading remains separate publisher paratext; notes1–2
  belong to the poem heading. No synthetic preface or note owner is introduced.
- Publisher402 has15 physical stanza paragraphs representing16 printed
  stanzas, and17 notes. Local4–5/global3922–3923 remains one eight-line paragraph
  with one terminal range suffix. The full publisher attainment refrains remain
  independent of the shorter VRI peyyāla; neither edition supplies missing words
  for the other.
- In total the sources have49 body paragraphs,36 notes,43 physical quotation
  entries,44 printed stanzas and16 hard500-UTF16 pages. Six finite c/ch display
  pairs belong only to their original notes:401note7,402notes4,6 and17. All note
  wording, including note6’s mixed punctuation and interpretation, stays intact.
- Publisher-number holds391,392,393,403,404,405,408,409,410 remain inactive.
  Publisher403/404 are different sources from the approved canonical IDs403/404.
  Other prepared sources and the wider chapter are outside this activation.

The specific Jonathan S. Walters/Whitman College translation grant is
**CC BY-NC-SA4.0**. Attribution, original notices, source/revision, disclaimer and
extraction/change notices remain mandatory. Generic site CC-BY metadata does
not broaden that grant. No commercial, media or publisher-endorsement permission
is inferred. Bundles contain metadata and hashes, never these English bodies,
notes, speaker text or publisher paratext.

## Implementation and validation

`src/apadana-thera401-402-profiles.mjs` adds only the two literal source profiles.
The existing parser receives their finite mixed-heading/note-owner entries and
the chapter41 paratext owner. Its stanza grammar is unchanged: the original
five-line and eight-line layouts already fit it. Both reader policies explicitly
include the new IDs in paratext and complete-body hash guards. The widget advances
fromv49 tov50 because its embedded catalogue changes.

The metadata-only builder validated all382 poems, rights artifacts and complete
Pāli root pins from the fixed local publisher checkout. Two source-enabled
regression cases passed with no skips: per-paragraph/note/quotation source parity,
all380 earlier objects and holds, pagination and continuation guards, public
English retrieval, citation verification, edition switching, both widget host
paths and refusal of changed body/notes/paratext/notices/licence. Their expectations
come from the independently published hash-sealed source kit, not API output.

The canonical books and records, corrected389/390 locators, accepted citations,
other translation choices and private study formats are unchanged. A separate
current382 source/runtime adapter must validate actual382 data; an old380 runtime
result must never substitute for it. Source/API checks do not establish a browser,
installed package, physical-device or human assistive-technology result.

Root-owned package/build, source closure, normal/a11y/installed browser and exact
candidate CI checks remain required before dev integration. This document makes
no main, production, deployment or publication claim.
