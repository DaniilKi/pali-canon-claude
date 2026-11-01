# Checking a quotation (`verify_quote`)

Many sayings shared online as "the Buddha said" are not in the early texts. `verify_quote` checks a quotation against the texts themselves and reports what it finds. It is a library tool: it says what the searched texts contain, never who did or did not say something.

## What it searches

| Quotation in | Searched against | Network |
|---|---|---|
| **Pāli** | The whole bundled Pāli Tipiṭaka (VRI Chaṭṭha Saṅgāyana edition, 8,544 texts). Commentaries and later Pāli works are not included. | Offline |
| **English** | The English translations linked to the texts you name (`texts`, up to 12 citations, at most 60 pages). Without `texts`, the 26 chapters of the Dhammapada: one page per translator ([Ṭhānissaro Bhikkhu](https://www.dhammatalks.org/suttas/KN/Dhp/) and Acharya Buddharakkhita on [Access to Insight](https://www.accesstoinsight.org/tipitaka/kn/dhp/)), 52 pages. | Live, cached like other translations |

The language is detected automatically, or set `language` to `pali` or `english`.

## What it returns

- **verdict**: `found`, `close_paraphrase` or `not_found_in_scope`.
- **matches**: the best passages, each with its citation (`text_id`, `citation`, segment, VRI paragraph, PTS page for Pāli; translator, URL, attribution and licence for English) and a **similarity** from 0 to 1.
- **scope**: exactly which texts and translations were searched, and any page that could not be retrieved.

`not_found_in_scope` means only that the searched texts do not contain the words. The saying may come from a commentary, a later book, a translation that was not searched, or a modern author. Check the Pāli as well: two translations of the same verse can share few words.

## How matching works

Text is lower-cased and diacritics and punctuation are removed (so *manopubbaṅgamā* and *manopubbangama* are the same). Candidate passages are found through a word index built the first time the tool is used (about 50 MB, a few seconds); spelling variants are matched through shared three-letter sequences (trigrams). Each candidate is then scored:

- **similarity** = Dice coefficient of character trigrams between the quotation and the passage, weighted by how many of the quotation's distinctive words the passage contains. In Pāli, spaces are ignored (compounds are split differently by different writers) and the word weighting is gentler.
- `found` at 0.82 or more, `close_paraphrase` from 0.5, below that `not_found_in_scope`.

The tests (`tests/verify.test.mjs`) check 20 genuine quotations and 20 well-known misattributions, including "Holding on to anger is like grasping a hot coal…" and "Peace comes from within. Do not seek it without."
