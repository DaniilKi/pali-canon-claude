# Research and architecture decisions

> **Historical record (v1, 31 October 2026). Superseded.** This describes version 1, which fetched texts from SuttaCentral. Version 2 stopped using SuttaCentral content because SuttaCentral asks that its work not be used in AI tools, and bundles the VRI Pāli text instead. For current sources see [../sources.md](../sources.md); for the reasoning see [../decisions.md](../decisions.md). Kept for its survey of other traditions' tools and of how Claude extensions work.

Reviewed 2026-10-31. This is a small source-retrieval project for personal study and community reuse. It does not attempt to create a new canon, translation, or religious authority.

## What Claude extensions do

- **MCP server:** exposes real retrieval tools, resources, and reusable prompts. This is the functioning connection to source material.
- **Skill:** instructions that guide Claude through a task, such as comparing translations while retaining attribution.
- **Plugin:** packages MCP configuration and skills together for installation in Claude Code.
- **Desktop extension (`.mcpb`):** packages the same local MCP server for installation in Claude Desktop, which supplies its Node runtime.
- **Remote connector:** a publicly reachable MCP service accessed from Anthropic's cloud. This release does not operate one.

The package therefore contains one shared read-only server, three focused skills, a Claude Code marketplace manifest, and a desktop bundle manifest. It needs no account database, embeddings, vector store, model API key, or paid hosting. Tool calls retrieve current upstream data rather than asking a model to remember scripture.

These choices follow Anthropic's [plugin manifest reference](https://code.claude.com/docs/en/plugins-reference), [plugin components guide](https://code.claude.com/docs/en/plugins/components), [skills guide](https://code.claude.com/docs/en/skills), and [MCP guide](https://code.claude.com/docs/en/mcp). The desktop bundle follows the [MCPB manifest specification](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md). Installation surfaces follow the [local MCP documentation](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) and [desktop versus web connector guidance](https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors).

## Existing scripture tools

GitHub REST API searches for `bible mcp`, `quran mcp`, `torah mcp`, and `sefaria mcp`, sorted by stars, supplied this bounded popularity sample. Values were checked on the date above. Stars indicate repository attention, not active users, correctness, completeness, or scholarly endorsement. Broader search engines that merely mention MCP and unrelated “story bible” tools were excluded. This is not a claim to rank every religious integration.

| Project | Stars | Useful pattern |
|---|---:|---|
| [quran/quran-mcp](https://github.com/quran/quran-mcp) | 120 | Grounded text, translations, commentary, and linguistic tools. |
| [djayatillake/studybible-mcp](https://github.com/djayatillake/studybible-mcp) | 89 | Exact passage lookup, original languages, word study, version comparison, cross-references, and explicit data licensing. |
| [djalal/quran-mcp-server](https://github.com/djalal/quran-mcp-server) | 73 | Small typed tools over an established text API: chapter, verse, search, translation and commentary discovery. |
| [tafsircenter/tafsir-mcp](https://github.com/tafsircenter/tafsir-mcp) | 73 | Commentary and word-level analysis; feature scope observed in repository metadata, not deeply audited. |
| [Sivan22/mcp-sefaria-server](https://github.com/Sivan22/mcp-sefaria-server) | 35 | Access to a structured text library through its existing API. |
| [Sefaria/sefaria-mcp](https://github.com/Sefaria/sefaria-mcp) | 26 | Publisher-maintained reference lookup, search, links, dictionaries, translations, hierarchy and catalogue information. |

Example reproducible query: [GitHub repository search API](https://api.github.com/search/repositories?q=bible%20mcp&sort=stars&order=desc&per_page=7). API values can differ from cached HTML; the Quran API-wrapper repository showed 73 in the live API versus 72 in a cached page.

[Sefaria's official MCP guide](https://developers.sefaria.org/docs/the-sefaria-mcp) is a particularly useful model: precise citation and library navigation are core functions. Scripture study benefits from reference resolution and edition discovery as much as broad search. The largest Bible tools also contain heavy offline databases, embeddings, manuscripts, and cultural-context datasets; those are useful elsewhere but unnecessary for this package's complete, smaller functional scope.

## Source selection

### SuttaCentral

[SuttaCentral](https://suttacentral.net/) is the principal text and catalogue provider. Its [server source](https://github.com/suttacentral/suttacentral/tree/main/server) and [Bilara data repository](https://github.com/suttacentral/bilara-data) provide an established ecosystem instead of a new scraping corpus. Available functions include metadata and translation discovery, segmented text, legacy text, parallels, search, and canon navigation. Segmented editions make Pali and translation alignment possible through shared segment IDs. Legacy editions retain their own paragraph layout; extracted paragraph offsets are not canonical numbers.

Coverage includes more than Pali texts, so language and tradition must remain visible in parallel results. Vinaya and Abhidhamma catalogue access does not establish complete English coverage. The tool rejects a missing requested translation instead of silently selecting another author. Source-specific rights remain separate from this project's MIT software licence; see [SuttaCentral's licensing page](https://suttacentral.net/licensing).

### Access to Insight

[Access to Insight](https://www.accesstoinsight.org/) supplies selected English translations, study guides, and modern Theravada essays. The implementation searches its sutta and subject indexes, then retrieves chosen HTML pages. This intentionally reports index discovery rather than pretending to offer exhaustive full-text search. Page attribution and copyright/licence notices accompany extracted content. Its [FAQ](https://www.accesstoinsight.org/faq.html#copyright) distinguishes page-specific terms and requires free distribution of copied or derived texts. An ATI essay is not labelled as a canonical discourse.

### Digital Pali Dictionary

[Digital Pali Dictionary](https://dpdict.net/) supplies live word lookup, summaries, and available grammatical or example material. No dictionary database is copied into the release. Its [licence documentation](https://docs.dpdict.net/license/) specifies CC BY-NC-SA 4.0; retrieved dictionary material keeps attribution, noncommercial, and share-alike conditions. A modern lexical gloss helps interpretation but is not itself a canonical quotation or proof of the best contextual translation.

### Supplementary sources

[Dhammatalks.org](https://www.dhammatalks.org/suttas/) is offered as a useful external reading destination. It is not represented as another implemented retrieval provider. Supporting arbitrary Buddhist websites would expand parsing and rights uncertainty without improving the reliable core paths.

[nbkhoi/sutta-mcp](https://github.com/nbkhoi/sutta-mcp) already provides a Buddhist MCP integration over SuttaCentral. This project does not claim to be the first. Its provider implementation is independent; no code from that noncommercial-licensed project was copied. This package adds Claude plugin/desktop distribution, study workflows, DPD lookup and Access to Insight retrieval.

## Functionality chosen from the research

1. Resolve common canonical references and supported URLs.
2. Search and browse texts, including actual language and author availability.
3. Retrieve bounded passages with Pali alignment, translator, stable IDs, URLs, and continuation.
4. Compare two to four actual translations, preserving nonsegmented alignment limits.
5. Discover textual parallels while retaining relation and tradition distinctions.
6. Look up Pali words through source-backed dictionary evidence.
7. Discover and read ATI pages with their reuse notices.
8. Teach repeatable study, comparison, and word-study workflows through skills and MCP prompts.

The implementation makes public HTTPS requests to a small source allowlist, checks redirects, bounds response sizes and text output, and reports upstream errors. No user-selected host, filesystem write, account mutation, persistent query database, or command execution is exposed as an MCP tool. The local server itself is not an anonymous public proxy.

## Evidence and limitations

Focused local tests and live retrieval smoke checks are proportionate to a small personal package. They establish the checked protocol and source paths, not semantic perfection or every possible reference. Keep build validation, live source retrieval, Claude installation, public GitHub release, and Anthropic directory acceptance separate. A release does not imply an official directory listing, and a working stdio server does not imply a functioning Claude web connector.

Anthropic documents local plugin development with `claude --plugin-dir PATH`, authoritative manifest validation with `claude plugin validate PATH`, and installation from a [marketplace manifest](https://code.claude.com/docs/en/plugin-marketplaces). Public distribution uses a GitHub repository and downloadable bundle; [official directory submission](https://code.claude.com/docs/en/plugins/publish) is a separate process.
