# Directory listings

This folder holds everything needed to list Pali Canon for Claude in the official MCP Registry and in community directories. Nothing here has been submitted yet. A maintainer submits each one by hand, because every directory needs a sign-in. The open maintainer steps are tracked in [issue #14](https://github.com/DaniilKi/pali-canon-claude/issues/14).

An **MCP server** is a small program that lets an AI app (Claude, Codex, Cursor and others) use a tool. A **directory** or **registry** is a website where people find such tools. Listing the server is how most people will discover it.

## Order of work

1. **npm first** ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)). Most directories install servers with `npx -y pali-canon-mcp`, which only works once the package is on npm.
2. **Official MCP Registry** ([mcp-registry.md](mcp-registry.md)). Other directories copy from it. PulseMCP says it will pick listings up from there.
3. **Community directories**, in any order: [Glama](glama.md), [mcp.so](mcp-so.md), [Smithery](smithery.md), [PulseMCP](pulsemcp.md).
4. **awesome-mcp-servers** ([awesome-mcp-servers.md](awesome-mcp-servers.md)), after Glama, so the entry can carry Glama's badge.
5. **When the hosted version is live** ([#5](https://github.com/DaniilKi/pali-canon-claude/issues/5)): put its address in `server.json`, publish a new registry version, and add the hosted URL on Smithery.

## Shared facts (use the same words everywhere)

| Field | Value |
|---|---|
| Name | Pali Canon (repository: Pali Canon for Claude) |
| Registry name | `io.github.DaniilKi/pali-canon` |
| npm package | `pali-canon-mcp` |
| Install command | `npx -y pali-canon-mcp` |
| Repository | https://github.com/DaniilKi/pali-canon-claude |
| Issues | https://github.com/DaniilKi/pali-canon-claude/issues |
| Licence | MIT for the code. The texts keep their own licences (non-commercial; see [THIRD_PARTY.md](../../THIRD_PARTY.md)). |
| Icon | [`assets/icon.svg`](../../assets/icon.svg) (512 px PNG: [`assets/icon.png`](../../assets/icon.png), made by `python scripts/render-icon.py`), served at https://raw.githubusercontent.com/DaniilKi/pali-canon-claude/main/assets/icon.svg (available once this folder is on `main`) |
| Categories | Religion and spirituality; Education; Research; Reference; Art and culture |
| Runs | Locally (stdio) on macOS, Windows and Linux, with Node.js 20 or newer. A hosted version is planned (#5). |
| Needs an API key | No |

**Keywords:** Pali, Tipitaka, Theravada, Buddhism, sutta, scripture, Pali Canon, Tipiṭaka, Theravāda, dhamma, citation, PTS, translation, dictionary.

**Short description** (at most 100 characters, the registry's limit):

> The whole Pāli Tipiṭaka offline: cite, read and search it, with live English and a dictionary.

**One-line description** (for lists):

> The complete Pāli Canon (Theravāda Buddhist scripture) for AI: read the real text, resolve any sutta or PTS citation, search offline, and compare English translations.

**Long description:**

> Pali Canon gives AI assistants the complete Pāli Tipiṭaka, the scripture of Theravāda Buddhism, so they quote and cite the real text instead of paraphrasing from memory. It bundles the whole VRI Chaṭṭha Saṅgāyana edition (8,544 citable texts, about 2.8 million words) for offline reading. It resolves citations such as MN 10, SN 56:11 and Dhp 183, and PTS pages such as M i 55, and runs full-text Pāli search. English translations by Ṭhānissaro Bhikkhu (dhammatalks.org), from Access to Insight and by Ānandajoti Bhikkhu (Ancient Buddhist Texts) are fetched live, with backup mirrors, and always attributed. Digital Pāḷi Dictionary lookups are live, with a bundled subset for word-by-word analysis and offline lookups. The commentaries (Aṭṭhakathā) and 109 post-canonical books (the Visuddhimagga, Abhidhammatthasaṅgaha, sub-commentaries) are bundled too, always labelled as not canon. Numbering differences between editions are reported, not hidden. It is read-only and needs no API key. The texts keep their own non-commercial licences.

**What it offers:** 33 read-only tools: 11 core tools (`resolve_reference`, `get_metadata`, `get_text`, `get_translation`, `compare_translations`, `search_texts`, `browse_canon`, `lookup_pali`, `search_access_to_insight`, `get_access_to_insight_text`, `list_sources`) and 22 study and practice tools (`verify_quote`, `find_citations`, `lookup_name`, `topic`, `list_topics`, `dhamma_list`, `abhidhamma_matika`, `patthana_condition`, `vinaya_rule`, `paritta`, `find_talks`, `daily_text`, `reading_plan`, `uposatha`, `festivals`, `get_commentary`, `search_commentary`, `get_post_canonical`, `search_post_canonical`, `analyse_passage`, `get_parallels`, `glossary`); 4 prompts (`study_passage`, `compare_translations`, `topic_research`, `memorise_passage`) and 3 resources (`pali://sources`, `pali://canon-guide`, `pali://pronunciation`).

**Example questions** (for directories that show them):

- "Show me the Pāli of MN 10 with an English translation."
- "Which text starts on PTS page S v 420?"
- "Compare the English translations of Dhp 183."
- "Find passages where *mettā* and *karuṇā* appear together."

Keep the numbers in step with `npm run coverage`.

## Status

| Directory | Packet | Status |
|---|---|---|
| Claude Connectors Directory (hosted server) | [claude-connector.md](claude-connector.md) | Ready; waits for the hosted endpoint (#5) and tool titles |
| Official MCP Registry | [mcp-registry.md](mcp-registry.md) | Ready; waits for npm (#4) |
| Glama | [glama.md](glama.md) | Ready (`glama.json` is in the repository) |
| mcp.so | [mcp-so.md](mcp-so.md) | Ready; best after npm (#4) |
| Smithery | [smithery.md](smithery.md) | Ready for the `.mcpb` bundle; hosted URL waits for #5 |
| PulseMCP | [pulsemcp.md](pulsemcp.md) | Closed to submissions; takes listings from the official registry |
| awesome-mcp-servers | [awesome-mcp-servers.md](awesome-mcp-servers.md) | Entry line ready |
| ChatGPT app | [chatgpt.md](chatgpt.md) | Packet ready; waits for the hosted address (#5) and an OpenAI account |

Update this table when a listing goes live.
