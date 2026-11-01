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
