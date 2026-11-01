# Glossary

Terms used in this project, explained for newcomers. Pāli words are given with diacritics; the tool accepts them with or without.

## The canon

| Term | Meaning |
|---|---|
| **Theravāda** | "Teaching of the elders": the Buddhist tradition of Sri Lanka, Myanmar, Thailand, Cambodia and Laos, and of many communities worldwide |
| **Pāli** | The classical Indian language in which the Theravāda scriptures are preserved |
| **Tipiṭaka** | "Three baskets": the Pāli Canon, made of the Sutta, Vinaya and Abhidhamma Piṭakas |
| **Sutta** | A discourse, usually of the Buddha or a senior disciple. Sanskrit *sūtra* |
| **Sutta Piṭaka** | The basket of discourses: five collections (*nikāya*) |
| **Nikāya** | A collection: Dīgha (long, DN), Majjhima (middle-length, MN), Saṃyutta (connected, SN), Aṅguttara (numbered, AN) and Khuddaka (minor) |
| **Khuddaka Nikāya** | The "minor collection": Dhammapada, Udāna, Sutta Nipāta, Theragāthā, Therīgāthā, Jātaka and others. The Burmese canon, which VRI follows, also includes the Milindapañha, Nettippakaraṇa and Peṭakopadesa |
| **Vinaya Piṭaka** | The basket of monastic discipline: the rules (Vibhaṅga), the procedures and history (Khandhaka) and a summary (Parivāra) |
| **Pātimokkha** | The core list of monastic rules, recited at each Uposatha |
| **Abhidhamma Piṭaka** | The basket of systematic teaching: seven books analysing mind and matter |
| **Vagga** | A chapter or group within a collection |
| **Saṃyutta** | A thematic group of suttas within the Saṃyutta Nikāya (SN 56 is on the noble truths) |
| **Nipāta** | A numbered book of the Aṅguttara Nikāya (AN 3 is "the threes") |
| **Peyyāla** | An abbreviation of repeated text, marked "…pe…" in the Pāli. Texts the edition only abbreviates are marked *approximate* |
| **Gāthā** | A verse |
| **Mātikā** | The "matrix" of headings at the start of the Dhammasaṅgaṇī, the first Abhidhamma book: 22 triads (*tika*, three-way divisions such as wholesome, unwholesome, indeterminate) and 142 dyads (*duka*, two-way divisions), 100 Abhidhamma dyads and 42 Suttanta dyads. The `abhidhamma_matika` tool lists them |
| **Paccaya** | A condition: one of the 24 ways one thing supports another, set out in the Paṭṭhāna, the last Abhidhamma book. The `patthana_condition` tool gives each one's Pāli definition and where it is in the text; for an English meaning, look the Pāli term up with `lookup_pali` |

## Commentaries and later works

| Term | Meaning |
|---|---|
| **Aṭṭhakathā** | The commentaries, mostly compiled by Buddhaghosa and others in the 5th century CE from older Sinhala material |
| **Ṭīkā** | Sub-commentaries on the commentaries |
| **Visuddhimagga** | "The Path of Purification", Buddhaghosa's classic summary of Theravāda practice and doctrine |
| **Abhidhammatthasaṅgaha** | The standard medieval handbook of Abhidhamma |

## Editions and citations

| Term | Meaning |
|---|---|
| **Chaṭṭha Saṅgāyana** | "Sixth Recitation": the council held in Yangon, Myanmar, 1954–56, whose edited text this tool bundles |
| **VRI** | Vipassana Research Institute, which digitised the Chaṭṭha Saṅgāyana text and publishes it at tipitaka.org |
| **PTS** | Pali Text Society (founded 1881), whose printed editions give the page numbers scholars cite: "M i 55" means Majjhima, volume 1, page 55 |
| **Standard numbering** | The sutta numbering used by Bhikkhu Bodhi's translations and SuttaCentral; this tool's citations use it |
| **PTS-based numbering** | The older numbering used for parts of SN and AN by Ṭhānissaro Bhikkhu and Access to Insight |
| **VRI paragraph** | The paragraph numbers printed in the VRI edition, used to locate passages precisely |
| **Thai / Myanmar / VRI edition page** | Page breaks of three printed editions recorded in the VRI files: the Thai (Siam Raṭṭha) edition, the Myanmar (Chaṭṭha Saṅgāyana) edition and VRI's own printed edition. Cited with the edition name and collection, "Thai MN 1.103" (volume.page), "Myanmar Dhp 15", "VRI SN 1.20 (Nidānavaggo)"; see [citation formats](citations.md#thai-myanmar-and-vri-edition-pages). They are not variant sigla: *syā.* in a variant note is the Thai edition's reading, not its page |
| **Variant reading** | A place where editions (Sinhala, Thai, PTS and others) differ; VRI records these in notes |
| **Mahāsaṅgīti** | SuttaCentral's Pāli edition, derived from VRI; public domain |

## Variant readings

The VRI edition prints, in its notes, readings found in other printed editions where they differ from the Chaṭṭha Saṅgāyana text. A note such as *pīti (sī. pī.), pītī (ka.)* means: the Sinhala and PTS editions read *pīti*; the edition marked *ka.* reads *pītī*. `get_text` with `variants: "structured"` splits each note into readings and the editions (sigla) that carry them, and keeps the note verbatim beside them. The meanings below are VRI's own, from its [help page](https://tipitaka.org/help) ("version abbreviations"). The sigla were counted in the 18,725 notes of the bundled root texts.

| Siglum | Meaning | Notes |
|---|---|---|
| **sī.** | Sri Lankan edition | Sinhala (*Sīhaḷa*) |
| **syā.** | Thai edition | Siamese (*Syāma*) |
| **pī.** | Pali Text Society edition | |
| **kaṃ.** | Cambodian edition | |
| **ka.** | Cambodian edition, per VRI | VRI gives "kaṃ. / ka." as Cambodian, but some notes cite both side by side (for example *syā. kaṃ. ka.*), so they are probably different witnesses. The tool keeps the siglum as printed and never merges it with *kaṃ.* |
| **aṭṭha.** (after a siglum) | That edition's commentary (*aṭṭhakathā*) | *sī. aṭṭha.* = the reading of the Sri Lankan commentary, not the root text. Returned as `part: "commentary"` |
| **ṭīkā** (after a siglum) | That edition's sub-commentary | Returned as `part: "sub-commentary"` |
| **sabbattha** | "Everywhere": all (other) editions | Returned as `scope` |
| **bahūsu** | "In many" editions | Returned as `scope` |
| **katthaci** | "In some" editions | Returned as `scope` |

*Omissions* are not readings either. *( ) natthi (sī. pī.)* means the passage printed in parentheses in the text is absent (*natthi*) from the Sinhala and PTS editions; *idaṃ padaṃ natthi (…)* means this word is absent from them. These are returned as `omissions`, with the editions, never as a reading of the word *natthi*. A bare *natthi (…)* without the *( )* is ambiguous and stays a remark.

Other notes are not readings and are returned unchanged as *remarks*: cross-references (*dī. ni. 1.157*, *ma. ni.*, *saṃ. ni.*, *a. ni.*), queries marked *(?)*, and editorial comments such as *evamuparipi* ("likewise further on") or *aṭṭhakathāyaṃ pāṭhantaraṃ* ("a variant reading in the commentary"). *machasaṃ.* (the Myanmar Chaṭṭha Saṅgāyana edition, used in other editions' notes) does not occur in the root-text notes. Notes whose reading text contains an editorial phrase (*na dissati* "is not found", *idaṃ padaṃ* "this word", *potthakesu* "in the books", *passitabbaṃ* "see", *oloketabbā* "consult", *aṭṭhakathā* "the commentary", *imissā gāthāya* "in this verse") are remarks, as are notes with nested or unbalanced parentheses, which are kept whole. Together, readings, omissions and remarks cover every character of the note. Obvious spelling slips (*si.*, *syā* without a full stop) are matched to their siglum and the printed form is kept as `as_printed`.

The bundled data keeps each note with its paragraph, not at the word it follows, so the tool does not say which word a reading replaces; find it in the paragraph.

## Practice

| Term | Meaning |
|---|---|
| **Dhamma** | The Buddha's teaching; also "phenomenon" or "truth". Sanskrit *dharma* |
| **Saṅgha** | The community of monks and nuns; more broadly, the community of practitioners |
| **Bhikkhu / Bhikkhunī** | Fully ordained monk / nun |
| **Uposatha** | Observance day, on the full, new and half moons, when lay people may keep extra precepts and monastics recite the Pātimokkha |
| **Vassa** | The three-month rains retreat |
| **Paritta** | Protective chants, such as the Maṅgala, Ratana and Karaṇīyamettā Suttas |
| **Vesak** | The festival marking the Buddha's birth, awakening and passing |
| **Poya** | Sri Lankan name for an uposatha day; the full-moon poya is a public holiday |
| **Māgha Pūjā, Āsāḷha Pūjā** | Full-moon festivals of the Māgha and Āsāḷha months; tradition links them to the Ovāda-pāṭimokkha and the first discourse ([calendar](calendar.md)) |
| **Pavāraṇā** | The "invitation" ceremony that ends the rains retreat |
| **Kaṭhina** | Offering of cloth to monks in the month after the rains retreat |
| **Adhikamāsa / adhikavāra** | In the Thai lunar calendar, a year with an extra month (a second Āsāḷha) / with an extra day |
| **Watat** | In the Burmese calendar, a year with an extra month (a First Waso) |
| **Pakkhagaṇanā** | The fortnight reckoning kept by the Thai Dhammayut order, whose uposatha day can differ from the civil calendar's by one day, earlier or later |
| **Tithi** | A lunar day: the time for the moon to move 12° further from the sun; Sri Lankan poya days follow it |

## Technical terms

| Term | Meaning |
|---|---|
| **Claude** | Anthropic's AI assistant |
| **MCP** | Model Context Protocol: the open standard by which AI apps such as Claude connect to tools like this one |
| **MCP server** | A program offering tools to an AI app. This project is one |
| **Tool** | One action the server offers, such as "get the text of MN 10" |
| **Skill** | Written instructions that teach the AI how to do a task well (`SKILL.md`). Shared by Claude, Codex and others |
| **Plugin** | A package of tools and skills for Claude Code (or Codex) |
| **Desktop extension (`.mcpb`)** | A one-file package for Claude Desktop |
| **Connector** | An MCP server added to Claude, especially a hosted one usable on the web and phone |
| **Mirror** | An official copy of a website, used when the site is down |
| **Offline** | Works with no internet connection |
| **Audit** | The automatic check of all 8,544 texts run before each release |
| **Semantic search** | Search by meaning rather than by exact words, using *embeddings* (lists of numbers that place texts with similar meaning close together). Evaluated and deferred: see [semantic-search.md](semantic-search.md) |
