# First English questions from the Milindapañha

Reviewed 19 November 2026 against dev `7ec5da4`. This adds John Kelly’s
published English for **14 individual questions**, previously without any
indexed English choice. It does not translate the whole Milindapañha.

## Scope and source evidence

The source curator and a separate reviewer read both complete publisher pages,
all 14 complete indexed Pāli roots and adjacent controls. Each selected question
contains its substantive exchange, examples and conclusion. Pāli headings and
ordinal colophons are not translated. The final question of chapter 3 also has
untranslated chapter/count paratext. Wisdom compresses a repeated closing
illumination label without omitting another proposition. These are disclosed
limits, not a word-by-word alignment claim.

Wisdom is publisher **II.1.14**, indexed **Mil 3.1.15**. The Contact link in the
publisher’s contents points to a different question; extraction follows the
verified **body** anchor. Feeling’s actual anchor has an unpadded `9`. Neither
is corrected by inventing an anchor or trusting numbers alone.

| Indexed question | Publisher source | Translator notes |
|---|---|---:|
| `mil3.1.8` | [Characteristics of Attention and Wisdom {Miln 32-33}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-1-08) | 0 |
| `mil3.1.15` | [Characteristic of Wisdom {Miln 39}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-1-14) | 0 |
| `mil3.3.8` | [Characteristic of Contact {Miln 60}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-08) | 0 |
| `mil3.3.9` | [Characteristic of Feeling {Miln 60}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-9) | 0 |
| `mil3.3.10` | [Characteristic of Perception {Miln 61}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-10) | 0 |
| `mil3.3.11` | [Characteristic of Volition {Miln 61}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-11) | 0 |
| `mil3.3.12` | [Characteristic of Consciousness {Miln 62}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-12) | 0 |
| `mil3.3.13` | [Characteristic of Applied Thought {Miln 62}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-13) | 0 |
| `mil3.3.14` | [Characteristic of Sustained Thought {Miln 62}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-14) | 0 |
| `mil3.5.5` | [Transmigration and Rebirth {Miln 71}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.3x.kell.html#miln-3-5-05) | 2 |
| `mil3.5.6` | [Soul {Miln 71}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.3x.kell.html#miln-3-5-06) | 1 |
| `mil3.5.7` | [Non-Release From Evil Deeds {Miln 72}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.3x.kell.html#miln-3-5-07) | 0 |
| `mil3.7.5` | [Simultaneous Arising in Different Places {Miln 82-83}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.3x.kell.html#miln-3-7-05) | 1 |
| `mil3.7.8` | [Doing Evil Knowingly and Unknowingly {Miln 84}](https://www.accesstoinsight.org/tipitaka/kn/miln/miln.3x.kell.html#miln-3-7-08) | 0 |

The two official ATI files are pinned at
[`bcbsit/ati` commit `45fedca`](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn/miln).
Exact raw-file, selected-body, complete-notice, translator-note and root hashes
are recorded in [the metadata evidence](milinda-reviewed-questions.json).
Canonical wording and citation locations remain unchanged.

## Permission and attribution

Both notices are **©2005 John Kelly**, transcribed from a file supplied by the
translator and last revised for ATI on 30 November 2013. They explicitly allow
copying, reformatting and redistribution in any medium when copies remain free
of charge, derivatives identify this source, and the **complete notice** is
included. This is **not a Creative Commons licence**. The returned translation
keeps the full individual notice and citation; the selected-question extraction
is identified as derived from that publisher document. All four original
translator notes remain separately labelled as notes, including Soul’s note
attached to its heading. No English body is bundled with this software.

This satisfies the project’s five source tests: an established publisher and
named translator, explicit reuse permission, no opt-out found in these
artifacts, durable official versioned files, and independently checked exact
boundaries. It does not clear any other source hold.

## Implementation and validation

The finite whole-question registry is separate from consent-scoped excerpts and
shared pages. An ordinary read selects one approved question; it never returns
the whole anthology as though it were that question. The two anthology page
paths cannot be reassigned to ordinary whole-page links. Real question anchors
identify versions; an unanchored anthology URL cannot resolve to whichever
question happened to be indexed last. Text, notes, notice, structure and complete
root pins fail closed on drift. Existing translations and all 21 partial-source
descriptors must remain intact.

Ordinary whole-page metadata screening excludes a question extraction only after
validating its exact finite registry, source binding and complete root. A review-
like match label cannot bypass triage. The two questions with PTS page ranges
are not reclassified as unreviewed whole-page mappings; the earlier screening
queue and frozen review memories stay unchanged.

Local validation passed: **1,311 tests, 1,307 passed, zero failed, four skipped**;
the canonical audit checked all **8,544** records with zero problems. The skips
are an unreachable live quotation, two optional older source checkouts, and an
unavailable exact historical implementation checkout; frozen descriptor hashes
remain enforced. Actual Milinda source checks were enabled and passed.

The new browser checks passed44 normal,74 accessibility and44 isolated-package
checks. The accessibility mode ran80 scans with zero violations; both390px and
1280px layouts were tested, including all14 question choices, translator notes,
continuation, notices and a synthetic private-draft/export control. The existing
173-check reader journey passed, as did34-tool/64-check smoke,195 offline
evaluation questions and19 documentation/export checks. These source journeys
use immutable official artifacts through test-only local provider transport;
they do not establish current publisher availability. No English body is bundled.

Integration advances only after independent implementation review and successful
CI on the exact candidate commit. Inspect current Git refs and that commit’s
workflow results for delivery status; earlier feature or source-review receipts
are not publication. Main and deployment remain separate. Automated browser
checks do not establish physical-phone or human screen-reader acceptance.

## Independent reader risks found in parallel

Two real workflows were reproduced against unchanged `7ec5da4` while the source
review ran. They are **not fixed by this corpus batch**:

- Following a same-tab external source link replaces the app. A fresh reopening
  loses an unsaved tab-memory note; its saved bookmark remains. In-app navigation
  and export controls passed. Browser Back/BFCache restoration was not tested,
  so this is not a claim that every Back action loses a draft.
- A normal delayed reading response takes focus from the finder input a user
  focused while waiting. The next typed character misses that input. Native
  Chromium accessibility state confirms the focus change at phone and desktop
  widths.

Both reproductions used synthetic private notes or queries. Publisher navigation
was intercepted locally, and no private content was sent outside the local test
server. Source rights, historical excerpts and local-only personal data remain
separate obligations.
