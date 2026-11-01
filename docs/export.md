# Citation index export

The citation index is a table of every citable text in the bundled canon (8,544 texts) with the places it can be found: its standard citation ID, its book and paragraph numbers in the VRI edition, its page in the Pali Text Society (PTS) edition, and the English translations it is linked to. It is published for developers, researchers and other tools, in the spirit of the bulk data that Sefaria and Quran.com publish.

It contains **no scripture text and no translation text**: only IDs, Pāli titles, paragraph numbers, page references, translator names and links.

## Where to get it

- **Each GitHub release** has the files attached: open the [Releases page](https://github.com/DaniilKi/pali-canon-claude/releases) and download them. Their checksums are in `SHA256SUMS.txt`.
- **This documentation site** serves the current version under `export/`: [citation-index.json](export/citation-index.json), [citation-index.csv](export/citation-index.csv) and [the licence notice](export/citation-index-LICENSE.md).
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
| `english` | Linked translations: source, translator, the translator's own reference, URL, `translation_id` for the tools, licence label and how the link was matched | dhammatalks.org and Access to Insight |
| `english_inherited_from` | When the links belong to a larger text that contains this one (for example a Dhammapada chapter), its ID | `null` |

The CSV columns are the same, flattened: `id, citation, title, pitaka, collection, kind, approximate, vri_book, vri_file, vri_paragraphs, pts, pts_volume, pts_page, pts_end_page, members, english_inherited_from, english_count, english_urls, english_translators`.

Translation links follow the project's strict rules: no link is better than a wrong link, and in the Saṃyutta and Aṅguttara texts are never linked by number alone. Numbering differences are visible in the `reference` field (for example, `AN 3.65` links to Ṭhānissaro Bhikkhu's translation, whose own reference is AN 3:66). See the [citation guide](citations.md).

## Licence

The Pāli titles and page markers come from the Chaṭṭha Saṅgāyana Tipiṭaka of the Vipassana Research Institute, which VRI makes freely available **for non-commercial use with attribution**. Credit: *Vipassana Research Institute (VRI), Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org*. Linked translations stay with their publishers and keep their own licences (dhammatalks.org: CC BY-NC 4.0; Access to Insight: varies by page, labelled on each link). Do not sell this data or the content it points to. Citation numbering follows the public scheme also used by SuttaCentral; no SuttaCentral content is included. Details: [THIRD_PARTY.md](../THIRD_PARTY.md).
