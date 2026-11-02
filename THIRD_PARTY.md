# Third-party content and dependencies

The [MIT licence](LICENSE) covers this project's own software and documentation. It does **not** relicense scripture, translations, dictionary entries or upstream services.

## Bundled: Chaṭṭha Saṅgāyana Tipiṭaka (VRI)

`server/data/canon.json.gz` contains the Pāli text of the Tipiṭaka from the Vipassana Research Institute's [tipitaka-xml](https://github.com/VipassanaTech/tipitaka-xml) repository (romanised edition; the exact commit is recorded in the data file and reported by `list_sources`). VRI states that these files are "made freely available for non-commercial use" and asks that projects attribute the Vipassana Research Institute and stay in sync with its corrections. The text is reproduced without changes, apart from markup removal. Page references are VRI's own markers for the PTS, Myanmar, VRI and Thai editions. Rebuild the data from a newer commit to pick up VRI corrections ([scripts/canon/README.md](scripts/canon/README.md)).

`server/data/postcanonical.json.gz` holds post-canonical books from the same repository and commit (the Ṭīkā and Añña sections: `romn/*.tik.xml`, `romn/*.nrf.xml`, the Visuddhimagga and its Mahāṭīkā), under the same VRI terms and attribution, unchanged apart from markup removal; titles come from VRI's table of contents (`tipitaka.org/romn/tree.json`).

`server/data/commentary.json.gz` contains the commentaries (Aṭṭhakathā) of the same VRI repository and commit (`romn/*.att.xml`), under the same terms: free for non-commercial use, with attribution to the Vipassana Research Institute. The text is reproduced without changes, apart from markup removal; the build adds only the alignment of each passage to the root paragraph it explains. `get_commentary` returns VRI's attribution and terms with every result and labels the text as commentary.

`server/data/parallels.json.gz` is derived only from the bundled VRI canon and commentary above (same terms: non-commercial, attribution to the Vipassana Research Institute). It holds links between texts, the commentary words that make each citation (short excerpts, at most 400 characters) and segment references; no new text. No SuttaCentral data is fetched, bundled or derived: SuttaCentral appears only as a link. DharmaNexus (Dharmamitra) parallels and the parallels columns of the Digital Pāḷi Dictionary's sutta table are not used (see D59).

## Citation numbering

The standard citation IDs (for example `sn46.131-140`, `pli-tv-bu-vb-pj1`) follow the public numbering scheme used by SuttaCentral and Bhikkhu Bodhi. To align those numbers with the VRI text, the build reads the file and segment names and the opening words of the Mahāsaṅgīti Pāli root in [bilara-data](https://github.com/suttacentral/bilara-data), which is marked Public Domain Mark 1.0. Only the resulting number-to-location mapping and the public-domain Pāli titles are kept. No SuttaCentral translation, comment or other text is fetched or bundled. SuttaCentral [asks](https://suttacentral.net/licensing) that its content not be used for generative AI or apps built on it, and this project respects that by linking to SuttaCentral rather than retrieving from it.

## dhammatalks.org (Ṭhānissaro Bhikkhu)

Translations are fetched live from [dhammatalks.org](https://www.dhammatalks.org/suttas/). They are licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) and attributed to Ṭhānissaro Bhikkhu. The site defines "commercial" to include any sale. The bundled translation index stores page titles and URLs only.

The `vinaya_rule` tool links to sections of Ṭhānissaro Bhikkhu's *The Buddhist Monastic Code, Volume I* (third edition, revised 2025, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)) on [dhammatalks.org](https://www.dhammatalks.org/vinaya/bmc/Section0000.html). `server/data/bmc.json` stores only rule numbers, section URLs and chapter headings taken from the book's table of contents; the attribution and licence are returned with every result.
`find_talks` searches the site's own search page for Ṭhānissaro Bhikkhu's Dhamma talks (same CC BY-NC 4.0 licence) and returns talk titles, dates and links only. No talk text, transcript or search snippet is fetched into results or bundled. Requests are cached in memory and spaced at least one second apart, and `/Archive/MachineTranscripts/`, which the site's robots.txt disallows, is never requested.

## Access to Insight

Pages are fetched live from [accesstoinsight.org](https://accesstoinsight.org/). If it is unavailable, they come from the official Barre Center for Buddhist Studies repository [bcbsit/ati](https://github.com/bcbsit/ati) (via raw.githubusercontent.com or jsDelivr), or from the [Digital Pali Reader mirror](https://github.com/digitalpalireader/accesstoinsight). Licences vary by page (CC BY-NC 4.0, BPS free-distribution terms, public domain and others), and each page's own notice is returned with its text. Do not sell ATI content. The bundled index stores PTS references, titles, translators and licence labels only.

The `reading_plan` tool's study-guide plans list, in order, the texts cited by two of Ṭhānissaro Bhikkhu's Access to Insight study guides ([Into the Stream](https://www.accesstoinsight.org/lib/study/into_the_stream.html), © 2011 Metta Forest Monastery; [The Four Noble Truths](https://www.accesstoinsight.org/lib/study/truths.html), © 1999 Metta Forest Monastery; both CC BY-NC 4.0). Only the guides' citations and links are stored; none of their text is bundled or returned.
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

- **digitalpalidictionary/dpd-koreader** (MIT), <https://github.com/digitalpalidictionary/dpd-koreader>: the Velthuis table and its order (`dpd/velthuis.lua`), ṁ = ṃ and NFC handling (`dpd/normalize.lua`), and the English fuzzy key (strip diacritics, `kh` → `k`, collapse doubled consonants; `dpd/english.lua`). Copyright the Digital Pāḷi Dictionary project (Bodhirasa Bhikkhu and contributors).
- **tokushige-koyasan/corpus-search-toolkit** (MIT), <https://github.com/tokushige-koyasan/corpus-search-toolkit>: the conservative scheme detection of `scripts/to_iast.py` (ASCII markers, English lines left alone) and the spelling-variant classes of `scripts/variants.py` (doubled consonants, nasals before a consonant).
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
