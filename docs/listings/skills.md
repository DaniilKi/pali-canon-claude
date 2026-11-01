# Skill hub listings

This page is the ready-to-use material for listing our three study skills (`study`, `compare` and `pali-word`) on the public "skill hubs": websites and catalogues where people find skills for Claude, Codex and other AI apps. It tracks issue [#15](https://github.com/DaniilKi/pali-canon-claude/issues/15).

A skill is a short set of written instructions (a `SKILL.md` file) that teaches the AI how to do a task well. **Our skills do not work on their own.** They tell the AI to use the tools of the Pali Canon MCP server (the part of this project that holds the texts, the translation links and the dictionary). Every listing below must say so, and so does each skill file itself.

Checked on 1 November 2026. Hubs change often; re-check each link before submitting.

## What is ready in the repository

- **The skill files follow the open Agent Skills format** ([agentskills.io/specification](https://agentskills.io/specification)). Each `skills/<name>/SKILL.md` uses the fields that format allows (`name`, `description`, `license`, `compatibility` and `metadata`) plus one Claude Code field, `argument-hint`, explained below. An automatic test (`tests/core.test.mjs`) checks this on every change.
- **Each skill states that it needs the MCP server**, in three places:
  - the end of its `description` ("Requires the Pali Canon MCP server.");
  - the `compatibility` field, with the install link;
  - the first instruction of the skill, which tells the AI to say so and point to the install page if the tools are missing, rather than answering from memory.
- **The Claude Code slash-command hint** (for example `[Pali word] [optional sutta reference]`) stays as a top-level `argument-hint` field, because Claude Code only reads it there and shows it in the slash menu. A copy also sits under `metadata.argument-hint`. The strict format checker (skills-ref) would flag the top-level field, but none of the hubs below run that checker. If a hub ever rejects it, removing the top-level line fixes that, at the cost of losing the hint in Claude Code.

## Text to use on every hub

**Name:** Pali Canon study skills (`study`, `compare`, `pali-word`)

**Short description (one line):**
Study the Pāli Canon with exact Pāli text, named translators and precise citations. Requires the Pali Canon MCP server.

**Long description:**
Three skills for reading the Theravāda Buddhist scriptures carefully:

- **study**: find or explain a passage from a citation (MN 10, SN 56:11, Dhp 183, M i 55) or a topic, with the exact Pāli, the translator's name and the text ID, VRI paragraph or PTS page.
- **compare**: put the available English translations of a sutta side by side with the Pāli, keeping each translator's name attached to their words.
- **pali-word**: explain a Pāli word from the Digital Pāḷi Dictionary and show how it is used in cited passages.

**Requirement (must appear on every listing):**
These skills need the Pali Canon MCP server, which supplies the texts, translations and dictionary. Install it first: the Claude Code plugin, the Claude Desktop extension or any MCP-compatible app. Instructions: https://github.com/DaniilKi/pali-canon-claude#install

**Licence:** the skills and server code are MIT. Each text and translation keeps its own licence, which the server returns with every result.

**Links:**
- Source: https://github.com/DaniilKi/pali-canon-claude
- Skills folder: https://github.com/DaniilKi/pali-canon-claude/tree/main/skills

**Keywords:** pali, tipitaka, buddhism, theravada, sutta, scripture, dictionary, translation, citations, mcp

## The hubs

| Hub | How a listing happens | Who acts | Status |
| --- | --- | --- | --- |
| Our own Claude Code marketplace | Already live through `.claude-plugin/marketplace.json` in this repository | Nobody | Listed |
| [Anthropic's plugin directory](https://claude.ai/directory) (claude.ai, Cowork and Claude Code) | Submit the plugin from the developer portal | A maintainer with a paid claude.ai plan | To do |
| [skills.sh](https://skills.sh) (Vercel's open skills directory) | Appears automatically once people install with `npx skills add` | A maintainer runs the first install | To do |
| [SkillsMP](https://skillsmp.com) (independent index of `SKILL.md` files) | Indexes public GitHub repositories automatically | Nobody, then a maintainer checks | To check |
| [claude-market/marketplace](https://github.com/claude-market/marketplace) (community catalogue) | Pull request that copies the plugin into their repository | Not recommended for now | Skipped |

### 1. Anthropic's plugin directory

This is the main Claude catalogue. One listing reaches claude.ai, Cowork and Claude Code. Submissions go through the developer portal at [claude.ai/directory/manage](https://claude.ai/directory/manage); the steps are in [Submit your plugin](https://claude.com/docs/plugins/submit). This overlaps with issue [#7](https://github.com/DaniilKi/pali-canon-claude/issues/7) (Claude's connector directory); do both together.

What to enter:

- **What would you like to submit?** Plugin bundle.
- **Repository:** `DaniilKi/pali-canon-claude`. **Plugin path:** leave empty (the plugin is at the repository root). **Branch or tag:** leave empty to follow `main`, or use the latest release tag.
- **Listing details:** read from `.claude-plugin/plugin.json` and `README.md`; nothing to type. If the portal asks for a description, use the long description above.
- **Data handling answers** (true for the current code):
  - Reads or stores personal data: no. It stores no personal or user data; it only keeps public index pages from Access to Insight in memory while it runs.
  - Sends data to other services: only reference paths (which page of a translation to fetch) and dictionary words go out, read-only, to the fixed list of sites in `src/http.mjs` (Access to Insight and its mirrors, dhammatalks.org, the Digital Pāḷi Dictionary). Search queries are not sent anywhere: `search_access_to_insight` downloads the public index pages and searches them on the user's computer. The Pāli text itself is offline.
  - Data retention: none.
  - Intended for people under 18: no (general audience, not aimed at children).
- **Compliance:** a maintainer checks the contact email and reads and accepts the four acknowledgements. An agent must not accept these.

Before submitting, run `claude plugin validate . --strict` in the repository and check the [component support table](https://claude.com/docs/plugins/platform-support#compare-component-support-by-app): the MCP server in this plugin runs locally on the user's computer, so on claude.ai and Cowork the skills may load without their tools. Claude Code users get the full plugin.

### 2. skills.sh

skills.sh is a directory and leaderboard for the open `skills` installer, which works with Claude Code, Codex, Cursor and many other apps. Its FAQ says skills appear "automatically through anonymous telemetry" when someone runs the installer; there is no form.

To start the listing, a maintainer runs once, on their own computer:

```sh
npx skills add DaniilKi/pali-canon-claude --list
npx skills add DaniilKi/pali-canon-claude
```

The first line should show `study`, `compare` and `pali-word`. Then check https://skills.sh for the repository. People who install this way get only the skills, so they must install the MCP server too; the skill text tells the AI to say so.

### 3. SkillsMP

SkillsMP is an independent search engine for public `SKILL.md` files on GitHub. We found no submission form; reviews say it indexes public repositories by itself, possibly only those with a few GitHub stars (unconfirmed). The site blocked automated checks, so a maintainer should search it for "pali" after the first GitHub release ([#2](https://github.com/DaniilKi/pali-canon-claude/issues/2)) is published, and note here whether it is listed.

### 4. claude-market/marketplace (skipped)

A community catalogue that asks contributors to copy the whole plugin into their repository as a folder and open a pull request. A copy would fall out of date with every release and duplicate a large data bundle, so we do not submit there now. Users can already add our own marketplace with `/plugin marketplace add DaniilKi/pali-canon-claude`.

## When is #15 done?

The issue is done when the skills are listed on at least two hubs. Our own marketplace does not count, because people only find it if they already know the project. The two to complete first are Anthropic's directory and skills.sh. Record each listing's URL in the table above when it goes live.
