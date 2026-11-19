# Ten individual AN selections from four shared pages (D240)

Ten independently reviewed whole-substantive selections now open individually: AN 1.45–46, 1.49–52, 2.32–33 and 2.125–126. All ten already had consented shared-page access. The actual gain is **ten first whole-unit mappings and zero first English-access records**. No new translation was authored or reconstructed.

The [independent source review](an-ten-source-review.json) and [source/root/selection pins](an-ten-source-pins.json) contain metadata, complete rights notices and hashes, without publisher translation or editorial-note bodies. The original review receipt SHA-256 is `8011c9d496c2b08e5e95ca6caab1cc18be819a8359f1aca9dad8e7ebc8035c15`; the pins receipt is `4db8bed6d137b39f24a149a422fba78f6ac400f5c1885a01f7dfd90ae1598a4c`. These are source-review receipts, not implementation or CI approvals.

## Exact editions and rights

All four complete artifacts were independently fetched from the existing official `bcbsit/ati` source at commit `45fedca341497120651efa20e756b04a13e61089`. Decoded bytes reproduce the official Git blob identities. Each exact page licenses its text under **CC BY-NC 4.0 International**, names Thanissaro Bhikkhu and identifies the file as translator-provided. Return the complete page-specific notice, attribution and ATI citation with every selection; identify the selection as derived from that page. Linked documents retain their own restrictions. No permission for other editions is inferred.

| Official pinned source | Git blob SHA-1 | Raw HTML SHA-256 | Notice |
|---|---|---|---|
| [Pool of Water, AN 1.45–46](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/an/an01/an01.045-046.than.html) | `23dffffede718d59eecd71be7c1eac42b02d271e` | `75faa07ddb7e722fa7887d9d15fca0efe6d216c047f2fcbeef73e8d5cc97ca32` | ©2006; ATI revision 4 August 2010 |
| [Luminous, AN 1.49–52](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/an/an01/an01.049.than.html) | `b0c118426ddfa75083dbdec68abf5fa903716b15` | `ea6989be10cd3225abb2d08d4f2947c94ba6f59b49532fa47347e75b080023da` | ©1995; ATI revision 30 November 2013 |
| [Gratitude, publisher AN 2.31–32](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/an/an02/an02.031.than.html) | `ce7969db68fa2f0fecc957d4b4ba8c72e803983c` | `ee088cf5338b2b59fda67eb3374f2ee3cafc1a711c54c39319d895ee5d300626` | ©2002; ATI revision 30 November 2013 |
| [Voice, AN 2.125–126](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/an/an02/an02.125-126.than.html) | `13f6c42f4c2d76b62ab788a97df85891890e84d3` | `df8584c8489b6cb76b34d8578ff06261a6092f4860216cea6bd6efbde2cccfdb` | ©2006; ATI revision 30 November 2013 |

The independently fetched complete VRI books `s0401m.mul.xml` and `s0402m1.mul.xml` at `2d134ff9ef60f70a1eb03c9370580228811a3070` reproduce their original Git blobs after the documented connector UTF-8 to original UTF-16LE normalization. All 400 and 318 parsed blocks respectively match the bundled corpus. Review covered all ten complete roots and eight complete adjacent controls, rather than inferring alignment from numbers or the older shared-page review. Source rights holds, including Mahāvagga VII, remain unchanged; no SuttaCentral text or workaround was used.

## Real source identity and boundaries

The internal translation ID is `ati:<path>::selection:<unit>`. The `::selection:` component is an application identity, **never a publisher URL fragment**. All ten have `heading: null`; actual parent page titles remain metadata. Nine use the real unfragmented publisher URL. Only indexed AN 2.33 uses the real publisher `#s32` anchor. Printed numbers, alternate labels and footnote pointers are not invented discourse anchors.

| Indexed owners | Selected source paragraphs | Original Pāli scope and caveats |
|---|---|---|
| AN 1.45 and 1.46 | Each page chapter's sole paragraph | Each original `/1`; complete opposite pool/mind comparisons. Four vocatives and an inline ordinal omitted in each English treatment. |
| AN 1.49–52 | Chapter paragraphs 1–4 respectively | `/1` for 1.49, 1.50 and 1.52; `/2` for 1.51. AN 1.50 `/2` is an untranslated closing colophon; AN 1.51 `/1` is an untranslated chapter heading. Inline ordinals are untranslated. |
| AN 2.32 | Contiguous paragraphs 1–3 | Original `/2–3`, with `/1` chapter heading excluded. Keep the full introduction and both substantive assertions. Publisher AN 2.31, indexed AN 2.32, VRI 33. Seven of eight repeated vocatives omitted. |
| AN 2.33 | Paragraph 4, real `s32` | Original `/1`; full parents-repayment treatment. Publisher AN 2.32, indexed AN 2.33, VRI 34. Seven of eight repeated vocatives omitted; translator brackets retained. |
| AN 2.125 and 2.126 | Paragraphs 1 and 2 | Each original `/1`; complete opposite wrong/right-view conditions. Publisher/indexed 125–126, VRI 126–127. One of two vocatives omitted in each. |

English AN 2.33's seven treasures corresponds to the retained VRI `sattaratana` variant; the main root retains `rattaratana`. Neither the main edition nor its variant notes is rewritten to manufacture agreement. Original numbering, variants, vocatives, headings and colophons remain available. Whole-substantive review does not claim every source word translated or word-level alignment.

Only AN 1.49 and AN 2.125 own a translator-note pointer. Their complete owned notes are returned separately as editorial material. Siblings do not inherit them. The Gratitude page's See-also links remain editorial crossreferences outside both discourse bodies, not translator notes owned by either discourse. Broader quotations and references inside notes do not become extra scripture or new source coverage.

The finite selector requires exact owner, path, paragraph ordinals, complete page structure, raw artifact, selected body, owned-note, full-notice, full-root and selected-Pāli pins. Missing or changed identities fail rather than returning the full page or a sibling. Revisions require renewed source review, not refreshed hashes alone. Preserve source identity through cached retrieval, quotation, continuation, native-script reading, browser choices and export.

## Previous choices and measured coverage

All five legacy shared versions remain exact: the earlier AN 1.21–40 page and these four pages retain original bare IDs, versions, scopes, full-text/notice pins and explicit consent. They still return page-level compilations. The existing 35 whole sections, 22 partial declarations, all other source alternatives, canonical data and local-only private drafts remain unchanged. The registry now contains 45 whole sections. No whole Vinaya coverage was added.

| Measure | D239 baseline | D240 current |
|---|---:|---:|
| Whole link records / ATI links | 2,573 / 1,150 | 2,583 / 1,160 |
| Direct / including inherited whole records | 1,469 / 1,892 | 1,479 / 1,902 |
| Grouped-member whole reporting | 1,443 / 1,866 | 1,453 / 1,876 |
| AN English / Sutta English | 408 / 1,888 | 418 / 1,898 |
| Partial declarations / partial-only records | 22 / 16 | 22 / 16 |
| Shared declarations / subjects / shared-only records | 12 / 110 / 32 | 12 / 110 / 22 |
| Daily sutta eligibility | 1,278 | 1,288 |

The daily algorithm is unchanged; the expanded pool selects SN 11.22 for 1 November 2026. Historical decisions and fixtures retain their original counts.

## Validation and remaining acceptance

Source approval is conditional on finite implementation, regression tests, independent implementation review and successful CI for the exact integrated commit. This document does not assert the last two gates have passed. Reproduce the source checks with the complete exact artifacts, preserve every prior section/shared/partial journey and inspect metadata-only exports; see [build instructions](../../scripts/canon/README.md).

The separate [expanded text-spacing audit](../evidence/web-reader/TEXT_SPACING.md) covers concrete responsive, keyboard, consent and private-draft workflows. Emulated widths and axe scans do not establish physical-device, real browser zoom, OS text scaling, native glyph shaping or human assistive-technology acceptance. No specialist certification of every translation choice, current publisher availability, full catalogue coverage or project completion is claimed.


### Local source UI and declaration-guard evidence

The individual-source reader journey passed five normal groups, five groups against an extracted package and eight accessibility groups at 320, 390 and 1280 CSS-pixel widths in both themes. The accessibility run made **192 axe scans with zero violations**. These source-UI scans are separate from the text-spacing audit's 24 scans. Local receipts are `/tmp/pali-an-ten-browser/{normal,installed,a11y}.json`.

`overflow-reproduction.json` records a concrete defect: at 390 pixels, the AN 1.49 source-version paragraph had client width 354 and scroll width 397, producing horizontal overflow. A narrow `.source-version { overflow-wrap: anywhere; }` rule fixes wrapping without changing or truncating the full copyable identifier. The journey asserts exact identifier text and reflow across all three widths. The default artifact-acquisition mode also passes: it acquires four immutable official artifacts, verifies SHA-256, refuses redirects and prevents a failed run from leaving a stale success report.

A separate backend fix retains each inherited shared link's original owner and identity, then requires a unique matching declaration in the actual translation table before scope classification. Changed scope/path/owner, removed, replaced and duplicate declarations refuse before generic whole-page fallback or a cached return. Independent probes reject 390 mutations (180 warm-cache and 210 membership cases); the committed regression covers five pages × eleven mutations × owner/non-owner callers, producing 110 refusals with zero provider calls. These tests address the demonstrated defect; they do not establish a complete security audit.

**Timing boundary:** those local UI and extracted-package receipts predate the final backend declaration guard. Their bundle hashes therefore do not certify the final integrated package. Fresh packaging and all relevant modes must pass on the exact commit. CI adds `an-ten` and `text-spacing` groups, for 43 configured jobs; no final CI result is asserted here.
