# Third-party content and dependencies

The [MIT licence](LICENSE) covers this project's own software and documentation. It does **not** relicense scripture, translations, dictionary entries or upstream services.

## Bundled: Chaṭṭha Saṅgāyana Tipiṭaka (VRI)

`server/data/canon.json.gz` contains the Pāli text of the Tipiṭaka from the Vipassana Research Institute's [tipitaka-xml](https://github.com/VipassanaTech/tipitaka-xml) repository (romanised edition; the exact commit is recorded in the data file and reported by `list_sources`). VRI states that these files are "made freely available for non-commercial use" and asks that projects attribute the Vipassana Research Institute and stay in sync with its corrections. The text is reproduced without changes, apart from markup removal. Page references are VRI's own markers for the PTS, Myanmar, VRI and Thai editions. Rebuild the data from a newer commit to pick up VRI corrections ([scripts/canon/README.md](scripts/canon/README.md)).

## Citation numbering

The standard citation IDs (for example `sn46.131-140`, `pli-tv-bu-vb-pj1`) follow the public numbering scheme used by SuttaCentral and Bhikkhu Bodhi. To align those numbers with the VRI text, the build reads the file and segment names and the opening words of the Mahāsaṅgīti Pāli root in [bilara-data](https://github.com/suttacentral/bilara-data), which is marked Public Domain Mark 1.0. Only the resulting number-to-location mapping and the public-domain Pāli titles are kept. No SuttaCentral translation, comment or other text is fetched or bundled. SuttaCentral [asks](https://suttacentral.net/licensing) that its content not be used for generative AI or apps built on it, and this project respects that by linking to SuttaCentral rather than retrieving from it.

## dhammatalks.org (Ṭhānissaro Bhikkhu)

Translations are fetched live from [dhammatalks.org](https://www.dhammatalks.org/suttas/). They are licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) and attributed to Ṭhānissaro Bhikkhu. The site defines "commercial" to include any sale. The bundled translation index stores page titles and URLs only.

## Access to Insight

Pages are fetched live from [accesstoinsight.org](https://accesstoinsight.org/). If it is unavailable, they come from the official Barre Center for Buddhist Studies repository [bcbsit/ati](https://github.com/bcbsit/ati) (via raw.githubusercontent.com or jsDelivr), or from the [Digital Pali Reader mirror](https://github.com/digitalpalireader/accesstoinsight). Licences vary by page (CC BY-NC 4.0, BPS free-distribution terms, public domain and others), and each page's own notice is returned with its text. Do not sell ATI content. The bundled index stores PTS references, titles, translators and licence labels only.

## Access to Insight indexes (bundled topic index)

`server/data/topics.json` holds topic names, cross-references and links taken from Access to Insight's [General Index](https://www.accesstoinsight.org/index-subject.html) and [Numerical Index](https://www.accesstoinsight.org/index-number.html), read from commit `45fedca341497120651efa20e756b04a13e61089` of [bcbsit/ati](https://github.com/bcbsit/ati). The text of both pages is “by Access to Insight” and licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the attribution and licence are returned with every `topic` and `list_topics` result. Only names and links are kept, and each sutta link is mapped to a canon ID by this project. Documents linked from the indexes keep their own terms.

## Numbered lists (bundled)

`server/data/dhamma_lists.json` is this project's own curation (MIT): list names, Pāli member names as they appear in the VRI text, short English glosses written for the index, and citations. The Pāli passages themselves come from the bundled VRI text under VRI's terms.

## Digital Pāḷi Dictionary

Lookups go live to [dpdict.net](https://www.dpdict.net/). DPD is [CC BY-NC-SA 4.0](https://docs.dpdict.net/license/), by Bodhirasa Bhikkhu. No DPD data is bundled.

## Runtime dependencies

The bundled server includes the Model Context Protocol TypeScript SDK and its dependencies. Their licence notices are in `server/THIRD_PARTY_LICENSES.txt`.
