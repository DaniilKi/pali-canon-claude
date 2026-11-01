# Using Pali Canon in Codex

[Codex](https://developers.openai.com/codex) is OpenAI's coding assistant. It runs in a terminal (the Codex CLI) and as a desktop app. Pali Canon works in both. There are two ways to set it up:

- **As a plugin** (recommended). You get the Pali Canon tools *and* the three study skills: `$study`, `$compare` and `$pali-word`.
- **As a plain MCP server.** You get the tools only. This is the quickest route if you already manage MCP servers by hand.

Both need [Node.js](https://nodejs.org/) 20 or newer on your computer. Nothing else is required: the whole Pāli Canon is bundled, so reading texts works offline. English translations and the dictionary are fetched live from their publishers.

> **Status.** The commands below that use `npx -y pali-canon-mcp` start working once the npm package is published ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)). Until then, use the "from a copy of the repository" alternatives, which run the same server.

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
   ```

The plugin starts its server with `npx -y pali-canon-mcp`. If your computer cannot use `npx` (no internet when installing, or the package is not yet published), edit `.mcp.codex.json` in the installed plugin folder so the server runs the copy that ships with the repository:

```json
{
  "pali-canon": {
    "command": "node",
    "args": ["./server/index.cjs"],
    "startup_timeout_sec": 60,
    "tool_timeout_sec": 120
  }
}
```

Codex runs plugin servers from the plugin's own folder, so `./server/index.cjs` finds the bundled server.

## Option 2: add the MCP server only

One command:

```sh
codex mcp add pali-canon -- npx -y pali-canon-mcp
```

Or add this block to your Codex settings file, `~/.codex/config.toml` (on Windows: `C:\Users\<you>\.codex\config.toml`):

```toml
[mcp_servers.pali-canon]
command = "npx"
args = ["-y", "pali-canon-mcp"]
startup_timeout_sec = 60
tool_timeout_sec = 120
```

`tool_timeout_sec = 120` gives long texts and slow publisher websites enough time. Codex's default is shorter, and a long sutta with a translation can take longer than that on a slow connection.

**From a copy of the repository** (works today, without npm):

```sh
codex mcp add pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

```toml
[mcp_servers.pali-canon]
command = "node"
args = ["C:/absolute/path/pali-canon-claude/server/index.cjs"]
tool_timeout_sec = 120
```

Use forward slashes in Windows paths inside `config.toml`, or double every backslash.

**Hosted (remote URL) version.** A hosted server is on the [roadmap](../roadmap.md) but does not exist yet. When it does, it will be added with `codex mcp add pali-canon --url <address>` and this page will give the address. Until then, use one of the local options above.

## Check that it works

- Run `codex mcp list`. You should see `pali-canon`.
- In a session, type `/mcp`. Pali Canon should list 11 tools, such as `resolve_reference` and `get_text`.
- Ask: "Use the Pali Canon tools to show me the first paragraph of MN 10 with its citation." The answer should quote the Pāli and name the source (VRI Chaṭṭha Saṅgāyana).

## Troubleshooting

- **"command not found: npx" or the server does not start.** Install Node.js 20 or newer, then open a new terminal. On Windows, restart the Codex app after installing Node.js.
- **Tools time out on long texts.** Raise `tool_timeout_sec` (120 is a good start).
- **The skills do not appear.** The skills come with the plugin (Option 1), not with Option 2. Start a new session after installing.
- **English translations fail but Pāli works.** The translation publishers' websites may be down. The server tries mirrors of Access to Insight automatically; Pāli text never needs the network.

All tools are read-only. They never write files, run commands or contact websites outside a fixed list of publishers. See [docs/sources.md](../sources.md) for every source and its licence.
