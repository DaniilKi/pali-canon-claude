# Two more shared publisher pages (D197)

Water and Gratitude are now available with explicit shared-page consent. They
add **two publisher pages concerning four previously shared-unlinked subjects**.
They do not add four independently aligned English translations. Shared totals
are **three pages / eight subjects / eight shared-only texts**. Ordinary English
remains **2,596 links / 1,450 direct texts / 1,873 including inherited links**.
Canonical Pāli is unchanged. Main, deployment and the separate web-reader branch
are untouched.

## Source review

| Publisher page | Indexed subjects | Source boundaries and evidence | Rights |
|---|---|---|---|
| [A Pool of Water](https://www.accesstoinsight.org/tipitaka/an/an01/an01.045-046.than.html), AN 1.45–46 | AN 1.45–46, VRI 45–46 | `s0401m.mul.xml` blocks 57–59; turbid/clear pools, cannot/can see shells, gravel and fish; own/others/both benefit, impossible/possible noble knowledge, both causal conclusions | Ṭhānissaro Bhikkhu ©2006, explicit CC BY-NC 4.0, ATI revision 4 August 2010 |
| [Gratitude](https://www.accesstoinsight.org/tipitaka/an/an02/an02.031.than.html), AN 2.31–32 | **AN 2.32–33**, VRI 33–34 | `s0402m1.mul.xml` blocks 72–76; formal opening, ingratitude/gratitude and integrity; parents' century-long care, sovereignty, their care and establishing conviction, virtue, generosity and discernment; repayment conclusion | Ṭhānissaro Bhikkhu ©2002, explicit CC BY-NC 4.0, ATI revision 30 November 2013 |

The Gratitude publisher numbering differs from the index. Indexed AN 2.31 is
about calm and insight and is **not** a subject of this page. Its “seven treasures”
rendering follows the root note's `pahūtasattaratanāya` variant rather than the
main `pahūtarattaratanāya` wording. This is an edition/rendering difference,
not permission to rewrite either source. The chapter heading stays paratext.

Gratitude's bracketed clarification, `II,iv,2` marker and complete See also list
(MN 110, SN 7.14, AN 4.73, Iti 106) remain in the pinned publisher page; they do
not add canonical subjects. There is no individual passage-alignment assertion.
Both pages contain the substantive treatments of the declared root subjects;
classification is `compilation`, `condensed: false`.

ATI remains pinned at `45fedca341497120651efa20e756b04a13e61089`; VRI at
`2d134ff9ef60f70a1eb03c9370580228811a3070`. An independent source reviewer checked
both complete source books against bundled blocks (400 and 318 respectively),
wording, source boundaries, page-specific notices and independently computed
hashes. Both pages passed. The [manifest](../../scripts/canon/reviewed_shared_pages.json)
pins each full root scope, normalized segments, HTML, extracted text and complete
notice/citation. Extracted source lengths are **1,145** and **1,778** characters.
English bodies are not bundled.

## Reader safeguards

Use exact IDs after reviewing shared scope:

```json
{"uid":"an1.46","translation":"ati:/tipitaka/an/an01/an01.045-046.than","allow_shared":true,"limit":1000}
```

```json
{"uid":"an2.33","translation":"ati:/tipitaka/an/an02/an02.031.than","allow_shared":true,"limit":1000}
```

Follow returned continuations unchanged. Results have null individual `text_id`,
a separate requested subject, full licence/citation and pinned page identity.
Default/ordinary attached/widget English cannot retrieve these pages. Exact
`include_shared: true` quotation checks require explicit subjects; matches and
absences refer to the complete publisher page, never a selected discourse alone.
Nearby units and grouped ranges do not inherit the new links.

## Validation and remaining work

Source-specific regressions cover root/segment pins, exact members, neighbouring
misnumbering, no-consent refusal before network, independent continuations,
page-level positive/negative quotation, export and unchanged ordinary counts.
The first-pilot synthetic builder fixture is isolated from additional real pages.
The installed-package shared audit now checks **every** real reviewed declaration
for metadata, refusal, source drift and presentation-downgrade notice protection,
using synthetic providers only. Actual stdio and HTTP each read both new pages in two pages at a 1,000-character
limit, with exact extracted hashes, full licence/citation and positive/negative
page-level quote results. Smoke passed all 34 tools/64 checks. The installed shared
audit passed 15 scenarios, including metadata and notice-downgrade refusal for
each of the three real declarations; it made no real author-host requests.
The offline source verifier passed all three complete text/notice snapshots.
The complete `npm run check` passed: **934 tests passed, one existing skip**,
and all **8,544** corpus records passed audit with zero failures. Independent
source and implementation reviews passed. Exact-commit CI is the remaining
release gate after push.

The regenerated review queue contains **57 pending pages / 10 pages with possible
direct-English gaps**. These are screening clues, not approved coverage. Mother,
SN 36.15, incomplete Bombast, Walshe SN 1.25 and other source holds remain.
Single-unit condensed-page support is not implemented. The standalone web reader
continues independently; this corpus batch does not integrate its branch.
