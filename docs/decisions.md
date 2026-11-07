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

### D64. Retry transient ATI index mirror failures and retain source diagnostics

- **Context.** Source health #107 reported ATI search failing with the primary site and GitHub raw unavailable, although a translation could still be read through jsDelivr. The report truncated the index error before the CDN failure, and the exact live failure did not recur in the 5 November cloud session. The code gave backup mirrors no retries and labelled any successful index mirror as GitHub, including the CDN.
- **Decision.** Opt ATI index loads into one retry per backup for the existing retryable failure classes. Keep other mirror callers unchanged, require both indexes, and cache only a successful pair. Wait for both index loads so errors identify each failed index and its mirror diagnostics. Return the exact index source URLs and print complete search errors in the outage drill. Add deterministic regression coverage for a transient CDN failure, persistent failures, recovery and attribution.
- **Consequences.** A transient CDN error can recover when it is the only reachable mirror host. A persistent outage still returns an error rather than incomplete search results. Each backup can take one extra timeout plus the existing 400 ms retry delay; the retry count remains bounded. No new source, host or bundled content is introduced. The nightly run remains necessary to confirm the original intermittent failure has cleared.

### D65. Full-corpus reading through MCP as a development-branch acceptance gate

- **Context.** The maintainer asked for reliable operation across all texts and consolidation on a development branch. The existing exhaustive audit exercised source modules, while the MCP smoke check sampled passages. Neither alone proved that every continuation of every packaged text could be read through the built server. A separate data-sharding contribution also needs a semantic equivalence check.
- **Decision.** Add an offline stdio MCP reading check for every indexed canonical unit, commentary availability and aligned segments, and all post-canonical books. Compare every returned segment with the current source representation, require exact continuation/count/source labels, and retain a page-size independent semantic fingerprint and machine-readable report. Report unassigned source blocks, and fail if any numbered body block is outside every citation span. Add corruption fixtures, measurable completion criteria and development/integration branch CI; keep the existing full audit and real-client reviews.
- **Consequences.** Packaging and pagination regressions can be detected across the full corpus, and storage-only changes can be compared semantically. This is not an independent edition or manuscript audit: it shares source parsing/segmentation code. Missing English, unaligned commentary, unassigned front matter, native-script review and deployment/client checks remain explicit gaps. No religious text is generated to conceal them. The sharding contribution is not considered integrated until the actual combined commit and checks are verified.

### D66. Complete VRI source-book readings alongside individual citations

- **Context.** The completion scan found nine centred source blocks outside individual citation spans: two Pācittiya recitation introductions and seven AN opening invocations. They were present in the bundled data but inaccessible through `get_text` by individual citation. Readers also need to continue through an entire source book without reconstructing its citation boundaries.
- **Decision.** Add a `books` catalogue to `browse_canon` and an explicit, mutually exclusive `book` selector to the existing `get_text` tool. Resolve only catalogue IDs or exact bundled VRI filenames; use the existing segment/variant/script rendering over the entire root-file block range. Return source-file references, the pinned source/terms and `selection: 'source_book'`, without an individual `text_id`. Require `uid` for English translations and aligned commentary. Add full-book reading to the exhaustive protocol gate, preserving the earlier three-scope fingerprint separately.
- **Consequences.** All 61 root files, including the nine previously uncited blocks, are readable offline. Source-book positions are not represented as standard sutta/rule citations, and abbreviations stay as printed. No data, licence, network host or tool count changes. The new module uses the existing data-loader API so it can be checked with the separate sharding work once that commit is available.

### D67. Bound HTTP diagnostic labels to known protocol methods and configured tools

- **Context.** HTTP counters recorded every incoming method and tool name as a permanent object key, even when the name was unrecognised. A local reproduction sent 40 distinct invalid method names and 40 invalid tool names: all were retained and exposed by `/healthz`. Names such as `constructor` and `toString` also inherited object properties and produced non-numeric counters. Invalid clients could grow these dictionaries for the server's lifetime, contrary to the documented aggregate-only diagnostics.
- **Decision.** Derive allowed method labels from the installed SDK's client request/notification schemas and tool labels from the server titles and optional widget. Group other names under `other`, and use dictionaries without object prototypes. Preserve recognised counters and transport behaviour. Add HTTP regressions and an actual SDK-client connection/read/continuation check for both individual citations and complete source books.
- **Consequences.** Diagnostic-key cardinality is bounded by the configured protocol/tool surface rather than request volume, and unrecognised request strings are no longer retained or published as labels. Counts still describe attempts, including invalid messages. This is local HTTP compatibility evidence; it does not replace signed-in app testing, cross-platform CI or deployment acceptance.

### D68. Preserve pooled HTTP connections across first-use event-loop pauses

- **Context.** Concurrent SDK clients exposed `ECONNRESET` failures before some tool requests reached the HTTP handler. Their frequency varied with workload. A separate deterministic regression reproduced a reset by reusing a pooled connection after a 6.1-second event-loop pause, beyond the short default idle window in the tested Node runtime. This can coincide with synchronous first-use index loading; it is independent of text correctness.
- **Decision.** Set the HTTP server's keep-alive idle window to 65 seconds and its header deadline to 66 seconds. Add a real pooled-connection regression and verify the compiled server with the existing concurrent-client load test. Keep tool logic, client retries, source data and execution deadlines unchanged.
- **Consequences.** The tested cold-work pause no longer invalidates the client's pooled connection. Idle sockets are retained longer but still have a finite deadline. This does not reduce first-use CPU latency or prove that every deployment proxy/client timeout is suitable; real deployment and client acceptance remain necessary. Reference: [Node HTTP keep-alive semantics](https://nodejs.org/api/http.html#serverkeepalivetimeout).

### D69. Clear failed reader results and pin English continuation to its selected translation

- **Context.** The ChatGPT reader ignored tool errors without Pāli and could keep the previous passage and links visible. Its trusted redirect metadata omitted the already-supported Ancient Buddhist Texts origin, and partially read multi-page translations displayed a literal null total. English character offsets could also cross between a default translation and an outage fallback/recovered version, whose text lengths differ.
- **Decision.** Version the template as `v2`; return widget errors in both text and structured content, and clear old content on Apps SDK/MCP Apps error delivery. Include the existing Ancient Buddhist Texts source in trusted redirect origins while leaving widget network access empty. Omit unknown totals in the UI. Return exact `english.continue_with` arguments and require their translation ID for positive English offsets; refuse a fallback version at that position. Add script/DOM, HTTP and mocked source regressions. The plain `get_translation` API is unchanged.
- **Consequences.** Failed reads are not represented by stale scripture, and the reader does not apply one version's offset to another. This is not a content-version checksum: a publisher can still edit a page at the same URL. Local bridge/script tests do not replace signed-in ChatGPT and mobile acceptance. No new content, fetch host, licence or tool is introduced. Contracts were checked against the [OpenAI widget reference](https://developers.openai.com/plugins/reference) and [MCP Apps tool-result errors](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html).

### D70. Reject unknown post-canonical book filters instead of implying missing source text

- **Context.** `search_post_canonical` accepted unknown book names but selected no files, returning an ordinary empty result. A mixed valid/invalid list silently searched only its recognised part. It also used a passage parser for book filters, broadening `mahavamsa 3` to the entire book rather than interpreting it as an invalid book selector.
- **Decision.** Validate every filter against existing whole-book keys and recognised work aliases; reject unknown entries with a catalogue recovery hint. Preserve empty-list/unrestricted behaviour, alias deduplication and genuine no-match results. Test every catalogue ID and the public MCP error/result distinction. Keep canonical search logic unchanged.
- **Consequences.** A filter typo cannot be presented as an absent teaching or incomplete evidence. Chapter and paragraph reads still use `get_post_canonical` normally. This changes validation only; source content, attribution, file layout and search matching/ranking are unchanged.

### D71. Keep English character offsets within one translation version across all tools

- **Context.** The plain `get_translation` API still accepted a default or translator-name selection with a positive offset. When dhammatalks.org failed or recovered between calls, that offset could select a different version's character position. The widget guard from D69 did not protect stdio clients or continuation of English attached to `get_text`.
- **Decision.** Enforce an exact `translation_id` for positive offsets in the shared English provider. Return `continue_with` containing `get_translation` and its exact next arguments. Refuse the cross-version dhammatalks-to-ATI fallback after offset 0, while retaining labelled first-page fallback and identical ATI archive mirrors. Test outages, recovery, terminal pages and the public MCP continuation from attached English.
- **Consequences.** Clients using a default or translator name for continuation must use the returned continuation arguments. Initial selection, sources and attribution remain unchanged. This pins a linked version's ID, not a historical snapshot of upstream content; publisher edits at the same URL still need a separate content-version design. D69's plain-API limitation is superseded by this change.

### D72. Retry interrupted provider bodies and cancel rejected downloads

- **Context.** The provider reader classified connection failures before headers as retryable, but a stream failure after headers escaped as a raw error and skipped those retries. A streamed response exceeding the 6 MB limit released its reader lock without cancelling the unread download.
- **Decision.** On body-read failure, cancel unread data and release the reader. Preserve permanent size errors; classify other read failures as retryable with the source hostname and error kind. Each retry starts a fresh request and discards all partial chunks. Keep the existing attempt counts, allowlist, timeout, mirror order and size limits.
- **Consequences.** A temporarily interrupted page can recover under the configured bounded retry policy. Oversized responses remain errors with no retry, and their downloads are cancelled. Tests use real Web response streams for interruption, cancellation, exhaustion and successful UTF-8 decoding; this does not establish any live provider's availability.

### D73. Normalise native-script citations consistently across reading tools

- **Context.** `get_text` and `resolve_reference` accepted native-script input, but `get_metadata`, `get_translation`, `compare_translations` and the hosted reader sent it directly to the Roman citation parser. The same Thai-digit citation could resolve and return Pāli, then fail while requesting its metadata or English.
- **Decision.** Reuse `romanizeInput` and its input labels in those four reading paths. Keep the parser, output scripts, English, translation IDs and canonical IDs unchanged. Test handwritten citations in all seven supported non-Roman scripts through MCP and the hosted reader, including malformed input and Roman input without labels.
- **Consequences.** Reading workflows accept the same existing native-letter/digit normalization instead of requiring users to rewrite citations between tools. This adds no script table, edition or generated text. Lao/Lanna native-reader approval and actual signed-in hosted-client acceptance remain outstanding; the widget still displays Roman Pāli. The Roman-only widget input limitation recorded in D69 is superseded.

### D74. Reject conflicting or empty word-analysis passage selectors

- **Context.** `analyse_passage` prioritised `paragraph` over `segment`. Supplying `uid: "MN 10"`, `segment: "mn11/2"` and `paragraph: 105` bypassed the mismatched-text check and silently analysed `mn10/2`. Empty strings and null values could also fall through to the first body segment. The string `"undefined"` matched a missing paragraph field after string coercion and selected the heading `mn10/1`.
- **Decision.** Reject requests containing both selectors, even if they agree. Reject supplied blank/null selectors in the provider and blank strings in the MCP schema. A paragraph match must have an actual source paragraph field. Keep the intentional default only when both selectors are omitted. Preserve valid numeric, reference and paragraph selection and word pagination.
- **Consequences.** Callers must send one explicit selector or omit both. A conflicting or blank request cannot be presented as analysis of a requested passage. Tests reproduce the wrong-text reference bypass through both the provider and MCP, check valid continuation and retain the default opening and DPD licence notice. Dictionary data and analyses are unchanged.

### D75. Preserve the actual English version and notices in quotation verification

- **Context.** The English quotation verifier kept the planned translation ID after retrieving a labelled outage fallback. It used the returned ATI text and URL but still identified the version as dhammatalks.org, and dropped provider notes from both matches and checked-source records.
- **Decision.** Preserve the returned translation ID; include `requested_translation_id` when it differs. Use the same actual-version metadata and provider notes in matches and `scope.translations_checked`. Include requested translation IDs in `not_retrieved` for exact retries. Keep the existing all-fetches-failed error and matching/ranking algorithms.
- **Consequences.** An outage fallback cannot be presented as a quotation found in the requested version. Attribution and licence remain those returned with the retrieved text. Regressions cover injected fallback metadata, the real provider path through MCP with mocked outages, unchanged-version records, failed source IDs and a total outage. This does not establish live source availability or broaden the verifier's scope.

### D76. Accept the Pāli reader's native-script citations in word analysis

- **Context.** `analyse_passage` advertised any citation accepted by `get_text`, but passed native input directly to the Roman/name resolver. The public MCP tool rejected `MN ๑๐` while `get_text` returned `mn10` for that same citation.
- **Decision.** Apply the existing `romanizeInput` before resolving the analysis citation, and return its `input_script`/`input_romanized` labels. Keep the source segment, DPD output, exact segment-reference checks and name resolver unchanged. Add handwritten examples in all seven supported non-Roman scripts through the provider and MCP.
- **Consequences.** A reader can reuse a native citation for word analysis without rewriting it. Tests compare exact source segments and DPD analyses against Roman calls, preserve continuation and reject conflicting/foreign segment selectors. This adds no script table or source content; output stays Roman and DPD licensing remains unchanged. Native-reader approval is still a separate gate.

### D77. Validate live dictionary responses before caching or rendering

- **Context.** A successful DPD HTTP response containing JSON `null` caused a raw property-access error outside the offline-fallback handler. Error objects could instead become empty live dictionary results, and malformed supplied licence metadata could lose attribution. Invalid payloads were also cached.
- **Decision.** Validate the [documented JSON response](https://docs.dpdict.net/technical/api_endpoints/) inside the cache loader: both HTML fragments must be strings, including empty strings for legitimate empty results. Supplied non-null licence metadata must provide nonempty name, URL and attribution strings; omitted/null metadata retains the existing licence fallback. Invalid responses use the existing labelled offline subset, with an accurate unusable-response diagnosis, and are never cached.
- **Consequences.** Known words remain available offline when a live payload is unusable; unknown words return a controlled failure rather than implying absence. Regressions cover malformed types/fields/licences, valid empty/live results, recovery and MCP behavior. Sources, dictionary content, licences and network retry counts are unchanged. This is contract-based validation, not proof of live availability or dictionary completeness.

### D78. Expand calendar evidence only to the precision actually published

- **Context.** New primary references provide a few Myanmar lunar datelines and 2027 holiday dates/windows; an old Wat Metta PDF link is dead. Their scopes differ from comprehensive observance validation, and two government sources publish different 2026 Thadingyut holiday-window bounds.
- **Decision.** Record three original newspaper eighth-day mappings, three exact 2027 full-moon holidays and two range-only checks, with source URLs/locations and retrieval limitations. Preserve both conflicting 2026 windows: each contains the computed full moon. Update Wat Metta's live link while retaining its archive and human-convention caveat. Add no fixture from the inaccessible Sri Lankan desk calendar and do not equate astronomical phases with poya observance.
- **Consequences.** The additional regressions pass without changing calendar arithmetic, defaults or computed-status warnings. No newspaper articles, PDFs, scripture or new runtime provider are bundled. Missing Myanmar Māgha Pūjā, broader new-/half-moon references and Dhammayut human confirmation remain open. PDF text was checked, but executor downloads and MOI rendering failed; no new byte hashes or visual-verification claims are made.

### D79. Deterministic byte shards for directory packaging

- **Context.** Anthropic’s [current directory checklist](https://claude.com/docs/plugins/pre-submission-checklist) blocks files of 5 MiB or more. Canon, commentary, post-canonical texts and the DPD subset exceed that limit. Dropping texts or downloading them at runtime would weaken offline access.
- **Decision.** Split the existing gzip bytes into 4 MiB parts with ordered JSON manifests containing byte counts and SHA-256 hashes. Verify each part and the reconstructed original before decompression. Keep legacy monolith loading for build compatibility; unpack temporary originals for Python tools. The bundle build maintains the shards, and the audit checks their integrity and size. Source records and all original compressed-byte hashes remain unchanged.
- **Consequences.** This fixes the individual-file blocker while retaining the same text, coverage and lazy loading. It does not eliminate reviewer holds for binaries or files above 256 KiB, or guarantee directory acceptance. The existing privacy and terms pages are linked using the documented manifest URL fields; their content is unchanged. Submission and acceptance of directory terms remain with the maintainer.

### D80. Verify the entire corpus through the shipped offline MCP server

- **Context.** The source audit checked the complete dataset, while installed-package checks loaded only the canon through one reference. That left omitted lazy datasets and differences in the shipped bundle outside the exhaustive check.
- **Decision.** Audit a temporary copy containing only `server/`, with an empty working directory and a guard that rejects and records network attempts. Compare every paginated canonical text, every available aligned commentary and all post-canonical books through MCP with the source corpus, including exact segment text, citations, totals and continuation offsets. Exercise the remaining dictionary, glossary and parallels loaders. Expand the cross-platform npm installation check to load all of them too.
- **Consequences.** One CI leg runs the exhaustive installed audit; the npm matrix checks lazy package contents on every OS. Unaligned commentary and VRI abbreviations remain explicit limitations, not fabricated passages. The optional JSON report lists unaligned texts so follow-up work can be specific. No upstream text, alignment or licence changes are made.

### D81. Search the complete stanzas returned by text retrieval

- **Context.** Searching a complete retrieved verse from Dhp 5, Dhp 183 or Vism §1 returned no result when the quotation crossed an XML verse-line boundary. Retrieval joins these blocks into one stanza; search previously checked each block separately.
- **Decision.** Index verse blocks together using the same stanza boundaries as retrieval. Keep prose blocks separate and stop at canonical ownership boundaries. Treat whitespace uniformly in the search index and quoted phrases, while preserving source line breaks in excerpts. A post-canonical hit's citation must contain every block of the matched stanza, not only the first line.
- **Consequences.** Whole retrieved verses are searchable without changing any source text, licence, alignment or corpus coverage. Negative tests prevent matches formed by joining separate texts or stanzas. Source and installed-server checks cover the regression. This does not add a full-text commentary search endpoint or fill source gaps.

### D82. Search complete bundled commentary books without inventing alignments

- **Context.** The data bundle already contains 47 complete VRI Aṭṭhakathā books, but `get_commentary` exposed only passages aligned confidently to canonical texts. Introductions and other unaligned content could not be found through a global commentary search.
- **Decision.** Add a read-only offline `search_commentary` tool over the existing rendered book text. Extend `get_commentary` with a distinct `commentary:<VRI-file>` namespace and exact `/cN` segment references. Hits carry source attribution, non-commercial terms, a direct read request and a bounded context request. Direct reading and searching return `canonical: false` and explicitly make no root-alignment claim. Canonical-citation commentary reads retain their existing behavior.
- **Consequences.** Already bundled unaligned material becomes accessible without fetching new sources or changing scripture, source licences, alignment evidence or corpus data. Invalid book filters and segment references fail explicitly. References belong to the returned bundled VRI revision. The exhaustive installed audit checks every page of all 47 commentary books and a search/read round trip in each, with network access disabled.

### D83. Match canonical search scopes at identifier boundaries

- **Context.** The collection filter used an unrestricted string prefix: searching `sn1` returned SN 10–19, `an1` admitted AN 10–11, and `kv1` admitted Kv 10 and later chapters. An unknown scope silently returned no results, which could be mistaken for source absence.
- **Decision.** Match a collection, exact identifier or descendants separated at a real identifier boundary. A numbered identifier cannot absorb additional digits. Preserve case/space normalization, named Vinaya parents and explicit group membership recorded in the source index. Reject scopes that contain no known collection or identifier. Apply the predicate to both body and title matches, so normalization, expansion and pagination cannot reintroduce sibling sections.
- **Consequences.** Search results stay inside the requested section. Regression tests compare every numbered SN, AN and Kv section against its members in the unfiltered search, and installed-server checks verify representative boundaries and invalid-scope errors. Source data, canonical references, alignments and complete-book retrieval are unchanged.

### D84. Count and paginate title matches independently of body search

- **Context.** The query `discourse` has 153 indexed title matches in this bundle, but only the first 20 were returned; offset was ignored and no title continuation existed. Literal English title streams could also switch to expanded Pāli titles when a later literal page was empty.
- **Decision.** Apply offset/limit to title matches and return `total_title_matches` plus `title_next_offset`. Preserve the existing body `next_offset` contract as an independent stream. Select literal versus expanded title streams using global counts, not current page length. Compare spelling-variant title improvements using total counts. Suppress literal titles in English-only mode when no expansion exists, and never advertise a zero-sized page as a non-advancing continuation.
- **Consequences.** Every title match is reachable without repeating the first page, including title-only queries with no Pāli-body hits. Existing title record shapes, source text, links, licences and coverage remain unchanged. Regression and installed-package checks cover all title pages, exhausted streams, scope filters and English expansion.

### D85. Preserve phrase constraints with curly double quotes

- **Context.** Pasting typographic double quotes silently changed phrase search to unordered keyword search. With `sati buddha`, canonical matches increased from 1 to 188, Visuddhimagga matches from 1 to 21, and the selected commentary book from 0 to 72. Failed curly-quoted phrases could also trigger loose spelling or English-question keyword retries.
- **Decision.** Share paired straight/curly double-quote parsing across all three Pāli corpora. Preserve inner punctuation, phrase order and whitespace normalization. Treat either double-quote style as a constraint against loose retries; leave apostrophes and explicit English expansion behavior alone.
- **Consequences.** Formatted-text queries return the same passages and totals as straight-quoted queries. Regression and isolated installed-package checks cover all three corpora and failed-phrase fallbacks. No source data, citations, alignments, licences or translation links change.

### D86. Browse exact identifiers and recorded group membership

- **Context.** Browsing `mn1` returned 64 texts, including MN 10 and MN 100; `sn1.1` returned SN 1.10–19 as well. Recorded ranges such as `dhp1-20` were rejected even though their members were present. The final unrestricted prefix fallback also accepted partial collection names such as `s`.
- **Decision.** Share the canonical search scope predicate with browsing: match exact IDs, real descendant boundaries or explicit recorded membership. Preserve collection/section menus, source ordering, pagination, abbreviated-record filtering and named Vinaya parents. Advertise exact text and recorded group IDs in the existing tool description.
- **Consequences.** Discovery does not mix numbered siblings and all 99 recorded groups can be opened using their source members, without interpreting arbitrary ranges. Tests cover every complete text identifier and recorded group, plus protocol and isolated installed-package checks. Source data, numbering, alignment, rights and providers are unchanged.

### D87. Keep Pāli quotation matches inside their cited source passage

- **Context.** The Pāli verifier indexed all books as one token stream. Juxtaposed fragments from the end of MN 1 and start of MN 2 (also SN 1.1/1.2) scored as an exact match while citing only the first text. A passage spanning Dhp 183/184 likewise cited just Dhp 183, leaving part of its excerpt outside the returned citation.
- **Decision.** Build source-region boundaries from the outermost indexed citable units, preferring complete coverage over approximate records. Reset candidate windows at region boundaries, keep nearby candidates from different regions separate, and bound similarity refinement to the region. Select the most specific citation containing the entire final block span, including a containing recorded group when needed. Count tied sources using the same complete span.
- **Consequences.** Independent neighbouring texts cannot supply one quotation, while recorded groups can support cross-member passages with a correct containing citation. Regression and isolated package checks verify boundaries and excerpt containment. Scripture, source data, licences and English/provider behavior remain unchanged.

### D88. Preserve printed edition provenance when scanning citations

- **Context.** The free-text scanner discarded printed-edition prefixes. `Myanmar Dhp 15` became verse Dhp 15 rather than the page beginning in Dhp 14, and `VRI SN 1.20 (Nidānavaggo)` became sutta SN 1.20 rather than the printed page beginning in SN 12.17. Valid Thai page references could instead appear unresolved as malformed sutta numbers.
- **Decision.** Scan full printed-edition page spans before embedded numbered/PTS forms. Derive accepted edition/scope aliases from existing citation tables, retain recognised parenthetical book qualifiers from source titles using the direct lookup's book-prefix comparison, and preserve original offsets. Keep invalid numeric ranges and Roman edition volumes as edition candidates so their errors cannot turn into successful alternate citations.
- **Consequences.** Scanned displayed page labels agree with direct resolution, including ambiguous and unresolvable markers. Ordinary parenthetical prose stays separate. Exhaustive label, regression and offline package checks cover provenance and offsets. Source content, numbering, rights, providers, quotation verification and existing direct page semantics are unchanged.

### D89. Validate both endpoints before returning the first text of a range

- **Context.** General ranges such as `MN 10–9999` and `Dhp 1–99999` resolved successfully because only their first endpoint was checked. The free-text citation checker consequently reported invalid ranges as resolved. Reversed multi-level endpoints such as `SN 2.1–1.1` were also accepted, while equal endpoints claimed to span several texts.
- **Decision.** Expand abbreviated numeric ends, require matching endpoint depth and compare whole paths for ordering. If an unrecorded range falls back to its first text, require its final endpoint to exist directly or through an existing source group. Preserve recorded groups, valid first-text range behavior and grouped-member notes; distinguish identical endpoints.
- **Consequences.** Invalid endpoints become explicit parser/resolver errors across scanning, metadata and retrieval. Regression and isolated package checks cover both invalid and valid spans. This checks endpoints only: it neither retrieves an assembled range nor guarantees separately indexed intermediate numbers. Source text, numbering, alignment, rights and quotation verification are unchanged.

### D90. Discover already indexed Ancient Buddhist Texts links

- **Context.** Direct citation resolution already supported all 153 bundled Ānandajoti landing links and their 123 part-page links, but the free-text citation scanner excluded their host. All 153 landing links were missed, so a reference list could silently omit an existing supported source.
- **Decision.** Add the exact Ancient Buddhist Texts host (with optional www) to the scanner's existing host check. Preserve normal URL boundaries, source path case and percent encoding. Resolve only through the existing bundled URL index; unknown paths remain unresolved and lookalike hosts remain excluded.
- **Consequences.** Existing ABT mappings are discoverable through free-text and MCP citation scanning, verified for every current landing and part-page URL. This adds no source content, mapping assumptions, fetching, network hosts, licences or quotation-verification changes.

### D91. Preserve paired phrase delimiters during input normalization

- **Context.** The normalizer consumed the opening quote in `"namo tassa"` as a Velthuis letter marker, producing `ṅamo tassa"`. Canonical results consequently increased from 18 phrase matches to 81 keyword matches; `"nibbana buddha"` similarly returned 39 keyword matches despite having no exact phrase match. Curly quotes retained the intended phrase.
- **Decision.** Protect paired straight phrase delimiters at word boundaries, then normalize tokens inside and outside them separately. Retain internal and unpaired Velthuis markers and existing labelled spelling conversions. Search receives the same phrase delimiters after normalization.
- **Consequences.** Normalized straight-quoted searches agree with curly-quoted searches across canonical, commentary and post-canonical tools, and failed phrases do not silently become keywords. Tests cover input encoding and shipped offline MCP behavior. Source text, citation numbering, licences, providers and quotation-verification code are unchanged.

### D92. Use actual title fields and expose proper-name ranking evidence

- **Context.** Proper-name lookup searched translation reference strings but missed explicit English titles. The indexed title King Pasenadi Goes on a Diet did not qualify SN 3.13 as a title match. Replacing the field outright would also drop legacy dhammatalks titles stored after citation headers. Concatenating titles could falsely combine a name across unrelated fields.
- **Decision.** Search each Pāli or stored English title separately. For known dhammatalks caption formats, extract only the explicit title suffix; bare citations and generic reference labels do not become titles. Return matched_titles with title, language, source and translator, and distinguish metadata-only matches from Pāli-body occurrences. Preserve body ranking and the unlicensed DPPN entry gate.
- **Consequences.** Pasenadi's existing English-title hit ranks before opening-only matches, with inspectable evidence. Regression and installed-package checks cover all metadata formats, citation exclusion, field isolation and licence behavior. No source content, mapping, provider fetching, rights or quotation-verification changes occur.

### D93. Resolve stored dhammatalks title captions through the common metadata extractor

- **Context.** Name resolution indexed explicit English title fields but omitted legacy dhammatalks captions. A Gallon Measure and King Udena were present in the bundled metadata yet reported as unknown names. Proper-name ranking already extracted those captions, leaving the two discovery paths inconsistent.
- **Decision.** Share the existing conservative title extractor between proper-name ranking and sutta-name indexing. Use the existing canonical mapping and source label, preserve article aliases, and retain all topic, digit and ambiguity safeguards. Bare references remain excluded; no page or new title is fetched or inferred.
- **Consequences.** Stored title captions resolve by their names, with existing name-match provenance. Exhaustive fixtures verify every eligible caption through public resolution and preserve all mapped candidates; installed-package tests cover names, aliases and safeguards. Proper-name output, source data, licences, provider fetching and quotation verification are unchanged.

### D94. Use recorded source groups for unprinted member search and browsing

- **Context.** Citation lookup resolved AN 1.300 to its printed source group an1.297-305, but search and browsing rejected the same member ID. This inconsistency made available grouped text appear unavailable through discovery tools.
- **Decision.** Reuse citation lookup's existing group mapping only when the requested ID is absent from the index. Search uses the actual group scope; browsing returns its source-group card. Both expose scope_resolution with the original request, resolved group ID, approximation flag, explanation and retrieval pointer. Exact IDs, section boundaries and unknown-ID errors retain their existing rules.
- **Consequences.** Discovery accepts the same 7,397 currently unprinted numeric member aliases as citation lookup, without inventing individual texts. The 583 aliases mapping to approximate groups keep that warning; approximate groups themselves remain excluded from full-text indexing. Exhaustive alias browsing and representative search, expansion, pagination and installed-package regressions verify the substitution. No corpus content, provider, licence or quotation-verification changes occur.

### D95. Refresh shared-passage bounds after final clipping

- **Context.** Five abbreviated Bhikkhu adhikaraṇasamatha records retained an end offset copied before their declared owner was clipped. They and their parent group retrieved much of the following Bhikkhunī text and inherited unrelated commentary assignments.
- **Decision.** Synchronise explicit shared records with their declared owner's final span before the builder creates parent groups. Repair the committed legacy canon/commentary pair deterministically: update only the five records' bounds and page metadata, their group's bounds and page metadata, and remove stale commentary assignments outside existing owner/member mappings. Preserve approximation flags, references, source blocks and all remaining mappings; rebuild the derived parallels index for the corrected inputs. Reject invalid sharing relationships rather than guessing.
- **Consequences.** The five records now retrieve the same six root segments and twelve commentary segments as their declared owner; the parent group contains nine root segments. All 199 explicit sharing relationships receive an exhaustive boundary/page audit. Removing the stale assignments also makes two existing Bhikkhunī commentary citations eligible for the parallels builder's unique-owner rule: the regenerated index has 5,303 citations, with all prior links retained, and the same 1,516 shared passages. Regression tests cover invalid/cyclic sharing, post-clipping synchronisation, retrieval and installed-package behavior. The 266 approximate records and all source/text coverage totals remain unchanged; no abbreviated text is expanded and no new root-commentary alignment is asserted.

### D96. Report index uncertainty without asserting source abbreviation

- **Context.** AN 1.82 and 1.83 share AN 1.81's provisional indexed span. The bundled VRI prints distinct paragraphs numbered 81–83, but those paragraph numbers alone do not prove independent standard-ID mappings. The builder uses approximate both for explicit shared passages and for failed alignments retained at a preceding location; the resolver incorrectly described every such record as a VRI abbreviation.
- **Decision.** Preserve all spans, IDs, approximation flags, source text and commentary assignments. Expose existing index evidence as alignment metadata: shared_passage for 199 explicit sharing records, unverified_alignment for 67 without a confirmed independent location, and a caution on the four groups containing such members. Carry notes through resolution, reading, commentary, analysis and parallels, and scope_alignment through scoped search. Memorisation reports the returned caution without assuming source abbreviation. Group fallback says separately indexed, not separately printed.
- **Consequences.** The AN group remains available with its four uncertain member IDs visible; no speculative resegmentation or new alignment is introduced. Tests cover all 266 approximate records, AN reading/search/browsing/commentary and the installed package. The dataset, derived parallels, counts, licences and provider/quotation-verification code are unchanged. Independent standard-number mapping remains a source-review gate.

### D97. Integrate the verified reliability and corpus development lines

- **Context.** The two development lines became available through normal authorised Git access after the earlier installation-access failure. Their appended decision IDs collided, their generated bundles conflicted, and the browse tool described complementary behaviors.
- **Decision.** Preserve both original tips, combine source behaviors, keep reliability D64–D78 and renumber the corpus additions D79–D96, then rebuild both standalone bundles. Retain source-book browsing, exact/group browsing, Pāli quotation boundaries and actual English-version provenance. Run both exhaustive readers against an installed npm package, the standard gates and relevant live/outage checks. Enable the npm OS/Node matrix on development branches alongside the existing package and corpus gates.
- **Consequences.** Publication goes to the development branch; main and deployment remain unchanged. Shared Vinaya span corrections legitimately change indexed retrieval fingerprints. Automated checks do not replace independent integration review, remote matrix results, actual-client or community/language/calendar review.

### D98. Keep quote verification within source and input limits

- **Context.** Independent review of the combined development branch reproduced two verifier failures: an English exact match could be suppressed by a partial preceding translation, and quotations longer than 120 words silently received a verdict based only on their prefix. The reader badge and Pāli match notes also still inferred source abbreviation from the approximate index flag.
- **Decision.** Give English candidate retrieval the fetched-page boundaries already respected during refinement. Reject more than 120 comparison words before verification instead of silently truncating them; retain the 2,000-character input cap. Preserve actual and requested version provenance. Reuse canonical alignment cautions for Pāli matches, describe recorded group spans as index evidence, and label the reader badge approximate mapping.
- **Consequences.** Synthetic fixtures prove that a later exact source is found, separate fragments stay separate, empty sources and fallback identity work, and oversized input cannot receive a partial verdict. The exact word limit still accepts a complete match. Pāli group containment and uncertainty notes remain inspectable, and DOM tests verify the actual widget label. No corpus, alignment, source licence, provider selection, main merge or deployment changes occur.

### D99. Record real-browser and bridge checks without claiming full client acceptance

- **Context.** The latest verifier fixes needed independent review, while supported-client acceptance still relied largely on SDK and simulated-DOM checks. The installed Codex CLI could not initialize its app-server in the executor's read-only client home. Its plugin description also recommended an npm fallback that the public registry returned as unavailable.
- **Decision.** Retain the reviewed verifier behavior, add an optional Chromium acceptance runner using actual source-derived Pāli and simulated host bridges, and record a pinned mcpo/OpenAPI bridge check. Replace the unavailable npm fallback with a checkout-based Node command and list all five Codex skills consistently. Preserve explicit unsuccessful probe evidence and separate browser/bridge transport results from signed-in and model-driven client acceptance.
- **Consequences.** The browser runner needs Python Playwright and Chromium; it is an optional acceptance command, not a new runtime dependency. No corpus, provider, calendar date, source licence, main or deployment behavior changes. Actual chat clients, native readers, publisher access and licensing remain independently gated.


### D100. Refuse ambiguous post-canonical paragraph selections

- **Context.** The bundled source repeats VRI paragraph numbers within some chapter headings. Generic chapter.paragraph lookup silently selected the first occurrence (for example, Niruttidīpanī chapter 2 has two distinct paragraphs numbered 63). A truthiness check also returned a whole chapter or book for paragraph 0.
- **Decision.** Reject generic paragraph 0 and chapter-qualified paragraph numbers with multiple occurrences inside the selected chapter. Give a chapter-reading/search hint, and let existing search citation containment choose an unambiguous chapter or book citation. Retain exact unique-paragraph selection and existing whole-book ambiguity checks.
- **Consequences.** No source text, numbering, alignment, licence or data changes. Regression tests use the actual bundled repeated passages and verify citation containment for both occurrences. This closes a code correctness gap in #21; the missing permitted Visuddhimagga PTS concordance remains a separate gate.

### D101. Reject paragraph zero before Visuddhimagga chapter approximation

- **Context.** Independent review confirmed the generic paragraph ambiguity fix, but the separate Visuddhimagga parser still accepted chapter.paragraph zero, such as `Vism IV.0`, and returned an entire chapter under the unresolved-numbering fallback.
- **Decision.** Reject zero in the Visuddhimagga chapter.paragraph path before selecting either the chapter opening or an approximate chapter view. Exercise all 23 chapters, Roman/alias forms, direct reading and the MCP resolution/reading tools. Preserve valid first-paragraph behavior, VRI paragraph selection and the explicitly labelled fallback for positive paragraph numbers without an open concordance.
- **Consequences.** Invalid citations return an error rather than a substituted chapter. No source text, alignment, numbering, licences or data are changed; the missing Visuddhimagga PTS/translation-number concordance remains an external gate.


### D102. Disambiguate post-canonical source titles

- **Context.** Both the Dīgha and Saṃyutta sub-commentaries include a book titled Mahāvagga-Ṭīkā. Title lookup retained only the first book, so reading, citation resolution and title-based search filters silently chose the Dīgha source.
- **Decision.** Index exact catalogue IDs and VRI file stems separately from titles. Refuse a title with multiple source books, list their exact IDs, and apply the same rule to whole-book filters and chapter/paragraph references. Preserve unique titles and exact source identifiers.
- **Consequences.** Regression tests use both actual bundled books, verify separate exact-ID/file-stem reading and search, and require MCP errors to include both choices without substituted content. No source text, numbering, licensing or data changes.

### D103. Resolve complete source identities before work-name prefixes

- **Context.** Independent review confirmed duplicate-title refusal and found a unique title that could not be read: `Visuddhimagga Nidānakathā` was intercepted as a malformed Visuddhimagga citation before the catalogue lookup, although its exact ID and title-based search filter worked.
- **Decision.** Try the exact catalogue ID, file stem or unambiguous complete title (including a chapter/paragraph suffix) before the special Visuddhimagga/Abhidhammatthasaṅgaha shorthand parsers. Test every unique catalogue title, title/ID source equality, public resolution/reading, and the established shorthand and ambiguity behavior.
- **Consequences.** The Nidānakathā remains a separately labelled post-canonical source. Plain `Visuddhimagga 3` remains an unavailable PTS-page lookup, and `Vism IV.1`/`Vism §51` retain their meanings. No source text, alignment, numbering, rights or data changes.


### D104. Keep Abhidhammatthasaṅgaha search within the selected work

- **Context.** The `abhidh-s` work alias read only the Saṅgaha but searched its entire VRI file, including the separate Abhidhammatthavibhāvinīṭīkā appended after block 874. A quotation present only in that later work appeared in a Saṅgaha-scoped search.
- **Decision.** Bound the alias by the same existing `workEnd` used by the reader. Keep exact book IDs and file stems as whole-file selections, Visuddhimagga as both volumes, and combine multiple selections by union. Filter complete searchable passages against the selected boundary before matching.
- **Consequences.** Tests use actual bundled text from both works, check alias exclusion and manual retention, and preserve whole-file, mixed and duplicate filters. No new boundary is inferred and no text, source, licence or data changes.

### D105. Keep the Chinese Khuddakapāṭha pilot at a pinned assessment gate

- **Context.** The requested official CBETA artifact matches the 2026.R2 release while retaining a January 2025 header date. Its header requires non-commercial use with the header intact but names no CC version. The release README links the archived 3.0 Taiwan notice, while the current site names 4.0 International. Explicit source headings support Khp 1–4 candidates; PTS.Khp.3 is a page reference in section 5, and section 4 has a separately stored note.
- **Decision.** Record exact source hashes, release, credit, notice evidence and complete paragraph boundaries without importing translation text or assigning a CC version by inference. Add an offline metadata-only inspector with strict pin/heading/identity/note checks and synthetic regression fixtures. Keep independent bilingual review and release-specific terms unresolved, and leave runtime retrieval disabled and issue #35 open.
- **Consequences.** This produces a reproducible assessment and reviewer handoff, not verified Chinese coverage. The shared preface and linked note remain explicit, and the observed body-part ordering difference needs specialist review. No new runtime source, host, language API, scripture or translation body is shipped. An approved four-text Chinese pilot would still not satisfy the three-language goal.

### D106. Separate English commentary rights evidence from copy fidelity and alignment

- **Context.** PTS lists Ñāṇamoli's Minor Readings and Illustrator under CC BY-NC 4.0. A traceable third-party scan identifies the 2005 reprint, but its bytes and page images could not be verified here. English §§9–16 cross partial and grouped Pāli segments in the introduction, before the bundled chapter heading; English numbering is not VRI numbering.
- **Decision.** Document the edition, exact attachment provenance, positive licence evidence, candidate locators and adoption gates. Correct the source survey's blanket rejection of third-party scans. Import no translation body and add no runtime link or asserted concordance until fidelity, intended delivery, source policy and independent bilingual review are established.
- **Consequences.** Issue #36 remains open and coverage is unchanged. A CC grant need not require a fresh permission letter for covered uses, but does not authenticate a scan or prove a paragraph alignment. No new network host, generated data or tool behavior changes.

### D107. Make emitted aligned commentary evidence references readable

- **Context.** The parallels tool returned `mn10/c66` as evidence for its AN 4.28 link, but `get_commentary` rejected that reference and the supplied reading command opened only the commentary's first page. Readers could not directly inspect the cited evidence.
- **Decision.** Accept emitted aligned `uid/cN` references as exact one-segment selections, retain root-paragraph/source metadata and the parent segment count, and have parallels supply that exact reference in `read_with`. Reject nonexistent, unsafe and malformed segment numbers. Whole-book commentary references keep their existing independent meaning.
- **Consequences.** Source text, alignment and corpus data do not change. Tests exercise the real evidence passage, first/last segments, grouped roots, unavailable alignments and the public MCP path. A positive offset on an exact selection returns an exhausted page rather than an adjacent passage.

### D108. Run real-browser reader checks continuously and announce reader updates

- **Context.** Real Chromium checks were manual, covered no English continuation in the rendered page, and did not check keyboard/landmark semantics. Dynamic reads and failures had no dedicated live status for assistive technology.
- **Decision.** Add a separate Chromium CI job with pinned Playwright, a failure/success JSON artifact and blocked browser network. Generate offline fixture responses through the actual MCP widget tool, using bundled Pāli and explicitly synthetic English HTTP responses. Exercise both simulated bridges at phone/desktop widths, page continuation, fallback recovery, rejected version changes, keyboard activation, 200% zoom, named regions/headings and live status changes. Add a concise polite status region and bump the cached widget resource version to v3.
- **Consequences.** These checks establish browser behavior under simulated hosts, not signed-in ChatGPT, live publisher integrity, human screen-reader usability or full accessibility conformance. CI does not deploy anything or fetch scripture. Publisher, rights, native-reader and actual-client gates remain open.

### D109. Make shared-passage evidence actionable and audit installed reading commands

- **Context.** Shared parallels returned segment-position references without executable reading commands. A client reading only the default opening could miss the actual evidence. Source-level checks did not establish that all evidence remained readable through the shipped artifact. The roadmap also still marked implemented development capabilities as absent.
- **Decision.** Give each side an explicit command for its first retained matching segment. Add a separate offline installed-server audit for the complete paginated parallel graph, every commentary citation and every retained shared-passage segment. Compare exact text and metadata against source segments, guard against non-advancing or incomplete pages, and run it on an installed npm tarball in a separate CI workflow. Correct the roadmap's development column and the local-client guide's unlicensed DPPN-entry implication.
- **Consequences.** No source text, corpus alignment, licences or scholarly relationship is changed. Retained references may be a truncated subset, and that remains labelled. The audit establishes cross-tool addresses and package fidelity, not full source coverage, community review, live-provider health or real-client acceptance.

### D110. Search the supplied source span when an individual identity is requested

- **Context.** Broad search intentionally excludes approximate identities and assigns overlapping blocks to one preferred owner. Consequently, a phrase visible in `get_text("SN 12.21")` could not be found when that identity was explicitly selected as a search scope. Changing its provisional alignment would require independent source evidence.
- **Decision.** For an explicitly indexed individual-text scope, search its existing source bounds directly, grouping whole stanzas with the shared segment search. Include its own title and retain approximation/alignment metadata. Add `scope_source_span` to explain that a match tests the supplied span and does not verify the mapping. Preserve broad-search exclusion, numeric-group resolution and group/member search behavior. No global search index needs to be built for an individual selection.
- **Consequences.** Tests cover unverified and declared shared spans, absent phrases, exhausted offsets, title pagination, native-script API input/output and alternate reading page sizes. These are mechanical acceptance checks, not native-reader or scholarly certification. No source text, coordinates, approximation flags, licences or data changes.

### D111. Make body-search evidence directly readable with its source context

- **Context.** Canonical and post-canonical body hits exposed excerpts and citations, but no exact reading command. A default opening could omit a hit deep inside a long text. Paragraph numbers and wording can repeat, so neither is a safe way to locate the occurrence. Commentary search already supplied exact reading and context commands.
- **Decision.** Track source block bounds within the existing renderers for internal search use. Give body hits an exact segment reference, one-segment reading command and three-segment context command; give canonical title hits an opening command. Extend the installed evidence audit with source-derived search/read/context cases for every source book and mutation checks for missing phrases and incorrect context. Keep ordinary reader output unchanged.
- **Consequences.** No source text, numbering, alignment, licences or data is changed. Canonical approximation cautions and commentary/post-canonical distinctions remain. Context is clipped at the selected text or citation boundary. The acceptance matrix is bounded, not every possible query, and it does not establish scholarly alignment or native-reader approval.

### D112. Search complete root source files without inventing text identities

- **Context.** Complete-book reading exposes source text outside individual citation spans. The printed Vinaya introduction “Ime kho panāyasmanto dvenavuti pācittiyā” is readable at `vri-book:vin02m1/7`, but canonical identity search cannot find it. Giving that material an individual rule citation would require unsupported alignment.
- **Decision.** Add the offline `search_source_book` tool over one exact catalogue file. Match all terms within one rendered prose segment or whole stanza, return source refs and exact/context book reading commands, and paginate matching segments separately from reading offsets. Preserve source page/paragraph metadata and terms. Support the existing input normalization and scripts, carrying the output script into reading commands. Retained rendered/folded text has an 8 MiB payload budget.
- **Consequences.** No source content, alignment, numbering or licence changes. Regressions cover the real unindexed introduction, all 61 book IDs, source boundaries, whole stanzas, pagination and eight-script reading commands. These establish mechanical retrieval behavior, not native-reader or scholarly validation. Standard citation search and provisional mappings keep their existing meaning.

### D113. Exhaust installed study navigation and preserve daily source provenance

- **Context.** Reading plans had source-level coverage tests, but their commands and full daily rotations were not exhausted through an installed MCP server. Valid ISO dates before year 0100 were rejected by Date.UTC's two-digit-year rule. Daily verses lacked the reading command available for suttas, and individual Pāli reads omitted the existing source pin and terms.
- **Decision.** Add an offline installed audit for every plan day and full daily pool, following whole-text pages but respecting explicit daily part boundaries. Check IDs, source text, metadata, source-indexed guide links, coverage and rotation periodicity. Parse full ISO years explicitly, supply verse reading commands, and return the existing VRI source object with individual readings.
- **Consequences.** No scripture, alignments, licence terms, rotation order for modern dates, calendars or source data change. Guide/translation content is not fetched and guide omissions stay explicit. Offline package evidence remains separate from exact-head live source health and signed-in or native-reader acceptance.

### D114. Make study-topic and paritta navigation explicit and source-safe

- **Context.** Topic/list catalogues and cross-links required clients to reconstruct tool calls. Paritta silently ignored a source selector without a name, and empty selectors silently chose the default. Its pagination exposed only an offset, allowing a client to lose an alternative source or confuse filtered excerpt positions with canonical segment numbers.
- **Decision.** Return structured catalogue, cross-link, canonical-reading and source-pinned paritta continuation commands. Reject ignored/empty source selectors. Preserve source pins, list status notes and composite subgroup counts. Exhaust the installed topic/list/paritta graph, all canonical readings and source alternatives without fetching linked external pages.
- **Consequences.** No scripture, source data, meanings, numbered-list members, aliases or licences change. Canonical Pāli retrieval remains distinct from later chanting-book layouts and English renderings. Their permission gates remain open, and offline navigation success does not establish live source health or native-reader/signed-in acceptance.

### D115. Analyse reader-selected post-canonical and complete-root-book passages

- **Context.** The readers could return Visuddhimagga passages and complete-file introductions, but the offline word-analysis tool only resolved individual canonical texts. Readers could not analyse those retrieved segments through the same API.
- **Decision.** Extend `analyse_passage` with canonical/post-canonical `uid` selection and a mutually exclusive root `book` selection. Reuse the existing source renderers and preserve exact refs, printed locations, source terms and post-canonical/approximation labels. Retain canonical behavior and strict segment-source checks. Refuse repeated paragraph labels in the new broad selections rather than silently choosing their first occurrence.
- **Consequences.** The pinned DPD subset is unchanged; its inflection/deconstructor map still covers VRI root vocabulary, and unfamiliar later forms stay unknown. All analysis modes identify the existing text pin and terms separately from dictionary attribution/licensing. Extended results omit invented canonical `text_id` values, and retain the warning that glosses are not translations. Tests compare reader output, word pagination, native citations, all 109 post-canonical books, ambiguity and invalid selectors. Quoted non-Pāli glyphs in the grammar books are retained as complete unknown tokens rather than dropped or split into misleading Pāli forms. No scripture, dictionary data, numbering, scholarly alignment or licences are changed.

### D116. Make Vinaya rule source navigation executable without losing grouped passages

- **Context.** Vinaya rule responses supplied correct prose reading instructions, but clients had to parse them into calls. The requested As 1–7 identities do not identify separate VRI passages; deriving a reader call from the requested ID can leave the shared list or its introduction.
- **Decision.** Add `canonical_text.reading_command` and an explicit samatha introduction command while retaining legacy prose instructions and requested rule identity. Expose the shared passage citation separately and preserve any source uncertainty. Exhaust all 227 rules through installed MCP, follow every distinct reading across all pages, and compare BMC links, paired sections, commentary labels and rights metadata with the bundled index.
- **Consequences.** No source data, scripture, rule boundaries, mappings, licence terms or BMC content changes. The seven shared samathas remain one printed VRI paragraph with a separate introduction. BMC links stay modern commentary rather than scripture or rulings. Offline navigation checks do not establish live page availability, scholarly alignment, community convention or signed-in client acceptance.

### D117. Preserve literal Abhidhamma selectors and exhaust source navigation

- **Context.** Removing punctuation before parsing mātikā entry numbers changed `tika -1` into triad 1 and `duka 1.5` into dyad 15; malformed source citations could also become valid section IDs. Catalogue navigation required clients to reconstruct calls, and source cards omitted the existing VRI pin.
- **Decision.** Parse entry numbers and source IDs literally, retaining positive integer selectors and documented aliases. Reject malformed selectors. Add structured section/group/condition and exact source-reading commands while retaining existing `get_text` argument objects. Return the existing pinned VRI source. Exhaust all mātikā entries/groups and Paṭṭhāna definitions/list locations through installed MCP, comparing the complete returned windows with source segments.
- **Consequences.** No scripture, group members, definitions, source mappings, dictionary data or licence terms change. Negative/decimal/range entry selectors are errors instead of different valid entries. Dictionary pointers stay reference glosses, not scripture or translations; the audit performs no live lookups. Mechanical retrieval checks do not establish specialist interpretation, native-reader or signed-in client acceptance.

### D118. Preserve scripts across commentary reading and continuation

- **Context.** `get_text` could transliterate its embedded commentary but its continuation command omitted the script, and `get_commentary` did not accept one. Continuing a Sinhala or Thai commentary therefore returned Roman Pāli. Direct commentary books and exact segment references had the same limitation.
- **Decision.** Accept the existing script names/codes in `get_commentary`, romanize native canonical citation input with the existing labelled converter, and reuse the root-text transliterator for commentary segments and Pāli catalogue titles. Carry `script` in `get_text`'s commentary reading command. Keep identifiers, source terms and alignment metadata unchanged.
- **Consequences.** Default Roman output remains compatible. Direct whole-book readings still assert no root alignment, and missing or approximate alignments retain their cautions. Regression tests cover all included commentary books, all supported scripts, exact refs, continuation and unsupported scripts. No source text, dictionary, numbering or alignment data changes; mechanical transliteration tests do not replace native-reader review.

### D119. Verify packaged MCP prompt and resource contracts against reader capabilities

- **Context.** Prompt arguments accepted whitespace-only values without bounds. Study/memorisation guidance always selected the canonical reader, although `Vism 1.1` resolves to post-canonical metadata and requires `get_post_canonical`. The canon resource described `approximate` as abbreviation rather than preserving uncertainty. The memorisation template also claimed that the client itself could not set reminders, rather than describing this server's capabilities.
- **Decision.** Trim and bound prompt arguments, route post-canonical references through the returned reader command, and check English availability before requesting it. Retain group/alignment cautions and scope persistence claims to these MCP tools. Correct the guide and exhaust the installed prompt/resource surface, following its offline citation and post-canonical reading examples.
- **Consequences.** No scripture, source data, source rights, alignment, dictionary data or reminder capability is added. Resources remain offline; SuttaCentral stays link-only. Tests inspect protocol messages, templates and real reader results, not LLM reasoning or signed-in client adherence. English, licensing, live-source, specialist and native-reader gates remain open.

### D120. Reject blank translation selectors and audit installed reader/search errors

- **Context.** A supplied empty translation string silently became Pāli-only in get_text, or the default version in the English reader. Invalid selectors must not look like successful source retrieval or silently choose a different version.
- **Decision.** Reject empty/blank selectors in the shared English reader and the Pāli/translation/comparison schemas and hosted widget before fetching providers. Add an installed error-contract matrix for readers, search, analysis and version selection, followed by valid recovery requests. Accept the MCP SDK's schema-error form and the server's structured semantic-error form without interpreting errors as search absence.
- **Consequences.** Omitted selectors retain their documented defaults and explicit version/fallback rules are unchanged. The audit performs no publisher requests. No scripture, source data, rights or alignment changes.

### D121. Preserve native scripts through study readers and search navigation

- **Context.** Post-canonical reading/search and commentary search did not expose script support, while canonical native-script search hits lost the selected script when their reading commands were followed. This produced Roman output or rejected native queries despite available source text.
- **Decision.** Apply the existing labelled input converter and output renderer at the MCP boundaries. Preserve script in canonical/post-canonical/commentary exact/context commands and post-canonical continuation, including catalogue and variant choices. Keep Roman defaults, source refs, alignment cautions, labels and terms intact. Verify eight scripts and source-derived reading windows, with all-book breadth regressions.
- **Consequences.** This implementation uses the accessible repository and functional requirements; no peer bundle is imported. No source text, variants, numbering, dictionary data or alignment is changed. Mechanical transliteration/transport tests do not establish linguistic correctness or native-reader approval; Lao/Lanna and other specialist acceptance gates remain open.

### D122. Read post-canonical passages in the hosted widget without changing their identity

- **Context.** Vism 1.1 worked in the dedicated reader but failed in the hosted widget because it only resolved canonical citations. The widget needed the same Pāli retrieval, labels, uncertainty and language distinctions as the source reader.
- **Decision.** Attempt post-canonical resolution only after canonical resolution fails. Return the exact selected source window, source pin/terms, post-canonical label and explicit English-unavailable status. Omit invented canonical IDs or SuttaCentral links. Support existing native-script input/display and source-pinned Pāli/English cursors. Version the two widget resources to v4, show source-kind/reference labels and announce the distinction accessibly.
- **Consequences.** No source text, rights or alignment changes. English is not generated or fetched for later works. Unsupported PTS pages and ambiguous selections stay errors. Package and Chromium bridge tests do not establish signed-in host or native-reader acceptance.

### D123. Open complete VRI root source files in the hosted reader

- **Context.** Complete-file reading exposed real introductions outside individual citation spans, but the widget could not show them. Treating those positions as individual sutta/rule citations would assert unsupported identities.
- **Decision.** Add book as a mutually exclusive alternative to uid, using the existing source-file renderer. Display explicit file-selection labels and exact source refs, preserve file/script pagination, and report English unavailability without making a canonical identity or link. Verify all 61 source-file openings, the actual Vinaya introduction and both host bridges, alongside the post-canonical mode.
- **Consequences.** Source data and citation alignment are unchanged. The file scope includes front matter and follows the source as printed. Actual client, source-rights, specialist and live-provider gates remain separate.

### D124. Give hosted commentary its own selector, labels and availability contract

- **Context.** The hosted reader rejected existing commentary references, while overloading its post-canonical branch would mislabel Aṭṭhakathā and blur verified/unavailable alignment. Root commentary context is not an independent canonical text identity.
- **Decision.** Add commentary as a third mutually exclusive selector. Reuse the aligned/direct/exact commentary reader and retain source refs, notes, availability, alignment metadata and script-pinned continuation. Return requested root context separately from the commentary identity. Explicitly label commentary and its printed pages/root-paragraph context; show missing alignment without substituting text. Version resources to v5.
- **Consequences.** No source text, English translation, rights or alignment is added. Direct books assert no root alignment. Malformed references and missing source data are errors; unavailable verified alignment is a distinct empty state. Real host, native-reader and specialist gates remain open.

### D125. Exhaust installed commentary-widget availability against every root reference

- **Context.** Representative view tests cannot establish that available and unavailable commentary selections remain faithful across the whole root index. A widget must not replace absent alignment with root text or neighbouring commentary.
- **Decision.** Add an optional complete 8,544-reference sweep to the installed widget audit and enable it in CI. Compare returned availability, segments, notes, source and uncertainty with the bundled commentary reader, alongside all 47 direct books and eight-script selection/cursor cases.
- **Consequences.** This is mechanical package/wrapper parity against current source mappings, not independent scholarly review. No alignment confidence, coverage or source rights is promoted by a passing sweep.

### D126. Select exact hosted Pāli segments without asserting English alignment

- **Context.** Exact source refs from canonical, post-canonical and complete-file readings could not be opened precisely in the hosted widget. A source offset alone cannot prove the intended text identity, and whole-text English is not mapped to those Pāli segment boundaries.
- **Decision.** Accept segment alongside its uid/book selection. Read the indicated position through the existing renderer and require the returned ref to equal the requested ref exactly. Return one segment without continuation; reject missing/cross-source refs and nonzero continuation offsets. Preserve source scope, script and uncertainty, show the exact ref and state that segment-level English alignment is unavailable without fetching a whole translation. Commentary retains its existing exact /cN selector. Version UI resources to v6.
- **Consequences.** No source content, mapping or rights changes. Exact position matching does not promote approximate canonical spans to scholarly verification. Actual-host and native-reader gates remain open.

### D127. Return to an exact source anchor after reading its bounded context

- **Context.** The exact-segment widget could show one passage but supplied no source-preserving route to its neighbours or back. Rebuilding citations from displayed text could lose book scope, script or uncertainty.
- **Decision.** Supply context_with and exact_with commands using the normalized uid/book selection, exact ref, selected script, VRI source commit and SHA-256 of the displayed source segment. Context stays within that source selection, with 0–20 neighbours per side. Verify the ref, source version and fingerprint before returning context; retain source labels and English-alignment cautions. Version resources to v7.
- **Consequences.** The fingerprint protects the selected segment, not all neighbouring blocks or scholarly alignment. No source text, licence or mapping is changed. Actual-client and native-reader/specialist acceptance remain separate.

### D128. Reject hosted continuation across a changed VRI source version

- **Context.** Widget Pāli and English continuation preserved source selection and English translation ID but did not validate the expected VRI source version after a server data update.
- **Decision.** Add source_commit to every Pāli/English widget continuation command and reject a mismatched expected commit before provider access. Existing first-page callers may omit it. A rejected stale cursor requires reopening the selection explicitly.
- **Consequences.** This pins the VRI source version; English translation continuation retains its separate exact version check. It does not promise immutable live-provider content, citation mappings or scholarly review.

### D129. Keep aligned and complete-book commentary context separate

- **Context.** Exact commentary /cN anchors still lacked context/return navigation after canonical, post-canonical and root-file selections gained it. Reading a complete commentary book as if its passages were aligned to a requested root text would assert unsupported correspondence.
- **Decision.** Attach source/script/anchor-pinned context and return commands to exact commentary selections. Resolve the parent only from the returned source ref: aligned anchors retain their root-reference commentary scope; direct book anchors retain their complete-book scope and no-root-alignment warning. Clip windows at the parent's boundaries, preserve commentary labels/notes and explicit English availability, and reject stale pins or continuation-offset conflicts. Version resources to v8.
- **Consequences.** No new alignment, translation, source text or licence is added. Fingerprints guard the selected rendered segment rather than every neighbour. Source availability, native-reader/specialist review and signed-in host acceptance remain independent gates.

### D130. Navigate directly with returned reader commands and reject stale or mismatched replies

- **Context.** The reader supplied exact continuation/context commands but required a chat turn to follow them. Direct host calls can arrive late or fail after the user has selected another text, creating a risk of showing the wrong source or stale attribution.
- **Decision.** Add capability-detected controls for Pāli/English continuation and context/return, preferring MCP Apps tools/call with legacy callTool compatibility. Dispatch only the reader tool with unchanged returned arguments. Serialize calls, expose loading, time out after 30 seconds, and restore keyboard focus to the heading. Invalidate old requests on new selections/input, accept own-input echoes, and validate readable reply shape plus expected source/scope/script/translation version before rendering. Error replies clear prior text and notices. Version resources to v9.
- **Consequences.** No automatic tool call occurs on load. Unsupported hosts keep chat navigation. Simulated bridges, VM races and Chromium tests do not establish signed-in host acceptance or model awareness of local UI navigation; those remain separate gates.

### D131. Keep local Apps SDK navigation across unrelated globals and stale error metadata

- **Context.** After a UI-initiated tool call, toolOutput can still refer to the original host result. A theme/globals event could restore that old passage. Unchanged error metadata could also suppress a newer valid result.
- **Decision.** Track consumed output/metadata identities. Process only changed host fields, retain local navigation across unrelated events, and allow fresh valid output to recover past unchanged older error metadata. New error metadata still clears stale content.
- **Consequences.** This handles asynchronous bridge updates without assuming a signed-in client's event timing. It does not make direct UI state automatically visible to the model.

### D132. Share source-preserving reading metadata only through detected host context capabilities

- **Context.** Direct UI navigation can leave the assistant referring to an earlier chat result. Host support and delivery timing vary, so a local display cannot be treated as proof of model awareness.
- **Decision.** Share a versioned metadata-only selection: source/version/notices, scope and refs, script, availability and alignment cautions, English version and reader commands. Prefer an advertised MCP context modality, with a detected synchronous widget-state API as compatibility fallback; retain one selected channel per instance. Serialize/coalesce updates, retain timed-out requests as unconfirmed until acknowledged, and stop automatic attempts on rejection or incompatible setters. Loading/error states omit old source identity. Show delivery status separately from reading status. Version resources to v10.
- **Consequences.** No passage body or private error detail is shared, and no follow-up message is triggered. Host acceptance is not model delivery/adherence or scholarly/native-reader approval. Unsupported hosts retain citation-based chat use. Context failure does not disable reading or retry through another route.

### D133. Supply commands to retrieve the displayed reading before quoting metadata

- **Context.** Model-visible source metadata alone is not retrieved passage content. Continuation commands point beyond the current window and cannot substitute for re-reading what is displayed.
- **Decision.** Return pali.read_with for the current source window and english.read_with for its translation version/offset. Exact/context commands retain source and anchor pins; all modes retain scope and script. Replay the commands through the extracted package across eight scripts and every included post-canonical/root/commentary book.
- **Consequences.** Replays remain source reads, not source reconstruction. Live English contents are not promised immutable; assistants must verify the returned version, range and notices. Automated replay/metadata checks do not establish signed-in model adherence.

### D134. End cancelled reader operations without retaining their source as current

- **Context.** A standard host cancellation after tool-input left the reader indefinitely opening the requested passage, with stale prior text and loading metadata. Direct navigation also needed its pending callback invalidated on cancellation.
- **Decision.** Handle ui/notifications/tool-cancelled for an active/announced read or initial waiting state. Clear prior passage, attribution and controls; publish a cancelled metadata state without old source IDs or the host's private reason. Ignore late correlated replies and idle late cancellation notices, and allow a subsequent selection to recover. Version resources to v11.
- **Consequences.** Cancellation is distinct from provider/source unavailability. Uncorrelated host event ordering and signed-in clients remain acceptance gates. No source data, licence, alignment or translation is changed.
