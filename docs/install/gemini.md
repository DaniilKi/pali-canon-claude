# Install in Gemini CLI or Antigravity CLI

Pali Canon works as an **extension** for Google's Gemini CLI. An extension is an add-on package: one command installs the Pali Canon tools, a short set of citation rules for Gemini, and three study commands.

On 18 June 2026 Google replaced Gemini CLI with **Antigravity CLI** (`agy`) for free and Google One users. Paid and enterprise users can still use Gemini CLI. Both are covered below.

> **Not ready yet.** The extension starts the server with `npx -y pali-canon-mcp`, which downloads the server from npm. That package is not published yet ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)). Until it is, use the manual setup at the end of this page.

## What you need

- [Node.js 20 or newer](https://nodejs.org/en/download). It includes `npx`, which runs the server.
- Gemini CLI or Antigravity CLI, installed and signed in.

No account or key is needed for Pali Canon itself.

## Gemini CLI

1. In a terminal (not inside Gemini), run:

   ```sh
   gemini extensions install https://github.com/DaniilKi/pali-canon-claude
   ```

   Gemini shows what the extension contains and asks you to confirm. To pin one version, add `--ref v2.0.0`. To get updates automatically, add `--auto-update`.
2. Start Gemini with `gemini` and type `/mcp`. You should see the `pali-canon` server with its tools, such as `resolve_reference` and `get_text`. The first start can take a minute while `npx` downloads the server.
3. Try the three study commands:

   ```text
   /study MN 10
   /compare AN 3.65
   /pali-word anicca in SN 22.59
   ```

   If another extension already has a command with the same name, Gemini renames ours with the extension's name in front, for example `/pali-canon.study`.
4. Or just ask: *"Use Pali Canon to read MN 10 with a translation and cite the PTS page."*

Manage it later with `gemini extensions list`, `gemini extensions update pali-canon` and `gemini extensions uninstall pali-canon`.

## Antigravity CLI

Antigravity CLI does not install Gemini extensions from a link directly. It imports the ones you already have:

1. Install the extension in Gemini CLI as above (Gemini CLI still works for this step).
2. Close Antigravity, then run:

   ```sh
   agy plugin import gemini
   ```

   This converts your Gemini extensions, including their MCP servers and commands, into Antigravity plugins.
3. Start Antigravity and type `/mcp`. You should see `pali-canon` and its tools.

If you do not have Gemini CLI, add the server by hand instead (next section).

## Manual setup (any version, works today)

1. Download this project: on the [GitHub page](https://github.com/DaniilKi/pali-canon-claude) click **Code → Download ZIP** and unzip it, or run `git clone https://github.com/DaniilKi/pali-canon-claude`. The server and the whole canon are already built inside it; no install step is needed.
2. Add this to your MCP settings, with the real path to the folder. For Gemini CLI the file is `~/.gemini/settings.json`; for Antigravity CLI it is `mcp_config.json` (see `agy inspect` or Google's Antigravity documentation for its location).

   ```json
   {
     "mcpServers": {
       "pali-canon": {
         "command": "node",
         "args": ["C:/path/to/pali-canon-claude/server/index.cjs"]
       }
     }
   }
   ```

   On macOS or Linux the path looks like `/Users/you/pali-canon-claude/server/index.cjs`. Use forward slashes on Windows too.
3. For the same citation rules Gemini gets from the extension, copy [GEMINI.md](../../GEMINI.md) into your project or into `~/.gemini/GEMINI.md`.

The manual setup gives you the tools but not the `/study`, `/compare` and `/pali-word` commands. You can ask for the same things in plain words.

## What the extension contains

| File | What it does |
|---|---|
| [`gemini-extension.json`](../../gemini-extension.json) | Names the extension and tells Gemini how to start the Pali Canon server. |
| [`GEMINI.md`](../../GEMINI.md) | Citation rules Gemini reads at the start of every session: quote only retrieved text, cite precisely, name translators, report numbering differences. |
| [`commands/`](../../commands) | The `/study`, `/compare` and `/pali-word` commands. They follow the same steps as the Claude Code skills in [`skills/`](../../skills). |

The texts keep their own licences: VRI, dhammatalks.org, Access to Insight and the Digital Pāḷi Dictionary are for non-commercial use. See [THIRD_PARTY.md](../../THIRD_PARTY.md).

## Sources

- [Gemini CLI extensions](https://geminicli.com/docs/extensions/) and the [extension reference](https://geminicli.com/docs/extensions/reference)
- [Custom commands](https://geminicli.com/docs/cli/custom-commands)
- [Publishing to the extension gallery](https://geminicli.com/docs/extensions/releasing)
- [Migrating to Antigravity CLI](https://dev.to/googleai/migrating-to-antigravity-cli-from-gemini-cli-with-mcp-for-google-cloud-databases-h82) (Google AI on DEV)
