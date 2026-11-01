# Using Pali Canon in Codex

[Codex](https://developers.openai.com/codex) is OpenAI's coding assistant. It runs in a terminal (the Codex CLI) and as a desktop app. Pali Canon works in both. There are two ways to set it up:

- **As a plugin** (recommended). You get the Pali Canon tools *and* the four study skills: `$study`, `$compare`, `$pali-word` and `$method`.
- **As a plugin** (recommended). You get the Pali Canon tools *and* the four study skills: `$study`, `$compare`, `$pali-word` and `$memorise`.
- **As a plain MCP server.** You get the tools only. This is the quickest route if you already manage MCP servers by hand.

Both need [Node.js](https://nodejs.org/) 20 or newer on your computer. Nothing else is required: the whole Pāli Canon is bundled, so reading texts works offline. English translations and the dictionary are fetched live from their publishers.

> **Status.** This setup has been checked against Codex's documentation and source code, but it has **not yet been tried in a real Codex install**. If something does not work, please [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues/9).

## Option 1: install the plugin

1. Add this repository as a plugin marketplace. In a terminal:

   ```sh
   codex plugin marketplace add DaniilKi/pali-canon-claude
   ```

   If you have downloaded the repository, you can point at the folder instead: `codex plugin marketplace add ./pali-canon-claude`.

2. Start Codex (`codex`) and type `/plugins`. Choose the **Pali Canon** marketplace, select **Pali Canon** and install it. In the Codex app, open the plugins page and do the same.
3. Start a new session. Codex loads plugins at the start of a session.
4. Try it:

   ```text
   $study MN 10
   $compare Dhp 183
   $pali-word sati
   $method Kv 1
   ```

The plugin runs the copy of the server that ships inside it (`node ./server/index.cjs`), so you do not need to download anything else and nothing needs editing.

How the plugin finds that file: Codex does not automatically start a plugin's server inside the plugin's folder. The plugin's server settings (`.mcp.codex.json`) therefore say `"cwd": "."`, which Codex turns into the plugin's own folder ([Codex source](https://github.com/openai/codex/blob/f7a135ec6173d19c881b7b7b0ef75f2e1e6d1985/codex-rs/codex-mcp/src/plugin_config.rs#L322-L331)). This has been read from the source, not yet tried in Codex.

## Option 2: add the MCP server only

Download or clone this repository, then point Codex at the server inside it. One command:

```sh
codex mcp add pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

Or add this block to your Codex settings file, `~/.codex/config.toml` (on Windows: `C:\Users\<you>\.codex\config.toml`):

```toml
[mcp_servers.pali-canon]
command = "node"
args = ["C:/absolute/path/pali-canon-claude/server/index.cjs"]
startup_timeout_sec = 60
```

Use forward slashes in Windows paths inside `config.toml`, or double every backslash.

**Coming later: install with `npx`.** Once the server is published on npm ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)), you will be able to skip the download. These commands do **not** work yet. Do not use them until #4 is done and this page says so:

```sh
codex mcp add pali-canon -- npx -y pali-canon-mcp
```

```toml
[mcp_servers.pali-canon]
command = "npx"
args = ["-y", "pali-canon-mcp"]
```

**Hosted (remote URL) version.** A hosted server is on the [roadmap](../roadmap.md) but does not exist yet. When it does, it will be added with `codex mcp add pali-canon --url <address>` and this page will give the address. Until then, use one of the local options above.

## Check that it works

- Run `codex mcp list`. You should see `pali-canon`.
- In a session, type `/mcp`. Pali Canon should list 11 tools, such as `resolve_reference` and `get_text`.
- Ask: "Use the Pali Canon tools to show me the first paragraph of MN 10 with its citation." The answer should quote the Pāli and name the source (VRI Chaṭṭha Saṅgāyana).

## Troubleshooting

- **"command not found: node" or the server does not start.** Install Node.js 20 or newer, then open a new terminal. On Windows, restart the Codex app after installing Node.js.
- **Tools time out on long texts.** Codex waits 300 seconds for a tool by default ([Codex source](https://github.com/openai/codex/blob/9630b2e0193e596b2505316f794e74ee1143e069/codex-rs/codex-mcp/src/rmcp_client.rs#L123)), which is normally plenty. If you have set a lower `tool_timeout_sec` in `config.toml` ([Codex configuration reference](https://developers.openai.com/codex/config-reference)), raise it or remove it.
- **The skills do not appear.** The skills come with the plugin (Option 1), not with Option 2. Start a new session after installing.
- **English translations fail but Pāli works.** The translation publishers' websites may be down. The server tries mirrors of Access to Insight automatically; Pāli text never needs the network.

All tools are read-only. They never write files, run commands or contact websites outside a fixed list of publishers. See [docs/sources.md](../sources.md) for every source and its licence.
