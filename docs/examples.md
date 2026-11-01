# Examples

Things you can ask once Pali Canon is installed, and what happens behind the scenes. The wording is only a suggestion: ask in your own words. Install guides for every app are on the [install page](install/README.md).

Every citation on this page is checked by an automated test, so it resolves to a real text in the bundled canon.

## Read a text

| Ask | What the assistant does |
|---|---|
| "Read me `MN 10` in Pāli with a translation, and cite the PTS page." | `resolve_reference`, then `get_text` with `translation: "default"`. You get the Pāli with VRI paragraph numbers and PTS page breaks, and Ṭhānissaro Bhikkhu's English with its licence. |
| "Show me `Dhp 183` and the verses around it." | `get_text` on the verse. The English link belongs to the whole chapter, and the tool says so. |
| "Read `Ud 1.10` with the variant readings." | `get_text` with `includeVariants: true`: the readings of other editions that VRI records in its notes. |

## Find a text from a citation, a page or a link

| Ask | What the assistant does |
|---|---|
| "What is on page `S v 420` of the PTS edition?" | `resolve_reference` finds the text that begins on that page, `SN 56.11`. If other texts also fall on that page, it lists them too. |
| "Which sutta is `M i 55`?" | The same lookup for the Majjhima Nikāya: `MN 10`. |
| "Open https://www.dhammatalks.org/suttas/MN/MN10.html in Pāli." | `resolve_reference` accepts translation links and finds the Pāli text they translate. |
| "Is `Sn 1.8` the same as `SN 1.8`?" | No. `Sn 1.8` is the Sutta Nipāta, `SN 1.8` the Saṃyutta Nikāya. See the [citation guide](citations.md). |

## Compare translations

| Ask | What the assistant does |
|---|---|
| "Compare the English translations of `AN 3.65`." | `compare_translations` puts the available translations side by side with the Pāli opening, and reports that some translators number this text AN 3.66. |
| "Compare translations of `MN 10`." | Up to four translations side by side, each with its translator and licence. If one you asked for is missing, the tool says so and lists what exists. |

## Search the texts

| Ask | What the assistant does |
|---|---|
| "Where does *anicca* appear in the Saṃyutta?" | `search_texts` with `collection: "sn"`, then `get_text` on the passages before quoting them. |
| "Find the phrase \"evaṃ me sutaṃ\" in the Dīgha Nikāya." | `search_texts` with a quoted phrase. Diacritics are optional: `evam me sutam` works too. |
| "Is 'holding on to anger is like drinking poison' in the Pāli Canon?" | `search_texts` on the key Pāli and English words. The assistant reports what the texts do and do not contain, and does not invent a source. |

## Words and sources

| Ask | What the assistant does |
|---|---|
| "What does *dukkha* mean grammatically?" | `lookup_pali` returns the Digital Pāḷi Dictionary entry. A dictionary gloss is reference material, not scripture. |
| "Find Access to Insight study guides on mindfulness." | `search_access_to_insight` searches its subject and sutta indexes. |
| "Which sources and licences does this use?" | `list_sources`. |

## Study commands

The three study skills work in Claude Code (`/pali-canon:study`), Codex (`$study`) and Gemini CLI (`/study`):

```text
study MN 10
compare AN 3.65
pali-word anicca in SN 22.59
```

## Good habits for the assistant

- Quote only what a tool returned, and cite the text ID with the VRI paragraph or PTS page.
- Name the translator of every English passage.
- Keep the Pāli, the translation, the dictionary meaning and its own explanation clearly apart.
- Report numbering differences instead of hiding them. The [citation guide](citations.md) explains them.
