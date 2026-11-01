# Install Pali Canon in Claude Code

This page shows how to add Pali Canon to [Claude Code](https://code.claude.com), Anthropic's coding and research assistant that runs in a terminal, in an editor or in the Claude desktop app. It takes two commands and about a minute.

For Claude Desktop (the chat app), use the `.mcpb` extension instead; see the [Install section of the README](../../README.md#install).

## What you need

- **Claude Code**, signed in. See [Set up Claude Code](https://code.claude.com/docs/en/setup).
- **Node.js 20 or newer.** Pali Canon's server is a small Node.js program. Check by typing `node --version` in a terminal. If the command is not found, or the number is below 20, install Node.js from [nodejs.org](https://nodejs.org/en/download).

No account, key or payment is needed.

## Install

Type these two lines into Claude Code, one at a time:

```text
/plugin marketplace add DaniilKi/pali-canon-claude
/plugin install pali-canon@pali-canon
```

- The first line tells Claude Code where to find the plugin (this GitHub repository). You only do this once.
- The second line installs it. In `pali-canon@pali-canon`, the first part is the plugin and the second part is the catalog (called a *marketplace*) you just added. Claude Code opens a panel; choose **Install**.

Then start a new session (or type `/reload-plugins`) so the plugin loads.

### The same thing from a terminal

If you prefer your normal terminal (outside a Claude Code session):

```sh
claude plugin marketplace add DaniilKi/pali-canon-claude
claude plugin install pali-canon@pali-canon
```

## Check that it works

Type `/plugin` and open the **Installed** tab: you should see **pali-canon** marked as enabled. Then try one of the four study skills:

```text
/pali-canon:study MN 10
/pali-canon:compare AN 3.65
/pali-canon:pali-word anicca in SN 22.59
/pali-canon:method Kv 1
```

Or simply ask: *"Use Pali Canon to read MN 10 with a translation and cite the PTS page."*

## What gets installed

| Part | What it does |
|---|---|
| One MCP server (`pali-canon`) | Gives Claude read-only tools to look up citations and PTS pages, read the Pāli of the whole Tipiṭaka offline, fetch English translations and look up Pāli words. See [How it works](../how-it-works.md). |
| Four skills | `study`, `compare`, `pali-word` and `method`: step-by-step study methods Claude follows when you call them. |

The whole Pāli Canon (about 6 MB, compressed) comes with the plugin, so the Pāli works without internet. English translations and dictionary entries are fetched live from dhammatalks.org, Access to Insight, the Digital Pāḷi Dictionary and their official mirrors. Nothing else is contacted, and nothing you ask is stored. Each text keeps its own licence, mostly non-commercial; see [THIRD_PARTY.md](../../THIRD_PARTY.md).

## Updating

Claude Code does not update plugins from community catalogs automatically unless you turn that on. To get a new release:

```text
/plugin marketplace update pali-canon
```

then open `/plugin`, find **pali-canon** and choose **Update** (or run `claude plugin update pali-canon@pali-canon` in a terminal). To have it happen by itself, open `/plugin`, go to **Marketplaces**, select **pali-canon** and choose **Enable auto-update**.

## Removing it

```text
/plugin uninstall pali-canon@pali-canon
/plugin marketplace remove pali-canon
```

## If something goes wrong

| What you see | What to do |
|---|---|
| The tools are missing, or `/plugin` shows the `pali-canon` server failed to start | Usually Node.js is missing or too old. Install Node.js 20 or newer, then type `/reload-plugins`. |
| `Plugin "pali-canon" not found in marketplace` | Run `/plugin marketplace update pali-canon` and try the install line again, exactly as written above. |
| A note that the plugin's packages are not installed | Harmless. The server is a single self-contained file and does not need those packages. |
| Translations or dictionary lookups fail | The sites may be down or blocked on your network. The Pāli text still works offline, and Claude will say which source failed. |

Still stuck? [Open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the message you saw.

## For maintainers

The two files that make this work are [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) (the catalog, named `pali-canon`, with one plugin at the repository root) and [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) (the plugin's name, version and listing details). The MCP server is declared in [`.mcp.json`](../../.mcp.json) and the skills live in [`skills/`](../../skills/). `tests/core.test.mjs` checks these files against the [Claude Code plugin reference](https://code.claude.com/docs/en/plugins/manifest-reference). To check them with Claude Code's own validator:

```sh
claude plugin validate .
```

The expected result is `Validation passed with warnings`: one warning that the contributor file `CLAUDE.md` is not loaded by plugin users (intended), and one that the plugin has no icon yet.

Because `plugin.json` sets `version`, users only receive a release when that number goes up. Bump it with every release, as described in [docs/development.md](../development.md).
