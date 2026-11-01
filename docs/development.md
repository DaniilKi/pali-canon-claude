# Development

Everything needed to build, test, release and connect the tool. For the reasoning behind the design, see [decisions.md](decisions.md); for the full agent context, see [AGENTS.md](../AGENTS.md).

## Requirements

- Node.js 20 or newer (CI uses 20).
- Python 3.10+ and git, only to rebuild the canon data.

## Commands

```sh
npm ci                      # install
npm run build               # bundle src/ into server/index.cjs (esbuild)
npm test                    # unit tests (offline)
npm run audit               # exhaustive audit of all 8,544 texts (offline)
npm run check               # build + test + audit (what CI runs)
npm run smoke               # MCP protocol checks over stdio (offline)
npm run smoke -- --live     # plus live translation, dictionary and Access to Insight checks
npm run outage              # simulated outages: mirrors and offline behaviour
npm run coverage            # coverage numbers by collection (docs/coverage.md)
npm run pack:desktop        # build dist/pali-canon-<version>.mcpb and SHA256SUMS.txt
```

Behind a corporate or sandbox proxy, Node's `fetch` ignores `HTTPS_PROXY` unless you set `NODE_USE_ENV_PROXY=1` (supported in recent Node releases), and you may need `NODE_EXTRA_CA_CERTS` pointing at the proxy's CA bundle. `scripts/smoke.mjs` passes the environment through to the server it starts.

## Repository layout

```text
src/                 server source (ES modules)
  index.mjs          MCP tools, resources, prompts, server instructions, VERSION
  citations.mjs      citation parser: IDs, PTS volume/page, Vinaya forms, links
  canon.mjs          bundled canon: load, resolve, segments, describe, search, browse, linksFor
  english.mjs        translations: dhammatalks.org, Access to Insight, mirrors, fallback
  providers.mjs      Digital Pāḷi Dictionary, Access to Insight search/read, list_sources
  http.mjs           allowlisted fetch, redirects, retries, mirrors, outage simulation
server/              BUILT OUTPUT, committed (plugin users need no build)
  index.cjs          bundled server
  data/canon.json.gz        Pāli text + citation index (generated)
  data/translations.json    translation links (generated)
  THIRD_PARTY_LICENSES.txt
scripts/
  build.mjs          esbuild bundle + licence collection
  audit.mjs          exhaustive offline audit
  smoke.mjs          MCP protocol and live checks
  outage.mjs         mirror failover drill (PALI_CANON_SIMULATE_OUTAGE)
  coverage.mjs       coverage numbers
  pack-desktop.mjs   .mcpb packaging
  canon/             Python data pipeline (see its README)
skills/              study, compare, pali-word (SKILL.md, shared format)
tests/core.test.mjs  unit and regression tests
.claude-plugin/      Claude Code plugin + marketplace manifests
.mcp.json            plugin's MCP server config
manifest.json        Claude Desktop extension manifest
docs/                human documentation
```

## Tools

| Tool | Purpose | Network |
|---|---|---|
| `resolve_reference` | Any citation, PTS page or link → the text, its PTS location, VRI paragraphs, translations and numbering notes | offline |
| `get_metadata` | Details of a text, including linked translations (`translation_id`) and a SuttaCentral link | offline |
| `get_text` | Pāli with VRI paragraph numbers, PTS page breaks and optional variants, paginated by segment; optional `translation` | offline (English online) |
| `get_translation` | One English translation with attribution, licence and numbering notes, paginated by characters | online, mirrored |
| `compare_translations` | Two to four translations side by side with the Pāli opening | online, mirrored |
| `search_texts` | Full-text Pāli search (diacritics optional, "quoted phrases"), titles, English titles | offline |
| `browse_canon` | canon → piṭaka → collection → section → text | offline |
| `lookup_pali` | Digital Pāḷi Dictionary entry | online |
| `search_access_to_insight` | Access to Insight sutta and subject indexes | online, mirrored |
| `get_access_to_insight_text` | Read an Access to Insight page with its licence notice | online, mirrored |
| `list_sources` | Sources, versions, licences, mirrors | offline |

Resources: `pali://sources`, `pali://canon-guide`. Prompts: `study_passage`, `compare_translations`, `topic_research`. All tools are annotated read-only and idempotent; network tools set `openWorldHint`.

## Connect any MCP client

The server speaks MCP over stdio: `node /path/to/pali-canon-claude/server/index.cjs`. Keep `server/data/` next to `index.cjs`.

**Claude Code**

```sh
claude mcp add --transport stdio pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

**Claude Desktop** (`claude_desktop_config.json`, if not using the `.mcpb`)

```json
{ "mcpServers": { "pali-canon": { "command": "node", "args": ["C:/absolute/path/pali-canon-claude/server/index.cjs"] } } }
```

**Codex CLI** (`~/.codex/config.toml`); a packaged Codex plugin is tracked in [#9](https://github.com/DaniilKi/pali-canon-claude/issues/9)

```toml
[mcp_servers.pali-canon]
command = "node"
args = ["/absolute/path/pali-canon-claude/server/index.cjs"]
tool_timeout_sec = 120
```

**Other clients** (Cursor, VS Code, Windsurf, Gemini CLI…): use the same `command` and `args` in their MCP configuration. Once the npm package is published ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)), `npx -y pali-canon-mcp` will replace the path.

## Rebuilding the canon data

The data is generated by the Python pipeline in [`scripts/canon/`](../scripts/canon/README.md) from pinned upstream commits. In short: fetch VRI, the public-domain Mahāsaṅgīti root and Access to Insight; build; validate (must report 0 problems); link translations; copy into `server/data/`; run `npm run audit` (must report 0 failures), `npm run check` and `npm run smoke -- --live`. Then update the numbers in `docs/coverage.md` with `npm run coverage`.

## Coverage numbers

`npm run coverage` prints texts, approximate texts, grouped members and English links per collection; `--json` gives the full summary. Use it whenever data changes, and update [coverage.md](coverage.md) and the README to match.

## Adding a source

1. Check the five tests in [sources.md](sources.md#how-we-choose-sources), and record the decision there.
2. Add the host and path prefix to `ALLOWED` in `src/http.mjs`; never accept user-supplied hosts.
3. Bound the response size and paginate output. Return attribution and licence with every result.
4. Add mirrors only if they are official or long-standing, and say in the result when a mirror served it.
5. Add a unit test, a live check to `scripts/smoke.mjs`, and an outage case to `scripts/outage.mjs`.
6. Update `list_sources`, `THIRD_PARTY.md`, `docs/sources.md` and the README source table.

## Releasing

1. Bump the version in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json` and `VERSION` in `src/index.mjs`.
2. `npm run check && npm run smoke -- --live && npm run outage`.
3. `npm run pack:desktop`, then commit the rebuilt `server/`.
4. Merge to `main`, tag `vX.Y.Z`, and create a GitHub release with `dist/pali-canon-X.Y.Z.mcpb` and `dist/SHA256SUMS.txt` attached. Automation is tracked in [#2](https://github.com/DaniilKi/pali-canon-claude/issues/2).
5. Test the `.mcpb` in Claude Desktop and the plugin in Claude Code.

## CI

`.github/workflows/check.yml` runs on every push to `main` and every pull request: `npm ci`, `npm run check`, `npm run smoke`, `npm run pack:desktop`, and a check that the committed `server/` matches a fresh build. Multi-OS runs and a nightly live-source check are tracked in [#3](https://github.com/DaniilKi/pali-canon-claude/issues/3).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Translation or dictionary calls fail behind a proxy | Set `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS` |
| The server starts but cannot load the canon | `server/data/` must sit next to `server/index.cjs` |
| CI fails on "committed standalone server is current" | Run `npm run build` and commit `server/` |
| A citation resolves wrongly | Add a failing test in `tests/core.test.mjs`, fix, run `npm run audit` |
