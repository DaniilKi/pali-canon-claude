# Pali Canon for Claude

**The Theravāda Buddhist scriptures, word for word, with exact citations: for Claude and the age of AI.**

Pali Canon for Claude gives Claude the complete Pāli Tipiṭaka, the scripture of Theravāda Buddhism. With it, Claude can read the actual text, quote it accurately, cite it precisely, and show published English translations side by side. It runs on your own computer and the Pāli text works without internet.

> Version 2.1.0 · Free and open source (MIT) · An independent community project, not affiliated with Anthropic or any Buddhist publisher.

---

## Contents

- [Why this exists](#why-this-exists)
- [What it does](#what-it-does)
- [What you can ask it](#what-you-can-ask-it)
- [What's inside](#whats-inside)
- [Our approach](#our-approach)
- [Sources at a glance](#sources-at-a-glance)
- [How accuracy is checked](#how-accuracy-is-checked)
- [Standalone web reader](docs/web-app.md)
- [Install](#install)
- [Using it well](#using-it-well)
- [Typing Pāli on an English keyboard](#typing-pāli-on-an-english-keyboard)
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

**Our mission** is to bring the rigour of traditional and academic Buddhist scholarship together with the best openly available Pāli and Theravāda resources, in one modern tool built for AI. We started with Claude. The same tool now also works in Codex, Gemini CLI and code editors, with ChatGPT and a hosted web version next. All the while we are building a **proven, verifiable repository of knowledge**: every passage comes from a named source and every claim can be checked.

## Standalone web reader

You can also browse and read without an AI client. Run `npm run build` and `npm run serve`, then open **http://localhost:8080/**. The responsive reader has compact phone find/study disclosures and includes separate canonical, commentary and later-work browsing/search, complete source books, linked English choices, a sourced glossary, word-by-word dictionary study, related-text evidence, dated daily verse/discourse readings, four sourced reading plans with bounded Pāli assignments and manual local progress, reading preferences and browser-local bookmarks/notes with previewed JSON restore. It is not deployed by this branch and does not yet provide offline browser downloads or account sync. See the [web-reader guide and next priorities](docs/web-app.md) and [development integration checkpoint](docs/evidence/web-reader/DEV_INTEGRATION.md).

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

## What you can ask it

Pali Canon gives the AI **34 tools**, 4 prompts, 3 reference resources and 5 skills. You do not need to know their names: ask in your own words and the AI picks the right tool. The tool names are shown in `code` for anyone who wants to check. Everything works offline unless marked *(internet)*.

### Study

- **Find and read any text.** Give a citation, a PTS page or a link and get the Pāli with its references (`resolve_reference`, `get_metadata`, `get_text`). Browse the canon book by book (`browse_canon`) or search the whole Pāli text (`search_texts`).
- **Read a complete source book.** `browse_canon` with `node: "books"` lists all 61 VRI root files. Read one with `get_text` using its `book` ID, including headings, invocations and introductory lines that sit outside individual citations. Use the returned `next_offset` to continue. Search the entire file, including passages outside individual citation spans, with `search_source_book`; its hits include exact reading commands. [Reading and citation details](docs/citations.md#complete-vri-source-books).
- **Read the Pāli in your own script.** Sinhala, Thai, Myanmar, Devanagari, Khmer, Lao or Lanna (Tai Tham), transliterated from the VRI edition; you can also type citations and search words in those scripts (`script` on `get_text`, `get_commentary`, `get_post_canonical`, `search_texts`, `search_commentary`, `search_post_canonical` and `resolve_reference`). The hosted reader also accepts script display and distinctly labelled commentary, post-canonical or complete-file selections. Lao and Lanna have no VRI script edition to test against yet.
- **Cite the Thai, Myanmar or VRI printed edition.** "Thai MN 1.103", "Myanmar Dhp 15" or "VRI SN 1.20 (Nidānavaggo)" finds the text on that page, and `get_text` marks where each edition's pages begin. See [citation formats](docs/citations.md).
- **See where the printed editions differ.** VRI's variant notes, split into readings with the editions (Sinhala, Thai, PTS and others) that carry them (`get_text` with `variants: "structured"`).
- **Read and compare translations** *(internet)*. Ṭhānissaro Bhikkhu, the translators on Access to Insight and Ānandajoti Bhikkhu, always named and attributed (`get_translation`, `compare_translations`, `search_access_to_insight`, `get_access_to_insight_text`).
- **Look up a Pāli word** in the Digital Pāḷi Dictionary (`lookup_pali`, live, answering from a bundled subset when offline), or **analyse a passage word by word**: split, grammar, root and meaning from the pinned subset (`analyse_passage`). It accepts canonical or post-canonical citations and complete-root-book selections; copy a segment reference from the corresponding reader. Later literature stays labelled as post-canonical, and words outside the subset stay unknown. A pronunciation guide explains how to read Pāli aloud (`pali://pronunciation`).
- **Ask in English or type Pāli without diacritics.** "Find the Satipatthana sutta", "lookup nibbana" or "search mindfulness of breathing" work: names, plain spellings and English words are understood, and the answer always says what was inferred (`glossary`, and every search and lookup tool). See [Typing Pāli on an English keyboard](#typing-pāli-on-an-english-keyboard).
- **Search the commentary.** Search all 47 included VRI commentary books, then read the exact matching passage (`search_commentary`). Hits are labelled as commentary and do not claim an alignment to a canonical text.
- **Read the commentary.** The traditional Pāli commentary (Aṭṭhakathā) on a text, aligned by VRI paragraph and always labelled as commentary, not canon (`get_commentary`, or `get_text` with `commentary: true`).
- **Find parallels and cross-references.** Other texts that share a passage with this one word for word, and texts the traditional commentary cites when explaining it, each link saying where it comes from and how it was matched, plus the SuttaCentral link for parallels in other traditions (`get_parallels`). See [D59](docs/decisions.md).
- **Read later Pāli classics.** The Visuddhimagga ("Vism 1.1", "Vism §19"), the Abhidhammatthasaṅgaha ("Abhidh-s 1.4"), the sub-commentaries (Ṭīkā) and chronicles such as the Mahāvaṃsa, labelled `canonical: false` (`get_post_canonical`, `search_post_canonical`, or `search_texts` with `include_post_canonical`). Visuddhimagga PTS pages cannot be looked up yet.
- **Ask who or where.** "Who was Anāthapiṇḍika?" lists the texts that name a person or place and links to the Dictionary of Pāli Proper Names (`lookup_name`).
- **Explore by topic or list.** "Texts on anger", "What are the five hindrances?": over 400 topics from Access to Insight's indexes and 37 numbered lists with their source passages (`topic`, `list_topics`, `dhamma_list`). See [topics and lists](docs/topics.md).
- **Abhidhamma and Vinaya.** The matrix (mātikā) of the Dhammasaṅgaṇī (`abhidhamma_matika`), the 24 conditions of the Paṭṭhāna (`patthana_condition`), and any of the 227 monks' rules with a link to the *Buddhist Monastic Code* that explains it (`vinaya_rule`).
- **Find Dhamma talks** *(internet)* by Ṭhānissaro Bhikkhu on a topic or a sutta, as links only (`find_talks`).
- **Study skills.** `study` reads and explains a passage, `compare` compares translations, `pali-word` explains a word in context, and `method` keeps genre, early text, commentary and school differences apart.

### Practice

- **Uposatha and festivals.** Observance days and the dates of Vesak, Āsāḷha Pūjā, the Rains Retreat and more, for Thai Mahānikāya, Thai Dhammayut, Myanmar and Sri Lanka (`uposatha`, `festivals`). The dates are computed and labelled as such; your monastery's calendar decides. See [the calendar guide](docs/calendar.md).
- **Chanting.** Paritta and other commonly recited texts (Maṅgala, Ratana, Karaṇīyamettā and more) in Pāli, with links to English (`paritta`).
- **Daily reading.** A Dhammapada verse or a sutta for the day (`daily_text`), and reading plans such as the Dhammapada in 26 days or the Majjhima Nikāya in a year (`reading_plan`).
- **Learn by heart.** The `memorise` skill (and the `memorise_passage` prompt in Claude Desktop) breaks a passage into short parts, quizzes you with fill-in-the-blanks and suggests when to review.

### Checking quotes and citations

- **"Did the Buddha really say this?"** `verify_quote` checks a quotation. Pāli is checked against the whole canon offline; English against the linked translations *(internet)*, by default the Dhammapada. It compares complete retrieved source versions, explicitly lists versions that could not be compared, and says whether the words were found, closely paraphrased or not found in the texts searched, and it never claims who did or did not say something. You can also choose which linked translation versions to check, including an earlier version from the same translator. See [checking a quotation](docs/verify-quote.md).
- **Check every citation in an essay.** Paste an essay, a talk transcript or a reference list, and `find_citations` finds each citation (MN 10, S v 420, links…) and checks that it points to a real text.

Every tool only reads; none can change anything. The full technical list is in [docs/development.md](docs/development.md#tools), and more example requests are in [docs/examples.md](docs/examples.md).

## What's inside

| Part of the canon | What it is | Texts | English linked |
|---|---|---:|---|
| **Sutta Piṭaka** | Discourses of the Buddha and his disciples: the long, middle-length, connected and numbered collections (DN, MN, SN, AN) and the Khuddaka Nikāya (Dhammapada, Sutta Nipāta, Theragāthā, Jātaka and more) | 6,999 | 1,857 texts (DN, MN, SN, AN, Dhp, Ud, Iti, Snp, Thag, Thig, Khp) |
| **Vinaya Piṭaka** | Monastic discipline: the rules for monks and nuns and their origin stories, the Khandhakas and the Parivāra | 443 | not yet |
| **Abhidhamma Piṭaka** | Systematic analysis of mind and matter: seven books from the Dhammasaṅgaṇī to the Paṭṭhāna | 1,102 | 4 texts (parts of the Dhammasaṅgaṇī and Vibhaṅga) |
| **Total** | | **8,544** | |

- **The Pāli is complete**, from the Vipassana Research Institute's Chaṭṭha Saṅgāyana edition (the text of the Sixth Council, Yangon, 1954–56): 61 books, bundled and available offline.
- **Page references for the PTS edition** are included: 11,964 page markers, so scholarly citations such as "M i 55" work. Thai, Myanmar and VRI page markers (56,050) are shown and can be cited too.
- **English translations** by Ṭhānissaro Bhikkhu (dhammatalks.org), the many translators on Access to Insight and Ānandajoti Bhikkhu (Ancient Buddhist Texts) are fetched live, with backup copies if a site is down.
- **A Pāli dictionary**: the Digital Pāḷi Dictionary, live, with a bundled subset for word-by-word analysis and offline lookups.
- **The commentaries** (Aṭṭhakathā) aligned to the texts, and **109 post-canonical books** (the Visuddhimagga, Abhidhammatthasaṅgaha, sub-commentaries and chronicles), from the same VRI edition, bundled and always labelled as not canon.

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
| **Ānandajoti Bhikkhu**, Ancient Buddhist Texts | Line-by-line Pāli and English translations (153 links: Udāna, Dhammapada, DN 16 and more) | Fetched live | CC BY-SA 3.0 | [ancient-buddhist-texts.net](https://ancient-buddhist-texts.net/) |
| **Digital Pāḷi Dictionary** (Bodhirasa Bhikkhu) | Word meanings, grammar, roots, word-by-word analysis | Fetched live; a subset (release v0.4.20261026) is bundled for analysis and offline lookups | CC BY-NC-SA 4.0 | [dpdict.net](https://www.dpdict.net/) |
| **SuttaCentral** | Links only, for parallels and further translations | Not fetched: SuttaCentral asks that its work not be used in AI tools | n/a | [suttacentral.net](https://suttacentral.net/) |
| **Mahāsaṅgīti Pāli** (public domain) | Matching the standard citation numbers to the VRI text, once, when the data was built | Build time only; not shipped | Public Domain Mark 1.0 | [bilara-data](https://github.com/suttacentral/bilara-data) |

Considered and **not used** (with reasons), and the sources **planned** next, are listed in the [source library](docs/sources.md).

## How accuracy is checked

- **Every text, every release.** An automatic audit checks all 8,544 texts: each resolves by its citation, has text, does not overlap its neighbours, and its PTS page leads back to it. Result: 0 failures.
- **Citation metadata cross-check.** The existing audit compares 1,190 Access to Insight canonical page entries and their PTS hints with our mapping. This checks citation metadata, not every English page’s completeness or individual discourse scope; source-level reviews remain necessary.
- **Standalone browser reading.** The bundled HTTP server includes a responsive scripture and study reader, without an AI account. See [how to run it and its source/storage boundaries](docs/web-app.md). Phone and remote access require a reachable host; the documentation site is separate.
- **Shared publisher pages stay separate.** Twelve reviewed ATI pages (eight compilations and four condensed pages) concern 110 actual indexed source records. Some are original Pāli range records, not separate individually translated passages. Explicit consent, complete notices and page-level quotation results preserve that distinction. See [the range review](docs/data/condensed-primary-ranges.md) [Mother/Protectors review](docs/data/family-protectors-review.md) and [seven-page attribution audit](docs/data/iti-range-binding-audit.md).
- **Translations are linked only with strong evidence.** A translation is attached only when its title, number or PTS page matches unambiguously, or an individually reviewed story correspondence establishes its scope. We prefer no link to a wrong link. The current index has 2,556 ordinary link records, including 63 content-based placements. Their recorded evidence and automatic audit are not a complete semantic review of every source page. Unsafe bindings discovered during review are withheld; see [the latest excerpt-binding review](docs/data/ordinary-excerpt-bindings-review.md).
- **Independent review.** A separate reviewer checked about 110 citations and every PTS lookup in its sample. The problems it found were fixed and are now permanent tests.
- **Outage drills.** We simulate each website going down and confirm that the backups take over and the Pāli still works.

Details: [docs/how-it-works.md](docs/how-it-works.md).

## Evaluation

We measure whether answers cite correctly instead of just saying so. The suite in [`evals/`](evals/) has 189 questions: the kind of thing a user asks, the citations a correct answer must give, and checks that call the server's tools. Categories: citation and PTS-page resolution, numbering traps (AN 7.64 vs AN 7.68; the Kālāma Sutta is AN 3.65 here but AN 3:66 on dhammatalks.org), abbreviated texts, quote checking, edition pages, scripts, variants, the calendar, lists and topics, Vinaya rules, Abhidhamma, reading plans, paritta, translation availability and refusals of invalid citations. Every expected citation is checked against the bundled canon each time the suite runs.

Offline tool checks (`npm run evals`, run by CI on every change), November 2026:

| Result | Questions |
|---|---|
| Passed | 183 (100% of those run) |
| Failed | 0 |
| Skipped | 6: they need the network (`npm run evals -- --live`: all 6 passed on 1 November 2026, including the English misattribution checks, which CI does not run) |

Model-level runs, where Claude or Codex answers the questions with the server connected and must cite the expected texts, are scripted in [`evals/claude-plugin-eval/`](evals/claude-plugin-eval/) (`claude plugin eval`) and [`evals/codex/`](evals/codex/) (`codex exec`). They need a model and are run by hand; their scores will be added here once run.

## Install

Pick the app you use. Every option runs the same server, with the same 34 tools.

### Claude Desktop (easiest)

Full guide: [docs/install/claude-desktop.md](docs/install/claude-desktop.md).

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

Start a new session and try the five built-in skills:

```text
/pali-canon:study MN 10
/pali-canon:compare AN 3.65
/pali-canon:pali-word anicca in SN 22.59
/pali-canon:method Kv 1
/pali-canon:memorise Dhp 1
```

Full guide, updating and troubleshooting: [docs/install/claude-code.md](docs/install/claude-code.md).

The skills also work in other AI apps that read `SKILL.md` files (`npx skills add DaniilKi/pali-canon-claude`), but they need the Pali Canon server installed too.

### Codex (CLI and app)

Pali Canon works in OpenAI's Codex as a plugin (tools plus the `$study`, `$compare`, `$pali-word`, `$method` and `$memorise` skills) or as a plain MCP server (tools only). You need [Node.js 20 or newer](https://nodejs.org/en/download).

```sh
# Plugin: add this repository as a marketplace, then run /plugins inside Codex and install "Pali Canon"
codex plugin marketplace add DaniilKi/pali-canon-claude

# Or just the server, from a downloaded copy of this repository
codex mcp add pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

Full steps and troubleshooting: [docs/install/codex.md](docs/install/codex.md). This setup has not yet been tried in a real Codex install; please tell us how it goes.

### Gemini CLI and Antigravity CLI

Install [Node.js 20 or newer](https://nodejs.org/en/download), then run:

```sh
gemini extensions install https://github.com/DaniilKi/pali-canon-claude
```

Antigravity CLI users can then import it with `agy plugin import gemini`. Full steps: [docs/install/gemini.md](docs/install/gemini.md).

### Code editors and agent apps

[![Add Pali Canon to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pali-canon&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsInBhbGktY2Fub24tbWNwIl19) [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Pali_Canon-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522pali-canon%2522%252C%2522type%2522%253A%2522stdio%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522pali-canon-mcp%2522%255D%257D) [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Pali_Canon-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522pali-canon%2522%252C%2522type%2522%253A%2522stdio%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522pali-canon-mcp%2522%255D%257D)

Cursor, VS Code, Windsurf, Zed, Cline and Goose: step-by-step setup (needs Node.js 20 or newer) is in [docs/install/ide.md](docs/install/ide.md).

> **Note.** The buttons above, and every `npx -y pali-canon-mcp` command, will work once the npm package is published. That has not happened yet. Until then, download this repository and use `node` with the full path to the server instead: `node /path/to/pali-canon-claude/server/index.cjs`. The [editor guide](docs/install/ide.md#without-npm-any-app-today) shows how.

### Local AI models

Running a model on your own computer (LM Studio, Open WebUI, Ollama)? See [Use it with local AI models](docs/install/local-clients.md). The Pāli text, search and citation lookup work fully offline.

### Hosted version and Docker

A web version lets Claude on the web and on phones connect by address, with nothing to install. **It is not online yet:** the code is ready, but it has not been deployed to a hosting service. This section will give the address once it is live.

You can already run your own copy with Docker or Node.js; see [docs/hosting.md](docs/hosting.md). It needs no sign-in and logs no request content.

### Other MCP apps

Technical users can connect any app that supports MCP (the Model Context Protocol). Use the command `npx` with the arguments `-y pali-canon-mcp` once the npm package is published, or today `node /path/to/pali-canon-claude/server/index.cjs`. See [docs/development.md](docs/development.md#connect-any-mcp-client).

### ChatGPT

The hosted version can be added to ChatGPT as an app, with a reading view that shows the Pāli and English side by side, with the citation, PTS page and translator. It is not submitted yet, because it needs the hosted version first. See [docs/listings/chatgpt.md](docs/listings/chatgpt.md).

## Using it well

- **Cite the way you normally would.** MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, Thag 1.1, Ja 1, Pj 1, Kd 1, PTS pages like M i 55, or a link from SuttaCentral, Access to Insight or dhammatalks.org all work. Every accepted form is listed in the [citation guide](docs/citations.md).
- **Ask for a translator by name**, for example "with Ṭhānissaro's translation", or ask to compare all of them.
- **When the tool reports a numbering difference, keep both numbers** in what you write.
- **Remember it is a library, not a teacher.** It gives you the texts and their translations faithfully. Interpretation, and questions of practice, belong with the tradition and its teachers.

New to the terms? See the [glossary](docs/glossary.md).

## Typing Pāli on an English keyboard

You do not need Pāli letters. Type the way your keyboard lets you, and every answer says what it understood, so nothing is silently changed.

- **No diacritics:** "samyutta", "nibbana", "satipatthana". Search ignores diacritics anyway. A dictionary lookup lists every word spelled with those letters: "nibbana" gives both *nibbāna* (extinguishment) and *nibbana* (desireless), marked `inferred_spelling`.
- **Common English-keyboard spellings:** "sanyutta" (saṃyutta), "nyana" (ñāṇa), "nirvana" (nibbāna, marked as a Sanskrit or English form). When an exact search finds little, the search also tries spellings that differ only in *h* after a consonant, double letters, *ny*/*ñ* or *ṃ*/*n*, and says so (`spelling_note`).
- **Typing schemes:** Velthuis ("sa.myutta", "pa~n~naa", "nibbaana") and Harvard-Kyoto ("saMyutta"). Velthuis dots and tildes never occur in English words, so they are always read. Harvard-Kyoto capitals, doubled vowels and English-keyboard spellings are read only when the result is a word in the canon, so ordinary English ("vacuum", "McDonald", "NASA") is left alone.
- **Sutta names:** "Satipatthana Sutta", "Dhammacakkappavattana", "anapanasati sutta" or an English title such as "Mindfulness of Breathing" find the text (`matched_by: "name"`). When a name belongs to several texts, as the Metta Sutta does (Snp 1.8, Kp 9 and others), you get the list to choose from; the tool never picks one for you. "samyutta 56 11" is read as SN 56.11.
- **Questions in English:** a search such as "mindfulness of breathing" or "suffering" is turned into Pāli words (sati, assāsapassāsa; dukkha…) from the Digital Pāḷi Dictionary's English index, and the answer lists exactly which Pāli words were searched (`expanded_from_english`). Set `english: "off"` to search only what you typed. The `glossary` tool looks words up in both directions. Glossary meanings are dictionary labels for finding words, not translations of the texts.

## What it does not do yet

- Whole-unit English is linked for 1,861 texts, about a fifth of the canon. Fourteen separately scoped excerpts require explicit partial-source consent. The Vinaya, nearly all of the Abhidhamma and much of the Khuddaka Nikāya have no English yet.
- The commentaries (Aṭṭhakathā) and sub-commentaries (Ṭīkā) are not included yet.
- Other scripts are transliterated by this server from the Roman edition, not taken from printed script editions. Lao and Lanna have not yet been checked against a printed edition or by native readers.
- Translations and the dictionary need internet; the Pāli does not.
- It runs on your own computer. A hosted version for Claude on the web and phone is built but not online yet.

## Roadmap

Fifty issues are planned, under one tracking issue: [Roadmap: parity with Bible and Quran AI tools (#52)](https://github.com/DaniilKi/pali-canon-claude/issues/52). In short:

- **Reach:** putting the hosted version online, Claude's connector directory, ChatGPT, the MCP Registry and community directories, and support in many languages. The Codex, Gemini CLI and code editor packages are done and waiting for hands-on testing.
- **Study:** commentaries, word-by-word analysis, parallels between texts, more translators and other languages. Quote checking, citation finding, topics, numbered lists, people and places, other scripts, edition page citations and structured variants are done. Search by meaning was tested and deferred ([why](docs/semantic-search.md)).
- **Practice:** the uposatha calendar, festivals, chanting texts, daily readings and memorisation are done. Chanting-book layouts and recordings wait on publishers' permission.

How we compare with Bible, Quran and Sefaria tools, and why each item matters: [docs/roadmap.md](docs/roadmap.md).

## Documentation

The [docs site](https://daniilki.github.io/pali-canon-claude/) shows these pages in a browser (it goes live once GitHub Pages is switched on). AI agents can read [llms.txt](llms.txt).

| Document | For | What it covers |
|---|---|---|
| [Coverage](docs/coverage.md) | everyone | Exactly what is included, by collection |
| [Source library](docs/sources.md) | everyone | Every source: used, linked, planned or declined, and why, with links |
| [Citation guide](docs/citations.md) | everyone | Every citation form the tool understands, and the numbering differences |
| [Glossary](docs/glossary.md) | everyone | Pāli and technical terms explained |
| [Examples](docs/examples.md) | everyone | Example requests and the tools that answer them |
| [Checking a quotation](docs/verify-quote.md) | everyone | How `verify_quote` works and what its answers mean |
| [Calendar](docs/calendar.md) | everyone | How uposatha and festival dates are computed, per tradition |
| [Topics and lists](docs/topics.md) | everyone | Looking texts up by subject or numbered list |
| [Other languages](docs/i18n/README.md) | everyone | Machine-drafted guidance in Sinhala, Thai, Burmese, Khmer, Lao, Vietnamese, Chinese and Spanish, awaiting native review. Scripture and citations are never translated |
| [Citation index export](docs/export.md) | researchers | Every citation ID with its VRI paragraph, PTS page and translation links, as JSON and CSV (no scripture text) |
| [Roadmap](docs/roadmap.md) | everyone | Comparison with other traditions' tools, and the plan |
| [How it works](docs/how-it-works.md) | curious readers | How the data was built and checked |
| [Decisions](docs/decisions.md) | contributors | Each major decision and its reasoning |
| Install guides | everyone | Step-by-step setup for [Claude Code](docs/install/claude-code.md), [Codex](docs/install/codex.md), [Gemini](docs/install/gemini.md), [code editors](docs/install/ide.md) and [local models](docs/install/local-clients.md) |
| [Hosting](docs/hosting.md) | self-hosters | Running the web version with Docker, Fly.io or Render |
| [Directory listings](docs/listings/README.md) | maintainers | The MCP Registry entry and the packets for community directories, including the [Claude plugin directory](docs/listings/claude-code-marketplace.md) |
| [Development](docs/development.md) | developers | Building, testing, releasing, connecting other clients |
| [AGENTS.md](AGENTS.md) | AI agents | Full working context for agents working on this repository |
| [THIRD_PARTY.md](THIRD_PARTY.md) | everyone | Licences of the texts and dependencies |
| [PRIVACY.md](PRIVACY.md), [TERMS.md](TERMS.md) | everyone | Privacy policy and terms of use |
| [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | contributors | Reporting security problems; community standards |
| [HANDOFF.md](HANDOFF.md) | maintainers | Every task left for a person to do |

## Contributing, privacy and licence

- **Found a wrong citation or a broken link?** Please [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the citation you used, what you expected (ideally with a PTS page) and what you got. Translators, scholars, monastics and native speakers of Sinhala, Thai, Burmese, Khmer and Lao are especially welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Privacy:** there are no accounts, analytics or stored questions. The Pāli is read on your computer. Translation and dictionary requests go to those public sites or their mirrors, which may keep ordinary web logs. See the [privacy policy](PRIVACY.md) and [terms of use](TERMS.md).
- **Security problems:** please report them privately; see [SECURITY.md](SECURITY.md). Everyone taking part follows our [code of conduct](CODE_OF_CONDUCT.md).
- **Licence:** the software is [MIT](LICENSE). **The texts are not:** each keeps its own terms, which are mostly non-commercial. Do not sell content retrieved with this tool. See [THIRD_PARTY.md](THIRD_PARTY.md).

### Acknowledgements

With gratitude to the Vipassana Research Institute; Ṭhānissaro Bhikkhu and Metta Forest Monastery; the Barre Center for Buddhist Studies and John Bullitt for Access to Insight; Bodhirasa Bhikkhu and the Digital Pāḷi Dictionary team; the Pali Text Society; and SuttaCentral, whose numbering we follow and whose wishes we respect.

*Sabbadānaṃ dhammadānaṃ jināti*: the gift of the Dhamma surpasses all gifts (Dhp 354).

The [Dasabala follow-up](docs/data/dasabala-commentary-and-subparagraph.md) restores SN12.21’s own short commentary and provides SN12.22’s concluding exhortation as an exact, consent-scoped substring. At D209, nine verse excerpts plus this prose excerpt made ten partial sources; none adds whole-unit English coverage.

The [four-page Walshe review](docs/data/walshe-excerpt-batch.md) replaces four whole-discourse claims with precise, consent-scoped selections. There are now fourteen partial sources and eight partial-only units. Original publisher numbering, complete BPS notices and unchanged Pāli remain available.
