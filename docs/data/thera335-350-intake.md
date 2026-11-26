# Therā Apadāna: publisher poems 335–350

This intake follows `3d614795cf95e45280603e95f68846c52eba4818`. It does not change the VRI canonical text or its corrected record boundaries. Source eligibility is approved; runtime activation and release acceptance are separate steps.

## Exact scope

The reviewed source is Jonathan S. Walters's *Legends of the Buddhist Saints*, Whitman College, publisher repository `apadana-translation/apadana-site` at `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`. Each of the sixteen `chapter-3/poem-335.md` through `poem-350.md` artifacts was checked independently against the original VRI Book 36 and the current corrected catalogue. The explicit correspondence is:

| Publisher poem | Canonical record |
| --- | --- |
| 335 | tha-ap337 |
| 336 | tha-ap338 |
| 337 | tha-ap339 |
| 338 | tha-ap340 |
| 339 | tha-ap341 |
| 340 | tha-ap342 |
| 341 | tha-ap343 |
| 342 | tha-ap344 |
| 343 | tha-ap345 |
| 344 | tha-ap346 |
| 345 | tha-ap347 |
| 346 | tha-ap348 |
| 347 | tha-ap349 |
| 348 | tha-ap350 |
| 349 | tha-ap351 |
| 350 | tha-ap352 |

These are individually established identities, not a reusable numerical-offset rule. A complete publisher-edition poem is not a line-complete translation of the different VRI recension. The English source's explicit attainment verses do not authorize expanding abbreviated Pāli repetitions.

The independently reviewed material contains 213 body paragraphs, 165 physical stanza entries, 171 printed global verse labels, 191 poem notes, two separately owned chapter summaries and one note-free chapter heading. Original combined stanza entries and the duplicated local label 3 in publisher 347 must remain intact. The chapter heading before publisher 341 is publisher paratext; it must not become a fabricated note-owning preface.

Publisher 340's summary belongs to `tha-ap342`, separately from its poem, and publisher 350's summary belongs to `tha-ap352`. Display alternates retain the publisher's diacritic-on spelling, including the original uppercase controls in publisher 346. Buddha names, counts and headings that differ by edition remain attributed differences, not automatic corrections to either source.

## Rights and distribution

The original translation grant, About page, footer and ePub metadata specify **CC BY-NC-SA 4.0**. The conflicting generic CC-BY value in the site's JSON configuration does not relax that grant. Public access alone is not permission. Attribution, noncommercial use and ShareAlike obligations continue to apply; no commercial-service, audio, image or other media permission is inferred.

The application bundles only finite source metadata and hashes. Translation bodies, notes, chapter headings and summaries remain externally fetched from the exact pinned official artifacts. This intake does not authorize other poems, clear existing holds or imply endorsement by the translator or publisher.

## Preservation and acceptance

The baseline has 343 approved Apadāna entries. Adding all sixteen approved scopes would produce 359; that count must be established from the built registry rather than used as its own oracle. All original 343 profile and link objects must retain their identity and contents. All 8,544 VRI records, all 61 source books, existing locator revisions, private notes, bookmarks and exports remain unchanged.

Source review was conducted before runtime normalization. Its independent source-only approval is SHA256 `61e8d843e61cbbab04c3dc4f1546c8725d0ad883d194d8e5b567c4e3d681385a`. This approval does not stand in for parser, installed-reader, browser, Saved-data or exact-commit CI evidence.

Historical test inputs may project this finite metadata addition back to the exact 343-entry baseline only after validating the complete current metadata. They must not rewrite public API responses or bypass older source, runtime, citation or integrity assertions. Existing historical authorities remain frozen.

Real-device usability, human assistive-technology acceptance, fresh offline browser startup and live-provider availability are distinct from deterministic installed-package/browser checks. No such acceptance is claimed by this source review.

## Local implementation checkpoint

Local application component `b2280c55ccf29c778abd89f26e3165b367b5ddba` implements all sixteen source-reviewed records and widget version 45. The metadata builder reproduced the independently assembled expected manifest exactly; all 343 prior objects and the other 26 data files are byte-identical. Direct parser output matches all sixteen independently derived original bodies and all 191 notes. The isolated installed widget audit passed, including exact whole-HTML equality in both resource transports. These are narrow checks, not final acceptance or publication.

Measured local coverage is 359 Apadāna choices, 2,942 whole links, CLI 1,838 direct / 2,261 including inherited, and actual public stdio MCP 1,812 / 2,235 of 8,445. These accounting systems have different denominators; neither counts partial/shared selections as whole translations.

The previous dev release's automatic rechecks finished with 58 successful jobs and one failure: Windows Node 20 exceeded the existing 30-second `approved_acceptance.py` child deadline after seven case indicators. This establishes a validation timeout; it does not establish a failed application assertion. Its exact diagnostic and recovery remain separate from source eligibility. No duplicate job was started. Required new-source corruption tests, installed reader/search/Saved acceptance, independent runtime review and exact-candidate CI remain pending.

## Reproduce the source review

The stdlib-only replay at `scripts/apadana/thera335-350/portable_source_replay.py` takes an explicit pinned publisher checkout, decompressed canonical file and original VRI Book 36 XML, with `--publisher-checkout`, `--canon`, `--vri-xml` and `--out`. It checks original bytes, rights, whole-book tuples, source boundaries, paragraphs, notes, quotes and pagination against independently sealed expectations. It never imports the application parser or uses its output as an oracle. Keep `--out` outside the repository: its normalized English file is a private verification fixture and must not be committed or included in package/artifact uploads. The CI artifact list names only the hash report and seal.
