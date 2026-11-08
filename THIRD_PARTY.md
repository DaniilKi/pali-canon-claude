# Third-party content and dependencies

The [MIT licence](LICENSE) covers this project's own software and documentation. It does **not** relicense scripture, translations, dictionary entries or upstream services.

## Bundled: Chaṭṭha Saṅgāyana Tipiṭaka (VRI)

`server/data/canon.json.gz` contains the Pāli text of the Tipiṭaka from the Vipassana Research Institute's [tipitaka-xml](https://github.com/VipassanaTech/tipitaka-xml) repository (romanised edition; the exact commit is recorded in the data file and reported by `list_sources`). VRI states that these files are "made freely available for non-commercial use" and asks that projects attribute the Vipassana Research Institute and stay in sync with its corrections. The text is reproduced without changes, apart from markup removal. Page references are VRI's own markers for the PTS, Myanmar, VRI and Thai editions. Rebuild the data from a newer commit to pick up VRI corrections ([scripts/canon/README.md](scripts/canon/README.md)).

Complete root-file readings (`get_text` with `book`, including source front matter) use this same bundled VRI content and return the same pinned source, attribution and non-commercial terms. Source-book references do not replace the individual citation numbering below.

`server/data/postcanonical.json.gz` holds post-canonical books from the same repository and commit (the Ṭīkā and Añña sections: `romn/*.tik.xml`, `romn/*.nrf.xml`, the Visuddhimagga and its Mahāṭīkā), under the same VRI terms and attribution, unchanged apart from markup removal; titles come from VRI's table of contents (`tipitaka.org/romn/tree.json`).

`server/data/commentary.json.gz` contains the commentaries (Aṭṭhakathā) of the same VRI repository and commit (`romn/*.att.xml`), under the same terms: free for non-commercial use, with attribution to the Vipassana Research Institute. The text is reproduced without changes, apart from markup removal; the build adds only the alignment of each passage to the root paragraph it explains. `get_commentary` and `search_commentary` return VRI's attribution and terms and label the text as commentary. Direct book reading and search do not assert an alignment to a canonical text.

`server/data/parallels.json.gz` is derived only from the bundled VRI canon and commentary above (same terms: non-commercial, attribution to the Vipassana Research Institute). It holds links between texts, the commentary words that make each citation (short excerpts, at most 400 characters) and segment references; no new text. No SuttaCentral data is fetched, bundled or derived: SuttaCentral appears only as a link. DharmaNexus (Dharmamitra) parallels and the parallels columns of the Digital Pāḷi Dictionary's sutta table are not used (see D59).

## Citation numbering

The standard citation IDs (for example `sn46.131-140`, `pli-tv-bu-vb-pj1`) follow the public numbering scheme used by SuttaCentral and Bhikkhu Bodhi. To align those numbers with the VRI text, the build reads the file and segment names and the opening words of the Mahāsaṅgīti Pāli root in [bilara-data](https://github.com/suttacentral/bilara-data), which is marked Public Domain Mark 1.0. Only the resulting number-to-location mapping and the public-domain Pāli titles are kept. No SuttaCentral translation, comment or other text is fetched or bundled. SuttaCentral [asks](https://suttacentral.net/licensing) that its content not be used for generative AI or apps built on it, and this project respects that by linking to SuttaCentral rather than retrieving from it.

## dhammatalks.org (Ṭhānissaro Bhikkhu)

Translations are fetched live from [dhammatalks.org](https://www.dhammatalks.org/suttas/). They are licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) and attributed to Ṭhānissaro Bhikkhu. The site defines "commercial" to include any sale. The bundled translation index stores page titles and URLs only.

The `vinaya_rule` tool links to sections of Ṭhānissaro Bhikkhu's *The Buddhist Monastic Code, Volume I* (third edition, revised 2025, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)) on [dhammatalks.org](https://www.dhammatalks.org/vinaya/bmc/Section0000.html). `server/data/bmc.json` stores only rule numbers, section URLs and chapter headings taken from the book's table of contents; the attribution and licence are returned with every result.
`find_talks` searches the site's own search page for Ṭhānissaro Bhikkhu's Dhamma talks (same CC BY-NC 4.0 licence) and returns talk titles, dates and links only. No talk text, transcript or search snippet is fetched into results or bundled. Requests are cached in memory and spaced at least one second apart, and `/Archive/MachineTranscripts/`, which the site's robots.txt disallows, is never requested.

## Access to Insight

Pages are fetched live from [accesstoinsight.org](https://accesstoinsight.org/). If it is unavailable, they come from the official Barre Center for Buddhist Studies repository [bcbsit/ati](https://github.com/bcbsit/ati) (via raw.githubusercontent.com or jsDelivr), or from the [Digital Pali Reader mirror](https://github.com/digitalpalireader/accesstoinsight). Licences vary by page (CC BY-NC 4.0, BPS free-distribution terms, public domain and others), and each page's own notice is returned with its text. Do not sell ATI content. The bundled index stores PTS references, titles, translators and licence labels only.

The reviewed Pv 5 link is Ṭhānissaro Bhikkhu's CC-BY-NC translation. Vv 16 and
Vv 35 are John D. Ireland's translations, copyright 1997, from BPS Wheel
417/418. Their page-specific notice permits free electronic redistribution,
requires derivation/source acknowledgement and the full licence, and limits
reprinting to 50 copies. The reading response preserves that full notice and
source citation. No English bodies are bundled. See the [source review](docs/data/ati-story-links.md).

The subsequent [coverage batch](docs/data/ati-coverage-expansion.md) adds the
CC-BY-NC Thig 5.11 page by Ṭhānissaro, the BPS-licensed Hecker/Khema version
(copyright 1982 BPS), Khantipalo's Tālapuṭa poem (copyright 1983 BPS), and
Ireland's Dhammacariya discourse (copyright 1983 BPS). Each BPS page has its
own full free-distribution notice with the same print-limit, acknowledgement
and full-licence requirements. These are linked through the existing live ATI
reader, with original notices and citations retained; English bodies remain
outside the bundle.

The Yasoja follow-up links Ṭhānissaro's CC-BY-NC page and Ireland's Vaṅgīsa
compilation (copyright 1997 John D. Ireland, from BPS Wheel 417/418). The latter
uses the same explicit BPS free-distribution/print-limit conditions described
above. The original notice and citation accompany every reading page; linked
external footnotes are not newly imported commentary. See the
[follow-up review](docs/data/yasoja-and-vangisa.md).

The `reading_plan` tool's study-guide plans list, in order, the texts cited by two of Ṭhānissaro Bhikkhu's Access to Insight study guides ([Into the Stream](https://www.accesstoinsight.org/lib/study/into_the_stream.html), © 2011 Metta Forest Monastery; [The Four Noble Truths](https://www.accesstoinsight.org/lib/study/truths.html), © 1999 Metta Forest Monastery; both CC BY-NC 4.0). Only the guides' citations and links are stored; none of their text is bundled or returned.
SN 1.42 (Kindada) is also individually reviewed: copyright 1997 Ṭhānissaro
Bhikkhu, CC BY-NC 4.0. The original licence/citation accompany live reading.
Its complete question-and-answer verse dialogue is identified by title, ordered
content and PTS S i 32, not the sutta number alone. See the
[follow-up source record](docs/data/yasoja-commentary-and-kindada.md).

The reviewed SN 4.8 (Nandana), SN 17.5 (Pilahaka) and SN 3.7 (Atthakarana)
pages are copyright 1998 Ṭhānissaro Bhikkhu, CC BY-NC 4.0. Their original
notices and citations remain in live reading results. The Pāli source stays
unchanged, including abbreviations; correspondence and edition notes are
documented in the [SN review](docs/data/ati-sn-coverage.md).

SN 9.11 is copyright 1999 Ṭhānissaro Bhikkhu, CC BY-NC 4.0. Walshe’s
SN 1.3 and SN 12.16 pages are copyright 1985 BPS, from Wheel 318–321,
transcribed in 2007 by arrangement with BPS. Their full notice requires free
distribution, source/derivation acknowledgement and the complete licence, with
a 50-copy print limit. Existing readers retain those notices and citations.
Expanded framing, condensed repetitions and editorial notes are disclosed in
the [scope review](docs/data/ati-introductions-and-notes.md); no English bodies
are bundled.

The D187 batch adds Walshe’s SN 7.21, SN 22.109 and SN 22.110 (copyright
1985 BPS, Wheel 318–321; full free-distribution/acknowledgement/50-copy notice),
and Ṭhānissaro’s SN 22.121 (1997), SN 25.5 (2004) and SN 47.35 (2012), all
CC BY-NC 4.0. Original notices and citations remain in live readings. No English
body is stored by the new metadata-only review-packet tool. The
[review record](docs/data/ati-paired-discourses-and-review-workflow.md) explains
condensed openings, repetitions and editorial Notes.

D188 adds Walshe’s SN 40.9, SN 22.7 and SN 55.24 (copyright 1985 BPS,
Wheel 318–321), retaining their full free-distribution/acknowledgement/50-copy
notice. The additional Ṭhānissaro pages are SN 35.197 → indexed SN 35.238
(2004), AN 4.77 (1997), AN 3.134 → indexed AN 3.136 (1996), and AN 5.130
(2004), all CC BY-NC 4.0. Original notices and source citations remain in live
reading; English bodies are not bundled. See the
[source review](docs/data/ati-signless-and-an-coverage.md) for editorial scope.

The ten D189 AN choices are Ṭhānissaro’s CC BY-NC 4.0 pages: AN 3.52
(1997); ATI AN 3.88/3.89 → indexed AN 3.89/3.90 (1998); ATI AN 4.259 →
indexed AN 4.262 (2002); AN 5.64 (2003); AN 6.102/6.104 (2004); ATI AN
7.21/7.32/7.48 → indexed AN 7.23/7.33/7.51 (1997/2012/1997). Full source
notices and citations remain in live reading, with edition/editorial differences
disclosed. No English bodies are bundled. See the
[batch review](docs/data/ati-an-training-and-growth.md).

D202 exposes the exact ATI Itivuttaka Ones1–27, Twos28–49 and Fours100–112
pages as shared publisher sources, with Ṭhānissaro’s complete ©2001 CC BY-NC4.0
notices. Ireland’s Ones24–27 compilation carries the complete ©1997 BPS notice
(free distribution, derivative/source attribution, full licence and ≤50 reprints),
not CC. Text/notice pins, explicit consent and page-level identities remain
mandatory. Three other multi-discourse bindings remain withheld; no source terms
were broadened. See [source audit](docs/data/iti-range-binding-audit.md).

## Access to Insight indexes (bundled topic index)

`server/data/topics.json` holds topic names, cross-references and links taken from Access to Insight's [General Index](https://www.accesstoinsight.org/index-subject.html) and [Numerical Index](https://www.accesstoinsight.org/index-number.html), read from commit `45fedca341497120651efa20e756b04a13e61089` of [bcbsit/ati](https://github.com/bcbsit/ati). The text of both pages is “by Access to Insight” and licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the attribution and licence are returned with every `topic` and `list_topics` result. Only names and links are kept, and each sutta link is mapped to a canon ID by this project. Documents linked from the indexes keep their own terms.

## Numbered lists (bundled)

`server/data/dhamma_lists.json` is this project's own curation (MIT): list names, Pāli member names as they appear in the VRI text, short English glosses written for the index, and citations. The Pāli passages themselves come from the bundled VRI text under VRI's terms.
## Ancient Buddhist Texts (Ānandajoti Bhikkhu)

Text-and-translation pages are fetched live from the "Texts and Translations" section of [ancient-buddhist-texts.net](https://ancient-buddhist-texts.net/Texts-and-Translations/index.htm), edited and translated by Ānandajoti Bhikkhu. The site's [Copyright Notice](https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm) (May 2013) places the introductions, translations, studies and notes under the [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/) licence, attribution to Ānandajoti Bhikkhu; the site's page footers now link [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The same notice says the Pāli of several of these editions derives from the Sri Lanka Tripitaka Project's Buddha Jayanti databases, which it describes as public domain. Works the notice lists as copyright of others (for example PTS editions used by permission) are not fetched. The bundled index `server/data/anandajoti.json` stores page paths, the site's references, English titles and match scores only.

## Digital Pāḷi Dictionary

Lookups go live to [dpdict.net](https://www.dpdict.net/). DPD is [CC BY-NC-SA 4.0](https://docs.dpdict.net/license/), by Bodhirasa Bhikkhu.

`server/data/dpd.json.gz` is a compact subset of DPD release [v0.4.20261026](https://github.com/digitalpalidictionary/dpd-db/releases/tag/v0.4.20261026) (asset `dpd.db.tar.xz`, SHA-256 `62a3f55d285ae27f5e1d15492cd7bfa92e9e66a0b6bfed9ea97b58a28e346f49`; DOI [10.5281/zenodo.22979413](https://doi.org/10.5281/zenodo.22979413)), built by `scripts/dpd/build_dpd.py`: every headword and root, and the inflection map and deconstructor splits for the words of the bundled VRI texts. It is used by `analyse_passage` and by `lookup_pali` when dpdict.net is unreachable. It is a derivative of DPD and is shared under the same licence, **CC BY-NC-SA 4.0**, non-commercial, crediting “Digital Pāḷi Dictionary by Bodhirasa Bhikkhu”. Every result built from it returns this notice.

`server/data/glossary.json.gz` is a second derivative of the same release, built by `scripts/dpd/build_glossary.py`: DPD's English index (the `epd` column of its `lookup` table) and the multi-word senses of DPD meanings, limited to headwords found in the bundled canon and ranked by DPD's own early-text counts, plus DPD's own sutta names (`sutta_info`: `dpd_sutta` and `dpd_sutta_var` only) mapped to canon text IDs through VRI's file and paragraph number. Every SuttaCentral column (`sc_*`), the `dv_*` columns and DPD's SuttaCentral-style `dpd_code` are dropped: no SuttaCentral content is bundled. It is used by `glossary`, the English expansion of `search_texts` and sutta names in `resolve_reference`, and is shared under the same licence, **CC BY-NC-SA 4.0**, crediting “Digital Pāḷi Dictionary by Bodhirasa Bhikkhu”.

## English-keyboard input (ported, MIT and Unlicense)

`src/input.mjs` (Pāli typed on an English keyboard, #102) ports or follows:

- **digitalpalidictionary/dpd-koreader** (MIT), <https://github.com/digitalpalidictionary/dpd-koreader>: the Velthuis table and its order (`dpd/velthuis.lua`), ṁ = ṃ and NFC handling (`dpd/normalize.lua`), and the English fuzzy key (strip diacritics, `kh` → `k`, collapse doubled consonants; `dpd/english.lua`). Its `LICENSE` file reads: “Copyright (c) 2026 Nirodhavihāri”.
- **tokushige-koyasan/corpus-search-toolkit** (MIT), <https://github.com/tokushige-koyasan/corpus-search-toolkit>: the conservative scheme detection of `scripts/to_iast.py` (ASCII markers, English lines left alone) and the spelling-variant classes of `scripts/variants.py` (doubled consonants, nasals before a consonant). Its `LICENSE` file reads: “Copyright (c) 2026 tokushige-koyasan”.
- **matko/emacs-pali-velthuis** (Unlicense, public domain), <https://github.com/matko/emacs-pali-velthuis>: its quail table is the Velthuis test fixture in `tests/english-input.test.mjs`.

The MIT permission notice reproduced under "Calendar code" below applies to both MIT works.

## Calendar code (ported, MIT)

`src/calendar.mjs` (the `uposatha` and `festivals` tools) contains JavaScript ports of three MIT-licensed programs. Each is distributed under the MIT licence, whose permission notice is reproduced here in full as that licence requires:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The copyright notices:

- **splendidmoons**, Thai lunar calendar (Mahānikāya): Copyright (c) 2023 Gambhiro Bhikkhu. <https://github.com/splendidmoons/splendidmoons>
- **pythaidate**, Pakkhagaṇanā (Dhammayut): Copyright 2023 Mark Hollow. <https://github.com/hmmbug/pythaidate>
- **mmcal / ceMmDateTime.js**, Burmese calendar: Copyright (c) 2018 Yan Naing Aye. <https://github.com/yan9a/mmcal>

The astronomical formulas follow Jean Meeus, *Astronomical Algorithms* (2nd ed., Willmann-Bell, 1998). No calendar data files are bundled. The published dates used only as test references are listed with their sources in [docs/calendar.md](docs/calendar.md).
## Dictionary of Pāli Proper Names (DPPN)

G. P. Malalasekera's DPPN (1937–38) is linked only. Its copyright or licence status is unconfirmed (see "DPPN licence research" in [docs/sources.md](docs/sources.md)), so no entries are bundled: `server/data/dppn.json` holds source details and an empty entry list. `lookup_name` links to the online editions ([revised edition by Ānandajoti Bhikkhu](https://ancient-buddhist-texts.net/Textual-Studies/DPPN/index.htm), palikanon.com) and lists texts of the bundled VRI canon where a name appears.
## Citation index export

`scripts/export-index.mjs` writes the citation index (`citation-index.json`, `citation-index.csv`) that is attached to each release and served on the documentation site ([docs/export.md](docs/export.md)). It holds IDs, Pāli titles, VRI paragraph numbers, PTS page references, translator names, licence labels and URLs, and no scripture or translation text. The VRI-derived parts carry VRI's non-commercial terms and attribution; each linked translation keeps its publisher's licence. A licence notice (`citation-index-LICENSE.md`) travels with the files.

## Runtime dependencies

The bundled server includes the Model Context Protocol TypeScript SDK and its dependencies. Their licence notices are in `server/THIRD_PARTY_LICENSES.txt`.

## Reviewed ATI shared compilations (D197)

Three compiled publisher pages are separately available by explicit shared-page
consent. Luminous is documented in the [pilot](docs/data/luminous-shared-page-pilot.md).
The [Water and Gratitude review](docs/data/paired-shared-page-expansion.md) records
full individual CC BY-NC 4.0 notices: Water ©2006 Ṭhānissaro Bhikkhu, revised
4 August 2010; Gratitude ©2002, revised 30 November 2013. English remains live,
with complete source notices and citations; it is not bundled or relicensed.
Counts and quote results concern shared pages, not individually aligned translations.

## Reviewed ATI verse excerpts (D205–D208)

Nine Olendzki pages are separately scoped verse excerpts: Ānanda1037–1039, Sirimaṇḍa448–452, Kāḷudāyin527–529, Udāyin700–701, Aṅgulimāla871–873, Heraññakāni145, Aññāsi-Koṇḍañña675 , Nālaka725 and MN34’s three concluding verses. Each complete ©2005 Andrew Olendzki notice was individually reviewed: free distribution, clear derived-source identification and full licence retention are required; this is not Creative Commons or a new grant. Runtime returns the full page-specific notice/citation with every excerpt and excludes editorial prefaces. English bodies are not bundled. Whole-unit coverage, source freshness and word-level alignment are not inferred. See [the initial pilot](docs/data/thag-excerpt-review.md) and [four-page review](docs/data/olendzki-excerpt-expansion.md) for source boundaries, pins and limits.

The [Nālaka/Koṇḍañña review](docs/data/nalaka-kondanna-scope-review.md) preserves publisher Sn720 separately from VRI725 and retains the complete Nālaka Ṭhānissaro page despite its numbering offset. Incomplete DN21 Ṭhānissaro and SN12.22 Walshe bindings are withheld. DN21 retains its separate dhammatalks link; SN12.22 has no other indexed English version. Their original ©1999 CC BY-NC4.0 and ©1985 BPS free-distribution/≤50-reprint notices respectively remain unchanged; withholding does not grant new rights.

The [priority prose and Dasabala review](docs/data/priority-prose-and-dasabala-review.md) scopes MN34’s three ending verses separately from its prose and translator’s note, preserving its full ©2005 Olendzki notice. AN6.54 Olendzki and AN10.27 Nyanaponika remain withheld as incomplete pages; Nyanaponika’s notice preserves both ©1981 and ©1999 BPS statements and its ≤50-reprint condition. The SN12.21/22 repair changes index ownership, not VRI wording; the false SN12.21 commentary association is removed without inventing an alignment.

D209 follow-up: SN12.22 Walshe is restored only as the exact229:977 substring of `sn12.22/4`, with explicit version2 partial scope, original ©1985 BPS full notice and ≤50-copy reprint limit. Its seven editorial notes are excluded from translation wording. At D209 there were ten partial sources/four partial-only units, with unchanged whole-English counts. SN12.21 receives only its own source-backed short commentary. See [scope and rights evidence](docs/data/dasabala-commentary-and-subparagraph.md).

D210 activates deliberately narrower Walshe selections for SN12.60, SN22.87, SN35.244 (publisher35.203) and SN56.22. They retain the original complete ©1985 BPS notices and page-specific dates; the first three select one full prose paragraph and the fourth four closing stanzas, explicitly excluding the inline colophon from translation. They are partial-only, require consent and add no whole-English coverage. Fourteen partial sources/eight partial-only units are current. [Scope and rights evidence](docs/data/walshe-excerpt-batch.md).
