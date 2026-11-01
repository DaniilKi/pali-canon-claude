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
| **Paccaya** | A condition: one of the 24 ways one thing supports another, set out in the Paṭṭhāna, the last Abhidhamma book. The `patthana_condition` tool gives each one's Pāli definition and a short English gloss |

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
| **Variant reading** | A place where editions (Sinhala, Thai, PTS and others) differ; VRI records these in notes |
| **Mahāsaṅgīti** | SuttaCentral's Pāli edition, derived from VRI; public domain |

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
