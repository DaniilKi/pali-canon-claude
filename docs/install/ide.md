# Install in code editors and agent apps

This page shows how to add **Pali Canon** to editors and AI agent apps that support MCP: Cursor, VS Code, Windsurf, Zed, Cline and Goose. Using Claude? See the [main install guide](../../README.md#install) instead.

MCP (Model Context Protocol) is the standard way AI apps connect to outside tools. Pali Canon is an MCP server: a small program the app starts in the background. Once it is connected, the app's AI can look up and quote the real Pāli texts instead of paraphrasing from memory. See the [glossary](../glossary.md) for other terms.

> **Before you start.** Every setup below starts the server with `npx -y pali-canon-mcp`. That command needs:
>
> 1. [Node.js 20 or newer](https://nodejs.org/en/download) on your computer. `npx` comes with it.
> 2. The `pali-canon-mcp` package on npm. Publishing it is tracked in [#4](https://github.com/DaniilKi/pali-canon-claude/issues/4). Until it is published, use the "without npm" setup at the end of this page.
>
> The first start downloads the package (the whole canon is included, so it is a few megabytes) and can take a minute. Later starts are quick.

All setups use the same three facts, so you can adapt them to any other MCP app:

| Setting | Value |
|---|---|
| Server name | `pali-canon` |
| Command | `npx` |
| Arguments | `-y`, `pali-canon-mcp` |

The server only reads. It never writes files or runs other programs, and it contacts only a short list of named websites (for translations and the dictionary). Most of it works offline.

## Cursor

**One click:** [![Add Pali Canon to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pali-canon&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsInBhbGktY2Fub24tbWNwIl19)

The button opens a page on cursor.com that hands over to Cursor, which asks you to confirm. If your browser does not open Cursor, paste this link into the browser's address bar instead:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=pali-canon&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsInBhbGktY2Fub24tbWNwIl19
```

**By hand:** create a file named `mcp.json` in a `.cursor` folder. Put it in your project (`.cursor/mcp.json`) to use Pali Canon in that project only, or in your home folder (`~/.cursor/mcp.json`, on Windows `C:\Users\<you>\.cursor\mcp.json`) to use it everywhere.

```json
{
  "mcpServers": {
    "pali-canon": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"]
    }
  }
}
```

Then open **Cursor Settings → MCP** (called "Tools & MCP" in some versions) and check that `pali-canon` is switched on. Format: [Cursor MCP docs](https://cursor.com/docs/context/mcp), [install links](https://cursor.com/docs/context/mcp/install-links).

## VS Code

MCP tools are used by GitHub Copilot's agent mode in VS Code.

**One click:** [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Pali_Canon-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522pali-canon%2522%252C%2522type%2522%253A%2522stdio%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522pali-canon-mcp%2522%255D%257D) [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Pali_Canon-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522pali-canon%2522%252C%2522type%2522%253A%2522stdio%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522pali-canon-mcp%2522%255D%257D)

The buttons go through a vscode.dev page that opens VS Code (or VS Code Insiders), which asks you to confirm. The direct links are:

```text
vscode:mcp/install?%7B%22name%22%3A%22pali-canon%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22pali-canon-mcp%22%5D%7D
vscode-insiders:mcp/install?%7B%22name%22%3A%22pali-canon%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22pali-canon-mcp%22%5D%7D
```

**From a terminal:**

```sh
code --add-mcp '{"name":"pali-canon","type":"stdio","command":"npx","args":["-y","pali-canon-mcp"]}'
```

On Windows, the button or the file method below is easier, because PowerShell and Command Prompt treat the quotation marks differently.

**By hand:** for one project, create `.vscode/mcp.json` in the project folder. For all projects, run the command **MCP: Open User Configuration** from the Command Palette and add the same entry there. Note that VS Code uses `servers`, not `mcpServers`:

```json
{
  "servers": {
    "pali-canon": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"]
    }
  }
}
```

VS Code shows a **Start** button above the entry; click it, then open Copilot Chat in **Agent** mode and check that the Pali Canon tools are ticked in the tools list. Format: [VS Code MCP configuration](https://code.visualstudio.com/docs/copilot/reference/mcp-configuration), [install links](https://code.visualstudio.com/api/extension-guides/ai/mcp).

## Windsurf

Open the Cascade panel, click the **MCPs** icon (or go to **Windsurf Settings**), and choose **View Raw Config**. This opens `mcp_config.json`, normally at `~/.codeium/windsurf/mcp_config.json` (on Windows `C:\Users\<you>\.codeium\windsurf\mcp_config.json`). Add:

```json
{
  "mcpServers": {
    "pali-canon": {
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"]
    }
  }
}
```

Save, then press the refresh button in the MCPs panel. Format: [Windsurf MCP docs](https://docs.windsurf.com/windsurf/cascade/mcp). Windsurf's documentation now redirects to the Devin Desktop documentation, and newer versions may keep the file somewhere else; opening it from the MCPs panel always finds the right file.

## Zed

Open Zed's settings file (**Zed → Settings → Open Settings**, or the command `zed: open settings`) and add a `context_servers` section. If the file already has one, add only the `pali-canon` entry inside it.

```json
{
  "context_servers": {
    "pali-canon": {
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"],
      "env": {}
    }
  }
}
```

You can also use **Settings → AI → MCP Servers → Add Server → Add Local Server**, which writes the same entry. Format: [Zed MCP docs](https://zed.dev/docs/ai/mcp).

## Cline

In the Cline panel, click the **MCP Servers** icon at the top, open the **Configure** tab, and click **Configure MCP Servers**. This opens `cline_mcp_settings.json`. Add:

```json
{
  "mcpServers": {
    "pali-canon": {
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

`autoApprove` is left empty, so Cline asks before each use. All Pali Canon tools only read, so it is safe to add tool names there if you prefer. The Cline command-line version reads the same format from `~/.cline/data/settings/cline_mcp_settings.json`. Format: [Cline MCP docs](https://docs.cline.bot/mcp/configuring-mcp-servers).

## Goose

**One click (Goose Desktop):** paste this link into your browser's address bar. Goose Desktop opens and asks you to confirm.

```text
goose://extension?cmd=npx&arg=-y&arg=pali-canon-mcp&id=pali-canon&name=Pali%20Canon&description=The%20Pali%20Canon%3A%20read%20and%20cite%20the%20Tipitaka%2C%20with%20translations%20and%20a%20Pali%20dictionary&timeout=300
```

**Goose Desktop by hand:** open the sidebar, click **Extensions → Add custom extension**, choose type **Standard IO**, name it `Pali Canon`, enter the command `npx -y pali-canon-mcp`, and click **Add**.

**Goose command line:** run `goose configure`, choose **Add Extension → Command-line Extension**, call it `pali-canon`, enter the command `npx -y pali-canon-mcp`, and accept a timeout of 300 seconds.

**By hand:** edit `~/.config/goose/config.yaml` (on Windows `%APPDATA%\Block\goose\config\config.yaml`), add the entry under `extensions:`, and restart Goose:

```yaml
extensions:
  pali-canon:
    type: stdio
    name: pali-canon
    enabled: true
    cmd: npx
    args: ["-y", "pali-canon-mcp"]
    env_keys: []
    envs: {}
    timeout: 300
```

Format: [Goose extensions guide](https://github.com/aaif-goose/goose/blob/main/documentation/docs/getting-started/using-extensions.md), [Goose configuration files](https://goose-docs.ai/docs/guides/config-files).

## Without npm (any app, today)

Download or clone this repository, then use `node` as the command and the full path to `server/index.cjs` as the only argument, in place of `npx` and `-y pali-canon-mcp`. For example, in Cursor, Windsurf or Cline:

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

Keep the `server/data/` folder next to `index.cjs`. More examples are in [docs/development.md](../development.md#connect-any-mcp-client).

## Check that it works

Ask the app's AI: *"Use Pali Canon to read MN 10 with a translation and cite the PTS page."* It should call a Pali Canon tool and quote the text with its source and licence.

**If nothing happens:**

- **"npx not found" or the server will not start.** Install Node.js 20 or newer, then fully quit and restart the app so it sees the new command.
- **The first start times out.** The first `npx` run downloads the package. Run `npx -y pali-canon-mcp` once in a terminal (stop it with Ctrl+C after a few seconds), then restart the app.
- **The tools do not appear.** Most apps only reload MCP settings after a refresh or restart. Check that the entry is switched on in the app's MCP settings.

## For maintainers

The one-click links on this page are generated by `node scripts/install-links.mjs`, and a test in `tests/core.test.mjs` fails if this page drifts from them or if any config block stops using `npx -y pali-canon-mcp`. GitHub removes `cursor:`, `vscode:` and `goose:` links from Markdown, so the buttons use the https hand-off pages on cursor.com and vscode.dev; the raw links are shown as text for copying.
