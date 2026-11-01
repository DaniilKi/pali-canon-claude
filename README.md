# Pali Canon for Claude

**The Theravāda Buddhist scriptures, word for word, with exact citations: for Claude and the age of AI.**

Pali Canon for Claude gives Claude the complete Pāli Tipiṭaka, the scripture of Theravāda Buddhism. With it, Claude can read the actual text, quote it accurately, cite it precisely, and show published English translations side by side. It runs on your own computer and the Pāli text works without internet.

> Version 2.0.0 · Free and open source (MIT) · An independent community project, not affiliated with Anthropic or any Buddhist publisher.

---

## Contents

- [Why this exists](#why-this-exists)
- [What it does](#what-it-does)
- [What's inside](#whats-inside)
- [Our approach](#our-approach)
- [Sources at a glance](#sources-at-a-glance)
- [How accuracy is checked](#how-accuracy-is-checked)
- [Install](#install)
- [Using it well](#using-it-well)
- [What it does not do yet](#what-it-does-not-do-yet)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Contributing, privacy and licence](#contributing-privacy-and-licence)

---

## Why this exists

Theravāda Buddhism is the living tradition of Sri Lanka, Myanmar, Thailand, Cambodia and Laos, with well over 100 million followers worldwide. Its scripture, the **Pāli Canon** (*Tipiṭaka*, "three baskets"), is one of the largest scriptures of any religion: about 2.8 million words of Pāli.

Christians and Muslims already have many AI study tools, from Bible and Quran servers to Sefaria for Jewish texts. When this project started, we found **no Theravāda tool in Claude's connector directory**. Meanwhile, AI models answering questions about the Buddha's teaching often:

- paraphrase from memory and present it as a quotation;
- invent or garble citations ("MN 152" for a passage that is not there);
- confuse the different numbering systems that translators use;
- repeat popular quotes that are not in the texts at all.

**Our mission** is to bring the rigour of traditional and academic Buddhist scholarship together with the best openly available Pāli and Theravāda resources, in one modern tool built for AI. We start with Claude and will bring the same tool to other AI apps (Codex, ChatGPT, Gemini, code editors) while building a **proven, verifiable repository of knowledge**: every passage comes from a named source and every claim can be checked.

## What it does

Once installed, you can ask Claude things like:

| Ask Claude… | What happens |
|---|---|
| "Read me the Satipaṭṭhāna Sutta, MN 10, with a translation." | Claude retrieves the exact Pāli and Ṭhānissaro Bhikkhu's English, and cites the paragraph and the PTS page. |
| "What is on page S v 420 of the PTS edition?" | Claude finds the text that starts on that page (the Buddha's first discourse, SN 56.11). |
| "Compare translations of the Kālāma Sutta." | Claude shows the available English translations side by side against the Pāli, and notes that translators number it differently (AN 3.65 or AN 3.66). |
| "Where does the Buddha talk about *anicca* in the Saṃyutta?" | Claude searches the full Pāli text and reads the passages before answering. |
| "What does *dukkha* mean grammatically?" | Claude looks the word up in the Digital Pāḷi Dictionary. |
| "Is 'holding on to anger is like drinking poison' a Buddha quote?" | Claude searches the texts and tells you what they do and do not contain. |

Claude quotes only what it retrieved, names the translator, and keeps four things separate: **the Pāli text, the translation, the dictionary meaning, and its own explanation**.

## What's inside

| Part of the canon | What it is | Texts | English linked |
|---|---|---:|---|
| **Sutta Piṭaka** | Discourses of the Buddha and his disciples: the long, middle-length, connected and numbered collections (DN, MN, SN, AN) and the Khuddaka Nikāya (Dhammapada, Sutta Nipāta, Theragāthā, Jātaka and more) | 6,999 | 1,773 texts (DN, MN, SN, AN, Dhp, Ud, Iti, Snp, Thag, Thig, Khp) |
| **Vinaya Piṭaka** | Monastic discipline: the rules for monks and nuns and their origin stories, the Khandhakas and the Parivāra | 443 | not yet |
| **Abhidhamma Piṭaka** | Systematic analysis of mind and matter: seven books from the Dhammasaṅgaṇī to the Paṭṭhāna | 1,102 | not yet |
| **Total** | | **8,544** | |

- **The Pāli is complete**, from the Vipassana Research Institute's Chaṭṭha Saṅgāyana edition (the text of the Sixth Council, Yangon, 1954–56): 61 books, bundled and available offline.
- **Page references for the PTS edition** are included: 11,964 page markers, so scholarly citations such as "M i 55" work. Thai, Myanmar and VRI page markers are in the data too.
- **English translations** by Ṭhānissaro Bhikkhu (dhammatalks.org) and the many translators on Access to Insight are fetched live, with backup copies if a site is down.
- **A Pāli dictionary**: the Digital Pāḷi Dictionary, live.

The full breakdown by collection is in [docs/coverage.md](docs/coverage.md).

## Our approach

1. **Retrieve, never recall.** Claude reads the text from the bundled edition or a named translation every time. Nothing is generated from memory.
2. **Cite precisely.** Every passage carries its standard citation (MN 10), the VRI paragraph, the PTS volume and page, and the translator.
3. **Keep the layers distinct.** Scripture, translation, dictionary gloss, and Claude's own interpretation are always labelled separately.
4. **Be honest about uncertainty.** Different translators number some texts differently, and the canon abbreviates repeated passages. The tool reports both rather than hiding them.
5. **Honour the wishes of sources.** We use sources whose terms allow this use, credit them, and do not use material from people who have asked that their work not be used in AI tools.
6. **Prefer what lasts.** The Pāli is bundled, so it keeps working offline and if websites disappear. Online sources have official mirrors.
7. **Prove it.** Every one of the 8,544 texts is checked automatically before each release (see below).

The reasoning behind each choice is recorded in [docs/decisions.md](docs/decisions.md).

## Sources at a glance

| Source | What we use it for | How | Licence | Link |
|---|---|---|---|---|
| **Vipassana Research Institute (VRI)**, Chaṭṭha Saṅgāyana Tipiṭaka | The complete Pāli text and its page references | Bundled (offline) | Free for non-commercial use, with attribution to VRI | [tipitaka.org](https://www.tipitaka.org) · [data on GitHub](https://github.com/VipassanaTech/tipitaka-xml) |
| **Ṭhānissaro Bhikkhu**, dhammatalks.org | English translations | Fetched live; falls back to his Access to Insight versions | CC BY-NC 4.0 | [dhammatalks.org/suttas](https://www.dhammatalks.org/suttas/) |
| **Access to Insight** (Barre Center for Buddhist Studies) | English translations by many translators, study guides, topic index | Fetched live; falls back to the official GitHub copy and two other mirrors | Varies by page; each page's notice is returned | [accesstoinsight.org](https://www.accesstoinsight.org/) · [mirror](https://github.com/bcbsit/ati) |
| **Digital Pāḷi Dictionary** (Bodhirasa Bhikkhu) | Word meanings, grammar, roots | Fetched live | CC BY-NC-SA 4.0 | [dpdict.net](https://www.dpdict.net/) |
| **SuttaCentral** | Links only, for parallels and further translations | Not fetched: SuttaCentral asks that its work not be used in AI tools | n/a | [suttacentral.net](https://suttacentral.net/) |
| **Mahāsaṅgīti Pāli** (public domain) | Matching the standard citation numbers to the VRI text, once, when the data was built | Build time only; not shipped | Public Domain Mark 1.0 | [bilara-data](https://github.com/suttacentral/bilara-data) |

Considered and **not used** (with reasons), and the sources **planned** next, are listed in the [source library](docs/sources.md).

## How accuracy is checked

- **Every text, every release.** An automatic audit checks all 8,544 texts: each resolves by its citation, has text, does not overlap its neighbours, and its PTS page leads back to it. Result: 0 failures.
- **Checked against an independent edition.** All 1,190 canonical pages of Access to Insight and their PTS citations were compared with our mapping: 0 problems.
- **Translations are linked only with strong evidence.** A translation is attached only when its title, number or PTS page matches unambiguously. We prefer no link to a wrong link. 2,295 links pass this test.
- **Independent review.** A separate reviewer checked about 110 citations and every PTS lookup in its sample. The problems it found were fixed and are now permanent tests.
- **Outage drills.** We simulate each website going down and confirm that the backups take over and the Pāli still works.

Details: [docs/how-it-works.md](docs/how-it-works.md).

## Install

You need the free [Claude Desktop](https://claude.ai/download) app or Claude Code.

### Claude Desktop (easiest)

1. Download the latest **`pali-canon-<version>.mcpb`** file from the [Releases page](https://github.com/DaniilKi/pali-canon-claude/releases/latest).
2. Open Claude Desktop → **Settings → Extensions**, and drag the file onto the page (or use **Advanced settings → Install Extension…**).
3. Click **Install** and make sure the extension is switched on.
4. Ask: *"Use Pali Canon to read MN 10 with a translation and cite the PTS page."*

No account, key or extra software is needed. Claude Desktop provides everything the extension needs.

### Claude Code

Install [Node.js 20 or newer](https://nodejs.org/en/download), then type in Claude Code:

```text
/plugin marketplace add DaniilKi/pali-canon-claude
/plugin install pali-canon@pali-canon
```

Start a new session and try the three built-in study skills:

```text
/pali-canon:study MN 10
/pali-canon:compare AN 3.65
/pali-canon:pali-word anicca in SN 22.59
```

### Other AI apps

Codex, ChatGPT, Gemini, Cursor, VS Code and a hosted version for Claude on the web and phone are on the [roadmap](#roadmap). Technical users can already connect any MCP-compatible app; see [docs/development.md](docs/development.md#connect-any-mcp-client).

## Using it well

- **Cite the way you normally would.** MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, Thag 1.1, Ja 1, Pj 1, Kd 1, PTS pages like M i 55, or a link from SuttaCentral, Access to Insight or dhammatalks.org all work. Every accepted form is listed in the [citation guide](docs/citations.md).
- **Ask for a translator by name**, for example "with Ṭhānissaro's translation", or ask to compare all of them.
- **When the tool reports a numbering difference, keep both numbers** in what you write.
- **Remember it is a library, not a teacher.** It gives you the texts and their translations faithfully. Interpretation, and questions of practice, belong with the tradition and its teachers.

New to the terms? See the [glossary](docs/glossary.md).

## What it does not do yet

- English is linked for 1,773 texts, about a fifth of the canon. The Vinaya, the Abhidhamma and much of the Khuddaka Nikāya have no English yet.
- The commentaries (Aṭṭhakathā) and sub-commentaries (Ṭīkā) are not included yet.
- The Pāli is shown in Roman script only. Sinhala, Thai, Myanmar, Khmer and other scripts are planned.
- Translations and the dictionary need internet; the Pāli does not.
- It runs on your own computer. A hosted version for Claude on the web and phone is planned.

## Roadmap

Fifty issues are planned, under one tracking issue: [Roadmap: parity with Bible and Quran AI tools (#52)](https://github.com/DaniilKi/pali-canon-claude/issues/52). In short:

- **Reach:** a hosted version, Claude's connector directory, Codex, ChatGPT, Gemini, code editors, the MCP Registry, and support in many languages.
- **Study:** commentaries, word-by-word analysis, quote checking, other scripts, parallels between texts, topics, and people and places.
- **Practice:** Uposatha (observance day) calendar, festivals, chanting texts, daily readings.

How we compare with Bible, Quran and Sefaria tools, and why each item matters: [docs/roadmap.md](docs/roadmap.md).

## Documentation

| Document | For | What it covers |
|---|---|---|
| [Coverage](docs/coverage.md) | everyone | Exactly what is included, by collection |
| [Source library](docs/sources.md) | everyone | Every source: used, linked, planned or declined, and why, with links |
| [Citation guide](docs/citations.md) | everyone | Every citation form the tool understands, and the numbering differences |
| [Glossary](docs/glossary.md) | everyone | Pāli and technical terms explained |
| [Roadmap](docs/roadmap.md) | everyone | Comparison with other traditions' tools, and the plan |
| [How it works](docs/how-it-works.md) | curious readers | How the data was built and checked |
| [Decisions](docs/decisions.md) | contributors | Each major decision and its reasoning |
| [Development](docs/development.md) | developers | Building, testing, releasing, connecting other clients |
| [AGENTS.md](AGENTS.md) | AI agents | Full working context for agents working on this repository |
| [THIRD_PARTY.md](THIRD_PARTY.md) | everyone | Licences of the texts and dependencies |

## Contributing, privacy and licence

- **Found a wrong citation or a broken link?** Please [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the citation you used, what you expected (ideally with a PTS page) and what you got. Translators, scholars, monastics and native speakers of Sinhala, Thai, Burmese, Khmer and Lao are especially welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Privacy:** there are no accounts, analytics or stored questions. The Pāli is read on your computer. Translation and dictionary requests go to those public sites or their mirrors, which may keep ordinary web logs.
- **Licence:** the software is [MIT](LICENSE). **The texts are not:** each keeps its own terms, which are mostly non-commercial. Do not sell content retrieved with this tool. See [THIRD_PARTY.md](THIRD_PARTY.md).

### Acknowledgements

With gratitude to the Vipassana Research Institute; Ṭhānissaro Bhikkhu and Metta Forest Monastery; the Barre Center for Buddhist Studies and John Bullitt for Access to Insight; Bodhirasa Bhikkhu and the Digital Pāḷi Dictionary team; the Pali Text Society; and SuttaCentral, whose numbering we follow and whose wishes we respect.

*Sabbadānaṃ dhammadānaṃ jināti*: the gift of the Dhamma surpasses all gifts (Dhp 354).
