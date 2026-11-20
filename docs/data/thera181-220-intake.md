# Reviewed Therā publisher poems 181–220

This batch adds 40 first indexed English choices, individually approved publisher poems 181–220 mapped to canonical `tha-ap183`–`tha-ap222`. All 206 preceding profile/link objects remain exact. The registry now has 246 choices: 40 Therī and 206 Therā. These are complete poems in the reviewed publisher edition, not line-complete VRI translations or a reconciled critical edition.

The canonical logical hash remains `1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32`. All 61 source books, 8,544 units, commentary, prior boundary repairs, locator revisions and private saved data remain unchanged. Publisher 70/140/158/159 remain held; 353 Therā publisher files, including the first ten and those holds, remain unapproved. No boundary repair or saved-data migration is authorized by this intake.

## Independent source evidence and rights

[The curated approval](../evidence/apadana/THERA_181_220_APPROVAL.json) has SHA-256 `25bf82a592840d1ed95ee07fa1fc7b80f57a1e5a5b7f701b7caf9c308d7931ad`. It binds four sealed chapter goldens, four full source reviews, four rights records, four chapter source approvals, the independent aggregate approval and the preceding 206-profile freeze. The [aggregate independent source approval](../evidence/apadana/THERA_181_220_INDEPENDENT_SOURCE_APPROVAL.json), SHA-256 `6935c20ad8ae27d74e83a3ccd5857384ffc6b24c9c4cd7b45f844f170f95b8bc`, authorizes source scope only; runtime, package, browser and exact-commit CI remain separate gates.

Review covers all 40 original English bodies, all 211 original note definitions, titles and colophons, four prefaces, four chapter summaries and the second-hundred apparatus, against full corresponding Pāli narratives, variants and neighboring boundaries. Independent original XML replay checks all 14,645 blocks of `s0510m1.mul.xml`, not just the selected verses. Exact official Git artifacts and rights/routing metadata are pinned. Mapping rests on each narrative, title and colophon rather than a numerical offset. This is independent AI-assisted source review, not human specialist acceptance.

The approved scope contains 336 body paragraphs, 218 physical printed entries, 221 local stanza labels and 207 poem-owned notes. Four prefaces are note-free. Publisher 190's chapter summary owns note 7; publisher 200's chapter summary owns note 5 and its second-hundred summary owns notes 6–7. The other two chapter summaries are note-free. Those four apparatus notes remain outside poem notes and quotation evidence.

The publisher revision is `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`; VRI is `2d134ff9ef60f70a1eb03c9370580228811a3070`. The specific Walters/Whitman textual grant is CC BY-NC-SA 4.0, including notes and textual apparatus. Generic site CC BY metadata does not relax it. Keep translator/publisher attribution, source/revision, licence, noncommercial/share-alike terms and extraction/change notices. English bodies, notes, prefaces and summaries are fetched live only from the exact approved official paths. Only metadata and integrity hashes are packaged; no audio or other media rights are approved.

## Preserve edition boundaries and apparatus

Publisher 182's speech and legend colophons share one two-line paragraph. Retain all six stanzas and eight body paragraphs, without inserting a blank paragraph or deleting a stanza as though it were another colophon. Publisher 190 uses the already approved exact paired `c`/`ch` display syntax; five reviewed pairs add no general HTML grammar.

Publisher 199 retains its duplicate local label 5 and unclosed bracket. Publisher 200's second-hundred summary remains separate from its chapter summary, with eight published names where the corresponding VRI summary has ten. Preserve the original stated 666 without treating it as a validated corpus total, supplying missing names or calling it the end of all Therā poems.

Publisher 204 does not translate actual VRI stanza 19. The source does not establish why it is absent: preserve that observation without inferring a recension cause or reconstructing English. Publisher 208 joins its heading and first stanza in the first body paragraph. Only literal owner `tha-ap210` uses five finite paragraph/first-line quotation coordinates: the first entry starts at paragraph 0, line 2, followed by paragraphs 1–4, line 1. Retain seven body paragraphs and the original five-line first paragraph. Quotation extraction excludes only its heading line; it retains the first and last stanzas. No general selector grammar is introduced.

All per-poem naming, numeral, royal-name, aeon, interpretive and wording uncertainties remain visible. Original publisher 212 punctuation and abbreviation-link wording remain unchanged. Prefaces, summaries and colophons cannot be used to inflate verse coverage or supply poem quotation evidence.

## Cached-note reader defect

D252 guarded actual cached note content for its new 38 profiles, leaving the earlier 168 under their preceding client contract. Real Chromium reproduction showed corrupt older note text visible for `tha-ap13` and `thi-ap17` in the standalone reader and both simulated host bridges: six pre-fix observations. D253 requires the actual cached poem-note text to match its registered SHA for every known Apadāna profile in individual, comparison and embedded readers. Same-count corruption and forged metadata refuse English while preserving Pāli; correct unmodified responses still render.

The frozen 206-profile source tests retain 1,840 poem-owned notes and 15 separately owned apparatus notes. All unmodified positive cases run before negative mutations. Two authentic empty poem-note lists remain valid. The 152-profile legacy metadata-caveat cohort still exercises its original unconditional safeguards, while nonempty fake note content now refuses. The simulated DOM keeps text content distinct from ordered-list numbering so a numbering property cannot masquerade as visible note text. Widget v28 changes the finite tables and content guard; the shared SHA algorithm, build literal and strict whole-resource equality audit remain unchanged.

## Reproduction and release gates

Keep original publisher fixtures outside the repository/package. Use Python UTF-8 mode on Windows or other non-UTF-8 workstations. Unpack committed data with `node scripts/shard-data.mjs --unpack server/data /tmp/pali-inputs`. The independent standard-library replay imports no production parser and accepts either one combined external source root or four repeated `--source-root` values in the matching golden order:

```sh
python -X utf8 scripts/apadana/review_thera181_220.py \
  --source-root /path/to/pinned-publisher-checkout \
  --goldens docs/evidence/apadana/THERA_NINETEENTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_TWENTIETH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_TWENTY_FIRST_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_TWENTY_SECOND_GOLDENS.json \
  --canon /tmp/pali-inputs/canon.json.gz \
  --xml /path/to/pinned-vri/s0510m1.mul.xml \
  --output-dir /tmp/thera181-220-independent-replay
```

The CLI requires all four immutable seals, the exact current canon and original XML; altered source, ownership, labels, selectors or canonical snapshots refuse. Historical D249–D252 CLIs, goldens, cohorts and receipts remain frozen. Current whitelist expectations use the new independent curation.

Run source-enabled `tests/apadana-thera181-220.test.mjs` and `tests/thera181-220-client.test.mjs` with `APADANA_SOURCE_CHECKOUT` pointing to the exact fixture checkout. Keep all preceding source tests, the original 107/108 positional/citation/draft refusal checks, strict packaged widget audit and `npm run check`. The browser harness `scripts/web-reader-thera181-220-check.py` has bounded `181-200` and `201-220` batches; each must run in normal, accessibility and isolated npm-package modes. Its receipts bind actual mode, argv, server directory, archive and file hashes. Positive real source displays, note corruption refusals, separate apparatus/navigation and retained private-draft journeys are distinct checks.

The workflow configures 61 jobs, 76 named source/browser steps, 258 fixtures and 43 browser groups. Static configuration review is not evidence those jobs passed. Final independent package/runtime review, full check, browser/package execution and all required CI checks on the exact final dev SHA must pass before release completion. Record public GitHub Actions run links with that exact SHA; no final run is asserted here while execution is pending. This batch leaves version 2.1.0 unchanged and authorizes only a normal dev-branch advance, with no main change, force push, deployment or outreach.

Whole links become 2,829; indexed direct/inherited coverage is 1,725/2,148, and grouped member-aware coverage is 1,699/2,122. Sutta Piṭaka inherited English coverage is 2,144. Partial sources remain 22; shared sources remain 12 across 110 subjects; daily eligibility remains 1,288. This is a net gain of 40 previously unavailable whole publisher-edition choices, not a claim that all VRI lines now have English.

The [physical-device and assistive-technology matrix](../qa/manual-device-accessibility-matrix.md) remains prepared and NOT RUN. Chromium viewports, axe and two simulated bridges do not certify physical devices, signed-in hosts, human assistive use or specialist philology. Pinned fixture execution also does not certify current live upstream availability. These limits and all existing rights/source holds remain open.

The two new source groups have a bounded 30-minute CI allowance for the mandatory source checks, authentic legacy-note regressions and three browser modes. All previous groups retain their existing 10/20-minute budgets. The allowance changes no assertions or acceptance requirements.
