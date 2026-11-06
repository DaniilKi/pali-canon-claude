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

### D30. Quote checking reports what the searched texts contain, never who said what

- **Context.** Many sayings shared online as "the Buddha said" are not in the texts, and people asked for a way to check them ([#24](https://github.com/DaniilKi/pali-canon-claude/issues/24)).
- **Decision.** `verify_quote` matches a Pāli quotation against the whole bundled canon offline, and an English one against the linked translations of the texts named (by default the Dhammapada), fetched live under their terms. Its verdict is `found`, `close_paraphrase` or `not_found_in_scope`, always with the scope searched. It never makes claims about authorship. An English miss is not a finding about the saying: an older or freer translation of a real verse is listed as the first possibility, and the answer points to the Pāli check. When a wording matches several texts equally well (stock passages, repeated verses), the result gives the count and says no single text is the source. Test quotations are built from the bundled text or fixture pages, except the circulated quotations under test.
- **Consequences.** Answers stay honest about their limits. The first Pāli check builds a word index in memory (roughly 50 to 110 MB), which matters on a small hosted machine ([hosting.md](hosting.md)).

### D31. Citations in free text are read conservatively

- **Context.** People want to check every citation in an essay, a talk transcript or a reference list at once ([#25](https://github.com/DaniilKi/pali-canon-claude/issues/25)).
- **Decision.** `find_citations` only proposes spans; the existing parser and resolver decide what each one means. Abbreviations are case-sensitive, and short ones that can read as English or as another book (D, M, S, A, J, Dh, It and others) are skipped before bare numbers. "Mahāvagga" and "Cūḷavagga" count only after "Vinaya" or as Mv and Cv. Unresolved citations are reported with the reason, never corrected. Offsets are JavaScript (UTF-16) offsets.
- **Consequences.** Some real citations in unusual forms are missed, in exchange for no false ones. [citations.md](citations.md) says which forms are recognised in free text.

### D32. Uposatha and festival calendar: four reckonings, computed and labelled

- **Context.** People asked for observance and festival dates for each tradition ([#42](https://github.com/DaniilKi/pali-canon-claude/issues/42), [#43](https://github.com/DaniilKi/pali-canon-claude/issues/43)).
- **Decision.** Port three MIT calendar programs (splendidmoons for Thai Mahānikāya, pythaidate for Thai Dhammayut, mmcal for Myanmar) and use Meeus's astronomy for Sri Lanka, with the poya rule fitted to the 2024–2026 gazettes. Myanmar is checked against the Department of Civil Aviation holiday circulars. Every date is labelled `computed` with its rule. Published reference dates are test fixtures, with URLs, or a SHA-256 checksum where no archive copy exists. Dhammayut keeps its Pakkhagaṇanā reckoning as the default; because Wat Metta's lists follow Mahānikāya dates from May 2025, both dates are returned with a note. Myanmar Māgha Pūjā has no date, because no source names its Burmese month.
- **Consequences.** No data files and no network. Dhammayut dates can differ from the civil calendar by a day either way. Sri Lankan and Myanmar new-moon and half-moon days are not yet checked against a published list, so both issues stay open.

### D33. A method skill for genre, textual layers and uncertainty

- **Context.** Readers need to know what kind of text they are reading and which layer a claim comes from ([#38](https://github.com/DaniilKi/pali-canon-claude/issues/38)).
- **Decision.** The `method` skill covers genre (sutta, verse, Vinaya rule, Abhidhamma), early text versus commentary, school and teacher differences without ranking them, and how firmly to state a conclusion. It claims only what the bundled data proves, and tests check each claim. Commentaries are not bundled, so any commentarial reading must be labelled as commentary with where it was read, or called unverified. Naming the schools behind the Kathāvatthu's opposing views is attributed to its commentary. `study` and `compare` point to it.
- **Consequences.** Five skills instead of four. Like the others, it has not yet been tried by hand in Codex or Gemini CLI.

### D34. Daily texts and reading plans are fixed and verifiable

- **Context.** Practitioners asked for a text of the day and reading plans ([#45](https://github.com/DaniilKi/pali-canon-claude/issues/45)).
- **Decision.** `daily_text` steps through the bundled canon by a number coprime with the pool size, so a date always gives the same text for a given data version and every item comes up once per cycle. The sutta pool holds only texts with an English link. The study-guide plans keep only the Access to Insight links each guide cites, each resolved through the verified link index. Links that cannot be placed on exactly one text (single Itivuttaka verses on a multi-text page) are listed as omitted, never mapped by number.
- **Consequences.** A data rebuild can change the sutta for a date. Ṭhānissaro Bhikkhu's own study guides on dhammatalks.org could become another plan source later.

### D35. Topics from Access to Insight's indexes; numbered lists curated and checked against the text

- **Context.** People look things up by subject or by a numbered list, not only by citation ([#30](https://github.com/DaniilKi/pali-canon-claude/issues/30), [#31](https://github.com/DaniilKi/pali-canon-claude/issues/31)).
- **Decision.** Topics come from Access to Insight's General and Numerical indexes (CC BY 4.0, unlike most of the site), pinned to one commit, taking names, cross-references and links only. Links map to canon IDs only through the verified link index, or by citation for DN, MN, Dhp, Khp, Iti and Ud when the URL agrees; SN and AN are never mapped by number. Numbered lists are curated by hand, and a test requires every member's Pāli term to appear in the VRI text of every passage cited as defining it. Glosses are labelled as glosses, and lists not set out in the four main Nikāyas (the ten pāramīs) are labelled `later`.
- **Consequences.** 472 topics and 37 lists, offline. DPD word families wait for the offline dictionary ([#22](https://github.com/DaniilKi/pali-canon-claude/issues/22)) because of its download size.

### D36. Proper names: the dictionary is linked, not bundled, until its licence is confirmed

- **Context.** People ask who or where a name is ([#32](https://github.com/DaniilKi/pali-canon-claude/issues/32)). Malalasekera's *Dictionary of Pāli Proper Names* (1937–38) is the standard reference, but its author died in 1973, the Pali Text Society has not released it under Creative Commons, and the online editions state no licence.
- **Decision.** `lookup_name` ships with no dictionary entries. It links to the online editions and lists the texts that name the person or place, ranked by title, then opening, then body. Short one-word names are matched as whole words; `exactWord` does the same for any name.
- **Consequences.** The tool is useful today for finding passages but gives no biography. Entries can be added once the Pali Text Society or Ānandajoti Bhikkhu (for the revised edition) gives permission.

### D37. The tool surface is pinned by exact names, not a count

- **Context.** Wave 3 added fifteen tools in parallel branches. Each branch first changed the hard-coded "11 tools" checks to "at least 11", which hides a tool that silently fails to register.
- **Decision.** `scripts/expected-tools.mjs` reads the tool names from `src/server.mjs` and every module listed in `src/features/index.mjs`, importing nothing. The HTTP and widget tests, the smoke run and the npx check compare the live tool list with it exactly. Docs that must list every tool (the connector annotations table, the local-clients guide) are checked against the live tools.
- **Consequences.** A new feature tool needs no count edits, and a missing or extra tool fails the checks. Each new tool still needs its rows in those two docs.

### D38. Monastic rules link to the Buddhist Monastic Code, never quote it

- **Context.** People asked for each monk's rule with an explanation ([#40](https://github.com/DaniilKi/pali-canon-claude/issues/40)).
- **Decision.** `vinaya_rule` gives the rule's VRI text and a link to the section of Ṭhānissaro Bhikkhu's *Buddhist Monastic Code* that explains it, labelled as commentary. The mapping is generated from the book's table of contents (`scripts/build-bmc.mjs`), not typed by hand. Paired Sekhiya rules link to the shared section with a note. Bhikkhunī rules are out of scope and return an error. The seven Adhikaraṇasamatha rules point to the one VRI paragraph that lists all seven, because the canon index gives them wrong bounds. No rule titles are made up.
- **Consequences.** No English rule text until a licensed source allows it. The bounds of `pli-tv-bu-vb-as3` to `as7` still need a data fix for `get_text` and `resolve_reference`.

### D39. Abhidhamma tools read the bundled text and add no English of their own

- **Context.** The Abhidhamma had no study tools ([#39](https://github.com/DaniilKi/pali-canon-claude/issues/39)).
- **Decision.** `abhidhamma_matika` and `patthana_condition` parse the mātikā and the 24 conditions from the bundled VRI text at run time, so every Pāli string stays tied to the edition. Numbering and headings follow the VRI paragraphs exactly; no traditional triad names are added, because the text has none. Following D1, the tools give no English glosses: each condition points to `lookup_pali` with its Pāli term instead. Invented English names are not accepted as input.
- **Consequences.** Offline and faithful to the text, but readers need the dictionary or a translation for meaning.

### D40. The pronunciation guide links only grammars whose public-domain status can be checked

- **Context.** People asked how to read Pāli aloud and where to learn its grammar ([#41](https://github.com/DaniilKi/pali-canon-claude/issues/41)).
- **Decision.** The `pali://pronunciation` resource links a grammar only when it was published before 1931 and either the Internet Archive marks it not in copyright or its author died long enough ago. Duroiselle's 1921 scan is linked, not the 1997 "free distribution" reprint, because that is not an open licence. The English translation of Geiger is not linked, because its status could not be verified. Stress is not marked, because traditions place it differently.
- **Consequences.** Fewer links, each one safe to share.

### D41. Chanting texts come from the canon; chanting-book versions wait for permission

- **Context.** Practitioners asked for paritta and other chants ([#44](https://github.com/DaniilKi/pali-canon-claude/issues/44)).
- **Decision.** Each `paritta` entry holds canonical citations only and returns the bundled VRI Pāli. Where chanting books differ from the canon (Āṭānāṭiya, Bojjhaṅga, the Aṅgulimāla passage) the tool says so and returns the canonical text. The Khuddakapāṭha is the default where a chant is in both it and the Sutta Nipāta. The Vaṭṭa Paritta's source is Cp 29, with Ja 35 as an alternative. Names match exactly or as whole words; an ambiguous name is an error. English is given as links only. Chanting-book layouts and their English are permission-gated, and the gate reports each publisher's real status.
- **Consequences.** The core set works offline today. Layouts, translations and recordings need the drafted letters to be sent and answered, and a licensed recording source.

### D42. Dhamma talks are found through the site's own search and returned as links only

- **Context.** People asked for talks on a topic or a sutta ([#46](https://github.com/DaniilKi/pali-canon-claude/issues/46)). dhammatalks.org's robots.txt (checked 1 November 2026) allows this use, and its content is CC BY-NC 4.0.
- **Decision.** `find_talks` queries the site's own search page live, cached, with requests at least one second apart, and returns titles, dates and URLs only, never talk text. The site has no passage-to-talk index, so a passage is searched by the exact title of Ṭhānissaro's translation, and only when that title is distinctive (at least three distinctive words, or a Pāli name and three words, and not part of another of his titles). Each answer says a match means the phrase appears, not that the talk is about the sutta. Results continue with a per-category cursor.
- **Consequences.** Some passages cannot be searched. Other monasteries' talks need their permission; the Abhayagiri and Amaravati letters now ask.

### D43. Memorisation builds every card from retrieved text

- **Context.** Practitioners asked for help learning verses by heart ([#47](https://github.com/DaniilKi/pali-canon-claude/issues/47)).
- **Decision.** The `memorise` skill and the `memorise_passage` prompt are pure instructions that hold no scripture; every chunk and fill-in-the-blank card is built from `get_text` output, which carries the VRI attribution. The review intervals are general study guidance, not a practice ruling, and a test keeps the skill and the Gemini command on the same intervals.
- **Consequences.** Four prompts and five skills.

### D44. Search by meaning deferred: no small model links English questions to Pāli

- **Context.** [#33](https://github.com/DaniilKi/pali-canon-claude/issues/33) asked for semantic search. Only the VRI Pāli and its titles may be stored as derived data, and three small, openly licensed models were tested on 14 English concept questions over all 8,544 texts ([semantic-search.md](semantic-search.md)).
- **Decision.** Ship no `search_by_meaning` tool and no vectors. The best model placed a correct text in the top 10 for 3 of 14 questions (chance alone gives about 0.28) and never found the canonical answers; the two transformer models scored 0 of 14 and would need a large native runtime, which D21 excludes. A tool that returns confident but unrelated texts conflicts with the mission.
- **Consequences.** Concept questions go through Pāli search terms and the topic and list tools (D35). The issue stays open; `scripts/semantic/` keeps the evaluation reproducible for when a better model or storable English text exists.

### D45. Ānandajoti Bhikkhu's translations, linked on Pāli evidence

- **Context.** English was missing for parts of the canon, including all of the Abhidhamma ([#34](https://github.com/DaniilKi/pali-canon-claude/issues/34)). Ancient Buddhist Texts prints the Pāli line by line above the English.
- **Decision.** A page is linked only when the site names the text and its Pāli lines cover at least 60% of the VRI text's word 3-grams, with no other text in the collection within 0.10. SN and AN also need the Pāli title in the page's own heading to agree with ours; it is read from the site and stored, never copied from our data, and links where the spellings differ are dropped. The licence is CC BY-SA 3.0 Unported, per the site's 2013 Copyright Notice (the page footers' 4.0 is noted). Only `/Texts-and-Translations/` is allowlisted. The links live in their own file, `server/data/anandajoti.json`. PTS's Creative Commons volumes are not linked, because there is no authorised digital text.
- **Consequences.** 153 links, among them the first English for the Abhidhamma. They appear in the citation index export with their own licence label, and `verify_quote`'s default English scope grew to three translators (77 pages, under a raised cap of 80). The daily link check does not cover them yet; `scripts/anandajoti/audit.mjs` does.

### D46. Docs site and citation index export without new dependencies

- **Context.** Readers wanted the docs as a website, and researchers wanted the citation index as data ([#18](https://github.com/DaniilKi/pali-canon-claude/issues/18)).
- **Decision.** GitHub's own Jekyll action builds the site from a folder that the dependency-free `scripts/build-site.mjs` prepares; links that leave `docs/` go to GitHub. The citation index export holds no text, only IDs, locations and links, under VRI's non-commercial terms. Each translation link keeps its raw licence code and gains a readable name, taken from the pages' own notices, in both JSON and CSV; a test fails on any code without a name.
- **Consequences.** `package.json` gains no dependency. The site goes live only once GitHub Pages is switched on for the repository.

### D47. Only guidance is translated, and drafts wait for native review

- **Context.** Most Theravāda Buddhists do not read English ([#19](https://github.com/DaniilKi/pali-canon-claude/issues/19)).
- **Decision.** The skills and server instructions are drafted in Sinhala, Thai, Burmese, Khmer, Lao, Vietnamese, Simplified Chinese and Spanish under `docs/i18n/<lang>/`, each marked "Machine-drafted, awaiting native review". Scripture, citations, tool names and URLs are never translated, and a test keeps them verbatim. A language note tells the assistant to quote published translations in their original language and label its own renderings. Neither the skills nor the server load the drafts yet.
- **Consequences.** Changes to the English skills must be carried into all eight drafts (the test checks the tool names). #19 closes once at least Sinhala, Thai and Burmese are reviewed.

### D48. ChatGPT reading view only on the hosted endpoint, behind a switch

- **Context.** ChatGPT apps can show an interactive view, but the shared `tool()` helper cannot attach the metadata it needs, and stdio clients should not see it ([#11](https://github.com/DaniilKi/pali-canon-claude/issues/11)).
- **Decision.** `src/http-server.mjs` registers `read_passage_widget` directly when `CHATGPT_WIDGET=1`, not through the feature registry. The page is served both as an MCP App and under the Apps SDK alias, loads no external resources and renders data as text only. Its links may go only to the allowlisted English sources and link-only SuttaCentral. Long English continues with `english_offset` rather than a bigger limit. The submission name is `pali-canon`, display name "Pali Canon".
- **Consequences.** The hosted configs (`fly.toml`, `render.yaml`) turn the view on, so ChatGPT sees one more tool than other clients. Submission needs the hosted endpoint and a verified OpenAI organization.

### D49. Connector directory: palm-leaf icon and an annotations table that matches the server

- **Context.** Claude's Connectors Directory reviews each tool's annotations and needs an icon ([#7](https://github.com/DaniilKi/pali-canon-claude/issues/7)).
- **Decision.** The icon is the palm-leaf manuscript mark (`assets/icon.svg`, rendered to PNG), not the dharma wheel: it is less devotional, which fits "a library, not a teacher". Only the hosted connector is submitted, because desktop `.mcpb` listings are deprecated; the local server goes through the plugin route. The packet's annotations table must list exactly the live tools, and the packet gives no tool count.
- **Consequences.** Every new tool needs a table row (a test enforces it). Tool titles still have to be set in `src/server.mjs` before submission, and the privacy policy needs a retention statement for the hosted version.

### D50. Other scripts by our own transliterator, matched to VRI's script editions

- **Context.** Most Theravāda readers use the script of their own country ([#26](https://github.com/DaniilKi/pali-canon-claude/issues/26)). Aksharamukha, the usual converter, is AGPL. VRI publishes Devanagari, Sinhala, Thai, Myanmar and Khmer editions, but no Lao or Lanna edition at the pinned commit `2d134ff9`.
- **Decision.** We bundle no script editions (size, and one source of truth). Our own MIT module, `src/script.mjs`, transliterates the bundled Roman text when asked, following each VRI edition's own conventions: joiners, Myanmar ligatures and tall ā, and punctuation such as । ॥ ฯ ។ ။. Results label the Pāli as our transliteration (`script_note`) and keep IDs, citations and English in Roman. Input in any supported script is detected and converted to Roman before parsing or searching. Lao uses the Unicode Pāli letters with the Pāli virama; Lanna uses Tai Tham with sakot. Abbreviations in variant notes are told apart from sentence stops by what follows them.
- **Consequences.** `get_text`, `search_texts` and `resolve_reference` take a `script` option. The five VRI scripts are tested both ways against VRI's own files (a 0.5 MB fixture with checksums); Lao and Lanna are tested by round trip only until a printed edition or native reader can check them. Converting back to Roman cannot recover letter case, or some verse-end punctuation that Devanagari and Myanmar merge.

### D51. Thai, Myanmar and VRI edition pages are cited as edition, collection, volume.page

- **Context.** Readers in Thailand and Myanmar cite their national printed editions, and the bundled data already carried those page markers without exposing them ([#27](https://github.com/DaniilKi/pali-canon-claude/issues/27)).
- **Decision.** Edition pages are written `<edition> <collection> <volume>.<page>`, such as "Thai MN 1.103" or "Myanmar Dhp 15" (single-volume collections take the page only). VRI numbers these volumes within each collection, so a bare "Thai 9.55" is refused with a hint. The Vinaya is cited by book (Pj, Pc, Mv, Cv, Pvr). In VRI's own edition, SN and AN need the book name in brackets ("VRI SN 1.20 (Nidānavaggo)"), otherwise the candidates are listed. A case-sensitive "Sn" is still the Sutta Nipāta. A plain "Ap" covers the whole Apadāna book, while "Tha Ap" and "Thi Ap" refuse pages that begin in the other part. Pages that fall in a gap of the markers are refused, naming the nearest marked pages. Page numbers are reported as VRI recorded them.
- **Consequences.** `get_text` segments carry `thai_page_begins`, `myanmar_page_begins` and `vri_page_begins`, and `describe` returns `edition_pages`. The audit round-trips all 56,050 markers (56,048 resolve to a text containing them; one lies between texts and one is a repeated marker).

### D52. Structured variant readings parse VRI's notes conservatively

- **Context.** VRI's notes record where the Sinhala, Thai, PTS and other printed editions differ, but only as plain strings ([#28](https://github.com/DaniilKi/pali-canon-claude/issues/28)).
- **Decision.** `get_text` gains `variants: "structured"`, which splits each note into readings and the editions (sigla) that carry them; `includeVariants` stays and still means the raw notes. A reading is attributed only when the text in brackets opens with a known siglum and the reading has no digits, no editorial phrase (*na dissati*, *idaṃ padaṃ*, *potthakesu* and similar) and is not a bare *natthi*. "( ) natthi" and "idaṃ padaṃ natthi" are omissions, never readings. Notes with nested or unbalanced brackets, and everything else, are kept as verbatim remarks. The raw note is always returned. Sigla meanings come from VRI's help page, and *ka.* and *kaṃ.* are kept apart as printed.
- **Consequences.** 88.8% of the 18,725 notes give at least one attributed reading, and the audit checks that readings, omissions and remarks together cover every character of every note. The word a reading replaces is not identified, because the bundled data does not keep where each note sits; that needs a canon rebuild.

### D53. Accuracy is measured by tool-level checks in CI and graded by citations for models

- **Context.** Directory reviewers and users need measured results, not claims, that answers cite correctly ([#48](https://github.com/DaniilKi/pali-canon-claude/issues/48)).
- **Decision.** One question file (`evals/questions.jsonl`) drives every evaluation. Each question has a user prompt, the citations a correct answer must give, and checks that call the server's tools. CI runs these checks offline with the network switched off; every non-skipped question must pass, and every expected citation must resolve in the bundled canon. Questions for tools not yet built and for live sources are reported as skipped, never as passed. Calendar questions check only internal consistency and the linked texts. Model-level runs are graded without a judge model: every expected citation must appear in the answer, and refusals must say so.
- **Consequences.** A regression in citation resolution, numbering notes, approximate flags or the no-substitution rule fails CI with the question that caught it. Model scores cost usage and depend on the model, so they are run by hand and dated in the README.

### D54. Commentary is bundled and aligned by VRI paragraph, checked against its quotations

- **Context.** Readers ask what the traditional commentary says about a text, and the VRI repository at the pinned commit carries the Aṭṭhakathā (`romn/*.att.xml`) next to the root texts ([#20](https://github.com/DaniilKi/pali-canon-claude/issues/20)).
- **Decision.** The 47 commentary files are bundled in their own file, `server/data/commentary.json.gz` (10.8 MB, loaded lazily, separate from `canon.json.gz`), unchanged apart from markup removal. A passage runs from one numbered paragraph (VRI's own cross-reference to the root paragraph) to the next. It is aligned only when the bold words it quotes (counted only if rare in the book) fit the claimed root paragraph better than any paragraph within 8. Front matter, out-of-sequence numbers and passages whose quotations or headings point at another text stay unaligned: no alignment is better than a wrong one. Amendment after review: a numbered heading that opens a text ("3. Dukkhalakkhaṇavatthu"), with its introduction or story, always opens the next passage, so each text keeps its own story; and books that restart their paragraph numbering (the Jātaka per nipāta, Apadāna, Buddhavaṃsa, Cariyāpiṭaka, Paṭisambhidāmagga, Abhidhamma books) are split into segments where the numbering restarts, with each passage going to exactly one segment, chosen by the verse it quotes, then clear quotation evidence, then continuity confirmed by quotations. Every result is labelled "Commentary (Aṭṭhakathā), not the canon" with VRI's attribution, the work, the evidence type and the root paragraphs it explains. `get_commentary` serves it, and `get_text` takes `commentary: true` to add the first 20 segments.
- **Consequences.** Every text the commentary numbers is aligned except 8 named exceptions (AN 1.130, Bi Ss 10, three Ap, three Ja and one Paṭṭhāna text). The audit checks every alignment, the opening-heading rule, 35 spot-checks in both directions and 1,681 sutta headings against their texts' titles. SN and AN texts the commentary passes over get "no commentary", not a neighbour's. Three canon quirks surfaced and are worked around, not changed: SN 12.21 spans the same blocks as SN 12.20, Ja 152 carries a stray `gathalast` block, and AN 2.1 is titled with its vagga's name (HANDOFF).

### D55. Post-canonical books are bundled whole and labelled not canon; the Visuddhimagga is cited by chapter and VRI paragraph, not PTS page

- **Context.** The Visuddhimagga, the Abhidhammatthasaṅgaha and the sub-commentaries are what students read next, and they are in the same VRI repository ([#21](https://github.com/DaniilKi/pali-canon-claude/issues/21)).
- **Decision.** All 109 Ṭīkā and Añña books (`*.tik.xml` and `*.nrf.xml`, except the Peṭakopadesa and Milindapañha already in the canon, plus the Visuddhimagga and its Mahāṭīkā) are bundled in one file, `server/data/postcanonical.json.gz` (14.5 MB). That is over the self-set 12 MB target and is accepted: the package stays well under 60 MB and needs no download, extra host or disk cache; the audit fails above 16 MB. Every result carries `canonical: false`. Citations: "Vism ch. 4" or "Vism IV" (chapter); "Vism 1.1" (Ñāṇamoli's chapter.paragraph: exact for the chapter, while a paragraph other than 1 returns the chapter marked `approximate`, because VRI numbers paragraphs differently and no open concordance exists); "Vism §51" or "visuddhi. 1.51" (VRI paragraph); "Abhidh-s 1.4" (chapter and VRI section); other books by id ("mahavamsa 3"). Search citations round-trip: a hit is cited by paragraph only when `select()` gives back a range that holds it, otherwise by chapter or book, never by an ambiguous §N. Visuddhimagga PTS pages ("Vism p. 3", "Vism 3") are recognised and refused with an explanation: the VRI text has no PTS page markers and the PTS text on GRETIL was declined, so any page would be a guess. Post-canonical citations never shadow canon ones: `resolve_reference` tries them only after the canon resolver fails, and `search_texts` adds them only with `include_post_canonical: true`, in a separate `post_canonical` list.
- **Consequences.** New tools `get_post_canonical` and `search_post_canonical`. The audit checks all 1,245 chapter citations, the 896 Vism paragraphs in both forms, 569 Abhidh-s sections and the citation of all 219,282 blocks. #21 stays open until a maintainer picks a PTS-page concordance source for the Visuddhimagga or amends that criterion (HANDOFF).

### D56. A pinned subset of the Digital Pāḷi Dictionary is bundled for word analysis and offline lookups

- **Context.** Word-by-word analysis needs the dictionary for every word of a passage, far too many live requests, and `lookup_pali` failed whenever dpdict.net was down ([#22](https://github.com/DaniilKi/pali-canon-claude/issues/22), [#23](https://github.com/DaniilKi/pali-canon-claude/issues/23)).
- **Decision.** `server/data/dpd.json.gz` (5.3 MB, budget 18 MB) holds a subset of DPD release v0.4.20261026, pinned by the asset's SHA-256 (matching GitHub's digest) and DOI, with the database checksum recorded: all 89,763 headwords and 753 roots, and the inflection map and deconstructor splits for the 168,178 word forms of the bundled texts. It fits the budget, so no release-asset download or new host is needed. `analyse_passage` lists every DPD parse of each word, pairing each homonym with its own grammar (never another homonym's), gives the split with glossed parts and marks unknown words `unknown`; nothing is guessed. Quotation sandhi (for example `-’’nti` to `-ṃ ti`, `hotī’’ti` to `hoti ti`) is undone only when DPD knows the result. `lookup_pali` answers from the subset, labelled `offline: true`, only when dpdict.net is unreachable. Every result carries the CC BY-NC-SA 4.0 notice, and the subset is shared under the same licence.
- **Consequences.** The audit checks the pin, licence, canon commit, headword links and word coverage (99.74% of the canon's words, floor 98.5%). Loading the subset takes about 0.9 s and about 280 MB more resident memory, kept for the life of the process, so a hosted server that offers `analyse_passage` needs 1 GB (or 768 MB with a smaller `PALI_CANON_CACHE_MB`) ([hosting.md](hosting.md), HANDOFF). The monthly refresh (D58) moves the pin with each release.

### D57. A content-based second pass links translations that the number and title rules leave out

- **Context.** The conservative linker left many dhammatalks.org and Access to Insight pages unlinked where the translator's numbering or title differs from ours ([#37](https://github.com/DaniilKi/pali-canon-claude/issues/37)).
- **Decision.** A second pass compares the names in the English page (people, places, Pāli words the translator kept, the page's Pāli title) with the Pāli of the texts within 15 numbers of the page's own, counting a name only when it occurs in at most 2% of the collection's texts. Three rules, each recorded as the link's `match` with the matched names stored as `evidence`: `content-pts+names` (the page's PTS page lies in the text, and the text has names no nearby text has), `content-number+names` (two or more rare names found in this text and no other nearby, within 5 numbers) and `content-title+number` (the Pāli title names exactly one nearby text, ordinals agreeing, within 5 numbers, and no other text has more of the names). Multi-text pages and introductions are skipped, and any collision drops the link. Two fixes to the first pass: Access to Insight `…x.<translator>` pages count as the same sutta as the plain page, and same-titled siblings bridge to the nearest number.
- **Consequences.** 92 new links (64 content matches, 28 recovered by the fixes) and none removed: 2,540 links, covering 1,400 texts directly and 1,823 including inherited verse links (`list_sources` now returns `translation_coverage` per collection, counting ranges through their members: 1,374 and 1,797). A seeded sample of 50 new links was checked by hand: 50/50 correct. The audit checks each content link's evidence against the Pāli and forbids one page on two texts or two pages from one source on a text.

### D58. Bundled data is refreshed monthly through a pull request, never merged automatically

- **Context.** VRI, Access to Insight, dhammatalks.org and DPD all publish corrections, and the pinned data drifts unless someone rebuilds it ([#50](https://github.com/DaniilKi/pali-canon-claude/issues/50)).
- **Decision.** `.github/workflows/data-refresh.yml` runs on the 3rd of each month, and on demand with optional `vri_ref` and `dpd_tag` (validated before they reach the shell). It rebuilds every data file against upstream HEAD with the existing scripts (optional builders only when their scripts exist), records each upstream commit or release with checksums, moves `DPD_PIN`, and runs `validate.py`, the build, the audit and the tests. Only files whose parsed content changed are copied. It opens, or updates, one `data-refresh` pull request with a readable diff report (`scripts/canon/diff_report.py`: texts added, removed or moved, PTS and link changes, the 60 MB package budget, and whether every linked ID still resolves). A failed check makes the pull request a draft titled "(checks failing)". SuttaCentral use stays limited to the Mahāsaṅgīti root for numbering.
- **Consequences.** A person reviews and merges every refresh. The first run needs the repository setting "Allow GitHub Actions to create and approve pull requests" and one manual run (HANDOFF). Pull requests opened with `GITHUB_TOKEN` do not start other workflows, so the job dispatches `check.yml` itself.

### D59. Parallels and cross-references are built from the bundled canon and commentary, never from SuttaCentral

- **Context.** Scripture tools for other traditions link each passage to related ones; we linked only to SuttaCentral, whose data we may not use ([#29](https://github.com/DaniilKi/pali-canon-claude/issues/29), D4).
- **Decision.** `scripts/parallels/build.mjs` builds `server/data/parallels.json.gz` (0.5 MB) offline from `canon.json.gz` and `commentary.json.gz`, recording both files' SHA-256 and the VRI commit, deterministically (the same bytes for the same inputs; a test rebuilds it). Two link sources, and every link names its own. (1) `commentary-citation`: VRI's bracketed references in the Aṭṭhakathā ("‘‘…’’ti (ma. ni. 1.27)") resolved by book, volume and VRI paragraph, the paragraph unique in its book and belonging to one text, with the quotation found again in the cited paragraph (±1): a piece of at least 12 letters whole or a run of 25 letters; a quotation that is not there drops the link; a reference to a run of paragraphs spanning several texts must have the whole quotation in each. Without a quotation a reference is used only outside SN and AN (`vri-reference`). Suttas named in the commentary ("Ambaṭṭhasutte") are linked only when the name, diacritics included, is the title of exactly one text, within the Nikāya when one is named just before; relative references ("anantarasutte") never. A name is ambiguous, and dropped, when it is also the start of another text's title or of a DPD sutta name (`dpd_sutta`, `dpd_sutta_var`, read from `glossary.json.gz` only for this check: "udaya" is also Udayamāṇavapucchā, "ajita" Ajitamāṇavapucchā, "mahāsatipaṭṭhāna" also MN 10), or when a Cūḷa- or Mahā- title ends in it ("rāhulovāda"). A name is also dropped when a VRI reference in brackets next to it points at another text, and after "Evaṃ me sutanti", where the commentary names its own text. A quotation next to the name (the ‘‘…’’ quotation ending just before it, or the one the commentary introduces just after it as what was said, "Vuttañhetaṃ (…) – ‘‘…") must come from the named text: unless VRI's own reference on it points at the named text, the quotation is looked up in the whole canon (up to 12 runs of 25 letters spread over it), and the link is dropped when another text holds more of it than the named text does. A name inside a quotation that repeats another passage of the same commentary is not a separate citation. Only commentary passages aligned to exactly one text are read, so the citing text is known. (2) `shared-passage`: runs of 8 words (diacritics folded, never across a peyyāla mark) found in at most 4 texts, leaving out runs made mostly of 5-word phrases found in more than 10 texts; a pair needs 30 shared words with 20 in one stretch, or 12 words in one stretch covering 90% of the shorter text (70% from 20 words); some of the shared words must be rare (in at most 20 texts). Pairs inside books that repeat their own glosses or tables (the Niddesa, Paṭisambhidāmagga, Kathāvatthu, Dhammasaṅgaṇī, Vibhaṅga, Yamaka, Paṭṭhāna and Parivāra) and texts sharing the same blocks are left out. Each link stores the score, shared words, coverage and corresponding segment refs. `get_parallels` returns shared passages first, then citations out and in, with the SuttaCentral page as a link only. DharmaNexus data is not used until its maintainers reply (letter in docs/outreach); the parallels columns of the DPD sutta table are not used, because their provenance could not be confirmed as independent of SuttaCentral.
- **Consequences.** 5,301 commentary citations (147 by sutta name) and 1,516 shared passages; every DN text and 148 of 152 MN texts have links, SN 633 of 1,954 and AN 661 of 2,085. A hand check of 30 random links of each kind read both texts: commentary citations 29/30 in the first sample (the miss, a range reference, led to the per-text rule above) and 30/30 in a second. The independent review of the integration (#105) found wrong sutta-name links that the first build matched with diacritics folded (CNd 17 → SN 7.12 for the Pārāyana's Udaya, the Ajita and Tissametteyya questions linked to AN 10.116 and Snp 4.7, "pārāyanasuttaṃ" → SN 43.44); the name rules above removed them and 117 others (268 → 151 name links). All 151 were then read again and a fresh sample of 30 hand-checked: 30/30 correct. Four followed the commentary's own naming where the quoted passage is in a neighbouring sutta ("bakabrahmasuttena" in the Theragāthā and Apadāna commentaries → SN 6.4, while the passage quoted is SN 6.5); the quotation rule above removed them and nothing else (151 → 147), because no link is better than a wrong link; shared passages 25/30 at first, then 29/30 after the stock and same-book rules. The audit rechecks every link: both texts resolve, cited and shared segments exist, the commentary segment holds the evidence, the quotation is found again, no SN/AN link rests on a number, the shared segments share an 8-word run, and the inputs' SHA-256 match. The monthly refresh rebuilds the file after the data it depends on.

### D60. One normaliser for Pāli typed on an English keyboard, conservative and always labelled

- **Context.** Most people type Pāli without diacritics, in Velthuis or Harvard-Kyoto, or with anglicised spellings ("sanyutta", "nyana"). Search already folded diacritics, but these spellings, dictionary lookups and names failed ([#102](https://github.com/DaniilKi/pali-canon-claude/issues/102)).
- **Decision.** `src/input.mjs` is the only normaliser, shared by every tool that takes Pāli words. Per word: NFC and ṁ = ṃ always; Velthuis markers (DPD's KOReader table, plus `m..`, `n..`, `,,n`) whenever they sit inside a word of four or more letters, since English words never contain them; Harvard-Kyoto capitals, doubled vowels, anglicised `ny` (ñ or ṃy) and a short list of Sanskrit/English aliases (nirvana → nibbāna) only when the word as typed is not a word of the bundled canon and the result is. An all-caps word is never Harvard-Kyoto. Every rewrite is returned as `input_normalised` with the original, the reading and the rule. Spelling variants (DPD's English fuzzy key: no aspirate h, no doubled consonants, ny = ñ, ṃ = n before a consonant) are searched only when the exact folded search finds fewer than 3 texts, labelled `spelling_note`. `lookup_pali` lists every bundled DPD headword that folds to a diacritic-free word (`inferred_spelling`).
- **Consequences.** "vacuum", "McDonald", "NASA", "e.g." and every citation form pass unchanged (tested). After the review of #105, a rewrite must give an exact canon word or a stem of at least 4 letters that a canon word extends by at most 3 letters, spelled with ñ or ṃ exactly where the rewrite puts them, and never a word ending in ñ ("any", "many", "Kenya", "Tony" stay as typed). Capitalised abbreviations whose only Harvard-Kyoto capital is the last letter (DhA, ItI, ThagA) and "ed.Name" forms are left alone, and "sutra" becomes "sutta" only when the other words are Pāli ("Metta sutra", not "Heart Sutra"). The alternates `m..`, `n..` and `,,n` are read as ṃ, ṅ and ñ by analogy with the standard sequences; no published table was found for them. The canon vocabulary takes about 0.6 s to build on first use.

### D61. Sutta names resolve only when they name one text; ambiguous names list the candidates

- **Context.** People ask for "the Satipatthana Sutta" or "the Metta Sutta", but many titles are shared: the Mettasutta is Kp 9, Snp 1.8, Iti 22, SN 46.62, AN 7.62, AN 8.1 and AN 11.15 (#102).
- **Decision.** `resolve_reference` tries names only after the citation parser fails. The index holds the bundled Pāli titles (folded, with or without "sutta/suttaṃ/suttanta"), the English titles of the bundled translation links and DPD's own sutta names (`dpd_sutta`, `dpd_sutta_var`), mapped to canon IDs through VRI's file and paragraph number and kept only where the canon title agrees; DPD's SuttaCentral columns and its SuttaCentral-style codes are not used. A query with any digit never reaches the name index, so no SN or AN text is resolved by a number taken from a name. "… sutta" excludes non-sutta texts with the same stem (Satipaṭṭhānakathā). One text resolves with `matched_by: 'name'` and `name_match`; several give an error that lists every candidate with its citation. One exception, stated in the result: when exactly one candidate is in DN or MN and all others are in SN or AN (where texts are cited by number), the DN/MN text is returned and the others are listed under `also_named` (so "Satipatthana Sutta" is MN 10, with SN 43.5 and AN 4.274 listed). Collection words with spaced numbers ("samyutta 56 11") are read as SN 56.11 only for full, unambiguous collection words.
- **Consequences.** `analyse_passage` takes names through the same resolver. After the review of #105 the index also holds the Pāli names Access to Insight gives its pages (`pali_title` in `translations.json`, read from the page title before the colon by `build_translations.py`), so "Adittapariyaya" lists SN 35.28 (ATI's "Adittapariyaya Sutta", the Fire Sermon) and SN 35.235 (VRI's Ādittapariyāyasuttaṃ) instead of silently returning the second; English titles are also indexed without a leading article ("Fire Sermon"). A single word reaches a text through an English title only with "sutta", "chapter" or "vagga" in the query ("Anger chapter"), so "Anger" is a topic, not the Dhammapada's Kodhavagga. `get_text` and `get_metadata` still take citations only; the server instructions already say to resolve first.

### D62. English questions are expanded into Pāli from DPD's English index, never from invented glosses

- **Context.** The canon is Pāli, so "mindfulness of breathing" and "suffering" found nothing (#102).
- **Decision.** `server/data/glossary.json.gz` (1.5 MB, budget 3 MB, audited) is built by `scripts/dpd/build_glossary.py` from the pinned DPD release: DPD's English index (`lookup.epd`) and the multi-word senses of DPD meanings, limited to headwords whose forms occur in the bundled canon, ranked by DPD's own early-text counts (a word in DPD's own senses before one only in a "(comm)" sense), at most 10 per key. The curated `dhamma_lists` glosses are the second source. Every entry names its source. `search_texts` gains `english` (`auto`, `off`, `only`): with `auto`, a query whose words are not canon words but are in the glossary is expanded (longest known phrase first, at most 4 Pāli terms per word and 8 in all, dropped terms counted) and the result carries `expanded_from_english` with the mapping, source and the Pāli searched; the search as typed still runs, and when it finds nothing in the text the expansion's results are shown. English translation titles now count in the title search. A new offline tool, `glossary`, looks terms up both ways.
- **Consequences.** Common English words that are also Pāli forms (there, he, have, no, so, same, made, use, did, say…) are stop words, and a word that is in DPD's English index as an English word ("hate", "time") does not make a query Pāli; a Pāli loan in the index ("nibbana") still does. A spelling rewrite no longer blocks expansion when most of the words are as typed. A question that is English stop words around Pāli words ("How many jhanas are there") searches the Pāli words only, an English plural s dropped, labelled `english_words_ignored`. Glosses are labelled as dictionary labels, not translations. Words DPD does not index (for example "loving-kindness") are reported as not found rather than guessed. The glossary moves with the DPD pin in the monthly refresh (D58).

### D63. Batch integration testing

- **Context.** Each feature pull request waited for its own run of the full GitHub CI matrix (Node 20 and 22 on Ubuntu, macOS and Windows) and its own independent review. With several features in flight, these per-PR waits doubled the cycle time.
- **Decision.** At the maintainer's request (2026-11-01), feature branches run the local gates only: `npm run check`, `npm run smoke` and `npm run evals`. The full CI matrix and one independent review run once, on a combined integration branch that merges the finished feature branches, followed by fix loops on that branch until it is green.
- **Consequences.** Failures caused by interactions between features (shared registries, tool counts, docs tables, platform differences) surface later, on the integration branch rather than on each feature branch. The set of possible causes stays small, because each branch has already passed the local gates on its own.

### D64. Deterministic byte shards for directory packaging

- **Context.** Anthropic’s [current directory checklist](https://claude.com/docs/plugins/pre-submission-checklist) blocks files of 5 MiB or more. Canon, commentary, post-canonical texts and the DPD subset exceed that limit. Dropping texts or downloading them at runtime would weaken offline access.
- **Decision.** Split the existing gzip bytes into 4 MiB parts with ordered JSON manifests containing byte counts and SHA-256 hashes. Verify each part and the reconstructed original before decompression. Keep legacy monolith loading for build compatibility; unpack temporary originals for Python tools. The bundle build maintains the shards, and the audit checks their integrity and size. Source records and all original compressed-byte hashes remain unchanged.
- **Consequences.** This fixes the individual-file blocker while retaining the same text, coverage and lazy loading. It does not eliminate reviewer holds for binaries or files above 256 KiB, or guarantee directory acceptance. The existing privacy and terms pages are linked using the documented manifest URL fields; their content is unchanged. Submission and acceptance of directory terms remain with the maintainer.

### D65. Verify the entire corpus through the shipped offline MCP server

- **Context.** The source audit checked the complete dataset, while installed-package checks loaded only the canon through one reference. That left omitted lazy datasets and differences in the shipped bundle outside the exhaustive check.
- **Decision.** Audit a temporary copy containing only `server/`, with an empty working directory and a guard that rejects and records network attempts. Compare every paginated canonical text, every available aligned commentary and all post-canonical books through MCP with the source corpus, including exact segment text, citations, totals and continuation offsets. Exercise the remaining dictionary, glossary and parallels loaders. Expand the cross-platform npm installation check to load all of them too.
- **Consequences.** One CI leg runs the exhaustive installed audit; the npm matrix checks lazy package contents on every OS. Unaligned commentary and VRI abbreviations remain explicit limitations, not fabricated passages. The optional JSON report lists unaligned texts so follow-up work can be specific. No upstream text, alignment or licence changes are made.

### D66. Search the complete stanzas returned by text retrieval

- **Context.** Searching a complete retrieved verse from Dhp 5, Dhp 183 or Vism §1 returned no result when the quotation crossed an XML verse-line boundary. Retrieval joins these blocks into one stanza; search previously checked each block separately.
- **Decision.** Index verse blocks together using the same stanza boundaries as retrieval. Keep prose blocks separate and stop at canonical ownership boundaries. Treat whitespace uniformly in the search index and quoted phrases, while preserving source line breaks in excerpts. A post-canonical hit's citation must contain every block of the matched stanza, not only the first line.
- **Consequences.** Whole retrieved verses are searchable without changing any source text, licence, alignment or corpus coverage. Negative tests prevent matches formed by joining separate texts or stanzas. Source and installed-server checks cover the regression. This does not add a full-text commentary search endpoint or fill source gaps.

### D67. Search complete bundled commentary books without inventing alignments

- **Context.** The data bundle already contains 47 complete VRI Aṭṭhakathā books, but `get_commentary` exposed only passages aligned confidently to canonical texts. Introductions and other unaligned content could not be found through a global commentary search.
- **Decision.** Add a read-only offline `search_commentary` tool over the existing rendered book text. Extend `get_commentary` with a distinct `commentary:<VRI-file>` namespace and exact `/cN` segment references. Hits carry source attribution, non-commercial terms, a direct read request and a bounded context request. Direct reading and searching return `canonical: false` and explicitly make no root-alignment claim. Canonical-citation commentary reads retain their existing behavior.
- **Consequences.** Already bundled unaligned material becomes accessible without fetching new sources or changing scripture, source licences, alignment evidence or corpus data. Invalid book filters and segment references fail explicitly. References belong to the returned bundled VRI revision. The exhaustive installed audit checks every page of all 47 commentary books and a search/read round trip in each, with network access disabled.

### D68. Match canonical search scopes at identifier boundaries

- **Context.** The collection filter used an unrestricted string prefix: searching `sn1` returned SN 10–19, `an1` admitted AN 10–11, and `kv1` admitted Kv 10 and later chapters. An unknown scope silently returned no results, which could be mistaken for source absence.
- **Decision.** Match a collection, exact identifier or descendants separated at a real identifier boundary. A numbered identifier cannot absorb additional digits. Preserve case/space normalization, named Vinaya parents and explicit group membership recorded in the source index. Reject scopes that contain no known collection or identifier. Apply the predicate to both body and title matches, so normalization, expansion and pagination cannot reintroduce sibling sections.
- **Consequences.** Search results stay inside the requested section. Regression tests compare every numbered SN, AN and Kv section against its members in the unfiltered search, and installed-server checks verify representative boundaries and invalid-scope errors. Source data, canonical references, alignments and complete-book retrieval are unchanged.

### D69. Count and paginate title matches independently of body search

- **Context.** The query `discourse` has 153 indexed title matches in this bundle, but only the first 20 were returned; offset was ignored and no title continuation existed. Literal English title streams could also switch to expanded Pāli titles when a later literal page was empty.
- **Decision.** Apply offset/limit to title matches and return `total_title_matches` plus `title_next_offset`. Preserve the existing body `next_offset` contract as an independent stream. Select literal versus expanded title streams using global counts, not current page length. Compare spelling-variant title improvements using total counts. Suppress literal titles in English-only mode when no expansion exists, and never advertise a zero-sized page as a non-advancing continuation.
- **Consequences.** Every title match is reachable without repeating the first page, including title-only queries with no Pāli-body hits. Existing title record shapes, source text, links, licences and coverage remain unchanged. Regression and installed-package checks cover all title pages, exhausted streams, scope filters and English expansion.

### D70. Preserve phrase constraints with curly double quotes

- **Context.** Pasting typographic double quotes silently changed phrase search to unordered keyword search. With `sati buddha`, canonical matches increased from 1 to 188, Visuddhimagga matches from 1 to 21, and the selected commentary book from 0 to 72. Failed curly-quoted phrases could also trigger loose spelling or English-question keyword retries.
- **Decision.** Share paired straight/curly double-quote parsing across all three Pāli corpora. Preserve inner punctuation, phrase order and whitespace normalization. Treat either double-quote style as a constraint against loose retries; leave apostrophes and explicit English expansion behavior alone.
- **Consequences.** Formatted-text queries return the same passages and totals as straight-quoted queries. Regression and isolated installed-package checks cover all three corpora and failed-phrase fallbacks. No source data, citations, alignments, licences or translation links change.

### D71. Browse exact identifiers and recorded group membership

- **Context.** Browsing `mn1` returned 64 texts, including MN 10 and MN 100; `sn1.1` returned SN 1.10–19 as well. Recorded ranges such as `dhp1-20` were rejected even though their members were present. The final unrestricted prefix fallback also accepted partial collection names such as `s`.
- **Decision.** Share the canonical search scope predicate with browsing: match exact IDs, real descendant boundaries or explicit recorded membership. Preserve collection/section menus, source ordering, pagination, abbreviated-record filtering and named Vinaya parents. Advertise exact text and recorded group IDs in the existing tool description.
- **Consequences.** Discovery does not mix numbered siblings and all 99 recorded groups can be opened using their source members, without interpreting arbitrary ranges. Tests cover every complete text identifier and recorded group, plus protocol and isolated installed-package checks. Source data, numbering, alignment, rights and providers are unchanged.

### D72. Keep Pāli quotation matches inside their cited source passage

- **Context.** The Pāli verifier indexed all books as one token stream. Juxtaposed fragments from the end of MN 1 and start of MN 2 (also SN 1.1/1.2) scored as an exact match while citing only the first text. A passage spanning Dhp 183/184 likewise cited just Dhp 183, leaving part of its excerpt outside the returned citation.
- **Decision.** Build source-region boundaries from the outermost indexed citable units, preferring complete coverage over approximate records. Reset candidate windows at region boundaries, keep nearby candidates from different regions separate, and bound similarity refinement to the region. Select the most specific citation containing the entire final block span, including a containing recorded group when needed. Count tied sources using the same complete span.
- **Consequences.** Independent neighbouring texts cannot supply one quotation, while recorded groups can support cross-member passages with a correct containing citation. Regression and isolated package checks verify boundaries and excerpt containment. Scripture, source data, licences and English/provider behavior remain unchanged.

### D73. Preserve printed edition provenance when scanning citations

- **Context.** The free-text scanner discarded printed-edition prefixes. `Myanmar Dhp 15` became verse Dhp 15 rather than the page beginning in Dhp 14, and `VRI SN 1.20 (Nidānavaggo)` became sutta SN 1.20 rather than the printed page beginning in SN 12.17. Valid Thai page references could instead appear unresolved as malformed sutta numbers.
- **Decision.** Scan full printed-edition page spans before embedded numbered/PTS forms. Derive accepted edition/scope aliases from existing citation tables, retain recognised parenthetical book qualifiers from source titles using the direct lookup's book-prefix comparison, and preserve original offsets. Keep invalid numeric ranges and Roman edition volumes as edition candidates so their errors cannot turn into successful alternate citations.
- **Consequences.** Scanned displayed page labels agree with direct resolution, including ambiguous and unresolvable markers. Ordinary parenthetical prose stays separate. Exhaustive label, regression and offline package checks cover provenance and offsets. Source content, numbering, rights, providers, quotation verification and existing direct page semantics are unchanged.

### D74. Validate both endpoints before returning the first text of a range

- **Context.** General ranges such as `MN 10–9999` and `Dhp 1–99999` resolved successfully because only their first endpoint was checked. The free-text citation checker consequently reported invalid ranges as resolved. Reversed multi-level endpoints such as `SN 2.1–1.1` were also accepted, while equal endpoints claimed to span several texts.
- **Decision.** Expand abbreviated numeric ends, require matching endpoint depth and compare whole paths for ordering. If an unrecorded range falls back to its first text, require its final endpoint to exist directly or through an existing source group. Preserve recorded groups, valid first-text range behavior and grouped-member notes; distinguish identical endpoints.
- **Consequences.** Invalid endpoints become explicit parser/resolver errors across scanning, metadata and retrieval. Regression and isolated package checks cover both invalid and valid spans. This checks endpoints only: it neither retrieves an assembled range nor guarantees separately indexed intermediate numbers. Source text, numbering, alignment, rights and quotation verification are unchanged.

### D75. Discover already indexed Ancient Buddhist Texts links

- **Context.** Direct citation resolution already supported all 153 bundled Ānandajoti landing links and their 123 part-page links, but the free-text citation scanner excluded their host. All 153 landing links were missed, so a reference list could silently omit an existing supported source.
- **Decision.** Add the exact Ancient Buddhist Texts host (with optional www) to the scanner's existing host check. Preserve normal URL boundaries, source path case and percent encoding. Resolve only through the existing bundled URL index; unknown paths remain unresolved and lookalike hosts remain excluded.
- **Consequences.** Existing ABT mappings are discoverable through free-text and MCP citation scanning, verified for every current landing and part-page URL. This adds no source content, mapping assumptions, fetching, network hosts, licences or quotation-verification changes.

### D76. Preserve paired phrase delimiters during input normalization

- **Context.** The normalizer consumed the opening quote in `"namo tassa"` as a Velthuis letter marker, producing `ṅamo tassa"`. Canonical results consequently increased from 18 phrase matches to 81 keyword matches; `"nibbana buddha"` similarly returned 39 keyword matches despite having no exact phrase match. Curly quotes retained the intended phrase.
- **Decision.** Protect paired straight phrase delimiters at word boundaries, then normalize tokens inside and outside them separately. Retain internal and unpaired Velthuis markers and existing labelled spelling conversions. Search receives the same phrase delimiters after normalization.
- **Consequences.** Normalized straight-quoted searches agree with curly-quoted searches across canonical, commentary and post-canonical tools, and failed phrases do not silently become keywords. Tests cover input encoding and shipped offline MCP behavior. Source text, citation numbering, licences, providers and quotation-verification code are unchanged.

### D77. Use actual title fields and expose proper-name ranking evidence

- **Context.** Proper-name lookup searched translation reference strings but missed explicit English titles. The indexed title King Pasenadi Goes on a Diet did not qualify SN 3.13 as a title match. Replacing the field outright would also drop legacy dhammatalks titles stored after citation headers. Concatenating titles could falsely combine a name across unrelated fields.
- **Decision.** Search each Pāli or stored English title separately. For known dhammatalks caption formats, extract only the explicit title suffix; bare citations and generic reference labels do not become titles. Return matched_titles with title, language, source and translator, and distinguish metadata-only matches from Pāli-body occurrences. Preserve body ranking and the unlicensed DPPN entry gate.
- **Consequences.** Pasenadi's existing English-title hit ranks before opening-only matches, with inspectable evidence. Regression and installed-package checks cover all metadata formats, citation exclusion, field isolation and licence behavior. No source content, mapping, provider fetching, rights or quotation-verification changes occur.

### D78. Resolve stored dhammatalks title captions through the common metadata extractor

- **Context.** Name resolution indexed explicit English title fields but omitted legacy dhammatalks captions. A Gallon Measure and King Udena were present in the bundled metadata yet reported as unknown names. Proper-name ranking already extracted those captions, leaving the two discovery paths inconsistent.
- **Decision.** Share the existing conservative title extractor between proper-name ranking and sutta-name indexing. Use the existing canonical mapping and source label, preserve article aliases, and retain all topic, digit and ambiguity safeguards. Bare references remain excluded; no page or new title is fetched or inferred.
- **Consequences.** Stored title captions resolve by their names, with existing name-match provenance. Exhaustive fixtures verify every eligible caption through public resolution and preserve all mapped candidates; installed-package tests cover names, aliases and safeguards. Proper-name output, source data, licences, provider fetching and quotation verification are unchanged.

### D79. Use recorded source groups for unprinted member search and browsing

- **Context.** Citation lookup resolved AN 1.300 to its printed source group an1.297-305, but search and browsing rejected the same member ID. This inconsistency made available grouped text appear unavailable through discovery tools.
- **Decision.** Reuse citation lookup's existing group mapping only when the requested ID is absent from the index. Search uses the actual group scope; browsing returns its source-group card. Both expose scope_resolution with the original request, resolved group ID, approximation flag, explanation and retrieval pointer. Exact IDs, section boundaries and unknown-ID errors retain their existing rules.
- **Consequences.** Discovery accepts the same 7,397 currently unprinted numeric member aliases as citation lookup, without inventing individual texts. The 583 aliases mapping to approximate groups keep that warning; approximate groups themselves remain excluded from full-text indexing. Exhaustive alias browsing and representative search, expansion, pagination and installed-package regressions verify the substitution. No corpus content, provider, licence or quotation-verification changes occur.

### D80. Refresh shared-passage bounds after final clipping

- **Context.** Five abbreviated Bhikkhu adhikaraṇasamatha records retained an end offset copied before their declared owner was clipped. They and their parent group retrieved much of the following Bhikkhunī text and inherited unrelated commentary assignments.
- **Decision.** Synchronise explicit shared records with their declared owner's final span before the builder creates parent groups. Repair the committed legacy canon/commentary pair deterministically: update only the five records' bounds and page metadata, their group's bounds and page metadata, and remove stale commentary assignments outside existing owner/member mappings. Preserve approximation flags, references, source blocks and all remaining mappings; rebuild the derived parallels index for the corrected inputs. Reject invalid sharing relationships rather than guessing.
- **Consequences.** The five records now retrieve the same six root segments and twelve commentary segments as their declared owner; the parent group contains nine root segments. All 199 explicit sharing relationships receive an exhaustive boundary/page audit. Removing the stale assignments also makes two existing Bhikkhunī commentary citations eligible for the parallels builder's unique-owner rule: the regenerated index has 5,303 citations, with all prior links retained, and the same 1,516 shared passages. Regression tests cover invalid/cyclic sharing, post-clipping synchronisation, retrieval and installed-package behavior. The 266 approximate records and all source/text coverage totals remain unchanged; no abbreviated text is expanded and no new root-commentary alignment is asserted.
