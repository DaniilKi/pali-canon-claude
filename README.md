# Pali Canon for Claude

A Claude Code plugin and Claude Desktop extension for studying the **Tipitaka / Pali Canon** through retrieved sources. Search texts, read Pali alongside translations, compare translators, explore parallels, look up Pali words, and retrieve Access to Insight pages with source links.

No API key, paid data subscription, or hosted service is required. Internet access is required for upstream sources. This is an independent community project, not an Anthropic or Buddhist publisher's official integration.

## Install in Claude Code

Install [Node.js 20 or newer](https://nodejs.org/en/download) if it is not already available. In Claude Code, run:

```text
/plugin marketplace add DaniilKi/pali-canon-claude
/plugin install pali-canon@pali-canon
```

Start a new session or run `/reload-plugins`, then open `/mcp` and confirm the Pali Canon server is connected. The plugin ships a bundled server: users do not need `npm install` just to run it.

Try:

```text
/pali-canon:study MN 10
/pali-canon:compare MN 1, Sujato and another available English translator
/pali-canon:pali-word anicca in SN 22.59
```

Or ask normally: “Find passages about right speech, retrieve the relevant sections, and cite the translators.”

## Install in Claude Desktop

1. Download [`pali-canon-1.0.0.mcpb` from Releases](https://github.com/DaniilKi/pali-canon-claude/releases/latest).
2. Open Claude Desktop → **Settings → Desktop app → Manage** beside Extensions → **Advanced settings → Install Extension**. Select the downloaded bundle and follow the prompts. Older layouts place Extensions directly under Settings.
3. Check its connection status and ask: “Use Pali Canon to read MN 1 with Pali text and source citations.”

Claude Desktop supplies the Node runtime for the bundle. The desktop extension installs the MCP tools; the three `/pali-canon:…` skills belong to the Claude Code plugin.

This release runs locally over stdio. It does not provide a public HTTPS URL for Claude web's **Add custom connector** field. A local HTTP URL would not work there because Anthropic's cloud must reach remote connectors.

## Tools

| Tool | Purpose |
|---|---|
| `resolve_reference` | Normalize a human reference or supported source URL into a canonical identifier. |
| `search_texts` | Search SuttaCentral texts by words, title, or subject. |
| `get_metadata` | Identify a work and discover its available translations. |
| `get_text` | Read a bounded passage with translation, segment IDs, optional Pali and notes. |
| `compare_translations` | Retrieve aligned segments from two to four selected translators. |
| `get_parallels` | Find related textual witnesses and parallel references. |
| `browse_canon` | Browse the upstream collection hierarchy. |
| `lookup_pali` | Retrieve available Pali dictionary evidence and dictionary links. |
| `search_access_to_insight` | Find matching pages in the ATI catalogue. |
| `get_access_to_insight_text` | Read an ATI page with attribution and licence information. |
| `list_sources` | Inspect source coverage, upstream links, and limitations. |

The server also offers `study_passage`, `compare_translations`, and `topic_research` MCP prompts, plus the `pali://sources` and `pali://canon-guide` resources. Client support for prompts and resources varies.

Example tool arguments:

```json
{"uid":"mn1","language":"en","author":"sujato","offset":0,"limit":20,"includePali":true}
```

Pass the object above to `get_text`. Use `get_metadata` to discover actual author IDs before selecting another translation. Tools return continuation information when more content remains; follow it instead of treating a partial response as the whole text. Missing translations and source failures are reported explicitly.

SuttaCentral URLs passed to `get_text` preserve their language, translator, and segment anchor. Search returns separate content and title matches: use `offset` with `next_offset` for content, and `titleOffset` with `next_title_offset` for titles.

## Coverage and citation

- **SuttaCentral:** catalogue, available texts/translations, Pali alignment where supported, search, and parallels. Availability varies by work, language, author, and upstream format. Browsing a canon category does not guarantee every text has a retrievable English translation.
- **Access to Insight:** selected sutta translations and modern essays/articles. It is a selective collection, not a complete Tipitaka translation. Search uses its catalogue; it is not a full-text index of every article body.
- **Digital Pali Dictionary:** live dictionary lookup, summaries, and available grammar or example material, with its separate noncommercial/share-alike terms. No DPD database is bundled.

No complete offline corpus, audio library, manuscript viewer, or scholarly critical edition is included. Parallel collections may contain non-Pali Buddhist texts; those witnesses are identified separately. Modern essays and dictionary glosses are not canonical quotations.

Citations should name **work/reference → segment or passage → translator → source URL**. The study skills ask Claude to retrieve before quoting and distinguish text, translation, commentary, and interpretation. Source-grounded retrieval reduces errors; users should still check consequential quotations at the linked publication.

## Privacy and licences

The local server has no account system, API credentials, analytics, or persistent query database. Its tools read public sources and do not edit source websites or local documents. Searches and requested identifiers are sent to the relevant upstream websites, which may log requests under their own policies. Retrieved results enter your Claude conversation under your Claude account's settings. Do not put private information into public-source searches.

The software is **MIT**. Retrieved text is **not automatically MIT**. Preserve publisher, translator, copyright, and licence notices. ATI texts generally cannot be sold; DPD material has noncommercial and share-alike conditions. See [THIRD_PARTY.md](THIRD_PARTY.md). Keep this distinction when adapting the package commercially.

## Manual MCP installation

For an MCP client without plugin or MCPB installation, download the source, keep its bundled `server/` directory, install Node.js 20+, then add a stdio server:

```sh
claude mcp add --transport stdio pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

For Claude Desktop's manual configuration, merge this server entry into the existing `mcpServers` object in `claude_desktop_config.json`; preserve other entries:

```json
{
  "mcpServers": {
    "pali-canon": {
      "command": "node",
      "args": ["C:/absolute/path/pali-canon-claude/server/index.cjs"]
    }
  }
}
```

Replace the path with your actual location and restart the client. On Windows the config normally lives at `%APPDATA%\Claude\claude_desktop_config.json`. A manual MCP registration installs tools, not the plugin's skills. Avoid installing both routes in the same client unless you want duplicate tools.

## Develop

```sh
git clone https://github.com/DaniilKi/pali-canon-claude.git
cd pali-canon-claude
npm ci
npm run build
npm test
npm run smoke
npm run smoke -- --live
npm run pack:desktop
```

`npm test` runs focused local checks. `npm run smoke` checks the local MCP protocol; add `-- --live` to exercise upstream sources over the network. Run `claude plugin validate .` when Claude Code CLI is available, then try `claude --plugin-dir .` for an actual Claude session. Protocol/source checks alone do not prove installation in a user's Claude account.

Read [research and architecture notes](docs/research.md) for source choices, scripture-tool comparisons, and official Anthropic documentation. Report reproducible failures through [GitHub Issues](https://github.com/DaniilKi/pali-canon-claude/issues), including the tool, sanitized arguments, and error text.
