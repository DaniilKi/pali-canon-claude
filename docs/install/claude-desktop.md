# Install Pali Canon in Claude Desktop

[Claude Desktop](https://claude.ai/download) is Anthropic's chat app for Windows and macOS. Pali Canon installs in it as an **extension**: a single file with the extension `.mcpb` that contains the server and the whole Pāli Canon. No account, key or extra software is needed, and the Pāli works offline.

## Install the extension

1. Download the latest **`pali-canon-<version>.mcpb`** file from the [Releases page](https://github.com/DaniilKi/pali-canon-claude/releases/latest).
2. Open Claude Desktop, then **Settings → Extensions**. Drag the file onto the page, or use **Advanced settings → Install Extension…** and choose it.
3. Click **Install** and make sure the extension is switched on.
4. Start a new chat and ask: *"Use Pali Canon to read MN 10 with a translation and cite the PTS page."*

> **Status.** The first GitHub release with the `.mcpb` file is still being prepared ([#2](https://github.com/DaniilKi/pali-canon-claude/issues/2)). Until it appears on the Releases page, build the file yourself (below) or use the manual setup.

## Build the `.mcpb` yourself

With [Node.js 20 or newer](https://nodejs.org/en/download) and a downloaded copy of this repository, run in its folder:

```sh
npm ci
npm run pack:desktop
```

The file appears in the `dist` folder. Install it as in step 2 above.

## Manual setup (without the extension)

If you prefer to manage MCP servers by hand, add this to Claude Desktop's `claude_desktop_config.json` (**Settings → Developer → Edit Config**) and restart Claude Desktop. Replace the path with the full path to `server/index.cjs` in your copy of the repository; on Windows, forward slashes work.

```json
{ "mcpServers": { "pali-canon": { "command": "node", "args": ["C:/absolute/path/pali-canon-claude/server/index.cjs"] } } }
```

This needs [Node.js 20 or newer](https://nodejs.org/en/download). Keep the `server/data` folder next to `index.cjs`.

## What next

- Try the requests on the [examples page](../examples.md).
- Learn the accepted citation forms in the [citation guide](../citations.md).
- New to the terms? See the [glossary](../glossary.md).
