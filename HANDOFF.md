# Handoff: tasks for a person

This file lists every task that an AI agent cannot or should not do: adding secrets, creating accounts, sending letters, submitting to directories, and testing in real apps. Each line says what to do and links to the place to do it. Tick a box when it is done, and remove the line once the change is merged.

Last updated: 1 November 2026, after Wave 1 of the [roadmap](https://github.com/DaniilKi/pali-canon-claude/issues/52).

## Secrets and accounts

- [ ] **Add the `NPM_TOKEN` secret** — create an npm automation token for the `pali-canon-mcp` package and add it as a repository secret, then re-run the release workflow for the next tag so the package is published — https://github.com/DaniilKi/pali-canon-claude/settings/secrets/actions (workflow: https://github.com/DaniilKi/pali-canon-claude/actions/workflows/release.yml)
- [ ] **Create a hosting account** — sign up at Fly.io (or Render), run `fly apps create <name>` (update `app` in `fly.toml` if it is not `pali-canon-mcp`) and `fly deploy` — [docs/hosting.md](docs/hosting.md#deploy-on-flyio)
- [ ] **Add the `FLY_API_TOKEN` secret** — create it with `fly tokens create deploy` and add it as a repository secret, so every release tag deploys the hosted version — https://github.com/DaniilKi/pali-canon-claude/settings/secrets/actions
- [ ] **Provide a support contact email (optional)** — add a maintainer email to `PRIVACY.md`, `SECURITY.md` and `CODE_OF_CONDUCT.md`; GitHub Issues is the only contact for now — [PRIVACY.md](PRIVACY.md)

## Outreach letters to send

Before sending, fill in the maintainer's name and reply-to address in each letter. Afterwards, update the status table in [docs/outreach/README.md](docs/outreach/README.md) and record each reply in [docs/sources.md](docs/sources.md). Issue [#51](https://github.com/DaniilKi/pali-canon-claude/issues/51) can be closed once replies from VRI, DPD, BCBS and dhammatalks.org are recorded.

- [ ] **VRI** — send to help@tipitaka.org — [docs/outreach/vri.md](docs/outreach/vri.md)
- [ ] **Digital Pāḷi Dictionary** — send to digitalpalidictionary@gmail.com — [docs/outreach/dpd.md](docs/outreach/dpd.md)
- [ ] **BCBS / Access to Insight** — send to contact@buddhistinquiry.org — [docs/outreach/bcbs-access-to-insight.md](docs/outreach/bcbs-access-to-insight.md)
- [ ] **dhammatalks.org** — send to feedback@dhammatalks.org — [docs/outreach/dhammatalks.md](docs/outreach/dhammatalks.md)
- [ ] **Pali Text Society** — send to info@palitextsociety.org — [docs/outreach/pts.md](docs/outreach/pts.md)
- [ ] **Ānandajoti Bhikkhu and the DPPN** — send both letters to anandajoti@gmail.com (they can be combined into one email) — [docs/outreach/anandajoti.md](docs/outreach/anandajoti.md), [docs/outreach/dppn.md](docs/outreach/dppn.md)
- [ ] **Wisdom Publications** — open their contact page in a browser, find the rights contact, then send the letter — https://wisdomexperience.org/contact/ — [docs/outreach/wisdom-publications.md](docs/outreach/wisdom-publications.md)
- [ ] **Buddhist Publication Society** — send to bps@bps.lk or through the form at https://www.bps.lk/contact — [docs/outreach/bps.md](docs/outreach/bps.md)
- [ ] **Amaravati Publications** — confirm the contact on their page (publications@amaravati.org is unverified), then send — https://amaravati.org/support/amaravati-publications/ — [docs/outreach/amaravati.md](docs/outreach/amaravati.md)
- [ ] **Abhayagiri** — submit the letter through their contact form — https://www.abhayagiri.org/contact/other — [docs/outreach/abhayagiri.md](docs/outreach/abhayagiri.md)
- [ ] **DharmaNexus** — get the email address from their people page in a browser, then send — https://dharmamitra.org/people — [docs/outreach/dharmanexus.md](docs/outreach/dharmanexus.md)

## Submissions to complete

- [ ] **Official MCP Registry** — after the npm package is published, run `npm run registry:check`, then `mcp-publisher login github` and `mcp-publisher publish` — [docs/listings/mcp-registry.md](docs/listings/mcp-registry.md)
- [ ] **Anthropic's plugin directory** — first add the icon and split the canon data (see "Other"), run `claude plugin validate . --strict`, then submit a Plugin bundle for `DaniilKi/pali-canon-claude` at claude.ai/directory/manage. It needs a paid claude.ai plan and the maintainer accepts the directory terms. This one submission also covers the community marketplace and the skills listing (issues #7, #8, #15) — https://claude.ai/directory/manage — answers in [docs/listings/claude-code-marketplace.md](docs/listings/claude-code-marketplace.md) and [docs/listings/skills.md](docs/listings/skills.md)
- [ ] **Codex plugin directory** — submit the plugin with a maintainer account, after the manual Codex test below — https://developers.openai.com/codex/plugins
- [ ] **Gemini extension gallery** — after the repository topic is added (see "Repository settings") and a release tag is pushed, confirm the listing and close #12 — https://geminicli.com/docs/extensions/releasing
- [ ] **Glama** — claim or add the listing (`glama.json` is in the repository) — https://glama.ai/mcp/servers
- [ ] **mcp.so** — submit the server — https://mcp.so/submit
- [ ] **Smithery** — publish the `.mcpb` now; add the hosted address once it is live — https://smithery.ai/new
- [ ] **awesome-mcp-servers** — after Glama lists the server, open the pull request with the ready line in the Art & Culture section — https://github.com/punkpeye/awesome-mcp-servers — text in [docs/listings/awesome-mcp-servers.md](docs/listings/awesome-mcp-servers.md)
- [ ] **skills.sh** — on your own computer run `npx skills add DaniilKi/pali-canon-claude --list`, then `npx skills add DaniilKi/pali-canon-claude`, then check that it appears — https://skills.sh
- [ ] **SkillsMP** — after a GitHub release, search "pali" and record the listing address in [docs/listings/skills.md](docs/listings/skills.md) — https://skillsmp.com
- [ ] **PulseMCP** — closed to submissions; it copies listings from the official registry. Check again later — https://www.pulsemcp.com/submit

## Native-speaker reviews

None yet. Translations of the documentation and tool messages into other languages come later; review requests will be listed here.

## Manual client tests

- [ ] **npm package** — after the first publish, run `npx -y pali-canon-mcp` once in a terminal to confirm it starts from npm, then recheck the `npx` examples in [docs/install/local-clients.md](docs/install/local-clients.md) — https://www.npmjs.com/package/pali-canon-mcp
- [ ] **Codex plugin** — run `codex plugin marketplace add DaniilKi/pali-canon-claude`, then `/plugins`, install Pali Canon, start a new session and try `$study MN 10`, `$compare Dhp 183` and `$pali-word sati` in the Codex CLI and app on Windows. Confirm the server starts (`cwd: "."`) and the `./` source installs, and check the skills read well (Codex does not fill in Claude's `$ARGUMENTS`). Then close #9 — [docs/install/codex.md](docs/install/codex.md) — https://github.com/DaniilKi/pali-canon-claude/issues/9
- [ ] **Codex plain server** — run `codex mcp add pali-canon -- node <repo>/server/index.cjs`; `/mcp` should list 11 tools. Then close #10 — https://github.com/DaniilKi/pali-canon-claude/issues/10
- [ ] **Gemini CLI** — in a signed-in Gemini CLI, check that `/mcp` lists the pali-canon tools and `/study MN 10` works; optionally try `agy plugin import gemini` in Antigravity CLI — [docs/install/gemini.md](docs/install/gemini.md) — https://antigravity.google/docs/cli/gcli-migration/
- [ ] **Cursor** — once the npm package is published, click the README button and the raw `cursor://` link — [docs/install/ide.md](docs/install/ide.md#cursor)
- [ ] **VS Code** — click the VS Code and VS Code Insiders buttons, try `code --add-mcp`, and confirm the tools appear in Copilot agent mode — [docs/install/ide.md](docs/install/ide.md#vs-code)
- [ ] **Windsurf** — test the config and confirm where `mcp_config.json` lives (Windsurf's docs now redirect to Devin Desktop) — [docs/install/ide.md](docs/install/ide.md#windsurf)
- [ ] **Zed, Cline and Goose (optional)** — try their configs and the `goose://` link — [docs/install/ide.md](docs/install/ide.md#goose)
- [ ] **A local AI model** — in LM Studio (quickest), Open WebUI or oterm with a tool-capable model, ask it to call `resolve_reference('MN 10')`. Then update the "Tested" section of the guide and tick the item on #16 — [docs/install/local-clients.md](docs/install/local-clients.md#tested) — https://github.com/DaniilKi/pali-canon-claude/issues/16
- [ ] **Hosted version in Claude web and phone** — after deploying, choose the public address (for example `https://pali-canon-mcp.fly.dev/mcp`), add it in Claude → Settings → Connectors → Add custom connector, confirm it works, then close #5 — https://github.com/DaniilKi/pali-canon-claude/issues/5
- [ ] **Nightly check** — run the nightly workflow once by hand and confirm it is green — https://github.com/DaniilKi/pali-canon-claude/actions/workflows/nightly.yml

## Repository settings

- [ ] **Require the CI checks** — in branch protection for `main`, make the six checks required: `Node 20 / ubuntu-latest`, `Node 22 / ubuntu-latest`, `Node 20 / macos-latest`, `Node 22 / macos-latest`, `Node 20 / windows-latest`, `Node 22 / windows-latest` — https://github.com/DaniilKi/pali-canon-claude/settings/branches
- [ ] **Turn on private vulnerability reporting** — it is off, so the link in `SECURITY.md` does not work yet — https://github.com/DaniilKi/pali-canon-claude/settings/security_analysis
- [ ] **Add the `gemini-cli-extension` topic** — in the repository's About section, so the Gemini gallery finds it — https://github.com/DaniilKi/pali-canon-claude
- [ ] **Publish and open the Docker image** — run the Docker workflow (or push the next tag), then make the `pali-canon-mcp` package public on GitHub so `docker run` works without signing in — https://github.com/DaniilKi/pali-canon-claude/actions/workflows/docker.yml

## Other

- [ ] **Split the canon data** — open a data issue to split `server/data/canon.json.gz` (5.3 MiB) into files under 5 MiB, because Anthropic's directory blocks larger files — [docs/listings/claude-code-marketplace.md](docs/listings/claude-code-marketplace.md#before-submitting-open-items)
- [ ] **Add our own icon** — a square PNG (512–2048 px, under 2 MB) at `.claude-plugin/icon.png` before the first directory submission (the directory reads it only once); also export `assets/icon.svg` to a 512×512 PNG for directories that do not accept SVG — https://claude.com/docs/plugins/pre-submission-checklist
- [ ] **Link the privacy policy and terms from the plugin** — add `privacyPolicyUrl` and `termsOfServiceUrl` to `.claude-plugin/plugin.json`, pointing at [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md) — https://github.com/DaniilKi/pali-canon-claude/issues/6
- [ ] **After the hosted version is live** — set up an uptime monitor on `<address>/healthz`, put the address in the README's "Hosted version" section, and add the `remotes` block to `server.json` and publish a new registry version — [docs/hosting.md](docs/hosting.md#uptime-monitoring), [docs/listings/mcp-registry.md](docs/listings/mcp-registry.md#the-hosted-version-add-when-5-is-live)
- [ ] **Post the Gemini maintainer checklist on issue #12** — it is in the body of PR #59 — https://github.com/DaniilKi/pali-canon-claude/issues/12
