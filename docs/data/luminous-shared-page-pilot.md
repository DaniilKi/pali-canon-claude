# First real shared-page pilot: Luminous (D195)

One new publisher page is available through explicit shared-page reading. It
concerns **AN 1.49–52**, not four independently aligned English translations.
Whole-unit English totals stay **2,596 links / 1,450 direct texts / 1,873
including inherited links**. Separately, there is now **one shared ATI page,
four listed subjects and four shared-only texts**. Canonical Pāli is unchanged.

## Reviewed source and truthful classification

[ATI Pabhassara Sutta: Luminous](https://www.accesstoinsight.org/tipitaka/an/an01/an01.049.than.html)
contains four full quoted passages: defiled mind, freed mind, the uninstructed
person without mind development, and the instructed disciple with development.
They correspond to four consecutive independent VRI units, AN 1.49–52, in
`s0401m.mul.xml`, blocks 61–67. The entire pinned 400-block source book matches
bundled wording, notes and edition markers. Headings/colophon stay paratext.

This is a **compilation**, not a condensed rendering. `shared_scope` now permits
`presentation: compilation` as well as its existing condensed case. Returned
metadata says `condensed: false`, `individual_alignment_verified: false` and
`whole_unit_coverage: false`. One owner, AN 1.49, exposes the same reviewed page
to exactly four named members; adjacent units and grouped ranges do not inherit it.

The complete interpretive Note remains part of the source/hash. It discusses
MN 49, DN 11 and MN 24 and quotes a fourth-jhāna passage. Its words cannot be
attributed to an individual AN member merely because a page-level match exists.
Do not splice, expand, rewrite or separately assign the publisher's material.

Ṭhānissaro Bhikkhu, ©1995; ATI revision 30 November 2013. The individual full
notice explicitly grants **CC BY-NC 4.0**. No English body is bundled.
Complete notice and attribution accompany every successful reading page.

## Pins and reproducible build

ATI commit: `45fedca341497120651efa20e756b04a13e61089`.
VRI commit: `2d134ff9ef60f70a1eb03c9370580228811a3070`.

| Evidence | SHA-256 |
|---|---|
| Full source HTML | `ea6989be10cd3225abb2d08d4f2947c94ba6f59b49532fa47347e75b080023da` |
| Extracted full English (`scopeHash(text)`) | `35182e6e8d3990b8cb6ace20602277a5d409fd45c5a44b9e277ec25995084c60` |
| Full extracted notice/citation (`scopeHash(atiNotice(html))`) | `3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe` |
| Normalized member segments | `5c98023f2f97b51c5ea9ef76b4a031ac9725ec8cecee8fbacc0f2c0ecf3f77a0` |

The [shared manifest](../../scripts/canon/reviewed_shared_pages.json) also pins
complete root blocks per unit. The Python loader checks exact independent,
contiguous members and complete root blocks; the runtime/corpus audit checks
normalized segment scope. Node 20+ verifies complete HTML, extracted English
and notice with the same extraction functions used by live reading. No fetch
is performed at build time. All records validate before any output mutation.

The ordinary builder strips known shared-page proposals so automatic title or
number linking cannot turn the page into an ordinary source. Only `--content`
with the reviewed source checkout activates it. The final Mother exclusion
still runs last. The standalone shared loader is idempotent, preserves unrelated
links and replaces known page bindings with exactly one approved owner.

Every ATI shared page now requires a notice pin, including condensed ones;
changing the presentation cannot remove this protection. Missing/malformed pins,
changed extracted text or changed notice refuse output. A changed notice pin
also changes scope identity, invalidating old continuation commands.

## Reader and quotation behavior

First inspect `get_metadata` for a member. Read only after reviewing the full
subject list, with its exact ID:

```json
{"uid":"an1.51","translation":"ati:/tipitaka/an/an01/an01.049.than","allow_shared":true,"limit":1000}
```

The response has `text_id: null`, the publisher caption and a separate
`requested_text_id`. Follow the returned continuation unchanged: it retains
exact source ID, member, prefix and scope pins. No different-version fallback
or ordinary attached English is allowed. URL-only resolution discloses the
whole member list rather than choosing one canonical text.

For `verify_quote`, provide explicit member `texts`, the exact translation ID
when desired, and `include_shared: true`. Both positive and negative results
concern the **publisher page**. They establish neither wording nor absence in
any individual discourse. The quoted Note is subject to the same limitation.
The ordinary widget still refuses shared English; a later browser UI must add
honest page-level consent and rendering before enabling it.

Exports retain presentation, notice/scope pins, exact subject list and source
identity in separate shared columns. Legacy whole-unit fields stay empty for
these members. Review screening now distinguishes shared availability from
whole-unit English, and revalidates active shared metadata against this manifest.

## Evidence and limits

- New real-declaration tests cover one owner/four subjects, unchanged whole
  counts, opt-in and adjacent-unit refusal before fetch, synthetic-provider
  positive/negative page-level results, independent continuation, notice/source
  drift, presentation downgrade refusal and JSON/CSV scope preservation.
- Builder regressions check complete root, HTML/extracted English/notice pins,
  duplicate manifests, idempotence and preservation of unmodified input.
- Installed-package audit covers synthetic stdio/HTTP/native scripts/widget/AJ
  contracts plus real declaration metadata, no-consent rejection, source-drift
  refusal and notice-downgrade rejection. All providers are simulated: no
  publisher text is included and no author-host request occurs in this audit.
- Actual **stdio and HTTP** live readings each returned all **3,683 characters
  across four 1,000-character requests**, preserving notice, scope and exact ID.
  Both transports produced page-level positive and negative verification with
  null individual IDs, while whole-unit totals remained unchanged.
- Independent review confirmed source identity/rights and found the notice
  downgrade gap, now fixed and covered by source and packaged regressions.

This does not certify every interpretation in the translation/Note or turn its
four subjects into verified individual translations. Mother, SN 36.15, ATI AN
2.46 and other unreviewed/incomplete pages remain held. Full local and exact-CI
outcomes accompany the completed receipt. Main and deployment remain untouched.

Final local full check passed **927 tests**, with one existing skip; all 8,544
texts audited with zero failures. Final focused documentation/source/queue tests
passed 28/28, notice regressions 16/16, smoke 34 tools/64 checks, and all **11**
installed shared-audit modes passed, including actual-declaration notice downgrade.
The review packet exactly reproduced its recorded SHA-256. Bundles were rebuilt
after the notice-invariant fix. Actual publisher-text live checks are separate
from the network-free installed audit described above.

## Evidence-gate follow-up (D196)

The first D195 CI evidence run failed before the shared-page audit: its daily
pool oracle counted any nonempty translation entry, so it counted the shared
owner as an eligible whole-unit sutta (1,272 expected versus 1,271 actual).
Production correctly excluded it. The audit now derives eligibility independently
from the presence of partial/shared declaration keys, without reusing the
production classifier. It retains exact cycle size, every-member coverage,
no-repeat and periodicity assertions. No gate or source safeguard is removed.

A new regression covers ordinary, shared-only, partial-only, mixed, malformed
scope keys, approximate and range records, plus the real compilation members.
The complete isolated evidence audit then passed locally with zero network
requests: all 1,271 eligible suttas, 423 daily verses, 478 plan days across four
plans, and the other recorded-reference checks. This follow-up changes only the
audit/tests/documentation; source data, runtime and built bundles are unchanged.
The original failed CI run remains in history; final exact-commit CI must pass.
