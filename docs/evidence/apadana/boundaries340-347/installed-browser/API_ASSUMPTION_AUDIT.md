# V3 endpoint × field audit

Static inspection only. No application import, test, browser/server launch, build, network, Git or oracle regeneration occurred. V1 failed at its first positive-reading check; V2 was held by independent review and **never executed**.

The V2 audit missed a call-chain error: although it listed `analyse_passage.segment` correctly, that call was still passed to the full-reading `segments()` helper. That helper also checks source page-begin arrays, which canonical word analysis intentionally does not return. Five of the six selected original first verses have nonempty page arrays. V3 fixes the caller/helper mismatch without changing or discarding those original expectations.

## Actual response projections and assertion locations

| Actual endpoint / response path | Identity and source wording | VRI range/label | Public page-begin arrays | Harness assertion |
| --- | --- | --- | --- | --- |
| `get_text` individual unit | top-level `text_id`, `title`, pinned `source`; full `segments[]` with ref/type/text | per-segment `vri_paragraph`; no top-level `vri_paragraphs` | retained on segments where present | reading title/source check plus unchanged full `segments()` helper |
| `get_text` source book | `selection=source_book`, original VRI source; full `segments[]` | per-segment label where present | retained on segments where present | unchanged full `segments()` helper and stable source-book pin |
| `get_metadata` | `canon.describe`/`unitSummary`: `id`, `title`; descriptive metadata, not a reading segment array | top-level `vri_paragraphs` | not used as reading-page output | exact metadata id/title/VRI-range check added in V2, retained |
| `read_passage_widget.pali` | whole/continuation `segments[]`, exact counts/offset/pins | per-segment label; widget also has descriptive top-level range | retained on segments | unchanged full `segments()` helper through widget payload/continuation checks |
| canonical `analyse_passage.segment` | source defines `{ref,type,text,...(vri_paragraph)}`; top-level `text_source` gives reading provenance | this proposal's six selected original verses all have nonempty labels, giving exactly four fields | **not exposed** | new dedicated `analysed_segment()` checks exact four-field shape, ref/type, original text hash and VRI label; existing `text_source` pin check retained |
| native `.passage` / citation DOM | source words and exact link refs/pins | source label displayed by reader | not inferred from word-analysis output | retained source-oracle DOM/citation checks |
| widget `#pali .seg` DOM | ordered direct text nodes and source type classes | decorative labels remain separate nodes | decorative spans excluded from the source-word text hash | retained full API proof plus every ordered DOM type/word hash |

This matrix follows the actual callsites: full page checks stay on every `get_text`, widget and source-book use of `segments()`. Only the single positive `analyse_passage` callsite changes to its dedicated projection helper. Its original expected verse remains the same sealed source-oracle object, including page fields for the other reading APIs. No oracle is rewritten or regenerated.

The six selected source verses are `tha-ap340/2` (PTS/Myanmar page starts),341/2 (VRI),343/3 (Thai/Myanmar/VRI),344/2 (Myanmar/VRI),346/2 (none) and347/2 (Myanmar). These page arrays remain mandatory on full reading responses. Their absence in the narrow word-analysis projection is a documented API boundary, not a source-data exception.

## Other static checks retained

- Registered public names/arguments: `get_text` uid/book/offset/source_commit/limit200/variants; `get_metadata({uid})`; widget uid/segment/context/source_commit/offset/limit80; word analysis uid/segment/source_commit/offset/limit1. No internal widget English-pagination argument is invented.
- Native versus widget source-refusal envelopes remain distinct. SDK malformed-pin errors remain separate from valid stale-pin tests.
- `english.available` emits display `source` plus stable `translation_id`; V2's additional `ap:` rejection is retained.
- Actual `/` and `/reader` routes, dynamic Add12 bookmark control, Saved/import/recovery labels, fresh-citation detachment and explicit journal/import/save waits match source. No arbitrary UI sleeps were added.
- Source-defined widget URIs, whole resource equality, direct DOM text extraction and all count/pin contracts remain unchanged.

The independent selection reviewer completed the rest-schema audit and identified no further blocker beyond the word-segment projection mismatch. That is a static finding, not behavioral proof. All712 old-position matrix checks, source/crosswalk expectations, guards, package/source-widget bindings and time bounds remain unchanged; independent review/rebinding is still required before a root-owned retry.
