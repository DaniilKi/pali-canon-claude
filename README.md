# Pali Canon for Claude

A Claude Code plugin and Claude Desktop extension for studying the **Tipiṭaka / Pāli Canon** with exact, cited sources.

- **The whole Pāli Canon is built in.** It's the Chaṭṭha Saṅgāyana Tipiṭaka from the Vipassana Research Institute (VRI), covering the Sutta, Vinaya and Abhidhamma Piṭakas. Reading, citation lookup, PTS page lookup and full-text Pāli search all work **offline**.
- **Any common citation resolves:** MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8 (or Sn 1.8), Ud 1.10, Iti 27, Thag 1.1, Ja 1, Pj 1, Kd 1, Cv 4, PTS pages (M i 55, S v 420, Vin iii 1), and links from SuttaCentral, Access to Insight or dhammatalks.org.
- **Numbering differences are handled, not hidden.** Ṭhānissaro Bhikkhu and Access to Insight number parts of SN and AN by the older PTS scheme. Their AN 7.64 is AN 7.68 in the standard numbering. Translations are linked by content, and both numbers are reported.
- **English translations come with mirrors.** Ṭhānissaro Bhikkhu (dhammatalks.org) and Access to Insight's translators are available. If accesstoinsight.org is down, its official GitHub copy is used. If dhammatalks.org is down, Ṭhānissaro's Access to Insight version is used.
- **Pāli dictionary:** lookups use the Digital Pāḷi Dictionary.

No API key, account or hosted service. This is an independent community project, not an official integration of Anthropic or any Buddhist publisher.

## Install in Claude Code

Install [Node.js 20+](https://nodejs.org/en/download), then in Claude Code:

```text
/plugin marketplace add DaniilKi/pali-canon-claude
/plugin install pali-canon@pali-canon
```

Start a new session (or `/reload-plugins`) and check `/mcp`. Then try:

```text
/pali-canon:study MN 10
/pali-canon:compare AN 3.65
/pali-canon:pali-word anicca in SN 22.59
```

## Install in Claude Desktop

1. Download the latest `pali-canon-<version>.mcpb` from [Releases](https://github.com/DaniilKi/pali-canon-claude/releases/latest).
2. In Claude Desktop, open **Settings → Extensions**, then drag the file onto the page, or use **Advanced settings → Install Extension…**. Click **Install** and make sure the extension is enabled.
3. Ask: "Use Pali Canon to read MN 10 with a translation and cite the PTS page."

Claude Desktop supplies Node.js for the extension. The `/pali-canon:…` skills are part of the Claude Code plugin. Desktop gets the equivalent `study_passage`, `compare_translations` and `topic_research` prompts.

## Tools

| Tool | Purpose | Network |
|---|---|---|
| `resolve_reference` | Any citation, PTS page or link → the text, its PTS location, VRI paragraphs, translations and numbering notes | offline |
| `get_metadata` | Details of a text, including linked translations (`translation_id`) and a SuttaCentral link for parallels | offline |
| `get_text` | Pāli text with VRI paragraph numbers, PTS page breaks and variant readings, paginated; optionally adds an English translation | offline (English: online) |
| `get_translation` | One English translation with attribution, license and numbering notes | online, mirrored |
| `compare_translations` | Two to four English translations side by side, with the Pāli opening | online, mirrored |
| `search_texts` | Full-text Pāli search (diacritics optional, phrases in quotes), titles and English titles | offline |
| `browse_canon` | Canon → piṭaka → collection → section → text | offline |
| `lookup_pali` | Digital Pāḷi Dictionary entry | online |
| `search_access_to_insight` | Access to Insight sutta and subject indexes | online, mirrored |
| `get_access_to_insight_text` | Read an Access to Insight page with its license notice | online, mirrored |
| `list_sources` | Sources, versions, licenses, mirrors | offline |

Resources: `pali://sources`, `pali://canon-guide`.

## How the canon index was built and checked

Citation IDs follow the numbering most readers use today (Bhikkhu Bodhi / SuttaCentral). At build time, each ID was matched to the VRI text by its opening words. Where wording differs between editions, the match falls back to verse numbers and to the numbered headings between neighboring texts. The checks behind it:

- **8,541 texts** across all three piṭakas. Every one resolves by ID and by printed citation, and renders text. No two texts claim the same passage.
- **Texts printed together** (AN 1.297–305, Dhp 1–20, SN 46.143–152) also answer to each member number: 1,259 members.
- **Abbreviated (peyyāla) texts** that VRI collapses are flagged `approximate` and point to the passage where the abbreviation occurs: 265 texts, all in SN/AN repetition series, Paṭṭhāna, and Vinaya rules recited together.
- **Independent check against Access to Insight's PTS citations:** 102/102 MN, 17/17 DN, all SN and AN pages fall in the correct text, and 0 problems overall. Pages that differ only by numbering scheme are reported as such.
- Every one of 2,572 translation links resolves back to its text.

The build scripts are in [`scripts/canon/`](scripts/canon/README.md). Run `node scripts/audit.mjs` to re-run the exhaustive offline audit.

## Citing correctly

Quote only retrieved text. Cite the **text ID + VRI paragraph or PTS page + translator + source URL**. Keep Pāli, translation, dictionary gloss and your own explanation distinct. When the tool reports that two numbering schemes differ, mention both.

## Sources and licenses

The software is **MIT**. The texts are not.

- **Pāli:** VRI Chaṭṭha Saṅgāyana Tipiṭaka. VRI makes it freely available for non-commercial use, with attribution to the Vipassana Research Institute.
- **Ṭhānissaro Bhikkhu (dhammatalks.org):** CC BY-NC 4.0. "Commercial" includes any sale.
- **Access to Insight:** licenses vary by page (CC BY-NC, BPS free distribution, public domain…). Each page's notice is returned with its text.
- **Digital Pāḷi Dictionary:** CC BY-NC-SA 4.0.
- **SuttaCentral:** linked only. SuttaCentral asks that its work not be used in AI tools, so this project does not fetch or bundle its translations or text. Its public citation numbering is used as nomenclature, and its public-domain Pāli root was used only at build time to align those numbers to the VRI text.

See [THIRD_PARTY.md](THIRD_PARTY.md) and [docs/sources.md](docs/sources.md) for the reasoning.

## Privacy

There are no accounts, analytics or stored queries. Pāli reading and search never leave your computer. Translation, dictionary and Access to Insight requests go to those public sites or their official mirrors, which may log requests.

## Manual MCP installation

```sh
claude mcp add --transport stdio pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

For Claude Desktop's `claude_desktop_config.json`, add `"pali-canon": {"command": "node", "args": ["C:/absolute/path/pali-canon-claude/server/index.cjs"]}` under `mcpServers`. Keep the `server/data/` folder next to `index.cjs`.

## Develop

```sh
npm ci
npm run build
npm test                    # unit tests (offline)
node scripts/audit.mjs      # exhaustive canon audit (offline)
npm run smoke               # MCP protocol checks (offline)
npm run smoke -- --live     # plus live translation, dictionary and ATI checks
node scripts/outage.mjs     # simulated outages: mirrors and offline behaviour
npm run pack:desktop
```

Behind a corporate proxy, run Node with `NODE_USE_ENV_PROXY=1`. Report problems through [GitHub Issues](https://github.com/DaniilKi/pali-canon-claude/issues), including the citation you used and the error text.
