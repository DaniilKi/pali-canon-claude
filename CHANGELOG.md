# Changelog

All notable changes to Pali Canon for Claude. Versions follow [semantic versioning](https://semver.org/). Decision numbers (D…) refer to [docs/decisions.md](docs/decisions.md).

## Development branch (unreleased)

- Add two reviewed ATI shared compilations: Water (AN 1.45–46) and Gratitude
  (publisher AN 2.31–32, indexed AN 2.32–33). Preserve complete page/notice
  pins, exact consent and page-level quotation. Separate shared totals are
  three pages/eight subjects; ordinary English totals stay unchanged.
  Exercise every real declaration in the installed-package audit.

- Activate the first reviewed shared publisher page: ATI Luminous (AN 1.49–52),
  a compilation with exact-ID consent, page-level quotation results and full
  source/notice pins. Count one shared page/four subjects separately; whole-unit
  coverage stays unchanged. Document the next standalone web-reader slice.

- Correct the ordinary SN 15.14 binding: its current source covers six discourses.
  Withhold it with a final build guard until safe shared integration. Add three
  reviewed alternatives, preserving original choices and full BPS/CC notices;
  report zero first-English gains and the corrected whole-unit coverage.

- Add four first-English AN choices with explicit PTS/paragraph differences and
  preserved abbreviations; hold the Luminous and Mother multi-discourse pages
  for reviewed shared-page integration, keeping earlier scope holds intact.

- Add seven reviewed ATI choices (six first-English texts and one alternative),
  preserving source wording and edition notes. Hold the Bombast page’s missing
  intra-segment conclusion alongside SN 36.15; condensed scope stays unactivated.

- Add four source-reviewed AN English choices with explicit edition mapping and
  full rights/provenance; document the complete single-unit condensed-page
  contract needed for SN 36.15, retaining its hold.

- Repaired an evidence-audit timing race: synthetic provider calls are counted
  from a synchronous fixture ledger instead of asynchronous stderr. Rejection,
  fallback and no-network requirements remain strict; runtime source and
  translation data are unchanged (D190).

- Added ten first-English AN choices with independently reviewed content and
  edition numbering. Paired trainings, female/male growth and same-titled
  Anodhi texts retain distinct ownership. Refined SN 36.15’s scope hold: its
  single prose segment cannot honestly be marked a proper partial span (D189).

- Added seven first-English choices across SN and AN, with explicit older
  ATI numbering, condensed repetitions and editorial-note scope. Completed
  SN 40.9’s prefatory/notes review. Reviewed AN paths now require complete
  root-block hashes; general linking heuristics are unchanged (D188).

- Added six first-English SN choices with reviewed content, edition scope and
  rights, including separately identified stream-enterer/arahant discourses.
  Added a metadata-only, read-only ATI review-packet tool to organize remaining
  candidates without approving mappings or permissions automatically (D187).

- Added first English choices for SN 9.11, SN 1.3 and SN 12.16. Explicit
  mapping notes distinguish Walshe’s expanded introduction, condensed
  repetitions and editorial notes from the bundled Pāli and canonical speech.
  Wrong-discourse selection is rejected for reused framing and titles (D186).

- Added first English choices for SN 4.8, SN 17.5 and SN 3.7 after source,
  content, scope and rights review. Distinguish SN 4.8 from its repeated verses
  in SN 1.12; preserve source abbreviations and explain edition differences.
  All reviewed SN links now require a complete root-block scope hash (D185).

- Restored Yasoja’s opening commentary using the unchanged source alignment
  checks; existing passages retain their identity and source order. Added the
  first English choice for SN 1.42 with individually reviewed scope, title,
  content and PTS evidence (D184).

- Restored Yasoja's opening stanza to its indexed poem (Thag 3.9), removing it
  from the preceding Vassika citation without changing source wording or accepted
  commentary. Added reviewed English links for Yasoja and the complete 71-stanza
  Vaṅgīsa compilation, with explicit edition differences (D183).
- Added four more reviewed ATI links: two translations of Thig 5.11, the
  complete 55-stanza Tālapuṭa poem (Thag 19.1), and John D. Ireland's Sn 2.6.
  These give two previously unlinked canonical texts their first English
  choices. Multiple translators are preserved rather than overwritten (D182).
- Added three reviewed Access to Insight whole-story translation links: Pv 5,
  Vv 16 and Vv 35. Retrieval carries edition-number/name differences and the
  publisher's original copyright, attribution and free-distribution notice.
  English bodies are fetched live, not bundled (D181).
- Corrected 69 Vimānavatthu/Petavatthu citation spans and 11 commentary
  assignment lists using the pinned VRI story headings. This keeps a following
  story's opening verse out of the preceding story. All 136 stories have boundary
  regression checks; source wording and coverage are unchanged (D180,
  [repair record](docs/data/story-boundary-repair.md)).

## 2.1.0 (November 2026)

Everything merged to `main` since the `v2.0.0` tag. The server now has **32 tools** (11 core and 21 study and practice tools), or 33 on the hosted server with the ChatGPT reading view switched on.

### Study

- **Commentary.** The traditional Pāli commentary (Aṭṭhakathā, VRI edition), aligned to the root texts: the `get_commentary` tool, and `commentary: true` on `get_text`. Always labelled as commentary (#20, D54).
- **Post-canonical books.** All 109 VRI Ṭīkā and Añña books, including the Visuddhimagga and the Abhidhammatthasaṅgaha, labelled `canonical: false`: `get_post_canonical`, `search_post_canonical`, `include_post_canonical` on `search_texts`, and a `resolve_reference` fallback used only when the canon resolver fails (#21, D55).
- **Word-by-word analysis.** `analyse_passage` splits a passage into words with grammar, root and meaning from a pinned subset of the Digital Pāḷi Dictionary, which also answers `lookup_pali` offline (#22, #23, D56).
- **Parallels and cross-references.** `get_parallels` lists texts that share a passage word for word and texts the commentary cites, each link naming its source and how it was matched. Built offline from the bundled canon and commentary; SuttaCentral stays a link only (#29, D59).
- **English-keyboard input.** Pāli typed without diacritics, in Velthuis or Harvard-Kyoto, or with anglicised spellings ("sanyutta", "nyana") is understood by every tool that takes Pāli words, and every rewrite is labelled. Sutta names ("Satipatthana Sutta") resolve when they name one text; shared names list the candidates (#102, D60, D61).
- **English search and the glossary.** English searches ("mindfulness of breathing") are expanded into Pāli terms from the Digital Pāḷi Dictionary's English index, labelled `expanded_from_english`. The new `glossary` tool looks terms up English → Pāli and Pāli → English (#102, D62).
- Study and practice tools added after the v2.0.0 tag: `verify_quote`, `find_citations`, `lookup_name`, `topic`, `list_topics`, `dhamma_list`, `abhidhamma_matika`, `patthana_condition`, `vinaya_rule`, `paritta`, `find_talks`, `daily_text`, `reading_plan`, `uposatha`, `festivals`, the `memorise_passage` prompt, the `pali://pronunciation` resource (#41) and the `method` and `memorise` skills.
- Clearer `browse_canon` labels and `lookup_pali` output (#49).

### Data

- **245 more translation links** (2,295 → 2,540): 153 to Ancient Buddhist Texts (Ānandajoti Bhikkhu), a third English source (#34), and 92 more to dhammatalks.org and Access to Insight, mostly from a content-based linker that places links the number and title rules leave out (#37, D57).
- **Other scripts.** A `script` option on `get_text`, `search_texts` and `resolve_reference` for Sinhala, Thai, Myanmar, Devanagari, Khmer, Lao and Lanna; input in any of them is accepted (#26, D50).
- **Edition pages.** Thai, Myanmar and VRI edition page markers in `get_text` and `describe`, accepted as citations such as "Thai MN 1.103" (#27, D51).
- **Structured variants.** `variants: "structured"` on `get_text` returns readings, omissions and remarks by edition (#28, D52).
- **Monthly data refresh.** A scheduled workflow rebuilds the data against upstream and opens a pull request with a readable diff report; it never merges (#50, D58).
- **Citation index export.** Every citable text with its IDs, VRI paragraphs, PTS pages and translation links, as JSON and CSV with no scripture text, attached to each release ([docs/export.md](docs/export.md)).

### Quality

- **Accuracy evaluation suite.** `npm run evals` asks 201 questions of the server and checks the answers against the bundled data (#48).
- Multi-OS CI matrix (Node 20 and 22 on Ubuntu, macOS and Windows) and a nightly live-source check (#3).
- Integration testing in batches: feature branches run the local gates, and the full CI matrix and one independent review run on the combined branch (D63).

### Distribution

- npm package `pali-canon-mcp`, a hosted Streamable HTTP endpoint with a Docker image, MCP Registry entry, Codex plugin, Gemini CLI extension, Claude Code marketplace, ChatGPT reading view, tool titles for the Claude connector directory, privacy policy and terms of use (`PRIVACY.md`, `TERMS.md`, #6), a documentation site and localised guidance drafts in eight languages. Publishing and deployment still need the steps in [HANDOFF.md](HANDOFF.md).

## 2.0.0

- The whole VRI Chaṭṭha Saṅgāyana Tipiṭaka bundled for offline reading, exact citations (including PTS pages) and English translations from dhammatalks.org and Access to Insight with mirrors.
