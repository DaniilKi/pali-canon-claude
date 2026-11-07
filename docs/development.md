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
| `search_source_book` | `book`, `query`, `script`, `offset`, `limit`. Matches within rendered segments or complete stanzas of a full VRI root file, including material outside citation spans. Returns source-file refs and exact/context `get_text` book commands; search offsets count matches, reading offsets count source segments (`src/source-book-search.mjs`) | offline |
| `browse_canon` | canon → piṭaka → collection → section → text; node `books` lists complete VRI root files with `get_text` book IDs | offline |
| `lookup_pali` | Digital Pāḷi Dictionary entry; when dpdict.net is unreachable, the bundled subset answers, labelled `offline: true`. Input without diacritics adds `inferred_spelling` (every bundled DPD headword that folds to it); when the live site has nothing for the word as typed and one spelling was inferred, that one is looked up (`looked_up`) (`src/lookup-input.mjs`) | online (offline fallback) |
| `search_commentary` | `query`, `books` (VRI filenames or commentary book UIDs), `limit`, `offset`. Searches all 47 included commentary books, one hit per rendered segment or complete stanza. Each hit has a direct `get_commentary` reference plus a context request. Results carry `canonical: false`, VRI terms and no inferred root alignment (`src/commentary-search.mjs`) | offline |
| `get_commentary` | `uid`, `offset`, `limit`, `script` (same supported names and ISO codes as `get_text`; canonical input may also use native scripts). Use a canonical citation for aligned passages, `commentary` to list books, `commentary:<VRI-file>` for a whole book, an emitted aligned reference such as `mn10/c66`, or `commentary:<VRI-file>/cN` for an exact rendered source segment. Direct book reads carry `canonical: false` and do not assert root alignment. The VRI Aṭṭhakathā passages aligned to the text by VRI paragraph number and checked against the words they quote, labelled as commentary, with the work, evidence type and commentary PTS pages (`src/commentary.mjs`, `server/data/commentary.json.gz`) | offline |
| `get_post_canonical` | `citation`, `offset`, `limit`, `includeVariants`. A post-canonical VRI book (Ṭīkā and Añña: Visuddhimagga "Vism ch. 1", "Vism 1.1", "Vism §19"; Abhidhammatthasaṅgaha "Abhidh-s 1.4"; any book by id, "mahavamsa 3"); empty, "tika" or "anna" lists books. Everything labelled `canonical: false`; Vism PTS pages are refused (`src/postcanonical.mjs`, `server/data/postcanonical.json.gz`) | offline |
| `search_post_canonical` | `query`, `books`, `section` (tika/anna), `limit`, `offset`. Full-text search of the post-canonical books; each hit's citation round-trips through `get_post_canonical` | offline |
| `analyse_passage` | Exactly one of `uid` (canonical or post-canonical citation) or `book` (complete root file); at most one of `segment` or `paragraph`, `offset`, `limit`. Omit both selectors for the first body segment; supplied blank selectors are errors. Repeated paragraph labels in complete-file/post-canonical scopes require an exact reader segment ref. Extended modes retain `text_source`, source labels and printed page metadata; they do not assign individual root identities. The dictionary's inflection/deconstructor map remains based on VRI root vocabulary. Word by word from the bundled DPD subset: split, every parse (headword, grammar, root, meaning), quotation sandhi undone only when DPD knows the result, unknown words marked `unknown`; CC BY-NC-SA 4.0 notice (`src/analyse.mjs`, `server/data/dpd.json.gz`) | offline |
| `get_parallels` | `uid`, `limit`, `offset`. Parallels and cross-references from `server/data/parallels.json.gz` (`scripts/parallels/build.mjs`, D59): `shared-passage` links (texts sharing runs of 8+ words that are rare in the canon, with `score`, `shared_words`, `coverage` and the segment refs on both sides) first, then `commentary-citation` links (the commentary on this text cites another, or another text's commentary cites this one: VRI's bracketed reference confirmed by the quotation, or a uniquely titled sutta name), each with `match`, `how_matched`, the `get_commentary` passage ref and the `evidence` words; `counts`, `suttacentral_parallels` (link only) (`src/parallels.mjs`) | offline |
| `glossary` | `term`, `direction` (auto/en-pa/pa-en), `limit`. English → Pāli from DPD's English index and multi-word DPD meanings, Pāli → English from DPD headwords, plus the curated `dhamma_lists` glosses; each entry has `source`; nothing found is reported, never guessed (`src/glossary.mjs`, `server/data/glossary.json.gz`, D62) | offline |
| `search_access_to_insight` | Access to Insight sutta and subject indexes | online, mirrored |
| `get_access_to_insight_text` | Read an Access to Insight page with its licence notice | online, mirrored |
| `list_sources` | Sources, versions, licences, mirrors, and `translation_coverage` per collection | offline |
| `verify_quote` | `text`, `language` (auto/pali/english), `texts` (English scope, up to 12 citations), `limit`. Fuzzy-matches a quotation. Pāli: the bundled VRI text through a lazy word and trigram index (built on the first Pāli check). English: the linked translations, fetched live and cached (default scope: the 26 Dhammapada chapters, one page per translator, at most 80 pages). Returns matches with citation and similarity, the verdict `found` / `close_paraphrase` / `not_found_in_scope`, the scope, `equally_similar_texts` and `citation_note` for stock passages, and `next_step` (check the Pāli) for English misses | offline (Pāli); online (English) |
| `find_citations` | `text` (up to 200,000 characters). Finds recognised citation patterns, including printed edition pages, resolves each with `canon.resolve`, and reports unresolved ones with the reason and UTF-16 offsets | offline |
| `uposatha` | `from`, `to`, `tradition` (thai-mahanikaya, thai-dhammayut, myanmar, sri-lanka). Uposatha days (full, new and half moons) with lunar month and day; computed and labelled with the rule | offline |
| `festivals` | `year`, `tradition`. Māgha Pūjā, Vesak, Āsāḷha Pūjā, Vassa start and end, Pavāraṇā and the Kaṭhina season, with their canonical texts; computed (see [calendar.md](calendar.md)) | offline |
| `daily_text` | `date` (YYYY-MM-DD, UTC, default today), `kind` (`verse` or `sutta`). Fixed-rotation Dhammapada verse or sutta of the day from the bundled canon | offline |
| `reading_plan` | `name`, `day`. Plans `dhammapada-26-days`, `mn-year`, `ati-into-the-stream`, `ati-four-noble-truths`; lists plans, a whole schedule or one day's readings with `get_text` arguments | offline |
| `lookup_name` | `name`, `limit`, `textLimit`, `exactWord`. DPPN entry when bundled (none yet: licence unconfirmed, #32), links to the online editions, and the VRI texts that name it (ranked Pāli/English title, then opening, then body; matching title evidence included) | offline |
| `topic` | `name`. Texts on a topic from Access to Insight's General and Numerical indexes, mapped to canon IDs (title, PTS page, numbering notes), with see-also topics and the matching numbered list | offline |
| `list_topics` | `query`, `index` (subject, numerical or all), `offset`, `limit`. Browse or search the 472 topics | offline |
| `dhamma_list` | `name`. A standard numbered list (four noble truths, five aggregates, the 37 aids, ten fetters, twelve links…): Pāli members, labelled English glosses, status (canonical or later) and the defining passage. No name lists all 37 | offline |
| `abhidhamma_matika` | `section`. The Dhammasaṅgaṇī mātikā (22 triads, 100 Abhidhamma dyads by group, 42 Suttanta dyads) with VRI paragraphs and `get_text` locations | offline |
| `patthana_condition` | `name` (Pāli name, 1–24 or "all"). One of the 24 Paṭṭhāna conditions: Pāli name, definition text and location, and a `lookup_pali` pointer for the term | offline |
| `vinaya_rule` | `canonical_text.reading_command` opens the exact bundled passage; shared samatha sources also expose `introduction.read_with`. Legacy prose `read_with` is retained. `rule` (Pj 1–4, Ss 1–13, Ay 1–2, Np 1–30, Pc 1–92, Pd 1–4, Sk 1–75, As 1–7). A monk's Pātimokkha rule: its VRI text and the section of Ṭhānissaro Bhikkhu's *Buddhist Monastic Code* that explains it (link only) | offline |
| `paritta` | `name`, `text`, `offset`, `limit`. Commonly recited texts (paritta, Khuddakapāṭha chants) in Pāli from the bundled VRI text; canonical sources only; English as links | offline |
| `find_talks` | `query`, `passage`, `category` (all, evening, morning), `page`, `limit`, `cursor`. Link-only search of Ṭhānissaro Bhikkhu's talks through dhammatalks.org's own search page: titles, dates and URLs only, continued with `next_cursor`; a passage is searched by the exact title of his translation; cached, requests at least 1 second apart | online |
| `read_passage_widget` | Hosted HTTP only, when `CHATGPT_WIDGET=1` (registered by `src/http-server.mjs`, not the feature registry). Pāli and one English translation for the ChatGPT reading widget (`ui://pali-canon/reader-v6.html`, plus the Apps SDK alias `ui://pali-canon/reader-v6.skybridge.html`). `offset`/`limit` page the Pāli; `english.continue_with` pins the translation ID and `english_offset` for English continuation (6,000 characters per call) | online (English) |

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

The shared provider reader also applies its configured retry policy to a body interrupted after response headers arrive. A retry fetches the complete page anew; partial text is never returned or combined with another attempt. A streamed response exceeding 6 MB is cancelled and rejected without retry. Reader locks are released on success and failure, and cancellation errors do not hide the original failure. `tests/provider-stream.test.mjs` exercises these paths with Web response streams; allowlists, mirror order, timeouts and retry counts are unchanged.

English `verify_quote` results preserve the actual returned translation ID and provider notices in both matches and `scope.translations_checked`. A labelled version fallback also records `requested_translation_id`; failed retrievals retain their requested IDs in `scope.not_retrieved`. This metadata comes from the shared translation provider, including numbering/mirror/inheritance notes. A total outage remains an error. `tests/verify-provenance.test.mjs` covers these records through injection and the MCP/provider path; it does not change matching or ranking algorithms.

`lookup_pali` validates the documented DPD JSON shape before caching: string `summary_html` and `dpd_html`, plus usable name/URL/attribution when non-null licence metadata is supplied. Empty fragments remain valid empty results; absent/null licence metadata keeps the existing default notice. Malformed responses use the labelled offline subset when available, with an unusable-response diagnosis rather than claiming the site was unreachable. Unknown offline words remain explicit errors. `tests/dictionary-response.test.mjs` checks live/empty results, licences, malformed payloads, recovery without a stale bad cache entry, and MCP success/error delivery.

For a complete offline reading gate through the built server, run `npm run corpus:check -- --report corpus-check.report.json`. This reads every page of all indexed canonical texts, aligned commentaries, 109 post-canonical books and 61 complete VRI root books over MCP stdio. Use `--scope books` for the complete-root-book reading mode alone. Reports retain `indexed_texts_sha256` for the original three text scopes before adding book-mode segments to the overall fingerprint. See [completion criteria](completion.md) for its exact guarantees, source-coverage exceptions, remaining translation/client gaps and development-branch checks.

`.github/workflows/npx.yml` packs the npm tarball and starts it with `npx` on Linux, macOS and Windows. `release.yml`, `docker.yml` and `deploy.yml` run on release tags (see Releasing).

The HTTP health counters use only method labels derived from the installed SDK request/notification schemas and tool labels from `TOOL_TITLES` (plus the widget tool when enabled). Unrecognised names accumulate under `other`; request-supplied names never create new permanent labels. Counter dictionaries have no object prototype. `tests/http-client.test.mjs` checks bounded cardinality and data retention under invalid requests, prototype-like names, conditional widget counts and an actual SDK HTTP client's connection/reading/continuation sequence. Counters count attempts, including invalid requests; they are not a count of successful tool results.

The HTTP server explicitly sets a 65-second keep-alive idle timeout and 66-second header deadline. A pooled-connection regression simulates a 6.1-second event-loop pause: the old default reset the next request before it reached the handler. The longer finite window preserves that connection without changing tool execution or search logic. First-use work still takes time; the setting does not improve its CPU latency. The existing `scripts/loadtest.mjs` exercises the compiled HTTP server with concurrent SDK clients.

The HTTP-only ChatGPT reader uses versioned `v6` UI resources. Widget tool errors include matching JSON text and `structuredContent`; the embedded page clears old text/links on error via either bridge, including Apps SDK full-result metadata. English continuation uses `english.continue_with` (`name` and `arguments`), with a pinned translation ID for any positive character offset. The reader refuses to transfer an offset to an outage fallback version. The underlying translation API enforces the same rule for `get_translation`: nonzero offsets require an exact translation ID, and its `continue_with` contains the next call. English attached to `get_text` also supplies this continuation. ATI archive mirrors can still serve the same version. First-page cross-version fallback remains explicitly labelled. UI totals may be unknown for a partially read multi-page translation and are not displayed as numbers until known. Behaviour tests are in `tests/widget-rendering.test.mjs` (actual script in a minimal DOM) and `tests/widget-continuation.test.mjs` (mock sources), alongside the widget HTTP tests. A dedicated Chromium CI job also exercises both simulated bridges at phone/desktop widths, including actual tool continuation responses and keyboard/landmark/live-status semantics. Signed-in host acceptance and human screen-reader usability remain separate gates.

`search_post_canonical` validates every `books` filter before searching. Use whole-book IDs from `get_post_canonical`'s catalogue, recognised VRI stems/titles or whole-work aliases such as `vism` and `abhidh-s`. A typo or invalid member of a mixed selection is an error, not an empty/partial search. Chapter/paragraph citations are not book filters. Omitting `books` or passing `[]` retains the unrestricted meaning; valid filters with no matching text still return zero results. These rules do not change canonical search scope. `tests/postcanonical-scope.test.mjs` exercises all catalogue IDs and the MCP error/result distinction.

Citation input normalization is shared by `get_text`, `resolve_reference`, `get_metadata`, `get_translation`, `compare_translations` and the hosted reader. Existing supported native letters/digits are converted with `romanizeInput`; responses label `input_script` and `input_romanized`. Roman inputs receive no extra labels. This does not change the output script: metadata and English remain Roman, and the widget displays Roman Pāli unless script is selected. `tests/reader-script-input.test.mjs` uses handwritten citations in Sinhala, Thai, Myanmar, Devanagari, Khmer, Lao and Lanna through MCP and the widget data function. Native-reader and signed-in browser acceptance are separate gates.

`analyse_passage` also applies this existing native-citation normalization before its citation/name resolver, and returns the same input labels. Source segment references from `get_text`, Pāli surface words and dictionary analyses remain Roman. `tests/analysis-selection.test.mjs` compares source segments and DPD results with equivalent Roman calls in all seven scripts and checks that native input cannot bypass the exact selector safeguards. Name matching, dictionary content and licensing are unchanged.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Translation or dictionary calls fail behind a proxy | Set `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS` |
| The server starts but cannot load the canon | `server/data/` must sit next to `server/index.cjs` |
| CI fails on "committed standalone server is current" | Run `npm run build` and commit `server/` |
| A citation resolves wrongly | Add a failing test in `tests/core.test.mjs`, fix, run `npm run audit` |
| `npm run outage` exits with "OUTAGE CHECK FAILED" | A mirror or fallback no longer behaves as designed. The scenario and call it lists show which source to look at |
| `node scripts/linkcheck.mjs` exits with "LINK CHECK FAILED" | A translation page has moved or gone (HTTP 404/410), or a whole site was down. Fix or remove the link in the translation data, or wait for the site to come back |

## Verify every text in the installed bundle

Run `npm run audit:installed` after building the server. This copies only `server/` to a temporary directory, starts its stdio MCP server from an empty working directory, and disables network access in that process. It reads every page of every canonical text and aligned commentary, plus every post-canonical book, and compares the returned segments and citations with the source corpus. It also compares linked translation metadata for every text and exercises eleven offline fixtures covering all bundled datasets, including the dictionary, glossary, parallels, topics and Vinaya references. The temporary copy is removed when the check ends.

For a JSON report that also lists every text without an aligned commentary passage, run:

```sh
npm run audit:installed -- --report /tmp/pali-installed-corpus.json
```

To exhaustively check an extracted npm tarball or desktop staging directory, add `--server-dir /path/to/package/server`; the source corpus in this checkout remains the comparison baseline. A report records `running`, then `passed` or `failed`, so a failed rerun cannot leave an earlier successful report looking current.

Use an existing writable destination directory; on Windows, choose a path on your own computer. The report distinguishes missing commentary alignments from retrieval failures. It also counts approximate texts: passing this check does not fill the VRI edition's abbreviations, supply missing commentary alignments or add English translations. The data remains exactly as sourced.

The package CI runs the exhaustive installed-corpus audit once on Ubuntu with Node 20. Its separate npm installation matrix checks that all lazy datasets load from the installed tarball on every supported OS. Those checks now fail when a lazy dictionary shard is missing, or a missing optional translation-link index would silently reduce the available references, even if MN 10 resolves correctly. Negative regression fixtures also reject dropped or altered text, wrong totals, repeated pages and missing continuations.

## Searching complete verses

Pāli full-text search checks complete stanzas as retrieval displays them. A quoted verse can use spaces, tabs or line breaks between its words. Search preserves punctuation and does not join separate stanzas, prose paragraphs or canonical texts. Post-canonical results carry a citation that contains the whole matching stanza, even when its lines occupy several XML blocks. Excerpts preserve the source line breaks.

`tests/verse-search.test.mjs` derives its quotations from bundled text and checks canonical and post-canonical search, citation containment and boundary isolation. The isolated installed-corpus audit repeats whole-stanza searches through the shipped MCP server with network access disabled.

## Search and read the complete bundled commentary

`search_commentary` searches the 47 VRI Aṭṭhakathā books already included in the package. It also reaches introductions and other material excluded from verified root-text alignments. Words must match within one prose segment or complete stanza; quoted phrases accept line breaks. Search accepts Roman or supported native-script Pāli, with diacritics optional. Native input is labelled; script selects displayed Pāli and exact/context commands preserve it. It does not fetch any website. Retained folded search text uses an 8 MiB payload budget; whole-book source data and rendered segments remain lazy in-memory data.

Start with `get_commentary` and `{"uid":"commentary"}` to list included books. Use the returned VRI filenames in the search's optional `books` filter. Each search hit supplies `read_with` for the exact segment and `context_with` for nearby segments. Pass the `uid`, `offset` and `limit` fields to `get_commentary`; `tool` names the tool to call. These are rendered-segment references, not traditional canonical citations. Retain the package release or repository commit together with the returned VRI commit when citing them: segment numbering can change with a data or rendering update.

Set `script` on `get_commentary` to read aligned passages, exact segment references or whole books in any supported script. The book catalogue also transliterates Pāli titles. IDs, references, source pins, terms and alignment cautions remain unchanged. `get_text` with `commentary: true` preserves the selected script in its continuation command. This is server transliteration, subject to the same native-reader review limits as the root text.

Direct book references are not canonical citations and do not assert which root passage the commentary explains. Existing canonical calls such as `get_commentary("MN 10")` retain their verified alignment behavior. Emitted aligned references such as `mn10/c66` select exactly one aligned segment; parallels now put that exact reference in their evidence-reading command. These aligned refs and direct whole-book refs use different numbering. Missing alignments remain missing; global book reading simply exposes already bundled text without guessing a relationship.

## Precise canonical search scopes

The `collection` filter in `search_texts` matches whole collection or section identifiers. `sn1` selects SN 1 and its numbered members; it does not include SN 10–19. Likewise, `an1` excludes AN 10–11 and `kv1` excludes Kv 10 and later chapters. Exact text identifiers do not admit texts with the same initial digits. Existing grouped text IDs, such as `dhp1-20`, include only the members recorded in the bundle; the filter does not parse arbitrary citation ranges. Case and spaces are still normalised (`SN 1` becomes `sn1`), and named Vinaya section identifiers remain supported.

Unknown scopes, including a whitespace-only scope, return an error directing the caller to `browse_canon`, rather than an empty result that could be mistaken for missing source text. The same boundary check applies to title matches, English glossary expansion, spelling retries and paginated results. This changes search selection only; it adds no source text and changes no citation numbering or alignment.

A member ID absent from the independent citation index but recognised by group lookup, such as `an1.300`, selects its existing source group (`an1.297-305`). Search adds `scope_resolution` with the requested ID, actual group ID, approximation flag, explanation and `get_text` pointer. Results and pagination are identical to searching that group directly. This does not parse arbitrary ranges or establish whether the individual member is printed separately. Approximate groups themselves remain excluded from the full-text index, and the explanation says so. `scope_alignment` carries any explicit sharing or unverified-alignment caution for the selected source scope, even on an empty result.

## Paginating title matches

`search_texts` returns two separately counted streams. `results`, `total_texts_matched` and `next_offset` describe Pāli-body matches. `title_matches`, `total_title_matches` and `title_next_offset` describe matches in Pāli and linked English translation titles. The requested `offset` and `limit` apply to each stream. Pass `title_next_offset` back as `offset` to continue titles; pass `next_offset` to continue body results. A null pointer means that stream has ended.

Title-only searches can now reach every indexed match. They previously repeated the first 20 titles regardless of offset. English glossary expansion keeps the same literal title stream across pages, including an empty page after its last title; it does not switch to expanded Pāli titles at that point. `english: "only"` with no glossary expansion returns no literal title stream. Exhausted title pages do not claim the query has no matches when earlier pages contained titles. Source text, translation links and coverage are unchanged.

## Quoted phrases pasted from formatted text

Straight double quotes (`"sati buddha"`) and paired curly double quotes (`“sati buddha”`) select the same ordered phrase in canonical, commentary and post-canonical search. Whitespace inside the phrase remains flexible. Quotes do not change the source text or join separate passages. Apostrophes and curly single quotes remain ordinary Pāli punctuation.

When literal Pāli search finds no quoted phrase, spelling retries and the English-question keyword fallback do not discard its phrase constraint. English glossary expansion remains a separate labelled option; use `english: "off"` for literal Pāli phrase search. Unmatched double quotes conservatively disable loose retries, as straight quotes already did.

## Browsing exact identifiers and recorded groups

`browse_canon` uses the same identifier boundaries as canonical search. An exact text ID such as `mn1` or `sn1.1` lists that text without admitting MN 10 or SN 1.10. Named parent IDs such as `pli-tv-bu-vb-pc` still list their descendants. Arbitrary partial names such as `s` return an error.

A recorded group ID such as `dhp1-20` lists its existing members with ordinary pagination. Group membership comes from the bundled index; arbitrary citation ranges are not parsed here. Existing browsing rules for abbreviated records and collection/section menus are retained. Regression checks cover every complete text ID and every recorded group; the isolated installed-package audit repeats exact-ID, invalid-ID and group-pagination checks.

Browsing a member recognised only by group lookup instead returns one card for its recorded source group, with the same `scope_resolution` used by search. An approximate group keeps its `approximate` flag. No separate member card or reconstructed text is created. Regression checks compare all 7,397 current unindexed numeric aliases against public citation resolution; installed-package checks repeat representative complete and approximate group cases. A group with unverified member locations also returns an `alignment` caution; no span is trimmed based on the group's numeric ID alone.

## Quote verification and source boundaries

The Pāli verifier builds a small table of token boundaries for citable source regions alongside its word index. Candidate retrieval, candidate spacing and similarity refinement respect these boundaries. Within a recorded group, matching can span member texts, but the final citation must contain the whole matched block range. Independent neighbouring texts and separate source books cannot contribute to a single match.

`tests/verify-boundaries.test.mjs` derives negative boundary fixtures from bundled source fragments and checks excerpt containment, grouped-verse citations and unchanged ordinary matches. These deliberately juxtaposed fixtures are not scriptural quotations. The installed-package audit repeats the boundary and group checks offline.

## Finding printed edition citations in prose

`find_citations` gives Thai, Myanmar and VRI printed-page references priority over embedded sutta, verse or PTS forms. It retains edition names, optional volume/page words and recognised parenthetical source-book qualifiers, and reports `scheme: "edition"`. Invalid Roman edition volumes and numeric ranges stay edition candidates and return the direct resolver's error; they cannot silently become a different citation scheme.

The scanner remains pattern-based. It takes known source titles for book-qualifier detection; it does not swallow ordinary surrounding parentheses or infer an unknown book. Check forms it does not recognise directly with `resolve_reference`. Tests compare every displayed marked edition label with direct page resolution, preserve Unicode UTF-16 offsets and check surrounding prose. The installed-package audit repeats representative valid, ambiguous and invalid page references offline.

## Validating ordinary citation ranges

Before falling back from an unrecorded range to its first text, canonical resolution checks the final endpoint in the same source index. The parser compares complete multi-level paths and rejects incompatible numbering depths. Recorded groups and members resolved through those groups retain their existing behavior. Identical endpoints do not claim to span several texts.

`tests/citation-range-validation.test.mjs` checks missing endpoints, full-path ordering, known source groups, scanner errors and MCP resolution/retrieval. The installed-package audit repeats the invalid and valid cases. These checks validate endpoints; they do not expand abbreviations, assemble a range into a new text or assert intermediate-number coverage.

## Discovering existing ABT links in citations

`find_citations` recognises Ancient Buddhist Texts URLs as well as the three previously supported link hosts. Landing pages and part pages resolve through the same bundled URL index used by direct citation resolution. Unknown paths remain unresolved, lookalike hosts are excluded, and source path case is preserved. The scanner does not fetch these pages or change the network allowlist. Use URL encoding for spaces in a prose URL.

`tests/find-abt-citations.test.mjs` checks every current ABT landing and part-page link, including an encoded-space path, with original UTF-16 offsets. It also checks surrounding punctuation, query/fragment handling, lookalike hosts and unknown paths. The installed audit repeats all known links through the shipped offline MCP server.

## Paired search quotes and Velthuis input

The shared input normalizer preserves paired straight phrase quotes at word boundaries before applying spelling rules to their contents. An opening quote before `n` is a phrase delimiter in `"namo tassa"`; it must not be consumed as the Velthuis marker for `ṅ`. Words inside the phrase can still be normalized, with the existing labelled changes, while internal markers such as `sa"nkhaara` retain their Velthuis role. An unpaired word-initial marker retains its existing encoding behavior.

`tests/normalised-search-quotes.test.mjs` checks delimiters, line breaks, spelling conversion within phrases and Velthuis markers alongside phrases. It compares straight and curly quote results through all three MCP search tools. The installed-package audit repeats these checks and verifies that a missing phrase remains missing rather than turning into loose keyword matches. Quotation verification and provider fetching are unchanged.

## Proper-name title evidence

`lookup_name` ranks names found in an indexed Pāli or English translation title before opening/body matches. Explicit English title fields are used for ATI and ABT. Known dhammatalks caption formats retain their title text after removing the citation header, including Roman-numbered Dhammapada chapters. Bare bibliographic or generic collection references supply no individual title and are not searched as names.

Each `matched_titles` entry records the exact title, language and source, plus the translator when applicable. Every query word must match one title; words from different editions or the Pāli title cannot be joined to create a name match. The canonical Pāli `title` field stays separate. Body occurrence counts are not added for metadata-only matches. This remains a word search, and the DPPN licence gate still prevents dictionary entries from being bundled.

## Resolving stored translation captions by name

`translation-titles.mjs` supplies the same metadata title extraction to proper-name ranking and reference-name indexing. Explicit English title fields and supported dhammatalks citation-plus-title captions are treated consistently, without indexing bare bibliographic references. The title's existing canonical mapping is retained; the caption's citation header is not used to infer a new mapping.

The reference resolver preserves its article aliases, single-word English topic guard, digit restriction, ambiguity lists and explicit DN/MN convention. Tests exercise every currently eligible stored dhammatalks caption through the public resolver, retaining its mapped ID among the result or ambiguity candidates. Unrecognised caption formats fail the corpus fixture rather than silently disappearing. Installed-package checks repeat representative names, aliases, ambiguity and guard behavior offline.

## Real-browser reader acceptance

`python scripts/widget-browser-check.py --report widget-browser.report.json` runs the actual reader HTML in Chromium at phone and desktop widths with simulated Apps SDK/MCP Apps hosts. The dedicated `Chromium reader` job in `check.yml` runs this gate on pushes and pull requests and uploads its JSON report even on failure. It uses Playwright 1.62.0 and Python 3.12. Install the same pinned Playwright and its Chromium first, or select an installed browser with `--browser /path/to/chromium`. This is separate from the dependency-free VM regressions in `npm test`; it adds real DOM, layout and postMessage checks without claiming signed-in client acceptance. See [local client evidence and limits](local-client-acceptance.md).

## Installed evidence-reading audit

`node scripts/audit-evidence.mjs --report evidence.report.json` follows every recorded commentary citation and every retained shared-passage segment reference through an isolated copy of the committed server. Use `--server-dir /path/to/installed/package/server` to target an installed artifact. Its process starts outside the checkout, with HTTP, fetch and socket connections disabled. Responses must match the bundled source segments exactly; the complete paginated link graph must also match.

The separate `Evidence reading commands` workflow installs the actual npm tarball and uploads the report. Shared-passage results now provide `this_read_with` and `other_read_with` to open the first retained matching segment in either text. Each command includes an explicit segment offset: a `uid/N` display reference is not itself a canonical citation. Further retained segment references can be read at their corresponding offsets. Truncated reference lists stay explicitly marked; this audit certifies addresses and reading behavior, not the scholarly relationship or omitted references.

Canonical and post-canonical body search hits now include `segment_ref`, `read_with` (one exact rendered segment) and `context_with` (up to three surrounding segments). Canonical title matches provide an opening-reading command. These commands retain the canonical ID or selected post-canonical citation; they do not reinterpret display refs as standalone citations. Offsets are found from the renderer's source block bounds, so repeated paragraph numbers or repeated wording cannot silently choose a different occurrence. Source-position bookkeeping is internal and ordinary reading responses retain their existing text/metadata.

The installed evidence audit also runs beginning/end source-derived search cases across all 61 canonical, 47 commentary and 109 post-canonical source books. It follows every returned reading/context command in these fixtures, compares exact segments/metadata, requires phrase containment, and checks boundary continuations. This is a bounded source-book acceptance matrix, not an exhaustive test of every possible search query. Existing commentary direct/context references retain their separate book numbering.

The combined installed audit also follows `search_source_book` results through book-mode reading and context across all 61 source files, including the unindexed Vinaya introduction at `vri-book:vin02m1/7`. It requires `selection: source_book`, the correct book ID and no individual `text_id`; these file references never become sutta/rule citations. The search fixtures are counted separately in the JSON report.

## Reading-plan and daily-rotation acceptance

The installed evidence audit now visits every day of all built-in plans and every entry of the complete verse and sutta rotations. It executes the returned `get_text` arguments, compares each page with bundled source, and checks the selected ID, source commit, terms and attribution. MN year-plan parts stop at their assigned boundary even when the underlying sutta has more pages. Whole-text guide assignments follow every continuation. The Dhammapada chapter plan covers verses 1–423 in order, and the MN plan covers all 152 texts without gaps or duplicated segments. Guide URLs are checked against the bundled verified index; guides and English pages are not fetched.

Both daily kinds supply a reading command. Coverage, no premature repeats, deterministic dates and full-period recurrence are checked independently of the permutation step calculation. Date checks include leap days and full four-digit ISO years, including 0000–0099, without changing modern selections. Individual `get_text` responses now include the existing pinned VRI `source` object, including its terms; scripture text and licence terms are unchanged.

These are offline checks. Ordinary package CI does not establish live source health. The separate nightly workflow runs live smoke, outage/mirror and rotating link checks and can create or comment on a public issue when it fails. Do not equate an older main-branch source-health run with success at a newer development head, or dispatch the issue-writing workflow as a side effect of this audit.

## Topic, numbered-list and paritta navigation

Catalogues and cross-links now include structured `read_with` commands. Topic and defining-passage commands use canonical IDs, while ATI URLs retain their role as source-page references (some pages contain multiple texts). Numbered-list links preserve subgroup structure, status notes and labelled English glosses. Paritta catalogue source choices call `paritta` with both the name and canonical source; `continue_with` retains that source and uses offsets within the selected chant/excerpt. `canonical_read_with` opens the whole canonical text. An explicit source selector requires a paritta name, and an empty selector is rejected. Paritta content and numbered Pāli lists retain the existing VRI source pin and terms.

The installed evidence audit exhausts catalogue pages, every topic and list, all nested/cross-link targets, every paritta source alternative and its continuation. Unique canonical targets are read through MCP and compared page by page with the bundle. The Aṅgulimāla excerpt keeps its original canonical refs while paging within its three selected segments. The thirty-seven aids remain seven linked subgroups whose counts sum to 37; their later-name status note is retained. English/essay URLs are checked as compiled metadata and are not fetched. Chanting-book layouts, permission notices and external acceptance gates remain separate from canonical Pāli retrieval.

Vinaya navigation is exhausted by the installed evidence gate: all 227 rule lookups, every distinct canonical target and its full pagination, the separate samatha introduction, and preserved BMC link/attribution metadata. Follow `canonical_text.reading_command` rather than deriving a reader call from the requested rule ID: all seven Adhikaraṇasamatha requests deliberately read the shared `pli-tv-bu-vb-as2` paragraph. `canonical_text.introduction.read_with` opens its unnumbered introduction. These commands do not fetch the BMC; its text remains modern commentary, linked only. Offline checks establish source retrieval and metadata preservation, not external URL availability or monastic interpretation.

The installed Abhidhamma navigation audit follows all three mātikā sections, 13 dyad groups and 164 entries, then all 24 Paṭṭhāna conditions and their definition/list source windows. Catalogue `read_with` commands open sections, groups and conditions; entry/definition/list `read_with` commands open exact `get_text` windows. Existing `get_text` argument objects remain available. Responses include the pinned VRI source and terms. Entry selectors such as `tika -1` or `duka 1.5` are errors: punctuation is not removed to choose another entry. Dictionary pointers remain explicitly separate from scripture and are not fetched by this offline audit.

The installed evidence gate also audits the four MCP prompt contracts and three resources. It checks required arguments, whitespace/size rejection, Unicode preservation, advertised MIME types, source-resource parity, citation examples and canonical/post-canonical reading routes without fetching publishers or dictionary providers. Reference arguments are trimmed and limited to 300 characters; topic arguments to 200. The canon guide retains indexed-group and uncertainty cautions instead of interpreting `approximate` as proof of source abbreviation. Prompt checks inspect returned templates and real reader capabilities; they do not run an LLM or establish that a signed-in client follows the guidance. Memorisation schedules are copyable suggestions, not progress or reminders saved by the Pali Canon MCP tools.

The installed reader-contract audit rejects 54 invalid requests across ten tools, distinguishing MCP/schema errors from structured semantic errors and following eight valid recovery requests. Empty/blank translation selectors are invalid in Pāli-with-English, standalone translation and comparison calls; omit the selector for its documented default. The hosted reading widget also rejects blank selectors before provider access; its HTTP regression checks recovery with an ordinary Pāli request. No provider is fetched for a blank selector.

Post-canonical catalogue/read/search and commentary search now accept supported native-script input and `script` display using the existing converter. Text, raw variant notes, titles and excerpts are displayed in the selected script; citations, source IDs, source pins and licence metadata keep their original identity. `get_post_canonical.continue_with` preserves citation, offset, limit, includeVariants and script for both book and catalogue pagination. Canonical body/title/group reading commands also preserve an explicitly selected script. The installed audit covers eight scripts, source-pinned exact/context commands and independent source comparisons; targeted tests additionally cover all 109 post-canonical first pages and all 47 commentary search scopes. These are mechanical tests, not specialist/native-reader approval, and no peer bundle was imported to implement them.

The hosted reader v6 accepts exactly one of commentary (aligned reference or direct book/segment), uid (canonical/post-canonical citation) and book (complete VRI root file). Post-canonical output has canonical: false and its work label; source-file output has selection: source_book and no invented individual text_id. Both retain source pins and terms and explicitly report the lack of linked English through this server. Their source-file/segment references remain Roman even with native Pāli display. Follow pali.continue_with rather than reconstructing offsets or dropping script. English cursors retain their exact version and script.

Run `node scripts/audit-widget.mjs --report widget-reading.report.json` after building, or pass `--server-dir` for an extracted/installed package. The CI evidence workflow runs it against the actual installed npm artifact, with outbound access blocked. It reads both v6 widget resources and verifies canonical, post-canonical, source-file and aligned/direct commentary modes and continuation across eight scripts, all 109 post-canonical books and all 61 root files, plus invalid selectors. The Chromium gate exercises MCP Apps and Apps SDK bridges at mobile/desktop widths, source labels, native display, source-file front matter and stale-state clearing. These are SDK/bridge/browser checks, not signed-in host acceptance.

Commentary widget output uses content_type: commentary and canonical: false, with requested_on for an aligned request's root context rather than inventing its own canonical text_id. It retains available, alignment metadata, notes, source pins/terms and exact segment refs. Direct books retain the no-root-alignment caution. Unavailable alignments return no Pāli and no continuation; missing data or malformed references remain errors. Commentary printed pages and comments_on_vri_paragraphs are explicitly labelled separately from root page/paragraph fields.

The installed widget audit additionally checks all 47 direct commentary source books and, with `--exhaust-aligned`, every one of the 8,544 root-reference availability states against the bundled commentary reader. CI enables this full sweep. This verifies package/source and wrapper parity; it is not independent scholarly validation of those mappings. Browser fixtures cover aligned/direct/native commentary, unavailable alignment, uncertain mapping and stale-state clearing on both simulated host bridges.

Exact widget source reading accepts segment with uid or book, copied verbatim from that reader (for example mn10/66, Vism 1.1/2 or vri-book:vin02m1/7). It validates the returned ref against the selected source and returns one segment without continuation. Cross-source refs, missing refs and nonzero Pāli/English offsets are errors. No English is fetched or claimed to align at segment precision. Exact commentary keeps its existing /cN selector. The installed gate checks 32 script/source exact selections and invalid cross-source/offset cases; the browser displays the exact canonical ref and English-alignment caution.
