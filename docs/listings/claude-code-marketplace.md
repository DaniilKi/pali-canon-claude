# Claude plugin directory and marketplace submission packet

Everything a maintainer needs to list Pali Canon beyond our own marketplace. Nothing here has been submitted yet: submitting is a human step (it needs a signed-in claude.ai account and acceptance of Anthropic's directory terms).

Checked against the Claude Code and claude.com documentation on 1 November 2026, and against `claude plugin validate` from Claude Code 2.1.316.

## The three places Pali Canon can be listed

| Where | What it is | How to get in | Status |
|---|---|---|---|
| **Our own marketplace** (`pali-canon`) | `.claude-plugin/marketplace.json` in this repository. Anyone can run `/plugin marketplace add DaniilKi/pali-canon-claude`. | Nothing to submit: it is live once merged to `main`. | Live. Install tested from GitHub into a clean Claude Code profile on 1 November 2026: marketplace added, plugin installed and enabled, 3 skills and 1 MCP server found, server answered `initialize`. |
| **Anthropic's plugin directory and community marketplace** (`claude-community`, mirrored at [anthropics/claude-plugins-community](https://github.com/anthropics/claude-plugins-community)) | The catalog people browse on claude.ai, in Cowork and in Claude Code. Approved community plugins appear in the community marketplace. | One submission form for both: the developer portal at [claude.ai/directory/manage](https://claude.ai/directory/manage) (short link [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)). Pull requests to the mirror repository are closed automatically. | **Handoff** (see the checklist below). |
| **Anthropic's official marketplace** (`claude-plugins-official`) | Anthropic-maintained and partner plugins. | Not open to direct submission. The Claude Code docs say it does not take submissions through the directory portal; partners ask their Anthropic contact. The official repository's README sends third parties to the same directory form. | Submit to the directory; nothing else to do unless Anthropic invites us. |

## Before submitting: open items

Found with the [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist). Items marked **blocker** must be fixed first.

| # | Item | Severity | Notes |
|---|---|---|---|
| 1 | `server/data/canon.json.gz` is 5.3 MiB (5,568,237 bytes). The directory requires every file in the plugin folder to be under 5 MiB; otherwise validation stops with *Repository too large to validate*. | **Blocker for the directory** (not for our own marketplace) | Fix in the data build: split the canon into files under 5 MiB (for example one per piṭaka) and load them together. This touches `server/data/` and the loader, so it needs its own issue. The local `claude plugin validate` does not check this; the portal does. |
| 2 | No icon. | Warning, but **decide before the first submission** | The directory takes the icon only once, the first time the plugin is saved or submitted in the portal. It must be a square PNG or JPEG, 512 to 2048 px, under 2 MB, saved as `.claude-plugin/icon.png` (or named by `"icon"` in `plugin.json`). SVG and WebP are not accepted. It must be our own artwork. |
| 3 | Privacy policy and terms pages. | Recommended | `plugin.json` can carry `privacyPolicyUrl` and `termsOfServiceUrl`. Add them when issue [#6](https://github.com/DaniilKi/pali-canon-claude/issues/6) publishes those pages. The README's privacy paragraph covers the facts meanwhile. |
| 4 | `server/index.cjs` is an 810 KiB bundle; `canon.json.gz` is a binary. | Policy hold (a reviewer reads it) | Files over 256 KiB, and binaries that are not images or fonts, are held for a human reviewer. Expected; not a rejection. Point the reviewer to `src/` (readable source) and `npm run build` (how the bundle is made). |
| 5 | `package.json` and `package-lock.json` at the plugin root. | Policy hold | Claude Code installs packages from the lockfile when someone installs the plugin, and the directory holds such plugins for review. The server does not need them (the bundle is self-contained). A later option: move the plugin into a subfolder without a lockfile. |
| 6 | `CLAUDE.md` at the plugin root. | Warning only | It is for contributors and is not loaded for plugin users. Intended. |

Run `claude plugin validate . --strict` and the portal's **Validate** button again after each fix.

## Form answers (copy into the portal)

### Source step

| Field | Value |
|---|---|
| What would you like to submit? | **Plugin bundle** (not MCP connector: our server runs locally, it is not a remote URL) |
| Repository | `DaniilKi/pali-canon-claude` |
| Plugin path | leave empty (the plugin is at the repository root) |
| Branch or tag | leave empty to follow `main`, or a release tag such as `v2.0.0` to publish only tagged releases |

### Listing details (read from `plugin.json` and `README.md`)

| Field | Value |
|---|---|
| Name | `pali-canon` |
| Display name | Pali Canon |
| Short description | Study the Tipitaka offline: the whole Pali Canon, any citation or PTS page, English translations with mirrors, and Pali dictionary lookup. |
| Author | DaniilKi and contributors |
| Licence | MIT for the software. The texts keep their own licences, mostly non-commercial; see `THIRD_PARTY.md`. |
| Homepage | https://github.com/DaniilKi/pali-canon-claude#readme |
| Documentation | https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/install/claude-code.md |
| Support | https://github.com/DaniilKi/pali-canon-claude/issues |
| Keywords | pali, tipitaka, buddhism, theravada, access-to-insight, dhammatalks, mcp |
| Long description | Taken from `README.md` (well over the 40-word minimum). |

### What the plugin runs and contacts (for the reviewer and the security scan)

- **Runs:** one local MCP server, `node ${CLAUDE_PLUGIN_ROOT}/server/index.cjs`, with plain arguments (declared in `.mcp.json`). No hooks, agents, commands, `bin/` folder or package launchers (`npx`, `uvx`).
- **Skills:** `study`, `compare` and `pali-word` (`skills/*/SKILL.md`). They only tell Claude how to use the tools.
- **Tools:** 11 read-only MCP tools; the ones that use the network are marked `openWorldHint`. No tool writes files, runs commands or accepts an arbitrary URL.
- **Network:** HTTPS only, to the fixed allowlist in `src/http.mjs`: `dhammatalks.org`, `accesstoinsight.org` and `dpdict.net` (with and without `www.`), plus the Access to Insight mirrors on `raw.githubusercontent.com` (`/bcbsit/ati/`, `/digitalpalireader/accesstoinsight/`) and `cdn.jsdelivr.net` (`/gh/bcbsit/ati@`). Redirects are re-checked against the list. A request carries only the reference or word being looked up.
- **Offline data:** the Pāli Tipiṭaka (VRI Chaṭṭha Saṅgāyana edition) in `server/data/`.
- **Credentials:** none. No `userConfig`, no keys. The only environment variable read is an outage-simulation switch used in tests.

### Data handling step

| Question | Answer |
|---|---|
| Does the plugin read or store personal data? | No. No accounts, analytics or stored questions. |
| Does it send data to services other than its declared connectors? | Yes: only the public reference sites listed above, and only the reference or Pāli word being looked up. Those sites may keep ordinary web server logs. |
| How long does it keep data? | It keeps nothing; each lookup is answered and discarded. |
| Intended for people under 18? | Not directed at children (general audience). A maintainer should confirm. |

### Compliance step

- Contact email: a maintainer's address (deliberately not filled in here).
- The four acknowledgements, and the [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) and [Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy), must be read and accepted by a maintainer, not by an agent.

### Review and submit step

- **How new versions reach the directory:** the GitHub push webhook (default) is fine; a repository admin sets it up.
- **Auto-publish passing versions:** leave off for the first release so a maintainer checks each version.
- `plugin.json` sets `version`, so raise it with every release, or neither the directory nor marketplace users will see the update.

## Handoff checklist (for a maintainer)

1. Fix blocker 1 (split `canon.json.gz` into files under 5 MiB) in its own issue.
2. Add the icon (item 2) and, once #6 lands, `privacyPolicyUrl` and `termsOfServiceUrl` in `.claude-plugin/plugin.json`.
3. Sign in at [claude.ai/directory/manage](https://claude.ai/directory/manage) on a paid plan (Pro, Max or Ultra, or an Owner on Team or Enterprise) and connect the GitHub account that can push to `DaniilKi/pali-canon-claude`.
4. Choose **Submit new**, then **Plugin bundle**, enter the repository, press **Validate**, fix any *Blocking* findings, and fill in the form with the answers above.
5. Submit for review and follow the **Versions** tab. When a version passes, press **Publish**.
6. When it is live, add the directory link to the README and close [#8](https://github.com/DaniilKi/pali-canon-claude/issues/8).

## Sources

- Create a marketplace: https://code.claude.com/docs/en/plugins/create-marketplace
- Marketplace reference: https://code.claude.com/docs/en/plugins/marketplace-reference
- Plugin manifest reference: https://code.claude.com/docs/en/plugins/manifest-reference
- Publish and distribute a plugin: https://code.claude.com/docs/en/plugins/publish
- Submit your plugin: https://claude.com/docs/plugins/submit
- Plugin pre-submission checklist: https://claude.com/docs/plugins/pre-submission-checklist
