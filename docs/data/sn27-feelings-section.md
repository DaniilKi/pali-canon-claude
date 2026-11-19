# One new English discourse: SN 27.5

Reviewed against dev `0028982` on 19 November 2026. This adds one previously
untranslated indexed discourse, not ten translations or a whole book.

## Identity, boundaries and reuse

Two reviewers compared the complete fifth chapter of the official ATI
[Upakkilesa Samyutta page](https://www.accesstoinsight.org/tipitaka/sn/sn27/sn27.001-010.than.html#sn27.005)
with the complete VRI root and all nine neighbouring subjects. The fifth body
concerns the six feelings born of contact, distinguishing it from contact itself
and from perception. The publisher title is **Vedana Sutta — Feeling**;
the VRI title remains **Samphassajasuttaṃ**. The linkage does not depend
on matching numbers or titles alone.

The selected English is the publisher's complete substantive discourse:
one paragraph, 614 characters, zero translator notes. The VRI's final ordinal
`Pañcamaṃ.` is untranslated paratext **inside** `sn27.5/2`, not a separate
segment. The complete original Pāli remains unchanged, including its `…pe…`.
The publisher prints the closing refrain fully; this software never reconstructs
the abbreviated Pāli. This is not word-by-word alignment. The publisher's
anthology PTS reference, S iii 232, remains distinct from the indexed root's
individual PTS iii 233.

The exact page grants **CC BY-NC 4.0**, ©1994 Thanissaro Bhikkhu. Every returned
selection retains the complete original licensing notice and ATI citation,
with an explanation of the section extraction. No English body is bundled.
The official `bcbsit/ati` artifact is pinned at commit
`45fedca341497120651efa20e756b04a13e61089`; fresh decoded Git blob SHA1 and
SHA256, full notice, all chapter boundaries and root comparisons are in the
[independent source approval](sn27-feelings-review.json). All five source tests
passed for this exact source; no other source hold is cleared.

## Finite selection and consumer safeguards

The only new version is
`ati:/tipitaka/sn/sn27/sn27.001-010.than#sn27.005`. The whole-section
registry has fourteen unchanged Kelly questions and this one discourse.
The finite `ati-sn27-feelings-v1` profile accepts the reviewed ten ordered
chapter containers and selects only the fifth. Exact original artifact,
section, text, zero-note array, full notice, complete root and Pāli body pins
fail closed on change. The inline ordinal has its own exact declaration;
Milinda's trailing-segment paratext contract is unchanged.

Bare anthology links, neighbouring or encoded anchors, cross-unit selectors,
deleted descriptors and mismatched profiles refuse. Ordinary URL citation
opening preserves fragments only for registered paths. A future legitimate
dhammatalks alternative must use the same reviewed section extractor during an
outage fallback; it cannot return the full anthology under the fifth discourse's
identity. A synthetic alternative tests this case but is not shipped as a link.
The daily rotation retains the section identity and mapping disclosure. Its
selection algorithm is unchanged; adding this discourse changes the
data-version-specific rotation to 1,258 eligible suttas.

Browser retrieval is deliberate and separates the discourse from sibling
chapters, notices and personal notes. Stripping an anchor and descriptor
together cannot downgrade a reserved source to a generic whole page. The
existing fourteen Milinda selections and four owned translator notes remain
covered by their original journeys. Saved notes, session recovery,
rights holds and all 21 partial declarations are preserved.

## Coverage and further prospects

Only `sn27.5` is added to the translation table; every previous owner's value is
unchanged. Canonical data is byte-identical. Whole links: **2,553** (DT 1,270,
ATI 1,130, ABT 153). Indexed coverage: **1,449 directly / 1,872 with inherited
verses**; grouped counts: **1,423 / 1,846**. Partial sources remain 21,
partial-only units 15, shared pages 12 and whole Vinaya translations zero.

The nine adjacent SN 27 units already have independent dhammatalks choices,
which are preserved. The two existing Kelly pages have nine and five translated
sections, exactly the fourteen already indexed: there is no further whole
question batch on those pages. The [bounded Milinda follow-up](milinda-next-scope-review.json)
identifies only a possible two-verse Olendzki partial at `mil6.4.1/20–21`, within
a 96-segment question. It is not activated. Fresh inspection corrects the
earlier lead: three editorial-preface paragraphs precede a fourth paragraph
which is the publisher citation inside the verse container. A future finite
extractor must exclude that citation from the poem and retain its attribution.

## Repeatable acceptance

Use `PALI_ATI_SECTIONS_SOURCE_DIR` pointing at the pinned official ATI checkout
for `npm run check`, or run `node scripts/canon/verify_section_html.mjs
scripts/canon/reviewed_ati_sections.json ATI-CHECKOUT` before activation.
`tests/sn27-section.test.mjs` covers rights, finite identity, original roots,
exports, cached checks, daily metadata, continuation and the outage alternative.
`scripts/web-reader-sn27-check.py` exercises the actual bundle and immutable
source bytes in normal, `--a11y` and isolated `--server-dir` modes. Reports keep
metadata and hashes, never publisher bodies or private note contents.

Browser layouts are emulated; automated accessibility scans and keyboard checks
are not physical-phone or human assistive-technology acceptance. Immutable
artifact tests do not prove current live-publisher availability or specialist
translation approval. Dev advances only after independent implementation review
and successful CI on the exact candidate; main and deployment are separate.
