# Checking a quotation (`verify_quote`)

Many sayings shared online as "the Buddha said" are not in the early texts. `verify_quote` checks a quotation against the texts themselves and reports what it finds. It is a library tool: it says what the searched texts contain, never who did or did not say something.

## What it searches

| Quotation in | Searched against | Network |
|---|---|---|
| **Pāli in Roman or a supported native script** | The whole bundled Pāli Tipiṭaka (VRI Chaṭṭha Saṅgāyana edition, 8,544 texts). Commentaries and later Pāli works are not included. | Offline |
| **English** | The English translations linked to the texts you name (`texts`, up to 12 citations, at most 80 pages). Without `texts`, the 26 chapters of the Dhammapada: one page per translator ([Ṭhānissaro Bhikkhu](https://www.dhammatalks.org/suttas/KN/Dhp/), Acharya Buddharakkhita on [Access to Insight](https://www.accesstoinsight.org/tipitaka/kn/dhp/) and Ānandajoti Bhikkhu on [Ancient Buddhist Texts](https://ancient-buddhist-texts.net/)), 77 pages. | Live, cached like other translations |

Explicit English `texts` scopes accept exact citations/indexed groups in Roman or a supported native script. Multi-text fallback spans and ambiguous pages return an error before any translation fetch. `scope.requested_texts` retains each original reference, its independent conversion labels, canonical ID, numbering/page/alignment notes and actual linked translation scope. Shared English pages are fetched once while retaining every request context.

A single verse may inherit a containing chapter translation. Such a comparison reports the containing source ID and `unverified_requested_text_ids` on matches and checked pages, with `scope_notes` and an explanation that correspondence to the narrower request is unverified. A match anywhere in a chapter cannot verify a specific requested verse. Provider/version `notes` stay separate from scope-resolution cautions, including after fallback or failed retrieval.

The language is detected automatically, or set `language` to `pali` or `english`. Supported native-script input is completely transliterated to Roman for Pāli comparison before language detection and word counting. Auto mode treats it as Pāli; this is a documented input assumption, not translation or a linguistic finding about regional-language prose. Explicit English mode refuses native input rather than changing the requested language. Incomplete mixed or unsupported script input returns an error before matching or fetching. Text with Pāli diacritics is Pāli; text with common English words (the, is, you, of...) is English. Only when neither is clear does detection look words up in the Pāli index, which builds that index (see below).

Submit at most **120 comparison words and 2,000 input characters** at a time. Native word counting uses the converted Pāli before any matching; an overlong quotation cannot bypass the limit by being written in another script. Longer word sequences return an error asking for shorter excerpts; the tool does not silently verify a prefix and issue a verdict for the whole quotation.

## What it returns

- **verdict**: `found`, `close_paraphrase` or `not_found_in_scope`.
- **matches**: the best passages, each with its citation (`text_id`, `citation`, segment, VRI paragraph, PTS page for Pāli; translator, URL, attribution and licence for English) and a **similarity** from 0 to 1.
- **quote**, **input_script**, **input_romanized**: the trimmed original quotation is retained; native Pāli conversion is separately labelled. Source excerpts remain in the original Roman VRI form.
- **comparison**: normally `method: "normalized_fuzzy"`, `verbatim: "not_assessed"`. A `found` verdict or similarity of `1` does not establish verbatim wording, a unique source or authorship. This distinction also applies to Roman and English input.
- **source_span**, **read_with**, **reading_commands**: for Pāli fuzzy matches, the actual rendered segment range in the selected text. Offsets start at zero and end_offset is exclusive. Follow reading_commands to retrieve the whole matched span; each command stays within the reader's 200-segment limit. read_with is the first command. Repeated wording elsewhere in the same text does not change these source-position anchors.
- **matched_text_truncated**: when present, the preview ends at a complete source word and adds an ellipsis. Retrieve the full span before quoting omitted words. Source characters and combining marks in the preview are retained; scores still describe normalized comparison.
- **scope**: exactly which texts and translations were searched, and any page that could not be retrieved.
- **equally_similar_texts**, **citation_note**: present when the same wording matches several texts equally well, such as a stock opening ("Evaṃ me sutaṃ...") or a verse repeated in another book. The note gives the number of texts (with `equally_similar_at_least` when there are more than were counted) and says that the matches listed are the first in canon order, not a unique source.
- **next_step**: for an English quotation that is not found, how to check the Pāli instead.

English matches and `scope.translations_checked` name the actual returned `translation_id`. If an outage caused the supported, labelled switch from dhammatalks.org to Ṭhānissaro's earlier ATI version, they also carry `requested_translation_id` and the provider's `notes` explaining the substitution. Keep those notes when reporting the match; the earlier version is not the requested version. Numbering, archive-mirror and inherited-text notes are preserved too. Entries in `scope.not_retrieved` carry the requested translation ID for an exact retry. If no page can be retrieved, the tool returns an error, not a `not_found_in_scope` verdict.

`not_found_in_scope` means only that the searched texts do not contain the words. For Pāli, the saying may come from a commentary, a later book or a modern author.

For English, it is not a finding about the saying at all. Many popular English wordings of real verses come from older or freer translations that are not searched. For example, a widely shared older wording of Dhp 5 ("Hatred does not cease by hatred...") shares few words with the translations searched and is reported as not found. The same verse in Pāli is found. So for an English quotation that is not found, the result says this and points to the Pāli check: find the Pāli of the passage (with `search_texts` or `get_text`) and run `verify_quote` on it with `language: "pali"`. The tests check this case.

## How matching works

Text is lower-cased and diacritics and punctuation are removed (so *manopubbaṅgamā* and *manopubbangama* are the same). Candidate passages are found through a word index built the first time a Pāli quotation is checked (a few seconds; see memory below); spelling variants are matched through shared three-letter sequences (trigrams). Candidate windows and their scoring stay within a citable source passage. Adjacent independent texts are never combined into one match. A quotation spanning members of a recorded group, such as adjacent Dhammapada verses, can match the containing group; its citation then covers every matched block. The excerpt is taken entirely from the cited text. Each candidate is then scored:

- **similarity** = Dice coefficient of character trigrams between the quotation and the passage, weighted by how many of the quotation's distinctive words the passage contains. In Pāli, spaces are ignored (compounds are split differently by different writers) and the word weighting is gentler.
- `found` at 0.82 or more, `close_paraphrase` from 0.5, below that `not_found_in_scope`.
- Texts whose best passage scores the same as the best match (to two decimals) are counted as equally similar. Up to 200 equally strong candidates are compared, so a larger count is reported as "at least".

English candidate retrieval and refinement stay within each fetched translation page. A preceding partial version cannot hide an exact match in the next source. Pāli group matches also retain any index-alignment caution; a recorded group is not proof that its members are separately aligned or that the edition abbreviates them. The reader's approximate badge describes the mapping rather than asserting source omission.

Native-input tests compare all eight supported scripts and five pinned VRI script-edition samples with Roman controls. These are mechanical conversion/source checks, not a native-edition collation or native-reader approval; Lao and Lanna still await native-reader review.

## Memory

The Pāli index is built once per server process, on the first Pāli check, and then kept. Measured on 1 November 2026 (Windows 11, Node.js 26): the build takes about 3.5 to 4 seconds. After garbage collection it holds about 30 MB of typed arrays plus about 16 MB of heap, and resident memory (RSS) stays roughly 50 to 80 MB higher than before. During the build, heap use grows by about 70 MB before it is collected, and resident memory can briefly be 100 MB or more above the starting point. These figures are approximate and vary between runs. English checks do not build the index unless the language has to be detected from a quotation with no common English words.

## Tests

The tests (`tests/verify.test.mjs`) check 20 genuine quotations and 20 well-known misattributions. The genuine Pāli quotations are built from the bundled text (some without diacritics, one misspelt) and the English ones are sliced from the fixture pages, so no scripture is typed into the tests. The misattributions include "Holding on to anger is like grasping a hot coal…" and "Peace comes from within. Do not seek it without."


## Printed source characters that cannot be converted

Some bundled VRI passages contain non-Roman characters within otherwise Roman text. If a pasted quotation cannot be converted but occurs unchanged in a readable canonical source segment, the tool reports `comparison.method: "literal_source_substring"`, retains the characters and returns exact `get_text` commands. `source_literal` gives the number of matching source blocks and confirms that no native conversion was used. The score of 1 denotes substring presence in this mode; no fuzzy threshold is applied.

This confirms what this bundled source prints. It does not correct the spelling, collate a native edition, prove unique wording or establish authorship; `comparison.verbatim` remains `not_assessed`. Altered or unsupported input without that source occurrence still fails. English mode and the canonical-only scope remain unchanged, and the 120-word limit still applies.


### Condensed pages covering several discourses

When reviewed metadata names a shared page, it concerns several discourses together and may use abbreviations or cross-references. It is excluded from ordinary English verification. Explicitly select member IDs in `texts` and set `include_shared: true` to compare that complete page. Results keep the publisher’s caption and full member list; a match has no individual `text_id`. Finding or not finding words on the page does not establish the wording, completeness or absence of any one discourse. These are separate counts, not additional complete translations. No real shared-page declaration is currently activated.

When shared pages are included, an ambiguity count is labelled `equally_similar_sources`: it counts compared source versions, not independently aligned canonical texts. `equally_similar_texts` is omitted for that comparison. Ordinary Pāli and whole-unit English comparisons keep their existing text-count behavior.


### Complete sources and the English comparison limit

English checking compares complete retrieved source versions, up to 2,000,000 UTF-16 code units per version. It does not treat a readable prefix as the whole source. A continuation offset, an unknown total length, a nonzero starting offset, inconsistent length metadata or an over-limit response prevents that version from being compared. If every selected version fails, the tool returns an error without a quotation verdict. Read the linked source directly or choose another version.

When other versions can be compared completely, results list only those under `scope.translations_checked`. Omitted versions remain in `scope.not_retrieved` with `compared: false`; incomplete responses carry `error_code: "INCOMPLETE_ENGLISH_SOURCE"`. Actual fallback identity, the requested version and provider notes are retained. `complete_source_versions_compared` and `source_versions_not_compared` count source versions, not texts or translation coverage. The explanation states that unexamined versions’ wording or absence is not established. Ordinary paginated reading remains available. This is completeness of the returned extraction, not independent proof of the publisher’s entire edition or paragraph alignment.
