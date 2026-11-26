# Four Apadāna citation boundaries

Four neighboring poems had incorrectly placed boundaries. The first included the next poem’s opening, and the following poems started too late. This repair changes the citation index, not the Pāli source words.

| Citation | Correct source blocks, end excluded | VRI stanza labels |
|---|---|---|
| `tha-ap333` | 9767–9789 | 1–6 |
| `tha-ap334` | 9789–9812 | 7–13 |
| `tha-ap335` | 9812–9829 | 14–18 |
| `tha-ap336` | 9829–9890 | 19–37 |

The four corrections are atomic. All 123 original blocks, their notes and page markers remain in their original order. The original XML also supplies the final `ṃ` restored to three titles. The source edition and all four PTS locations, 1.267, are unchanged.

The [independent source review](../evidence/apadana/boundaries333-336/SOURCE_REVIEW.json) checks the pinned VRI XML, complete source-book parity, headings, speaker and closing colophons, neighboring poems and PTS markers. Publisher poem 331 supplies corroborating narrative and chapter evidence only. It is not activated as an English translation. No additional English material is approved: the existing 339 publisher-edition choices and every held source remain unchanged.

## Saved references remain yours

An old number alone cannot safely identify its former passage. Independent review found 50 old segments: 38 numeric references would show different text after correction, six segments move to a different poem, and two old references disappear. Some text remains at the same reference, but that does not prove which citation index a reader used.

The tools therefore require the current source-version pin for every explicit position in these four poems, including position zero. Old or missing pins refuse before replacement text is shown. A separate **Open the whole current text** action begins a fresh read; it does not approve or move any saved reference.

Bookmarks, personal notes, unsaved drafts and local exports keep their original identities and contents. Old notes remain available in Saved and cannot silently attach to a different passage. There is no automatic migration. The [old-to-new source-block map](../evidence/apadana/boundaries333-336/OLD_SEGMENT_SOURCE_NEW_OWNER_MAP.json) is evidence for deliberate review, not a migration instruction. Raw source-book references remain stable because their blocks never moved.

The effective locator version is:

```text
2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera333-336-v1
```

The original VRI commit remains separately reported as provenance. The earlier `tha-ap107/108` repair keeps its existing version. Returned reading, search, quotation, word-study and continuation commands carry the applicable pin. Citation-index JSON and CSV exports include the mapping revision for repaired units; an older export lacking that pin cannot authorize a numeric position.

## Reproduce the repair

Use `scripts/canon/repair_apadana_thera333_spans.py` with distinct canonical input, commentary input, pinned original VRI checkout and new output paths. It checks the exact input snapshot, the complete original XML book and unchanged commentary before modifying the four records. Replaying the corrected state is idempotent. The monthly builder uses the same finite repair before page annotation.

Historical acceptance uses explicit test-only four-record inverses and the exact old compressed-byte fixture. Production readers always use current data. Old checksums and source approvals remain historical evidence; they are not replaced with hashes of the new output.

Installed-reader, browser and exact-commit CI evidence must be recorded for the final candidate. Automated checks do not establish physical-device, human assistive-technology or specialist textual acceptance. The [manual checklist](../qa/manual-device-accessibility-matrix.md) records those separate remaining checks. No deployment or main-branch change is part of this repair.
