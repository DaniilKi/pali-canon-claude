# Development

Everything needed to build, test, release and connect the tool. For the reasoning behind the design, see [decisions.md](decisions.md); for the full agent context, see [AGENTS.md](../AGENTS.md).

## Requirements

- Node.js 20 or newer (CI tests 20 and 22 on Linux, macOS and Windows).
- Python 3.10+ and git, only to rebuild the canon data.

## Commands

```sh
npm ci                      # install
npm run build               # bundle src/ into server/index.cjs (stdio) and server/http.cjs (HTTP) with esbuild
npm test                    # unit tests (offline)
npm run audit               # exhaustive audit of all 8,544 texts (offline)
npm run check               # build + test + audit (what CI runs)
npm run smoke               # MCP protocol checks over stdio (offline)
npm run smoke -- --live     # plus live translation, dictionary and Access to Insight checks
npm run outage              # simulated outages: mirrors and offline behaviour
npm run corpus:check        # every page of every bundled canon, aligned commentary and post-canonical text over MCP
npm run coverage            # coverage numbers by collection (docs/coverage.md)
npm run pack:desktop        # build dist/pali-canon-<version>.mcpb and SHA256SUMS.txt
npm run serve               # hosted HTTP endpoint on $PORT (default 8080); see hosting.md
npm run loadtest            # 50 concurrent HTTP sessions against the HTTP server: p50/p95 and errors
npm run linkcheck           # check today's sample of 250 translation links (--all for every link)
npm run registry:check      # validate server.json before publishing to the MCP Registry
```

Other scripts, run directly with `node` (or `python`):

| Command | What it does |
|---|---|
| `npm run evals [-- --live] [--category c] [--id id] [--verbose]` | Accuracy evaluation: runs the tool checks of `evals/questions.jsonl` against an in-process server (network off unless `--live`), prints pass/fail/skip per category, exits 1 on any failure or unresolvable expected citation. `tests/evals.test.mjs` runs it in CI |
| `evals/claude-plugin-eval/run.sh`, `evals/codex/run.sh` | Model-level evaluation with `claude plugin eval` and `codex exec`, graded by expected citations (`evals/model-grading.mjs`); needs a model, not run in CI |
| `node scripts/export-index.mjs [--out dir]` | Citation index (ID ↔ VRI paragraph ↔ PTS page ↔ translation links, with each link's licence) as JSON and CSV in `dist/export`; `release.yml` attaches it to releases. See [export.md](export.md) |
| `node scripts/build-site.mjs [--out dir] [--no-export]` | Prepares the GitHub Pages source in `dist/site` from `docs/`, `site/` and `llms.txt`; `pages.yml` renders it with Jekyll and deploys on push to `main` (needs Pages Source: GitHub Actions) |
| `node scripts/anandajoti/build.mjs --cache <dir>` | Rebuilds `server/data/anandajoti.json` (Ānandajoti Bhikkhu links, each checked against the Pāli on the page); needs network |
| `node scripts/anandajoti/audit.mjs --sample 30` | Live audit of a sample of the Ānandajoti links (`npm run linkcheck` reads only `translations.json`, so it does not cover them) |
| `node scripts/build_topics.mjs` | Rebuilds `server/data/topics.json` from Access to Insight's General and Numerical indexes, pinned to one `bcbsit/ati` commit |
| `node scripts/build-bmc.mjs` | Rebuilds `server/data/bmc.json` (rule → *Buddhist Monastic Code* section) from the book's table of contents; needs network |
| `python scripts/render-icon.py` | Renders `assets/icon.svg` to `assets/icon.png` and `.claude-plugin/icon.png` (512 px, Pillow); keep its shapes in step with the SVG |
| `python scripts/semantic/eval_embeddings.py` | Reproduces the search-by-meaning evaluation in [semantic-search.md](semantic-search.md) (deferred) |
| `scripts/expected-tools.mjs` | Not run directly: reads the exact tool names from `src/server.mjs` and the modules in `src/features/index.mjs`. The HTTP, widget, smoke and npx checks compare the live tool list with it, so a new feature tool needs no count edits |

Behind a corporate or sandbox proxy, Node's `fetch` ignores `HTTPS_PROXY` unless you set `NODE_USE_ENV_PROXY=1` (supported in recent Node releases), and you may need `NODE_EXTRA_CA_CERTS` pointing at the proxy's CA bundle. `scripts/smoke.mjs` passes the environment through to the server it starts.

## Repository layout

```text
src/                 server source (ES modules)
  index.mjs          stdio entry (createServer + StdioServerTransport)
  server.mjs         createServer(): MCP tools, resources, prompts, server instructions, VERSION
  http-server.mjs    Streamable HTTP entry: stateless /mcp, /healthz, CORS, rate limit, counters
  cache.mjs          in-memory LRU for live English/ATI/DPD responses
  citations.mjs      citation parser: IDs, PTS volume/page, Vinaya forms, links
  canon.mjs          bundled canon: load, resolve, segments, describe, search, browse, linksFor
  english.mjs        translations: dhammatalks.org, Access to Insight, Ancient Buddhist Texts (aj:), mirrors, fallback
  providers.mjs      Digital Pāḷi Dictionary, Access to Insight search/read, list_sources
  http.mjs           allowlisted fetch, redirects, retries, mirrors, outage simulation
  features/index.mjs feature registry: one `export * as x from '../x.mjs'` line per feature module
  verify.mjs         verify_quote            find-citations.mjs  find_citations
  calendar.mjs       uposatha, festivals     daily.mjs           daily_text, reading_plan
  topics.mjs         topic, list_topics, dhamma_list
  dppn.mjs           lookup_name             vinaya-bmc.mjs      vinaya_rule
  abhidhamma.mjs     abhidhamma_matika, patthana_condition
  paritta.mjs        paritta                 talks.mjs           find_talks
  pronunciation.mjs  pali://pronunciation    memorise.mjs        memorise_passage prompt
  chatgpt-widget.mjs read_passage_widget (hosted HTTP only, CHATGPT_WIDGET=1)
server/              BUILT OUTPUT, committed (plugin users need no build)
  index.cjs          bundled stdio server (what every local client runs)
  http.cjs           bundled HTTP server (hosted /mcp; see hosting.md)
  data/canon.json.gz        Pāli text + citation index (generated)
  data/translations.json    translation links (generated)
  data/anandajoti.json      Ānandajoti Bhikkhu links, merged in by canon.load() (scripts/anandajoti/build.mjs)
  data/topics.json          Access to Insight General and Numerical index topics (scripts/build_topics.mjs)
  data/dhamma_lists.json    numbered lists, curated by hand and checked against the VRI text by tests/topics.test.mjs
  data/bmc.json             rule → Buddhist Monastic Code section links (scripts/build-bmc.mjs)
  data/dppn.json            DPPN source record; no entries until the licence is confirmed (#32)
  THIRD_PARTY_LICENSES.txt
scripts/
  build.mjs          esbuild bundle + licence collection
  audit.mjs          exhaustive offline audit
  smoke.mjs          MCP protocol and live checks
  outage.mjs         mirror failover drill (PALI_CANON_SIMULATE_OUTAGE); exits non-zero on a design mismatch
  linkcheck.mjs      nightly translation link check (250 a day, or --all)
  loadtest.mjs       50 concurrent HTTP sessions; p50/p95 and errors
  npx-check.mjs      dependency-free stdio check of a packed npm tarball
  check-server-json.mjs  server.json checks; --publish refuses placeholders
  install-links.mjs  generates the one-click editor links in install/ide.md
  coverage.mjs       coverage numbers
  expected-tools.mjs exact tool names derived from the source (see the table above)
  export-index.mjs, build-site.mjs   citation index export and docs site (see the table above)
  anandajoti/, build_topics.mjs, build-bmc.mjs   data builders for the new data files
  pack-desktop.mjs   .mcpb packaging
  canon/             Python data pipeline (see its README)
skills/              study, compare, pali-word, method, memorise (SKILL.md, shared format; agents/openai.yaml for Codex)
tests/core.test.mjs  unit and regression tests; each feature has its own tests/<feature>.test.mjs
.claude-plugin/      Claude Code plugin + marketplace manifests (checked by tests/core.test.mjs; run `claude plugin validate .`)
.mcp.json            Claude Code plugin's MCP server config
.codex-plugin/, .mcp.codex.json, .agents/plugins/marketplace.json   Codex plugin and marketplace
gemini-extension.json, GEMINI.md, commands/   Gemini CLI extension (manifest, context file, /study /compare /pali-word /method /memorise)
manifest.json        Claude Desktop extension manifest (lists PRIVACY.md under privacy_policies)
server.json          MCP Registry entry (io.github.DaniilKi/pali-canon)
Dockerfile, fly.toml, render.yaml   hosted HTTP server image and hosting configs (fly.toml and render.yaml set CHATGPT_WIDGET=1)
site/, llms.txt      docs site layout (Jekyll) and the plain-text guide for AI agents
assets/icon.svg, icon.png   directory icon (palm-leaf manuscript)
docs/                human documentation (docs/i18n/: machine-drafted translations of the guidance)
```

## Tools

| Tool | Purpose | Network |
|---|---|---|
| `resolve_reference` | `reference`, `script`. Any citation, PTS page, Thai/Myanmar/VRI edition page ("Thai MN 1.103") or link → the text, its PTS location, `edition_pages`, VRI paragraphs, translations and numbering notes. The reference may be written in any supported script; `script` puts Pāli titles in that script. A citation the canon does not know but a post-canonical book does ("Vism 1.1", "Abhidh-s 1", "mahavamsa 3") is described with `canonical: false` and `read_with: get_post_canonical` (titles in `script`); canon citations always win. Only when both fail: a collection word with spaced numbers ("samyutta 56 11" → SN 56.11, full collection words only) or a sutta name (Pāli title, English translation title or DPD sutta name; no digits allowed), returned with `matched_by` and `name_match`; several texts with the name are an error listing every candidate, except one DN/MN text among SN/AN namesakes, which is returned with `also_named` (`src/sutta-names.mjs`, D61) | offline |
| `get_metadata` | Details of a text, including linked translations (`translation_id`) and a SuttaCentral link | offline |
| `get_text` | Exactly one of `uid` (individual citation) or `book` (complete VRI source book from `browse_canon` node `books`); `offset`, `limit`, `includeVariants`, `variants` (none/raw/structured; overrides `includeVariants`), `translation`, `script`, `commentary` (adds `commentary`: the opening of the aligned Aṭṭhakathā, up to 20 segments, labelled as commentary, as `get_commentary` returns it, with `read_with` and `opening_note` saying how to continue with `get_commentary`; transliterated like the text when `script` is set). Pāli with VRI paragraph numbers, PTS and Thai/Myanmar/VRI page breaks (`pts_page_begins`, `thai_page_begins`, `myanmar_page_begins`, `vri_page_begins`) and optional variants, paginated by segment. `variants: "structured"` adds per-segment `variants` (raw note, readings with editions, omissions, remarks), `variant_sigla` and `variant_note` (`src/variants.mjs`). `script` (roman, sinhala, thai, myanmar, devanagari, khmer, lao, lanna, or ISO codes such as sinh) transliterates the Pāli and adds `script_note`; IDs, citations and English stay Roman (`src/script.mjs`) | offline (English online) |
| `get_translation` | One English translation with attribution, licence and numbering notes, paginated by characters | online, mirrored |
| `compare_translations` | Two to four translations side by side with the Pāli opening | online, mirrored |
| `search_texts` | `query`, `collection`, `limit`, `offset`, `script`, `include_post_canonical`, `english` (auto/off/only). Full-text Pāli search (diacritics optional, "quoted phrases"), titles, English titles. The query may be in any supported script (`input_script`, `input_romanized` are reported); `script` writes titles and excerpts in that script. `include_post_canonical: true` adds a separate `post_canonical` result list (labelled `canonical: false`, titles and excerpts in `script`); with `collection` set it is not searched and says so. English-keyboard input is normalised (`input_normalised`); a Pāli query with fewer than 3 texts is retried with spelling variants (`spelling_note`, `spelling_variants`, `exact_search`); an English query is expanded into at most 8 Pāli terms from the glossary (`expanded_from_english`: the mapping, `source`, `searched_pali`, `dropped_terms`, `searched_as_pali` for Pāli words kept from the question); a question of English stop words around Pāli words that finds nothing as typed searches the Pāli words only (`english_words_ignored`); `english: "off"` disables expansion (`src/english-search.mjs`, D60, D62) | offline |
| `browse_canon` | canon → piṭaka → collection → section → text; node `books` lists complete VRI root files with `get_text` book IDs | offline |
| `lookup_pali` | Digital Pāḷi Dictionary entry; when dpdict.net is unreachable, the bundled subset answers, labelled `offline: true`. Input without diacritics adds `inferred_spelling` (every bundled DPD headword that folds to it); when the live site has nothing for the word as typed and one spelling was inferred, that one is looked up (`looked_up`) (`src/lookup-input.mjs`) | online (offline fallback) |
| `get_commentary` | `uid`, `offset`, `limit`. The VRI Aṭṭhakathā passages aligned to the text by VRI paragraph number and checked against the words they quote, labelled as commentary, with the work, evidence type and commentary PTS pages (`src/commentary.mjs`, `server/data/commentary.json.gz`) | offline |
| `get_post_canonical` | `citation`, `offset`, `limit`, `includeVariants`. A post-canonical VRI book (Ṭīkā and Añña: Visuddhimagga "Vism ch. 1", "Vism 1.1", "Vism §19"; Abhidhammatthasaṅgaha "Abhidh-s 1.4"; any book by id, "mahavamsa 3"); empty, "tika" or "anna" lists books. Everything labelled `canonical: false`; Vism PTS pages are refused (`src/postcanonical.mjs`, `server/data/postcanonical.json.gz`) | offline |
| `search_post_canonical` | `query`, `books`, `section` (tika/anna), `limit`, `offset`. Full-text search of the post-canonical books; each hit's citation round-trips through `get_post_canonical` | offline |
| `analyse_passage` | `uid`, `segment` or `paragraph`, `offset`, `limit`. Word by word from the bundled DPD subset: split, every parse (headword, grammar, root, meaning), quotation sandhi undone only when DPD knows the result, unknown words marked `unknown`; CC BY-NC-SA 4.0 notice (`src/analyse.mjs`, `server/data/dpd.json.gz`) | offline |
| `get_parallels` | `uid`, `limit`, `offset`. Parallels and cross-references from `server/data/parallels.json.gz` (`scripts/parallels/build.mjs`, D59): `shared-passage` links (texts sharing runs of 8+ words that are rare in the canon, with `score`, `shared_words`, `coverage` and the segment refs on both sides) first, then `commentary-citation` links (the commentary on this text cites another, or another text's commentary cites this one: VRI's bracketed reference confirmed by the quotation, or a uniquely titled sutta name), each with `match`, `how_matched`, the `get_commentary` passage ref and the `evidence` words; `counts`, `suttacentral_parallels` (link only) (`src/parallels.mjs`) | offline |
| `glossary` | `term`, `direction` (auto/en-pa/pa-en), `limit`. English → Pāli from DPD's English index and multi-word DPD meanings, Pāli → English from DPD headwords, plus the curated `dhamma_lists` glosses; each entry has `source`; nothing found is reported, never guessed (`src/glossary.mjs`, `server/data/glossary.json.gz`, D62) | offline |
| `search_access_to_insight` | Access to Insight sutta and subject indexes | online, mirrored |
| `get_access_to_insight_text` | Read an Access to Insight page with its licence notice | online, mirrored |
| `list_sources` | Sources, versions, licences, mirrors, and `translation_coverage` per collection | offline |
| `verify_quote` | `text`, `language` (auto/pali/english), `texts` (English scope, up to 12 citations), `limit`. Fuzzy-matches a quotation. Pāli: the bundled VRI text through a lazy word and trigram index (built on the first Pāli check). English: the linked translations, fetched live and cached (default scope: the 26 Dhammapada chapters, one page per translator, at most 80 pages). Returns matches with citation and similarity, the verdict `found` / `close_paraphrase` / `not_found_in_scope`, the scope, `equally_similar_texts` and `citation_note` for stock passages, and `next_step` (check the Pāli) for English misses | offline (Pāli); online (English) |
| `find_citations` | `text` (up to 200,000 characters). Finds every citation form the parser accepts, resolves each with `canon.resolve`, and reports unresolved ones with the reason and UTF-16 offsets | offline |
| `uposatha` | `from`, `to`, `tradition` (thai-mahanikaya, thai-dhammayut, myanmar, sri-lanka). Uposatha days (full, new and half moons) with lunar month and day; computed and labelled with the rule | offline |
| `festivals` | `year`, `tradition`. Māgha Pūjā, Vesak, Āsāḷha Pūjā, Vassa start and end, Pavāraṇā and the Kaṭhina season, with their canonical texts; computed (see [calendar.md](calendar.md)) | offline |
| `daily_text` | `date` (YYYY-MM-DD, UTC, default today), `kind` (`verse` or `sutta`). Fixed-rotation Dhammapada verse or sutta of the day from the bundled canon | offline |
| `reading_plan` | `name`, `day`. Plans `dhammapada-26-days`, `mn-year`, `ati-into-the-stream`, `ati-four-noble-truths`; lists plans, a whole schedule or one day's readings with `get_text` arguments | offline |
| `lookup_name` | `name`, `limit`, `textLimit`, `exactWord`. DPPN entry when bundled (none yet: licence unconfirmed, #32), links to the online editions, and the VRI texts that name it (ranked title, then opening, then body) | offline |
| `topic` | `name`. Texts on a topic from Access to Insight's General and Numerical indexes, mapped to canon IDs (title, PTS page, numbering notes), with see-also topics and the matching numbered list | offline |
| `list_topics` | `query`, `index` (subject, numerical or all), `offset`, `limit`. Browse or search the 472 topics | offline |
| `dhamma_list` | `name`. A standard numbered list (four noble truths, five aggregates, the 37 aids, ten fetters, twelve links…): Pāli members, labelled English glosses, status (canonical or later) and the defining passage. No name lists all 37 | offline |
| `abhidhamma_matika` | `section`. The Dhammasaṅgaṇī mātikā (22 triads, 100 Abhidhamma dyads by group, 42 Suttanta dyads) with VRI paragraphs and `get_text` locations | offline |
| `patthana_condition` | `name` (Pāli name, 1–24 or "all"). One of the 24 Paṭṭhāna conditions: Pāli name, definition text and location, and a `lookup_pali` pointer for the term | offline |
| `vinaya_rule` | `rule` (Pj 1–4, Ss 1–13, Ay 1–2, Np 1–30, Pc 1–92, Pd 1–4, Sk 1–75, As 1–7). A monk's Pātimokkha rule: its VRI text and the section of Ṭhānissaro Bhikkhu's *Buddhist Monastic Code* that explains it (link only) | offline |
| `paritta` | `name`, `text`, `offset`, `limit`. Commonly recited texts (paritta, Khuddakapāṭha chants) in Pāli from the bundled VRI text; canonical sources only; English as links | offline |
| `find_talks` | `query`, `passage`, `category` (all, evening, morning), `page`, `limit`, `cursor`. Link-only search of Ṭhānissaro Bhikkhu's talks through dhammatalks.org's own search page: titles, dates and URLs only, continued with `next_cursor`; a passage is searched by the exact title of his translation; cached, requests at least 1 second apart | online |
| `read_passage_widget` | Hosted HTTP only, when `CHATGPT_WIDGET=1` (registered by `src/http-server.mjs`, not the feature registry). Pāli and one English translation for the ChatGPT reading widget (`ui://pali-canon/reader-v2.html`, plus the Apps SDK alias `ui://pali-canon/reader-v2.skybridge.html`). `offset`/`limit` page the Pāli; `english.continue_with` pins the translation ID and `english_offset` for English continuation (6,000 characters per call) | online (English) |

Resources: `pali://sources`, `pali://canon-guide`, `pali://pronunciation` (Pāli pronunciation guide and links to public-domain grammars, `src/pronunciation.mjs`). Prompts: `study_passage`, `compare_translations`, `topic_research`, `memorise_passage` (chunks by segment, cloze practice and a spaced review schedule, `src/memorise.mjs`). All tools are annotated read-only and idempotent; network tools set `openWorldHint`.

Feature tools live in their own modules (see AGENTS.md, "Add a tool"). The tool surface is pinned by exact names: `scripts/expected-tools.mjs` reads them from `src/server.mjs` (the 11 core tools) and the modules in `src/features/index.mjs`, so the tests, smoke run and npx check need no count edits when a tool is added. A new tool still needs a row in the annotations table of [listings/claude-connector.md](listings/claude-connector.md) and in [install/local-clients.md](install/local-clients.md); tests enforce both.

## Connect any MCP client

The server speaks MCP over stdio: `node /path/to/pali-canon-claude/server/index.cjs`. Keep `server/data/` next to `index.cjs`.

**Claude Code**

```sh
claude mcp add --transport stdio pali-canon -- node /absolute/path/pali-canon-claude/server/index.cjs
```

**Claude Desktop** (`claude_desktop_config.json`, if not using the `.mcpb`)

```json
{ "mcpServers": { "pali-canon": { "command": "node", "args": ["C:/absolute/path/pali-canon-claude/server/index.cjs"] } } }
```

**Codex CLI** (`~/.codex/config.toml`); to install the Codex plugin with its skills instead, see [install/codex.md](install/codex.md)

```toml
[mcp_servers.pali-canon]
command = "node"
args = ["/absolute/path/pali-canon-claude/server/index.cjs"]
```

**Gemini CLI**: `gemini extensions install https://github.com/DaniilKi/pali-canon-claude` (see [install/gemini.md](install/gemini.md)). The extension runs `node ${extensionPath}${/}server${/}index.cjs` from the installed copy, so it relies on `server/index.cjs` and `server/data` being committed (a test checks this).

**Other clients** (Cursor, VS Code, Windsurf, Zed, Cline, Goose): tested-shape configs and one-click links are in [install/ide.md](install/ide.md); regenerate the links with `node scripts/install-links.mjs` (a core test keeps the page in sync). Once the npm package is published ([#4](https://github.com/DaniilKi/pali-canon-claude/issues/4)), `npx -y pali-canon-mcp` replaces the path. It is not published yet; until then use `node /path/to/server/index.cjs`.

**Local models** (LM Studio, Open WebUI via mcpo, oterm, Kit/MCPHost with Ollama): see [install/local-clients.md](install/local-clients.md). Note that mcpo 0.0.20 needs `uvx --with "mcp<2" --with "fastapi<0.120" mcpo ...` (as of November 2026), and that mcpo exposes only tools, not server instructions, prompts or resources.

**Remote (HTTP):** run `node server/http.cjs` (or `docker run -p 8080:8080 ghcr.io/daniilki/pali-canon-mcp`) and connect clients to `http://host:8080/mcp` using Streamable HTTP. See [hosting.md](hosting.md). The project's own public endpoint is not deployed yet.

## Skills

`SKILL.md` frontmatter uses the Agent Skills spec fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`) plus one Claude Code extension, `argument-hint`, which must stay at the top level because Claude Code reads it only there (keep a copy under `metadata.argument-hint`). Each skill says it needs the Pali Canon MCP server. `tests/core.test.mjs` enforces this. Listing copy for skill hubs is in [listings/skills.md](listings/skills.md).

### English-keyboard input (#102)

`src/input.mjs` is the one normaliser for Pāli typed on an English keyboard, used by `search_texts`, `resolve_reference`, `lookup_pali`, `analyse_passage` (through `resolveReference`), `search_post_canonical`, `topic`, `list_topics`, `dhamma_list`, `paritta` and `patthana_condition` (the feature tools call `withNormalised()`). Per word: NFC and ṁ → ṃ always; Velthuis markers (`.t "n ~n m.. n.. ,,n`, from DPD's KOReader table) inside a word of four or more letters; Harvard-Kyoto capitals (mixed-case words only, never all-caps), doubled vowels, anglicised `ny` (ñ or ṃy) and the aliases (nirvana, karma, dharma…) only when the word as typed is not a canon word and the result is (`vocabulary()`: every folded word of the bundled canon, built once in about 0.6 s). Every rewrite is returned as `input_normalised` (`original`, `read_as`, `scheme`, `changes`). `fuzzyKey()` (fold, ṃ before a consonant → n, ny → n, drop aspirate h, collapse doubles) drives `spellingVariants()`, which `search_texts` uses only when the exact folded search finds fewer than 3 texts. `canon.search()` takes `groups` (every group must match, any alternative within a group may) for these variants and for the English expansion.

Rebuild `server/data/glossary.json.gz` with the DPD release used for `dpd.json.gz` (see [scripts/canon/README.md](../scripts/canon/README.md#rebuilding-the-dictionary-subset-dpd)):

```sh
python -I scripts/dpd/build_glossary.py dpd.db server/data/canon.json.gz server/data/dpd.json.gz server/data/glossary.json.gz --archive-sha256 <sha256>
```

## Rebuilding the canon data

The data is generated by the Python pipeline in [`scripts/canon/`](../scripts/canon/README.md) from pinned upstream commits. In short: fetch VRI, the public-domain Mahāsaṅgīti root and Access to Insight; build; validate (must report 0 problems); link translations; copy into `server/data/`; run `npm run audit` (must report 0 failures), `npm run check` and `npm run smoke -- --live`. Then update the numbers in `docs/coverage.md` with `npm run coverage`.

## Coverage numbers

`npm run coverage` prints texts, approximate texts, grouped members and English links per collection and per source (dhammatalks.org, Access to Insight, Ancient Buddhist Texts); `--json` gives the full summary. Use it whenever data changes, and update [coverage.md](coverage.md) and the README to match.

## Adding a source

1. Check the five tests in [sources.md](sources.md#how-we-choose-sources), and record the decision there.
2. Add the host and path prefix to `ALLOWED` in `src/http.mjs`; never accept user-supplied hosts.
3. Bound the response size and paginate output. Return attribution and licence with every result.
4. Add mirrors only if they are official or long-standing, and say in the result when a mirror served it.
5. Add a unit test, a live check to `scripts/smoke.mjs`, and an outage case to `scripts/outage.mjs`.
6. Update `list_sources`, `THIRD_PARTY.md`, `docs/sources.md` and the README source table.

## Releasing

1. Bump the version in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `gemini-extension.json`, `server.json` (both `version` and `packages[0].version`) and `VERSION` in `src/server.mjs`. Tests fail if any of them differ from `package.json`.
2. `npm run check && npm run smoke -- --live && npm run outage`.
3. Run `claude plugin validate .` (expect only the CLAUDE.md and icon warnings until an icon is added).
4. `npm run pack:desktop`, then commit the rebuilt `server/`. The `.mcpb` includes `PRIVACY.md`, and `manifest.json` lists it under `privacy_policies`.
5. Merge to `main` and push the tag `vX.Y.Z`. The release workflow (`release.yml`) builds the `.mcpb`, the npm tarball and `SHA256SUMS.txt` and attaches them to the GitHub release. It publishes to npm only when the `NPM_TOKEN` secret is set. The same tag publishes the Docker image (`docker.yml`), deploys to Fly.io if `FLY_API_TOKEN` is set (`deploy.yml`), and is what the Gemini extension gallery picks up.
6. After npm publish, run `npm run registry:check` and then `mcp-publisher publish` (see [listings/mcp-registry.md](listings/mcp-registry.md)).
7. Test the `.mcpb` in Claude Desktop and the plugin in Claude Code.

Directory submissions use https://github.com/DaniilKi/pali-canon-claude/blob/main/PRIVACY.md as the privacy policy URL and https://github.com/DaniilKi/pali-canon-claude/issues as the support contact. Tasks that need a person (secrets, accounts, submissions) are listed in [HANDOFF.md](../HANDOFF.md).

## CI

`.github/workflows/check.yml` runs on every push to `main` and every pull request, on Node 20 and 22 across Linux, macOS and Windows: `npm ci`, `npm run check`, `npm run smoke`, `npm run pack:desktop`. The Linux / Node 20 run also checks that the committed `server/` matches a fresh build.

`.github/workflows/nightly.yml` runs every night (and on demand from the Actions tab). It runs three checks. The first is the live smoke test (`npm run smoke -- --live`). The second is the outage test (`npm run outage`). The third is the link check (`node scripts/linkcheck.mjs`). The link check opens a different 250 of the translation links each day, one at a time and slowly, so every link is checked about every ten days. Run `node scripts/linkcheck.mjs --all` to check them all at once. If any check fails, the job opens an issue called "Source health", or adds a comment to it if one is already open. Close that issue once the source is back or the dead link is fixed.

ATI search needs both `/index-sutta` and `/index-subject`. Each backup mirror gets one retry for transient failures (network errors, 5xx or 429); permanent errors such as 404 are not retried. Other mirror calls keep their existing retry policy. Search returns `index_sources` with the exact URL used for each index, including the jsDelivr CDN when it served the official archive. If either index cannot be loaded, the error names every failed index and includes its full mirror errors. The outage drill prints those errors without truncating the CDN details. `tests/ati-search.test.mjs` exercises these cases with mocked responses, independent of live source availability.

For a complete offline reading gate through the built server, run `npm run corpus:check -- --report corpus-check.report.json`. This reads every page of all indexed canonical texts, aligned commentaries, 109 post-canonical books and 61 complete VRI root books over MCP stdio. Use `--scope books` for the complete-root-book reading mode alone. Reports retain `indexed_texts_sha256` for the original three text scopes before adding book-mode segments to the overall fingerprint. See [completion criteria](completion.md) for its exact guarantees, source-coverage exceptions, remaining translation/client gaps and development-branch checks.

`.github/workflows/npx.yml` packs the npm tarball and starts it with `npx` on Linux, macOS and Windows. `release.yml`, `docker.yml` and `deploy.yml` run on release tags (see Releasing).

The HTTP health counters use only method labels derived from the installed SDK request/notification schemas and tool labels from `TOOL_TITLES` (plus the widget tool when enabled). Unrecognised names accumulate under `other`; request-supplied names never create new permanent labels. Counter dictionaries have no object prototype. `tests/http-client.test.mjs` checks bounded cardinality and data retention under invalid requests, prototype-like names, conditional widget counts and an actual SDK HTTP client's connection/reading/continuation sequence. Counters count attempts, including invalid requests; they are not a count of successful tool results.

The HTTP server explicitly sets a 65-second keep-alive idle timeout and 66-second header deadline. A pooled-connection regression simulates a 6.1-second event-loop pause: the old default reset the next request before it reached the handler. The longer finite window preserves that connection without changing tool execution or search logic. First-use work still takes time; the setting does not improve its CPU latency. The existing `scripts/loadtest.mjs` exercises the compiled HTTP server with concurrent SDK clients.

The HTTP-only ChatGPT reader uses versioned `v2` UI resources. Widget tool errors include matching JSON text and `structuredContent`; the embedded page clears old text/links on error via either bridge, including Apps SDK full-result metadata. English continuation uses `english.continue_with` (`name` and `arguments`), with a pinned translation ID for any positive character offset. The reader refuses to transfer an offset to an outage fallback version. This protection is specific to `read_passage_widget`; the plain `get_translation` API is unchanged. UI totals may be unknown for a partially read multi-page translation and are not displayed as numbers until known. Behaviour tests are in `tests/widget-rendering.test.mjs` (actual script in a minimal DOM) and `tests/widget-continuation.test.mjs` (mock sources), alongside the widget HTTP tests. Real host/browser acceptance remains a separate gate.

`search_post_canonical` validates every `books` filter before searching. Use whole-book IDs from `get_post_canonical`'s catalogue, recognised VRI stems/titles or whole-work aliases such as `vism` and `abhidh-s`. A typo or invalid member of a mixed selection is an error, not an empty/partial search. Chapter/paragraph citations are not book filters. Omitting `books` or passing `[]` retains the unrestricted meaning; valid filters with no matching text still return zero results. These rules do not change canonical search scope. `tests/postcanonical-scope.test.mjs` exercises all catalogue IDs and the MCP error/result distinction.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Translation or dictionary calls fail behind a proxy | Set `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS` |
| The server starts but cannot load the canon | `server/data/` must sit next to `server/index.cjs` |
| CI fails on "committed standalone server is current" | Run `npm run build` and commit `server/` |
| A citation resolves wrongly | Add a failing test in `tests/core.test.mjs`, fix, run `npm run audit` |
| `npm run outage` exits with "OUTAGE CHECK FAILED" | A mirror or fallback no longer behaves as designed. The scenario and call it lists show which source to look at |
| `node scripts/linkcheck.mjs` exits with "LINK CHECK FAILED" | A translation page has moved or gone (HTTP 404/410), or a whole site was down. Fix or remove the link in the translation data, or wait for the site to come back |
