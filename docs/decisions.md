# Decisions

The major decisions behind this project, why they were made, and what follows from them. When a decision changes, add a new entry that supersedes the old one rather than editing history. Newest decisions are at the bottom.

Format: **context** (the problem), **decision** (what we chose), **consequences** (what it means in practice).

---

### D1. A library, not a teacher

- **Context.** AI models are increasingly asked religious questions, and tend to answer with confident paraphrase.
- **Decision.** The tool supplies texts, translations and reference material faithfully. It does not issue interpretations, rulings or teaching on practice. Skills tell Claude to separate scripture, translation, dictionary gloss and its own explanation, and to state uncertainty.
- **Consequences.** Every tool response carries its source and licence. Questions of practice are directed back to the tradition and its teachers.

### D2. An MCP server, plus skills, packaged for Claude first

- **Context.** Claude connects to tools through the Model Context Protocol. Claude Code installs plugins, and Claude Desktop installs `.mcpb` extensions.
- **Decision.** One read-only MCP server serves every surface. Study method lives in `SKILL.md` skills and MCP prompts. It is packaged as a Claude Code plugin (`.claude-plugin/`) and a Claude Desktop extension (`manifest.json`).
- **Consequences.** The same server and skill format can later be packaged for Codex, Gemini, ChatGPT and editors with little new code ([#52](https://github.com/DaniilKi/pali-canon-claude/issues/52)).

### D3. Bundle the whole Pāli canon, offline

- **Context.** Version 1 fetched text live from SuttaCentral, and failed whenever a site or a citation format failed. Scripture should not depend on a website being up.
- **Decision.** Bundle the VRI Chaṭṭha Saṅgāyana Tipiṭaka (5.6 MB compressed) at a pinned commit.
- **Consequences.** Reading, citation lookup, PTS lookup and search work offline and reproducibly. Corrections from VRI arrive only when we rebuild ([#50](https://github.com/DaniilKi/pali-canon-claude/issues/50)).

### D4. Do not use SuttaCentral content; link to it

- **Context.** SuttaCentral's data was technically the best option, but SuttaCentral and its translators ask that their work not be used in AI tools.
- **Decision.** Do not fetch or bundle SuttaCentral texts or translations. Link to SuttaCentral for parallels and other translations. The shared citation numbering is used as nomenclature, aligned once at build time using the public-domain Mahāsaṅgīti Pāli.
- **Consequences.** No Sujato or Brahmali translations; parallels must be built another way ([#29](https://github.com/DaniilKi/pali-canon-claude/issues/29)). Do not add SuttaCentral retrieval in future work. Reasoning and quotes: [sources.md](sources.md#why-suttacentral-is-linked-not-used).

### D5. Standard numbering for IDs; report the other scheme

- **Context.** In SN and AN the standard (Bodhi/SuttaCentral) numbering and the older PTS-based numbering (Ṭhānissaro, Access to Insight) differ.
- **Decision.** Citation IDs use the standard numbering. Whenever a linked translation uses a different number, the tool reports it.
- **Consequences.** Users can cite in either system. Translations are never matched by SN/AN number alone (see D7).

### D6. PTS volume and page as the shared anchor

- **Context.** PTS page numbers are the edition-independent reference used by scholarship, and both numbering schemes share them.
- **Decision.** Take PTS page breaks from VRI's own markers. Resolve "M i 55" to the text that begins on, or spans, that page.
- **Consequences.** PTS lookups are exact and checked in the audit. Verse collections are cited by number, not page.

### D7. No link is better than a wrong link

- **Context.** An independent review of an early v2 draft found about 15 wrong and 26 doubtful translation links, caused by numbering differences.
- **Decision.** Link a translation only on strong evidence: number and title, a unique PTS start page, a whole chapter, or a confirmed title. Check ordinals. Allow one page per source per text.
- **Consequences.** 2,295 trustworthy links. Some real translations are not linked yet ([#37](https://github.com/DaniilKi/pali-canon-claude/issues/37)).

### D8. Never substitute one translation for another silently

- **Context.** Falling back to "any available translation" misattributes words to a translator.
- **Decision.** If a requested translation is missing, say so and list what exists. The only fallback is Ṭhānissaro's own earlier version on Access to Insight, used when dhammatalks.org is unreachable (not when a page is missing), and it is labelled as the earlier version.
- **Consequences.** Users always know whose words they are reading.

### D9. Mirrors must be official or long-standing

- **Context.** Websites go down; unofficial copies may be altered.
- **Decision.** For Access to Insight, use the BCBS repository that deploys the site (through GitHub and jsDelivr), then the Digital Pali Reader's mirror.
- **Consequences.** Each response says when a mirror served it.

### D10. Flag abbreviations; do not reconstruct them

- **Context.** The Pāli abbreviates repeated passages (*peyyāla*). Expanding them would be our own reconstruction.
- **Decision.** Mark such texts approximate and point to the passage where the abbreviation occurs.
- **Consequences.** 266 texts are labelled approximate rather than presented as complete.

### D11. Read-only and allowlisted

- **Context.** Tools that fetch URLs can be misused to reach arbitrary sites.
- **Decision.** The server contacts a fixed list of hosts and path prefixes, re-checks redirects, limits response sizes, and offers no write, file or command tools. Retrieved content is data, never instructions.
- **Consequences.** Adding a source means adding it to the allowlist in `src/http.mjs` deliberately.

### D12. Software MIT; texts keep their own terms

- **Context.** Most Buddhist text licences are non-commercial.
- **Decision.** The code is MIT. Every text keeps and returns its own licence. We never sell content and ask users not to.
- **Consequences.** A paid hosted service would need permission from each source first.

### D13. Commit the built server

- **Context.** Plugin users should not need a build toolchain.
- **Decision.** Commit `server/index.cjs` and `server/data/`. CI fails if the committed build is stale.
- **Consequences.** Rebuild and commit `server/` with every source change.

### D14. Write our own script transliterator

- **Context.** Aksharamukha is excellent but AGPL-3.0, which would force that licence on the whole tool.
- **Decision.** Write a small MIT transliterator for the Theravāda scripts and test it against VRI's own script editions ([#26](https://github.com/DaniilKi/pali-canon-claude/issues/26)).
- **Consequences.** Scripts are added one at a time, with tests.

### D15. Claude first, then everywhere

- **Context.** Bible and Quran tools are already available in many AI apps; Theravāda has almost none.
- **Decision.** Make the tool excellent in Claude first (desktop, Code, then a hosted version and the connector directory), then package the same server for Codex, ChatGPT, Gemini, editors and registries.
- **Consequences.** Distribution work is tracked in the Distribution milestone, and the npm package and hosted endpoint come first because the rest depend on them.

### D16. Release assets are built by CI, with checksums made at release time

- **Context.** Packing the `.mcpb` is not byte-reproducible (the zip records build times), and a Windows-built zip can drop the executable bit on `server/index.cjs`. No `SHA256SUMS.txt` existed for v2.0.0.
- **Decision.** `.github/workflows/release.yml` builds every release on Ubuntu from the tag: `npm run check`, smoke test, `.mcpb`, npm tarball, then `SHA256SUMS.txt` over exactly the files it uploads. It runs on `v*` tags, or by hand for an existing tag (used for v2.0.0, tagged on `0cd736f`). npm publishing runs only when the `NPM_TOKEN` secret exists.
- **Consequences.** The checksums on a release always match its attached files. Locally packed bundles will have different hashes; that is expected.

### D17. Drop the dictionary's tables before turning entries into text

- **Context.** Digital Pāḷi Dictionary entries contain inflection tables, tab buttons and a frequency table. These showed up as noise in `lookup_pali` ([#49](https://github.com/DaniilKi/pali-canon-claude/issues/49)).
- **Decision.** Remove those parts as whole HTML sections before converting the entry to plain text: the declension, conjugation, inflection, frequency and feedback sections, the button box and the footer. Root and compound family lists stay. The result says that tables are left out and links to the full entry.
- **Consequences.** The excerpt no longer stops at the first meaning's frequency table, so later meanings can appear. If the dictionary renames these sections, the noise comes back, but no content is lost.

### D18. Check every source and link every night, and report in one issue

- **Context.** Outages and dead translation links went unnoticed. The outage drill only printed results, and the live smoke test tries only a few fixed calls, so one dead link among 2,295 would never be seen ([#3](https://github.com/DaniilKi/pali-canon-claude/issues/3)).
- **Decision.** The outage drill now fails when a result differs from the failover design: with one site down every call must succeed through a mirror; with every allowed host down, online calls must fail cleanly and the offline Pāli must still work. A new link check opens a different 250 translation links each day, one at a time, one second apart, through the same allowlist as the server. It fails on 404/410, on links the allowlist refuses, or when every checked link on a host is unreachable. The nightly job reports through one rolling "Source health" issue instead of opening duplicates. Pull requests are tested on Node 20 and 22 on Linux, macOS and Windows.
- **Consequences.** The nightly job turns red whenever a live source, mirror or link is broken. A dead link can take up to about ten days to show up, which keeps the load on the source sites low. Close the issue once the problem is fixed.

### D19. Privacy commitments and support contact

- **Context.** Claude's connector directory, ChatGPT's app directory and Codex require a privacy policy and a support contact. A hosted version was planned ([#6](https://github.com/DaniilKi/pali-canon-claude/issues/6)).
- **Decision.** The local version collects nothing. The official hosted version keeps only running totals (tool use, errors, response times), never request content, and never IP addresses together with requests. Support goes through GitHub Issues; security reports go through GitHub's private vulnerability reporting. The code of conduct adopts the Contributor Covenant 2.1. These are written down in `PRIVACY.md`, `TERMS.md`, `SECURITY.md` and `CODE_OF_CONDUCT.md`.
- **Consequences.** Any hosted copy must be built so that request content is never logged. Weakening the privacy policy needs a clear public notice. `manifest.json` lists `PRIVACY.md`, and the `.mcpb` and npm package ship it.

### D20. Ask each source directly, and never guess a contact

- **Context.** Several sources' terms for AI use are unconfirmed, and some need permission: Wisdom Publications, the Buddhist Publication Society, chanting books, DharmaNexus and the Dictionary of Pāli Proper Names ([#51](https://github.com/DaniilKi/pali-canon-claude/issues/51)).
- **Decision.** Write one courteous letter per source in [docs/outreach/](outreach/README.md), each using a contact route checked on the source's own website. Where a site could not be checked, the letter gives only the contact page; no address is ever guessed. The maintainer sends the letters; agents never do. The letters describe the planned online version only as one that does not log what people ask or read.
- **Consequences.** Until a source replies, it is used only within its published terms, and features that need permission ship without that content. Replies, including refusals, are recorded in [sources.md](sources.md). A refusal makes that source link-only.

### D21. The npm package has no runtime dependencies

- **Context.** Apps that install tools with `npx` need a package on npm ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)). The built `server/index.cjs` is fully self-contained; the MCP SDK and zod are needed only to build and test it.
- **Decision.** Publish only `server/` plus the readme, licence and privacy files, with no runtime dependencies (they moved to `devDependencies`). A CI job (`npx.yml`) packs the tarball and starts it on Linux, macOS and Windows with a dependency-free check. Publishing runs from the release workflow with provenance, only when the `NPM_TOKEN` secret exists.
- **Consequences.** `npx` downloads one file of about 5.8 MB and nothing else. The server finds its data next to itself, and a test proves this by running it from a temporary folder. Any future runtime import must be bundled, or `npx` installs break; the CI job catches this.

### D22. The npm package name is `pali-canon-mcp`

- **Context.** The package had the working name `pali-canon-claude`, with only a command called `pali-canon-mcp`. Every install guide for other apps needs one npm name that works with `npx` ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)).
- **Decision.** Publish the package as `pali-canon-mcp`, the same as its command, with the MCP Registry name in `mcpName`.
- **Consequences.** Clients use `npx -y pali-canon-mcp`. The GitHub repository keeps its name, `pali-canon-claude`. Until the first publish, the docs give `node /path/to/server/index.cjs` as the fallback.

### D23. The hosted version is stateless and keeps nothing on disk

- **Context.** Claude on the web and phone, the connector directory and people who host their own copy need a web address (`/mcp`), without breaking the local package or the licence and privacy rules ([#5](https://github.com/DaniilKi/pali-canon-claude/issues/5), [#17](https://github.com/DaniilKi/pali-canon-claude/issues/17)).
- **Decision.** Tool registration moved to `src/server.mjs` (`createServer()`), shared by the local entry (`src/index.mjs`) and the web entry (`src/http-server.mjs`, built to `server/http.cjs`). Every request gets a fresh server (stateless Streamable HTTP). There is no sign-in, because the content is public and the server only reads. A per-visitor rate limit (120 a minute by default) keeps IP addresses in memory for one minute only; behind a proxy, only the configured number of trusted hops is believed. Only running totals are kept, shown at `/healthz`. Live translation and dictionary results are cached in memory (64 MB, six hours), whole and with their licence; failures are never cached and SuttaCentral is never fetched. The Docker image is `ghcr.io/daniilki/pali-canon-mcp`. Fly.io is the main host, with Render as an alternative.
- **Consequences.** The server can run as many copies as needed with no shared state. Any hosted copy must stay free of charge, because the sources are non-commercial. It needs about 512 MB of memory. The desktop `.mcpb` leaves out `http.cjs`. Releases bump `VERSION` in `src/server.mjs`. It is not deployed yet: that needs a hosting account.

### D24. MCP Registry name keeps the GitHub login's capital letters

- **Context.** The MCP Registry lets a GitHub account publish names under `io.github.<login>/`, using the login's exact case, and compares names case-sensitively. The registry also requires remote addresses to be reachable, and the hosted version is not live ([#14](https://github.com/DaniilKi/pali-canon-claude/issues/14)).
- **Decision.** The server is named `io.github.DaniilKi/pali-canon`. `server.json` lists only the npm package, with no remote address, because an invented address must not go into a public file; `scripts/check-server-json.mjs --publish` refuses placeholders. Every directory gets the same name, description, icon and keywords from [listings/README.md](listings/README.md). In awesome-mcp-servers we list under Art & Culture, next to the Bible and Quran servers.
- **Consequences.** Registry publishing waits for the npm package. Each release bumps the `server.json` versions, and a test enforces this. A new registry version adds the remote once the hosted version is live.

### D25. Claude Code marketplace: one name, and the directory as the only way in

- **Context.** Claude Code installs a marketplace entry by its name, and the entry's description replaces the plugin's own in listings. Anthropic's directory (claude.ai/directory) is the only way into both the plugin directory and the community marketplace; it blocks any file over 5 MiB and reads the icon only once ([#8](https://github.com/DaniilKi/pali-canon-claude/issues/8)).
- **Decision.** The plugin and the marketplace are both called `pali-canon` (install id `pali-canon@pali-canon`). The marketplace description must match `plugin.json`, and the version is set only in `plugin.json`; a test enforces this. Submit through the directory only, after splitting `canon.json.gz` (5.3 MiB) into smaller files and adding our own icon.
- **Consequences.** Listings stay consistent, and users get an update only when the `plugin.json` version goes up. Our own marketplace works today; the directory listing waits for the data split and the icon.

### D26. Codex and Gemini run the bundled server with `node`, not `npx`

- **Context.** Codex plugins and Gemini CLI extensions can start the server with `npx` or with `node` and a path. `npx` needs a published package, and an unclaimed name could be taken by someone else. Installing either from this repository copies the built server and data with it ([#9](https://github.com/DaniilKi/pali-canon-claude/issues/9), [#10](https://github.com/DaniilKi/pali-canon-claude/issues/10), [#12](https://github.com/DaniilKi/pali-canon-claude/issues/12)).
- **Decision.** Both run `server/index.cjs` from the installed copy with `node`. Codex uses its own `.mcp.codex.json` with `cwd: "."`, because Codex otherwise starts the server in the user's working folder. Gemini uses `${extensionPath}`, like `manifest.json` uses `${__dirname}`. The skills are reused unchanged; Codex gets `agents/openai.yaml` beside each skill, and Gemini gets three command files in `commands/`. No Codex tool timeout is set, so its 300-second default applies.
- **Consequences.** Both work offline today with no npm dependency. `server/index.cjs` and `server/data` must stay committed, and the Codex and Gemini manifests join the release version bump; tests enforce both. Neither has been tried by hand in the real apps yet, and Antigravity CLI support relies on Google's `agy plugin import gemini`.

### D27. One-click editor buttons go through https hand-off pages

- **Context.** GitHub removes links that start with `cursor:`, `vscode:` or `goose:` from Markdown, so install buttons cannot point at them directly ([#13](https://github.com/DaniilKi/pali-canon-claude/issues/13)).
- **Decision.** Buttons use Cursor's and Microsoft's https hand-off pages. The raw links are shown as text to copy, and Goose gets text only. All links are generated by `scripts/install-links.mjs`, and a test checks that the docs match.
- **Consequences.** The buttons depend on those hand-off pages staying up. Changing the server or package name means rerunning the script, or the test fails. The buttons use `npx`, so they work only once the npm package is published.

### D28. Local AI apps: node path first, Open WebUI through mcpo on this computer only

- **Context.** People who run models on their own computer asked for setup help. Open WebUI's built-in MCP support works only over HTTP, and the npm package is not published yet ([#16](https://github.com/DaniilKi/pali-canon-claude/issues/16)).
- **Decision.** Document Open WebUI through the mcpo bridge, bound to `127.0.0.1` by default (mcpo otherwise listens on every network address). Lead every example with `node <path>/server/index.cjs`, and give `npx -y pali-canon-mcp` only as the form to use once it is published. List Kit next to MCPHost, which is archived. Ship a suggested system prompt with the citation rules, because mcpo drops the server's own instructions.
- **Consequences.** The guide works today, without npm, on computers that are often offline. The mcpo version pins need checking when mcpo is updated. A test keeps the guide's offline table in step with the registered tools.

### D29. Skills follow the Agent Skills spec, plus Claude Code's `argument-hint`

- **Context.** Skill hubs and other agents read `SKILL.md` files using the open Agent Skills spec, whose strict validator rejects extra top-level fields. Claude Code reads `argument-hint` (the hint in the slash menu) only at the top level. A skill installed alone from a hub arrives without our server ([#15](https://github.com/DaniilKi/pali-canon-claude/issues/15)).
- **Decision.** Use the spec fields, and keep `argument-hint` at the top level as the one Claude Code extension, with a copy under `metadata.argument-hint`. Every skill says it needs the Pali Canon server in its description, its `compatibility` field and its first instruction, which tells the AI to say the tools are missing rather than answer from memory.
- **Consequences.** Claude Code keeps the slash-menu hint. A strict validator would flag `argument-hint`; if a hub ever enforces that, removing the line fixes it but loses the hint. A test enforces these rules, and listing copy is in [listings/skills.md](listings/skills.md).
