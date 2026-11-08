# Pāli Library web reader

A standalone, responsive reader is available at the HTTP server's root URL. It does not require an AI account or the ChatGPT widget. This is the first complete reading slice, not feature parity with every tool in an AI client.

The reader includes the combined source-aware interface, study tools, reading plans, local restore, daily reading and compact phone layout, based on corpus `7b04173` and reader `5d16478`. See the [dev integration checkpoint](evidence/web-reader/DEV_INTEGRATION.md) for branch/gate verification. Older feature receipts retain their historical scope; they are not the current branch-status authority. A Git integration does not deploy a public host.

## Run it

From the repository, using Node 20 or newer:

```sh
npm ci
npm run build
npm run serve
```

Open **http://localhost:8080/** in a browser. The server uses the same port and configuration documented in [hosting](hosting.md). A phone can use the server through a reachable HTTPS host; localhost on a phone refers to the phone, not your computer. This branch does not deploy or publish a host. Do not expose an unencrypted personal computer directly to the internet.

The npm package and container include `server/web/`. The HTML, stylesheet and browser script are first-party files with a restrictive Content Security Policy. There are no external fonts, trackers or JavaScript frameworks. `/mcp`, `/healthz` and the optional ChatGPT widget keep their existing contracts. `/reader` is an alternative entry URL.

## What you can do

- Browse the canonical collections and all complete root source books, including front matter. Separate catalogues expose all 47 bundled commentary books and 109 later Pāli works; both are visibly labelled **not canon**.
- Choose a search scope: canonical texts, commentary, or later works. Supplementary searches open the exact selection returned by their existing tools without reinterpreting it as a canonical citation. Search canonical Pāli bodies and Pāli/English titles using the existing search tool. English query expansion is labelled, not presented as full English-translation search.
- Open a citation directly and read the exact source segments with visible references and source terms. Continue long texts and books page by page.
- Choose an exact linked English source (on phones, open **Study & sources** first). Shared condensed/compilation pages and partial-unit sources require a visible scope review and an unchecked consent box before retrieval. Shared pages list every member, retain the publisher’s page reference and never claim a separately aligned translation of the selected discourse. Partial sources show their declared segment bounds. Checked continuation retains the version, source-prefix pin and scope consent; unknown or changed scopes fail closed. Failed retrieval is displayed; no replacement text is generated.
- Read available traditional commentary separately from the root text, including pagination. Direct commentary-book reading and search hits do not claim verified root-text alignment. Later-work and commentary bookmarks retain their corpus and exact reading position.
- Change text size, paper/night theme and the supported Pāli transliteration script. Lao/Lanna still require native-reader validation. Installed device fonts affect glyph availability; selecting a script does not install fonts.
- Open **Daily** for a dated Dhammapada verse or a discourse opening from the existing fixed rotation. Dates are UTC, not personalized; discourse previews are not full readings. Open the actual Pāli source/chapter context to continue or choose English sources.
- Follow four sourced **Plans**: Dhammapada chapters, the Majjhima Nikāya year plan, and two link-only ATI study-guide citation orders. Split readings stop at their assigned Pāli boundary. Mark days manually, undo marks, and export browser-local progress; source/assignment changes are not silently credited.
- Save individual passage references and personal notes. Reopen the reading position, export bookmarks/notes as JSON, and restore a supported export locally after a preview. Existing notes are kept; missing source references fail rather than opening a nearby passage.
- Look up English or Pāli terms in the bundled glossary, including supported native-script input. Every result identifies its DPD or curated-list source; glosses are not passage translations.
- Open **Study words** on a body segment in a canonical text, complete root book or later work. See the bundled DPD analyses, alternative parses, grammar, computed split suggestions and unknown forms. Commentary analysis is not supported by the current backend; the app does not substitute root-text analysis.
- Open **Related texts** for canonical selections. Shared-word matching and commentary citations are labelled separately with their evidence. Reading links retain the emitted source segment or exact commentary reference. External parallels are a link only.
- Copy a reading link, use browser back/forward, and navigate with a keyboard.

## Storage and source boundaries

Personal preferences, the last reading link and up to 500 saved references/notes remain in this browser's local storage. Scripture and English bodies are not downloaded into an offline web library. Data is not synced between devices, and clearing browser storage removes it. JSON export is a backup; import and account sync are not implemented. Storage failures are reported without preventing reading. Source revisions are retained on bookmarks, and a changed revision is flagged on reopening; a bookmark is not a frozen scripture copy.

Canonical Pāli works **without upstream source access on the server**. That is different from the web app working without access to its server: this version has no service worker/offline browser mode. English needs an available approved live provider. All source terms and alignment/abbreviation cautions continue to apply. No SuttaCentral source is imported or fetched.

There are no app accounts or server-side personal notes. The HTTP service retains its existing transient IP rate limiter and aggregate counters. Hosts/reverse proxies may retain their own infrastructure logs. See [privacy](../PRIVACY.md).

## API and integration

The UI calls the existing schema-validated MCP tools over same-origin `/mcp` using JSON-RPC with JSON response negotiation. It has no alternate content database or arbitrary URL proxy. Tool errors, HTTP errors and finite request deadlines remain explicit. Navigation and study requests have separate generation guards: a late result cannot replace a newly selected text or study panel. Retrieved strings are inserted using DOM text nodes, never HTML.

`src/web-reader.mjs` serves only four fixed routes. The build copies HTML/CSS from `web/` and bundles `web/reader.js` into `server/web/reader.js` for portable npm/container installation. The browser bundle imports the existing `localizeText` implementation from `src/script.mjs`, so native-script passage validation uses the same renderer as the source tool rather than a second transliterator. Unbundled HTTP-module tests also serve the checked-in compiled assets, never the raw module source. The Docker build includes the source assets. Changes to `web/` must rebuild and commit `server/web/` and `server/http.cjs`.

## Design research and priorities

The useful patterns from established scripture readers are calm typography, visible context, multiple translations, bookmarks, notes and comfortable reading preferences. We used these as functional guidance, not as evidence of a conversion or learning improvement:

- [Quran.com product notes](https://quran.com/product-updates): bookmarks, verse context, study mode, translation reading and personal notes. Those are distinct features rather than justification for adding a social network to this library.
- [dhammatalks.org Sutta collection](https://www.dhammatalks.org/suttas/): explicit collection introductions, translator attribution and the advantages of properly licensed eBook formats for offline reading. This does not grant new redistribution rights.

Next priorities, in order:

1. Extend the same UI to quotation verification and additional study tools. The glossary, contextual DPD word study, related-text evidence and supplementary catalogues/search/readers are now implemented. Keep canonical status and uncertain mappings visible.
2. Improve accessible translation comparison, exact source links and reading-position management. Test in Safari and Firefox, with screen readers and native-script readers, on physical iOS/Android devices.
3. Add optional passage highlighting and reading-progress import. Bookmark/notes restore now has bounded schema validation, preview and an additive merge. Personal reflections must never be labelled scripture.
4. Design explicitly user-requested, versioned offline packs only after source-specific rights/storage review. Don't silently cache live translations or claim whole-corpus English coverage.
5. Audio, cross-device accounts/sync, reminders, community features and native app-store distribution require separate rights, privacy, security and operating-cost decisions. No synthesized sacred narration is provided by this slice.

## Verification

```sh
npm run check
npm run smoke
npm run evals
node --test tests/web-reader.test.mjs
python scripts/web-reader-browser-check.py
python scripts/web-reader-a11y-check.py
```

The browser runner requires Python Playwright and Chromium (set `PALI_BROWSER` to the installed executable if needed). It starts/stops its own local built server. Real Pāli and commentary are tested against the bundled corpus; upstream translation outages and late-response tests are explicitly synthetic. Browser screenshots are written to `/tmp/pali-web-reader/`. No live-source translation availability or human accessibility certification is implied by these checks.


## Follow-up review

A second-pass source/behavior review found and repaired the first slice’s skip-link routing defect: keyboard “Skip to reading” now focuses the current passage rather than navigating away. Supplementary-source bookmarks now keep the selected corpus and a selection-relative offset, including exact commentary segment references; no global segment number is applied to a one-segment selection. Long source references and Pāli titles wrap on narrow screens.

The supplementary search tools and data are unchanged. No new source, licence claim, data transformation, permission, content endpoint or deployment was added. Browser tests explicitly distinguish canonical, direct commentary and later-work scope. Synthetic hostile-looking text and unsafe source URLs test DOM rendering without modifying corpus data.

The pinned `axe-core` dependency is **development-only**, used by `scripts/web-reader-a11y-check.py`. That audit uses a separate browser context permitting checker injection; production CSP remains restrictive and is checked separately. Its automatic WCAG-rule results and incomplete/manual-review rules are recorded. These are not a human accessibility certification or independent scholarly review.


## Study-tool source integrity

The glossary uses the existing offline `glossary` tool, not live `lookup_pali`. It supplies a limited, sourced term index rather than full dictionary articles. Word study uses `analyse_passage` on the **selected** reference and paginates words within that selection. Before displaying a result, the UI checks its segment reference, VRI source revision and actual displayed wording. For native-script reading, it renders the returned Roman segment through the same core `localizeText` function and compares that output with the passage already shown. A mismatch produces a visible retry/reload error without displaying substituted meanings. Dictionary source/version/CC BY-NC-SA terms are shown separately from VRI passage source/non-commercial terms. DPD can list several analyses; the UI does not choose a supposedly correct meaning or turn them into a translation.

Related-text results use `get_parallels`. A shared-word score is not a probability or a claim of equivalent teaching. Commentary evidence is opened with `get_commentary`, explicitly labelled not canon, and its original aligned reference is preserved in bookmarks using a distinct selector. No new linkage or relationship is inferred by the interface. Results and study panels have the same stale-response guards as translations; a delayed word study cannot replace a newly requested relation panel.

## Scoped English-source acceptance

The browser consumes the backend’s `translation_scope`; it does not approve source rights or create mappings. Consent applies to the reviewed source version and complete scope disclosure for the current Pāli selection. It is not stored in bookmarks/preferences and must be given again after navigation or reload. Unknown declarations are withheld. Missing provenance, a changed scope/version, a shared page attributed to one discourse, or an unsafe continuation is an error before text is displayed. Ordinary unscoped responses retain exact canonical identity; a listed backend fallback is visibly labelled using the returned version.

The original [scope acceptance](evidence/web-reader/TRANSLATION_SCOPE.md) used corpus `f0906bd` and a labelled forward compilation fixture. That receipt remains historical. The isolated candidate now includes corpus `7b04173` and tests the three actual reviewed shared compilations through the worker-backed server and browser, with exact source/notice hashes and page-level identities. See [integration evidence](evidence/web-reader/INTEGRATION.md). This does not establish new individual wording alignment or publish the candidate to dev/main.

Repeat the isolated guards with `python scripts/web-reader-scope-check.py --report /tmp/scope.json`. Add `--a11y` for the separate automated audit in both themes (that context alone bypasses CSP to inject axe-core). No publisher network access or committed corpus modifications are involved.

## Reading plans and manual progress

Open **Plans** in the header. The existing `reading_plan` engine supplies all four reading orders and day assignments. There is no new recommendation algorithm, deadline, streak or AI-written reading. Days may be opened in any order. The ATI plans display guide attribution, terms and unplaced links; their guide prose is not reproduced. English bodies are not automatically fetched.

When an assignment covers part of a discourse, its reading link carries the plan name/day and source identity. The reader re-requests the engine assignment, validates the selected text and source pin, and paginates strictly within its Pāli segment bounds. Out-of-span URLs or changed/incomplete source responses fail before display. Whole-text English and related materials are explicitly distinguished from this assigned Pāli part. Ordinary reading outside a plan remains available in Library. Bookmarks preserve exact passage references; reopening one is ordinary reading, not a claim to remain inside the plan assignment.

Day marks are self-reported, stored only in this browser and individually reversible. They are bound to the day’s text IDs, offsets/limits and VRI revision. A changed assignment/source does not inherit a previous completed state. Catalogue counts are labelled saved marks, not verified current completion. Export progress from the Plans list; clearing site data loses it. There is no progress import, sync, cloud backup or automatic inference of comprehension. If storage fails, tab-local marks remain exportable and the interface warns that they are not durable.

Run `python scripts/web-reader-plans-check.py --report /tmp/plans.json` and add `--a11y` for the separate audit. The same runner accepts `--server-dir /path/to/extracted/package/server` to test an installed bundle from outside the checkout. See [reading-plan evidence](evidence/web-reader/READING_PLANS.md).

## Restore bookmarks and personal notes

In **Saved**, choose a Pāli Library bookmark JSON export. The browser reads it locally and shows new/duplicate counts before anything changes. Confirm to add new `(source selector, passage reference)` keys; existing notes and revisions are retained. Cancel makes no changes. The entire file is refused if it is malformed, has duplicate references within itself, unsupported fields, invalid values, over 500 records, exceeds 16 MiB or would exceed the current 500-bookmark capacity. No partial import or silent truncation occurs.

This restores personal reading metadata, not scripture or proof of source authenticity. Imported titles/notes render as inert text. Exact passage references are checked when opened; missing/stale references fail explicitly with no nearby-text substitution. Commentary and later-work selectors keep their non-canonical reader modes. Browser storage failure gives a tab-only warning; export remains available. There is no file upload, account sync or reading-progress restore in this slice. See [acceptance and checkpoint CI](evidence/web-reader/BOOKMARK_IMPORT.md).

## Daily reading

**Daily** reuses `daily_text`; the source engine supplies the UTC date, kind, rotation position, canonical selection, notes and provenance. Choose a date and either a Dhammapada verse or a discourse opening. The current index rotates through 423 verses and 1,271 discourses with an ordinary English source linked. This is a navigation aid, not a personalized recommendation, new selection algorithm or historical claim about a date. A changed data index may change a date's selection.

Verse previews show the supplied verse references and exact text. Discourse previews show only the source-supplied opening, labelled as a preview, with its total segment count and a link to the full canonical reader. English source bodies are never fetched automatically. The ordinary reader retains source choice, consent, commentary, dictionary, bookmark and pagination behavior. Verse chapter-context links use the explicit returned canonical chapter ID.

Script display reuses the existing renderer, with a notice that this is display transliteration from VRI Roman rather than separate script-edition collation. Lao/Lanna native-reader validation remains pending. **Use today’s UTC date** always re-queries the engine, including when already on the same route, so a tab left open overnight can refresh without guessing from the device timezone. The app does not add a daily-date/history/progress store, reminder, account, notification or offline browser mode; normal browser URL history and existing server/provider limitations still apply.

Missing/mismatched date, source, selection, rotation or verse/context metadata fail before displaying a daily passage. Impossible dates are errors, not a fallback to today. Late responses cannot overwrite another route. Browser date controls cover years 0001–9999; daily rotation dates are not historical publication dates. See [daily acceptance](evidence/web-reader/DAILY_READING.md).

## Compact phone reading

On narrow screens, **Find a passage** opens the citation/search controls and collection links. Submitting either form closes the phone finder and focuses the main result region; submitting the current URL refreshes the source/results instead of leaving the drawer open. Reading preferences remain directly available. **Study & sources** opens the canonical reader’s English, commentary, related-text and copy-link controls. Picking a study action closes that phone disclosure and focuses the resulting panel. Desktop search/study controls remain exposed; this uses the same controls and source APIs rather than a second mobile reader.

Disclosure state follows the responsive breakpoint and is not stored as a personal preference. When a focused control is collapsed by a breakpoint change, focus moves to its visible summary. Resizing does not recreate the source-review pane or reset existing per-view scope consent. Exact deep-linked passages retain their position. Continue-reading links appear away from the current reading, avoiding a redundant current-page action above the text.

Browser tab titles identify the current source/view; search uses a generic title and personal notes are never put into a title. On two measured default-font phone viewports, the first passage moved from below the viewport into view; this is not a universal fold guarantee for all devices, fonts, titles or text-size choices. See [measurements and acceptance](evidence/web-reader/COMPACT_READING.md).
