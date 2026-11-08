# Citation index export

The citation index is a table of every citable text in the bundled canon (8,544 texts) with the places it can be found: its standard citation ID, its book and paragraph numbers in the VRI edition, its page in the Pali Text Society (PTS) edition, and the English translations it is linked to. It is published for developers, researchers and other tools, in the spirit of the bulk data that Sefaria and Quran.com publish.

It contains **no scripture text and no translation text**: only IDs, Pāli titles, paragraph numbers, page references, translator names and links.

## Where to get it

- **Each GitHub release** has the files attached: open the [Releases page](https://github.com/DaniilKi/pali-canon-claude/releases) and download them. Their checksums are in `SHA256SUMS.txt`.
- **The documentation site** serves the current version: [citation-index.json](https://daniilki.github.io/pali-canon-claude/export/citation-index.json), [citation-index.csv](https://daniilki.github.io/pali-canon-claude/export/citation-index.csv) and [the licence notice](https://daniilki.github.io/pali-canon-claude/export/citation-index-LICENSE.md). These files are built when the site is deployed and are not stored in the repository. Until GitHub Pages is switched on for the repository, use a release or build the files yourself.
- **Build it yourself** from a copy of the repository: `node scripts/export-index.mjs` writes the files to `dist/export/` (add `--out <folder>` to choose another place).

## The files

| File | Contents |
|---|---|
| `citation-index.json` | The source edition (with its pinned commit), the licence notice, and one record per text |
| `citation-index.csv` | One row per text. Cells with several values are joined with ` \| ` |
| `citation-index-LICENSE.md` | Where the data comes from and what its licences allow |

Each JSON record has:

| Field | Meaning | Example (`MN 10`) |
|---|---|---|
| `id` | Standard citation ID | `mn10` |
| `citation` | How it is usually written | `MN 10` |
| `title` | Pāli title from the VRI edition | `Satipaṭṭhānasutta` |
| `pitaka`, `collection` | Basket and collection | `sutta`, `Majjhima Nikāya` |
| `kind` | `text`, or `range` for a group of short or abbreviated texts | `text` |
| `approximate` | `true` when the canon abbreviates the text and its boundaries are approximate | `false` |
| `vri` | VRI book title, source file and paragraph numbers | `Mūlapaṇṇāsapāḷi`, `s0201m.mul.xml`, `105–138` |
| `pts` | PTS reference: label, volume, first and last page | `M i 55–63` |
| `members` | For a range: the texts it contains | |
| `english` | Linked translations: source, translator, the translator's own reference, URL, `translation_id` for the tools, licence code (`license`) and its readable name (`license_name`, see the table below), and how the link was matched | dhammatalks.org, Access to Insight and Ancient Buddhist Texts |
| `english_inherited_from` | When the links belong to a larger text that contains this one (for example a Dhammapada chapter), its ID | `null` |

The CSV columns are the same, flattened: `id, citation, title, pitaka, collection, kind, approximate, vri_book, vri_file, vri_paragraphs, pts, pts_volume, pts_page, pts_end_page, members, english_inherited_from, english_count, english_urls, english_translators, english_references, english_translation_ids, english_licenses, partial_english_count, partial_english, shared_english_count, shared_english`. The legacy `english_*` link cells include only whole-unit sources, excluding shared pages and list one value per link in the same order, so the second licence in `english_licenses` belongs to the second URL in `english_urls`. `english_licenses` holds the readable licence names.

`english_count` counts whole-unit links; `partial_english_count` counts partial links separately in JSON and CSV. JSON `english` entries preserve each partial link’s complete `translation_scope`, source/version identity, reading commands and licence, with `whole_unit_coverage: false`. CSV `partial_english` is a JSON array of those entries, preserving boundaries and field association even when captions contain commas, quotes, line breaks or ` | `. `english_inherited_from` applies to whole-unit links only. No real partial source is currently activated.

`shared_english_count` and CSV `shared_english` separately describe shared-page links. The CSV value is a JSON array preserving the publisher’s complete member list, source identity, fingerprint and explicit lack of individual alignment. JSON `english` entries retain the same `translation_scope` (`kind: shared_page`). A link can appear in each declared member’s record; these row counts are not independent pages or complete translations. Deduplicate by `translation_id` and `translation_scope.scope_sha256` to count shared pages. `english_count` excludes them. Three real compiled ATI pages are activated separately: AN 1.49–52, AN 1.45–46 and indexed AN 2.32–33; three pages, eight subjects, no new whole-unit English coverage. Each presentation and notice pin remains in the scope descriptor; see [the pilot](data/luminous-shared-page-pilot.md) and [paired-page review](data/paired-shared-page-expansion.md).

The JSON file also has a `license_labels` object that explains every licence code.

Translation links follow the project's strict rules: no link is better than a wrong link, and in the Saṃyutta and Aṅguttara texts are never linked by number alone. Numbering differences are visible in the `reference` field (for example, `AN 3.65` links to Ṭhānissaro Bhikkhu's translation, whose own reference is AN 3:66). See the [citation guide](citations.md).

## Licence labels on translation links

| `license` code | Used on | Readable name (`license_name`, CSV `english_licenses`) | What the page's notice allows |
|---|---|---|---|
| `CC BY-NC 4.0` | dhammatalks.org | CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial 4.0 International) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) |
| `CC-BY-NC` | Access to Insight | CC BY-NC (Creative Commons Attribution-NonCommercial) | Creative Commons Attribution-NonCommercial; the page states the version (4.0 on the pages we checked) |
| `BPS` | Access to Insight | BPS free-distribution terms (Buddhist Publication Society) | Copies free of charge, reprints of no more than 50 copies, derivatives marked as such, the licence text included; otherwise all rights reserved |
| `ATI_DEPRECATED` | Access to Insight | Access to Insight free-distribution licence (older, not Creative Commons) | Copies free of charge, derivatives marked as such, the licence text included; otherwise all rights reserved |
| `Olendzki-free-distribution-2005` | Reviewed ATI verse excerpts | Andrew Olendzki ©2005 free-distribution notice (not Creative Commons) | Copies free of charge, source/derivatives identified and complete licence retained; the full pinned page notice governs |
| `CC BY-SA 3.0` | Ancient Buddhist Texts (Ānandajoti Bhikkhu) | CC BY-SA 3.0 (Creative Commons Attribution-ShareAlike 3.0 Unported) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); the site's Copyright Notice gives 3.0 Unported, its page footers link 4.0. Share-alike: reuse keeps the same licence and credits Ānandajoti Bhikkhu |

`ATI_DEPRECATED` is Access to Insight's own name for its older free-distribution licence; it does not mean the page is withdrawn. Each Access to Insight page carries its full licence notice, and that notice governs. Read it before you reuse a page.

`Olendzki-free-distribution-2005` is an internal identifier for the two pinned source notices in the [partial pilot](data/thag-excerpt-review.md), not a publisher licence name or a new grant. Partial-source exports retain their separate scope and notice hash; they do not establish whole-unit English coverage.

## Licence

The Pāli titles and page markers come from the Chaṭṭha Saṅgāyana Tipiṭaka of the Vipassana Research Institute, which VRI makes freely available **for non-commercial use with attribution**. Credit: *Vipassana Research Institute (VRI), Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org*. Linked translations stay with their publishers and keep their own licences (dhammatalks.org: CC BY-NC 4.0; Access to Insight: varies by page, labelled on each link; Ancient Buddhist Texts: CC BY-SA 3.0). Do not sell this data or the content it points to. Citation numbering follows the public scheme also used by SuttaCentral; no SuttaCentral content is included. Details: [THIRD_PARTY.md](../THIRD_PARTY.md).
