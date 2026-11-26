# Three Apadāna boundary pairs

Three poem openings were assigned to the preceding poem. This repair changes six
citation-index records, preserving every word, variant note and page marker of
the pinned VRI source.

| Citation | Source blocks, end excluded | VRI stanza labels |
|---|---|---|
| `tha-ap340` | 10053–10118 | 90–110 |
| `tha-ap341` | 10118–10174 | 111–128 |
| `tha-ap343` | 10224–10258 | 1–10 |
| `tha-ap344` | 10258–10287 | 11–19 |
| `tha-ap346` | 10310–10324 | 27–30 |
| `tha-ap347` | 10324–10350 | 31–38 |

The original XML supplies the three restored final `ṃ` title characters. PTS
locations, all 61 source books and the other 8,538 complete index records remain
unchanged. No English translation is added: the existing 343 approved
publisher-edition choices and every rights or alignment hold remain intact.

## Existing saved positions need deliberate review

There are 89 old segment positions across these six poems. After the correction,
38 old numeric references would identify different wording, six old references
no longer exist under their former owner, and 45 still identify the same source.
Six source segments move to the following poem. An unversioned number cannot
establish which citation index the reader originally used, even in a case whose
wording stays at the same number.

Every explicit position, including offset zero, therefore requires this exact
effective locator revision:

```text
2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1
```

Missing or stale pins refuse before replacement wording is shown. Opening the
whole current poem starts a new reading. It does not move or approve an old
bookmark, personal note, unsaved draft, highlight or export. Private information
remains local and unchanged. The evidence crosswalk is for deliberate review,
never automatic migration. Raw source-book references remain stable.

The separate VRI source commit still identifies the original edition. Earlier
107/108 and 333–336 locator namespaces are preserved. Search, quotation,
word-study, continuation and citation-export commands retain their applicable
effective pin.

## Evidence and reproduction

Two independent, source-first derivations were sealed before application edits.
They agree on all six complete before/after records, all 178 old/current segment
metadata records, the full source-book tuples and the future canonical logical
SHA256 `0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b`.
The pinned original is VRI commit
`2d134ff9ef60f70a1eb03c9370580228811a3070`, file `romn/s0510m1.mul.xml`,
Git blob `f37368072aece065d2668f93a74c24b423939f1f`.

Use `scripts/canon/repair_apadana_thera340_spans.py` with distinct canonical
input, commentary input, original VRI checkout and new canonical output paths.
The finite repair checks exact original bytes, full-book tuple parity,
commentary ownership, source boundaries and PTS annotations. Mixed or foreign
metadata refuses. Replaying the exact corrected state is idempotent. Historical
acceptance uses explicit test-only inverses and exact old compressed fixtures;
production always reads the current data.

The Book 37 transport recovery is a separate source-only investigation. The
original pinned raw XML is now verified, but preliminary structural leads do
not authorize any further repairs or translations.

Installed, browser and exact-commit CI evidence determines integration status.
Automated browser testing does not establish physical-device or human
assistive-technology acceptance. Main and production are outside this release.

## Completed local acceptance

The complete local check covered 2,010 tests: 1,755 passes, 255 explicitly optional
source-fixture skips and zero failures. The separately mandatory source-enabled
gate passed all 23 cases with zero skips, including all 13 inner original-source
and migration cases. The full corpus audit checked 8,544 records with zero
problems. The source/history closure also passed 28 checks without skips.

The genuine offline-installed package has 39 archive members and 34 runtime
files, all identical to reviewed application commit
`d2462e46b1a7b5cb2a1085d9bcffd25b7576c8b6`. Exactly seven runtime files differ
from C1; all 27 others are byte-exact. Parallels differ only in the canonical
input checksum. Rebuilding the server during the complete check preserved the
reviewed runtime bytes.

The installed Chromium acceptance completed 15 check families in 312.917 seconds:
712 old-position refusals, all 89 current segments, nine source-book pages, both
widget resources, both embedded bridges at 390/1280 widths, and both native
entrypoints at those widths. Twelve synthetic old bookmarks per native cell keep
their notes, positions and source stamps through explicit reopening, export and
restore. Fresh saves, stopped responses and competing-tab drafts are additionally
checked at 390 width for both entrypoints. No outside-source request occurred;
the owned HTTP process group was reaped and verified absent.

Earlier harness failures remain recorded. They concerned requesting a field from
the wrong API and comparing bookmark JSON object-key order. The final checks
preserve exact field values, array order and raw export bytes. A separate static
review also caught the word-analysis endpoint's narrower segment schema before
execution. None was treated as a passing run or fixed by changing source text.

See [local receipts](../evidence/apadana/boundaries340-347/acceptance/FULL_CHECK_RECEIPT.json)
and the [executed installed-browser evidence](../evidence/apadana/boundaries340-347/installed-browser/REPORT.json).
Remote candidate CI and safe dev integration are distinct final gates; the final
release receipt and exact GitHub commit checks determine their outcome.
