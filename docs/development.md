# Development

Everything needed to build, test, release and connect the tool. For the reasoning behind the design, see [decisions.md](decisions.md); for the full agent context, see [AGENTS.md](../AGENTS.md).

## Requirements

- Node.js 20 or newer (CI tests 20 and 22 on Linux, macOS and Windows).
- Python 3.10+ and git, only to rebuild the canon data.

## Commands

```sh
npm ci                      # install
npm run build               # bundle src/ into server/index.cjs (stdio) and server/http.cjs (HTTP) with esbuild
npm test                    # unit tests (offline)
npm run audit               # exhaustive audit of all 8,544 texts (offline)
npm run check               # build + test + audit (what CI runs)
npm run smoke               # MCP protocol checks over stdio (offline)
npm run smoke -- --live     # plus live translation, dictionary and Access to Insight checks
npm run outage              # simulated outages: mirrors and offline behaviour
npm run coverage            # coverage numbers by collection (docs/coverage.md)
npm run pack:desktop        # build dist/pali-canon-<version>.mcpb and SHA256SUMS.txt
npm run serve               # hosted HTTP endpoint on $PORT (default 8080); see hosting.md
npm run loadtest            # 50 concurrent HTTP sessions against the HTTP server: p50/p95 and errors
npm run linkcheck           # check today's sample of 250 translation links (--all for every link)
npm run registry:check      # validate server.json before publishing to the MCP Registry
```

Behind a corporate or sandbox proxy, Node's `fetch` ignores `HTTPS_PROXY` unless you set `NODE_USE_ENV_PROXY=1` (supported in recent Node releases), and you may need `NODE_EXTRA_CA_CERTS` pointing at the proxy's CA bundle. `scripts/smoke.mjs` passes the environment through to the server it starts.

## Repository layout

```text
src/                 server source (ES modules)
  index.mjs          stdio entry (createServer + StdioServerTransport)
  server.mjs         createServer(): MCP tools, resources, prompts, server instructions, VERSION
  http-server.mjs    Streamable HTTP entry: stateless /mcp, /healthz, CORS, rate limit, counters
  cache.mjs          in-memory LRU for live English/ATI/DPD responses
  citations.mjs      citation parser: IDs, PTS volume/page, Vinaya forms, links
  canon.mjs          bundled canon: load, resolve, segments, describe, search, browse, linksFor
  english.mjs        translations: dhammatalks.org, Access to Insight, mirrors, fallback
  providers.mjs      Digital Pāḷi Dictionary, Access to Insight search/read, list_sources
  http.mjs           allowlisted fetch, redirects, retries, mirrors, outage simulation
server/              BUILT OUTPUT, committed (plugin users need no build)
  index.cjs          bundled stdio server (what every local client runs)
  http.cjs           bundled HTTP server (hosted /mcp; see hosting.md)
  data/canon.json.gz        Pāli text + citation index (generated)
  data/translations.json    translation links (generated)
  THIRD_PARTY_LICENSES.txt
scripts/
  build.mjs          esbuild bundle + licence collection
  audit.mjs          exhaustive offline audit
  smoke.mjs          MCP protocol and live checks
  outage.mjs         mirror failover drill (PALI_CANON_SIMULATE_OUTAGE); exits non-zero on a design mismatch
  linkcheck.mjs      nightly translation link check (250 a day, or --all)
  loadtest.mjs       50 concurrent HTTP sessions; p50/p95 and errors
  npx-check.mjs      dependency-free stdio check of a packed npm tarball
  check-server-json.mjs  server.json checks; --publish refuses placeholders
  install-links.mjs  generates the one-click editor links in install/ide.md
  coverage.mjs       coverage numbers
  pack-desktop.mjs   .mcpb packaging
  canon/             Python data pipeline (see its README)
skills/              study, compare, pali-word (SKILL.md, shared format; agents/openai.yaml for Codex)
tests/core.test.mjs  unit and regression tests
.claude-plugin/      Claude Code plugin + marketplace manifests (checked by tests/core.test.mjs; run `claude plugin validate .`)
.mcp.json            Claude Code plugin's MCP server config
.codex-plugin/, .mcp.codex.json, .agents/plugins/marketplace.json   Codex plugin and marketplace
gemini-extension.json, GEMINI.md, commands/   Gemini CLI extension (manifest, context file, /study /compare /pali-word)
manifest.json        Claude Desktop extension manifest (lists PRIVACY.md under privacy_policies)
server.json          MCP Registry entry (io.github.DaniilKi/pali-canon)
Dockerfile, fly.toml, render.yaml   hosted HTTP server image and hosting configs
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

**Codex CLI** (`~/.codex/config.toml`); to install the Codex plugin with its skills instead, see [install/codex.md](install/codex.md)

```toml
[mcp_servers.pali-canon]
command = "node"
args = ["/absolute/path/pali-canon-claude/server/index.cjs"]
```

**Gemini CLI**: `gemini extensions install https://github.com/DaniilKi/pali-canon-claude` (see [install/gemini.md](install/gemini.md)). The extension runs `node ${extensionPath}${/}server${/}index.cjs` from the installed copy, so it relies on `server/index.cjs` and `server/data` being committed (a test checks this).

**Other clients** (Cursor, VS Code, Windsurf, Zed, Cline, Goose): tested-shape configs and one-click links are in [install/ide.md](install/ide.md); regenerate the links with `node scripts/install-links.mjs` (a core test keeps the page in sync). Once the npm package is published ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)), `npx -y pali-canon-mcp` replaces the path. It is not published yet; until then use `node /path/to/server/index.cjs`.

**Local models** (LM Studio, Open WebUI via mcpo, oterm, Kit/MCPHost with Ollama): see [install/local-clients.md](install/local-clients.md). Note that mcpo 0.0.20 needs `uvx --with "mcp<2" --with "fastapi<0.120" mcpo ...` (as of November 2026), and that mcpo exposes only tools, not server instructions, prompts or resources.

**Remote (HTTP):** run `node server/http.cjs` (or `docker run -p 8080:8080 ghcr.io/daniilki/pali-canon-mcp`) and connect clients to `http://host:8080/mcp` using Streamable HTTP. See [hosting.md](hosting.md). The project's own public endpoint is not deployed yet.

## Skills

`SKILL.md` frontmatter uses the Agent Skills spec fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`) plus one Claude Code extension, `argument-hint`, which must stay at the top level because Claude Code reads it only there (keep a copy under `metadata.argument-hint`). Each skill says it needs the Pali Canon MCP server. `tests/core.test.mjs` enforces this. Listing copy for skill hubs is in [listings/skills.md](listings/skills.md).

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

1. Bump the version in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `gemini-extension.json`, `server.json` (both `version` and `packages[0].version`) and `VERSION` in `src/server.mjs`. Tests fail if any of them differ from `package.json`.
2. `npm run check && npm run smoke -- --live && npm run outage`.
3. Run `claude plugin validate .` (expect only the CLAUDE.md and icon warnings until an icon is added).
4. `npm run pack:desktop`, then commit the rebuilt `server/`. The `.mcpb` includes `PRIVACY.md`, and `manifest.json` lists it under `privacy_policies`.
5. Merge to `main` and push the tag `vX.Y.Z`. The release workflow (`release.yml`) builds the `.mcpb`, the npm tarball and `SHA256SUMS.txt` and attaches them to the GitHub release. It publishes to npm only when the `NPM_TOKEN` secret is set. The same tag publishes the Docker image (`docker.yml`), deploys to Fly.io if `FLY_API_TOKEN` is set (`deploy.yml`), and is what the Gemini extension gallery picks up.
6. After npm publish, run `npm run registry:check` and then `mcp-publisher publish` (see [listings/mcp-registry.md](listings/mcp-registry.md)).
7. Test the `.mcpb` in Claude Desktop and the plugin in Claude Code.

Directory submissions use https://github.com/DaniilKi/pali-canon-claude/blob/main/PRIVACY.md as the privacy policy URL and https://github.com/DaniilKi/pali-canon-claude/issues as the support contact. Tasks that need a person (secrets, accounts, submissions) are listed in [HANDOFF.md](../HANDOFF.md).

## CI

`.github/workflows/check.yml` runs on every push to `main` and every pull request, on Node 20 and 22 across Linux, macOS and Windows: `npm ci`, `npm run check`, `npm run smoke`, `npm run pack:desktop`. The Linux / Node 20 run also checks that the committed `server/` matches a fresh build.

`.github/workflows/nightly.yml` runs every night (and on demand from the Actions tab). It runs three checks. The first is the live smoke test (`npm run smoke -- --live`). The second is the outage test (`npm run outage`). The third is the link check (`node scripts/linkcheck.mjs`). The link check opens a different 250 of the translation links each day, one at a time and slowly, so every link is checked about every ten days. Run `node scripts/linkcheck.mjs --all` to check them all at once. If any check fails, the job opens an issue called "Source health", or adds a comment to it if one is already open. Close that issue once the source is back or the dead link is fixed.

`.github/workflows/npx.yml` packs the npm tarball and starts it with `npx` on Linux, macOS and Windows. `release.yml`, `docker.yml` and `deploy.yml` run on release tags (see Releasing).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Translation or dictionary calls fail behind a proxy | Set `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS` |
| The server starts but cannot load the canon | `server/data/` must sit next to `server/index.cjs` |
| CI fails on "committed standalone server is current" | Run `npm run build` and commit `server/` |
| A citation resolves wrongly | Add a failing test in `tests/core.test.mjs`, fix, run `npm run audit` |
| `npm run outage` exits with "OUTAGE CHECK FAILED" | A mirror or fallback no longer behaves as designed. The scenario and call it lists show which source to look at |
| `node scripts/linkcheck.mjs` exits with "LINK CHECK FAILED" | A translation page has moved or gone (HTTP 404/410), or a whole site was down. Fix or remove the link in the translation data, or wait for the site to come back |
