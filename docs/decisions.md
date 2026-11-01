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
